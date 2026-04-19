"""
Revenue Impact Estimator - Calculate expected cost vs uplift
"""
from datetime import datetime, timedelta, timezone
from .revenue_settings import get_settings


def now():
    return datetime.now(timezone.utc)


def clamp(x, a, b):
    return max(a, min(b, x))


class RevenueImpactEstimator:
    def __init__(self, db):
        self.db = db
        self.orders = db["orders"]

    async def _base_window_stats(self, range_days: int) -> dict:
        """Get base statistics for impact calculation"""
        since = (now() - timedelta(days=range_days)).isoformat()
        paid_statuses = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "paid", "completed"]

        # Total orders
        total = await self.orders.count_documents({"created_at": {"$gte": since}})

        # FULL_PREPAID orders
        prepaid_total = await self.orders.count_documents({
            "created_at": {"$gte": since},
            "payment_policy.mode": "FULL_PREPAID"
        })

        prepaid_paid = await self.orders.count_documents({
            "created_at": {"$gte": since},
            "payment_policy.mode": "FULL_PREPAID",
            "$or": [
                {"status": {"$in": paid_statuses}},
                {"payment_status": {"$in": paid_statuses}}
            ]
        })

        # Avg order grand
        avg_pipeline = [
            {"$match": {"created_at": {"$gte": since}}},
            {"$group": {"_id": None, "avg": {"$avg": {"$ifNull": ["$totals.grand", 0]}}}}
        ]
        avg_result = await self.orders.aggregate(avg_pipeline).to_list(1)
        avg_grand = float(avg_result[0]["avg"]) if avg_result else 0.0

        # Avg grand for prepaid
        prepaid_avg_pipeline = [
            {"$match": {"created_at": {"$gte": since}, "payment_policy.mode": "FULL_PREPAID"}},
            {"$group": {"_id": None, "avg": {"$avg": {"$ifNull": ["$totals.grand", 0]}}}}
        ]
        prepaid_avg_result = await self.orders.aggregate(prepaid_avg_pipeline).to_list(1)
        avg_prepaid_grand = float(prepaid_avg_result[0]["avg"]) if prepaid_avg_result else avg_grand

        # Return rate
        returns = await self.orders.count_documents({
            "created_at": {"$gte": since},
            "$or": [{"return.is_return": True}, {"status": {"$in": ["RETURNED", "CANCELLED_RETURNED"]}}]
        })
        return_rate = (returns / total) if total > 0 else 0.0

        prepaid_paid_rate = (prepaid_paid / prepaid_total) if prepaid_total > 0 else 0.0
        prepaid_share = (prepaid_total / total) if total > 0 else 0.0

        return {
            "range_days": range_days,
            "total_orders": total,
            "prepaid_total": prepaid_total,
            "prepaid_paid": prepaid_paid,
            "prepaid_paid_rate": round(prepaid_paid_rate, 4),
            "prepaid_share": round(prepaid_share, 4),
            "avg_grand": round(avg_grand, 2),
            "avg_prepaid_grand": round(avg_prepaid_grand, 2),
            "return_rate": round(return_rate, 4),
        }

    async def estimate_discount_change(
        self, 
        range_days: int, 
        from_pct: float, 
        to_pct: float
    ) -> dict:
        """
        Estimate impact of changing discount percentage.
        
        Returns cost vs uplift analysis.
        """
        settings = await get_settings(self.db)
        elasticity = float(settings.get("impact_elasticity", 0.6))
        margin_rate = float(settings.get("impact_margin_rate", 0.18))
        return_penalty = float(settings.get("impact_return_penalty", 0.3))

        stats = await self._base_window_stats(range_days)

        delta_pct = float(to_pct) - float(from_pct)
        
        if delta_pct == 0:
            return {
                "ok": True, 
                "stats": stats, 
                "impact": {"note": "NO_CHANGE", "delta_discount_pct": 0}
            }

        prepaid_paid = stats["prepaid_paid"]
        prepaid_total = stats["prepaid_total"]
        avg_prepaid_grand = stats["avg_prepaid_grand"]
        ret_rate = float(stats["return_rate"])

        if delta_pct > 0:
            # Increasing discount
            # Cost: (delta_pct%) * avg_grand * expected_paid_count
            # We estimate future paid = current paid + uplift
            uplift_rate = (elasticity * delta_pct) / 100.0
            extra_paid = int(round(prepaid_total * uplift_rate, 0))
            future_paid = prepaid_paid + extra_paid
            
            discount_cost = (delta_pct / 100.0) * avg_prepaid_grand * future_paid
            
            # Extra margin from extra paid orders
            extra_revenue = extra_paid * avg_prepaid_grand
            extra_margin = extra_revenue * margin_rate
            
            # Return penalty on extra margin
            expected_return_loss = extra_margin * (ret_rate * return_penalty)
            
            net_delta = extra_margin - discount_cost - expected_return_loss
            
            impact = {
                "direction": "INCREASE",
                "delta_discount_pct": round(delta_pct, 3),
                "from_pct": from_pct,
                "to_pct": to_pct,
                "elasticity": elasticity,
                "expected_uplift_rate": round(uplift_rate, 5),
                "expected_extra_paid_orders": extra_paid,
                "discount_cost_uah": round(discount_cost, 2),
                "extra_margin_uah": round(extra_margin, 2),
                "expected_return_loss_uah": round(expected_return_loss, 2),
                "expected_net_delta_uah": round(net_delta, 2),
                "recommendation": "POSITIVE" if net_delta > 0 else "NEGATIVE",
            }
        else:
            # Decreasing discount (saving money)
            savings_rate = abs(delta_pct) / 100.0
            savings = savings_rate * avg_prepaid_grand * prepaid_paid
            
            # Expected conversion drop
            conv_drop_rate = (elasticity * abs(delta_pct)) / 100.0
            lost_orders = int(round(prepaid_total * conv_drop_rate, 0))
            lost_revenue = lost_orders * avg_prepaid_grand * margin_rate
            
            net_delta = savings - lost_revenue
            
            impact = {
                "direction": "DECREASE",
                "delta_discount_pct": round(delta_pct, 3),
                "from_pct": from_pct,
                "to_pct": to_pct,
                "elasticity": elasticity,
                "expected_savings_uah": round(savings, 2),
                "expected_lost_orders": lost_orders,
                "expected_lost_revenue_uah": round(lost_revenue, 2),
                "expected_net_delta_uah": round(net_delta, 2),
                "recommendation": "POSITIVE" if net_delta > 0 else "NEGATIVE",
            }

        return {"ok": True, "stats": stats, "impact": impact}
