# O5: Finance Routes
from fastapi import APIRouter, Depends, Query
from core.db import db
from core.security import get_current_admin
from .finance_service import FinanceService

router = APIRouter(prefix="/finance", tags=["Finance"])

@router.get("/summary")
async def summary(
    from_: str = Query(alias="from"),
    to: str = Query(...),
    admin: dict = Depends(get_current_admin)
):
    return await FinanceService(db).summary(from_, to)

@router.get("/daily")
async def daily(
    from_: str = Query(alias="from"),
    to: str = Query(...),
    admin: dict = Depends(get_current_admin)
):
    return await FinanceService(db).daily(from_, to)

@router.get("/payment-methods")
async def payment_methods(
    from_: str = Query(alias="from"),
    to: str = Query(...),
    admin: dict = Depends(get_current_admin)
):
    return await FinanceService(db).payment_methods(from_, to)
