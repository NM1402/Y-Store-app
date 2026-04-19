# O7: Ops Dashboard Routes
from fastapi import APIRouter, Depends, Query
from core.db import db
from core.security import get_current_admin
from .dashboard_service import OpsDashboardService

router = APIRouter(prefix="/ops", tags=["Ops Dashboard"])

@router.get("/dashboard")
async def dashboard(
    from_: str = Query(alias="from"),
    to: str = Query(...),
    admin: dict = Depends(get_current_admin)
):
    return await OpsDashboardService(db).build(from_, to)
