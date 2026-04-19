"""
Fondy Webhook Handler - Production Grade
Signature verification, anti-replay, idempotency, audit logging
"""
from fastapi import HTTPException
from datetime import datetime, timezone
import logging

from modules.payments.fondy_provider import verify_signature

logger = logging.getLogger(__name__)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def parse_fondy_order_id(fondy_order_id: str):
    """
    Parse Fondy order_id format: {order_id}:{purpose}:{payment_id}
    Returns: (order_id, purpose, payment_id)
    """
    if not fondy_order_id:
        return None, None, None
    
    parts = fondy_order_id.split(":")
    if len(parts) < 3:
        return fondy_order_id, "ORDER_PAYMENT", fondy_order_id
    
    # Handle case where order_id might contain ':'
    payment_id = parts[-1]
    purpose = parts[-2]
    order_id = ":".join(parts[:-2])
    
    return order_id, purpose, payment_id


def map_fondy_status(order_status: str) -> str:
    """Map Fondy status to internal status"""
    st = (order_status or "").lower()
    
    if st == "approved":
        return "PAID"
    if st == "declined":
        return "DECLINED"
    if st == "expired":
        return "EXPIRED"
    if st == "reversed":
        return "REVERSED"
    if st in ["processing", "created"]:
        return "PENDING"
    
    return "UNKNOWN"


class FondyWebhookHandler:
    """
    Production Fondy webhook handler.
    
    Features:
    - HMAC signature verification
    - Anti-replay protection (dedupe by signature)
    - Idempotent status updates
    - Full audit logging
    - Separate handling for ORDER_PAYMENT vs SHIP_DEPOSIT
    """

    def __init__(self, db, fondy_password: str):
        self.db = db
        self.password = fondy_password
        self.orders = db["orders"]
        self.payments = db["payments"]
        self.events = db["payment_events"]
        self.logs = db["fondy_logs"]

    async def ensure_indexes(self):
        try:
            await self.events.create_index("dedupe_key", unique=True)
        except Exception:
            pass
        try:
            await self.logs.create_index("created_at")
        except Exception:
            pass

    async def handle(self, payload: dict) -> dict:
        """
        Handle Fondy webhook callback.
        
        Returns dict with: ok, applied, duplicate, error
        """
        await self.ensure_indexes()

        # Extract order data
        order = payload.get("order") or payload
        if not isinstance(order, dict):
            raise HTTPException(400, "BAD_PAYLOAD")

        # 1) Verify signature
        verified = verify_signature(payload, self.password)

        # 2) Always log (even if invalid) for audit
        log_entry = {
            "created_at": now_iso(),
            "verified": verified,
            "order_id": order.get("order_id"),
            "order_status": order.get("order_status"),
            "amount": order.get("amount"),
            "currency": order.get("currency"),
            "signature": order.get("signature"),
            "actual_amount": order.get("actual_amount"),
            "response_status": order.get("response_status"),
        }
        await self.logs.insert_one(log_entry)

        if not verified:
            logger.warning(f"Fondy webhook invalid signature: {order.get('order_id')}")
            raise HTTPException(401, "INVALID_SIGNATURE")

        # 3) Parse IDs
        fondy_order_id = order.get("order_id")
        order_status = order.get("order_status")
        mapped_status = map_fondy_status(order_status)

        if not fondy_order_id:
            raise HTTPException(400, "NO_ORDER_ID")

        order_id, purpose, payment_id = parse_fondy_order_id(fondy_order_id)

        if not order_id:
            raise HTTPException(400, "BAD_ORDER_ID_FORMAT")

        # 4) Anti-replay: dedupe by signature + status
        dedupe_key = f"fondy:{fondy_order_id}:{order_status}:{order.get('signature', '')[:32]}"
        try:
            await self.events.insert_one({
                "dedupe_key": dedupe_key,
                "created_at": now_iso(),
                "order_id": order_id,
                "payment_id": payment_id,
                "status": mapped_status
            })
        except Exception:
            # Duplicate webhook - return OK but don't process
            logger.info(f"Fondy duplicate webhook: {fondy_order_id}")
            return {"ok": True, "duplicate": True}

        # 5) Update payment record
        pay = await self.payments.find_one({"id": payment_id}, {"_id": 0})
        
        if not pay:
            # Payment record might not exist - create it
            await self.payments.insert_one({
                "id": payment_id,
                "order_id": order_id,
                "purpose": purpose or "ORDER_PAYMENT",
                "provider": "FONDY",
                "status": mapped_status if mapped_status != "UNKNOWN" else "PENDING",
                "fondy_order_id": fondy_order_id,
                "amount": float(order.get("amount", 0)) / 100,  # convert from kopecks
                "currency": order.get("currency", "UAH"),
                "created_at": now_iso()
            })
            logger.info(f"Created payment record from webhook: {payment_id}")
        else:
            # Update existing payment (idempotent - don't downgrade PAID)
            current_status = pay.get("status")
            if current_status == "PAID" and mapped_status != "PAID":
                # Don't downgrade from PAID
                logger.info(f"Ignoring status downgrade for {payment_id}: {current_status} -> {mapped_status}")
                return {"ok": True, "ignored": True, "reason": "NO_DOWNGRADE"}
            
            update_data = {
                "status": mapped_status if mapped_status != "UNKNOWN" else current_status,
                "fondy_order_id": fondy_order_id,
                "updated_at": now_iso()
            }
            if mapped_status == "PAID":
                update_data["paid_at"] = now_iso()
            
            await self.payments.update_one({"id": payment_id}, {"$set": update_data})

        # 6) Apply business logic based on status
        if mapped_status == "PAID":
            return await self._handle_paid(order_id, purpose, payment_id, fondy_order_id)
        
        if mapped_status in ["DECLINED", "EXPIRED"]:
            logger.info(f"Fondy payment {mapped_status}: {fondy_order_id}")
            return {"ok": True, "applied": "NOOP", "status": mapped_status}

        return {"ok": True, "applied": "NOOP", "status": mapped_status}

    async def _handle_paid(self, order_id: str, purpose: str, payment_id: str, fondy_order_id: str) -> dict:
        """Handle successful payment"""
        
        if purpose == "SHIP_DEPOSIT":
            # Deposit paid - enable COD for this order
            result = await self.orders.update_one(
                {"id": order_id},
                {"$set": {
                    "deposit.paid": True,
                    "deposit.paid_at": now_iso(),
                    "status": "NEW",  # Ready for processing, COD now allowed
                    "updated_at": now_iso()
                }}
            )
            logger.info(f"Deposit paid for order {order_id}")
            return {"ok": True, "applied": "DEPOSIT_PAID", "order_id": order_id}

        # Full order payment
        result = await self.orders.update_one(
            {"id": order_id, "status": {"$in": ["AWAITING_PAYMENT", "NEW", "PAYMENT_FROZEN"]}},
            {"$set": {
                "status": "PAID",
                "paid_at": now_iso(),
                "payment_id": payment_id,
                "updated_at": now_iso()
            }}
        )
        
        if result.modified_count > 0:
            logger.info(f"Order paid: {order_id}")
            return {"ok": True, "applied": "ORDER_PAID", "order_id": order_id}
        else:
            # Order might already be paid or in different status
            logger.info(f"Order {order_id} already processed or in different status")
            return {"ok": True, "applied": "ALREADY_PROCESSED", "order_id": order_id}
