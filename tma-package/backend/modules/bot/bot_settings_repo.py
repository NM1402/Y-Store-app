"""
O9: Bot Settings Repository
"""
from motor.motor_asyncio import AsyncIOMotorDatabase
import os

DEFAULT_SETTINGS = {
    "id": "global",
    "enabled": True,
    "admin_chat_ids": [],
    "admin_user_ids": [],
    "alerts": {
        "НОВЕ_ЗАМОВЛЕННЯ": True,
        "ОПЛАТА_ПРОЙШЛА": True,
        "ТТН_СТВОРЕНО": True,
        "ЗАТРИМКА_ДОСТАВКИ": True,
        "ПОМИЛКА_СПОВІЩЕННЯ": True,
        "ВЕЛИКЕ_ЗАМОВЛЕННЯ": True,
    },
    "thresholds": {
        "big_order_uah": 10000,
        "delivery_delay_hours": 48,
        "notif_fail_streak": 5,
    },
    "automation": {
        "enabled": True,
        "vip": {
            "enabled": True,
            "ltv_uah": 20000,
            "delivered_count": 10
        },
        "risk": {
            "enabled": True,
            "returns_count": 2,
            "notif_fail_streak": 5
        },
        "delay": {
            "enabled": True,
            "hours": 48
        },
        "auto_block": {
            "enabled": False,
            "returns_count": 3
        }
    }
}


class BotSettingsRepo:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.col = db["bot_settings"]

    async def get(self) -> dict:
        doc = await self.col.find_one({"id": "global"}, {"_id": 0})
        if not doc:
            # Initialize with defaults + env chat IDs
            defaults = dict(DEFAULT_SETTINGS)
            
            # Parse env vars
            chat_ids = os.getenv("TELEGRAM_ADMIN_CHAT_IDS", "")
            user_ids = os.getenv("TELEGRAM_ADMIN_USER_IDS", "")
            
            if chat_ids:
                defaults["admin_chat_ids"] = [x.strip() for x in chat_ids.split(",") if x.strip()]
            if user_ids:
                defaults["admin_user_ids"] = [int(x.strip()) for x in user_ids.split(",") if x.strip()]
            
            await self.col.insert_one(defaults)
            return defaults
        return doc

    async def update(self, data: dict):
        await self.col.update_one(
            {"id": "global"}, 
            {"$set": data}, 
            upsert=True
        )

    async def update_threshold(self, key: str, value):
        await self.col.update_one(
            {"id": "global"},
            {"$set": {f"thresholds.{key}": value}}
        )

    async def toggle_alert(self, alert_type: str, enabled: bool):
        await self.col.update_one(
            {"id": "global"},
            {"$set": {f"alerts.{alert_type}": enabled}}
        )

    async def add_chat_id(self, chat_id: str):
        await self.col.update_one(
            {"id": "global"},
            {"$addToSet": {"admin_chat_ids": chat_id}}
        )

    async def add_user_id(self, user_id: int):
        await self.col.update_one(
            {"id": "global"},
            {"$addToSet": {"admin_user_ids": user_id}}
        )
