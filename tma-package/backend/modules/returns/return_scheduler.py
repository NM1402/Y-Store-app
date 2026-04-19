"""
O20.3: Return Engine Scheduler
Runs return detection periodically
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from modules.returns.return_engine import ReturnEngine
import logging

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


def start_return_scheduler(db, np_client=None):
    """Start the return management scheduler"""
    engine = ReturnEngine(db, np_client=np_client)

    async def job():
        try:
            result = await engine.run_once(limit=500)
            if result.get("detected", 0) > 0:
                logger.info(f"Return engine: {result}")
        except Exception as e:
            logger.error(f"Return engine error: {e}")

    # Run every 20 minutes
    scheduler.add_job(job, "interval", minutes=20, id="return_engine", replace_existing=True)
    scheduler.start()
    logger.info("Return engine scheduler started (every 20 min)")
