"""
O16: Risk Service - Customer Risk Score Engine (0-100)
"""
from datetime import datetime, timezone, timedelta
from modules.risk.risk_types import RiskResult
from modules.risk.risk_config import DEFAULT_RISK_CONFIG
import logging

logger = logging.getLogger(__name__)


def utcnow():
    return datetime.now(timezone.utc)


def iso(dt: datetime):
    return dt.isoformat()


def clamp(x: float, a: float, b: float) -> float:
    return max(a, min(b, x))


class RiskService:
    def __init__(self, db, settings_repo=None, guard_repo=None, alerts_repo=None):
        self.db = db
        self.users = db["users"]
        self.orders = db["orders"]
        self.user_tags = db["user_tags"]
        self.settings_repo = settings_repo
        self.guard_repo = guard_repo
        self.alerts_repo = alerts_repo

    async def _load_cfg(self):
        if not self.settings_repo:
            return DEFAULT_RISK_CONFIG
        st = await self.settings_repo.get()
        cfg = ((st.get("guard") or {}).get("risk") or None)
        return cfg or DEFAULT_RISK_CONFIG

    async def compute_for_user(self, user_id: str) -> RiskResult:
        cfg = await self._load_cfg()
        w = cfg["weights"]
        caps = cfg["caps"]
        th = cfg["thresholds"]

        now = utcnow()

        # Count orders in last hour (burst detection)
        hour_ago = now - timedelta(hours=1)
        burst_cnt = await self.orders.count_documents({
            "created_at": {"$gte": iso(hour_ago), "$lt": iso(now)},
            "buyer_id": user_id
        })
        c_burst = clamp((burst_cnt / 3.0) * w["burst_1h"], 0, caps["burst_1h"])

        # Count cancelled/returned orders in 60d
        days_60_ago = now - timedelta(days=60)
        returns_cnt = await self.orders.count_documents({
            "created_at": {"$gte": iso(days_60_ago)},
            "buyer_id": user_id,
            "status": {"$in": ["returned", "RETURNED", "cancelled", "CANCELLED"]}
        })
        c_returns = clamp((returns_cnt / 2.0) * w["returns_60d"], 0, caps["returns_60d"])

        # Payment failures (simplified - count failed payment status)
        days_30_ago = now - timedelta(days=30)
        payment_fails = await self.orders.count_documents({
            "created_at": {"$gte": iso(days_30_ago)},
            "buyer_id": user_id,
            "payment_status": {"$in": ["failed", "FAILED"]}
        })
        c_pay = clamp((payment_fails / 2.0) * w["payment_fails_30d"], 0, caps["payment_fails_30d"])

        # COD refusals - simplified
        c_cod = 0  # Would need delivery tracking data

        base_score = int(round(c_returns + c_cod + c_burst + c_pay))
        base_score = int(clamp(base_score, 0, 100))

        reasons = []
        if returns_cnt >= 1:
            reasons.append("RETURNS_60D")
        if burst_cnt >= 3:
            reasons.append("BURST_1H")
        if payment_fails >= 1:
            reasons.append("PAYMENT_FAILS_30D")

        # Check tags
        tags_doc = await self.user_tags.find_one({"user_id": user_id}, {"_id": 0})
        tags = (tags_doc.get("tags") or []) if tags_doc else []

        if "RISK_WHITELIST" in tags:
            base_score = int(clamp(base_score - 30, 0, 100))
            reasons.append("WHITELIST_ADJUST")

        if "FRAUD_SUSPECT" in tags:
            base_score = int(clamp(base_score + 15, 0, 100))
            reasons.append("FRAUD_TAG")

        # Check override
        user = await self.users.find_one({"id": user_id}, {"_id": 0, "risk_override": 1})
        override = (user.get("risk_override") if user else None)

        if override and override.get("score") is not None:
            until = override.get("until")
            if not until:
                base_score = int(override["score"])
                reasons.append("OVERRIDE")
            else:
                try:
                    u = datetime.fromisoformat(until.replace("Z", "+00:00"))
                    if utcnow() < u:
                        base_score = int(override["score"])
                        reasons.append("OVERRIDE")
                except Exception:
                    pass

        band = "LOW"
        if base_score >= th["risk_band"]:
            band = "RISK"
        elif base_score >= th["watch_band"]:
            band = "WATCH"

        return RiskResult(
            score=base_score,
            band=band,
            reasons=sorted(list(set(reasons))),
            components={
                "returns_60d": {"n": returns_cnt, "score": round(c_returns, 2)},
                "burst_1h": {"n": int(burst_cnt), "score": round(c_burst, 2)},
                "payment_fails_30d": {"n": int(payment_fails), "score": round(c_pay, 2)},
            }
        )

    async def apply_to_user(self, user_id: str) -> dict:
        rr = await self.compute_for_user(user_id)

        await self.users.update_one(
            {"id": user_id},
            {"$set": {
                "risk": {
                    "score": rr.score,
                    "band": rr.band,
                    "reasons": rr.reasons,
                    "components": rr.components,
                    "updated_at": utcnow().isoformat()
                }
            }}
        )

        # Alert if high risk
        await self._maybe_alert(user_id, rr)

        return rr.model_dump()

    async def _maybe_alert(self, user_id: str, rr: RiskResult):
        if not (self.guard_repo and self.alerts_repo):
            return

        cfg = await self._load_cfg()
        alert_thr = int(cfg["thresholds"].get("alert_score", 80))
        if rr.score < alert_thr:
            return

        day = utcnow().date().isoformat()
        key = f"RISK_SCORE_HIGH:{user_id}:{day}"
        first = await self.guard_repo.once(key, {"rule": "RISK_SCORE_HIGH", "user_id": user_id, "score": rr.score})
        if not first:
            return

        incident = {
            "key": key,
            "type": "RISK_SCORE_HIGH",
            "status": "OPEN",
            "severity": "CRITICAL",
            "title": "High Risk Score Alert",
            "description": f"User {user_id}: risk={rr.score}/100, band={rr.band}. Reasons: {', '.join(rr.reasons) or '-'}",
            "entity": f"customer:{user_id}",
            "payload": {"user_id": user_id, "risk": rr.model_dump()},
            "muted_until": None,
            "resolved_at": None,
        }
        await self.guard_repo.upsert_incident(incident)

        text = (
            f"<b>High Risk Score Alert</b>\n"
            f"User: <code>{user_id}</code>\n"
            f"Risk: <b>{rr.score}/100</b> ({rr.band})\n"
            f"Reasons: <b>{', '.join(rr.reasons) or '-'}</b>\n"
            f"Key: <code>{key}</code>"
        )
        await self.alerts_repo.enqueue("RISK_SCORE_HIGH", {"text": text}, key)
