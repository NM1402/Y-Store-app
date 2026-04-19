# O5: CRM Repository
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
import uuid

def utcnow():
    return datetime.now(timezone.utc).isoformat()

class CRMRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.col = db["customers"]

    async def ensure_indexes(self):
        await self.col.create_index("phone", unique=True)
        await self.col.create_index("segment")
        await self.col.create_index("email")

    async def upsert_customer_from_order(self, order: dict):
        now = utcnow()
        shipping = order.get("shipping") or {}
        phone = shipping.get("phone")
        
        if not phone:
            return None
            
        email = shipping.get("email")
        name = shipping.get("full_name")
        total = float((order.get("totals") or {}).get("grand") or 0)

        existing = await self.col.find_one({"phone": phone})

        if not existing:
            doc = {
                "id": str(uuid.uuid4()),
                "phone": phone,
                "email": email,
                "name": name,
                "orders_count": 1,
                "total_spent": total,
                "average_order_value": total,
                "delivered_count": 0,
                "returned_count": 0,
                "segment": "NEW",
                "tags": [],
                "notes": [],
                "is_blocked": False,
                "first_order_at": now,
                "last_order_at": now,
                "created_at": now,
                "updated_at": now
            }
            await self.col.insert_one(doc)
            return doc

        orders_count = existing["orders_count"] + 1
        total_spent = existing["total_spent"] + total

        segment = "REGULAR"
        if existing.get("returned_count", 0) >= 2:
            segment = "RISK"

        await self.col.update_one(
            {"phone": phone},
            {"$set": {
                "email": email or existing.get("email"),
                "name": name or existing.get("name"),
                "orders_count": orders_count,
                "total_spent": total_spent,
                "average_order_value": total_spent / orders_count,
                "last_order_at": now,
                "segment": segment,
                "updated_at": now
            }}
        )
        return await self.col.find_one({"phone": phone}, {"_id": 0})

    async def increment_delivered(self, phone: str):
        await self.col.update_one(
            {"phone": phone},
            {"$inc": {"delivered_count": 1}}
        )

    async def increment_returned(self, phone: str):
        result = await self.col.find_one_and_update(
            {"phone": phone},
            {"$inc": {"returned_count": 1}},
            return_document=True
        )
        # Auto-RISK if 2+ returns
        if result and result.get("returned_count", 0) >= 2:
            await self.col.update_one(
                {"phone": phone},
                {"$set": {"segment": "RISK"}}
            )
