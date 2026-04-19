"""
Refunds Admin Routes - Admin approval/rejection of refunds
BLOCK V2-10
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime, timezone

from core.db import db
from core.security import get_current_admin
from modules.orders.orders_status_service import atomic_transition

router = APIRouter(prefix="/admin/refunds", tags=["Refunds Admin V2"])


class RefundDecision(BaseModel):
    approved: bool
    admin_notes: str | None = None


@router.get("/pending")
async def get_pending_refunds(admin: dict = Depends(get_current_admin)):
    """Get all pending refund requests"""
    cursor = db.refunds.find({"status": "REQUESTED"}, {"_id": 0})
    refunds = await cursor.to_list(length=100)
    return {"refunds": refunds}


@router.post("/approve/{order_id}")
async def approve_refund(order_id: str, admin: dict = Depends(get_current_admin)):
    """
    Approve a refund request.
    
    Transitions order from REFUND_REQUESTED to REFUNDED.
    Records in finance ledger.
    """
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "ORDER_NOT_FOUND")
    
    if order.get("status") != "REFUND_REQUESTED":
        raise HTTPException(400, f"BAD_STATUS_{order.get('status')}")
    
    # Update refund record
    await db.refunds.update_one(
        {"order_id": order_id},
        {
            "$set": {
                "status": "APPROVED",
                "approved_by": admin.get("id"),
                "approved_at": datetime.now(timezone.utc).isoformat(),
            }
        }
    )
    
    # Transition order
    order = await atomic_transition(
        order_id,
        "REFUND_REQUESTED",
        "REFUNDED",
        reason="ADMIN_APPROVED_REFUND",
        meta={"admin_id": admin.get("id")},
        actor=f"admin:{admin.get('id')}",
    )
    
    # Record in ledger
    amount = order.get("totals", {}).get("grand") or order.get("total") or 0
    await db.ledger.insert_one({
        "type": "REFUND_OUT",
        "order_id": order_id,
        "amount_uah": int(amount),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "meta": {"approved_by": admin.get("id")},
    })
    
    return {"ok": True, "order_status": "REFUNDED"}


@router.post("/reject/{order_id}")
async def reject_refund(order_id: str, body: RefundDecision, admin: dict = Depends(get_current_admin)):
    """
    Reject a refund request.
    
    Keeps order in REFUND_REQUESTED but marks refund as REJECTED.
    """
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "ORDER_NOT_FOUND")
    
    if order.get("status") != "REFUND_REQUESTED":
        raise HTTPException(400, f"BAD_STATUS_{order.get('status')}")
    
    await db.refunds.update_one(
        {"order_id": order_id},
        {
            "$set": {
                "status": "REJECTED",
                "rejected_by": admin.get("id"),
                "rejected_at": datetime.now(timezone.utc).isoformat(),
                "admin_notes": body.admin_notes,
            }
        }
    )
    
    # Revert order status to DELIVERED (or previous)
    # For simplicity, we'll leave it as REFUND_REQUESTED
    # In production, you might want to restore previous status
    
    return {"ok": True, "refund_status": "REJECTED"}
