"""
Revenue Rollback Service - Auto-rollback if metrics worsen
"""
import uuid
from datetime import datetime, timezone, timedelta
import logging

from .revenue_settings import get_settings, patch_system_config
from .revenue_snapshot_service import RevenueSnapshotService

logger = logging.getLogger(__name__)


def now():
    return datetime.now(timezone.utc)


class RevenueRollbackService:
    def __init__(self, db, notifier=None):
        self.db = db
        self.suggestions = db["revenue_suggestions"]
        self.change_log = db["revenue_change_log"]
        self.notifier = notifier

    async def find_applied_to_check(self) -> list:
        """Find APPLIED suggestions that need rollback evaluation"""
        cursor = self.suggestions.find(
            {
                "status": "APPLIED",
                "monitor_until": {"$lte": now().isoformat()},
                "baseline_snapshot": {"$exists": True}
            },
            {"_id": 0}
        ).sort("ts", 1).limit(10)
        return await cursor.to_list(10)

    async def rollback(self, suggestion: dict, reason: str, details: dict) -> dict:
        """Execute rollback for a suggestion"""
        sid = suggestion["id"]
        
        # Find the change log
        log = await self.change_log.find_one({"suggestion_id": sid}, {"_id": 0})
        if not log:
            await self.suggestions.update_one(
                {"id": sid},
                {"$set": {"status": "ROLLED_BACK", "rollback_reason": "NO_CHANGE_LOG"}}
            )
            return {"ok": False, "error": "NO_CHANGE_LOG"}

        prev = log.get("previous") or {}
        applied = log.get("applied") or {}

        if not prev:
            await self.suggestions.update_one(
                {"id": sid},
                {"$set": {"status": "ROLLED_BACK", "rollback_reason": "NO_PREVIOUS_VALUES"}}
            )
            return {"ok": False, "error": "NO_PREVIOUS_VALUES"}

        # Rollback config
        await patch_system_config(self.db, prev)

        # Log rollback
        await self.change_log.insert_one({
            "id": str(uuid.uuid4()),
            "ts": now().isoformat(),
            "suggestion_id": sid,
            "applied": prev,
            "previous": applied,
            "actor": "ROE_ROLLBACK",
            "meta": {"reason": reason, "details": details}
        })

        # Update suggestion
        await self.suggestions.update_one(
            {"id": sid},
            {"$set": {
                "status": "ROLLED_BACK",
                "rolled_back_at": now().isoformat(),
                "rollback_reason": reason,
                "rollback_details": details
            }}
        )

        logger.warning(f"ROE auto-rollback executed: {sid} - {reason}")

        # Notify admin
        if self.notifier:
            try:
                await self.notifier.send_admin_alert(
                    title="⚠️ ROE: Автовідкат налаштувань",
                    message=f"Suggestion: {sid}\nПричина: {reason}\n\nДеталі:\n{details}"
                )
            except Exception as e:
                logger.error(f"Failed to send rollback notification: {e}")

        return {"ok": True, "rolled_back": True}

    async def evaluate_and_rollback(self) -> dict:
        """Evaluate all due suggestions and rollback if needed"""
        settings = await get_settings(self.db)
        
        paid_drop_threshold = float(settings.get("rollback_paid_drop", 0.02))
        margin_drop_threshold = float(settings.get("rollback_margin_drop", 0.02))
        return_rise_threshold = float(settings.get("rollback_return_rise", 0.02))

        due = await self.find_applied_to_check()
        if not due:
            return {"ok": True, "checked": 0, "rolled_back": 0}

        snapshot_svc = RevenueSnapshotService(self.db)
        checked = 0
        rolled = 0

        for s in due:
            checked += 1
            baseline = s.get("baseline_snapshot")
            
            if not baseline:
                await self.suggestions.update_one(
                    {"id": s["id"]},
                    {"$set": {"status": "VALIDATED", "notes": "NO_BASELINE_SKIP"}}
                )
                continue

            # Build current snapshot
            range_days = int(baseline.get("range_days", 7))
            current = await snapshot_svc.build_snapshot(range_days)

            # Calculate KPIs
            base_paid_rate = (baseline["paid_total"] / baseline["orders_total"]) if baseline.get("orders_total", 0) > 0 else 0
            curr_paid_rate = (current["paid_total"] / current["orders_total"]) if current.get("orders_total", 0) > 0 else 0

            base_margin = float(baseline.get("net_margin_est", 0))
            curr_margin = float(current.get("net_margin_est", 0))

            base_return = float(baseline.get("return_rate", 0))
            curr_return = float(current.get("return_rate", 0))

            # Calculate deltas
            d_paid = curr_paid_rate - base_paid_rate
            d_margin = curr_margin - base_margin
            d_return = curr_return - base_return

            # Evaluate rollback conditions
            should_rollback = False
            reason = ""

            if d_paid < -paid_drop_threshold:
                should_rollback = True
                reason = "PAID_RATE_DROP"
            elif d_margin < -margin_drop_threshold:
                should_rollback = True
                reason = "MARGIN_DROP"
            elif d_return > return_rise_threshold:
                should_rollback = True
                reason = "RETURN_RISE"

            details = {
                "baseline_paid_rate": round(base_paid_rate, 4),
                "current_paid_rate": round(curr_paid_rate, 4),
                "delta_paid": round(d_paid, 4),
                "baseline_margin": round(base_margin, 4),
                "current_margin": round(curr_margin, 4),
                "delta_margin": round(d_margin, 4),
                "baseline_return": round(base_return, 4),
                "current_return": round(curr_return, 4),
                "delta_return": round(d_return, 4),
            }

            if should_rollback:
                await self.rollback(s, reason, details)
                rolled += 1
            else:
                # Mark as validated
                await self.suggestions.update_one(
                    {"id": s["id"]},
                    {"$set": {
                        "status": "VALIDATED",
                        "validated_at": now().isoformat(),
                        "validation_details": details
                    }}
                )
                logger.info(f"ROE suggestion validated: {s['id']} - metrics OK")

        return {"ok": True, "checked": checked, "rolled_back": rolled}
