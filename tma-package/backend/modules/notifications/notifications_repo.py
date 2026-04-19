# O2: Notifications Repository
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
import uuid

def utcnow():
    return datetime.now(timezone.utc).isoformat()

class NotificationsRepo:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.col = db["notification_queue"]

    async def ensure_indexes(self):
        await self.col.create_index("status")
        await self.col.create_index("next_retry_at")
        await self.col.create_index([("channel", 1), ("to", 1), ("created_at", 1)])
        await self.col.create_index("dedupe_key", unique=True, sparse=True)

    async def enqueue(self, channel: str, to: str, template: str, payload: dict, dedupe_key: str = None):
        doc = {
            "id": str(uuid.uuid4()),
            "channel": channel,
            "to": to,
            "template": template,
            "payload": payload,
            "dedupe_key": dedupe_key,
            "status": "PENDING",
            "attempts": 0,
            "next_retry_at": None,
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }
        try:
            await self.col.insert_one(doc)
            return {"inserted": True, "doc": doc}
        except Exception:
            if dedupe_key:
                existing = await self.col.find_one({"dedupe_key": dedupe_key}, {"_id": 0})
                return {"inserted": False, "doc": existing}
            raise

    async def pick_pending(self, limit: int = 50):
        now = utcnow()
        cur = self.col.find({
            "$or": [
                {"status": "PENDING"},
                {"status": "FAILED", "next_retry_at": {"$lte": now}}
            ]
        }).sort("created_at", 1).limit(limit)
        return [x async for x in cur]

    async def mark_sent(self, id_: str, provider_meta: dict):
        await self.col.update_one(
            {"id": id_},
            {"$set": {"status": "SENT", "provider_meta": provider_meta, "updated_at": utcnow()}}
        )

    async def mark_failed(self, id_: str, reason: str, attempts: int, next_retry_at: str):
        await self.col.update_one(
            {"id": id_},
            {"$set": {
                "status": "FAILED",
                "fail_reason": reason,
                "attempts": attempts,
                "next_retry_at": next_retry_at,
                "updated_at": utcnow()
            }}
        )
