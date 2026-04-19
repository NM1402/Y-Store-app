"""
O13: Bot Runtime State - Quiet Mode
"""
from datetime import datetime, timezone, timedelta


class BotRuntimeState:
    def __init__(self, db):
        self.col = db["bot_runtime_state"]

    async def ensure_indexes(self):
        await self.col.create_index("key", unique=True)

    async def set_quiet(self, hours: int):
        await self.ensure_indexes()
        until = datetime.now(timezone.utc) + timedelta(hours=hours)
        await self.col.update_one(
            {"key": "quiet_mode"},
            {"$set": {"key": "quiet_mode", "enabled": True, "until": until.isoformat()}},
            upsert=True
        )
        return until

    async def unset_quiet(self):
        await self.ensure_indexes()
        await self.col.update_one(
            {"key": "quiet_mode"},
            {"$set": {"key": "quiet_mode", "enabled": False, "until": None}},
            upsert=True
        )

    async def is_quiet(self) -> bool:
        doc = await self.col.find_one({"key": "quiet_mode"})
        if not doc:
            return False
        if not doc.get("enabled"):
            return False
        until = doc.get("until")
        if not until:
            return False
        try:
            u = datetime.fromisoformat(until.replace("Z", "+00:00"))
        except:
            return False
        return datetime.now(timezone.utc) < u
