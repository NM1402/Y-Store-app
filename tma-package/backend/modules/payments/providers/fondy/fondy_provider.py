"""
Fondy Payment Provider - Production-ready Fondy integration
https://docs.fondy.eu/
"""
import httpx
from typing import Dict, Any

from core.config import settings
from ..base import PaymentProvider
from .fondy_signature import build_signature, verify_signature


FONDY_API_URL = "https://api.fondy.eu/api/checkout/url/"


class FondyProvider(PaymentProvider):
    """Fondy payment provider implementation"""
    
    @property
    def name(self) -> str:
        return "FONDY"
    
    async def create_payment(self, order: Dict[str, Any]) -> Dict[str, Any]:
        """Create Fondy checkout session"""
        
        # Calculate amount in kopecks
        total = order.get("total") or order.get("totals", {}).get("grand", 0)
        amount_kopecks = int(float(total) * 100)
        
        payload = {
            "merchant_id": settings.FONDY_MERCHANT_ID,
            "order_id": order["id"],
            "order_desc": f"Y-Store Order #{order['id'][:8]}",
            "amount": amount_kopecks,
            "currency": "UAH",
            "response_url": settings.FONDY_RETURN_URL,
            "server_callback_url": settings.FONDY_CALLBACK_URL,
        }
        
        # Add signature
        payload["signature"] = build_signature(payload, settings.FONDY_MERCHANT_PASSWORD)
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                FONDY_API_URL, 
                json={"request": payload}
            )
            data = response.json()
        
        response_data = data.get("response", {})
        
        if response_data.get("response_status") != "success":
            error_message = response_data.get("error_message", "Unknown error")
            raise ValueError(f"FONDY_CREATE_FAILED: {error_message}")
        
        return {
            "checkout_url": response_data["checkout_url"],
            "provider_payment_id": response_data.get("payment_id", order["id"]),
        }
    
    def verify_webhook(self, raw_body: bytes, payload: Dict[str, Any]) -> bool:
        """Verify Fondy webhook signature"""
        return verify_signature(payload, settings.FONDY_MERCHANT_PASSWORD)
    
    def parse_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Parse Fondy webhook into normalized format"""
        
        # Fondy status values: approved, declined, processing, expired, reversed
        status_map = {
            "approved": "PAID",
            "declined": "FAILED",
            "processing": "PENDING",
            "expired": "EXPIRED",
            "reversed": "REFUNDED",
        }
        
        fondy_status = payload.get("order_status", "").lower()
        
        return {
            "event_id": payload.get("payment_id"),
            "order_id": payload.get("order_id"),
            "status": status_map.get(fondy_status, "UNKNOWN"),
            "amount": float(payload.get("amount", 0)) / 100,  # From kopecks
            "currency": payload.get("currency", "UAH"),
            "payment_id": payload.get("payment_id"),
            "raw_status": fondy_status,
        }
