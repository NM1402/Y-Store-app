"""
O9: Admin Alerts Queue Repository
"""
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone, timedelta
import uuid
from typing import Dict, Any, Optional

def utcnow():
    return datetime.now(timezone.utc).isoformat()


class BotAlertsRepo:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.col = db["admin_alerts_queue"]

    async def ensure_indexes(self):
        await self.col.create_index("status")
        await self.col.create_index("next_retry_at")
        await self.col.create_index("dedupe_key", unique=True)
        await self.col.create_index("created_at")

    async def enqueue(
        self, 
        alert_type: str, 
        text: str, 
        dedupe_key: str,
        payload: Dict[str, Any] = None,
        reply_markup: Dict[str, Any] = None
    ) -> dict:
        """
        Enqueue alert with idempotency (dedupe_key).
        Returns {"inserted": True/False, "doc": ...}
        """
        doc = {
            "id": str(uuid.uuid4()),
            "type": alert_type,
            "text": text,
            "payload": payload or {},
            "reply_markup": reply_markup,
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
            existing = await self.col.find_one({"dedupe_key": dedupe_key}, {"_id": 0})
            return {"inserted": False, "doc": existing}

    async def pick(self, limit: int = 50) -> list:
        """Pick pending or ready-to-retry alerts"""
        now = utcnow()
        cur = self.col.find({
            "$or": [
                {"status": "PENDING"},
                {"status": "FAILED", "next_retry_at": {"$lte": now}}
            ]
        }, {"_id": 0}).sort("created_at", 1).limit(limit)
        return [x async for x in cur]

    async def mark_sent(self, alert_id: str, meta: dict = None):
        await self.col.update_one(
            {"id": alert_id},
            {"$set": {
                "status": "SENT", 
                "meta": meta or {}, 
                "updated_at": utcnow()
            }}
        )

    async def mark_failed(self, alert_id: str, reason: str, attempts: int, next_retry_at: str):
        await self.col.update_one(
            {"id": alert_id},
            {"$set": {
                "status": "FAILED",
                "fail_reason": reason,
                "attempts": attempts,
                "next_retry_at": next_retry_at,
                "updated_at": utcnow()
            }}
        )

    def backoff(self, attempts: int) -> str:
        """Calculate next retry time with exponential backoff"""
        mins = [1, 5, 15, 60, 240]
        m = mins[min(attempts, len(mins) - 1)]
        return (datetime.now(timezone.utc) + timedelta(minutes=m)).isoformat()
