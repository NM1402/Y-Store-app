# O2: Notifications Service
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from .notifications_repo import NotificationsRepo
from .providers.sms_turbosms import TurboSMSProvider
from .providers.email_smtp import SMTPEmailProvider
from .templates import render_sms, render_email_subject, render_email_body
import logging

logger = logging.getLogger(__name__)

def utcnow():
    return datetime.now(timezone.utc)

def iso(dt):
    return dt.isoformat()

def backoff(attempts: int) -> str:
    minutes = [1, 5, 15, 60, 240]
    m = minutes[min(attempts, len(minutes) - 1)]
    return iso(utcnow() + timedelta(minutes=m))

class NotificationsService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.repo = NotificationsRepo(db)
        self.sms = TurboSMSProvider()
        self.email = SMTPEmailProvider()

    async def init(self):
        await self.repo.ensure_indexes()

    async def process_queue_once(self, limit: int = 50):
        items = await self.repo.pick_pending(limit)
        processed = 0
        failed = 0

        for it in items:
            try:
                channel = it["channel"]
                ctx = it["payload"] or {}
                template = it["template"]
                to = it["to"]

                if channel == "SMS":
                    text = render_sms(template, ctx)
                    meta = await self.sms.send(to, text)
                else:
                    subject = render_email_subject(template, ctx)
                    body = render_email_body(template, ctx)
                    meta = await self.email.send(to, subject, body)

                await self.repo.mark_sent(it["id"], meta)
                processed += 1
                logger.info(f"Notification sent: {channel} to {to}")
            except Exception as e:
                attempts = int(it.get("attempts", 0)) + 1
                await self.repo.mark_failed(it["id"], str(e), attempts, backoff(attempts))
                failed += 1
                logger.error(f"Notification failed: {e}")

        return {"processed": processed, "failed": failed}

    async def queue_for_order_event(self, event_type: str, order: dict, payload: dict):
        """Queue notifications based on order event"""
        phone = order.get("shipping", {}).get("phone")
        email = order.get("shipping", {}).get("email") or order.get("user", {}).get("email")
        order_id = order.get("id", "")
        
        ctx = {**payload, "order_id": order_id}
        
        if phone:
            await self.repo.enqueue(
                channel="SMS",
                to=phone,
                template=event_type,
                payload=ctx,
                dedupe_key=f"{event_type}:{order_id}:SMS"
            )
        
        if email:
            await self.repo.enqueue(
                channel="EMAIL",
                to=email,
                template=event_type,
                payload=ctx,
                dedupe_key=f"{event_type}:{order_id}:EMAIL"
            )
