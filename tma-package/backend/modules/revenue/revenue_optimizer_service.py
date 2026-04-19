"""
Revenue Optimizer Service - Main ROE logic
"""
import uuid
from datetime import datetime, timezone, timedelta
import logging

from .revenue_settings import get_settings, get_system_config, patch_system_config
from .revenue_optimizer_rules import propose_changes
from .revenue_snapshot_service import RevenueSnapshotService
from .revenue_impact_estimator import RevenueImpactEstimator

logger = logging.getLogger(__name__)


def now():
    return datetime.now(timezone.utc)


class RevenueOptimizerService:
    def __init__(self, db, notifier=None):
        self.db = db
        self.suggestions = db["revenue_suggestions"]
        self.change_log = db["revenue_change_log"]
        self.notifier = notifier  # Optional telegram notifier

    async def ensure_indexes(self):
        await self.suggestions.create_index("id", unique=True)
        await self.suggestions.create_index("status")
        await self.suggestions.create_index("ts")
        await self.change_log.create_index("suggestion_id")

    async def in_cooldown(self) -> bool:
        """Check if we're in cooldown period"""
        last = await self.suggestions.find(
            {"status": {"$in": ["APPLIED", "APPROVED", "PENDING"]}}
        ).sort("ts", -1).limit(1).to_list(1)
        
        if not last:
            return False
            
        cooldown_until = last[0].get("cooldown_until")
        if not cooldown_until:
            return False
            
        return now().isoformat() < cooldown_until

    async def make_suggestion(self, snap: dict) -> dict:
        """Analyze snapshot and create suggestion if rules trigger"""
        await self.ensure_indexes()
        
        settings = await get_settings(self.db)
        
        if await self.in_cooldown():
            return {"ok": True, "skipped": "COOLDOWN"}

        current_cfg = await get_system_config(self.db)
        decision = propose_changes(snap, current_cfg, settings)
        
        if not decision:
            return {"ok": True, "skipped": "NO_RULE_TRIGGERED"}

        reason, proposed, expected = decision
        
        # Calculate impact if discount change
        if "prepaid_discount_value" in proposed:
            estimator = RevenueImpactEstimator(self.db)
            from_pct = float(current_cfg.get("prepaid_discount_value", 1.0))
            to_pct = float(proposed["prepaid_discount_value"])
            impact_calc = await estimator.estimate_discount_change(7, from_pct, to_pct)
            expected = {**expected, **(impact_calc.get("impact") or {})}
            expected["stats"] = impact_calc.get("stats")

        # Create suggestion
        sid = str(uuid.uuid4())
        cooldown_hours = int(settings.get("cooldown_hours", 24))
        cooldown_until = (now() + timedelta(hours=cooldown_hours)).isoformat()

        doc = {
            "id": sid,
            "ts": now().isoformat(),
            "status": "PENDING",
            "reason": reason,
            "proposed": proposed,
            "baseline": {k: current_cfg.get(k) for k in proposed.keys() if not k.startswith("_")},
            "expected": expected,
            "cooldown_until": cooldown_until,
            "snapshot_ref": snap.get("ts"),
            "notes": ""
        }
        
        await self.suggestions.insert_one(doc)
        logger.info(f"ROE suggestion created: {sid} - {reason}")
        
        # Notify admin
        if self.notifier:
            try:
                await self.notifier.send_admin_alert(
                    title="💡 ROE: Нова рекомендація",
                    message=f"Причина: {reason}\nДія: {expected.get('action', proposed)}"
                )
            except Exception as e:
                logger.warning(f"Failed to send ROE notification: {e}")
        
        return {"ok": True, "suggestion": doc}

    async def approve(self, suggestion_id: str, actor: str = "ADMIN") -> dict:
        """Approve a pending suggestion"""
        s = await self.suggestions.find_one({"id": suggestion_id}, {"_id": 0})
        if not s:
            return {"ok": False, "error": "NOT_FOUND"}
        if s["status"] != "PENDING":
            return {"ok": False, "error": "NOT_PENDING", "current_status": s["status"]}

        await self.suggestions.update_one(
            {"id": suggestion_id},
            {"$set": {
                "status": "APPROVED",
                "approved_at": now().isoformat(),
                "approved_by": actor
            }}
        )
        
        logger.info(f"ROE suggestion approved: {suggestion_id} by {actor}")
        return {"ok": True}

    async def reject(self, suggestion_id: str, actor: str = "ADMIN", reason: str = "") -> dict:
        """Reject a pending suggestion"""
        s = await self.suggestions.find_one({"id": suggestion_id}, {"_id": 0})
        if not s:
            return {"ok": False, "error": "NOT_FOUND"}
        if s["status"] not in ["PENDING", "APPROVED"]:
            return {"ok": False, "error": "CANNOT_REJECT", "current_status": s["status"]}

        await self.suggestions.update_one(
            {"id": suggestion_id},
            {"$set": {
                "status": "REJECTED",
                "rejected_at": now().isoformat(),
                "rejected_by": actor,
                "reject_reason": reason
            }}
        )
        
        logger.info(f"ROE suggestion rejected: {suggestion_id} by {actor}")
        return {"ok": True}

    async def apply(self, suggestion_id: str, actor: str = "ADMIN") -> dict:
        """Apply an approved/pending suggestion"""
        s = await self.suggestions.find_one({"id": suggestion_id}, {"_id": 0})
        if not s:
            return {"ok": False, "error": "NOT_FOUND"}
        if s["status"] not in ["APPROVED", "PENDING"]:
            return {"ok": False, "error": "NOT_APPROVED", "current_status": s["status"]}

        current_cfg = await get_system_config(self.db)
        proposed = {k: v for k, v in (s.get("proposed") or {}).items() if not k.startswith("_")}
        
        if not proposed:
            await self.suggestions.update_one(
                {"id": suggestion_id},
                {"$set": {"status": "REJECTED", "notes": "NOOP - no changes to apply"}}
            )
            return {"ok": True, "noop": True}

        # Build baseline snapshot for rollback monitoring
        settings = await get_settings(self.db)
        rollback_window = int(settings.get("rollback_window_hours", 24))
        
        snapshot_svc = RevenueSnapshotService(self.db)
        baseline_snapshot = await snapshot_svc.build_snapshot(7)
        monitor_until = (now() + timedelta(hours=rollback_window)).isoformat()

        # Apply changes to system config
        await patch_system_config(self.db, proposed)

        # Log the change
        await self.change_log.insert_one({
            "id": str(uuid.uuid4()),
            "ts": now().isoformat(),
            "suggestion_id": suggestion_id,
            "applied": proposed,
            "previous": {k: current_cfg.get(k) for k in proposed.keys()},
            "actor": actor
        })

        # Update suggestion
        await self.suggestions.update_one(
            {"id": suggestion_id},
            {"$set": {
                "status": "APPLIED",
                "applied_at": now().isoformat(),
                "applied_by": actor,
                "baseline_snapshot": baseline_snapshot,
                "monitor_until": monitor_until
            }}
        )

        logger.info(f"ROE suggestion applied: {suggestion_id} by {actor} - {proposed}")
        
        # Notify
        if self.notifier:
            try:
                await self.notifier.send_admin_alert(
                    title="✅ ROE: Зміни застосовано",
                    message=f"Suggestion: {suggestion_id}\nЗміни: {proposed}"
                )
            except Exception:
                pass

        return {"ok": True, "applied": proposed}

    async def get_pending_suggestions(self) -> list:
        """Get all pending suggestions"""
        cursor = self.suggestions.find(
            {"status": "PENDING"},
            {"_id": 0}
        ).sort("ts", -1).limit(20)
        return await cursor.to_list(20)

    async def get_all_suggestions(self, limit: int = 50) -> list:
        """Get all suggestions with history"""
        cursor = self.suggestions.find({}, {"_id": 0}).sort("ts", -1).limit(limit)
        return await cursor.to_list(limit)
