"""
O18: Analytics Engine - KPI/Funnel/Cohorts/LTV/SLA
"""
from datetime import datetime, timezone, timedelta
from modules.analytics_intel.analytics_repo import AnalyticsRepo
import logging

logger = logging.getLogger(__name__)


def utcnow():
    return datetime.now(timezone.utc)


def iso(dt):
    return dt.isoformat()


def day_str(dt: datetime):
    return dt.date().isoformat()


class AnalyticsEngine:
    def __init__(self, db):
        self.db = db
        self.repo = AnalyticsRepo(db)
        self.orders = db["orders"]
        self.users = db["users"]

    async def build_daily(self, day: datetime):
        """Build daily analytics snapshot"""
        await self.repo.ensure_indexes()

        start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
        day_key = day_str(start)

        # Revenue and orders by status
        pipeline = [
            {"$match": {"created_at": {"$gte": iso(start), "$lt": iso(end)}}},
            {"$group": {
                "_id": None,
                "orders": {"$sum": 1},
                "revenue": {"$sum": {"$cond": [
                    {"$in": ["$status", ["paid", "processing", "shipped", "delivered", "PAID", "PROCESSING", "SHIPPED", "DELIVERED"]]},
                    "$total_amount",
                    0
                ]}},
                "paid": {"$sum": {"$cond": [{"$in": ["$payment_status", ["paid", "completed", "PAID"]]}, 1, 0]}},
                "awaiting_payment": {"$sum": {"$cond": [{"$in": ["$status", ["pending", "AWAITING_PAYMENT"]]}, 1, 0]}},
                "processing": {"$sum": {"$cond": [{"$in": ["$status", ["processing", "PROCESSING"]]}, 1, 0]}},
                "shipped": {"$sum": {"$cond": [{"$in": ["$status", ["shipped", "SHIPPED"]]}, 1, 0]}},
                "delivered": {"$sum": {"$cond": [{"$in": ["$status", ["delivered", "DELIVERED"]]}, 1, 0]}},
                "cancels": {"$sum": {"$cond": [{"$in": ["$status", ["cancelled", "CANCELLED"]]}, 1, 0]}},
                "returns": {"$sum": {"$cond": [{"$in": ["$status", ["returned", "RETURNED"]]}, 1, 0]}},
            }}
        ]

        rows = await self.orders.aggregate(pipeline).to_list(1)
        agg = rows[0] if rows else {
            "orders": 0, "revenue": 0, "paid": 0, "awaiting_payment": 0,
            "processing": 0, "shipped": 0, "delivered": 0, "cancels": 0, "returns": 0
        }

        orders = int(agg.get("orders", 0))
        revenue = float(agg.get("revenue", 0))
        aov = (revenue / orders) if orders else 0.0

        # Simple SLA calculation (placeholder)
        sla = {"avg_h": 0, "median_h": 0, "p95_h": 0}

        # Risk distribution snapshot
        risk_pipe = [
            {"$match": {"risk.score": {"$exists": True}}},
            {"$group": {"_id": "$risk.band", "cnt": {"$sum": 1}}},
        ]
        risk_rows = await self.users.aggregate(risk_pipe).to_list(10)
        risk_dist = {r["_id"]: int(r["cnt"]) for r in risk_rows if r.get("_id")}

        await self.repo.upsert_daily(day_key, {
            "revenue": revenue,
            "orders": orders,
            "aov": aov,
            "funnel": {
                "paid": int(agg.get("paid", 0)),
                "awaiting_payment": int(agg.get("awaiting_payment", 0)),
                "processing": int(agg.get("processing", 0)),
                "shipped": int(agg.get("shipped", 0)),
                "delivered": int(agg.get("delivered", 0)),
                "cancels": int(agg.get("cancels", 0)),
                "returns": int(agg.get("returns", 0)),
            },
            "sla": sla,
            "risk_dist": risk_dist,
        })

        return {"day": day_key, "ok": True}

    async def build_range_live(self, range_days: int):
        """Build KPI from daily snapshots"""
        end = utcnow().date()
        start = end - timedelta(days=range_days - 1)
        data = await self.repo.get_daily_range(start.isoformat(), end.isoformat())

        if not data:
            # Calculate live if no snapshots
            return await self._calculate_live(range_days)

        revenue = sum(float(d.get("revenue", 0)) for d in data)
        orders = sum(int(d.get("orders", 0)) for d in data)
        aov = (revenue / orders) if orders else 0.0

        funnel_sum = {
            "paid": 0, "awaiting_payment": 0, "processing": 0,
            "shipped": 0, "delivered": 0, "cancels": 0, "returns": 0
        }
        for d in data:
            f = d.get("funnel") or {}
            for k in funnel_sum:
                funnel_sum[k] += int(f.get(k, 0))

        sla_avg = {
            "avg_h": sum(float((d.get("sla") or {}).get("avg_h", 0)) for d in data) / max(len(data), 1),
            "median_h": sum(float((d.get("sla") or {}).get("median_h", 0)) for d in data) / max(len(data), 1),
            "p95_h": sum(float((d.get("sla") or {}).get("p95_h", 0)) for d in data) / max(len(data), 1),
        }

        return {
            "range_days": range_days,
            "revenue": revenue,
            "orders": orders,
            "aov": aov,
            **funnel_sum,
            "sla": sla_avg,
            "by_day": [{"day": d["day"], "revenue": d.get("revenue", 0), "orders": d.get("orders", 0)} for d in data]
        }

    async def _calculate_live(self, range_days: int):
        """Calculate KPI directly from orders (fallback)"""
        now = utcnow()
        start = now - timedelta(days=range_days)

        pipeline = [
            {"$match": {"created_at": {"$gte": iso(start)}}},
            {"$group": {
                "_id": None,
                "orders": {"$sum": 1},
                "revenue": {"$sum": {"$cond": [
                    {"$in": ["$payment_status", ["paid", "completed", "PAID"]]},
                    "$total_amount",
                    0
                ]}},
                "paid": {"$sum": {"$cond": [{"$in": ["$payment_status", ["paid", "completed", "PAID"]]}, 1, 0]}},
                "awaiting_payment": {"$sum": {"$cond": [{"$in": ["$status", ["pending", "AWAITING_PAYMENT"]]}, 1, 0]}},
                "processing": {"$sum": {"$cond": [{"$in": ["$status", ["processing", "PROCESSING"]]}, 1, 0]}},
                "shipped": {"$sum": {"$cond": [{"$in": ["$status", ["shipped", "SHIPPED"]]}, 1, 0]}},
                "delivered": {"$sum": {"$cond": [{"$in": ["$status", ["delivered", "DELIVERED"]]}, 1, 0]}},
                "cancels": {"$sum": {"$cond": [{"$in": ["$status", ["cancelled", "CANCELLED"]]}, 1, 0]}},
                "returns": {"$sum": {"$cond": [{"$in": ["$status", ["returned", "RETURNED"]]}, 1, 0]}},
            }}
        ]

        rows = await self.orders.aggregate(pipeline).to_list(1)
        agg = rows[0] if rows else {}

        orders = int(agg.get("orders", 0))
        revenue = float(agg.get("revenue", 0))
        aov = (revenue / orders) if orders else 0.0

        return {
            "range_days": range_days,
            "revenue": revenue,
            "orders": orders,
            "aov": aov,
            "paid": int(agg.get("paid", 0)),
            "awaiting_payment": int(agg.get("awaiting_payment", 0)),
            "processing": int(agg.get("processing", 0)),
            "shipped": int(agg.get("shipped", 0)),
            "delivered": int(agg.get("delivered", 0)),
            "cancels": int(agg.get("cancels", 0)),
            "returns": int(agg.get("returns", 0)),
            "sla": {"avg_h": 0, "median_h": 0, "p95_h": 0},
            "by_day": []
        }
