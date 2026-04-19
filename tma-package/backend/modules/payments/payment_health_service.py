"""
Payment Health Dashboard Service
Metrics: webhook success, reconciliation, retry recovery, deposit conversion, prepaid analytics
"""
from datetime import datetime, timezone, timedelta
import logging

logger = logging.getLogger(__name__)


def utcnow():
    return datetime.now(timezone.utc)


def since_iso(days: int) -> str:
    return (utcnow() - timedelta(days=days)).isoformat()


class PaymentHealthService:
    def __init__(self, db):
        self.db = db
        self.payments = db["payments"]
        self.orders = db["orders"]
        self.fondy_logs = db["fondy_logs"]
        self.payment_events = db["payment_events"]

    async def get_health(self, range_days: int = 7) -> dict:
        """Get payment health metrics for given range"""
        since = since_iso(range_days)

        # 1. Base payment stats by status
        base_pipeline = [
            {"$match": {"created_at": {"$gte": since}}},
            {"$group": {"_id": "$payment_status", "count": {"$sum": 1}}}
        ]
        base_results = await self.orders.aggregate(base_pipeline).to_list(20)

        total = 0
        paid = declined = expired = pending = 0
        status_map = {}
        for r in base_results:
            cnt = r.get("count", 0)
            total += cnt
            status = (r.get("_id") or "").upper()
            status_map[status] = cnt
            if status in ("PAID", "COMPLETED"):
                paid += cnt
            elif status in ("DECLINED", "FAILED"):
                declined += cnt
            elif status == "EXPIRED":
                expired += cnt
            elif status == "PENDING":
                pending += cnt

        # 2. Webhook success rate
        total_logs = await self.fondy_logs.count_documents({"created_at": {"$gte": since}})
        valid_logs = await self.fondy_logs.count_documents({
            "created_at": {"$gte": since},
            "signature_valid": True
        })
        webhook_rate = (valid_logs / total_logs) if total_logs > 0 else 1.0

        # 3. Reconciliation fixes
        recon_fixes = await self.orders.count_documents({
            "updated_at": {"$gte": since},
            "payment_updated_by": "reconciliation"
        })

        # 4. Retry recovered
        retry_recovered = await self.orders.count_documents({
            "paid_at": {"$gte": since},
            "retry.sent": True,
            "payment_status": {"$in": ["paid", "PAID", "completed", "COMPLETED"]}
        })
        recovery_rate = (retry_recovered / total) if total > 0 else 0

        # 5. Deposit conversion
        deposit_total = await self.orders.count_documents({
            "created_at": {"$gte": since},
            "payment_policy.mode": "SHIP_DEPOSIT"
        })
        deposit_converted = await self.orders.count_documents({
            "created_at": {"$gte": since},
            "payment_policy.mode": "SHIP_DEPOSIT",
            "payment_status": {"$in": ["paid", "PAID", "completed", "COMPLETED"]}
        })
        deposit_rate = (deposit_converted / deposit_total) if deposit_total > 0 else 0

        # 6. Avg payment time (minutes)
        time_pipeline = [
            {"$match": {
                "paid_at": {"$gte": since},
                "payment_status": {"$in": ["paid", "PAID", "completed", "COMPLETED"]}
            }},
            {"$project": {
                "delta": {
                    "$divide": [
                        {"$subtract": [
                            {"$toDate": "$paid_at"},
                            {"$toDate": "$created_at"}
                        ]},
                        60000  # ms to minutes
                    ]
                }
            }},
            {"$group": {"_id": None, "avg": {"$avg": "$delta"}}}
        ]
        time_result = await self.orders.aggregate(time_pipeline).to_list(1)
        avg_minutes = time_result[0]["avg"] if time_result else 0

        # 7. Prepaid analytics
        prepaid_orders = await self.orders.count_documents({
            "created_at": {"$gte": since},
            "payment_policy.mode": "FULL_PREPAID"
        })
        prepaid_paid = await self.orders.count_documents({
            "created_at": {"$gte": since},
            "payment_policy.mode": "FULL_PREPAID",
            "payment_status": {"$in": ["paid", "PAID", "completed", "COMPLETED"]}
        })
        prepaid_conversion = (prepaid_paid / prepaid_orders) if prepaid_orders > 0 else 0

        # 8. Discount analytics
        discount_pipeline = [
            {"$match": {
                "created_at": {"$gte": since},
                "pricing.discount": {"$exists": True}
            }},
            {"$group": {
                "_id": None,
                "total": {"$sum": "$pricing.discount.amount"},
                "avg": {"$avg": "$pricing.discount.amount"},
                "count": {"$sum": 1}
            }}
        ]
        discount_result = await self.orders.aggregate(discount_pipeline).to_list(1)
        discount_total = discount_result[0]["total"] if discount_result else 0
        discount_avg = discount_result[0]["avg"] if discount_result else 0
        discount_count = discount_result[0]["count"] if discount_result else 0

        # Estimated COD loss saved (avg return cost ~350 UAH)
        cod_loss_saved = prepaid_paid * 350

        # 9. Daily trend (last 7 days)
        daily_pipeline = [
            {"$match": {"created_at": {"$gte": since}}},
            {"$addFields": {
                "date": {"$substr": ["$created_at", 0, 10]}
            }},
            {"$group": {
                "_id": "$date",
                "total": {"$sum": 1},
                "paid": {"$sum": {"$cond": [
                    {"$in": ["$payment_status", ["paid", "PAID", "completed", "COMPLETED"]]},
                    1, 0
                ]}},
                "revenue": {"$sum": {"$cond": [
                    {"$in": ["$payment_status", ["paid", "PAID", "completed", "COMPLETED"]]},
                    {"$ifNull": [{"$toDouble": "$totals.grand"}, {"$toDouble": "$total_amount"}]},
                    0
                ]}}
            }},
            {"$sort": {"_id": 1}}
        ]
        daily_trend = await self.orders.aggregate(daily_pipeline).to_list(30)

        return {
            "range_days": range_days,
            "total_payments": total,
            "paid": paid,
            "declined": declined,
            "expired": expired,
            "pending": pending,
            "status_breakdown": status_map,

            "webhook_success_rate": round(webhook_rate, 4),
            "webhook_total": total_logs,
            "webhook_valid": valid_logs,
            
            "reconciliation_fixes": recon_fixes,
            
            "retry_recovered": retry_recovered,
            "recovery_rate": round(recovery_rate, 4),
            
            "deposit_total": deposit_total,
            "deposit_converted": deposit_converted,
            "deposit_conversion_rate": round(deposit_rate, 4),
            
            "avg_payment_time_minutes": round(avg_minutes or 0, 2),

            "prepaid_orders": prepaid_orders,
            "prepaid_paid": prepaid_paid,
            "prepaid_conversion_rate": round(prepaid_conversion, 4),

            "discount_total_uah": round(discount_total or 0, 2),
            "discount_avg_uah": round(discount_avg or 0, 2),
            "discount_orders_count": discount_count,
            "estimated_cod_loss_saved": round(cod_loss_saved, 2),

            "daily_trend": [
                {"date": d["_id"], "total": d["total"], "paid": d["paid"], "revenue": round(d["revenue"], 2)}
                for d in daily_trend
            ]
        }
