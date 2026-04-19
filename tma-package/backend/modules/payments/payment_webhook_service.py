"""
Payment Webhook Service - Safe webhook handling with idempotency
"""
from typing import Dict, Any, Optional
from fastapi import HTTPException

from core.db import db
from modules.orders.order_repository import order_repository
from .payment_events_repository import payment_events_repository


class PaymentWebhookService:
    """Service for handling payment webhooks safely"""
    
    async def init(self):
        """Initialize indexes"""
        await payment_events_repository.ensure_indexes()
        await order_repository.ensure_indexes()
    
    async def handle_paid(
        self,
        provider: str,
        payload: Dict[str, Any],
        payment_id: Optional[str] = None,
        event_id: Optional[str] = None,
        amount: Optional[float] = None,
        currency: Optional[str] = None,
        order_id: Optional[str] = None,
        signature: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Handle payment success webhook.
        - Saves event idempotently
        - Validates amount against order
        - Atomically transitions order to PAID
        """
        
        # Extract fields if not provided
        provider_event_id = event_id or str(
            payload.get("event_id") or 
            payload.get("id") or 
            payload.get("payment_id")
        )
        
        order_id = order_id or str(
            payload.get("order_id") or 
            payload.get("merchantOrderId") or 
            payload.get("metadata", {}).get("order_id")
        )
        
        amount = amount if amount is not None else float(
            payload.get("amount") or 
            payload.get("sum") or 0
        )
        
        currency = currency or str(payload.get("currency") or "UAH")
        payment_id = payment_id or provider_event_id
        
        if not provider_event_id or not order_id:
            raise HTTPException(400, "BAD_WEBHOOK_PAYLOAD")
        
        # 1) Save event idempotently
        ev_doc = {
            "provider": provider,
            "provider_event_id": provider_event_id,
            "order_id": order_id,
            "type": "PAID",
            "status": "RECEIVED",
            "amount": amount,
            "currency": currency,
            "raw": payload,
        }
        
        ev = await payment_events_repository.insert_event_idempotent(ev_doc, signature)
        
        # If duplicate event already processed, return OK quickly
        if not ev["inserted"]:
            existing = ev["event"]
            if existing and existing.get("status") == "PROCESSED":
                return {
                    "ok": True, 
                    "idempotent": True, 
                    "order_id": order_id
                }
        
        # 2) Validate against order snapshot (anti-tamper)
        order = await order_repository.get_by_id(order_id)
        
        if not order:
            await payment_events_repository.update_event_status(
                provider, provider_event_id, "FAILED",
                {"fail_reason": "ORDER_NOT_FOUND"}
            )
            raise HTTPException(404, "ORDER_NOT_FOUND")
        
        # Check amount matches
        snapshot_total = float(
            order.get("total") or 
            order.get("totals", {}).get("grand", 0) or 0
        )
        
        if snapshot_total > 0 and abs(snapshot_total - amount) > 0.01:
            await payment_events_repository.update_event_status(
                provider, provider_event_id, "FAILED",
                {
                    "fail_reason": "AMOUNT_MISMATCH",
                    "expected_amount": snapshot_total,
                    "received_amount": amount
                }
            )
            raise HTTPException(409, f"AMOUNT_MISMATCH: expected {snapshot_total}, got {amount}")
        
        # 3) Atomic mark paid (idempotent-safe)
        try:
            updated = await order_repository.mark_paid_atomic(
                order_id=order_id,
                provider=provider,
                payment_id=payment_id,
                amount=amount,
                currency=currency,
                raw=payload,
            )
        except ValueError as e:
            msg = str(e)
            await payment_events_repository.update_event_status(
                provider, provider_event_id, "FAILED",
                {"fail_reason": msg}
            )
            
            if msg == "ORDER_NOT_FOUND":
                raise HTTPException(404, msg)
            if msg == "ORDER_CONFLICT":
                raise HTTPException(409, msg)
            if msg.startswith("ORDER_NOT_PAYABLE"):
                # Order already moved to different status - idempotent OK
                return {
                    "ok": True, 
                    "ignored": True, 
                    "reason": msg, 
                    "order_id": order_id
                }
            raise
        
        # 4) Mark event processed
        await payment_events_repository.update_event_status(
            provider, provider_event_id, "PROCESSED",
            {"processed_order_status": updated.get("status")}
        )
        
        return {
            "ok": True, 
            "order_id": order_id, 
            "order_status": updated.get("status")
        }


# Singleton instance
payment_webhook_service = PaymentWebhookService()
