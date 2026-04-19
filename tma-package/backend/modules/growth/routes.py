"""
Growth Module Routes
- Abandoned cart recovery
- Payment recovery
- Post-purchase automation
- LTV segmentation
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter()

# Database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "ystore")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


@router.get("/api/v2/growth/abandoned-carts")
async def get_abandoned_carts(minutes: int = 60, limit: int = 100):
    """Get abandoned carts older than specified minutes"""
    from .abandoned import find_abandoned_carts
    return await find_abandoned_carts(minutes, limit)


@router.post("/api/v2/growth/abandoned-carts/process")
async def process_abandoned_carts():
    """Process abandoned carts and create notifications"""
    from .abandoned import find_abandoned_carts, enqueue_abandoned_notification
    
    carts = await find_abandoned_carts(minutes=60, limit=50)
    processed = 0
    
    for cart in carts:
        result = await enqueue_abandoned_notification(cart)
        if result:
            processed += 1
    
    return {"processed": processed, "total_found": len(carts)}


@router.get("/api/v2/growth/payment-recovery")
async def get_payment_recovery_candidates(minutes: int = 20, limit: int = 100):
    """Get orders awaiting payment for recovery"""
    threshold = datetime.now(timezone.utc) - timedelta(minutes=minutes)
    
    orders = await db.orders.find({
        "status": {"$in": ["AWAITING_PAYMENT", "pending"]},
        "payment_status": {"$in": ["pending", "awaiting"]},
        "created_at": {"$lt": threshold}
    }).to_list(limit)
    
    # Convert ObjectId
    for order in orders:
        order["_id"] = str(order.get("_id", ""))
        if "created_at" in order and hasattr(order["created_at"], "isoformat"):
            order["created_at"] = order["created_at"].isoformat()
    
    return orders


@router.get("/api/v2/growth/segments")
async def get_customer_segments():
    """Get customer LTV segments"""
    pipeline = [
        {"$group": {
            "_id": "$segment",
            "count": {"$sum": 1},
            "avg_ltv": {"$avg": "$ltv_total"},
            "avg_orders": {"$avg": "$orders_count"}
        }},
        {"$sort": {"avg_ltv": -1}}
    ]
    
    segments = await db.customers.aggregate(pipeline).to_list(10)
    
    # Define segment labels
    segment_labels = {
        "VIP": "VIP клієнти",
        "ACTIVE": "Активні",
        "NEW": "Нові",
        "AT_RISK": "Під ризиком",
        "CHURNED": "Втрачені"
    }
    
    return [
        {
            "segment": s["_id"] or "UNKNOWN",
            "label": segment_labels.get(s["_id"], s["_id"] or "Невідомо"),
            "count": s["count"],
            "avg_ltv": round(s["avg_ltv"] or 0, 2),
            "avg_orders": round(s["avg_orders"] or 0, 1)
        }
        for s in segments
    ]


@router.post("/api/v2/growth/broadcast")
async def create_broadcast(payload: dict):
    """Create marketing broadcast to segment"""
    segment = payload.get("segment")
    message = payload.get("message")
    channel = payload.get("channel", "telegram")
    
    if not segment or not message:
        raise HTTPException(status_code=400, detail="segment and message required")
    
    # Get customers in segment
    query = {"segment": segment} if segment != "ALL" else {}
    customers = await db.customers.find(query, {"phone": 1, "telegram_id": 1}).to_list(1000)
    
    # Create broadcast job
    broadcast = {
        "segment": segment,
        "message": message,
        "channel": channel,
        "recipients_count": len(customers),
        "status": "pending",
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.broadcasts.insert_one(broadcast)
    
    return {
        "broadcast_id": str(result.inserted_id),
        "recipients_count": len(customers),
        "status": "queued"
    }


@router.post("/api/v2/growth/broadcast/send")
async def send_broadcast(payload: dict):
    """Send Telegram broadcast to segment immediately"""
    from .scheduler import send_telegram_message
    
    segment = payload.get("segment")
    message = payload.get("message")
    
    if not segment or not message:
        raise HTTPException(status_code=400, detail="segment and message required")
    
    # Get customers with telegram_id
    query = {"telegram_id": {"$exists": True, "$ne": None}}
    if segment != "ALL":
        query["segment"] = segment
    
    customers = await db.customers.find(query, {"telegram_id": 1}).to_list(500)
    
    sent = 0
    failed = 0
    
    for customer in customers:
        telegram_id = customer.get("telegram_id")
        if telegram_id:
            success = await send_telegram_message(telegram_id, message)
            if success:
                sent += 1
            else:
                failed += 1
    
    # Save broadcast result
    await db.broadcasts.insert_one({
        "segment": segment,
        "message": message,
        "channel": "telegram",
        "recipients_count": len(customers),
        "sent_count": sent,
        "failed_count": failed,
        "status": "completed",
        "created_at": datetime.now(timezone.utc)
    })
    
    return {
        "sent": sent,
        "failed": failed,
        "total": len(customers)
    }


@router.get("/api/v2/growth/audience/export")
async def export_audience(segment: Optional[str] = None):
    """Export audience for retargeting (Meta/Google Ads)"""
    query = {"segment": segment} if segment else {}
    
    customers = await db.customers.find(
        query,
        {"phone": 1, "email": 1, "segment": 1, "ltv_total": 1, "_id": 0}
    ).to_list(10000)
    
    return {
        "count": len(customers),
        "segment": segment or "ALL",
        "data": customers
    }


@router.get("/api/v2/growth/review-requests")
async def get_review_request_candidates(days_after_delivery: int = 3, limit: int = 50):
    """Get delivered orders ready for review request"""
    threshold = datetime.now(timezone.utc) - timedelta(days=days_after_delivery)
    
    orders = await db.orders.find({
        "status": "DELIVERED",
        "delivered_at": {"$lt": threshold},
        "review_requested": {"$ne": True}
    }).to_list(limit)
    
    for order in orders:
        order["_id"] = str(order.get("_id", ""))
    
    return orders
