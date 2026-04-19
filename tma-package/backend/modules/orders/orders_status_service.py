"""
Orders Status Service - Atomic status transitions
BLOCK V2-10
"""
from datetime import datetime, timezone
from fastapi import HTTPException
from core.db import db

# Allowed status transitions
ALLOWED_TRANSITIONS = {
    "NEW": {"AWAITING_PAYMENT", "CANCELLED"},
    "AWAITING_PAYMENT": {"PAID", "CANCELLED"},
    "PAID": {"PROCESSING", "CANCELLED"},
    "PROCESSING": {"SHIPPED", "CANCELLED"},
    "SHIPPED": {"DELIVERED", "RETURNED"},
    "DELIVERED": {"RETURNED", "REFUND_REQUESTED"},
    "RETURNED": {"REFUND_REQUESTED"},
    "REFUND_REQUESTED": {"REFUNDED"},
    "CANCELLED": set(),
    "REFUNDED": set(),
}


async def atomic_transition(
    order_id: str,
    from_status: str,
    to_status: str,
    reason: str,
    meta: dict | None = None,
    actor: str = "system"
) -> dict:
    """
    Atomically transition order from one status to another.
    
    Features:
    - Validates transition is allowed
    - Uses MongoDB findOneAndUpdate for atomicity
    - Records transition in status_history
    - Increments version for optimistic locking
    
    Raises:
        HTTPException 400: Invalid transition
        HTTPException 409: Conflict (status already changed)
    """
    if to_status not in ALLOWED_TRANSITIONS.get(from_status, set()):
        raise HTTPException(400, f"Invalid transition {from_status} -> {to_status}")
    
    now = datetime.now(timezone.utc).isoformat()
    
    update = {
        "$set": {
            "status": to_status,
            "updated_at": now,
        },
        "$push": {
            "status_history": {
                "at": now,
                "from": from_status,
                "to": to_status,
                "reason": reason,
                "actor": actor,
                "meta": meta or {},
            }
        },
        "$inc": {"version": 1},
    }
    
    result = await db.orders.find_one_and_update(
        {"id": order_id, "status": from_status},
        update,
        return_document=True,
    )
    
    if not result:
        raise HTTPException(409, "Order status conflict - status may have changed")
    
    result.pop("_id", None)
    return result


async def get_order_status(order_id: str) -> str | None:
    """Get current status of an order"""
    order = await db.orders.find_one({"id": order_id}, {"status": 1})
    return order.get("status") if order else None


async def can_transition_to(order_id: str, to_status: str) -> bool:
    """Check if order can transition to given status"""
    current = await get_order_status(order_id)
    if not current:
        return False
    return to_status in ALLOWED_TRANSITIONS.get(current, set())
