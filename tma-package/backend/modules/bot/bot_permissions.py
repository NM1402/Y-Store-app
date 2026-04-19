"""
O13: Bot Permissions - Multi-Admin Roles System
Roles: OWNER / OPERATOR / VIEWER
"""
from datetime import datetime, timezone

ROLE_OWNER = "OWNER"
ROLE_OPERATOR = "OPERATOR"
ROLE_VIEWER = "VIEWER"
ALL_ROLES = {ROLE_OWNER, ROLE_OPERATOR, ROLE_VIEWER}


def utcnow():
    return datetime.now(timezone.utc).isoformat()


class BotPermissions:
    def __init__(self, db):
        self.db = db
        self.col = db["bot_admins"]

    async def ensure_indexes(self):
        await self.col.create_index("user_id", unique=True)
        await self.col.create_index("active")

    async def ensure_owner_bootstrap(self, user_id: int):
        """
        If bot_admins is empty - first user becomes OWNER
        """
        await self.ensure_indexes()
        existing = await self.col.find_one({})
        if existing:
            return False
        await self.col.insert_one({
            "user_id": user_id,
            "role": ROLE_OWNER,
            "active": True,
            "created_at": utcnow(),
            "updated_at": utcnow()
        })
        return True

    async def get_admin(self, user_id: int):
        return await self.col.find_one({"user_id": user_id, "active": True}, {"_id": 0})

    async def get_role(self, user_id: int):
        doc = await self.get_admin(user_id)
        return doc["role"] if doc else None

    async def require(self, user_id: int, allowed_roles: list) -> bool:
        role = await self.get_role(user_id)
        return role in allowed_roles

    async def list_admins(self):
        cur = self.col.find({}, {"_id": 0}).sort("created_at", 1)
        return [x async for x in cur]

    async def grant(self, user_id: int, role: str):
        if role not in ALL_ROLES:
            raise ValueError("Invalid role")
        await self.col.update_one(
            {"user_id": user_id},
            {"$set": {"user_id": user_id, "role": role, "active": True, "updated_at": utcnow()},
             "$setOnInsert": {"created_at": utcnow()}},
            upsert=True
        )

    async def revoke(self, user_id: int):
        await self.col.update_one(
            {"user_id": user_id},
            {"$set": {"active": False, "updated_at": utcnow()}}
        )
