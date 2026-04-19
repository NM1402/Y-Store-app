"""
O9: Bot Audit Log Repository
"""
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
import uuid


class BotAuditRepo:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.col = db["bot_audit_log"]

    async def ensure_indexes(self):
        await self.col.create_index("user_id")
        await self.col.create_index("created_at")
        await self.col.create_index("action")

    async def log(
        self, 
        user_id: int, 
        action: str, 
        details: dict = None
    ):
        """Log bot action for audit"""
        await self.col.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "action": action,
            "details": details or {},
            "created_at": datetime.now(timezone.utc).isoformat()
        })

    async def get_recent(self, limit: int = 100) -> list:
        """Get recent audit logs"""
        cur = self.col.find({}, {"_id": 0}).sort("created_at", -1).limit(limit)
        return [x async for x in cur]

    async def get_by_user(self, user_id: int, limit: int = 50) -> list:
        """Get logs for specific user"""
        cur = self.col.find(
            {"user_id": user_id}, 
            {"_id": 0}
        ).sort("created_at", -1).limit(limit)
        return [x async for x in cur]
