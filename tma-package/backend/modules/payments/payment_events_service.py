"""
Payment Events Service - Idempotent payment event handling
BLOCK V2-10
"""
from datetime import datetime, timezone
from core.db import db


async def is_event_seen(event_key: str) -> bool:
    """Check if payment event was already processed"""
    x = await db.payment_events.find_one({"event_key": event_key})
    return bool(x)


async def mark_event_seen(event_key: str, payload: dict):
    """Mark payment event as processed (idempotent)"""
    await db.payment_events.update_one(
        {"event_key": event_key},
        {
            "$setOnInsert": {
                "event_key": event_key,
                "payload": payload,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        },
        upsert=True,
    )
