"""
Y-Store Marketplace - Database Connection
"""
from motor.motor_asyncio import AsyncIOMotorClient
from core.config import settings

client = AsyncIOMotorClient(settings.MONGO_URL)
db = client[settings.DB_NAME]


async def init_db():
    """Create indexes on startup"""
    # Core collections
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.products.create_index("id", unique=True)
    await db.products.create_index("category_id")
    await db.products.create_index("seller_id")
    await db.products.create_index([("name", "text"), ("description", "text")])
    await db.categories.create_index("id", unique=True)
    await db.categories.create_index("slug", unique=True)
    await db.reviews.create_index("product_id")
    await db.carts.create_index("user_id", unique=True)
    
    # Orders - with optimistic locking support
    await db.orders.create_index("id", unique=True)
    await db.orders.create_index("user_id")
    await db.orders.create_index("status")
    await db.orders.create_index("created_at")
    
    # Payment events - webhook idempotency
    await db.payment_events.create_index(
        [("provider", 1), ("provider_event_id", 1)], 
        unique=True
    )
    await db.payment_events.create_index("order_id")
    await db.payment_events.create_index("signature_hash", unique=True, sparse=True)
    
    # Idempotency keys - general API idempotency
    await db.idempotency_keys.create_index("key_hash", unique=True)
    await db.idempotency_keys.create_index("expires_at", expireAfterSeconds=0)


async def close_db():
    """Close database connection"""
    client.close()
