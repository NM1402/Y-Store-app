"""
D-Mode: Payment Retry Routes
"""
from fastapi import APIRouter, Depends
from core.db import db
from core.security import get_current_admin
from modules.payments.retry.retry_service import PaymentRetryService

router = APIRouter(prefix="/api/v2/admin/payments/retry", tags=["Payment Retry"])


@router.post("/run")
async def retry_run(
    limit: int = 500,
    admin: dict = Depends(get_current_admin)
):
    """Manually trigger payment retry processing"""
    svc = PaymentRetryService(db)
    return await svc.run_once(limit=limit)


@router.get("/stats")
async def retry_stats(admin: dict = Depends(get_current_admin)):
    """Get retry statistics"""
    from datetime import datetime, timezone, timedelta
    
    since_24h = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    
    # Reminders sent
    sent = await db["notifications_outbox"].count_documents({
        "dedupe_key": {"$regex": r"^outbox:payretry:"},
        "created_at": {"$gte": since_24h}
    })
    
    # Auto-cancelled
    cancelled = await db["orders"].count_documents({
        "status": "CANCELLED_AUTO",
        "cancel_reason": "PAYMENT_TIMEOUT_24H",
        "cancelled_at": {"$gte": since_24h}
    })
    
    return {
        "reminders_sent_24h": sent,
        "auto_cancelled_24h": cancelled
    }
