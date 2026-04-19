"""
O20.5: Return Policy Engine - Scheduler
Runs policy engine periodically
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from modules.returns.policy_engine import ReturnPolicyEngine
import logging

logger = logging.getLogger(__name__)
policy_scheduler = AsyncIOScheduler()


def start_policy_scheduler(db):
    """Start the policy engine scheduler"""
    engine = ReturnPolicyEngine(db)

    async def job():
        try:
            result = await engine.run_once(limit_customers=500)
            if result.get("proposed", 0) > 0:
                logger.info(f"Policy engine: {result}")
        except Exception as e:
            logger.error(f"Policy engine error: {e}")

    # Run every 30 minutes
    policy_scheduler.add_job(job, "interval", minutes=30, id="policy_engine", replace_existing=True)
    policy_scheduler.start()
    logger.info("Policy engine scheduler started (every 30 min)")
