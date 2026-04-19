"""
Funnel Analytics
Calculate conversion funnel metrics
"""
from datetime import datetime, timezone, timedelta
import os
from motor.motor_asyncio import AsyncIOMotorClient

# Database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "ystore")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Funnel steps in order
FUNNEL_STEPS = [
    "page_view",
    "product_view", 
    "add_to_cart",
    "checkout_start",
    "order_created",
    "payment_created",
    "payment_paid"
]


async def funnel_summary(days: int = 7):
    """
    Calculate funnel summary for specified period
    """
    since = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Count events by type
    pipeline = [
        {"$match": {"ts": {"$gte": since}, "event": {"$in": FUNNEL_STEPS}}},
        {"$group": {"_id": "$event", "cnt": {"$sum": 1}}},
    ]
    
    rows = await db.events.aggregate(pipeline).to_list(100)
    event_counts = {r["_id"]: r["cnt"] for r in rows}
    
    # Build ordered steps
    steps = [
        {"event": e, "count": int(event_counts.get(e, 0))}
        for e in FUNNEL_STEPS
    ]
    
    # Calculate step-by-step conversions
    conversions = []
    for i in range(1, len(steps)):
        prev_count = steps[i-1]["count"]
        curr_count = steps[i]["count"]
        rate = round((curr_count / prev_count * 100) if prev_count > 0 else 0, 2)
        conversions.append({
            "from_step": steps[i-1]["event"],
            "to_step": steps[i]["event"],
            "rate": rate
        })
    
    # Get totals
    total_visitors = steps[0]["count"] if steps else 0
    total_orders = event_counts.get("order_created", 0)
    overall_conversion = round(
        (total_orders / total_visitors * 100) if total_visitors > 0 else 0,
        2
    )
    
    return {
        "days": days,
        "steps": steps,
        "conversion": conversions,
        "total_visitors": total_visitors,
        "total_orders": total_orders,
        "overall_conversion": overall_conversion
    }


async def get_drop_off_analysis(days: int = 7):
    """
    Identify where users drop off most
    """
    funnel = await funnel_summary(days)
    
    if not funnel["conversion"]:
        return {"worst_step": None, "drop_rate": 0}
    
    # Find step with lowest conversion
    worst = min(funnel["conversion"], key=lambda x: x["rate"])
    
    return {
        "worst_step": worst["to_step"],
        "from_step": worst["from_step"],
        "drop_rate": round(100 - worst["rate"], 2),
        "recommendation": get_recommendation(worst["to_step"])
    }


def get_recommendation(step: str) -> str:
    """Get recommendation for improving specific step"""
    recommendations = {
        "product_view": "Улучшите главную страницу и каталог для привлечения к товарам",
        "add_to_cart": "Добавьте призыв к действию, улучшите описания товаров",
        "checkout_start": "Упростите корзину, добавьте срочность",
        "order_created": "Упростите форму оформления, добавьте guest checkout",
        "payment_created": "Проверьте платежную интеграцию",
        "payment_paid": "Добавьте больше способов оплаты, улучшите доверие"
    }
    return recommendations.get(step, "Проанализируйте UX на этом этапе")
