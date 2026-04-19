"""
O18: Analytics Routes
"""
from fastapi import APIRouter, Depends
from core.db import db
from core.security import get_current_admin
from modules.analytics_intel.analytics_engine import AnalyticsEngine
from modules.analytics_intel.analytics_repo import AnalyticsRepo
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/ops-kpi")
async def ops_kpi(range: int = 30, current_user: dict = Depends(get_current_admin)):
    """Get operational KPI for date range"""
    eng = AnalyticsEngine(db)
    return await eng.build_range_live(int(range))


@router.get("/cohorts")
async def cohorts(months: int = 12, current_user: dict = Depends(get_current_admin)):
    """Get cohort analytics"""
    repo = AnalyticsRepo(db)
    await repo.ensure_indexes()
    return {"items": await repo.get_cohorts(int(months))}


@router.post("/daily/rebuild")
async def rebuild_daily(body: dict, current_user: dict = Depends(get_current_admin)):
    """Rebuild daily snapshots for N days"""
    days = int(body.get("days", 30))
    eng = AnalyticsEngine(db)
    now = datetime.now(timezone.utc)
    results = []
    for i in range(days):
        d = now - timedelta(days=i)
        try:
            result = await eng.build_daily(d)
            results.append(result)
        except Exception as e:
            results.append({"day": d.date().isoformat(), "error": str(e)})
    return {"ok": True, "rebuilt": len(results), "results": results[:5]}


@router.get("/revenue-trend")
async def revenue_trend(days: int = 30, current_user: dict = Depends(get_current_admin)):
    """Get revenue trend by day"""
    repo = AnalyticsRepo(db)
    end = datetime.now(timezone.utc).date()
    start = end - timedelta(days=days - 1)
    data = await repo.get_daily_range(start.isoformat(), end.isoformat())
    return {"days": days, "data": [{"day": d["day"], "revenue": d.get("revenue", 0), "orders": d.get("orders", 0)} for d in data]}


@router.get("/risk-distribution")
async def risk_distribution(current_user: dict = Depends(get_current_admin)):
    """Get current risk band distribution"""
    pipeline = [
        {"$match": {"risk.score": {"$exists": True}}},
        {"$group": {"_id": "$risk.band", "count": {"$sum": 1}}},
    ]
    rows = await db["users"].aggregate(pipeline).to_list(10)
    return {"distribution": {r["_id"]: r["count"] for r in rows if r.get("_id")}}
