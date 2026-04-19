"""
Analytics Routes - Event tracking and funnel endpoints
"""
from fastapi import APIRouter, Request, HTTPException
from datetime import datetime, timezone
from typing import Optional
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter()

# Database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "ystore")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


@router.post("/api/v2/analytics/event")
async def track_event(payload: dict, req: Request):
    """
    Track analytics event
    Events: page_view, product_view, add_to_cart, checkout_start, 
            order_created, payment_created, payment_paid
    """
    try:
        event_data = {
            "event": str(payload.get("event", "unknown")),
            "ts": datetime.now(timezone.utc),
            "sid": str(payload.get("sid") or payload.get("session_id") or "anon"),
            "user_id": payload.get("user_id"),
            "phone": payload.get("phone"),
            "page": payload.get("page") or payload.get("page_path"),
            "ref": payload.get("ref") or payload.get("referrer"),
            "ua": req.headers.get("user-agent"),
            "ip": req.client.host if req.client else None,
            "product_id": payload.get("product_id"),
            "order_id": payload.get("order_id"),
            "props": payload.get("props") or payload.get("metadata") or {},
        }
        
        # Add extra fields from payload
        for key in ["event_type", "page_title", "time_spent", "quantity", "price"]:
            if key in payload:
                event_data["props"][key] = payload[key]
        
        await db.events.insert_one(event_data)
        return {"ok": True}
    except Exception as e:
        print(f"Analytics error: {e}")
        return {"ok": False, "error": str(e)}


@router.get("/api/v2/analytics/funnel")
async def get_funnel(days: int = 7):
    """Get funnel analytics for specified days"""
    from .funnel import funnel_summary
    return await funnel_summary(days)


@router.get("/api/v2/admin/analytics/funnel")
async def admin_funnel(days: int = 7):
    """Admin endpoint for funnel analytics"""
    from .funnel import funnel_summary
    return await funnel_summary(days)


@router.get("/api/v2/admin/analytics/overview")
async def admin_overview(days: int = 7):
    """Get analytics overview for admin dashboard"""
    from datetime import timedelta
    
    since = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Get unique sessions
    sessions_pipeline = [
        {"$match": {"ts": {"$gte": since}}},
        {"$group": {"_id": "$sid"}},
        {"$count": "total"}
    ]
    sessions_result = await db.events.aggregate(sessions_pipeline).to_list(1)
    total_sessions = sessions_result[0]["total"] if sessions_result else 0
    
    # Get unique users
    users_pipeline = [
        {"$match": {"ts": {"$gte": since}, "user_id": {"$ne": None}}},
        {"$group": {"_id": "$user_id"}},
        {"$count": "total"}
    ]
    users_result = await db.events.aggregate(users_pipeline).to_list(1)
    total_users = users_result[0]["total"] if users_result else 0
    
    # Get page views
    page_views = await db.events.count_documents({
        "ts": {"$gte": since},
        "event": {"$in": ["page_view", "product_view"]}
    })
    
    # Get orders
    orders = await db.orders.count_documents({
        "created_at": {"$gte": since}
    })
    
    # Get revenue
    revenue_pipeline = [
        {"$match": {"created_at": {"$gte": since}, "payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]
    revenue_result = await db.orders.aggregate(revenue_pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    return {
        "period_days": days,
        "total_sessions": total_sessions,
        "total_users": total_users,
        "page_views": page_views,
        "orders": orders,
        "revenue": total_revenue,
        "conversion_rate": round((orders / total_sessions * 100) if total_sessions > 0 else 0, 2)
    }


@router.get("/api/v2/admin/analytics/top-products")
async def admin_top_products(days: int = 7, limit: int = 10):
    """Get top viewed products"""
    from datetime import timedelta
    
    since = datetime.now(timezone.utc) - timedelta(days=days)
    
    pipeline = [
        {"$match": {
            "ts": {"$gte": since},
            "event": "product_view",
            "product_id": {"$ne": None}
        }},
        {"$group": {
            "_id": "$product_id",
            "views": {"$sum": 1},
            "unique_visitors": {"$addToSet": "$sid"}
        }},
        {"$project": {
            "product_id": "$_id",
            "views": 1,
            "unique_visitors": {"$size": "$unique_visitors"}
        }},
        {"$sort": {"views": -1}},
        {"$limit": limit}
    ]
    
    results = await db.events.aggregate(pipeline).to_list(limit)
    
    # Enrich with product data
    for result in results:
        product = await db.products.find_one(
            {"id": result["product_id"]},
            {"title": 1, "price": 1, "images": 1}
        )
        if product:
            result["title"] = product.get("title", "Unknown")
            result["price"] = product.get("price", 0)
            result["image"] = product.get("images", [None])[0]
    
    return results
