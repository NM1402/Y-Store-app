"""
O16: Risk Routes - Customer Risk Score Engine
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from core.db import db
from core.security import get_current_admin
from modules.risk.risk_service import RiskService
from modules.bot.bot_settings_repo import BotSettingsRepo
from modules.guard.guard_repo import GuardRepo
from modules.bot.bot_alerts_repo import BotAlertsRepo
from datetime import datetime, timezone

router = APIRouter(prefix="/risk", tags=["Risk"])


def utcnow():
    return datetime.now(timezone.utc).isoformat()


def _get_risk_service():
    return RiskService(
        db,
        settings_repo=BotSettingsRepo(db),
        guard_repo=GuardRepo(db),
        alerts_repo=BotAlertsRepo(db),
    )


@router.get("/customers")
async def get_risk_customers(
    band: str = Query(None, description="Filter by band: LOW, WATCH, RISK"),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_admin)
):
    """Get customers with risk scores"""
    query = {"risk.score": {"$exists": True}}
    if band:
        query["risk.band"] = band.upper()
    
    customers = await db["users"].find(
        query,
        {"_id": 0, "id": 1, "email": 1, "phone": 1, "full_name": 1, "risk": 1, "created_at": 1}
    ).sort("risk.score", -1).limit(limit).to_list(limit)
    
    return {"customers": customers, "total": len(customers)}


@router.get("/customer/{user_id}")
async def get_customer_risk(user_id: str, current_user: dict = Depends(get_current_admin)):
    """Get detailed risk info for a customer"""
    user = await db["users"].find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get recent orders
    orders = await db["orders"].find(
        {"buyer_id": user_id},
        {"_id": 0, "id": 1, "status": 1, "payment_status": 1, "totals": 1, "created_at": 1}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "user": user,
        "risk": user.get("risk"),
        "risk_override": user.get("risk_override"),
        "recent_orders": orders
    }


@router.post("/recalc/{user_id}")
async def recalc_risk(user_id: str, current_user: dict = Depends(get_current_admin)):
    """Recalculate risk score for user"""
    svc = _get_risk_service()
    rr = await svc.apply_to_user(user_id)
    return {"ok": True, "risk": rr}


@router.post("/recalc-all")
async def recalc_all_risks(
    limit: int = Query(100, ge=1, le=1000),
    current_user: dict = Depends(get_current_admin)
):
    """Recalculate risk scores for all active users"""
    svc = _get_risk_service()
    
    # Get users with recent activity
    users = await db["users"].find(
        {},
        {"_id": 0, "id": 1}
    ).limit(limit).to_list(limit)
    
    updated = 0
    for u in users:
        try:
            await svc.apply_to_user(u["id"])
            updated += 1
        except Exception:
            pass
    
    return {"ok": True, "updated": updated}


@router.post("/override/{user_id}")
async def override_risk(user_id: str, body: dict, current_user: dict = Depends(get_current_admin)):
    """Override risk score manually"""
    score = int(body.get("score", 0))
    until = body.get("until")  # optional expiry
    reason = body.get("reason", "Manual override")
    
    await db["users"].update_one(
        {"id": user_id},
        {"$set": {
            "risk_override": {
                "score": score,
                "until": until,
                "reason": reason,
                "by": current_user.get("id"),
                "at": utcnow()
            }
        }}
    )
    return {"ok": True}


@router.delete("/override/{user_id}")
async def clear_override(user_id: str, current_user: dict = Depends(get_current_admin)):
    """Clear risk override"""
    await db["users"].update_one({"id": user_id}, {"$set": {"risk_override": None}})
    return {"ok": True}


@router.get("/distribution")
async def risk_distribution(current_user: dict = Depends(get_current_admin)):
    """Get risk band distribution"""
    pipeline = [
        {"$match": {"risk.score": {"$exists": True}}},
        {"$group": {"_id": "$risk.band", "count": {"$sum": 1}}},
    ]
    rows = await db["users"].aggregate(pipeline).to_list(10)
    
    # Get average scores per band
    avg_pipeline = [
        {"$match": {"risk.score": {"$exists": True}}},
        {"$group": {
            "_id": "$risk.band",
            "avg_score": {"$avg": "$risk.score"},
            "max_score": {"$max": "$risk.score"},
            "min_score": {"$min": "$risk.score"}
        }}
    ]
    avg_rows = await db["users"].aggregate(avg_pipeline).to_list(10)
    
    distribution = {r["_id"]: r["count"] for r in rows if r.get("_id")}
    stats = {r["_id"]: {
        "avg": round(r["avg_score"], 1),
        "max": r["max_score"],
        "min": r["min_score"]
    } for r in avg_rows if r.get("_id")}
    
    return {"distribution": distribution, "stats": stats}


@router.get("/summary")
async def risk_summary(current_user: dict = Depends(get_current_admin)):
    """Get risk summary for dashboard"""
    total_users = await db["users"].count_documents({})
    scored_users = await db["users"].count_documents({"risk.score": {"$exists": True}})
    
    high_risk = await db["users"].count_documents({"risk.band": "RISK"})
    watch_users = await db["users"].count_documents({"risk.band": "WATCH"})
    low_risk = await db["users"].count_documents({"risk.band": "LOW"})
    
    # Recent high-risk users
    recent_high = await db["users"].find(
        {"risk.band": "RISK"},
        {"_id": 0, "id": 1, "email": 1, "full_name": 1, "risk": 1}
    ).sort("risk.updated_at", -1).limit(5).to_list(5)
    
    return {
        "total_users": total_users,
        "scored_users": scored_users,
        "coverage_rate": round(scored_users / total_users, 4) if total_users > 0 else 0,
        "distribution": {
            "RISK": high_risk,
            "WATCH": watch_users,
            "LOW": low_risk
        },
        "recent_high_risk": recent_high
    }
