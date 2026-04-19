"""
Refunds Routes - Customer refund requests
BLOCK V2-10
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid

from core.db import db
from core.security import get_current_user
from modules.orders.orders_status_service import atomic_transition

router = APIRouter(prefix="/refunds", tags=["Refunds V2"])


class RefundRequest(BaseModel):
    reason: str = "CUSTOMER_REQUEST"
    details: str | None = None


@router.post("/request/{order_id}")
async def request_refund(order_id: str, body: RefundRequest, user: dict = Depends(get_current_user)):
    """
    Request a refund for an order.
    
    Only allowed for DELIVERED or RETURNED orders.
    Creates refund request and transitions order to REFUND_REQUESTED.
    """
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "ORDER_NOT_FOUND")
    
    # Check ownership
    if order.get("user_id") and order["user_id"] != user.get("id"):
        raise HTTPException(403, "FORBIDDEN")
    
    # Check status
    current_status = order.get("status")
    if current_status not in ("DELIVERED", "RETURNED"):
        raise HTTPException(400, f"REFUND_NOT_ALLOWED_FOR_STATUS_{current_status}")
    
    # Transition to REFUND_REQUESTED
    order = await atomic_transition(
        order_id,
        current_status,
        "REFUND_REQUESTED",
        reason="REFUND_REQUESTED",
        meta={"reason": body.reason, "details": body.details},
        actor=f"user:{user.get('id')}",
    )
    
    # Create refund record
    refund_id = str(uuid.uuid4())
    await db.refunds.insert_one({
        "id": refund_id,
        "order_id": order_id,
        "user_id": user.get("id"),
        "reason": body.reason,
        "details": body.details,
        "status": "REQUESTED",
        "amount_uah": order.get("totals", {}).get("grand") or order.get("total"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    
    return {"ok": True, "refund_id": refund_id, "status": "REQUESTED"}


@router.get("/my")
async def get_my_refunds(user: dict = Depends(get_current_user)):
    """Get all refund requests for current user"""
    cursor = db.refunds.find({"user_id": user.get("id")}, {"_id": 0})
    refunds = await cursor.to_list(length=50)
    return {"refunds": refunds}


@router.get("/{refund_id}")
async def get_refund(refund_id: str, user: dict = Depends(get_current_user)):
    """Get refund request details"""
    refund = await db.refunds.find_one({"id": refund_id}, {"_id": 0})
    if not refund:
        raise HTTPException(404, "REFUND_NOT_FOUND")
    
    if refund.get("user_id") != user.get("id"):
        raise HTTPException(403, "FORBIDDEN")
    
    return refund
