"""
Revenue Snapshot Service - Captures key metrics for ROE analysis
"""
from datetime import datetime, timedelta, timezone
import logging

logger = logging.getLogger(__name__)


def now():
    return datetime.now(timezone.utc)


class RevenueSnapshotService:
    def __init__(self, db):
        self.db = db
        self.orders = db["orders"]
        self.payments = db["payments"]
        self.ledger = db["finance_ledger"]
        self.snaps = db["revenue_snapshots"]

    async def build_snapshot(self, range_days: int = 7) -> dict:
        """Build a comprehensive snapshot of revenue metrics"""
        since = (now() - timedelta(days=range_days)).isoformat()

        # Total orders
        orders_total = await self.orders.count_documents({"created_at": {"$gte": since}})
        
        # Paid orders
        paid_statuses = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "paid", "completed"]
        paid_total = await self.orders.count_documents({
            "created_at": {"$gte": since},
            "$or": [
                {"status": {"$in": paid_statuses}},
                {"payment_status": {"$in": paid_statuses}}
            ]
        })

        # Declined payments
        declined_total = await self.payments.count_documents({
            "created_at": {"$gte": since},
            "status": {"$in": ["DECLINED", "declined", "FAILED", "failed"]}
        }) if "payments" in await self.db.list_collection_names() else 0

        # Returns
        returns_total = await self.orders.count_documents({
            "created_at": {"$gte": since},
            "$or": [
                {"return.is_return": True},
                {"status": {"$in": ["RETURNED", "CANCELLED_RETURNED"]}}
            ]
        })

        # Recovery (retry)
        retry_paid = await self.orders.count_documents({
            "paid_at": {"$gte": since},
            "retry.sent": True,
            "$or": [
                {"status": {"$in": paid_statuses}},
                {"payment_status": {"$in": paid_statuses}}
            ]
        })

        # Rates
        total_attempts = max(1, paid_total + declined_total)
        decline_rate = declined_total / total_attempts
        return_rate = (returns_total / orders_total) if orders_total > 0 else 0
        recovery_rate = (retry_paid / orders_total) if orders_total > 0 else 0

        # Deposit conversion
        deposit_total = await self.orders.count_documents({
            "created_at": {"$gte": since},
            "$or": [
                {"deposit.required": True},
                {"payment_policy.mode": "SHIP_DEPOSIT"}
            ]
        })
        deposit_paid = await self.orders.count_documents({
            "created_at": {"$gte": since},
            "deposit.paid": True
        })
        deposit_conv = (deposit_paid / deposit_total) if deposit_total > 0 else 0

        # Prepaid metrics
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
        prepaid_conv = (prepaid_paid / prepaid_total) if prepaid_total > 0 else 0

        # Avg payment time
        time_pipeline = [
            {"$match": {
                "paid_at": {"$gte": since},
                "$or": [
                    {"status": {"$in": paid_statuses}},
                    {"payment_status": {"$in": paid_statuses}}
                ]
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
        avg_pay_min = float(time_result[0]["avg"]) if time_result else 0.0

        # Discount stats
        discount_pipeline = [
            {"$match": {
                "created_at": {"$gte": since},
                "pricing.discount.amount": {"$exists": True, "$gt": 0}
            }},
            {"$group": {
                "_id": None,
                "total": {"$sum": "$pricing.discount.amount"},
                "avg": {"$avg": "$pricing.discount.amount"},
                "count": {"$sum": 1}
            }}
        ]
        discount_result = await self.orders.aggregate(discount_pipeline).to_list(1)
        discount_total = float(discount_result[0]["total"]) if discount_result else 0.0
        discount_avg = float(discount_result[0]["avg"]) if discount_result else 0.0

        # Revenue
        revenue_pipeline = [
            {"$match": {
                "created_at": {"$gte": since},
                "$or": [
                    {"status": {"$in": paid_statuses}},
                    {"payment_status": {"$in": paid_statuses}}
                ]
            }},
            {"$group": {
                "_id": None,
                "gross": {"$sum": {"$ifNull": ["$totals.grand_before_discount", "$totals.grand"]}},
                "net": {"$sum": "$totals.grand"}
            }}
        ]
        revenue_result = await self.orders.aggregate(revenue_pipeline).to_list(1)
        gross_revenue = float(revenue_result[0]["gross"]) if revenue_result else 0.0
        net_revenue = float(revenue_result[0]["net"]) if revenue_result else 0.0

        # Shipping losses from ledger
        shipping_losses = 0.0
        try:
            loss_pipeline = [
                {"$match": {
                    "ts": {"$gte": since},
                    "type": {"$in": ["SHIP_COST_OUT", "RETURN_COST_OUT", "SALE_LOST"]}
                }},
                {"$group": {"_id": None, "sum": {"$sum": "$amount"}}}
            ]
            loss_result = await self.ledger.aggregate(loss_pipeline).to_list(1)
            shipping_losses = float(loss_result[0]["sum"]) if loss_result else 0.0
        except Exception:
            pass

        # Net margin estimate (heuristic)
        paid_ratio = (paid_total / orders_total) if orders_total > 0 else 0
        net_margin_est = max(0.0, min(0.4, paid_ratio - return_rate - decline_rate * 0.5))

        snap = {
            "ts": now().isoformat(),
            "range_days": range_days,
            "orders_total": orders_total,
            "paid_total": paid_total,
            "declined_total": declined_total,
            "returns_total": returns_total,
            "retry_paid": retry_paid,
            "decline_rate": round(decline_rate, 4),
            "return_rate": round(return_rate, 4),
            "recovery_rate": round(recovery_rate, 4),
            "deposit_total": deposit_total,
            "deposit_paid": deposit_paid,
            "deposit_conversion": round(deposit_conv, 4),
            "prepaid_total": prepaid_total,
            "prepaid_paid": prepaid_paid,
            "prepaid_conversion": round(prepaid_conv, 4),
            "avg_payment_time_min": round(avg_pay_min, 2),
            "discount_total_uah": round(discount_total, 2),
            "discount_avg_uah": round(discount_avg, 2),
            "gross_revenue_uah": round(gross_revenue, 2),
            "net_revenue_uah": round(net_revenue, 2),
            "shipping_losses_uah": round(shipping_losses, 2),
            "net_margin_est": round(net_margin_est, 4),
        }

        await self.snaps.insert_one(dict(snap))  # copy to avoid _id mutation
        logger.info(f"Revenue snapshot built: {orders_total} orders, {paid_total} paid, margin={net_margin_est:.2%}")
        
        return snap

    async def get_recent_snapshots(self, limit: int = 10):
        """Get recent snapshots for trend analysis"""
        cursor = self.snaps.find({}, {"_id": 0}).sort("ts", -1).limit(limit)
        return await cursor.to_list(limit)
