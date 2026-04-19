# O2: Events Repository (Outbox Pattern)
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)

def utcnow():
    return datetime.now(timezone.utc).isoformat()

class EventsRepo:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.col = db["domain_events"]

    async def ensure_indexes(self):
        await self.col.create_index("status")
        await self.col.create_index("next_retry_at")
        await self.col.create_index([("type", 1), ("order_id", 1), ("created_at", 1)])

    async def emit(self, type_: str, order_id: str, payload: dict):
        now = utcnow()
        doc = {
            "id": str(uuid.uuid4()),
            "type": type_,
            "order_id": order_id,
            "payload": payload or {},
            "status": "NEW",
            "attempts": 0,
            "next_retry_at": None,
            "created_at": now,
            "updated_at": now,
        }
        await self.col.insert_one(doc)
        logger.info(f"Event emitted: {type_} for order {order_id}")
        return doc

    async def pick_batch(self, limit: int = 50):
        now = utcnow()
        cur = self.col.find({
            "$or": [
                {"status": "NEW"},
                {"status": "FAILED", "next_retry_at": {"$lte": now}}
            ]
        }).sort("created_at", 1).limit(limit)
        return [x async for x in cur]

    async def mark_processing(self, event_id: str):
        await self.col.update_one(
            {"id": event_id},
            {"$set": {"status": "PROCESSING", "updated_at": utcnow()}}
        )

    async def mark_done(self, event_id: str):
        await self.col.update_one(
            {"id": event_id},
            {"$set": {"status": "DONE", "updated_at": utcnow()}}
        )

    async def mark_failed(self, event_id: str, reason: str, attempts: int, next_retry_at: str):
        await self.col.update_one(
            {"id": event_id},
            {"$set": {
                "status": "FAILED",
                "fail_reason": reason,
                "attempts": attempts,
                "next_retry_at": next_retry_at,
                "updated_at": utcnow()
            }}
        )
