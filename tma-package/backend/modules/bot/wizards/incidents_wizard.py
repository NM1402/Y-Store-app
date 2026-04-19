"""
O12: Incidents Wizard - Handle operational issues
"""
from motor.motor_asyncio import AsyncIOMotorDatabase
from aiogram import types
from datetime import datetime, timezone, timedelta
import logging

from ..bot_sessions_repo import BotSessionsRepo
from ..bot_audit_repo import BotAuditRepo
from ..bot_actions_service import BotActionsService
from ..bot_keyboards import incident_actions_kb, cancel_kb

logger = logging.getLogger(__name__)

STATE_INC_ROOT = "INC:ROOT"
STATE_INC_ITEM = "INC:ITEM"


def fmt_money(x):
    try:
        return f"{float(x):,.2f}"
    except (ValueError, TypeError):
        return str(x)


class IncidentsWizard:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.sessions = BotSessionsRepo(db)
        self.audit = BotAuditRepo(db)
        self.actions = BotActionsService(db)
        self.orders = db["orders"]
        self.notifs = db["notification_queue"]

    async def start(self, callback: types.CallbackQuery):
        """Start incidents wizard - show list of problems"""
        await self.sessions.set_state(callback.from_user.id, STATE_INC_ROOT, {})
        await self.audit.log(callback.from_user.id, "WIZ_INC_START")
        
        incidents = []
        now = datetime.now(timezone.utc)
        
        # 1) Delayed deliveries (>48h)
        thr = (now - timedelta(hours=48)).isoformat()
        delayed = await self.orders.find(
            {
                "status": "SHIPPED",
                "shipment.created_at": {"$lte": thr},
                "shipment.ttn": {"$exists": True}
            },
            {"_id": 0, "id": 1, "shipment.ttn": 1, "shipment.created_at": 1}
        ).sort("shipment.created_at", 1).limit(10).to_list(10)
        
        for o in delayed:
            incidents.append({
                "kind": "DELAY",
                "key": o["id"],
                "label": f"⏳ Затримка: #{o['id'][:8]} ТТН {o['shipment']['ttn']}"
            })
        
        # 2) Failed notifications (last hour)
        hour_ago = (now - timedelta(hours=1)).isoformat()
        failed = await self.notifs.find(
            {"status": "FAILED", "created_at": {"$gte": hour_ago}},
            {"_id": 0, "id": 1, "channel": 1, "to": 1}
        ).sort("created_at", -1).limit(10).to_list(10)
        
        for n in failed:
            incidents.append({
                "kind": "NOTIF_FAIL",
                "key": n["id"],
                "label": f"🚨 FAILED {n.get('channel')} → {n.get('to', '')[:15]}"
            })
        
        # 3) Awaiting payment >24h
        thr2 = (now - timedelta(hours=24)).isoformat()
        awaitpay = await self.orders.find(
            {"status": "AWAITING_PAYMENT", "created_at": {"$lte": thr2}},
            {"_id": 0, "id": 1, "totals.grand": 1}
        ).sort("created_at", 1).limit(10).to_list(10)
        
        for o in awaitpay:
            incidents.append({
                "kind": "AWAIT_PAY",
                "key": o["id"],
                "label": f"🕒 Очікує оплату: #{o['id'][:8]} {fmt_money(o.get('totals', {}).get('grand', 0))} грн"
            })
        
        if not incidents:
            await callback.message.edit_text(
                "✅ <b>Інцидентів не знайдено!</b>\n\n"
                "Все стабільно 👌",
                parse_mode="HTML"
            )
            await callback.answer()
            return
        
        # Show first incident
        inc = incidents[0]
        await self.sessions.set_state(
            callback.from_user.id,
            STATE_INC_ITEM,
            {"incidents": incidents, "idx": 0}
        )
        
        await callback.message.edit_text(
            f"🧯 <b>Інциденти ({len(incidents)})</b>\n\n"
            f"<b>1/{len(incidents)}:</b> {inc['label']}\n\n"
            f"Оберіть дію:",
            reply_markup=incident_actions_kb(inc["kind"], inc["key"]),
            parse_mode="HTML"
        )
        await callback.answer()

    async def next_incident(self, callback: types.CallbackQuery):
        """Show next incident"""
        session = await self.sessions.get(callback.from_user.id)
        
        if session.get("state") != STATE_INC_ITEM:
            await callback.answer()
            return
        
        data = session.get("data", {})
        incidents = data.get("incidents", [])
        idx = data.get("idx", 0) + 1
        
        if idx >= len(incidents):
            await callback.message.edit_text(
                "✅ <b>Це всі інциденти!</b>\n\n"
                "Ви переглянули всі поточні проблеми.",
                parse_mode="HTML"
            )
            await self.sessions.clear(callback.from_user.id)
            await callback.answer()
            return
        
        inc = incidents[idx]
        data["idx"] = idx
        
        await self.sessions.set_state(
            callback.from_user.id,
            STATE_INC_ITEM,
            data
        )
        
        await callback.message.edit_text(
            f"🧯 <b>Інциденти</b>\n\n"
            f"<b>{idx + 1}/{len(incidents)}:</b> {inc['label']}\n\n"
            f"Оберіть дію:",
            reply_markup=incident_actions_kb(inc["kind"], inc["key"]),
            parse_mode="HTML"
        )
        await callback.answer()

    async def refresh(self, callback: types.CallbackQuery, kind: str, key: str):
        """Refresh incident status"""
        await self.audit.log(callback.from_user.id, f"WIZ_INC_REFRESH:{kind}:{key}")
        
        if kind == "DELAY":
            result = await self.actions.refresh_tracking(key)
            if result.get("ok"):
                await callback.answer("🔄 Статус оновлено!")
            else:
                await callback.answer(f"❌ {result.get('error', 'Error')}", show_alert=True)
        else:
            await callback.answer("ℹ️ Оновлення недоступне для цього типу")

    async def send_sms(self, callback: types.CallbackQuery, kind: str, key: str):
        """Send SMS for incident"""
        await self.audit.log(callback.from_user.id, f"WIZ_INC_SMS:{kind}:{key}")
        
        if kind in ("DELAY", "AWAIT_PAY"):
            result = await self.actions.send_sms(key)
            if result.get("ok"):
                await callback.answer("📨 SMS поставлено в чергу!", show_alert=True)
            else:
                await callback.answer(f"❌ {result.get('error', 'Error')}", show_alert=True)
        else:
            await callback.answer("ℹ️ SMS недоступне для цього типу")

    async def block(self, callback: types.CallbackQuery, kind: str, key: str):
        """Block customer related to incident"""
        await self.audit.log(callback.from_user.id, f"WIZ_INC_BLOCK:{kind}:{key}")
        
        if kind in ("DELAY", "AWAIT_PAY"):
            result = await self.actions.block_customer(key)
            if result.get("ok"):
                await callback.answer("🚫 Клієнта заблоковано!", show_alert=True)
            else:
                await callback.answer(f"❌ {result.get('error', 'Error')}", show_alert=True)
        else:
            await callback.answer("ℹ️ Блокування недоступне для цього типу")
