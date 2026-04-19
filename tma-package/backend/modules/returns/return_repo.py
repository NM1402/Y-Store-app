"""
O20.3: Return Management Engine - Repository
Handles DB operations: idempotency, order updates, ledger, CRM counters, alerts
"""
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

logger = logging.getLogger(__name__)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


class ReturnRepo:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.orders = db["orders"]
        self.customers = db["customers"]
        self.ledger = db["finance_ledger"]
        self.timeline = db["timeline_events"]
        self.alerts = db["admin_alerts_queue"]
        self.events = db["return_events"]  # Idempotent processing

    async def ensure_indexes(self):
        """Create required indexes"""
        try:
            await self.events.create_index("dedupe_key", unique=True)
        except Exception:
            pass  # Index already exists
            
        try:
            await self.orders.create_index("shipment.ttn")
        except Exception:
            pass  # Index already exists
            
        try:
            await self.orders.create_index("returns.stage")
        except Exception:
            pass  # Index already exists
            
        try:
            await self.ledger.create_index(
                [("order_id", 1), ("type", 1), ("ref", 1)], 
                unique=True, 
                sparse=True
            )
        except Exception:
            pass  # Index already exists
            
        try:
            await self.alerts.create_index("dedupe_key", unique=True, sparse=True)
        except Exception:
            pass  # Index already exists

    async def list_active_shipments(self, limit: int = 500):
        """List orders with active shipments that could be returning"""
        query = {
            "shipment.ttn": {"$exists": True, "$ne": None},
            "status": {"$in": ["SHIPPED", "shipped", "PROCESSING", "processing"]},
            "returns.stage": {"$nin": ["RETURNED", "RESOLVED"]}
        }
        cursor = self.orders.find(query, {"_id": 0}).sort("created_at", -1).limit(limit)
        return [x async for x in cursor]

    async def mark_event_once(self, dedupe_key: str, payload: dict) -> bool:
        """Idempotent event marker - returns True if this is new event"""
        try:
            await self.events.insert_one({
                "dedupe_key": dedupe_key, 
                "payload": payload, 
                "created_at": now_iso()
            })
            return True
        except Exception:
            return False

    async def set_return_state(self, order_id: str, stage: str, reason: str, np: dict):
        """Update order with return state information"""
        await self.orders.update_one(
            {"id": order_id},
            {"$set": {
                "returns.stage": stage,
                "returns.reason": reason,
                "returns.updated_at": now_iso(),
                "returns.np_status": {
                    "code": np.get("status_code") or np.get("StatusCode"),
                    "text": np.get("status_text") or np.get("StatusText") or np.get("Status"),
                }
            }}
        )

    async def transition_order_status(self, order_id: str, new_status: str):
        """Transition order to new status"""
        await self.orders.update_one(
            {"id": order_id}, 
            {"$set": {"status": new_status, "updated_at": now_iso()}}
        )

    async def add_ledger_once(self, order_id: str, type_: str, amount: float, ref: str, meta: dict) -> bool:
        """Add ledger entry with idempotency (unique: order_id+type+ref)"""
        doc = {
            "order_id": order_id,
            "type": type_,
            "direction": "OUT",  # Losses are always OUT
            "amount": float(amount),
            "currency": "UAH",
            "ref": ref,
            "meta": meta,
            "created_at": now_iso(),
        }
        try:
            await self.ledger.insert_one(doc)
            return True
        except Exception:
            return False

    async def inc_customer_return_counters(self, phone: str, is_cod: bool, reason: str):
        """Increment customer return counters"""
        upd = {"$inc": {"counters.returns_total": 1}}
        
        if is_cod and reason in ["REFUSED", "NOT_PICKED_UP", "STORAGE_EXPIRED"]:
            upd["$inc"]["counters.cod_refusals_total"] = 1
            
        await self.customers.update_one({"phone": phone}, upd, upsert=True)

    async def set_customer_risk_if_needed(self, phone: str):
        """Update customer segment to RISK or BLOCK_COD if thresholds exceeded"""
        c = await self.customers.find_one(
            {"phone": phone}, 
            {"_id": 0, "counters": 1, "segment": 1}
        )
        if not c:
            return
            
        counters = c.get("counters") or {}
        returns_total = int(counters.get("returns_total", 0))
        cod_ref = int(counters.get("cod_refusals_total", 0))
        segment = c.get("segment") or "NORMAL"
        
        # Rules:
        # 2+ returns -> RISK
        # 3+ COD refusals -> BLOCK_COD
        new_segment = segment
        
        if cod_ref >= 3:
            new_segment = "BLOCK_COD"
        elif returns_total >= 2:
            new_segment = "RISK"
            
        if new_segment != segment:
            await self.customers.update_one(
                {"phone": phone}, 
                {"$set": {"segment": new_segment, "segment_updated_at": now_iso()}}
            )
            logger.info(f"Customer {phone} segment changed: {segment} -> {new_segment}")

    async def timeline_event(self, phone: str, type_: str, title: str, description: str, payload: dict):
        """Add event to customer timeline"""
        await self.timeline.insert_one({
            "phone": phone,
            "ts": now_iso(),
            "type": type_,
            "title": title,
            "description": description,
            "payload": payload,
        })

    async def enqueue_admin_alert(self, dedupe_key: str, text: str, reply_markup: dict = None):
        """Enqueue admin alert with dedupe"""
        doc = {
            "status": "PENDING",
            "dedupe_key": dedupe_key,
            "payload": {"text": text, "reply_markup": reply_markup},
            "created_at": now_iso()
        }
        try:
            await self.alerts.insert_one(doc)
            return True
        except Exception:
            return False

    async def get_return_stats(self, days: int = 30):
        """Get return statistics for analytics"""
        from datetime import timedelta
        
        since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        
        # Total orders in period
        total = await self.orders.count_documents({"created_at": {"$gte": since}})
        
        # Returns in period
        returns = await self.orders.count_documents({
            "returns.stage": {"$in": ["RETURNING", "RETURNED"]},
            "returns.updated_at": {"$gte": since}
        })
        
        # COD refusals
        cod_refusals = await self.orders.count_documents({
            "returns.reason": {"$in": ["REFUSED", "NOT_PICKED_UP", "STORAGE_EXPIRED"]},
            "returns.updated_at": {"$gte": since},
            "payment.method": {"$in": ["COD", "cod", "CASH_ON_DELIVERY", "cash_on_delivery", "postpaid"]}
        })
        
        # Shipping losses
        pipeline = [
            {"$match": {
                "type": {"$in": ["SHIP_COST_OUT", "RETURN_COST_OUT"]},
                "created_at": {"$gte": since}
            }},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        losses_result = await self.ledger.aggregate(pipeline).to_list(1)
        losses = losses_result[0]["total"] if losses_result else 0
        
        return {
            "total_orders": total,
            "returns": returns,
            "cod_refusals": cod_refusals,
            "return_rate": (returns / total) if total > 0 else 0,
            "cod_refusal_rate": (cod_refusals / total) if total > 0 else 0,
            "shipping_losses": losses
        }
