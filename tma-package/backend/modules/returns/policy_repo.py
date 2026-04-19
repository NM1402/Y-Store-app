"""
O20.5: Return Policy Engine - Repository
Handles policy events, approval queue, customer/city policy updates
"""
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

logger = logging.getLogger(__name__)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


class PolicyRepo:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.customers = db["customers"]
        self.orders = db["orders"]
        self.policy_events = db["policy_events"]
        self.actions_queue = db["policy_actions_queue"]
        self.admin_alerts = db["admin_alerts_queue"]
        self.city_policies = db["city_policies"]
        self.policy_audit = db["policy_audit"]

    async def ensure_indexes(self):
        """Create required indexes"""
        try:
            await self.policy_events.create_index("dedupe_key", unique=True)
        except Exception:
            pass
        try:
            await self.actions_queue.create_index("dedupe_key", unique=True)
        except Exception:
            pass
        try:
            await self.admin_alerts.create_index("dedupe_key", unique=True, sparse=True)
        except Exception:
            pass
        await self.city_policies.create_index("city", unique=True)
        await self.policy_audit.create_index("created_at")

    async def mark_event_once(self, dedupe_key: str, payload: dict) -> bool:
        """Idempotent event marker"""
        try:
            await self.policy_events.insert_one({
                "dedupe_key": dedupe_key,
                "payload": payload,
                "created_at": now_iso()
            })
            return True
        except Exception:
            return False

    async def enqueue_approval(self, decision: dict) -> bool:
        """Add decision to approval queue"""
        dedupe_key = decision["dedupe_key"]
        try:
            await self.actions_queue.insert_one({
                "dedupe_key": dedupe_key,
                "status": "PENDING",
                "decision": decision,
                "created_at": now_iso()
            })
            return True
        except Exception:
            return False

    async def update_customer_policy(self, phone: str, patch: dict, updated_by: str = "system"):
        """Update customer policy flags"""
        patch["policy.updated_at"] = now_iso()
        patch["policy.updated_by"] = updated_by
        await self.customers.update_one({"phone": phone}, {"$set": patch}, upsert=True)
        
        # Audit log
        await self.policy_audit.insert_one({
            "type": "CUSTOMER_POLICY_UPDATE",
            "target": phone,
            "patch": patch,
            "updated_by": updated_by,
            "created_at": now_iso()
        })

    async def update_city_policy(self, city: str, patch: dict, updated_by: str = "system"):
        """Update city policy"""
        patch["city"] = city
        patch["updated_at"] = now_iso()
        patch["updated_by"] = updated_by
        await self.city_policies.update_one({"city": city}, {"$set": patch}, upsert=True)
        
        # Audit log
        await self.policy_audit.insert_one({
            "type": "CITY_POLICY_UPDATE",
            "target": city,
            "patch": patch,
            "updated_by": updated_by,
            "created_at": now_iso()
        })

    async def enqueue_admin_alert(self, dedupe_key: str, text: str, reply_markup: dict = None):
        """Queue Telegram alert for admin"""
        try:
            await self.admin_alerts.insert_one({
                "status": "PENDING",
                "dedupe_key": dedupe_key,
                "payload": {"text": text, "reply_markup": reply_markup},
                "created_at": now_iso()
            })
            return True
        except Exception:
            return False

    async def list_customers_with_orders(self, limit: int = 500):
        """Get customers who have orders (for policy evaluation)"""
        pipeline = [
            {"$group": {"_id": "$delivery.recipient.phone"}},
            {"$limit": limit}
        ]
        phones = [r["_id"] async for r in self.orders.aggregate(pipeline) if r["_id"]]
        
        # Get customer records
        customers = []
        for phone in phones:
            c = await self.customers.find_one({"phone": phone}, {"_id": 0})
            if c:
                customers.append(c)
            else:
                customers.append({"phone": phone})
        
        return customers

    async def get_approval_queue(self, status: str = "PENDING", skip: int = 0, limit: int = 50):
        """Get pending approvals"""
        cursor = self.actions_queue.find(
            {"status": status}, 
            {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit)
        return [x async for x in cursor]

    async def approve_action(self, dedupe_key: str, approved_by: str) -> bool:
        """Approve a pending action"""
        result = await self.actions_queue.update_one(
            {"dedupe_key": dedupe_key, "status": "PENDING"},
            {"$set": {
                "status": "APPROVED",
                "approved_by": approved_by,
                "approved_at": now_iso()
            }}
        )
        return result.modified_count > 0

    async def reject_action(self, dedupe_key: str, rejected_by: str) -> bool:
        """Reject a pending action"""
        result = await self.actions_queue.update_one(
            {"dedupe_key": dedupe_key, "status": "PENDING"},
            {"$set": {
                "status": "REJECTED",
                "rejected_by": rejected_by,
                "rejected_at": now_iso()
            }}
        )
        return result.modified_count > 0

    async def get_action(self, dedupe_key: str):
        """Get action by dedupe key"""
        return await self.actions_queue.find_one({"dedupe_key": dedupe_key}, {"_id": 0})

    async def get_city_policies(self):
        """Get all city policies"""
        cursor = self.city_policies.find({}, {"_id": 0}).sort("updated_at", -1)
        return [x async for x in cursor]

    async def get_policy_history(self, skip: int = 0, limit: int = 50):
        """Get approved/rejected actions history"""
        cursor = self.actions_queue.find(
            {"status": {"$in": ["APPROVED", "REJECTED"]}},
            {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit)
        return [x async for x in cursor]
