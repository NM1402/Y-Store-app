"""
O20.2: Telegram Pickup Control Handler (Production-ready)
Commands: /pickup_today, /pickup_risk, /pickup_find
Inline buttons: send, mute, unmute, customer
All texts in Ukrainian
"""
from aiogram import Router, types, F
from aiogram.filters import Command
from aiogram.utils.keyboard import InlineKeyboardBuilder
import httpx
import os

router = Router()

# Internal API base URL
API_BASE = os.getenv("INTERNAL_API_BASE", "http://localhost:8001")


# ============= HELPERS =============

def fmt_money(x) -> str:
    """Format money with spaces"""
    try:
        return f"{float(x):,.0f}".replace(",", " ")
    except:
        return str(x)


def pick_level(days_at_point: int, pickup_type: str = "BRANCH") -> str:
    """
    Smart level selection based on days and pickup type
    LOCKER: L1(1d), L3(3d), L5(5d)
    BRANCH: D2(2d), D5(5d), D7(7d)
    """
    if pickup_type == "LOCKER":
        if days_at_point >= 5:
            return "L5"
        if days_at_point >= 3:
            return "L3"
        return "L1"
    # BRANCH / UNKNOWN
    if days_at_point >= 7:
        return "D7"
    if days_at_point >= 5:
        return "D5"
    return "D2"


async def api_get(path: str, params: dict = None):
    """GET request to internal API"""
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(f"{API_BASE}{path}", params=params)
            r.raise_for_status()
            return r.json()
    except Exception as e:
        return {"error": str(e)}


async def api_post(path: str, body: dict):
    """POST request to internal API"""
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(f"{API_BASE}{path}", json=body)
            r.raise_for_status()
            return r.json()
    except Exception as e:
        return {"error": str(e), "ok": False}


# ============= COMMANDS =============

@router.message(Command("pickup_today"))
async def cmd_pickup_today(message: types.Message):
    """Show pickup control summary KPIs"""
    data = await api_get("/api/v2/admin/pickup-control/summary")
    
    if "error" in data:
        await message.answer(f"❌ Помилка: {data['error']}")
        return
    
    text = (
        "📊 <b>Pickup Control — зведення</b>\n\n"
        f"📦 2+ днів: <b>{data.get('days2plus', 0)}</b>\n"
        f"⚠️ 5+ днів: <b>{data.get('days5plus', 0)}</b>\n"
        f"🔴 7+ днів: <b>{data.get('days7plus', 0)}</b>\n\n"
        f"💰 Під ризиком (7+): <b>{fmt_money(data.get('amount_at_risk_7plus', 0))} грн</b>\n\n"
        "📋 Список: /pickup_risk 7"
    )
    
    await message.answer(text, parse_mode="HTML")


@router.message(Command("pickup_risk"))
async def cmd_pickup_risk(message: types.Message):
    """Show risk shipments list with pagination"""
    parts = message.text.split()
    days = int(parts[1]) if len(parts) > 1 else 7
    
    await send_risk_list(message, days=days, page=0)


@router.message(Command("pickup_find"))
async def cmd_pickup_find(message: types.Message):
    """Find specific TTN"""
    parts = message.text.split()
    if len(parts) < 2:
        await message.answer("❓ Формат: /pickup_find <ttn>")
        return
    
    ttn = parts[1].strip()
    data = await api_get("/api/v2/admin/pickup-control/find", params={"ttn": ttn})
    
    if "error" in data:
        await message.answer(f"❌ ТТН не знайдено: {ttn}")
        return
    
    # Show order card
    await send_order_card(message, data, page=0)


@router.message(Command("pickup_help"))
async def cmd_pickup_help(message: types.Message):
    """Show pickup control help"""
    text = (
        "📦 <b>Pickup Control — допомога</b>\n\n"
        "<b>Команди:</b>\n"
        "/pickup_today — зведення (2+/5+/7+ днів)\n"
        "/pickup_risk [днів] — список ризикових ТТН (за замовч. 7)\n"
        "/pickup_find <ttn> — знайти конкретну ТТН\n"
        "/pickup_help — ця довідка\n\n"
        "<b>Дії на карточці ТТН:</b>\n"
        "📩 Надіслати — відправити нагадування\n"
        "🔕 Mute — заглушити на 24г/7д/30д\n"
        "🔈 Unmute — увімкнути нагадування\n"
        "👤 Клієнт — відкрити картку клієнта"
    )
    await message.answer(text, parse_mode="HTML")


# ============= LIST HELPERS =============

