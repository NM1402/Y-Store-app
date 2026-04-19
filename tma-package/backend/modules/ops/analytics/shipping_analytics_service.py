# O3: Shipping Analytics Service
from motor.motor_asyncio import AsyncIOMotorDatabase

class ShippingAnalyticsService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.orders = db["orders"]

    async def stats_by_day(self, date_from: str, date_to: str):
        pipeline = [
            {"$match": {
                "shipment.provider": "NOVAPOSHTA",
                "shipment.created_at": {"$gte": date_from, "$lte": date_to}
            }},
            {"$addFields": {
                "day": {"$substr": ["$shipment.created_at", 0, 10]},
                "grand": {"$ifNull": ["$totals.grand", 0]},
                "ship_cost": {"$ifNull": ["$shipment.cost", 0]},
            }},
            {"$group": {
                "_id": "$day",
                "ttnCount": {"$sum": 1},
                "sumGrand": {"$sum": "$grand"},
                "sumShipping": {"$sum": "$ship_cost"},
            }},
            {"$sort": {"_id": 1}},
        ]
        return await self.orders.aggregate(pipeline).to_list(length=400)

    async def top_destinations(self, date_from: str, date_to: str, limit: int = 10):
        pipeline = [
            {"$match": {
                "shipment.provider": "NOVAPOSHTA",
                "shipment.created_at": {"$gte": date_from, "$lte": date_to}
            }},
            {"$group": {
                "_id": {"city": "$shipping.city"},
                "count": {"$sum": 1}
            }},
            {"$sort": {"count": -1}},
            {"$limit": limit}
        ]
        return await self.orders.aggregate(pipeline).to_list(length=limit)

    async def sla_paid_to_ttn(self, date_from: str, date_to: str):
        pipeline = [
            {"$match": {
                "shipment.provider": "NOVAPOSHTA",
                "shipment.created_at": {"$gte": date_from, "$lte": date_to},
                "payment.paid_at": {"$exists": True},
            }},
            {"$project": {
                "order_id": "$id",
                "paid_at": "$payment.paid_at",
                "ttn_at": "$shipment.created_at",
            }},
        ]
        return await self.orders.aggregate(pipeline).to_list(length=5000)
