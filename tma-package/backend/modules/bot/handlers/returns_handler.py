"""
O20.3: Return Control Handler for Telegram Bot
Commands: /returns_today, /returns_risk, /return_find
"""
from aiogram import Router, F, types
from aiogram.filters import Command
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging

logger = logging.getLogger(__name__)

router = Router()

# Get DB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "marketplace_db")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


@router.message(Command("returns_today"))
async def cmd_returns_today(message: types.Message):
    """Show return KPIs summary"""
    from modules.returns.return_analytics import ReturnAnalyticsService
    
    try:
        service = ReturnAnalyticsService(db)
        stats = await service.summary()
        
        text = (
            "↩️ <b>Повернення — Зведення</b>\n\n"
            f"📅 Сьогодні: <b>{stats['today']}</b>\n"
            f"📅 7 днів: <b>{stats['7d']}</b>\n"
            f"📅 30 днів: <b>{stats['30d']}</b>\n\n"
            f"📊 Return rate (30д): <b>{stats['return_rate_30d']*100:.1f}%</b>\n"
            f"📊 COD відмов (30д): <b>{stats['cod_refusal_rate_30d']*100:.1f}%</b>\n"
            f"💸 Втрати доставки: <b>{stats['shipping_losses_30d']:,.0f} грн</b>\n\n"
        )
        
        if stats['top_reasons_30d']:
            text += "<b>Топ причин:</b>\n"
            for r in stats['top_reasons_30d'][:3]:
                text += f"• {r['reason']}: {r['count']}\n"
            text += "\n"
            
        if stats['top_cities_30d']:
            text += "<b>Топ міст:</b>\n"
            for c in stats['top_cities_30d'][:3]:
                text += f"• {c['city']}: {c['count']}\n"
        
        await message.answer(text, parse_mode="HTML")
        
    except Exception as e:
        logger.error(f"Error in returns_today: {e}")
        await message.answer(f"❌ Помилка: {e}")


@router.message(Command("returns_risk"))
async def cmd_returns_risk(message: types.Message):
    """Show high-risk customers (frequent returns)"""
    from modules.returns.return_analytics import ReturnAnalyticsService
    
    try:
        service = ReturnAnalyticsService(db)
        customers = await service.risk_customers(limit=10)
        
        if not customers:
            await message.answer(
                "↩️ <b>Ризикові клієнти</b>\n\n"
                "✅ Немає клієнтів з високим рівнем повернень!",
                parse_mode="HTML"
            )
            return
        
        text = f"↩️ <b>Ризикові клієнти ({len(customers)})</b>\n\n"
        
        for c in customers:
            phone = c.get('phone', '-')
            name = c.get('name') or c.get('email') or phone
            segment = c.get('segment', '-')
            counters = c.get('counters') or {}
            returns = counters.get('returns_total', 0)
            cod_ref = counters.get('cod_refusals_total', 0)
            
            seg_emoji = {"RISK": "⚠️", "BLOCK_COD": "🚫"}.get(segment, "👤")
            
            text += (
                f"{seg_emoji} <b>{name}</b>\n"
                f"   📞 <code>{phone}</code>\n"
                f"   ↩️ Повернень: {returns} | COD відмов: {cod_ref}\n"
                f"   🏷 Сегмент: {segment}\n\n"
            )
        
        # Add inline buttons
        keyboard = types.InlineKeyboardMarkup(inline_keyboard=[
            [types.InlineKeyboardButton(text="🔄 Оновити", callback_data="returns:risk:refresh")],
        ])
        
        await message.answer(text, parse_mode="HTML", reply_markup=keyboard)
        
    except Exception as e:
        logger.error(f"Error in returns_risk: {e}")
        await message.answer(f"❌ Помилка: {e}")