async def send_risk_list(target, days: int, page: int, edit: bool = False):
    """Send risk list with pagination"""
    page_size = 10
    skip = page * page_size
    
    data = await api_get("/api/v2/admin/pickup-control/risk", params={
        "days": days,
        "skip": skip,
        "limit": page_size
    })
    
    if "error" in data:
        await target.answer(f"❌ Помилка: {data['error']}")
        return
    
    items = data.get("items", [])
    total = data.get("total", 0)
    
    if not items:
        await target.answer("✅ Немає відправлень з таким ризиком.", parse_mode="HTML")
        return
    
    # Build message
    header = f"⚠️ <b>Ризикові відправлення ({days}+ днів)</b>\nВсього: <b>{total}</b>\n\n"
    lines = []
    
    for i, o in enumerate(items, start=1):
        sh = o.get("shipment") or {}
        ttn = sh.get("ttn", "-")
        d = sh.get("daysAtPoint", 0)
        amt = (o.get("totals") or {}).get("grand") or o.get("total_amount") or 0
        lines.append(f"{skip + i}. <code>{ttn}</code> — <b>{d}</b> дн — <b>{fmt_money(amt)} грн</b>")
    
    text = header + "\n".join(lines) + "\n\nНатисніть ТТН для дій:"
    
    # Build keyboard with TTN buttons
    kb = InlineKeyboardBuilder()
    for o in items:
        sh = o.get("shipment") or {}
        ttn = sh.get("ttn", "")
        phone = (((o.get("delivery") or {}).get("recipient") or {}).get("phone") or "")
        kb.button(text=f"📦 {ttn}", callback_data=f"pkp:open:{ttn}:{phone}:{page}:{days}")
    kb.adjust(1)
    
    # Add pagination
    max_page = max(0, (total - 1) // page_size)
    nav_row = []
    if page > 0:
        nav_row.append(types.InlineKeyboardButton(text="⬅️", callback_data=f"pkp:list:{days}:{page-1}"))
    nav_row.append(types.InlineKeyboardButton(text=f"{page+1}/{max_page+1}", callback_data="pkp:noop"))
    if page < max_page:
        nav_row.append(types.InlineKeyboardButton(text="➡️", callback_data=f"pkp:list:{days}:{page+1}"))
    
    if nav_row:
        kb.row(*nav_row)
    
    if edit and hasattr(target, 'edit_text'):
        await target.edit_text(text, reply_markup=kb.as_markup(), parse_mode="HTML")
    else:
        await target.answer(text, reply_markup=kb.as_markup(), parse_mode="HTML")


async def send_order_card(target, order: dict, page: int):
    """Send single order card with action buttons"""
    sh = order.get("shipment") or {}
    ttn = sh.get("ttn", "-")
    days = sh.get("daysAtPoint", 0)
    deadline = sh.get("deadlineFreeAt", "-")
    status_text = sh.get("lastStatusText", "-")
    pickup_type = sh.get("pickupPointType", "BRANCH")
    
    totals = order.get("totals") or {}
    amount = totals.get("grand") or order.get("total_amount") or 0
    
    delivery = order.get("delivery") or {}
    recipient = delivery.get("recipient") or {}
    phone = recipient.get("phone") or order.get("buyer_phone") or "-"
    name = recipient.get("name") or "-"
    
    reminders = (order.get("reminders") or {}).get("pickup") or {}
    sent_levels = reminders.get("sentLevels") or []
    cooldown = reminders.get("cooldownUntil")
    
    # Determine risk level emoji
    if days >= 7:
        risk_emoji = "🔴"
    elif days >= 5:
        risk_emoji = "🟠"
    elif days >= 2:
        risk_emoji = "🟡"
    else:
        risk_emoji = "🟢"
    
    text = (
        f"{risk_emoji} <b>Контроль отримання</b>\n\n"
        f"📦 ТТН: <code>{ttn}</code>\n"
        f"👤 {name}\n"
        f"📱 <code>{phone}</code>\n"
        f"📅 Днів у точці: <b>{days}</b>\n"
        f"⏳ Дедлайн: <code>{deadline}</code>\n"
        f"🏢 Тип: {pickup_type}\n"
        f"🧾 Статус: {status_text}\n"
        f"💰 Сума: <b>{fmt_money(amount)} грн</b>\n\n"
        f"📩 Надіслано: {', '.join(sent_levels) if sent_levels else 'немає'}\n"
        f"🔕 Mute до: {cooldown or 'немає'}"
    )
    
    # Build action keyboard
    kb = InlineKeyboardBuilder()
    kb.button(text="📩 Надіслати", callback_data=f"pkp:send_confirm:{ttn}:{page}")
    kb.button(text="🔕 Mute", callback_data=f"pkp:mute_menu:{ttn}:{page}")
    kb.button(text="🔈 Unmute", callback_data=f"pkp:unmute:{ttn}:{page}")
    kb.button(text="👤 Клієнт", callback_data=f"pkp:customer:{phone}:{page}")
    kb.button(text="↩️ Назад", callback_data=f"pkp:list:7:{page}")
    kb.adjust(2, 2, 1)
    
    await target.answer(text, reply_markup=kb.as_markup(), parse_mode="HTML")


# ============= CALLBACKS =============

@router.callback_query(F.data.startswith("pkp:list:"))
async def cb_list(callback: types.CallbackQuery):
    """Pagination callback"""
    _, _, days, page = callback.data.split(":")
    await send_risk_list(callback.message, days=int(days), page=int(page), edit=True)
    await callback.answer()


@router.callback_query(F.data.startswith("pkp:open:"))
async def cb_open(callback: types.CallbackQuery):
    """Open TTN card"""
    parts = callback.data.split(":")
    _, _, ttn, phone, page, days = parts
    
    # Get order data
    data = await api_get("/api/v2/admin/pickup-control/find", params={"ttn": ttn})
    
    if "error" in data:
        await callback.answer(f"❌ ТТН не знайдено", show_alert=True)
        return
    
    await send_order_card(callback.message, data, page=int(page))
    await callback.answer()


@router.callback_query(F.data.startswith("pkp:send_confirm:"))
async def cb_send_confirm(callback: types.CallbackQuery):
    """Confirm before sending reminder"""
    _, _, ttn, page = callback.data.split(":")
    
    kb = InlineKeyboardBuilder()
    kb.button(text="✅ Підтвердити", callback_data=f"pkp:send:{ttn}:{page}")
    kb.button(text="❌ Скасувати", callback_data=f"pkp:list:7:{page}")
    kb.adjust(2)
    
    await callback.message.answer(
        f"📩 Підтвердити відправку нагадування для ТТН <code>{ttn}</code>?",
        reply_markup=kb.as_markup(),
        parse_mode="HTML"
    )
    await callback.answer()


@router.callback_query(F.data.startswith("pkp:send:"))
async def cb_send(callback: types.CallbackQuery):
    """Send reminder"""
    parts = callback.data.split(":")
    _, _, ttn, page = parts
    
    # Get order to determine level
    order = await api_get("/api/v2/admin/pickup-control/find", params={"ttn": ttn})
    
    if "error" in order:
        await callback.answer("❌ Замовлення не знайдено", show_alert=True)
        return
    
    days_at = (order.get("shipment") or {}).get("daysAtPoint", 0)
    pickup_type = (order.get("shipment") or {}).get("pickupPointType", "BRANCH")
    level = pick_level(days_at, pickup_type)
    
    res = await api_post("/api/v2/admin/pickup-control/send", {"ttn": ttn, "level": level})
    
    if res.get("ok"):
        await callback.answer(f"📩 Надіслано ({level})")
        await callback.message.answer(f"✅ Нагадування {level} для ТТН <code>{ttn}</code> відправлено!", parse_mode="HTML")
    else:
        reason = res.get("reason", "error")
        await callback.answer(f"❌ Не надіслано: {reason}", show_alert=True)


@router.callback_query(F.data.startswith("pkp:mute_menu:"))
async def cb_mute_menu(callback: types.CallbackQuery):
    """Show mute duration options"""
    _, _, ttn, page = callback.data.split(":")
    
    kb = InlineKeyboardBuilder()
    kb.button(text="🔕 24 години", callback_data=f"pkp:mute:{ttn}:{page}:24")
    kb.button(text="🔕 7 днів", callback_data=f"pkp:mute:{ttn}:{page}:168")
    kb.button(text="🔕 30 днів", callback_data=f"pkp:mute:{ttn}:{page}:720")
    kb.button(text="↩️ Назад", callback_data=f"pkp:list:7:{page}")
    kb.adjust(2, 1, 1)
    
    await callback.message.answer(
        f"🔕 Заглушити ТТН <code>{ttn}</code> на:",
        reply_markup=kb.as_markup(),
        parse_mode="HTML"
    )
    await callback.answer()


@router.callback_query(F.data.startswith("pkp:mute:"))
async def cb_mute(callback: types.CallbackQuery):
    """Mute TTN"""
    parts = callback.data.split(":")
    _, _, ttn, page, hours = parts
    
    res = await api_post("/api/v2/admin/pickup-control/mute", {"ttn": ttn, "hours": int(hours)})
    
    if res.get("ok"):
        await callback.answer("🔕 Заглушено")
        await callback.message.answer(
            f"🔕 ТТН <code>{ttn}</code> заглушено до:\n<code>{res.get('muted_until')}</code>",
            parse_mode="HTML"
        )
    else:
        await callback.answer("❌ Помилка", show_alert=True)


@router.callback_query(F.data.startswith("pkp:unmute:"))
async def cb_unmute(callback: types.CallbackQuery):
    """Unmute TTN"""
    _, _, ttn, page = callback.data.split(":")
    
    res = await api_post("/api/v2/admin/pickup-control/unmute", {"ttn": ttn})
    
    if res.get("ok"):
        await callback.answer("🔈 Увімкнено")
        await callback.message.answer(f"🔈 ТТН <code>{ttn}</code> — mute знято.", parse_mode="HTML")
    else:
        await callback.answer("❌ Помилка", show_alert=True)


@router.callback_query(F.data.startswith("pkp:customer:"))
async def cb_customer(callback: types.CallbackQuery):
    """Open customer card"""
    _, _, phone, page = callback.data.split(":")
    
    await callback.message.answer(
        f"👤 <b>Клієнт</b>\n\n"
        f"📱 Телефон: <code>{phone}</code>\n\n"
        f"Команда: /customer {phone}",
        parse_mode="HTML"
    )
    await callback.answer()


@router.callback_query(F.data == "pkp:noop")
async def cb_noop(callback: types.CallbackQuery):
    """No-op for pagination indicator"""
    await callback.answer()
