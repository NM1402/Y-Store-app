"""
O12: Broadcast Wizard - Mass SMS/Email sending
"""
from motor.motor_asyncio import AsyncIOMotorDatabase
from aiogram import types
from datetime import datetime, timezone
import uuid
import logging

from ..bot_sessions_repo import BotSessionsRepo
from ..bot_audit_repo import BotAuditRepo
from ..bot_keyboards import (
    segment_kb,
    channel_kb,
    blast_confirm_kb,
    cancel_kb
)

logger = logging.getLogger(__name__)

# FSM States
STATE_BLAST_SEGMENT = "BLAST:SEGMENT"
STATE_BLAST_CHANNEL = "BLAST:CHANNEL"
STATE_BLAST_TEXT = "BLAST:TEXT"
STATE_BLAST_CONFIRM = "BLAST:CONFIRM"


class BroadcastWizard:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.sessions = BotSessionsRepo(db)
        self.audit = BotAuditRepo(db)
        self.customers = db["customers"]
        self.notif_queue = db["notification_queue"]

    async def start(self, callback: types.CallbackQuery):
        """Start broadcast wizard"""
        await self.sessions.set_state(callback.from_user.id, STATE_BLAST_SEGMENT, {})
        await self.audit.log(callback.from_user.id, "WIZ_BLAST_START")
        
        await callback.message.edit_text(
            "📣 <b>Майстер розсилки</b>\n\n"
            "Оберіть сегмент отримувачів:",
            reply_markup=segment_kb(),
            parse_mode="HTML"
        )
        await callback.answer()

    async def set_segment(self, callback: types.CallbackQuery, segment: str):
        """Set target segment"""
        session = await self.sessions.get(callback.from_user.id)
        
        if session.get("state") != STATE_BLAST_SEGMENT:
            await callback.answer()
            return
        
        # Count targets
        flt = {}
        if segment != "ALL":
            flt = {"$or": [{"segment": segment}, {"tags": segment}]}
        
        count = await self.customers.count_documents(flt)
        
        await self.sessions.set_state(
            callback.from_user.id,
            STATE_BLAST_CHANNEL,
            {"segment": segment, "targets": count}
        )
        
        await self.audit.log(callback.from_user.id, f"WIZ_BLAST_SEG:{segment}")
        
        await callback.message.edit_text(
            f"📣 Сегмент: <b>{segment}</b>\n"
            f"Отримувачів: <b>{count}</b>\n\n"
            f"Оберіть канал:",
            reply_markup=channel_kb(),
            parse_mode="HTML"
        )
        await callback.answer()

    async def set_channel(self, callback: types.CallbackQuery, channel: str):
        """Set channel (SMS/Email)"""
        session = await self.sessions.get(callback.from_user.id)
        
        if session.get("state") != STATE_BLAST_CHANNEL:
            await callback.answer()
            return
        
        data = session.get("data", {})
        data["channel"] = channel
        
        await self.sessions.set_state(
            callback.from_user.id,
            STATE_BLAST_TEXT,
            data
        )
        
        await self.audit.log(callback.from_user.id, f"WIZ_BLAST_CH:{channel}")
        
        await callback.message.edit_text(
            f"✍️ Надішліть текст повідомлення для <b>{data.get('segment')}</b> через <b>{channel}</b>.\n\n"
            f"Порада: робіть коротко, 1–2 речення.",
            reply_markup=cancel_kb(),
            parse_mode="HTML"
        )
        await callback.answer()

    async def handle_text(self, message: types.Message) -> bool:
        """Handle broadcast text input"""
        session = await self.sessions.get(message.from_user.id)
        
        if session.get("state") != STATE_BLAST_TEXT:
            return False
        
        text = (message.text or "").strip()
        
        if len(text) < 3:
            await message.answer(
                "❗ Текст занадто короткий. Надішліть нормальний текст.",
                reply_markup=cancel_kb(),
                parse_mode="HTML"
            )
            return True
        
        data = session.get("data", {})
        data["text"] = text
        segment = data.get("segment")
        channel = data.get("channel")
        targets = data.get("targets", 0)
        
        await self.sessions.set_state(
            message.from_user.id,
            STATE_BLAST_CONFIRM,
            data
        )
        
        preview = text if len(text) <= 300 else (text[:300] + "…")
        
        await message.answer(
            f"👀 <b>Попередній перегляд</b>\n\n"
            f"Сегмент: <b>{segment}</b>\n"
            f"Канал: <b>{channel}</b>\n"
            f"Отримувачів: <b>{targets}</b>\n\n"
            f"<b>Текст:</b>\n{preview}\n\n"
            f"Підтвердити розсилку?",
            reply_markup=blast_confirm_kb(),
            parse_mode="HTML"
        )
        return True

    async def confirm(self, callback: types.CallbackQuery):
        """Confirm and execute broadcast"""
        session = await self.sessions.get(callback.from_user.id)
        
        if session.get("state") != STATE_BLAST_CONFIRM:
            await callback.answer()
            return
        
        data = session.get("data", {})
        segment = data.get("segment")
        channel = data.get("channel")
        text = data.get("text")
        
        await self.audit.log(
            callback.from_user.id,
            f"WIZ_BLAST_CONFIRM:{segment}:{channel}"
        )
        
        # Build filter
        flt = {}
        if segment and segment != "ALL":
            flt = {"$or": [{"segment": segment}, {"tags": segment}]}
        
        # Get customers
        customers = await self.customers.find(flt, {"_id": 0}).limit(5000).to_list(5000)
        
        # Enqueue notifications
        now = datetime.now(timezone.utc).isoformat()
        inserted = 0
        
        for c in customers:
            to = c.get("phone") if channel == "SMS" else c.get("email")
            if not to:
                continue
            
            dedupe = f"BLAST:{now[:10]}:{segment}:{channel}:{to}"
            
            doc = {
                "id": str(uuid.uuid4()),
                "channel": channel,
                "to": to,
                "template": "MANUAL",
                "payload": {"text": text},
                "dedupe_key": dedupe,
                "status": "PENDING",
                "attempts": 0,
                "next_retry_at": None,
                "created_at": now,
                "updated_at": now,
            }
            
            try:
                await self.notif_queue.insert_one(doc)
                inserted += 1
            except Exception:
                pass  # Duplicate, skip
        
        await callback.message.edit_text(
            f"✅ <b>Розсилку поставлено в чергу!</b>\n\n"
            f"Сегмент: <b>{segment}</b>\n"
            f"Канал: <b>{channel}</b>\n"
            f"У черзі: <b>{inserted}</b> повідомлень",
            parse_mode="HTML"
        )
        
        await self.sessions.clear(callback.from_user.id)
        await callback.answer(f"✅ {inserted} повідомлень у черзі!")
