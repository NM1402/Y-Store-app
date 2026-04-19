"""
O18: Analytics Repository
"""
from datetime import datetime, timezone


def utcnow():
    return datetime.now(timezone.utc).isoformat()


class AnalyticsRepo:
    def __init__(self, db):
        self.db = db
        self.daily = db["analytics_daily"]
        self.cohorts = db["analytics_cohorts"]

    async def ensure_indexes(self):
        await self.daily.create_index("day", unique=True)
        await self.cohorts.create_index("month", unique=True)

    async def upsert_daily(self, day: str, doc: dict):
        await self.daily.update_one(
            {"day": day},
            {"$set": {"day": day, **doc, "updated_at": utcnow()},
             "$setOnInsert": {"created_at": utcnow()}},
            upsert=True
        )

    async def get_daily_range(self, start_day: str, end_day: str):
        cur = self.daily.find(
            {"day": {"$gte": start_day, "$lte": end_day}},
            {"_id": 0}
        ).sort("day", 1)
        return [x async for x in cur]

    async def upsert_cohort(self, month: str, doc: dict):
        await self.cohorts.update_one(
            {"month": month},
            {"$set": {"month": month, **doc, "updated_at": utcnow()},
             "$setOnInsert": {"created_at": utcnow()}},
            upsert=True
        )

    async def get_cohorts(self, months: int = 12):
        cur = self.cohorts.find({}, {"_id": 0}).sort("month", -1).limit(months)
        return [x async for x in cur]
