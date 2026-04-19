"""
O14: Guard Repository
"""
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone


def utcnow():
    return datetime.now(timezone.utc).isoformat()


class GuardRepo:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.events = db["guard_events"]
        self.inc = db["guard_incidents"]

    async def ensure_indexes(self):
        await self.events.create_index("dedupe_key", unique=True)
        await self.inc.create_index("key", unique=True)
        await self.inc.create_index("status")
        await self.inc.create_index("type")

    async def once(self, dedupe_key: str, doc: dict) -> bool:
        """Idempotent event creation - returns True if first time"""
        doc = {**doc, "dedupe_key": dedupe_key, "created_at": utcnow()}
        try:
            await self.events.insert_one(doc)
            return True
        except Exception:
            return False

    async def upsert_incident(self, incident: dict):
        incident["updated_at"] = utcnow()
        await self.inc.update_one(
            {"key": incident["key"]},
            {"$set": incident, "$setOnInsert": {"created_at": utcnow()}},
            upsert=True
        )

    async def get_incident(self, key: str):
        return await self.inc.find_one({"key": key}, {"_id": 0})

    async def list_open(self, limit: int = 50):
        cur = self.inc.find(
            {"status": {"$in": ["OPEN", "MUTED"]}},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit)
        return [x async for x in cur]

    async def mute_incident(self, key: str, until: str):
        await self.inc.update_one(
            {"key": key},
            {"$set": {"status": "MUTED", "muted_until": until, "updated_at": utcnow()}}
        )

    async def resolve_incident(self, key: str):
        await self.inc.update_one(
            {"key": key},
            {"$set": {"status": "RESOLVED", "resolved_at": utcnow(), "updated_at": utcnow()}}
        )
