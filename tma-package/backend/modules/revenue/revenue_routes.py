"""
Revenue Routes - API endpoints for ROE
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from core.db import db
from core.security import get_current_admin

from .revenue_settings import get_settings, patch_settings, get_system_config, patch_system_config
from .revenue_snapshot_service import RevenueSnapshotService
from .revenue_optimizer_service import RevenueOptimizerService
from .revenue_rollback_service import RevenueRollbackService
from .revenue_impact_estimator import RevenueImpactEstimator

router = APIRouter(prefix="/revenue", tags=["Revenue Optimization"])


# === Settings ===

@router.get("/settings")
async def revenue_settings_get(current_user: dict = Depends(get_current_admin)):
    """Get ROE settings"""
    return await get_settings(db)


@router.patch("/settings")
async def revenue_settings_patch(
    body: dict,
    current_user: dict = Depends(get_current_admin)
):
    """Update ROE settings"""
    return await patch_settings(db, body)


@router.get("/config")
async def system_config_get(current_user: dict = Depends(get_current_admin)):
    """Get current system config (discount, deposit, thresholds)"""
    return await get_system_config(db)


@router.patch("/config")
async def system_config_patch(
    body: dict,
    current_user: dict = Depends(get_current_admin)
):
    """Manually update system config"""
    return await patch_system_config(db, body)


# === Snapshots ===

@router.post("/snapshot/run")
async def snapshot_run(
    body: dict = {},
    current_user: dict = Depends(get_current_admin)
):
    """Manually trigger a revenue snapshot"""
    days = int(body.get("range_days", 7))
    snap = await RevenueSnapshotService(db).build_snapshot(days)
    return {"ok": True, "snapshot": snap}


@router.get("/snapshots")
async def snapshots_list(
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_admin)
):
    """Get recent snapshots"""
    snaps = await RevenueSnapshotService(db).get_recent_snapshots(limit)
    return {"items": snaps}


# === Optimizer ===

@router.post("/optimize/run")
async def optimize_run(
    body: dict = {},
    current_user: dict = Depends(get_current_admin)
):
    """Run optimization: build snapshot + create suggestion if rules trigger"""
    days = int(body.get("range_days", 7))
    snap = await RevenueSnapshotService(db).build_snapshot(days)
    result = await RevenueOptimizerService(db).make_suggestion(snap)
    return {**result, "snapshot": snap}


@router.get("/suggestions")
async def suggestions_list(
    status: str = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_admin)
):
    """Get suggestions list"""
    query = {}
    if status:
        query["status"] = status.upper()
    
    cursor = db["revenue_suggestions"].find(query, {"_id": 0}).sort("ts", -1).limit(limit)
    items = await cursor.to_list(limit)
    return {"items": items}


@router.get("/suggestions/{sid}")
async def suggestion_get(
    sid: str,
    current_user: dict = Depends(get_current_admin)
):
    """Get single suggestion details"""
    doc = await db["revenue_suggestions"].find_one({"id": sid}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    return doc


@router.post("/suggestions/{sid}/approve")
async def suggestion_approve(
    sid: str,
    current_user: dict = Depends(get_current_admin)
):
    """Approve a pending suggestion"""
    actor = current_user.get("email") or current_user.get("id") or "ADMIN"
    return await RevenueOptimizerService(db).approve(sid, actor)


@router.post("/suggestions/{sid}/reject")
async def suggestion_reject(
    sid: str,
    body: dict = {},
    current_user: dict = Depends(get_current_admin)
):
    """Reject a suggestion"""
    actor = current_user.get("email") or current_user.get("id") or "ADMIN"
    reason = body.get("reason", "")
    return await RevenueOptimizerService(db).reject(sid, actor, reason)


@router.post("/suggestions/{sid}/apply")
async def suggestion_apply(
    sid: str,
    current_user: dict = Depends(get_current_admin)
):
    """Apply an approved/pending suggestion"""
    actor = current_user.get("email") or current_user.get("id") or "ADMIN"
    return await RevenueOptimizerService(db).apply(sid, actor)


# === Rollback ===

@router.post("/rollback/check")
async def rollback_check(current_user: dict = Depends(get_current_admin)):
    """Manually trigger rollback evaluation"""
    return await RevenueRollbackService(db).evaluate_and_rollback()


# === Impact Estimator ===

@router.post("/impact/estimate")
async def impact_estimate(
    body: dict,
    current_user: dict = Depends(get_current_admin)
):
    """Estimate impact of a discount change"""
    from_pct = float(body.get("from_pct", 1.0))
    to_pct = float(body.get("to_pct", 1.5))
    range_days = int(body.get("range_days", 7))
    
    return await RevenueImpactEstimator(db).estimate_discount_change(range_days, from_pct, to_pct)


# === Change Log ===

@router.get("/changelog")
async def changelog_list(
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_admin)
):
    """Get change log history"""
    cursor = db["revenue_change_log"].find({}, {"_id": 0}).sort("ts", -1).limit(limit)
    items = await cursor.to_list(limit)
    return {"items": items}
