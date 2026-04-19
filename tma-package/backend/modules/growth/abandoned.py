"""
Abandoned Cart Recovery
"""
from datetime import datetime, timezone, timedelta
import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "ystore")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


async def find_abandoned_carts(minutes: int = 60, limit: int = 100):
    """
    Find carts that were updated more than X minutes ago
    and haven't been converted to orders
    """
    threshold = datetime.now(timezone.utc) - timedelta(minutes=minutes)
    
    carts = await db.carts.find({
        "updated_at": {"$lt": threshold},
        "converted": {"$ne": True},
        "items": {"$exists": True, "$ne": []},
        "abandoned_notified": {"$ne": True}
    }).to_list(limit)
    
    # Convert ObjectId
    for cart in carts:
        cart["_id"] = str(cart.get("_id", ""))
        if "updated_at" in cart and hasattr(cart["updated_at"], "isoformat"):
            cart["updated_at"] = cart["updated_at"].isoformat()
    
    return carts


async def enqueue_abandoned_notification(cart: dict):
    """
    Create notification for abandoned cart
    """
    phone = cart.get("phone") or cart.get("user_phone")
    user_id = cart.get("user_id")
    
    if not phone and not user_id:
        return False
    
    # Check if notification already sent
    existing = await db.notifications.find_one({
        "type": "abandoned_cart",
        "cart_id": cart.get("_id"),
        "status": {"$in": ["pending", "sent"]}
    })
    
    if existing:
        return False
    
    # Create notification
    notification = {
        "type": "abandoned_cart",
        "cart_id": cart.get("_id"),
        "user_id": user_id,
        "phone": phone,
        "items_count": len(cart.get("items", [])),
        "total_value": sum(
            item.get("price", 0) * item.get("quantity", 1) 
            for item in cart.get("items", [])
        ),
        "status": "pending",
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.notifications.insert_one(notification)
    
    # Mark cart as notified
    await db.carts.update_one(
        {"_id": cart.get("_id")},
        {"$set": {"abandoned_notified": True}}
    )
    
    return True


async def get_cart_recovery_message(cart: dict, lang: str = "uk") -> str:
    """Generate recovery message for abandoned cart"""
    items_count = len(cart.get("items", []))
    total = sum(
        item.get("price", 0) * item.get("quantity", 1) 
        for item in cart.get("items", [])
    )
    
    if lang == "uk":
        return f"""🛒 Ви забули завершити покупку!

У вашому кошику {items_count} товар(ів) на суму {total:.2f} грн.

Оформіть замовлення зараз та не втратьте товар!

👉 Перейти до кошика: https://y-store.ua/cart"""
    else:
        return f"""🛒 Вы забыли завершить покупку!

В вашей корзине {items_count} товар(ов) на сумму {total:.2f} грн.

Оформите заказ сейчас!

👉 Перейти в корзину: https://y-store.ua/cart"""
