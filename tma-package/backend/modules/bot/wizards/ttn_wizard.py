"""
O12: TTN Wizard - Multi-step TTN creation
"""
from motor.motor_asyncio import AsyncIOMotorDatabase
from aiogram import types
import logging

from ..bot_sessions_repo import BotSessionsRepo
from ..bot_audit_repo import BotAuditRepo
from ..bot_actions_service import BotActionsService
from ..bot_keyboards import (
    ttn_confirm_kb, 
    ttn_post_actions_kb, 
    cancel_kb,
    back_cancel_kb
)

logger = logging.getLogger(__name__)

# FSM States
STATE_TTN_INPUT = "TTN:INPUT"
STATE_TTN_CONFIRM = "TTN:CONFIRM"
STATE_TTN_DONE = "TTN:DONE"


def fmt_money(x):
    try:
        return f"{float(x):,.2f}"
    except (ValueError, TypeError):
        return str(x)


class TTNWizard:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.sessions = BotSessionsRepo(db)
        self.audit = BotAuditRepo(db)
        self.actions = BotActionsService(db)

    async def start(self, message: types.Message):
        """Start TTN wizard"""
        await self.sessions.set_state(message.from_user.id, STATE_TTN_INPUT, {})
        await self.audit.log(message.from_user.id, "WIZ_TTN_START")
        
        await message.answer(
            "📦 <b>Майстер ТТН</b>\n\n"
            "Надішліть:\n"
            "• <code>ID замовлення</code>\n"
            "• або <code>телефон клієнта</code>\n\n"
            "Приклад: <code>+38050</code>",
            reply_markup=cancel_kb(),
            parse_mode="HTML"
        )

    async def handle_text(self, message: types.Message) -> bool:
        """Handle text input during wizard"""
        session = await self.sessions.get(message.from_user.id)
        state = session.get("state")
        
        if state != STATE_TTN_INPUT:
            return False
        
        query = (message.text or "").strip()
        
        # Try to find order by ID
        order = await self.db["orders"].find_one({"id": query}, {"_id": 0})
        
        if not order:
            # Try by phone
            order = await self.db["orders"].find_one(
                {"shipping.phone": {"$regex": query, "$options": "i"}},
                {"_id": 0},
                sort=[("created_at", -1)]
            )
        
        if not order:
            await message.answer(
                "❗ Замовлення не знайдено.\n\n"
                "Перевірте ID або телефон та спробуйте ще раз.",
                reply_markup=cancel_kb(),
                parse_mode="HTML"
            )
            return True
        
        order_id = order["id"]
        status = order.get("status", "")
        amount = order.get("totals", {}).get("grand", 0)
        shipping = order.get("shipping", {})
        phone = shipping.get("phone", "-")
        name = shipping.get("full_name", "-")
        city = shipping.get("city", "-")
        ttn = (order.get("shipment") or {}).get("ttn")
        
        # Check if TTN already exists
        if ttn:
            await message.answer(
                f"📦 <b>ТТН вже існує</b>\n\n"
                f"Замовлення: <code>{order_id}</code>\n"
                f"ТТН: <code>{ttn}</code>\n"
                f"Статус: <b>{status}</b>\n"
                f"Сума: {fmt_money(amount)} грн\n"
                f"Клієнт: {name}\n"
                f"☎️ <code>{phone}</code>",
                reply_markup=ttn_post_actions_kb(order_id, ttn),
                parse_mode="HTML"
            )
            await self.sessions.set_state(
                message.from_user.id, 
                STATE_TTN_DONE,
                {"order_id": order_id, "ttn": ttn}
            )
            return True
        
        # Show confirm dialog
        await message.answer(
            f"✅ <b>Готовий створити ТТН</b>\n\n"
            f"Замовлення: <code>{order_id}</code>\n"
            f"Статус: <b>{status}</b>\n"
            f"Сума: {fmt_money(amount)} грн\n\n"
            f"👤 Клієнт: {name}\n"
            f"☎️ Телефон: <code>{phone}</code>\n"
            f"📍 Місто: {city}\n\n"
            f"Підтвердити створення ТТН?",
            reply_markup=ttn_confirm_kb(order_id),
            parse_mode="HTML"
        )
        
        await self.sessions.set_state(
            message.from_user.id,
            STATE_TTN_CONFIRM,
            {"order_id": order_id}
        )
        return True

    async def confirm(self, callback: types.CallbackQuery, order_id: str):
        """Confirm TTN creation"""
        session = await self.sessions.get(callback.from_user.id)
        
        if session.get("state") != STATE_TTN_CONFIRM:
            await callback.answer("Сесія неактивна.", show_alert=True)
            return
        
        await self.audit.log(callback.from_user.id, f"WIZ_TTN_CONFIRM:{order_id}")
        
        # Show processing message
        await callback.message.edit_text(
            f"⏳ Створюю ТТН для замовлення <code>{order_id}</code>...",
            parse_mode="HTML"
        )
        
        # Call action
        result = await self.actions.create_ttn(order_id)
        
        if not result.get("ok"):
            error = result.get("error", "Unknown error")
            await callback.message.edit_text(
                f"❌ Не вдалося створити ТТН\n\n"
                f"Причина: <code>{error[:200]}</code>",
                parse_mode="HTML",
                reply_markup=back_cancel_kb()
            )
            await callback.answer()
            return
        
        ttn = result.get("ttn", "")
        cost = result.get("cost")
        
        await callback.message.edit_text(
            f"📦 <b>ТТН створено!</b>\n\n"
            f"Замовлення: <code>{order_id}</code>\n"
            f"ТТН: <code>{ttn}</code>\n"
            f"{'Вартість доставки: ' + fmt_money(cost) + ' грн' if cost else ''}",
            reply_markup=ttn_post_actions_kb(order_id, ttn),
            parse_mode="HTML"
        )
        
        await self.sessions.set_state(
            callback.from_user.id,
            STATE_TTN_DONE,
            {"order_id": order_id, "ttn": ttn}
        )
        await callback.answer("✅ ТТН створено!")

    async def refresh(self, callback: types.CallbackQuery, order_id: str):
        """Refresh tracking status"""
        await self.audit.log(callback.from_user.id, f"WIZ_TTN_REFRESH:{order_id}")
        
        result = await self.actions.refresh_tracking(order_id)
        
        if result.get("ok"):
            await callback.answer("🔄 Статус оновлено!")
        else:
            await callback.answer(f"❌ {result.get('error', 'Error')}", show_alert=True)

    async def pdf(self, callback: types.CallbackQuery, ttn: str):
        """Get PDF label URL"""
        await self.audit.log(callback.from_user.id, f"WIZ_TTN_PDF:{ttn}")
        
        url = await self.actions.get_pdf_url(ttn)
        
        await callback.message.answer(
            f"🖨 <b>PDF етикетка</b>\n\n"
            f"ТТН: <code>{ttn}</code>\n\n"
            f"Посилання: {url}\n\n"
            f"(Відкрийте у браузері та надрукуйте)",
            parse_mode="HTML"
        )
        await callback.answer()

    async def sms(self, callback: types.CallbackQuery, order_id: str):
        """Send SMS to customer"""
        await self.audit.log(callback.from_user.id, f"WIZ_TTN_SMS:{order_id}")
        
        result = await self.actions.send_sms(order_id)
        
        if result.get("ok"):
            await callback.answer("📨 SMS поставлено в чергу!", show_alert=True)
        else:
            await callback.answer(f"❌ {result.get('error', 'Error')}", show_alert=True)
