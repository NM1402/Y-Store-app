"""
D-Mode Step 3: Payment Resume Routes
Resume page API for continuing payment flow
"""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
import uuid
import os
from core.db import db

router = APIRouter(prefix="/api/v2/payments/resume", tags=["Payment Resume"])


def now_iso():
    return datetime.now(timezone.utc).isoformat()


@router.get("/{order_id}")
async def payment_resume(order_id: str):
    """
    Get payment resume status for an order.
    Returns current status, what action user should take, and payment URL.
    """
    order = await db["orders"].find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "ORDER_NOT_FOUND")

    # Find most recent payment
    pay = await db["payments"].find_one(
        {"order_id": order_id, "status": {"$in": ["CREATED", "PENDING"]}},
        {"_id": 0}
    )

    status = order.get("status")
    policy = order.get("payment_policy") or {}
    deposit = order.get("deposit") or {}

    # Derived flags
    is_paid = status in ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"]
    deposit_paid = bool(deposit.get("paid"))

    # Determine what user should do
    action = "NONE"
    payment_url = None
    purpose = None

    if is_paid:
        action = "GO_SUCCESS"
    else:
        if policy.get("mode") == "SHIP_DEPOSIT" and not deposit_paid:
            action = "PAY_DEPOSIT"
        elif policy.get("mode") == "FULL_PREPAID":
            action = "PAY_FULL"
        else:
            action = "PAY_FULL"

        if pay:
            payment_url = pay.get("payment_url")
            purpose = pay.get("purpose")

    return {
        "ok": True,
        "order_id": order_id,
        "order_status": status,
        "policy_mode": policy.get("mode"),
        "deposit": {
            "required": bool(deposit.get("required")),
            "amount": float(deposit.get("amount") or 0),
            "paid": deposit_paid,
        },
        "action": action,
        "payment": {
            "purpose": purpose,
            "payment_url": payment_url
        },
        "updated_at": now_iso(),
    }


@router.post("/{order_id}/refresh")
async def payment_resume_refresh(order_id: str):
    """
    Refresh payment status (for polling).
    """
    order = await db["orders"].find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "ORDER_NOT_FOUND")

    return {
        "ok": True,
        "order_id": order_id,
        "status": order.get("status"),
        "updated_at": now_iso()
    }


@router.post("/{order_id}/recreate")
async def payment_resume_recreate(order_id: str):
    """
    Recreate payment intent if old one expired.
    Essential for conversion recovery.
    """
    order = await db["orders"].find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "ORDER_NOT_FOUND")

    policy = order.get("payment_policy") or {}
    deposit = order.get("deposit") or {}

    # Determine payment type and amount
    if policy.get("mode") == "SHIP_DEPOSIT" and not deposit.get("paid"):
        amount = float(deposit.get("amount") or 120)
        purpose = "SHIP_DEPOSIT"
    else:
        amount = float((order.get("totals") or {}).get("grand") or 0)
        purpose = "ORDER_PAYMENT"

    payment_id = str(uuid.uuid4())

    # Create mock payment URL (replace with real Fondy integration)
    base_url = os.getenv("PUBLIC_BASE_URL", "http://localhost:3000")
    payment_url = f"{base_url}/payment/mock/{payment_id}"

    await db["payments"].insert_one({
        "id": payment_id,
        "order_id": order_id,
        "purpose": purpose,
        "provider": "FONDY",
        "amount": amount,
        "currency": "UAH",
        "status": "CREATED",
        "payment_url": payment_url,
        "created_at": now_iso(),
        "is_retry": True
    })

    return {"ok": True, "payment_url": payment_url, "payment_id": payment_id}


@router.post("/orders/{order_id}/freeze")
async def freeze_order(order_id: str):
    """
    Freeze order - extend TTL, disable auto-cancel.
    For customers who want to 'think about it'.
    """
    result = await db["orders"].update_one(
        {"id": order_id, "status": "AWAITING_PAYMENT"},
        {"$set": {"status": "PAYMENT_FROZEN", "frozen_at": now_iso()}}
    )

    if result.modified_count == 0:
        raise HTTPException(400, "Cannot freeze - order not in AWAITING_PAYMENT")

    return {"ok": True, "order_id": order_id, "status": "PAYMENT_FROZEN"}
