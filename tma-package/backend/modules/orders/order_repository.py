"""
Order Repository - Atomic database operations with optimistic locking
"""
from typing import Optional, Any, Dict
from datetime import datetime, timezone
from pymongo import ReturnDocument

from core.db import db
from .order_status import OrderStatus
from .order_state_machine import can_transition


def utcnow():
    return datetime.now(timezone.utc)


class OrderRepository:
    """Repository for atomic order operations with optimistic locking"""
    
    def __init__(self):
        self.col = db["orders"]
        self.idem = db["idempotency_keys"]
    
    async def ensure_indexes(self):
        """Create required indexes"""
        # Orders indexes
        await self.col.create_index("id", unique=True)
        await self.col.create_index("user_id")
        await self.col.create_index("status")
        await self.col.create_index("created_at")
        
        # Idempotency indexes
        await self.idem.create_index("key_hash", unique=True)
        await self.idem.create_index("expires_at", expireAfterSeconds=0)
    
    async def get_by_id(self, order_id: str) -> Optional[dict]:
        """Get order by ID"""
        return await self.col.find_one({"id": order_id}, {"_id": 0})
    
    async def atomic_transition(
        self,
        order_id: str,
        to_status: OrderStatus,
        actor: str,
        reason: str = "",
        expected_version: Optional[int] = None,
        require_current: Optional[OrderStatus] = None,
        patch: Optional[Dict[str, Any]] = None,
    ) -> dict:
        """
        Atomic status transition with optimistic locking:
        - Validates transition is allowed
        - Requires expected_version match (optional)
        - Increments version
        - Appends to status_history
        """
        patch = patch or {}
        
        # Get current state
        current = await self.col.find_one(
            {"id": order_id}, 
            {"_id": 0, "status": 1, "version": 1}
        )
        if not current:
            raise ValueError("ORDER_NOT_FOUND")
        
        frm = OrderStatus(current["status"])
        
        # Validate transition
        if not can_transition(frm, to_status):
            raise ValueError(f"INVALID_TRANSITION:{frm.value}->{to_status.value}")
        
        # Build query with conditions
        query: Dict[str, Any] = {"id": order_id, "status": frm.value}
        
        if require_current is not None:
            query["status"] = require_current.value
        
        if expected_version is not None:
            query["version"] = expected_version
        
        now = utcnow().isoformat()
        
        update = {
            "$set": {
                **patch,
                "status": to_status.value,
                "updated_at": now,
            },
            "$inc": {"version": 1},
            "$push": {
                "status_history": {
                    "from": frm.value,
                    "to": to_status.value,
                    "actor": actor,
                    "reason": reason,
                    "at": now,
                }
            },
        }
        
        doc = await self.col.find_one_and_update(
            query, 
            update, 
            return_document=ReturnDocument.AFTER, 
            projection={"_id": 0}
        )
        
        if not doc:
            raise ValueError("ORDER_CONFLICT")
        
        return doc
    
    async def mark_paid_atomic(
        self,
        order_id: str,
        provider: str,
        payment_id: str,
        amount: float,
        currency: str,
        raw: Dict[str, Any],
        expected_version: Optional[int] = None,
    ) -> dict:
        """
        Atomic: AWAITING_PAYMENT -> PAID (only once).
        If already PAID (or beyond) → return current doc (idempotent).
        If status not AWAITING_PAYMENT → conflict.
        """
        # Get current state
        cur = await self.col.find_one(
            {"id": order_id}, 
            {"_id": 0, "status": 1, "version": 1}
        )
        if not cur:
            raise ValueError("ORDER_NOT_FOUND")
        
        cur_status = OrderStatus(cur["status"])
        
        # Already paid (or later) => idempotent OK
        paid_or_beyond = {
            OrderStatus.PAID, 
            OrderStatus.PROCESSING, 
            OrderStatus.SHIPPED, 
            OrderStatus.DELIVERED, 
            OrderStatus.REFUNDED
        }
        if cur_status in paid_or_beyond:
            return await self.col.find_one({"id": order_id}, {"_id": 0})
        
        if cur_status != OrderStatus.AWAITING_PAYMENT:
            raise ValueError(f"ORDER_NOT_PAYABLE:{cur_status.value}")
        
        query: Dict[str, Any] = {
            "id": order_id, 
            "status": OrderStatus.AWAITING_PAYMENT.value
        }
        if expected_version is not None:
            query["version"] = expected_version
        
        now = utcnow().isoformat()
        
        update = {
            "$set": {
                "status": OrderStatus.PAID.value,
                "updated_at": now,
                "payment.provider": provider,
                "payment.payment_id": payment_id,
                "payment.status": "PAID",
                "payment.amount": amount,
                "payment.currency": currency,
                "payment.paid_at": now,
                "payment.raw": raw,
            },
            "$inc": {"version": 1},
            "$push": {
                "status_history": {
                    "from": OrderStatus.AWAITING_PAYMENT.value,
                    "to": OrderStatus.PAID.value,
                    "actor": f"payment:{provider}",
                    "reason": "WEBHOOK_CONFIRMED",
                    "at": now,
                }
            },
        }
        
        doc = await self.col.find_one_and_update(
            query, 
            update, 
            return_document=ReturnDocument.AFTER, 
            projection={"_id": 0}
        )
        
        if not doc:
            raise ValueError("ORDER_CONFLICT")
        
        return doc
    
    async def idem_get_or_lock(
        self, 
        key_hash: str, 
        payload_hash: str
    ) -> Optional[dict]:
        """
        Try to insert idempotency record.
        If exists, return it (for duplicate detection).
        """
        now = utcnow()
        try:
            await self.idem.insert_one({
                "key_hash": key_hash,
                "payload_hash": payload_hash,
                "status": "LOCKED",
                "result": None,
                "created_at": now.isoformat(),
                "expires_at": now,
            })
            return None
        except Exception:
            return await self.idem.find_one({"key_hash": key_hash}, {"_id": 0})
    
    async def idem_store_result(
        self, 
        key_hash: str, 
        result: dict, 
        status: str = "DONE"
    ):
        """Store result for idempotency key"""
        await self.idem.update_one(
            {"key_hash": key_hash},
            {"$set": {
                "status": status, 
                "result": result, 
                "updated_at": utcnow().isoformat()
            }}
        )
    
    async def idem_set_expires(self, key_hash: str, hours: int = 24):
        """Set TTL for idempotency key"""
        from .order_idempotency import ttl_expires
        await self.idem.update_one(
            {"key_hash": key_hash},
            {"$set": {"expires_at": ttl_expires(hours)}}
        )


# Singleton instance
order_repository = OrderRepository()
