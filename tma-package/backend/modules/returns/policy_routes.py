"""
O20.5 & O20.6: Return Policy API Routes
Policy engine control, approvals, manual overrides
"""
from fastapi import APIRouter, Depends, Query, Body
from typing import Optional
from datetime import datetime, timezone
from core.db import db
from core.security import get_current_admin
from modules.returns.policy_engine import ReturnPolicyEngine
from modules.returns.policy_repo import PolicyRepo
from modules.returns.policy_types import PolicyDecision

router = APIRouter(prefix="/policy", tags=["Return Policy"])


@router.post("/run")
async def run_policy_engine(
    limit: int = Query(default=500, le=1000),
    admin: dict = Depends(get_current_admin)
):
    """
    Manually trigger policy engine run.
    Scans customers/cities and generates policy decisions.
    """
    engine = ReturnPolicyEngine(db)
    return await engine.run_once(limit_customers=limit)


@router.get("/pending")
async def get_pending_approvals(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, le=200),
    admin: dict = Depends(get_current_admin)
):
    """Get pending policy approvals"""
    repo = PolicyRepo(db)
    items = await repo.get_approval_queue(status="PENDING", skip=skip, limit=limit)
    total = await db["policy_actions_queue"].count_documents({"status": "PENDING"})
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/history")
async def get_policy_history(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, le=200),
    admin: dict = Depends(get_current_admin)
):
    """Get approved/rejected policy actions history"""
    repo = PolicyRepo(db)
    items = await repo.get_policy_history(skip=skip, limit=limit)
    total = await db["policy_actions_queue"].count_documents(
        {"status": {"$in": ["APPROVED", "REJECTED"]}}
    )
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/cities")
async def get_city_policies(admin: dict = Depends(get_current_admin)):
    """Get all city policies"""
    repo = PolicyRepo(db)
    items = await repo.get_city_policies()
    return {"items": items}


@router.post("/approve")
async def approve_policy_action(
    dedupe_key: str = Body(..., embed=True),
    admin: dict = Depends(get_current_admin)
):
    """Approve a pending policy action and apply it"""
    repo = PolicyRepo(db)
    engine = ReturnPolicyEngine(db)
    
    # Get the action
    action = await repo.get_action(dedupe_key)
    if not action:
        return {"ok": False, "error": "Action not found"}
    
    if action.get("status") != "PENDING":
        return {"ok": False, "error": f"Action already {action.get('status')}"}
    
    # Mark as approved
    admin_id = admin.get("email") or admin.get("id") or "admin"
    ok = await repo.approve_action(dedupe_key, approved_by=admin_id)
    if not ok:
        return {"ok": False, "error": "Failed to approve"}
    
    # Apply the decision
    decision_data = action.get("decision", {})
    decision = PolicyDecision(**decision_data)
    await engine.apply_decision(decision, updated_by=admin_id)
    
    return {"ok": True, "action": decision.action, "target": decision.target_id}


@router.post("/reject")
async def reject_policy_action(
    dedupe_key: str = Body(..., embed=True),
    admin: dict = Depends(get_current_admin)
):
    """Reject a pending policy action"""
    repo = PolicyRepo(db)
    
    admin_id = admin.get("email") or admin.get("id") or "admin"
    ok = await repo.reject_action(dedupe_key, rejected_by=admin_id)
    
    if not ok:
        return {"ok": False, "error": "Action not found or already processed"}
    
    return {"ok": True}


@router.post("/manual")
async def manual_policy_action(
    target_type: str = Body(..., description="CUSTOMER or CITY"),
    target_id: str = Body(..., description="Phone or city name"),
    action: str = Body(..., description="BLOCK_COD_CUSTOMER, UNBLOCK_COD_CUSTOMER, etc"),
    reason: Optional[str] = Body(default="MANUAL_OVERRIDE"),
    admin: dict = Depends(get_current_admin)
):
    """
    Manually apply policy action without approval queue.
    Actions: BLOCK_COD_CUSTOMER, UNBLOCK_COD_CUSTOMER, REQUIRE_PREPAID_CUSTOMER, REQUIRE_PREPAID_CITY
    """
    engine = ReturnPolicyEngine(db)
    admin_id = admin.get("email") or admin.get("id") or "admin"
    
    decision = PolicyDecision(
        action=action,
        target_type=target_type,
        target_id=target_id,
        reason=reason,
        meta={"manual": True, "by": admin_id},
        severity="HIGH",
        requires_approval=False,
        dedupe_key=f"manual:{target_type}:{target_id}:{action}:{datetime.now(timezone.utc).isoformat()}"
    )
    
    await engine.apply_decision(decision, updated_by=admin_id)
    
    return {"ok": True, "action": action, "target": target_id}


@router.get("/customer/{phone}")
async def get_customer_policy(
    phone: str,
    admin: dict = Depends(get_current_admin)
):
    """Get customer policy and return stats"""
    customer = await db["customers"].find_one({"phone": phone}, {"_id": 0})
    
    if not customer:
        customer = {"phone": phone, "policy": {}}
    
    # Get metrics
    engine = ReturnPolicyEngine(db)
    metrics = await engine._customer_window_metrics(phone)
    
    return {
        "phone": phone,
        "policy": customer.get("policy", {}),
        "segment": customer.get("segment"),
        "counters": customer.get("counters", {}),
        "metrics": metrics
    }


@router.delete("/city/{city}")
async def remove_city_policy(
    city: str,
    admin: dict = Depends(get_current_admin)
):
    """Remove city policy (unblock prepaid requirement)"""
    admin_id = admin.get("email") or admin.get("id") or "admin"
    
    result = await db["city_policies"].update_one(
        {"city": city},
        {"$set": {
            "require_prepaid": False,
            "removed_at": datetime.now(timezone.utc).isoformat(),
            "removed_by": admin_id
        }}
    )
    
    return {"ok": result.modified_count > 0, "city": city}
