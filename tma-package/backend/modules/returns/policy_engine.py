"""
O20.5: Return Policy Engine - Main Engine
Rule-based policy decisions with window metrics (30/60 days)
"""
from datetime import datetime, timezone, timedelta
from typing import List
import logging

from modules.returns.policy_types import PolicyDecision, PolicyRunResult
from modules.returns.policy_repo import PolicyRepo

logger = logging.getLogger(__name__)


def since_iso(days: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class ReturnPolicyEngine:
    """
    Rule-based policy engine for return management.
    
    Customer Rules:
    - cod_refusals_30d >= 2 → BLOCK_COD_CUSTOMER
    - returns_60d >= 2 → REQUIRE_PREPAID_CUSTOMER
    - returns_60d >= 3 → BLOCK_COD_CUSTOMER
    
    City Rules:
    - city_return_rate_30d >= 0.15 AND orders_30d >= 30 → REQUIRE_PREPAID_CITY
    """
    
    def __init__(self, db):
        self.db = db
        self.repo = PolicyRepo(db)
        self._scanned_cities = 0

    async def run_once(self, limit_customers: int = 500) -> dict:
        """Run policy engine once"""
        await self.repo.ensure_indexes()
        
        decisions: List[PolicyDecision] = []
        
        # 1) Customer policies
        customers = await self.repo.list_customers_with_orders(limit=limit_customers)
        scanned_customers = len(customers)
        
        for c in customers:
            phone = c.get("phone")
            if not phone:
                continue
            
            m = await self._customer_window_metrics(phone)
            cod_ref_30 = m["cod_refusals_30d"]
            ret_60 = m["returns_60d"]
            
            # Skip if no issues
            if cod_ref_30 == 0 and ret_60 == 0:
                continue
            
            # Current flags
            policy = c.get("policy") or {}
            cod_blocked = bool(policy.get("cod_blocked"))
            require_prepaid = bool(policy.get("require_prepaid"))
            
            # Safety: skip VIP customers
            segment = c.get("segment", "")
            if segment == "VIP":
                continue
            
            # Rule 1: COD refusals >= 2 → BLOCK_COD
            if cod_ref_30 >= 2 and not cod_blocked:
                decisions.append(self._decision_block_cod(
                    phone, cod_ref_30, ret_60, "COD_REFUSALS_30D>=2"
                ))
            
            # Rule 2: Returns 60d >= 2 → REQUIRE_PREPAID
            if ret_60 >= 2 and not require_prepaid:
                decisions.append(self._decision_require_prepaid_customer(
                    phone, cod_ref_30, ret_60
                ))
            
            # Rule 3: Returns 60d >= 3 → BLOCK_COD
            if ret_60 >= 3 and not cod_blocked:
                decisions.append(self._decision_block_cod(
                    phone, cod_ref_30, ret_60, "RETURNS_60D>=3"
                ))
        
        # 2) City policies
        city_decisions = await self._city_policy_decisions()
        decisions.extend(city_decisions)
        
        # 3) Apply or queue for approval
        proposed = len(decisions)
        applied = 0
        approvals = 0
        
        for d in decisions:
            # Idempotency check
            if not await self.repo.mark_event_once(d.dedupe_key, d.model_dump()):
                continue
            
            if d.requires_approval:
                ok = await self.repo.enqueue_approval(d.model_dump())
                if ok:
                    approvals += 1
                    await self._alert_approval_required(d)
            else:
                ok = await self.apply_decision(d)
                if ok:
                    applied += 1
        
        result = PolicyRunResult(
            ok=True,
            scanned_customers=scanned_customers,
            scanned_cities=self._scanned_cities,
            proposed=proposed,
            applied=applied,
            approvals_enqueued=approvals
        )
        
        logger.info(f"Policy engine run: {result.model_dump()}")
        return result.model_dump()

    async def apply_decision(self, d: PolicyDecision, updated_by: str = "policy_engine") -> bool:
        """Apply a policy decision"""
        if d.action == "BLOCK_COD_CUSTOMER":
            await self.repo.update_customer_policy(d.target_id, {
                "policy.cod_blocked": True,
                "policy.block_reason": d.reason,
                "segment": "BLOCK_COD"
            }, updated_by)
            return True
        
        if d.action == "UNBLOCK_COD_CUSTOMER":
            await self.repo.update_customer_policy(d.target_id, {
                "policy.cod_blocked": False,
                "policy.block_reason": None
            }, updated_by)
            return True
        
        if d.action == "REQUIRE_PREPAID_CUSTOMER":
            await self.repo.update_customer_policy(d.target_id, {
                "policy.require_prepaid": True,
                "policy.prepaid_reason": d.reason
            }, updated_by)
            return True
        
        if d.action == "REQUIRE_PREPAID_CITY":
            await self.repo.update_city_policy(d.target_id, {
                "require_prepaid": True,
                "reason": d.reason,
                "meta": d.meta
            }, updated_by)
            return True
        
        return True

    # --- Decision constructors ---
    
    def _decision_block_cod(self, phone: str, cod_ref_30: int, ret_60: int, reason: str) -> PolicyDecision:
        return PolicyDecision(
            action="BLOCK_COD_CUSTOMER",
            target_type="CUSTOMER",
            target_id=phone,
            reason=reason,
            meta={"cod_refusals_30d": cod_ref_30, "returns_60d": ret_60},
            severity="HIGH",
            requires_approval=True,
            dedupe_key=f"policy:block_cod:{phone}:{reason}:{cod_ref_30}:{ret_60}"
        )

    def _decision_require_prepaid_customer(self, phone: str, cod_ref_30: int, ret_60: int) -> PolicyDecision:
        return PolicyDecision(
            action="REQUIRE_PREPAID_CUSTOMER",
            target_type="CUSTOMER",
            target_id=phone,
            reason="RETURNS_60D>=2",
            meta={"cod_refusals_30d": cod_ref_30, "returns_60d": ret_60},
            severity="MEDIUM",
            requires_approval=True,
            dedupe_key=f"policy:require_prepaid:{phone}:ret60:{ret_60}:cod30:{cod_ref_30}"
        )

    # --- Metrics ---
    
    async def _customer_window_metrics(self, phone: str) -> dict:
        """Calculate customer metrics for policy windows"""
        since_30 = since_iso(30)
        since_60 = since_iso(60)
        
        # Returns in 60 days
        returns_60 = await self.db["orders"].count_documents({
            "$or": [
                {"delivery.recipient.phone": phone},
                {"shipping.phone": phone},
                {"buyer_phone": phone}
            ],
            "returns.updated_at": {"$gte": since_60},
            "returns.stage": {"$in": ["RETURNING", "RETURNED"]}
        })
        
        # COD refusals in 30 days
        cod_ref_30 = await self.db["orders"].count_documents({
            "$or": [
                {"delivery.recipient.phone": phone},
                {"shipping.phone": phone},
                {"buyer_phone": phone}
            ],
            "returns.updated_at": {"$gte": since_30},
            "returns.reason": {"$in": ["REFUSED", "NOT_PICKED_UP", "STORAGE_EXPIRED"]}
        })
        
        return {
            "returns_60d": int(returns_60),
            "cod_refusals_30d": int(cod_ref_30)
        }

    async def _city_policy_decisions(self) -> List[PolicyDecision]:
        """Generate city-level policy decisions"""
        since_30 = since_iso(30)
        
        # Total orders per city (30d)
        pipeline_total = [
            {"$match": {"created_at": {"$gte": since_30}}},
            {"$group": {
                "_id": {"$ifNull": ["$delivery.recipient.city", "$shipping.city"]},
                "orders": {"$sum": 1}
            }}
        ]
        totals = {}
        async for r in self.db["orders"].aggregate(pipeline_total):
            city = r["_id"]
            if city:
                totals[city] = int(r["orders"])
        
        # Returns per city (30d)
        pipeline_ret = [
            {"$match": {
                "returns.updated_at": {"$gte": since_30},
                "returns.stage": {"$in": ["RETURNING", "RETURNED"]}
            }},
            {"$group": {
                "_id": {"$ifNull": ["$delivery.recipient.city", "$shipping.city"]},
                "returns": {"$sum": 1}
            }}
        ]
        rets = {}
        async for r in self.db["orders"].aggregate(pipeline_ret):
            city = r["_id"]
            if city:
                rets[city] = int(r["returns"])
        
        self._scanned_cities = len(totals)
        
        # Get existing city policies
        existing = await self.repo.get_city_policies()
        existing_cities = {p["city"] for p in existing if p.get("require_prepaid")}
        
        decisions = []
        for city, total in totals.items():
            if total < 30:
                continue
            
            ret = rets.get(city, 0)
            rate = ret / total if total else 0
            
            # Rule: return_rate >= 15% → REQUIRE_PREPAID_CITY
            if rate >= 0.15 and city not in existing_cities:
                decisions.append(PolicyDecision(
                    action="REQUIRE_PREPAID_CITY",
                    target_type="CITY",
                    target_id=city,
                    reason="CITY_RETURN_RATE_30D>=0.15",
                    meta={
                        "orders_30d": total,
                        "returns_30d": ret,
                        "return_rate": round(rate, 4)
                    },
                    severity="MEDIUM",
                    requires_approval=True,
                    dedupe_key=f"policy:city_prepaid:{city}:rate:{rate:.3f}:n:{total}"
                ))
        
        return decisions

    # --- Alerts ---
    
    async def _alert_approval_required(self, d: PolicyDecision):
        """Send Telegram alert for approval"""
        if d.target_type == "CUSTOMER":
            text = (
                f"🛡️ <b>Policy: потрібне підтвердження</b>\n\n"
                f"Дія: <b>{d.action}</b>\n"
                f"Клієнт: <code>{d.target_id}</code>\n"
                f"Причина: {d.reason}\n"
                f"Severity: {d.severity}\n\n"
                f"COD відмов (30д): {d.meta.get('cod_refusals_30d', 0)}\n"
                f"Повернень (60д): {d.meta.get('returns_60d', 0)}"
            )
        else:
            text = (
                f"🛡️ <b>Policy: потрібне підтвердження</b>\n\n"
                f"Дія: <b>{d.action}</b>\n"
                f"Місто: <b>{d.target_id}</b>\n"
                f"Причина: {d.reason}\n"
                f"Return rate: {d.meta.get('return_rate', 0)*100:.1f}%\n"
                f"Замовлень (30д): {d.meta.get('orders_30d', 0)}\n"
                f"Повернень (30д): {d.meta.get('returns_30d', 0)}"
            )
        
        reply_markup = {
            "inline_keyboard": [
                [
                    {"text": "✅ Підтвердити", "callback_data": f"policy:approve:{d.dedupe_key[:50]}"},
                    {"text": "❌ Відхилити", "callback_data": f"policy:reject:{d.dedupe_key[:50]}"}
                ]
            ]
        }
        
        await self.repo.enqueue_admin_alert(
            f"policy_alert:{d.dedupe_key}",
            text,
            reply_markup
        )
