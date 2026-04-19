# O1: Tracking Service
from motor.motor_asyncio import AsyncIOMotorDatabase
from .np_client import np_client
from .np_tracking_repository import NPTrackingRepository
import logging

logger = logging.getLogger(__name__)

DELIVERED_CODES = {9, 10, 11}  # NP статуси "доставлено"

class NPTrackingService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.repo = NPTrackingRepository(db)
        self.client = np_client

    async def sync_all(self):
        """Sync all active shipments with Nova Poshta"""
        cursor = await self.repo.get_active_shipments()
        synced = 0
        delivered = 0

        async for order in cursor:
            ttn = order["shipment"]["ttn"]
            
            try:
                raw = await self.client.call(
                    "TrackingDocument",
                    "getStatusDocuments",
                    {"Documents": [{"DocumentNumber": ttn}]}
                )

                if not raw.get("success"):
                    continue

                data = raw.get("data", [])
                if not data:
                    continue

                status_code = int(data[0].get("StatusCode", 0))
                status_text = data[0].get("Status", "")

                await self.repo.update_tracking(
                    order_id=order["id"],
                    status_code=status_code,
                    status_text=status_text,
                    raw=raw
                )
                synced += 1

                if status_code in DELIVERED_CODES:
                    result = await self.repo.mark_delivered_atomic(order["id"])
                    if result:
                        delivered += 1
                        logger.info(f"Order {order['id']} auto-delivered (TTN: {ttn})")
                        
                        # Emit event for notifications
                        from modules.ops.events.events_repo import EventsRepo
                        await EventsRepo(self.db).emit(
                            "ORDER_DELIVERED",
                            order["id"],
                            {"ttn": ttn, "phone": order.get("shipping", {}).get("phone")}
                        )
            except Exception as e:
                logger.error(f"Tracking sync failed for {ttn}: {e}")
                continue

        logger.info(f"Tracking sync complete: {synced} synced, {delivered} delivered")
        return {"synced": synced, "delivered": delivered}
