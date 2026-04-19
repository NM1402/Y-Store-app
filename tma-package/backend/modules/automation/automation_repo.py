"""
O11: Automation Events Repository (idempotency)
"""
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone


def utcnow():
    return datetime.now(timezone.utc).isoformat()


class AutomationEventsRepo:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.col = db["automation_events"]

    async def ensure_indexes(self):
        await self.col.create_index("dedupe_key", unique=True)
        await self.col.create_index("created_at")
        await self.col.create_index("rule")

    async def once(self, dedupe_key: str, doc: dict) -> bool:
        """
        Returns True if inserted (first time), False if already exists.
        Used for idempotent rule execution.
        """
        doc = {**doc, "dedupe_key": dedupe_key, "created_at": utcnow()}
        try:
            await self.col.insert_one(doc)
            return True
        except Exception:
            return False
