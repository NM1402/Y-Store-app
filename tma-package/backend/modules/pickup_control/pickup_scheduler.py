"""
O20: Pickup Control Scheduler - Background job
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import logging

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


def start_pickup_control_scheduler(db, np_service=None):
    """Start pickup control background job (every 30 minutes)"""
    from modules.pickup_control.pickup_engine import PickupControlEngine
    
    engine = PickupControlEngine(db, np_service=np_service)

    async def job():
        try:
            result = await engine.run_once(limit=500)
            if result.get("sent", 0) > 0 or result.get("high_risk_count", 0) > 0:
                logger.info(f"Pickup control job: {result}")
        except Exception as e:
            logger.error(f"Pickup control job error: {e}")

    scheduler.add_job(
        job, 
        "interval", 
        minutes=30, 
        id="pickup_control_engine", 
        replace_existing=True
    )
    scheduler.start()
    logger.info("Pickup control scheduler started (every 30 min)")
