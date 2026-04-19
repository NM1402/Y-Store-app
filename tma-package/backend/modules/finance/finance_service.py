# O5: Finance Service
from motor.motor_asyncio import AsyncIOMotorDatabase

class FinanceService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.ledger = db["finance_ledger"]

    async def summary(self, date_from: str, date_to: str):
        pipeline = [
            {"$match": {"created_at": {"$gte": date_from, "$lte": date_to}}},
            {"$group": {
                "_id": {"type": "$type", "dir": "$direction"},
                "amount": {"$sum": "$amount"},
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id.type": 1}}
        ]
        rows = await self.ledger.aggregate(pipeline).to_list(length=200)

        by = {}
        for r in rows:
            k = f"{r['_id']['type']}:{r['_id']['dir']}"
            by[k] = {"amount": r["amount"], "count": r["count"]}

        revenue = by.get("SALE_IN:IN", {}).get("amount", 0) + by.get("COD_IN:IN", {}).get("amount", 0)
        refunds = by.get("REFUND_OUT:OUT", {}).get("amount", 0)
        ship_cost = by.get("SHIP_COST_OUT:OUT", {}).get("amount", 0)
        fees = by.get("PAYMENT_FEE_OUT:OUT", {}).get("amount", 0)

        net = revenue - refunds - ship_cost - fees

        return {
            "range": {"from": date_from, "to": date_to},
            "revenue": revenue,
            "refunds": refunds,
            "shipping_cost": ship_cost,
            "payment_fees": fees,
            "net": net,
            "breakdown": rows
        }

    async def daily(self, date_from: str, date_to: str):
        pipeline = [
            {"$match": {"created_at": {"$gte": date_from, "$lte": date_to}}},
            {"$addFields": {"day": {"$substr": ["$created_at", 0, 10]}}},
            {"$group": {
                "_id": {"day": "$day", "dir": "$direction"},
                "amount": {"$sum": "$amount"},
                "count": {"$sum": 1},
            }},
            {"$sort": {"_id.day": 1}}
        ]
        return await self.ledger.aggregate(pipeline).to_list(length=1000)

    async def payment_methods(self, date_from: str, date_to: str):
        pipeline = [
            {"$match": {"created_at": {"$gte": date_from, "$lte": date_to}, "direction": "IN"}},
            {"$group": {"_id": "$meta.method", "amount": {"$sum": "$amount"}, "count": {"$sum": 1}}},
            {"$sort": {"amount": -1}}
        ]
        return await self.ledger.aggregate(pipeline).to_list(length=50)
