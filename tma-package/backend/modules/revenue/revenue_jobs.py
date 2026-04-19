"""
Revenue Jobs - Scheduled tasks for ROE
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import logging

logger = logging.getLogger(__name__)

_scheduler = None


def get_revenue_scheduler():
    global _scheduler
    if _scheduler is None:
        _scheduler = AsyncIOScheduler()
    return _scheduler


def start_revenue_jobs(db, notifier=None):
    """Start ROE scheduled jobs"""
    from .revenue_snapshot_service import RevenueSnapshotService
    from .revenue_optimizer_service import RevenueOptimizerService
    from .revenue_rollback_service import RevenueRollbackService

    scheduler = get_revenue_scheduler()
    
    snapshot_svc = RevenueSnapshotService(db)
    optimizer_svc = RevenueOptimizerService(db, notifier)
    rollback_svc = RevenueRollbackService(db, notifier)

    async def optimize_job():
        """Run every 6 hours: snapshot + suggestion"""
        try:
            snap = await snapshot_svc.build_snapshot(7)
            await optimizer_svc.make_suggestion(snap)
            logger.info("ROE optimize job completed")
        except Exception as e:
            logger.error(f"ROE optimize job failed: {e}")

    async def rollback_job():
        """Run every 30 minutes: check for rollback"""
        try:
            result = await rollback_svc.evaluate_and_rollback()
            if result.get("rolled_back", 0) > 0:
                logger.warning(f"ROE rollback job: {result['rolled_back']} rolled back")
        except Exception as e:
            logger.error(f"ROE rollback job failed: {e}")

    # Schedule jobs
    scheduler.add_job(
        optimize_job,
        "interval",
        hours=6,
        id="roe_optimize",
        replace_existing=True
    )
    
    scheduler.add_job(
        rollback_job,
        "interval",
        minutes=30,
        id="roe_rollback_watch",
        replace_existing=True
    )

    if not scheduler.running:
        scheduler.start()
    
    logger.info("ROE jobs scheduler started: optimize (6h), rollback (30min)")


def stop_revenue_jobs():
    """Stop ROE scheduler"""
    scheduler = get_revenue_scheduler()
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("ROE jobs scheduler stopped")
