"""
Revenue Settings - Configuration for ROE
"""
from datetime import datetime, timezone

def now_iso():
    return datetime.now(timezone.utc).isoformat()

DEFAULT_SETTINGS = {
    "id": "main",
    "mode": "SEMI_AUTO",  # SEMI_AUTO | FULL_AUTO | MANUAL
    "cooldown_hours": 24,
    "max_discount_step": 0.5,
    "max_deposit_step_uah": 50,
    "min_samples": 50,
    # Rollback guardrails
    "rollback_window_hours": 24,
    "rollback_paid_drop": 0.02,
    "rollback_margin_drop": 0.02,
    "rollback_return_rise": 0.02,
    # Impact estimator
    "impact_elasticity": 0.6,
    "impact_margin_rate": 0.18,
    "impact_return_penalty": 0.3,
    "updated_at": now_iso()
}


async def get_settings(db):
    doc = await db["revenue_settings"].find_one({"id": "main"}, {"_id": 0})
    if not doc:
        await db["revenue_settings"].insert_one(DEFAULT_SETTINGS.copy())
        return DEFAULT_SETTINGS.copy()
    return doc


async def patch_settings(db, patch: dict):
    patch["updated_at"] = now_iso()
    await db["revenue_settings"].update_one({"id": "main"}, {"$set": patch}, upsert=True)
    return await get_settings(db)


async def get_system_config(db):
    """Get current system config (discount, deposit, thresholds)"""
    doc = await db["system_settings"].find_one({"id": "main"}, {"_id": 0})
    if not doc:
        default = {
            "id": "main",
            "prepaid_discount_value": 1.0,
            "deposit_min_uah": 100,
            "risk_threshold_high": 70,
            "risk_threshold_watch": 40,
            "updated_at": now_iso()
        }
        await db["system_settings"].insert_one(default)
        return default
    return doc


async def patch_system_config(db, patch: dict):
    patch["updated_at"] = now_iso()
    await db["system_settings"].update_one({"id": "main"}, {"$set": patch}, upsert=True)
    return await get_system_config(db)
