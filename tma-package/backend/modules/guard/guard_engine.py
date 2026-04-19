"""
O14: Guard Engine - Financial & Fraud Guard
KPI alerts + anti-fraud detection
"""
from datetime import datetime, timezone, timedelta
from modules.guard.guard_repo import GuardRepo
from modules.bot.bot_alerts_repo import BotAlertsRepo
from modules.bot.bot_settings_repo import BotSettingsRepo
import logging

logger = logging.getLogger(__name__)


def utcnow():
    return datetime.now(timezone.utc)


def iso(dt: datetime):
    return dt.isoformat()


def day_bounds(dt: datetime):
    start = dt.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)
    return start, end


def pct_drop(today: float, yesterday: float) -> float:
    if yesterday <= 0:
        return 0.0
    return (1.0 - (today / yesterday)) * 100.0


DEFAULT_GUARD_CONFIG = {
    "enabled": True,
    "kpi": {
        "revenue_drop_pct": 25,
        "awaiting_payment_daily": 15
    },
    "fraud": {
        "burst_orders_per_hour": 3,
        "cod_refusals_30d": 2,
        "returns_60d": 2,
        "auto_tag": True,
        "auto_block": False
    }
}


class GuardEngine:
    def __init__(self, db):
        self.db = db
        self.settings = BotSettingsRepo(db)
        self.alerts = BotAlertsRepo(db)
        self.repo = GuardRepo(db)
        self.orders = db["orders"]
        self.customers = db["customers"]

    async def run_once(self):
        st = await self.settings.get()
        guard = st.get("guard") or DEFAULT_GUARD_CONFIG
        if not guard.get("enabled", True):
            return {"ok": True, "skipped": True}

        await self.repo.ensure_indexes()

        try:
            await self._kpi_revenue_drop(guard)
        except Exception as e:
            logger.error(f"KPI revenue drop check failed: {e}")

        try:
            await self._kpi_awaiting_payment_spike(guard)
        except Exception as e:
            logger.error(f"KPI awaiting payment check failed: {e}")

        try:
            await self._fraud_burst_orders(guard)
        except Exception as e:
            logger.error(f"Fraud burst orders check failed: {e}")

        return {"ok": True}

    async def _kpi_revenue_drop(self, guard: dict):
        drop_thr = float((guard.get("kpi") or {}).get("revenue_drop_pct", 25))
        now = utcnow()
        today_s, today_e = day_bounds(now)
        yday_s, yday_e = day_bounds(now - timedelta(days=1))

        async def sum_revenue(s, e):
            pipeline = [
                {"$match": {
                    "created_at": {"$gte": iso(s), "$lt": iso(e)},
                    "status": {"$in": ["paid", "processing", "shipped", "delivered", "PAID", "PROCESSING", "SHIPPED", "DELIVERED"]}
                }},
                {"$group": {"_id": None, "sum": {"$sum": "$total_amount"}}}
            ]
            rows = await self.orders.aggregate(pipeline).to_list(1)
            return float(rows[0]["sum"]) if rows else 0.0

        today = await sum_revenue(today_s, today_e)
        yday = await sum_revenue(yday_s, yday_e)

        drop = pct_drop(today, yday)
        if drop < drop_thr:
            return

        key = f"KPI_REVENUE_DROP:{today_s.date().isoformat()}"
        first = await self.repo.once(key, {"rule": "KPI_REVENUE_DROP", "key": key})
        if not first:
            return

        incident = {
            "key": key,
            "type": "KPI_REVENUE_DROP",
            "status": "OPEN",
            "severity": "WARN" if drop < 40 else "CRITICAL",
            "title": "Revenue Drop Alert",
            "description": f"Today {today:.2f} UAH, yesterday {yday:.2f} UAH. Drop ~{drop:.1f}%. Threshold {drop_thr}%.",
            "entity": "system",
            "payload": {"today": today, "yesterday": yday, "drop_pct": drop, "threshold": drop_thr},
            "muted_until": None,
            "resolved_at": None,
        }
        await self.repo.upsert_incident(incident)

        text = (
            f"<b>Revenue Drop Alert</b>\n"
            f"Today: <b>{today:.2f} UAH</b>\n"
            f"Yesterday: <b>{yday:.2f} UAH</b>\n"
            f"Drop: <b>{drop:.1f}%</b> (threshold {drop_thr}%)\n"
            f"Key: <code>{key}</code>"
        )
        await self.alerts.enqueue("KPI_REVENUE_DROP", {"text": text}, key)

    async def _kpi_awaiting_payment_spike(self, guard: dict):
        thr = int((guard.get("kpi") or {}).get("awaiting_payment_daily", 15))
        now = utcnow()
        today_s, today_e = day_bounds(now)

        cnt = await self.orders.count_documents({
            "created_at": {"$gte": iso(today_s), "$lt": iso(today_e)},
            "status": {"$in": ["pending", "AWAITING_PAYMENT"]}
        })

        if cnt < thr:
            return

        key = f"KPI_AWAITING_PAYMENT_SPIKE:{today_s.date().isoformat()}"
        first = await self.repo.once(key, {"rule": "KPI_AWAITING_PAYMENT_SPIKE", "key": key})
        if not first:
            return

        incident = {
            "key": key,
            "type": "KPI_AWAITING_PAYMENT_SPIKE",
            "status": "OPEN",
            "severity": "WARN",
            "title": "Unpaid Orders Spike",
            "description": f"Today AWAITING_PAYMENT: {cnt}. Threshold: {thr}.",
            "entity": "system",
            "payload": {"count": cnt, "threshold": thr},
            "muted_until": None,
            "resolved_at": None,
        }
        await self.repo.upsert_incident(incident)

        text = (
            f"<b>Unpaid Orders Spike</b>\n"
            f"AWAITING_PAYMENT today: <b>{cnt}</b>\n"
            f"Threshold: <b>{thr}</b>\n"
            f"Key: <code>{key}</code>"
        )
        await self.alerts.enqueue("KPI_AWAITING_PAYMENT_SPIKE", {"text": text}, key)

    async def _fraud_burst_orders(self, guard: dict):
        cfg = guard.get("fraud") or {}
        thr = int(cfg.get("burst_orders_per_hour", 3))
        now = utcnow()
        hour_ago = now - timedelta(hours=1)

        pipeline = [
            {"$match": {"created_at": {"$gte": iso(hour_ago), "$lt": iso(now)}}},
            {"$group": {"_id": "$buyer_id", "cnt": {"$sum": 1}, "orders": {"$push": "$id"}}},
            {"$match": {"cnt": {"$gte": thr}}}
        ]
        rows = await self.orders.aggregate(pipeline).to_list(20)

        for r in rows:
            buyer_id = r["_id"]
            if not buyer_id:
                continue

            key = f"FRAUD_BURST_ORDERS:{buyer_id}:{now.strftime('%Y-%m-%dT%H')}"
            first = await self.repo.once(key, {"rule": "FRAUD_BURST_ORDERS", "key": key})
            if not first:
                continue

            incident = {
                "key": key,
                "type": "FRAUD_BURST_ORDERS",
                "status": "OPEN",
                "severity": "CRITICAL",
                "title": "Suspicious Order Burst",
                "description": f"User {buyer_id} created {int(r['cnt'])} orders in last hour (threshold {thr}).",
                "entity": f"customer:{buyer_id}",
                "payload": {"buyer_id": buyer_id, "count": int(r["cnt"]), "orders": r.get("orders") or [], "threshold": thr},
                "muted_until": None,
                "resolved_at": None,
            }
            await self.repo.upsert_incident(incident)

            if cfg.get("auto_tag", True):
                await self._tag_customer(buyer_id, "FRAUD_SUSPECT")

            text = (
                f"<b>Suspicious Order Burst</b>\n"
                f"User: <code>{buyer_id}</code>\n"
                f"Orders in 1h: <b>{int(r['cnt'])}</b> (threshold {thr})\n"
                f"Key: <code>{key}</code>"
            )
            await self.alerts.enqueue("FRAUD_BURST_ORDERS", {"text": text}, key)

    async def _tag_customer(self, user_id: str, tag: str):
        user = await self.db["users"].find_one({"id": user_id}, {"_id": 0})
        if not user:
            return
        # Add tag to user metadata or separate tags collection
        await self.db["user_tags"].update_one(
            {"user_id": user_id},
            {"$addToSet": {"tags": tag}, "$set": {"updated_at": utcnow().isoformat()}},
            upsert=True
        )
