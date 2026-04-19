"""
Guard + Analytics Scheduler
Runs guard engine and analytics daily snapshots
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timezone, timedelta
import logging

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


def start_guard_scheduler(db):
    """Start guard and analytics background jobs"""
    from modules.guard.guard_engine import GuardEngine
    from modules.analytics_intel.analytics_engine import AnalyticsEngine
    
    guard_engine = GuardEngine(db)
    analytics_engine = AnalyticsEngine(db)
    
    async def guard_job():
        """Run guard checks every 10 minutes"""
        try:
            result = await guard_engine.run_once()
            logger.info(f"Guard engine completed: {result}")
        except Exception as e:
            logger.error(f"Guard engine failed: {e}")
    
    async def analytics_daily_job():
        """Build daily analytics snapshot at 02:10 UTC"""
        try:
            now = datetime.now(timezone.utc)
            yesterday = now - timedelta(days=1)
            result = await analytics_engine.build_daily(yesterday)
            logger.info(f"Analytics daily completed: {result}")
        except Exception as e:
            logger.error(f"Analytics daily failed: {e}")
    
    # Guard checks every 10 minutes
    scheduler.add_job(guard_job, "interval", minutes=10, id="guard_engine", replace_existing=True)
    
    # Daily analytics at 02:10 UTC
    scheduler.add_job(analytics_daily_job, "cron", hour=2, minute=10, id="analytics_daily", replace_existing=True)
    
    scheduler.start()
    logger.info("Guard + Analytics scheduler started")
