"""
O17: Timeline Routes
"""
from fastapi import APIRouter, Depends
from core.db import db
from core.security import get_current_admin
from modules.timeline.timeline_service import TimelineService

router = APIRouter(prefix="/timeline", tags=["Timeline"])


@router.get("/{user_id}")
async def get_timeline(user_id: str, limit: int = 100, current_user: dict = Depends(get_current_admin)):
    """Get customer event timeline"""
    svc = TimelineService(db)
    events = await svc.get_customer_timeline(user_id, limit)
    return {"events": events, "count": len(events)}
