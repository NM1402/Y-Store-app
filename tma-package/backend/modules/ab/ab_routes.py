"""
A/B Test Routes - Admin API
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from core.db import db
from core.security import get_current_admin

from .ab_service import ABService
from .ab_report_service import ABReportService

router = APIRouter(prefix="/ab", tags=["A/B Tests"])


# === Experiments ===

@router.get("/experiments")
async def list_experiments(
    active_only: bool = Query(False),
    current_user: dict = Depends(get_current_admin)
):
    """List all A/B experiments"""
    return {"items": await ABService(db).list_experiments(active_only)}


@router.get("/experiments/{exp_id}")
async def get_experiment(
    exp_id: str,
    current_user: dict = Depends(get_current_admin)
):
    """Get experiment details"""
    exp = await ABService(db).get_experiment(exp_id)
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return exp


@router.post("/experiments")
async def create_experiment(
    body: dict,
    current_user: dict = Depends(get_current_admin)
):
    """Create or update an experiment"""
    required = ["id", "name", "variants"]
    for r in required:
        if r not in body:
            raise HTTPException(status_code=400, detail=f"Missing required field: {r}")
    
    body.setdefault("active", True)
    body.setdefault("unit", "phone")
    
    return await ABService(db).create_experiment(body)


@router.post("/experiments/{exp_id}/deactivate")
async def deactivate_experiment(
    exp_id: str,
    current_user: dict = Depends(get_current_admin)
):
    """Deactivate an experiment"""
    return await ABService(db).deactivate_experiment(exp_id)


@router.patch("/experiments/{exp_id}/weights")
async def update_weights(
    exp_id: str,
    body: dict,
    current_user: dict = Depends(get_current_admin)
):
    """Update variant weights"""
    weights = body.get("weights", {})
    return await ABService(db).update_weights(exp_id, weights)


# === Assignments ===

@router.get("/assignment")
async def get_assignment(
    exp_id: str = Query(...),
    phone: str = Query(None),
    user_id: str = Query(None),
    current_user: dict = Depends(get_current_admin)
):
    """Get or preview assignment for a unit"""
    unit = phone or user_id
    if not unit:
        raise HTTPException(status_code=400, detail="Provide phone or user_id")
    
    return await ABService(db).get_assignment(exp_id, unit)


# === Reports ===

@router.get("/report")
async def get_report(
    exp_id: str = Query(...),
    range: int = Query(14, ge=7, le=90, alias="range_days"),
    current_user: dict = Depends(get_current_admin)
):
    """Get A/B test report by variant"""
    return await ABReportService(db).report(exp_id, range)


@router.get("/summary")
async def get_summary(
    range: int = Query(14, ge=7, le=90, alias="range_days"),
    current_user: dict = Depends(get_current_admin)
):
    """Get summary of all active experiments"""
    return await ABReportService(db).summary_all_experiments(range)


# === Seed Default Experiment ===

@router.post("/seed/prepaid-discount")
async def seed_prepaid_discount(current_user: dict = Depends(get_current_admin)):
    """Seed the default prepaid discount A/B experiment"""
    exp = {
        "id": "prepaid_discount_v1",
        "active": True,
        "name": "Prepaid Discount Test",
        "unit": "phone",
        "variants": [
            {"key": "A", "discount_pct": 0.0, "weight": 34, "label": "Control (0%)"},
            {"key": "B", "discount_pct": 1.0, "weight": 33, "label": "1%"},
            {"key": "C", "discount_pct": 1.5, "weight": 33, "label": "1.5%"},
        ],
        "apply_to": "FULL_PREPAID",
        "description": "Test optimal prepaid discount: 0% vs 1% vs 1.5%"
    }
    
    await ABService(db).create_experiment(exp)
    return {"ok": True, "exp_id": exp["id"], "experiment": exp}
