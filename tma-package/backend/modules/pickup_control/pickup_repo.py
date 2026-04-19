"""
O20: Pickup Repository - MongoDB operations
"""
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


def utcnow_iso():
    return datetime.now(timezone.utc).isoformat()


class PickupRepo:
    def __init__(self, db):
        self.db = db
        self.orders = db["orders"]
        self.outbox = db["notification_queue"]  # Use existing notification queue
        self.alerts = db["admin_alerts_queue"]
        self.timeline = db["timeline_events"]
        self.dedupe = db["pickup_dedupe"]
        self.customers = db["customers"]
        self.users = db["users"]

    async def ensure_indexes(self):
        """Create necessary indexes"""
        try:
            await self.dedupe.create_index("key", unique=True)
            await self.orders.create_index("shipment.ttn")
            await self.orders.create_index("shipment.daysAtPoint")
            await self.timeline.create_index([("phone", 1), ("ts", -1)])
        except Exception as e:
            logger.warning(f"Index creation warning: {e}")

    async def list_active_shipments(self, limit: int = 500) -> List[Dict]:
        """Get orders with active shipments (shipped but not delivered)"""
        q = {
            "shipment.ttn": {"$exists": True, "$ne": None},
            "status": {"$in": ["shipped", "processing", "SHIPPED", "PROCESSING"]}
        }
        cur = self.orders.find(q, {"_id": 0}).sort("created_at", -1).limit(limit)
        return [x async for x in cur]

    async def list_risk_shipments(self, min_days: int = 7, limit: int = 100) -> List[Dict]:
        """Get shipments at point for N+ days"""
        q = {
            "shipment.daysAtPoint": {"$gte": min_days},
            "status": {"$in": ["shipped", "processing", "SHIPPED", "PROCESSING"]}
        }
        cur = self.orders.find(q, {"_id": 0}).sort("shipment.daysAtPoint", -1).limit(limit)
        return [x async for x in cur]

    async def get_pickup_kpi(self) -> Dict:
        """Get pickup KPI stats"""
        pipeline = [
            {"$match": {
                "shipment.daysAtPoint": {"$exists": True, "$gte": 2},
                "status": {"$in": ["shipped", "processing", "SHIPPED", "PROCESSING"]}
            }},
            {"$group": {
                "_id": None,
                "at_2plus": {"$sum": {"$cond": [{"$gte": ["$shipment.daysAtPoint", 2]}, 1, 0]}},
                "at_5plus": {"$sum": {"$cond": [{"$gte": ["$shipment.daysAtPoint", 5]}, 1, 0]}},
                "at_7plus": {"$sum": {"$cond": [{"$gte": ["$shipment.daysAtPoint", 7]}, 1, 0]}},
                "amount_at_risk": {"$sum": {"$cond": [
                    {"$gte": ["$shipment.daysAtPoint", 7]},
                    "$total_amount",
                    0
                ]}}
            }}
        ]
        rows = await self.orders.aggregate(pipeline).to_list(1)
        if rows:
            return {
                "at_point_2plus": rows[0].get("at_2plus", 0),
                "at_point_5plus": rows[0].get("at_5plus", 0),
                "at_point_7plus": rows[0].get("at_7plus", 0),
                "amount_at_risk": float(rows[0].get("amount_at_risk", 0))
            }
        return {"at_point_2plus": 0, "at_point_5plus": 0, "at_point_7plus": 0, "amount_at_risk": 0}

    async def get_user_prefs(self, phone: str) -> Dict:
        """Get user preferences for notifications"""
        # Check customers collection first
        c = await self.customers.find_one({"phone": phone}, {"_id": 0, "opt_out": 1, "is_blocked": 1, "email": 1})
        if c:
            return c
        # Fallback to users by phone
        u = await self.users.find_one({"phone": phone}, {"_id": 0, "opt_out": 1, "is_blocked": 1, "email": 1})
        return u or {}

    async def update_shipment_state(self, order_id: str, state: Dict):
        """Update shipment tracking state"""
        await self.orders.update_one(
            {"id": order_id},
            {"$set": {
                "shipment.pickupPointType": state.get("pickup_point_type"),
                "shipment.arrivalAt": state.get("arrival_at"),
                "shipment.storageDay1At": state.get("storage_day1_at"),
                "shipment.deadlineFreeAt": state.get("deadline_free_at"),
                "shipment.daysAtPoint": state.get("days_at_point", 0),
                "shipment.lastTrackingAt": utcnow_iso(),
                "shipment.lastStatusCode": state.get("np_status_code"),
                "shipment.lastStatusText": state.get("np_status_text"),
                "shipment.risk": state.get("risk"),
            }}
        )

    async def mark_reminder_sent(self, order_id: str, level: str, now_iso: str):
        """Mark reminder as sent with cooldown"""
        cooldown_until = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
        await self.orders.update_one(
            {"id": order_id},
            {
                "$set": {
                    "reminders.pickup.lastSentAt": now_iso,
                    "reminders.pickup.cooldownUntil": cooldown_until,
                },
                "$addToSet": {"reminders.pickup.sentLevels": level}
            }
        )

    async def cooldown_ok(self, order_doc: Dict) -> bool:
        """Check if cooldown period has passed"""
        reminders = order_doc.get("reminders") or {}
        pickup = reminders.get("pickup") or {}
        until = pickup.get("cooldownUntil")
        if not until:
            return True
        try:
            u = datetime.fromisoformat(until.replace("Z", "+00:00"))
            return datetime.now(timezone.utc) >= u
        except:
            return True

    async def get_sent_levels(self, order_doc: Dict) -> List[str]:
        """Get already sent reminder levels"""
        reminders = order_doc.get("reminders") or {}
        pickup = reminders.get("pickup") or {}
        return pickup.get("sentLevels") or []

    async def dedupe_once(self, key: str) -> bool:
        """Idempotency check - returns True if first time"""
        try:
            await self.dedupe.insert_one({"key": key, "created_at": utcnow_iso()})
            return True
        except Exception:
            return False

    async def enqueue_sms(self, phone: str, text: str, dedupe_key: str, meta: Dict):
        """Add SMS to notification queue"""
        doc = {
            "type": "SMS",
            "channel": "sms",
            "to": phone,
            "recipient": phone,
            "text": text,
            "content": text,
            "status": "PENDING",
            "dedupe_key": dedupe_key,
            "meta": meta,
            "created_at": utcnow_iso(),
        }
        try:
            await self.outbox.insert_one(doc)
            return True
        except Exception as e:
            logger.warning(f"SMS enqueue failed (likely duplicate): {e}")
            return False

    async def enqueue_email(self, email: str, subject: str, body: str, dedupe_key: str, meta: Dict):
        """Add email to notification queue"""
        doc = {
            "type": "EMAIL",
            "channel": "email",
            "to": email,
            "recipient": email,
            "subject": subject,
            "text": body,
            "content": body,
            "status": "PENDING",
            "dedupe_key": dedupe_key,
            "meta": meta,
            "created_at": utcnow_iso(),
        }
        try:
            await self.outbox.insert_one(doc)
            return True
        except Exception as e:
            logger.warning(f"Email enqueue failed: {e}")
            return False

    async def enqueue_admin_alert(self, text: str, dedupe_key: str, reply_markup: Dict = None):
        """Add admin alert to queue"""
        doc = {
            "status": "PENDING",
            "dedupe_key": dedupe_key,
            "payload": {
                "text": text,
                "reply_markup": reply_markup
            },
            "created_at": utcnow_iso()
        }
        try:
            await self.alerts.insert_one(doc)
            return True
        except Exception as e:
            logger.warning(f"Admin alert enqueue failed: {e}")
            return False

    async def timeline_event(self, phone: str, ts: str, type_: str, title: str, description: str, payload: Dict):
        """Add event to customer timeline"""
        await self.timeline.insert_one({
            "phone": phone,
            "ts": ts,
            "type": type_,
            "title": title,
            "description": description,
            "payload": payload,
        })

    async def mute_ttn(self, ttn: str, days: int = 7):
        """Mute reminders for TTN"""
        cooldown_until = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
        await self.orders.update_one(
            {"shipment.ttn": ttn},
            {"$set": {"reminders.pickup.cooldownUntil": cooldown_until, "reminders.pickup.muted": True}}
        )