@router.message(Command("return_find"))
async def cmd_return_find(message: types.Message):
    """Find return by TTN: /return_find <ttn>"""
    args = message.text.split(maxsplit=1)
    
    if len(args) < 2:
        await message.answer(
            "↩️ <b>Пошук повернення</b>\n\n"
            "Використання: <code>/return_find ТТН</code>\n"
            "Приклад: <code>/return_find 20450000000000</code>",
            parse_mode="HTML"
        )
        return
    
    ttn = args[1].strip()
    
    order = await db["orders"].find_one(
        {"shipment.ttn": ttn},
        {"_id": 0, "id": 1, "status": 1, "returns": 1, "shipment": 1, 
         "totals": 1, "total_amount": 1, "shipping": 1, "delivery": 1}
    )
    
    if not order:
        await message.answer(f"❌ Замовлення з ТТН <code>{ttn}</code> не знайдено", parse_mode="HTML")
        return
    
    order_id = order.get("id", "-")[:8]
    status = order.get("status", "-")
    returns = order.get("returns") or {}
    amount = float((order.get("totals") or {}).get("grand") or order.get("total_amount") or 0)
    
    # Get phone
    delivery = order.get("delivery") or {}
    recipient = delivery.get("recipient") or {}
    shipping = order.get("shipping") or {}
    phone = recipient.get("phone") or shipping.get("phone") or "-"
    
    stage = returns.get("stage", "NONE")
    reason = returns.get("reason", "-")
    
    stage_emoji = {"RETURNING": "🔄", "RETURNED": "📦", "RESOLVED": "✅"}.get(stage, "❓")
    
    text = (
        f"↩️ <b>Замовлення #{order_id}</b>\n\n"
        f"ТТН: <code>{ttn}</code>\n"
        f"Статус: <b>{status}</b>\n"
        f"Сума: <b>{amount:,.0f} грн</b>\n"
        f"Клієнт: <code>{phone}</code>\n\n"
        f"{stage_emoji} <b>Повернення:</b>\n"
        f"   Стадія: {stage}\n"
        f"   Причина: {reason}\n"
    )
    
    if returns.get("updated_at"):
        text += f"   Оновлено: {returns['updated_at'][:10]}\n"
    
    # Inline buttons
    buttons = [
        [types.InlineKeyboardButton(text="👤 Клієнт", callback_data=f"customer:open:{phone}")],
        [types.InlineKeyboardButton(text="📦 Замовлення", callback_data=f"order:open:{order.get('id')}")],
    ]
    
    if stage != "RESOLVED":
        buttons.append([
            types.InlineKeyboardButton(text="✅ Вирішено", callback_data=f"returns:resolve:{order.get('id')}")
        ])
    
    keyboard = types.InlineKeyboardMarkup(inline_keyboard=buttons)
    
    await message.answer(text, parse_mode="HTML", reply_markup=keyboard)


@router.callback_query(F.data == "returns:risk:refresh")
async def cb_returns_risk_refresh(callback: types.CallbackQuery):
    """Refresh risk customers list"""
    from modules.returns.return_analytics import ReturnAnalyticsService
    
    try:
        service = ReturnAnalyticsService(db)
        customers = await service.risk_customers(limit=10)
        
        if not customers:
            await callback.message.edit_text(
                "↩️ <b>Ризикові клієнти</b>\n\n"
                "✅ Немає клієнтів з високим рівнем повернень!",
                parse_mode="HTML"
            )
            await callback.answer("Оновлено!")
            return
        
        text = f"↩️ <b>Ризикові клієнти ({len(customers)})</b>\n\n"
        
        for c in customers:
            phone = c.get('phone', '-')
            name = c.get('name') or c.get('email') or phone
            segment = c.get('segment', '-')
            counters = c.get('counters') or {}
            returns = counters.get('returns_total', 0)
            cod_ref = counters.get('cod_refusals_total', 0)
            
            seg_emoji = {"RISK": "⚠️", "BLOCK_COD": "🚫"}.get(segment, "👤")
            
            text += (
                f"{seg_emoji} <b>{name}</b>\n"
                f"   📞 <code>{phone}</code>\n"
                f"   ↩️ Повернень: {returns} | COD відмов: {cod_ref}\n"
                f"   🏷 Сегмент: {segment}\n\n"
            )
        
        keyboard = types.InlineKeyboardMarkup(inline_keyboard=[
            [types.InlineKeyboardButton(text="🔄 Оновити", callback_data="returns:risk:refresh")],
        ])
        
        await callback.message.edit_text(text, parse_mode="HTML", reply_markup=keyboard)
        await callback.answer("Оновлено!")
        
    except Exception as e:
        logger.error(f"Error refreshing risk customers: {e}")
        await callback.answer(f"Помилка: {e}", show_alert=True)


