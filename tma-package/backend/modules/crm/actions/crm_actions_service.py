# O8: CRM Actions Service
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase

def utcnow():
    return datetime.now(timezone.utc).isoformat()

class CRMActionsService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.col = db["customers"]
        self.notifs = db["notification_queue"]

    async def add_note(self, phone: str, text: str, admin_id: str):
        note = {
            "id": str(uuid.uuid4()),
            "text": text,
            "author": admin_id,
            "created_at": utcnow()
        }
        await self.col.update_one(
            {"phone": phone},
            {"$push": {"notes": note}}
        )
        return note

    async def set_tags(self, phone: str, tags: list):
        await self.col.update_one(
            {"phone": phone},
            {"$set": {"tags": tags, "updated_at": utcnow()}}
        )

    async def toggle_block(self, phone: str, block: bool):
        await self.col.update_one(
            {"phone": phone},
            {"$set": {"is_blocked": block, "updated_at": utcnow()}}
        )

    async def queue_sms(self, phone: str, text: str):
        await self.notifs.insert_one({
            "id": str(uuid.uuid4()),
            "channel": "SMS",
            "to": phone,
            "template": "MANUAL",
            "payload": {"text": text},
            "status": "PENDING",
            "attempts": 0,
            "created_at": utcnow()
        })

    async def queue_email(self, email: str, subject: str, body: str):
        await self.notifs.insert_one({
            "id": str(uuid.uuid4()),
            "channel": "EMAIL",
            "to": email,
            "template": "MANUAL",
            "payload": {"subject": subject, "body": body},
            "status": "PENDING",
            "attempts": 0,
            "created_at": utcnow()
        })
