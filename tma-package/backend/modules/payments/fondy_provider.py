"""
Fondy Payment Provider - Production Integration
HMAC signature, create payment, status check
"""
import hashlib
import os
import aiohttp
import logging

logger = logging.getLogger(__name__)

FONDY_API_URL = "https://api.fondy.eu/api/checkout/url/"
FONDY_STATUS_URL = "https://api.fondy.eu/api/status/order_id/"


def _sha1(s: str) -> str:
    return hashlib.sha1(s.encode("utf-8")).hexdigest()


def _sorted_signature_string(data: dict, password: str) -> str:
    """
    Fondy signature rule:
    password + sorted values of request/response fields (excluding signature/response_signature_string)
    """
    flat = {}
    for k, v in data.items():
        if k in ["signature", "response_signature_string"]:
            continue
        if v is None or v == "":
            continue
        flat[k] = str(v)
    values = [password] + [flat[k] for k in sorted(flat.keys())]
    return "|".join(values)


def verify_signature(payload: dict, password: str) -> bool:
    """Verify Fondy callback signature"""
    order = payload.get("order") or payload
    sign = order.get("signature")
    if not sign:
        return False
    s = _sorted_signature_string(order, password)
    expected = _sha1(s)
    return expected == sign


def build_signature(order: dict, password: str) -> str:
    """Build signature for outgoing request"""
    s = _sorted_signature_string(order, password)
    return _sha1(s)


class FondyProvider:
    """
    Production Fondy payment provider.
    Supports: create payment, check status, signature verification.
    """

    def __init__(self):
        self.merchant_id = os.getenv("FONDY_MERCHANT_ID", "")
        self.password = os.getenv("FONDY_MERCHANT_PASSWORD", "")
        self.callback_url = os.getenv("FONDY_CALLBACK_URL", "")
        self.return_url = os.getenv("FONDY_RETURN_URL", "")

    async def create_payment(self, args: dict) -> dict:
        """
        Create Fondy payment.
        
        args:
            payment_id: unique payment ID
            order_id: order ID
            amount: amount in UAH (will be converted to kopecks)
            currency: UAH/USD/EUR
            purpose: ORDER_PAYMENT or SHIP_DEPOSIT
            description: payment description
        
        Returns:
            dict with payment_url, fondy_order_id, provider
        """
        payment_id = args["payment_id"]
        order_id = args["order_id"]
        amount = float(args["amount"])
        currency = args.get("currency", "UAH")
        purpose = args.get("purpose", "ORDER_PAYMENT")
        desc = args.get("description") or "Payment"

        # Fondy order_id format: {order_id}:{purpose}:{payment_id}
        fondy_order_id = f"{order_id}:{purpose}:{payment_id}"

        order = {
            "merchant_id": self.merchant_id,
            "order_id": fondy_order_id,
            "order_desc": desc[:1024],  # max 1024 chars
            "amount": int(round(amount * 100, 0)),  # kopecks
            "currency": currency,
            "response_url": self.return_url,
            "server_callback_url": self.callback_url,
        }

        order["signature"] = build_signature(order, self.password)

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(FONDY_API_URL, json={"request": order}, timeout=30) as resp:
                    js = await resp.json()
        except Exception as e:
            logger.error(f"Fondy API error: {e}")
            raise Exception(f"FONDY_API_ERROR: {e}")

        response = (js or {}).get("response") or {}
        checkout_url = response.get("checkout_url")
        
        if not checkout_url:
            error_msg = response.get("error_message") or response.get("error_code") or str(js)
            logger.error(f"Fondy create failed: {error_msg}")
            raise Exception(f"FONDY_CREATE_FAILED: {error_msg}")

        logger.info(f"Fondy payment created: {fondy_order_id}")
        
        return {
            "provider": "FONDY",
            "payment_url": checkout_url,
            "fondy_order_id": fondy_order_id,
            "raw": js
        }

    async def get_payment_status_by_order_id(self, fondy_order_id: str) -> str:
        """
        Get payment status from Fondy by order_id.
        Used for reconciliation.
        
        Returns: PAID, DECLINED, EXPIRED, REVERSED, PENDING, UNKNOWN
        """
        order = {
            "merchant_id": self.merchant_id,
            "order_id": fondy_order_id,
        }
        order["signature"] = build_signature(order, self.password)

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(FONDY_STATUS_URL, json={"request": order}, timeout=30) as resp:
                    js = await resp.json()
        except Exception as e:
            logger.error(f"Fondy status API error: {e}")
            return "UNKNOWN"

        response = (js or {}).get("response") or {}
        status = (response.get("order_status") or "").lower()

        if status == "approved":
            return "PAID"
        if status == "declined":
            return "DECLINED"
        if status == "expired":
            return "EXPIRED"
        if status == "reversed":
            return "REVERSED"
        if status == "processing":
            return "PENDING"
        if status == "created":
            return "PENDING"
        
        return "UNKNOWN"
