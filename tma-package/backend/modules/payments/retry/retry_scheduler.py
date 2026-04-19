"""
D-Mode: Payment Retry Scheduler
Runs retry service every 5 minutes
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from modules.payments.retry.retry_service import PaymentRetryService
import logging

logger = logging.getLogger(__name__)
retry_scheduler = AsyncIOScheduler()


def start_payment_retry_scheduler(db):
    """Start the payment retry scheduler"""
    svc = PaymentRetryService(db)

    async def job():
        try:
            result = await svc.run_once(limit=500)
            if result.get("enqueued", 0) > 0 or result.get("cancelled", 0) > 0:
                logger.info(f"Payment retry: {result}")
        except Exception as e:
            logger.error(f"Payment retry error: {e}")

    retry_scheduler.add_job(job, "interval", minutes=5, id="payment_retry_flow", replace_existing=True)
    retry_scheduler.start()
    logger.info("Payment retry scheduler started (every 5 min)")
