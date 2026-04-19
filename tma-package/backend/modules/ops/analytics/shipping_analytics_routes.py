# O3: Shipping Analytics Routes
from fastapi import APIRouter, Depends, Query
from core.db import db
from core.security import get_current_admin
from .shipping_analytics_service import ShippingAnalyticsService

router = APIRouter(prefix="/shipping", tags=["Shipping Analytics"])

@router.get("/stats")
async def stats(
    from_: str = Query(alias="from"),
    to: str = Query(...),
    admin: dict = Depends(get_current_admin)
):
    return await ShippingAnalyticsService(db).stats_by_day(from_, to)

@router.get("/top-destinations")
async def top_destinations(
    from_: str = Query(alias="from"),
    to: str = Query(...),
    limit: int = 10,
    admin: dict = Depends(get_current_admin)
):
    return await ShippingAnalyticsService(db).top_destinations(from_, to, limit)

@router.get("/sla")
async def sla(
    from_: str = Query(alias="from"),
    to: str = Query(...),
    admin: dict = Depends(get_current_admin)
):
    return await ShippingAnalyticsService(db).sla_paid_to_ttn(from_, to)
