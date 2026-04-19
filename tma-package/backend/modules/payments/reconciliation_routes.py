"""
D-Mode Step 6: Reconciliation Routes & Scheduler
"""
from fastapi import APIRouter, Depends
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from core.db import db
from core.security import get_current_admin
from modules.payments.reconciliation_service import PaymentReconciliationService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/admin/payments/reconciliation", tags=["Payment Reconciliation"])
recon_scheduler = AsyncIOScheduler()


@router.post("/run")
async def reconciliation_run(
    hours_back: int = 48,
    limit: int = 200,
    admin: dict = Depends(get_current_admin)
):
    """Manually trigger payment reconciliation"""
    svc = PaymentReconciliationService(db)
    return await svc.run_once(hours_back=hours_back, limit=limit)


@router.get("/logs")
async def reconciliation_logs(
    skip: int = 0,
    limit: int = 50,
    admin: dict = Depends(get_current_admin)
):
    """Get reconciliation error logs"""
    cursor = db["reconciliation_logs"].find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    logs = [x async for x in cursor]
    total = await db["reconciliation_logs"].count_documents({})
    return {"items": logs, "total": total}


def start_reconciliation_scheduler(db_instance):
    """Start reconciliation scheduler (every 10 min)"""
    svc = PaymentReconciliationService(db_instance)

    async def job():
        try:
            result = await svc.run_once(hours_back=48, limit=200)
            if result.get("fixed", 0) > 0:
                logger.info(f"Reconciliation: {result}")
        except Exception as e:
            logger.error(f"Reconciliation error: {e}")

    recon_scheduler.add_job(job, "interval", minutes=10, id="payment_reconciliation", replace_existing=True)
    recon_scheduler.start()
    logger.info("Payment reconciliation scheduler started (every 10 min)")
