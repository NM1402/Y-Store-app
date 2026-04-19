# O1: Tracking Repository
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument
from datetime import datetime, timezone

def utcnow():
    return datetime.now(timezone.utc).isoformat()

class NPTrackingRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.orders = db["orders"]

    async def get_active_shipments(self):
        return self.orders.find({
            "status": "SHIPPED",
            "shipment.provider": "NOVAPOSHTA",
            "shipment.ttn": {"$exists": True},
        })

    async def update_tracking(self, order_id: str, status_code: int, status_text: str, raw: dict):
        now = utcnow()
        return await self.orders.find_one_and_update(
            {"id": order_id},
            {
                "$set": {
                    "shipment.tracking.status_code": status_code,
                    "shipment.tracking.status_text": status_text,
                    "shipment.tracking.updated_at": now,
                },
                "$push": {
                    "shipment.tracking_history": {
                        "status_code": status_code,
                        "status_text": status_text,
                        "at": now,
                    }
                }
            },
            return_document=ReturnDocument.AFTER,
            projection={"_id": 0}
        )

    async def mark_delivered_atomic(self, order_id: str):
        now = utcnow()
        return await self.orders.find_one_and_update(
            {"id": order_id, "status": "SHIPPED"},
            {
                "$set": {"status": "DELIVERED", "updated_at": now},
                "$inc": {"version": 1},
                "$push": {
                    "status_history": {
                        "from": "SHIPPED",
                        "to": "DELIVERED",
                        "actor": "delivery:tracking",
                        "reason": "NP_STATUS_DELIVERED",
                        "at": now
                    }
                }
            },
            return_document=ReturnDocument.AFTER,
            projection={"_id": 0}
        )
