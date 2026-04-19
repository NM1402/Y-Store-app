"""
O12: Bot Sessions Repository (FSM state in MongoDB)
"""
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone


def utcnow():
    return datetime.now(timezone.utc).isoformat()


class BotSessionsRepo:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.col = db["bot_sessions"]

    async def ensure_indexes(self):
        await self.col.create_index("user_id", unique=True)
        await self.col.create_index("updated_at")

    async def get(self, user_id: int) -> dict:
        """Get session for user or empty default"""
        doc = await self.col.find_one({"user_id": user_id}, {"_id": 0})
        return doc or {"user_id": user_id, "state": None, "data": {}}

    async def set_state(self, user_id: int, state: str, data: dict = None):
        """Set FSM state and optional data"""
        payload = {
            "state": state,
            "updated_at": utcnow()
        }
        if data is not None:
            payload["data"] = data
        
        await self.col.update_one(
            {"user_id": user_id},
            {
                "$set": payload,
                "$setOnInsert": {"created_at": utcnow()}
            },
            upsert=True
        )

    async def patch_data(self, user_id: int, patch: dict):
        """Merge patch into existing data"""
        s = await self.get(user_id)
        data = s.get("data") or {}
        data.update(patch)
        await self.set_state(user_id, s.get("state"), data)

    async def clear(self, user_id: int):
        """Clear session state"""
        await self.set_state(user_id, None, {})