@router.callback_query(F.data.startswith("returns:resolve:"))
async def cb_returns_resolve(callback: types.CallbackQuery):
    """Mark return as resolved"""
    from datetime import datetime, timezone
    
    order_id = callback.data.split(":")[-1]
    
    try:
        result = await db["orders"].update_one(
            {"id": order_id},
            {"$set": {
                "returns.stage": "RESOLVED",
                "returns.resolved_at": datetime.now(timezone.utc).isoformat(),
                "returns.resolved_by": f"tg:{callback.from_user.id}"
            }}
        )
        
        if result.modified_count > 0:
            await callback.answer("✅ Позначено як вирішено!", show_alert=True)
            
            # Update message
            order = await db["orders"].find_one({"id": order_id}, {"_id": 0, "shipment.ttn": 1})
            ttn = (order.get("shipment") or {}).get("ttn", "")
            
            await callback.message.edit_text(
                callback.message.text + f"\n\n✅ <b>Вирішено</b> {datetime.now(timezone.utc).strftime('%H:%M')}",
                parse_mode="HTML"
            )
        else:
            await callback.answer("Замовлення не знайдено", show_alert=True)
            
    except Exception as e:
        logger.error(f"Error resolving return: {e}")
        await callback.answer(f"Помилка: {e}", show_alert=True)


# === Policy approval handlers ===

@router.callback_query(F.data.startswith("policy:approve:"))
async def cb_policy_approve(callback: types.CallbackQuery):
    """Approve policy action from Telegram"""
    from modules.returns.policy_engine import ReturnPolicyEngine
    from modules.returns.policy_repo import PolicyRepo
    from modules.returns.policy_types import PolicyDecision
    
    dedupe_key_part = callback.data.replace("policy:approve:", "")
    
    try:
        repo = PolicyRepo(db)
        engine = ReturnPolicyEngine(db)
        
        # Find action by partial key
        action = await db["policy_actions_queue"].find_one(
            {"dedupe_key": {"$regex": f"^{dedupe_key_part}"}},
            {"_id": 0}
        )
        
        if not action:
            await callback.answer("Дію не знайдено", show_alert=True)
            return
        
        if action.get("status") != "PENDING":
            await callback.answer(f"Дія вже {action.get('status')}", show_alert=True)
            return
        
        dedupe_key = action["dedupe_key"]
        admin_id = f"tg:{callback.from_user.id}"
        
        # Approve
        await repo.approve_action(dedupe_key, approved_by=admin_id)
        
        # Apply
        decision = PolicyDecision(**action["decision"])
        await engine.apply_decision(decision, updated_by=admin_id)
        
        await callback.answer("✅ Підтверджено та застосовано!", show_alert=True)
        
        # Update message
        await callback.message.edit_text(
            callback.message.text + f"\n\n✅ <b>Підтверджено</b> @{callback.from_user.username or callback.from_user.id}",
            parse_mode="HTML"
        )
        
    except Exception as e:
        logger.error(f"Error approving policy: {e}")
        await callback.answer(f"Помилка: {e}", show_alert=True)


@router.callback_query(F.data.startswith("policy:reject:"))
async def cb_policy_reject(callback: types.CallbackQuery):
    """Reject policy action from Telegram"""
    from modules.returns.policy_repo import PolicyRepo
    
    dedupe_key_part = callback.data.replace("policy:reject:", "")
    
    try:
        repo = PolicyRepo(db)
        
        # Find action by partial key
        action = await db["policy_actions_queue"].find_one(
            {"dedupe_key": {"$regex": f"^{dedupe_key_part}"}},
            {"_id": 0}
        )
        
        if not action:
            await callback.answer("Дію не знайдено", show_alert=True)
            return
        
        dedupe_key = action["dedupe_key"]
        admin_id = f"tg:{callback.from_user.id}"
        
        await repo.reject_action(dedupe_key, rejected_by=admin_id)
        
        await callback.answer("❌ Відхилено", show_alert=True)
        
        # Update message
        await callback.message.edit_text(
            callback.message.text + f"\n\n❌ <b>Відхилено</b> @{callback.from_user.username or callback.from_user.id}",
            parse_mode="HTML"
        )
        
    except Exception as e:
        logger.error(f"Error rejecting policy: {e}")
        await callback.answer(f"Помилка: {e}", show_alert=True)
