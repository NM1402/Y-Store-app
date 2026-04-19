"""
D-Mode Step 5A: Recovery Analytics Routes
Track how many orders were saved by retry/resume flow
"""
from fastapi import APIRouter, Depends, Query
from datetime import datetime, timezone, timedelta
from core.db import db
from core.security import get_current_admin

router = APIRouter(prefix="/api/v2/admin/payments/recovery", tags=["Payment Recovery Analytics"])


def since_iso(days: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()


@router.get("/summary")
async def recovery_summary(
    days: int = Query(default=30, ge=7, le=180),
    admin: dict = Depends(get_current_admin)
):
    """
    Get recovery analytics summary.
    Shows how many orders were saved by retry/resume flow.
    """
    since = since_iso(days)

    # Orders that entered AWAITING_PAYMENT
    awaiting_created = await db["orders"].count_documents({
        "status": {"$in": ["AWAITING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED_AUTO"]},
        "created_at": {"$gte": since},
        "payment_policy.mode": {"$in": ["FULL_PREPAID", "SHIP_DEPOSIT"]}
    })

    # Paid orders in range
    paid_orders = [x async for x in db["orders"].find(
        {
            "status": {"$in": ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"]},
            "created_at": {"$gte": since},
            "payment_policy.mode": {"$in": ["FULL_PREPAID", "SHIP_DEPOSIT"]}
        },
        {"_id": 0, "id": 1, "created_at": 1, "totals": 1}
    )]

    # "Paid after retry": orders that received at least one reminder
    ids = [o["id"] for o in paid_orders]
    reminded = set()

    if ids:
        cur = db["notifications_outbox"].find(
            {
                "meta.order_id": {"$in": ids},
                "dedupe_key": {"$regex": r"outbox:payretry:"}
            },
            {"_id": 0, "meta.order_id": 1}
        )
        async for r in cur:
            oid = (r.get("meta") or {}).get("order_id")
            if oid:
                reminded.add(oid)

    paid_after_retry = sum(1 for o in paid_orders if o["id"] in reminded)
    revenue_recovered = sum(
        float((o.get("totals") or {}).get("grand") or 0)
        for o in paid_orders if o["id"] in reminded
    )

    recovery_rate = (paid_after_retry / awaiting_created) if awaiting_created else 0.0

    # Auto-cancelled orders
    auto_cancelled = await db["orders"].count_documents({
        "status": "CANCELLED_AUTO",
        "cancel_reason": "PAYMENT_TIMEOUT_24H",
        "cancelled_at": {"$gte": since}
    })

    return {
        "days": days,
        "awaiting_created": awaiting_created,
        "paid_total": len(paid_orders),
        "paid_after_retry": paid_after_retry,
        "recovery_rate": round(recovery_rate, 4),
        "revenue_recovered": round(revenue_recovered, 2),
        "auto_cancelled": auto_cancelled
    }


@router.get("/trend")
async def recovery_trend(
    days: int = Query(default=30, ge=7, le=180),
    admin: dict = Depends(get_current_admin)
):
    """Get daily recovery trend for charts"""
    since = since_iso(days)

    # Paid orders
    paid = [x async for x in db["orders"].find(
        {
            "status": {"$in": ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"]},
            "created_at": {"$gte": since},
            "payment_policy.mode": {"$in": ["FULL_PREPAID", "SHIP_DEPOSIT"]}
        },
        {"_id": 0, "id": 1, "created_at": 1, "totals": 1}
    )]

    ids = [o["id"] for o in paid]
    reminded = set()

    if ids:
        cur = db["notifications_outbox"].find(
            {"meta.order_id": {"$in": ids}, "dedupe_key": {"$regex": r"outbox:payretry:"}},
            {"_id": 0, "meta.order_id": 1}
        )
        async for r in cur:
            oid = (r.get("meta") or {}).get("order_id")
            if oid:
                reminded.add(oid)

    # Build daily series
    start = datetime.now(timezone.utc) - timedelta(days=days - 1)
    labels = []
    paid_after = []
    revenue = []

    bucket_c = {}
    bucket_r = {}

    for o in paid:
        day = (o.get("created_at") or "")[:10]
        if o["id"] in reminded:
            bucket_c[day] = bucket_c.get(day, 0) + 1
            bucket_r[day] = bucket_r.get(day, 0.0) + float((o.get("totals") or {}).get("grand") or 0)

    for i in range(days):
        d = (start + timedelta(days=i)).date().isoformat()
        labels.append(d)
        paid_after.append(int(bucket_c.get(d, 0)))
        revenue.append(round(float(bucket_r.get(d, 0.0)), 2))

    return {
        "days": days,
        "labels": labels,
        "paid_after_retry": paid_after,
        "revenue_recovered": revenue
    }
