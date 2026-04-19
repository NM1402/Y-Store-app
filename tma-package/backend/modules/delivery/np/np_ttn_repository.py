"""
Nova Poshta TTN Repository - Idempotency and atomic operations
"""
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


def utcnow() -> str:
    """Get current UTC time as ISO string"""
    return datetime.now(timezone.utc).isoformat()


class NPTTNRepository:
    """Repository for TTN operations with idempotency support"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.orders = db["orders"]
        self.events = db["shipment_events"]  # Similar to payment_events
    
    async def ensure_indexes(self):
        """Create necessary indexes"""
        await self.events.create_index(
            [("provider", 1), ("event_id", 1)], 
            unique=True
        )
        await self.events.create_index("order_id")
        logger.info("✅ Shipment events indexes created")
    
    async def get_order(self, order_id: str) -> Optional[dict]:
        """Get order by ID"""
        return await self.orders.find_one({"id": order_id}, {"_id": 0})
    
    async def lock_ttn_idempotent(
        self, 
        order_id: str, 
        idem_key: str
    ) -> Dict[str, Any]:
        """
        Idempotent lock by (provider, event_id).
        event_id = idem_key (e.g., order_id or X-Idempotency-Key)
        
        Returns:
            {"inserted": True, "doc": ...} if new lock
            {"inserted": False, "doc": existing} if already exists
        """
        doc = {
            "provider": "NOVAPOSHTA",
            "event_id": idem_key,
            "order_id": order_id,
            "status": "LOCKED",
            "created_at": utcnow(),
        }
        
        try:
            await self.events.insert_one(doc)
            return {"inserted": True, "doc": doc}
        except Exception:
            # Duplicate key - already exists
            existing = await self.events.find_one(
                {"provider": "NOVAPOSHTA", "event_id": idem_key},
                {"_id": 0}
            )
            return {"inserted": False, "doc": existing}
    
    async def store_event_result(
        self, 
        idem_key: str, 
        result: Dict[str, Any], 
        status: str
    ):
        """Store result of TTN operation"""
        await self.events.update_one(
            {"provider": "NOVAPOSHTA", "event_id": idem_key},
            {"$set": {
                "status": status, 
                "result": result, 
                "updated_at": utcnow()
            }}
        )
    
    async def set_shipment_ttn_atomic(
        self,
        order_id: str,
        ttn: str,
        raw: Dict[str, Any],
        cost: Optional[float] = None,
        estimated_delivery_date: Optional[str] = None,
        require_status: str = "PROCESSING",
    ) -> dict:
        """
        Atomically set shipment TTN and transition to SHIPPED.
        
        Guards:
        - Only if order is in required status (PROCESSING)
        - Only if shipment.ttn doesn't exist yet
        - Increments version for optimistic locking
        - Adds status_history entry
        
        Raises:
            ValueError if atomic update fails (conflict or already exists)
        """
        now = utcnow()
        
        query = {
            "id": order_id,
            "status": require_status,
            "shipment.ttn": {"$exists": False},
        }
        
        update = {
            "$set": {
                "shipment.provider": "NOVAPOSHTA",
                "shipment.ttn": ttn,
                "shipment.cost": cost,
                "shipment.estimated_delivery_date": estimated_delivery_date,
                "shipment.raw": raw,
                "shipment.created_at": now,
                "status": "SHIPPED",
                "updated_at": now,
            },
            "$inc": {"version": 1},
            "$push": {
                "status_history": {
                    "from": require_status,
                    "to": "SHIPPED",
                    "actor": "delivery:novaposhta",
                    "reason": "TTN_CREATED",
                    "at": now,
                }
            },
        }
        
        doc = await self.orders.find_one_and_update(
            query, 
            update, 
            return_document=ReturnDocument.AFTER, 
            projection={"_id": 0}
        )
        
        if not doc:
            # Either TTN already exists, or status is wrong, or version conflict
            raise ValueError("TTN_CONFLICT_OR_ALREADY_EXISTS")
        
        return doc
    
    async def update_tracking_status(
        self,
        order_id: str,
        ttn: str,
        status: str,
        status_code: Optional[str] = None,
        actual_delivery_date: Optional[str] = None,
    ) -> Optional[dict]:
        """Update tracking status for existing TTN"""
        now = utcnow()
        
        update = {
            "$set": {
                "shipment.tracking_status": status,
                "shipment.tracking_status_code": status_code,
                "shipment.tracking_updated_at": now,
            }
        }
        
        if actual_delivery_date:
            update["$set"]["shipment.actual_delivery_date"] = actual_delivery_date
        
        # Auto-transition to DELIVERED if status indicates delivery
        delivered_codes = ["9", "10", "11"]  # NP status codes for delivered
        if status_code in delivered_codes:
            update["$set"]["status"] = "DELIVERED"
            update["$push"] = {
                "status_history": {
                    "from": "SHIPPED",
                    "to": "DELIVERED",
                    "actor": "delivery:novaposhta:tracking",
                    "reason": f"TRACKING_STATUS_{status_code}",
                    "at": now,
                }
            }
        
        return await self.orders.find_one_and_update(
            {"id": order_id, "shipment.ttn": ttn},
            update,
            return_document=ReturnDocument.AFTER,
            projection={"_id": 0}
        )
