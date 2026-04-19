"""
O9: Alerts Worker - processes admin_alerts_queue and sends to Telegram
"""
import logging
from motor.motor_asyncio import AsyncIOMotorDatabase

from .bot_settings_repo import BotSettingsRepo
from .bot_alerts_repo import BotAlertsRepo
from .telegram_sender import TelegramSender

logger = logging.getLogger(__name__)


class AlertsWorker:
    def __init__(self, db: AsyncIOMotorDatabase, token: str):
        self.db = db
        self.settings_repo = BotSettingsRepo(db)
        self.alerts_repo = BotAlertsRepo(db)
        self.sender = TelegramSender(token)

    async def init(self):
        """Initialize indexes"""
        await self.alerts_repo.ensure_indexes()

    async def process_once(self) -> dict:
        """Process pending alerts once"""
        settings = await self.settings_repo.get()
        
        if not settings.get("enabled", True):
            return {"skipped": True, "reason": "bot_disabled"}
        
        chat_ids = settings.get("admin_chat_ids", [])
        if not chat_ids:
            return {"skipped": True, "reason": "no_chat_ids"}
        
        alerts = await self.alerts_repo.pick(50)
        
        sent = 0
        failed = 0
        
        for alert in alerts:
            alert_type = alert.get("type", "")
            
            # Check if this alert type is enabled
            alerts_config = settings.get("alerts", {})
            if not alerts_config.get(alert_type, True):
                # Mark as sent (skipped) if alert type is disabled
                await self.alerts_repo.mark_sent(alert["id"], {"skipped": True})
                continue
            
            try:
                text = alert.get("text", f"{alert_type}: {alert.get('payload', {})}")
                reply_markup = alert.get("reply_markup")
                
                # Send to all admin chats
                for chat_id in chat_ids:
                    await self.sender.send_message(
                        chat_id=chat_id,
                        text=text,
                        reply_markup=reply_markup
                    )
                
                await self.alerts_repo.mark_sent(alert["id"], {"chats": chat_ids})
                sent += 1
                logger.info(f"✅ Alert sent: {alert_type} to {len(chat_ids)} chats")
                
            except Exception as e:
                attempts = int(alert.get("attempts", 0)) + 1
                next_retry = self.alerts_repo.backoff(attempts)
                
                await self.alerts_repo.mark_failed(
                    alert["id"],
                    str(e)[:500],
                    attempts,
                    next_retry
                )
                failed += 1
                logger.error(f"❌ Alert failed: {alert_type} - {e}")
        
        return {"processed": len(alerts), "sent": sent, "failed": failed}
