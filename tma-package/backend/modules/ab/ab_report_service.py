"""
A/B Report Service - Analytics by cohort
"""
from datetime import datetime, timedelta, timezone
import logging

logger = logging.getLogger(__name__)


def now():
    return datetime.now(timezone.utc)


class ABReportService:
    def __init__(self, db):
        self.db = db
        self.orders = db["orders"]
        self.experiments = db["ab_experiments"]

    async def report(self, exp_id: str, range_days: int = 14) -> dict:
        """
        Generate A/B test report by variant.
        
        Orders must have: order.ab.exp_id and order.ab.variant
        """
        since = (now() - timedelta(days=range_days)).isoformat()
        
        exp = await self.experiments.find_one({"id": exp_id}, {"_id": 0})
        if not exp:
            return {"ok": False, "error": "EXPERIMENT_NOT_FOUND"}

        paid_statuses = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "paid", "completed"]

        pipeline = [
            {"$match": {
                "created_at": {"$gte": since},
                "ab.exp_id": exp_id
            }},
            {"$group": {
                "_id": "$ab.variant",
                "orders_total": {"$sum": 1},
                "paid_total": {"$sum": {
                    "$cond": [
                        {"$or": [
                            {"$in": ["$status", paid_statuses]},
                            {"$in": ["$payment_status", paid_statuses]}
                        ]},
                        1, 0
                    ]
                }},
                "revenue_gross": {"$sum": {
                    "$cond": [
                        {"$or": [
                            {"$in": ["$status", paid_statuses]},
                            {"$in": ["$payment_status", paid_statuses]}
                        ]},
                        {"$ifNull": ["$totals.grand_before_discount", "$totals.grand"]},
                        0
                    ]
                }},
                "revenue_net": {"$sum": {
                    "$cond": [
                        {"$or": [
                            {"$in": ["$status", paid_statuses]},
                            {"$in": ["$payment_status", paid_statuses]}
                        ]},
                        {"$ifNull": ["$totals.grand", 0]},
                        0
                    ]
                }},
                "avg_grand": {"$avg": {"$ifNull": ["$totals.grand", 0]}},
                "discount_total": {"$sum": {"$ifNull": ["$pricing.discount.amount", 0]}},
                "discount_avg": {"$avg": {"$ifNull": ["$pricing.discount.amount", 0]}},
                "returns_total": {"$sum": {
                    "$cond": [
                        {"$or": [
                            {"$eq": ["$return.is_return", True]},
                            {"$in": ["$status", ["RETURNED", "CANCELLED_RETURNED"]]}
                        ]},
                        1, 0
                    ]
                }},
            }},
            {"$project": {
                "variant": "$_id",
                "_id": 0,
                "orders_total": 1,
                "paid_total": 1,
                "paid_rate": {
                    "$cond": [
                        {"$gt": ["$orders_total", 0]},
                        {"$divide": ["$paid_total", "$orders_total"]},
                        0
                    ]
                },
                "revenue_gross": {"$round": ["$revenue_gross", 2]},
                "revenue_net": {"$round": ["$revenue_net", 2]},
                "avg_grand": {"$round": ["$avg_grand", 2]},
                "discount_total": {"$round": ["$discount_total", 2]},
                "discount_avg": {"$round": ["$discount_avg", 2]},
                "returns_total": 1,
                "return_rate": {
                    "$cond": [
                        {"$gt": ["$orders_total", 0]},
                        {"$divide": ["$returns_total", "$orders_total"]},
                        0
                    ]
                },
            }}
        ]

        rows = await self.orders.aggregate(pipeline).to_list(None)

        # Attach discount_pct from experiment variants
        variant_map = {v["key"]: float(v.get("discount_pct", 0)) for v in exp.get("variants", [])}
        
        for r in rows:
            r["discount_pct"] = variant_map.get(r["variant"], 0.0)
            r["paid_rate"] = round(r["paid_rate"], 4)
            r["return_rate"] = round(r["return_rate"], 4)
            
            # Calculate net effect
            # Net = revenue_net - discount_total - estimated_return_cost
            return_cost = r["returns_total"] * 350  # avg return cost
            r["net_effect_uah"] = round(r["revenue_net"] - return_cost, 2)

        # Sort by variant key
        rows.sort(key=lambda x: x.get("variant", "Z"))

        # Find winner
        winner = None
        if rows:
            # Winner by paid_rate
            best_paid = max(rows, key=lambda x: x.get("paid_rate", 0))
            # Winner by net_effect
            best_net = max(rows, key=lambda x: x.get("net_effect_uah", 0))
            
            winner = {
                "by_paid_rate": best_paid.get("variant"),
                "by_net_effect": best_net.get("variant"),
            }

        return {
            "ok": True,
            "exp": {
                "id": exp_id,
                "name": exp.get("name"),
                "range_days": range_days,
                "variants_config": exp.get("variants", [])
            },
            "rows": rows,
            "winner": winner,
            "total_orders": sum(r.get("orders_total", 0) for r in rows),
            "total_paid": sum(r.get("paid_total", 0) for r in rows),
        }

    async def summary_all_experiments(self, range_days: int = 14) -> dict:
        """Get summary for all active experiments"""
        since = (now() - timedelta(days=range_days)).isoformat()
        
        experiments = await self.experiments.find({"active": True}, {"_id": 0}).to_list(100)
        summaries = []
        
        for exp in experiments:
            orders_count = await self.orders.count_documents({
                "created_at": {"$gte": since},
                "ab.exp_id": exp["id"]
            })
            summaries.append({
                "id": exp["id"],
                "name": exp.get("name"),
                "orders_in_range": orders_count,
                "variants_count": len(exp.get("variants", [])),
            })
        
        return {"experiments": summaries, "range_days": range_days}
