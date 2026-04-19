"""
O14: Guard Routes - Runbook API for bot buttons
"""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone, timedelta
from core.db import db
from core.security import get_current_admin

router = APIRouter(prefix="/guard", tags=["Guard"])


def utcnow():
    return datetime.now(timezone.utc)


@router.get("/incidents")
async def list_incidents(current_user: dict = Depends(get_current_admin)):
    """List open/muted incidents"""
    items = await db["guard_incidents"].find(
        {"status": {"$in": ["OPEN", "MUTED"]}},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    return {"items": items}


@router.get("/incident/{key}")
async def get_incident(key: str, current_user: dict = Depends(get_current_admin)):
    """Get single incident"""
    doc = await db["guard_incidents"].find_one({"key": key}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return doc


@router.post("/incident/{key}/mute")
async def mute_incident(key: str, body: dict, current_user: dict = Depends(get_current_admin)):
    """Mute incident for N hours"""
    hours = int(body.get("hours", 1))
    until = utcnow() + timedelta(hours=hours)
    await db["guard_incidents"].update_one(
        {"key": key},
        {"$set": {"status": "MUTED", "muted_until": until.isoformat(), "updated_at": utcnow().isoformat()}}
    )
    return {"ok": True, "muted_until": until.isoformat()}


@router.post("/incident/{key}/resolve")
async def resolve_incident(key: str, current_user: dict = Depends(get_current_admin)):
    """Resolve/close incident"""
    await db["guard_incidents"].update_one(
        {"key": key},
        {"$set": {"status": "RESOLVED", "resolved_at": utcnow().isoformat(), "updated_at": utcnow().isoformat()}}
    )
    return {"ok": True}


@router.post("/customer/{user_id}/tag")
async def tag_customer(user_id: str, body: dict, current_user: dict = Depends(get_current_admin)):
    """Add tag to customer"""
    tag = body.get("tag", "FRAUD_SUSPECT")
    await db["user_tags"].update_one(
        {"user_id": user_id},
        {"$addToSet": {"tags": tag}, "$set": {"updated_at": utcnow().isoformat()}},
        upsert=True
    )
    doc = await db["user_tags"].find_one({"user_id": user_id}, {"_id": 0})
    return {"ok": True, "tags": doc.get("tags", [])}


@router.post("/customer/{user_id}/block")
async def block_customer(user_id: str, body: dict, current_user: dict = Depends(get_current_admin)):
    """Block/unblock customer"""
    blocked = bool(body.get("blocked", True))
    await db["users"].update_one(
        {"id": user_id},
        {"$set": {"is_blocked": blocked, "blocked_at": utcnow().isoformat() if blocked else None}}
    )
    return {"ok": True, "blocked": blocked}
