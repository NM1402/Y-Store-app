# O1+O2+O9+O11: Jobs Scheduler
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import logging

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

def start_jobs_scheduler(db):
    """Start all background jobs"""
    
    # O1: Tracking sync every 15 minutes
    async def tracking_job():
        try:
            from modules.delivery.np.np_tracking_service import NPTrackingService
            service = NPTrackingService(db)
            result = await service.sync_all()
            logger.info(f"Tracking job: {result}")
        except Exception as e:
            logger.error(f"Tracking job error: {e}")

    scheduler.add_job(
        tracking_job,
        "interval",
        minutes=15,
        id="np_tracking_sync",
        replace_existing=True
    )

    # O2: Notifications worker every 30 seconds
    async def notifications_job():
        try:
            from modules.notifications.notifications_service import NotificationsService
            service = NotificationsService(db)
            await service.init()
            result = await service.process_queue_once(100)
            if result["processed"] > 0 or result["failed"] > 0:
                logger.info(f"Notifications job: {result}")
        except Exception as e:
            logger.error(f"Notifications job error: {e}")

    scheduler.add_job(
        notifications_job,
        "interval",
        seconds=30,
        id="notifications_worker",
        replace_existing=True
    )

    # O9: Admin alerts worker every 15 seconds (for FastAPI process fallback)
    # Note: Main alerts processing is in bot process, this is backup
    async def alerts_fallback_job():
        try:
            import os
            token = os.getenv("TELEGRAM_BOT_TOKEN")
            if not token:
                return
            
            from modules.bot.alerts_worker import AlertsWorker
            worker = AlertsWorker(db, token)
            await worker.init()
            result = await worker.process_once()
            if result.get("sent", 0) > 0:
                logger.info(f"Alerts fallback job: {result}")
        except Exception as e:
            logger.error(f"Alerts fallback job error: {e}")

    scheduler.add_job(
        alerts_fallback_job,
        "interval",
        seconds=15,
        id="alerts_fallback",
        replace_existing=True
    )

    # O11: Automation engine every 10 minutes
    async def automation_job():
        try:
            from modules.automation.automation_engine import AutomationEngine
            engine = AutomationEngine(db)
            await engine.init()
            result = await engine.run_once()
            if not result.get("skipped"):
                logger.info(f"Automation job: {result}")
        except Exception as e:
            logger.error(f"Automation job error: {e}")

    scheduler.add_job(
        automation_job,
        "interval",
        minutes=10,
        id="automation_engine",
        replace_existing=True
    )

    scheduler.start()
    logger.info("Jobs scheduler started: tracking (15min), notifications (30s), alerts (15s), automation (10min)")
    
    # O13-O18: Start Guard + Analytics scheduler
    try:
        from modules.jobs.guard_scheduler import start_guard_scheduler
        start_guard_scheduler(db)
        logger.info("Guard + Analytics scheduler started: guard (10min), analytics daily (02:10 UTC)")
    except Exception as e:
        logger.error(f"Guard scheduler failed to start: {e}")

    # O20: Start Pickup Control scheduler
    try:
        from modules.pickup_control.pickup_scheduler import start_pickup_control_scheduler
        start_pickup_control_scheduler(db, np_service=None)
        logger.info("Pickup Control scheduler started (every 30 min)")
    except Exception as e:
        logger.error(f"Pickup Control scheduler failed to start: {e}")
