"""
Payment Health Dashboard Routes
"""
from fastapi import APIRouter, Depends, Query
from core.db import db
from core.security import get_current_admin
from modules.payments.payment_health_service import PaymentHealthService

router = APIRouter(tags=["Payment Health"])


@router.get("/payments/health")
async def get_payment_health(
    range: int = Query(7, ge=1, le=90, description="Days range"),
    current_user: dict = Depends(get_current_admin)
):
    """
    Get payment health metrics:
    - Webhook success rate
    - Reconciliation fixes
    - Retry recovery rate
    - Deposit conversion
    - Prepaid conversion
    - Discount analytics
    """
    svc = PaymentHealthService(db)
    return await svc.get_health(range)
