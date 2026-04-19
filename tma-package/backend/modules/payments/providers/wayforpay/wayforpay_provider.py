"""
WayForPay Payment Provider - Production-ready integration
https://wiki.wayforpay.com/view/852102

Purchase flow:
1. Create form with signed data
2. Redirect to https://secure.wayforpay.com/pay
3. Receive callback on serviceUrl
4. Respond with signed confirmation
"""
import httpx
import time
import os
import logging
from typing import Dict, Any

from ..base import PaymentProvider
from .wayforpay_signature import build_signature, verify_signature, build_response_signature


logger = logging.getLogger(__name__)

WAYFORPAY_API_URL = "https://secure.wayforpay.com/pay"
WAYFORPAY_API_CHECKOUT = "https://secure.wayforpay.com/pay?behavior=offline"
WAYFORPAY_API_REFUND = "https://api.wayforpay.com/api"


class WayForPayProvider(PaymentProvider):
    """WayForPay payment provider implementation"""
    
    def __init__(self):
        self.merchant_account = os.getenv("WAYFORPAY_MERCHANT_ACCOUNT", "")
        self.merchant_secret = os.getenv("WAYFORPAY_MERCHANT_SECRET", "")
        self.merchant_domain = os.getenv("WAYFORPAY_MERCHANT_DOMAIN", "y-store.com.ua")
        self.return_url = os.getenv("WAYFORPAY_RETURN_URL", "")
        self.service_url = os.getenv("WAYFORPAY_SERVICE_URL", "")
    
    @property
    def name(self) -> str:
        return "WAYFORPAY"
    
    async def create_payment(self, order: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create WayForPay checkout session.
        
        Uses offline behavior to get checkout URL instead of form redirect.
        """
        # Calculate amount
        total = order.get("total") or order.get("totals", {}).get("grand", 0)
        if isinstance(total, dict):
            total = total.get("grand", 0)
        amount = float(total)
        
        # Order reference - unique order ID
        order_reference = order.get("id", str(int(time.time())))
        order_date = int(time.time())
        
        # Get items
        items = order.get("items", [])
        if not items:
            items = [{"title": "Замовлення", "quantity": 1, "price": amount}]
        
        product_names = [item.get("title", item.get("name", "Товар"))[:256] for item in items]
        product_counts = [int(item.get("quantity", 1)) for item in items]
        product_prices = [float(item.get("price", 0)) for item in items]
        
        # Build payment request
        payload = {
            "merchantAccount": self.merchant_account,
            "merchantAuthType": "SimpleSignature",
            "merchantDomainName": self.merchant_domain,
            "merchantTransactionSecureType": "AUTO",
            "apiVersion": 1,
            "orderReference": order_reference,
            "orderDate": order_date,
            "amount": amount,
            "currency": "UAH",
            "productName": product_names,
            "productCount": product_counts,
            "productPrice": product_prices,
            "returnUrl": self.return_url or f"https://{self.merchant_domain}/checkout/success",
            "serviceUrl": self.service_url or f"https://{self.merchant_domain}/api/v2/payments/wayforpay/webhook",
            "language": "UA",
        }
        
        # Add customer info if available
        customer = order.get("customer", {})
        if customer:
            if customer.get("name"):
                names = customer["name"].split(" ", 1)
                payload["clientFirstName"] = names[0]
                if len(names) > 1:
                    payload["clientLastName"] = names[1]
            if customer.get("phone"):
                payload["clientPhone"] = customer["phone"]
            if customer.get("email"):
                payload["clientEmail"] = customer["email"]
        
        # Generate signature
        payload["merchantSignature"] = build_signature(payload, self.merchant_secret)
        
        logger.info(f"WayForPay: Creating payment for order {order_reference}, amount={amount} UAH")
        logger.info(f"WayForPay: merchantAccount={self.merchant_account}, domain={self.merchant_domain}")
        logger.info(f"WayForPay: Payload keys: {list(payload.keys())}")
        
        try:
            # Use offline behavior to get checkout URL
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    WAYFORPAY_API_CHECKOUT, 
                    data=payload,
                    follow_redirects=False
                )
                
                if response.status_code == 200:
                    data = response.json()
                    checkout_url = data.get("url")
                    
                    if checkout_url:
                        logger.info(f"WayForPay: Checkout URL obtained for {order_reference}")
                        return {
                            "checkout_url": checkout_url,
                            "provider_payment_id": order_reference,
                            "provider": "WAYFORPAY",
                        }
                    else:
                        error = data.get("reason", "Unknown error")
                        logger.warning(f"WayForPay: API returned error - {error}, using form redirect")
                        # Fallback: return form data for client-side redirect
                        return {
                            "checkout_url": WAYFORPAY_API_URL,
                            "form_data": payload,
                            "provider_payment_id": order_reference,
                            "provider": "WAYFORPAY",
                            "method": "POST",
                        }
                else:
                    # Fallback: return form data for client-side redirect
                    logger.info(f"WayForPay: Using form redirect for {order_reference}")
                    return {
                        "checkout_url": WAYFORPAY_API_URL,
                        "form_data": payload,
                        "provider_payment_id": order_reference,
                        "provider": "WAYFORPAY",
                        "method": "POST",
                    }
                    
        except httpx.RequestError as e:
            logger.error(f"WayForPay API error: {e}")
            # Return form data as fallback
            return {
                "checkout_url": WAYFORPAY_API_URL,
                "form_data": payload,
                "provider_payment_id": order_reference,
                "provider": "WAYFORPAY",
                "method": "POST",
            }
    
    def verify_webhook(self, raw_body: bytes, payload: Dict[str, Any]) -> bool:
        """Verify WayForPay webhook signature"""
        return verify_signature(payload, self.merchant_secret)
    
    def parse_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse WayForPay webhook into normalized format.
        
        WayForPay transactionStatus values:
        - Approved - successful
        - Pending - processing
        - Declined - failed
        - Expired - timeout
        - Refunded/Voided - refunded
        """
        status_map = {
            "approved": "PAID",
            "pending": "PENDING",
            "inprocessing": "PENDING",
            "waitingauthcomplete": "PENDING",
            "declined": "FAILED",
            "expired": "EXPIRED",
            "refunded": "REFUNDED",
            "voided": "REFUNDED",
        }
        
        wfp_status = (payload.get("transactionStatus", "") or "").lower()
        
        return {
            "event_id": payload.get("orderReference"),
            "order_id": payload.get("orderReference"),
            "status": status_map.get(wfp_status, "UNKNOWN"),
            "amount": float(payload.get("amount", 0)),
            "currency": payload.get("currency", "UAH"),
            "payment_id": payload.get("orderReference"),
            "raw_status": wfp_status,
            "auth_code": payload.get("authCode"),
            "card_pan": payload.get("cardPan"),
            "card_type": payload.get("cardType"),
            "reason": payload.get("reason"),
            "reason_code": payload.get("reasonCode"),
            "fee": payload.get("fee"),
        }
    
    def build_webhook_response(self, order_reference: str, status: str = "accept") -> Dict[str, Any]:
        """
        Build response for WayForPay webhook.
        
        WayForPay expects: { orderReference, status, time, signature }
        """
        current_time = int(time.time())
        signature = build_response_signature(order_reference, status, current_time, self.merchant_secret)
        
        return {
            "orderReference": order_reference,
            "status": status,
            "time": current_time,
            "signature": signature,
        }
    
    async def refund(self, order: Dict[str, Any], amount: float = None) -> Dict[str, Any]:
        """
        Refund WayForPay payment.
        https://wiki.wayforpay.com/view/852115
        """
        order_reference = order.get("id")
        refund_amount = amount or float(order.get("totals", {}).get("grand", 0))
        
        payload = {
            "transactionType": "REFUND",
            "merchantAccount": self.merchant_account,
            "orderReference": order_reference,
            "amount": refund_amount,
            "currency": "UAH",
            "comment": "Refund",
            "apiVersion": 1,
        }
        
        # Signature for refund: merchantAccount;orderReference;amount;currency
        sign_string = f"{self.merchant_account};{order_reference};{refund_amount};UAH"
        import hmac
        import hashlib
        payload["merchantSignature"] = hmac.new(
            self.merchant_secret.encode("utf-8"),
            sign_string.encode("utf-8"),
            hashlib.md5
        ).hexdigest()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(WAYFORPAY_API_REFUND, json=payload)
            data = response.json()
        
        if data.get("reasonCode") == 1100:  # Success
            return {"status": "REFUNDED", "refund_id": data.get("orderReference")}
        else:
            raise ValueError(f"WAYFORPAY_REFUND_FAILED: {data.get('reason', 'Unknown error')}")
    
    async def check_status(self, order_reference: str) -> Dict[str, Any]:
        """
        Check payment status.
        https://wiki.wayforpay.com/view/852117
        """
        payload = {
            "transactionType": "CHECK_STATUS",
            "merchantAccount": self.merchant_account,
            "orderReference": order_reference,
            "apiVersion": 1,
        }
        
        # Signature: merchantAccount;orderReference
        sign_string = f"{self.merchant_account};{order_reference}"
        import hmac
        import hashlib
        payload["merchantSignature"] = hmac.new(
            self.merchant_secret.encode("utf-8"),
            sign_string.encode("utf-8"),
            hashlib.md5
        ).hexdigest()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(WAYFORPAY_API_REFUND, json=payload)
            data = response.json()
        
        return self.parse_webhook(data)
