"""
O20.3 & O20.4: Return Analytics Service
KPI calculations for returns, losses, and trends
"""
from datetime import datetime, timezone, timedelta
from typing import Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase


class ReturnAnalyticsService:
    """Analytics for return management KPIs"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.orders = db["orders"]
        self.ledger = db["finance_ledger"]
        self.customers = db["customers"]

    def _since(self, days: int) -> str:
        return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    async def summary(self) -> Dict[str, Any]:
        """Get comprehensive return analytics summary"""
        since_1 = self._since(1)
        since_7 = self._since(7)
        since_30 = self._since(30)

        # Total orders in 30 days
        total_30 = await self.orders.count_documents({"created_at": {"$gte": since_30}})
        
        # Returns by period
        returns_today = await self.orders.count_documents({
            "returns.stage": {"$in": ["RETURNING", "RETURNED"]},
            "returns.updated_at": {"$gte": since_1}
        })
        
        returns_7 = await self.orders.count_documents({
            "returns.stage": {"$in": ["RETURNING", "RETURNED"]},
            "returns.updated_at": {"$gte": since_7}
        })
        
        returns_30 = await self.orders.count_documents({
            "returns.stage": {"$in": ["RETURNING", "RETURNED"]},
            "returns.updated_at": {"$gte": since_30}
        })

        # COD refusals in 30 days
        cod_ref_30 = await self.orders.count_documents({
            "returns.reason": {"$in": ["REFUSED", "NOT_PICKED_UP", "STORAGE_EXPIRED"]},
            "returns.updated_at": {"$gte": since_30},
            "$or": [
                {"payment.method": {"$in": ["COD", "cod", "CASH_ON_DELIVERY", "postpaid"]}},
                {"payment_method": {"$in": ["COD", "cod", "CASH_ON_DELIVERY", "postpaid"]}}
            ]
        })

        # Shipping losses in 30 days
        losses_30 = 0
        async for l in self.ledger.find({
            "type": {"$in": ["SHIP_COST_OUT", "RETURN_COST_OUT"]},
            "created_at": {"$gte": since_30}
        }):
            losses_30 += float(l.get("amount", 0))

        # Top reasons (30 days)
        pipeline_reasons = [
            {"$match": {
                "returns.updated_at": {"$gte": since_30},
                "returns.reason": {"$exists": True}
            }},
            {"$group": {"_id": "$returns.reason", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 5}
        ]
        top_reasons = []
        async for r in self.orders.aggregate(pipeline_reasons):
            if r["_id"]:
                top_reasons.append({"reason": r["_id"], "count": r["count"]})

        # Top cities by returns (30 days)
        pipeline_cities = [
            {"$match": {
                "returns.updated_at": {"$gte": since_30},
                "returns.stage": {"$in": ["RETURNING", "RETURNED"]}
            }},
            {"$group": {
                "_id": {"$ifNull": [
                    "$delivery.recipient.city",
                    {"$ifNull": ["$shipping.city", "Невідомо"]}
                ]},
                "count": {"$sum": 1}
            }},
            {"$sort": {"count": -1}},
            {"$limit": 5}
        ]
        top_cities = []
        async for r in self.orders.aggregate(pipeline_cities):
            if r["_id"]:
                top_cities.append({"city": r["_id"], "count": r["count"]})

        return {
            "today": returns_today,
            "7d": returns_7,
            "30d": returns_30,
            "return_rate_30d": round((returns_30 / total_30) if total_30 else 0, 4),
            "cod_refusal_rate_30d": round((cod_ref_30 / total_30) if total_30 else 0, 4),
            "shipping_losses_30d": round(losses_30, 2),
            "top_reasons_30d": top_reasons,
            "top_cities_30d": top_cities
        }

    async def daily_trend(self, days: int = 30) -> dict:
        """Get daily return trend with labels for charts"""
        since = self._since(days)
        
        # Returns per day
        pipeline_returns = [
            {"$match": {
                "returns.updated_at": {"$gte": since},
                "returns.stage": {"$in": ["RETURNING", "RETURNED"]}
            }},
            {"$addFields": {"day": {"$substr": ["$returns.updated_at", 0, 10]}}},
            {"$group": {"_id": "$day", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}}
        ]
        
        returns_map = {}
        async for r in self.orders.aggregate(pipeline_returns):
            returns_map[r["_id"]] = int(r["count"])
        
        # Losses per day
        pipeline_losses = [
            {"$match": {
                "type": {"$in": ["SHIP_COST_OUT", "RETURN_COST_OUT"]},
                "created_at": {"$gte": since}
            }},
            {"$addFields": {"day": {"$substr": ["$created_at", 0, 10]}}},
            {"$group": {"_id": "$day", "amount": {"$sum": "$amount"}}},
            {"$sort": {"_id": 1}}
        ]
        
        losses_map = {}
        async for r in self.ledger.aggregate(pipeline_losses):
            losses_map[r["_id"]] = float(r["amount"])
        
        # Fill all days
        start = datetime.now(timezone.utc) - timedelta(days=days-1)
        labels, returns, losses = [], [], []
        
        for i in range(days):
            d = (start + timedelta(days=i)).date().isoformat()
            labels.append(d)
            returns.append(returns_map.get(d, 0))
            losses.append(round(losses_map.get(d, 0), 2))
        
        return {
            "days": days,
            "labels": labels,
            "returns": returns,
            "losses": losses
        }

    async def risk_customers(self, limit: int = 20) -> list:
        """Get customers with high return rate"""
        pipeline = [
            {"$match": {
                "$or": [
                    {"counters.returns_total": {"$gte": 2}},
                    {"counters.cod_refusals_total": {"$gte": 2}},
                    {"segment": {"$in": ["RISK", "BLOCK_COD"]}}
                ]
            }},
            {"$project": {
                "_id": 0,
                "phone": 1,
                "email": 1,
                "name": 1,
                "segment": 1,
                "counters": 1,
                "orders_count": 1,
                "total_spent": 1
            }},
            {"$sort": {"counters.returns_total": -1}},
            {"$limit": limit}
        ]
        
        return [c async for c in self.customers.aggregate(pipeline)]
