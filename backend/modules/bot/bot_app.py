"""
O9-O12: Telegram Admin Bot Main Application
Runs as separate process: python -m modules.bot.bot_app
"""
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    WebAppInfo,
    MenuButtonWebApp,
)
from modules.bot.handlers.returns_handler import router as returns_router
from modules.bot.handlers.pickup_control_handler import router as pickup_control_router
from modules.automation.automation_engine import AutomationEngine
from modules.bot.wizards.incidents_wizard import IncidentsWizard
from modules.bot.wizards.broadcast_wizard import BroadcastWizard
from modules.bot.wizards.ttn_wizard import TTNWizard
from modules.bot.bot_keyboards import main_menu, wizards_menu, settings_menu_kb, cancel_kb
from modules.bot.alerts_worker import AlertsWorker
from modules.bot.bot_actions_service import BotActionsService
from modules.bot.bot_audit_repo import BotAuditRepo
from modules.bot.bot_sessions_repo import BotSessionsRepo
from modules.bot.bot_alerts_repo import BotAlertsRepo
from modules.bot.bot_settings_repo import BotSettingsRepo
import asyncio
import os
import logging
from pathlib import Path
from dotenv import load_dotenv

from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from motor.motor_asyncio import AsyncIOMotorClient

# Load env
ROOT_DIR = Path(__file__).parent.parent.parent
load_dotenv(ROOT_DIR / '.env')

# Import bot modules


# O20.2: Pickup Control Handler

# O20.3: Returns Handler

# Telegram Mini App integration

_app_url = (os.getenv("APP_URL") or "").rstrip("/")
TMA_URL = os.getenv("TMA_URL") or (f"{_app_url}/tma" if _app_url else "")

# Configure logging - DEBUG level for troubleshooting
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Reduce noise from httpx/httpcore
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

# Get config from env
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "marketplace_db")
OWNER_ID = int(os.getenv("TELEGRAM_OWNER_ID", "0"))

if not TOKEN:
    raise ValueError("TELEGRAM_BOT_TOKEN not set in .env")

if not TMA_URL:
    raise ValueError("TMA_URL (or APP_URL) not set in .env")

# MongoDB
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Bot
bot = Bot(token=TOKEN)
dp = Dispatcher()

# O20.2: Include Pickup Control Router
dp.include_router(pickup_control_router)

# O20.3: Include Returns Router
dp.include_router(returns_router)

# Repositories
settings_repo = BotSettingsRepo(db)
alerts_repo = BotAlertsRepo(db)
sessions_repo = BotSessionsRepo(db)
audit_repo = BotAuditRepo(db)
actions_service = BotActionsService(db)

# Wizards
ttn_wizard = TTNWizard(db)
broadcast_wizard = BroadcastWizard(db)
incidents_wizard = IncidentsWizard(db)

# Workers
alerts_worker = AlertsWorker(db, TOKEN)
automation_engine = AutomationEngine(db)


# ============= DEBUG HANDLER (first to catch all) =============

@dp.message(Command("debug"))
async def cmd_debug(message: types.Message):
    """Debug command - show chat info"""
    info = (
        f"🔍 <b>Debug Info</b>\n\n"
        f"Chat ID: <code>{message.chat.id}</code>\n"
        f"User ID: <code>{message.from_user.id}</code>\n"
        f"Username: @{message.from_user.username or 'none'}\n"
        f"Chat Type: {message.chat.type}\n"
    )
    await message.answer(info, parse_mode="HTML")
    logger.info(
        f"DEBUG: chat_id={message.chat.id}, user_id={message.from_user.id}")


# ============= COMMAND HANDLERS =============

@dp.message(Command("start", "menu"))
async def cmd_start(message: types.Message):
    """Start command — welcome for customers, admin panel for admins"""
    user_id = message.from_user.id
    chat_id = message.chat.id
    first_name = message.from_user.first_name or "друже"

    logger.info(f"🟢 /start from user_id={user_id}, chat_id={chat_id}")

    # Perevirti admin status (ne dodaemo avtomatychno!)
    settings = await settings_repo.get()
    admin_ids = settings.get("admin_user_ids", []) or []
    is_admin = int(user_id) in [int(x) for x in admin_ids if x]

    await audit_repo.log(user_id, "CMD_START")

    if is_admin:
        # Reyestruyemo chat dlya alertiv
        if message.chat.type == "private":
            await settings_repo.add_chat_id(str(chat_id))
        if message.chat.type in ("group", "supergroup", "channel"):
            await settings_repo.add_chat_id(str(message.chat.id))

        await message.answer(
            f"👋 <b>Вітаю, {first_name}!</b>\n\n"
            "🤖 <b>Панель керування Y-Store</b>\n\n"
            "Що я вмію:\n"
            "• 📦 Створювати ТТН Нової Пошти\n"
            "• 🧾 Отримувати сповіщення про замовлення та оплати\n"
            "• 👥 Керувати клієнтами та розсилками\n"
            "• 📊 Показувати фінансові звіти\n\n"
            "Оберіть розділ нижче:",
            reply_markup=main_menu(),
            parse_mode="HTML",
        )
        await message.answer(
            "🛍 Або відкрити магазин як покупець:",
            reply_markup=shop_kb(),
            parse_mode="HTML",
        )
    else:
        # Customer-facing welcome
        welcome = (
            f"👋 <b>Вітаємо у Y-Store, {first_name}!</b>\n\n"
            "🇺🇦 <b>Y-Store — український маркетплейс корисних речей</b>\n"
            "Від побуту й кухні до того, що тримає тил та фронт.\n\n"
            "🛒 <b>У нас ви знайдете:</b>\n"
            "• 🏠 Побутову техніку та кухню\n"
            "• 💡 Освітлення, ліхтарі, налобники\n"
            "• 💄 Красу та здоров'я\n"
            "• 🕯 Свічки, блекаут, павербанки\n"
            "• 🧸 Товари для дітей\n"
            "• 🛠 Сантехніка та ремонт\n"
            "• 🐕 Зоотовари\n"
            "• 🖥 Електроніку\n"
            "• 🪖 Товари для військових\n\n"
            "✅ <b>Чому Y-Store:</b>\n"
            "• 🚚 Швидка доставка Новою Поштою 1–2 дні\n"
            "• 🔄 Повернення 14 днів — без зайвих питань\n"
            "• 💳 Оплата карткою онлайн або накладеним платежем\n"
            "• 🎁 Знижки до −30% та −10% на першу покупку\n"
            "• 💬 Підтримка 24/7\n\n"
            "Натисніть кнопку нижче і відкрийте магазин:"
        )
        await message.answer(welcome, reply_markup=shop_kb(), parse_mode="HTML")


@dp.message(Command("be_admin"))
async def cmd_be_admin(message: types.Message):
    """Активувати адмін-права — тільки для власника"""
    user_id = message.from_user.id
    chat_id = message.chat.id

    if OWNER_ID and int(user_id) != OWNER_ID:
        await message.answer("⛔️ Ця команда доступна лише власнику бота.")
        return

    await settings_repo.add_user_id(user_id)
    if message.chat.type == "private":
        await settings_repo.add_chat_id(str(chat_id))
    await audit_repo.log(user_id, "BE_ADMIN")

    await message.answer(
        f"🛡 <b>Адмін-права активовано</b>\n\n"
        f"Користувач <code>{user_id}</code> тепер має доступ до панелі.\n"
        f"Надішліть /menu або /start щоб відкрити панель.",
        parse_mode="HTML",
    )


@dp.message(Command("revoke_admin"))
async def cmd_revoke_admin(message: types.Message):
    """Відкликати адмін-права у користувача — тільки для власника"""
    user_id = message.from_user.id

    if OWNER_ID and int(user_id) != OWNER_ID:
        await message.answer("⛔️ Ця команда доступна лише власнику бота.")
        return

    # Залишаємо тільки власника в admin_user_ids і admin_chat_ids
    await settings_repo.update({
        "admin_user_ids": [OWNER_ID],
        "admin_chat_ids": [str(message.chat.id)],
    })
    await audit_repo.log(user_id, "REVOKE_ALL_ADMINS")

    await message.answer(
        "✅ <b>Доступ очищено</b>\n\n"
        f"Єдиний адмін: <code>{OWNER_ID}</code>",
        parse_mode="HTML",
    )


@dp.message(Command("wizards"))
async def cmd_wizards(message: types.Message):
    """Show wizards menu"""
    await sessions_repo.set_state(message.from_user.id, "ROOT", {})
    await message.answer(
        "🧩 <b>Майстри</b>\n\nОберіть сценарій:",
        reply_markup=wizards_menu(),
        parse_mode="HTML"
    )


@dp.message(Command("help"))
async def cmd_help(message: types.Message):
    """Help command"""
    await message.answer(
        "<b>📚 Довідка</b>\n\n"
        "<b>Команди:</b>\n"
        "/start, /menu - Головне меню\n"
        "/shop - Відкрити магазин (Mini App)\n"
        "/wizards - Майстри (ТТН, розсилка)\n"
        "/help - Ця довідка\n\n"
        "<b>Меню:</b>\n"
        "📊 Операційна панель - статистика\n"
        "📦 Замовлення - список замовлень\n"
        "🚚 Доставки - активні ТТН\n"
        "👤 CRM - пошук клієнтів\n"
        "💰 Фінанси - звіт\n"
        "📦 Майстер ТТН - створення ТТН\n"
        "📣 Розсилка - масові SMS/Email\n"
        "🧯 Інциденти - проблеми\n"
        "⚙️ Налаштування - пороги, алерти",
        parse_mode="HTML"
    )


# ============= TELEGRAM MINI APP =============

def shop_kb() -> InlineKeyboardMarkup:
    """Inline-клавіатура з кнопкою WebApp → Mini App."""
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(
            text="🛍 Відкрити магазин Y-Store",
            web_app=WebAppInfo(url=TMA_URL),
        )
    ]])


@dp.message(Command("shop", "store", "app"))
async def cmd_shop(message: types.Message):
    """Відкрити Mini App магазина."""
    await message.answer(
        "🛍 <b>Y-Store — магазин електроніки</b>\n\n"
        "Смартфони, ноутбуки, аксесуари — з оплатою накладеним платежем "
        "і доставкою Нова Пошта.\n\n"
        "Натисніть кнопку нижче, щоб відкрити каталог:",
        reply_markup=shop_kb(),
        parse_mode="HTML",
    )


# ============= REPLY KEYBOARD HANDLERS =============

@dp.message(F.text == "📊 Операційна панель")
async def menu_dashboard(message: types.Message):
    """Dashboard overview"""
    # Get quick stats
    orders_count = await db["orders"].count_documents({})
    shipped_count = await db["orders"].count_documents({"status": "SHIPPED"})
    customers_count = await db["customers"].count_documents({})

    await message.answer(
        f"📊 <b>Операційна панель</b>\n\n"
        f"📦 Всього замовлень: <b>{orders_count}</b>\n"
        f"🚚 В доставці: <b>{shipped_count}</b>\n"
        f"👤 Клієнтів: <b>{customers_count}</b>\n\n"
        f"Детальніше на веб-панелі.",
        parse_mode="HTML"
    )


@dp.message(F.text == "📦 Замовлення")
async def menu_orders(message: types.Message):
    """Recent orders"""
    orders = await db["orders"].find(
        {},
        {"_id": 0, "id": 1, "status": 1, "totals.grand": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5).to_list(5)

    if not orders:
        await message.answer("📦 Замовлень поки немає.")
        return

    text = "📦 <b>Останні замовлення:</b>\n\n"
    for o in orders:
        oid = o.get("id", "")[:8]
        status = o.get("status", "-")
        amount = o.get("totals", {}).get("grand", 0)
        text += f"• <code>{oid}</code> | {status} | {float(amount):.0f} грн\n"

    await message.answer(text, parse_mode="HTML")


@dp.message(F.text == "🚚 Доставки")
async def menu_deliveries(message: types.Message):
    """Active shipments"""
    orders = await db["orders"].find(
        {"status": "SHIPPED", "shipment.ttn": {"$exists": True}},
        {"_id": 0, "id": 1, "shipment.ttn": 1, "shipping.city": 1}
    ).sort("shipment.created_at", -1).limit(5).to_list(5)

    if not orders:
        await message.answer("🚚 Активних доставок немає.")
        return

    text = "🚚 <b>Активні доставки:</b>\n\n"
    for o in orders:
        oid = o.get("id", "")[:8]
        ttn = o.get("shipment", {}).get("ttn", "-")
        city = o.get("shipping", {}).get("city", "-")
        text += f"• <code>{ttn}</code> | #{oid} | {city}\n"

    await message.answer(text, parse_mode="HTML")


@dp.message(F.text == "👤 CRM")
async def menu_crm(message: types.Message):
    """CRM - prompt for phone search"""
    await sessions_repo.set_state(message.from_user.id, "CRM:SEARCH", {})
    await message.answer(
        "👤 <b>CRM</b>\n\n"
        "Надішліть номер телефону для пошуку клієнта:",
        reply_markup=cancel_kb(),
        parse_mode="HTML"
    )


@dp.message(F.text == "💰 Фінанси")
async def menu_finance(message: types.Message):
    """Finance summary"""
    # Simple aggregation
    pipeline = [
        {"$group": {
            "_id": "$direction",
            "total": {"$sum": "$amount"}
        }}
    ]
    results = await db["finance_ledger"].aggregate(pipeline).to_list(10)

    income = 0
    expense = 0
    for r in results:
        if r["_id"] == "IN":
            income = r["total"]
        elif r["_id"] == "OUT":
            expense = r["total"]

    net = income - expense

    await message.answer(
        f"💰 <b>Фінанси</b>\n\n"
        f"📈 Дохід: <b>{income:,.2f} грн</b>\n"
        f"📉 Витрати: <b>{expense:,.2f} грн</b>\n"
        f"💵 Баланс: <b>{net:,.2f} грн</b>",
        parse_mode="HTML"
    )


@dp.message(F.text == "📦 Майстер ТТН")
async def menu_ttn_wizard(message: types.Message):
    """Start TTN wizard"""
    await ttn_wizard.start(message)


@dp.message(F.text == "📣 Розсилка")
async def menu_broadcast(message: types.Message):
    """Start broadcast wizard"""
    await sessions_repo.set_state(message.from_user.id, "BLAST:SEGMENT", {})
    await audit_repo.log(message.from_user.id, "WIZ_BLAST_START")
    await message.answer(
        "📣 <b>Майстер розсилки</b>\n\n"
        "Оберіть сегмент отримувачів:",
        reply_markup=broadcast_wizard.db["bot_keyboards"].segment_kb(
        ) if hasattr(broadcast_wizard.db, "bot_keyboards") else None,
        parse_mode="HTML"
    )
    # Direct import workaround
    from modules.bot.bot_keyboards import segment_kb
    await message.answer(
        "📣 <b>Майстер розсилки</b>\n\nОберіть сегмент:",
        reply_markup=segment_kb(),
        parse_mode="HTML"
    )


@dp.message(F.text == "🧯 Інциденти")
async def menu_incidents(message: types.Message):
    """Start incidents wizard via fake callback"""
    # Create fake callback-like behavior
    await sessions_repo.set_state(message.from_user.id, "INC:ROOT", {})

    # Just call the start logic directly
    from datetime import datetime, timezone, timedelta

    incidents = []
    now = datetime.now(timezone.utc)

    thr = (now - timedelta(hours=48)).isoformat()
    delayed = await db["orders"].find(
        {"status": "SHIPPED", "shipment.created_at": {"$lte": thr}},
        {"_id": 0, "id": 1, "shipment.ttn": 1}
    ).limit(5).to_list(5)

    for o in delayed:
        ttn = o.get("shipment", {}).get("ttn", "-")
        incidents.append(f"⏳ #{o['id'][:8]} ТТН {ttn}")

    if not incidents:
        await message.answer("✅ Інцидентів немає! Все добре 👌")
    else:
        text = "🧯 <b>Інциденти:</b>\n\n"
        for i, inc in enumerate(incidents, 1):
            text += f"{i}. {inc}\n"
        text += "\nВикористайте /wizards для детальної обробки."
        await message.answer(text, parse_mode="HTML")


@dp.message(F.text == "⚙️ Налаштування")
async def menu_settings(message: types.Message):
    """Settings menu"""
    settings = await settings_repo.get()
    thresholds = settings.get("thresholds", {})

    await message.answer(
        f"⚙️ <b>Налаштування</b>\n\n"
        f"<b>Поточні пороги:</b>\n"
        f"• Велике замовлення: {thresholds.get('big_order_uah', 10000)} грн\n"
        f"• Затримка доставки: {thresholds.get('delivery_delay_hours', 48)} год\n"
        f"• Фейли сповіщень: {thresholds.get('notif_fail_streak', 5)}\n\n"
        f"Оберіть що змінити:",
        reply_markup=settings_menu_kb(),
        parse_mode="HTML"
    )


# ============= O20: PICKUP CONTROL (Повернення) =============

@dp.message(F.text == "📮 Повернення")
async def menu_pickup_control(message: types.Message):
    """Pickup control - at-risk parcels"""
    from datetime import datetime, timezone, timedelta

    now = datetime.now(timezone.utc)

    # Get shipments at risk (days_at_point >= 3)
    at_risk = await db["orders"].find(
        {
            "status": {"$in": ["SHIPPED", "shipped"]},
            "shipment.days_at_point": {"$gte": 3}
        },
        {"_id": 0, "id": 1, "shipment": 1, "totals": 1, "total_amount": 1}
    ).sort("shipment.days_at_point", -1).limit(10).to_list(10)

    if not at_risk:
        await message.answer(
            "📮 <b>Контроль повернень</b>\n\n"
            "✅ Немає посилок з ризиком повернення!\n"
            "Усі відправлення забирають вчасно.",
            parse_mode="HTML"
        )
        return

    total_risk_amount = 0
    text = "📮 <b>Контроль повернень</b>\n\n"
    text += f"⚠️ <b>Посилок під ризиком: {len(at_risk)}</b>\n\n"

    for o in at_risk:
        oid = o.get("id", "")[:8]
        shipment = o.get("shipment") or {}
        days = shipment.get("days_at_point", 0)
        ttn = shipment.get("ttn", "-")
        amount = float((o.get("totals") or {}).get(
            "grand") or o.get("total_amount") or 0)
        total_risk_amount += amount

        risk_emoji = "🔴" if days >= 5 else "🟡"
        text += f"{risk_emoji} #{oid} | ТТН <code>{ttn}</code>\n"
        text += f"   📅 Днів: {days} | 💰 {amount:.0f} грн\n"

    text += f"\n💰 <b>Під ризиком:</b> {total_risk_amount:,.0f} грн"
    text += "\n\n💡 Використайте веб-панель для масової розсилки нагадувань."

    await message.answer(text, parse_mode="HTML")


# ============= O16: RISK SCORE (Ризики) =============

@dp.message(F.text == "⚠️ Ризики")
async def menu_risk_scores(message: types.Message):
    """Risk scores - high-risk customers"""

    # Get high-risk customers
    high_risk = await db["users"].find(
        {"risk.band": "RISK"},
        {"_id": 0, "id": 1, "email": 1, "phone": 1, "full_name": 1, "risk": 1}
    ).sort("risk.score", -1).limit(10).to_list(10)

    if not high_risk:
        await message.answer(
            "⚠️ <b>Ризикові клієнти</b>\n\n"
            "✅ Немає клієнтів з високим ризиком!\n"
            "Система аналізує повернення, відмови та платіжну поведінку.",
            parse_mode="HTML"
        )
        return

    text = "⚠️ <b>Ризикові клієнти</b>\n\n"
    text += f"🔴 <b>Знайдено: {len(high_risk)}</b>\n\n"

    for c in high_risk:
        name = c.get("full_name") or c.get(
            "email") or c.get("phone") or "Невідомий"
        risk = c.get("risk") or {}
        score = risk.get("score", 0)
        reasons = ", ".join(risk.get("reasons", [])) or "-"

        text += f"🚨 <b>{name}</b>\n"
        text += f"   Скор: {score}/100 | {reasons}\n"

    text += "\n💡 Деталі та дії - у веб-панелі CRM."

    await message.answer(text, parse_mode="HTML")


# ============= O18: ANALYTICS (Аналітика) =============

@dp.message(F.text == "📈 Аналітика")
async def menu_analytics(message: types.Message):
    """Analytics intelligence - daily KPIs"""
    from datetime import datetime, timezone, timedelta

    today = datetime.now(timezone.utc).date().isoformat()
    yesterday = (datetime.now(timezone.utc) -
                 timedelta(days=1)).date().isoformat()

    # Get today's analytics
    today_stats = await db["analytics_daily"].find_one({"date": today}, {"_id": 0})
    yday_stats = await db["analytics_daily"].find_one({"date": yesterday}, {"_id": 0})

    # Fallback to real-time if no daily snapshot
    if not today_stats:
        # Calculate real-time
        orders_today = await db["orders"].count_documents({
            "created_at": {"$gte": today}
        })
        revenue_pipeline = [
            {"$match": {"created_at": {"$gte": today},
                        "payment_status": {"$in": ["paid", "completed"]}}},
            {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
        ]
        rev_result = await db["orders"].aggregate(revenue_pipeline).to_list(1)
        revenue_today = rev_result[0]["total"] if rev_result else 0

        customers_today = await db["users"].count_documents({
            "created_at": {"$gte": today}
        })

        today_stats = {
            "orders": orders_today,
            "revenue": revenue_today,
            "new_customers": customers_today
        }

    orders = today_stats.get("orders") or today_stats.get("orders_count", 0)
    revenue = today_stats.get("revenue") or today_stats.get("revenue_total", 0)
    customers = today_stats.get("new_customers", 0)
    aov = revenue / orders if orders > 0 else 0

    # Yesterday comparison
    yday_orders = (yday_stats.get("orders") or yday_stats.get(
        "orders_count", 0)) if yday_stats else 0
    yday_revenue = (yday_stats.get("revenue") or yday_stats.get(
        "revenue_total", 0)) if yday_stats else 0

    orders_diff = ((orders - yday_orders) / yday_orders *
                   100) if yday_orders > 0 else 0
    revenue_diff = ((revenue - yday_revenue) / yday_revenue *
                    100) if yday_revenue > 0 else 0

    orders_emoji = "📈" if orders_diff >= 0 else "📉"
    revenue_emoji = "📈" if revenue_diff >= 0 else "📉"

    text = "📈 <b>Аналітика сьогодні</b>\n\n"
    text += f"📦 <b>Замовлень:</b> {orders} {orders_emoji} {orders_diff:+.1f}%\n"
    text += f"💰 <b>Виручка:</b> {revenue:,.0f} грн {revenue_emoji} {revenue_diff:+.1f}%\n"
    text += f"🧾 <b>Середній чек:</b> {aov:,.0f} грн\n"
    text += f"👥 <b>Нових клієнтів:</b> {customers}\n"

    text += "\n💡 Повна аналітика у веб-панелі."

    await message.answer(text, parse_mode="HTML")


# ============= O14: GUARD (Fraud/KPI Alerts) =============

@dp.message(F.text == "🛡️ Guard")
async def menu_guard(message: types.Message):
    """Guard - fraud & KPI alerts"""

    # Get open incidents
    open_incidents = await db["guard_incidents"].find(
        {"status": "OPEN"},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)

    if not open_incidents:
        await message.answer(
            "🛡️ <b>Guard - Захист</b>\n\n"
            "✅ Немає відкритих інцидентів!\n\n"
            "Система моніторить:\n"
            "• 📉 Падіння конверсії/виручки\n"
            "• 🔄 Підозрілі повернення\n"
            "• ⚡ Burst замовлень\n"
            "• 💳 Платіжні аномалії",
            parse_mode="HTML"
        )
        return

    text = "🛡️ <b>Guard - Інциденти</b>\n\n"
    text += f"🚨 <b>Відкрито: {len(open_incidents)}</b>\n\n"

    for inc in open_incidents[:5]:  # Show max 5
        severity = inc.get("severity", "INFO")
        sev_emoji = {"CRITICAL": "🔴", "WARNING": "🟡",
                     "INFO": "🔵"}.get(severity, "⚪")
        title = inc.get("title", "Incident")
        inc_type = inc.get("type", "-")

        text += f"{sev_emoji} <b>{title}</b>\n"
        text += f"   Тип: {inc_type}\n"

    if len(open_incidents) > 5:
        text += f"\n... та ще {len(open_incidents) - 5} інцидентів"

    text += "\n\n💡 Деталі та дії - у веб-панелі."

    await message.answer(text, parse_mode="HTML")


# ============= CALLBACK HANDLERS =============

@dp.callback_query(F.data == "wiz:cancel")
async def cb_cancel(callback: types.CallbackQuery):
    """Cancel wizard"""
    await sessions_repo.clear(callback.from_user.id)
    await audit_repo.log(callback.from_user.id, "WIZ_CANCEL")
    await callback.message.edit_text(
        "✅ Дію скасовано.\n\nВикористайте /menu для повернення."
    )
    await callback.answer()


@dp.callback_query(F.data == "wiz:back")
async def cb_back(callback: types.CallbackQuery):
    """Back to main wizards menu"""
    await sessions_repo.set_state(callback.from_user.id, "ROOT", {})
    await callback.message.edit_text(
        "🧩 <b>Майстри</b>\n\nОберіть сценарій:",
        reply_markup=wizards_menu(),
        parse_mode="HTML"
    )
    await callback.answer()


# TTN Wizard callbacks
@dp.callback_query(F.data == "wiz:ttn:start")
async def cb_ttn_start(callback: types.CallbackQuery):
    """Start TTN wizard from inline"""
    await callback.message.edit_text(
        "📦 <b>Майстер ТТН</b>\n\n"
        "Надішліть ID замовлення або телефон клієнта:",
        reply_markup=cancel_kb(),
        parse_mode="HTML"
    )
    await sessions_repo.set_state(callback.from_user.id, "TTN:INPUT", {})
    await callback.answer()


@dp.callback_query(F.data.startswith("wiz:ttn:confirm:"))
async def cb_ttn_confirm(callback: types.CallbackQuery):
    """Confirm TTN creation"""
    order_id = callback.data.split(":")[-1]
    await ttn_wizard.confirm(callback, order_id)


@dp.callback_query(F.data.startswith("wiz:ttn:refresh:"))
async def cb_ttn_refresh(callback: types.CallbackQuery):
    """Refresh tracking"""
    order_id = callback.data.split(":")[-1]
    await ttn_wizard.refresh(callback, order_id)


@dp.callback_query(F.data.startswith("wiz:ttn:pdf:"))
async def cb_ttn_pdf(callback: types.CallbackQuery):
    """Get PDF"""
    ttn = callback.data.split(":")[-1]
    await ttn_wizard.pdf(callback, ttn)


@dp.callback_query(F.data.startswith("wiz:ttn:sms:"))
async def cb_ttn_sms(callback: types.CallbackQuery):
    """Send SMS"""
    order_id = callback.data.split(":")[-1]
    await ttn_wizard.sms(callback, order_id)


# Broadcast wizard callbacks
@dp.callback_query(F.data == "wiz:blast:start")
async def cb_blast_start(callback: types.CallbackQuery):
    """Start broadcast wizard"""
    await broadcast_wizard.start(callback)


@dp.callback_query(F.data.startswith("wiz:blast:seg:"))
async def cb_blast_segment(callback: types.CallbackQuery):
    """Set broadcast segment"""
    segment = callback.data.split(":")[-1]
    await broadcast_wizard.set_segment(callback, segment)


@dp.callback_query(F.data.startswith("wiz:blast:ch:"))
async def cb_blast_channel(callback: types.CallbackQuery):
    """Set broadcast channel"""
    channel = callback.data.split(":")[-1]
    await broadcast_wizard.set_channel(callback, channel)


@dp.callback_query(F.data == "wiz:blast:confirm")
async def cb_blast_confirm(callback: types.CallbackQuery):
    """Confirm broadcast"""
    await broadcast_wizard.confirm(callback)


# Incidents wizard callbacks
@dp.callback_query(F.data == "wiz:incidents:start")
async def cb_incidents_start(callback: types.CallbackQuery):
    """Start incidents wizard"""
    await incidents_wizard.start(callback)


@dp.callback_query(F.data == "wiz:inc:next")
async def cb_inc_next(callback: types.CallbackQuery):
    """Next incident"""
    await incidents_wizard.next_incident(callback)


@dp.callback_query(F.data.startswith("wiz:inc:refresh:"))
async def cb_inc_refresh(callback: types.CallbackQuery):
    """Refresh incident"""
    parts = callback.data.split(":")
    kind, key = parts[3], parts[4]
    await incidents_wizard.refresh(callback, kind, key)


@dp.callback_query(F.data.startswith("wiz:inc:sms:"))
async def cb_inc_sms(callback: types.CallbackQuery):
    """Send SMS for incident"""
    parts = callback.data.split(":")
    kind, key = parts[3], parts[4]
    await incidents_wizard.send_sms(callback, kind, key)


@dp.callback_query(F.data.startswith("wiz:inc:block:"))
async def cb_inc_block(callback: types.CallbackQuery):
    """Block customer for incident"""
    parts = callback.data.split(":")
    kind, key = parts[3], parts[4]
    await incidents_wizard.block(callback, kind, key)


# Order action callbacks (from alerts)
@dp.callback_query(F.data.startswith("create_ttn:"))
async def cb_create_ttn(callback: types.CallbackQuery):
    """Create TTN from alert"""
    order_id = callback.data.split(":")[1]
    await audit_repo.log(callback.from_user.id, f"ACTION_CREATE_TTN:{order_id}")

    await callback.message.answer(f"⏳ Створюю ТТН для {order_id}...")
    result = await actions_service.create_ttn(order_id)

    if result.get("ok"):
        ttn = result.get("ttn", "")
        await callback.message.answer(
            f"✅ ТТН створено!\n\n"
            f"ТТН: <code>{ttn}</code>",
            parse_mode="HTML"
        )
    else:
        await callback.message.answer(f"❌ Помилка: {result.get('error', 'Unknown')}")

    await callback.answer()


@dp.callback_query(F.data.startswith("mark_block:"))
async def cb_mark_block(callback: types.CallbackQuery):
    """Block customer"""
    order_id = callback.data.split(":")[1]
    await audit_repo.log(callback.from_user.id, f"ACTION_BLOCK:{order_id}")

    result = await actions_service.block_customer(order_id)

    if result.get("ok"):
        await callback.answer("🚫 Клієнта заблоковано!", show_alert=True)
    else:
        await callback.answer(f"❌ {result.get('error', 'Error')}", show_alert=True)


@dp.callback_query(F.data.startswith("refresh_ttn:"))
async def cb_refresh_ttn(callback: types.CallbackQuery):
    """Refresh TTN status"""
    order_id = callback.data.split(":")[1]
    result = await actions_service.refresh_tracking(order_id)

    if result.get("ok"):
        await callback.answer("🔄 Статус оновлено!")
    else:
        await callback.answer(f"❌ {result.get('error', 'Error')}", show_alert=True)


@dp.callback_query(F.data.startswith("send_sms:"))
async def cb_send_sms(callback: types.CallbackQuery):
    """Send SMS to customer"""
    order_id = callback.data.split(":")[1]
    result = await actions_service.send_sms(order_id)

    if result.get("ok"):
        await callback.answer("📨 SMS поставлено в чергу!", show_alert=True)
    else:
        await callback.answer(f"❌ {result.get('error', 'Error')}", show_alert=True)


@dp.callback_query(F.data.startswith("print_pdf:"))
async def cb_print_pdf(callback: types.CallbackQuery):
    """Get PDF URL"""
    ttn = callback.data.split(":")[1]
    url = await actions_service.get_pdf_url(ttn)

    await callback.message.answer(
        f"🖨 PDF етикетка: {url}",
        parse_mode="HTML"
    )
    await callback.answer()


@dp.callback_query(F.data.startswith("view_order:"))
async def cb_view_order(callback: types.CallbackQuery):
    """Show detailed order info"""
    order_id = callback.data.split(":", 1)[1]
    result = await actions_service.get_order_details(order_id)

    if not result.get("ok"):
        await callback.answer("❌ Замовлення не знайдено", show_alert=True)
        return

    o = result["order"]
    cust = o.get("customer") or {}
    deliv = o.get("delivery") or {}
    items = o.get("items") or []
    pay = o.get("payment") or {}

    # Items lines (max 10)
    item_lines = []
    for it in items[:10]:
        item_lines.append(
            f"• {it.get('title', '—')} × {it.get('quantity', 1)} — {float(it.get('price', 0)):.2f} ₴"
        )
    if len(items) > 10:
        item_lines.append(f"… і ще {len(items) - 10}")

    status_map = {
        "new": "🆕 Новий",
        "pending_payment": "⏳ Очікує оплати",
        "paid": "✅ Оплачено",
        "payment_failed": "❌ Помилка оплати",
        "refunded": "↩️ Повернення",
        "cancelled": "🚫 Скасовано",
        "awaiting_payment": "⏳ Очікує оплати",
    }
    status_ua = status_map.get(o.get("status", ""), o.get("status", "—"))

    pay_method_map = {
        "card": "💳 Картка (WayForPay)",
        "cash_on_delivery": "💵 Накладений платіж",
        "cash": "💵 Готівка",
    }
    pay_method_ua = pay_method_map.get(
        o.get("payment_method", ""), o.get("payment_method", "—"))

    text_parts = [
        f"📋 <b>Деталі замовлення</b>",
        f"",
        f"№ <code>{o.get('order_number', order_id)}</code>",
        f"📊 Статус: <b>{status_ua}</b>",
        f"",
        f"👤 <b>Клієнт</b>",
        f"{cust.get('full_name', '—')}",
        f"☎️ <code>{cust.get('phone', '—')}</code>",
    ]
    if cust.get("email"):
        text_parts.append(f"✉️ {cust.get('email')}")
    if cust.get("telegram_username"):
        text_parts.append(f"💬 @{cust.get('telegram_username')}")

    text_parts.extend([
        f"",
        f"📍 <b>Доставка</b>",
        f"{deliv.get('city_name', '—')}",
        f"{deliv.get('warehouse_name', '—')}",
    ])
    if deliv.get("tracking_number"):
        text_parts.append(
            f"📦 ТТН: <code>{deliv.get('tracking_number')}</code>")

    text_parts.extend([
        f"",
        f"🛒 <b>Товари ({len(items)})</b>",
        *item_lines,
        f"",
        f"💰 Підсумок: {float(o.get('subtotal', 0)):.2f} ₴",
        f"🚚 Доставка: {float(o.get('shipping_cost', 0)):.2f} ₴",
        f"💎 <b>Разом: {float(o.get('total_amount', 0)):.2f} ₴</b>",
        f"",
        f"💳 {pay_method_ua}",
    ])

    if pay.get("checkout_url") and o.get("status") == "pending_payment":
        text_parts.append(
            f"🔗 <a href=\"{pay['checkout_url']}\">Посилання на оплату</a>")
    if pay.get("paid_at"):
        text_parts.append(
            f"✅ Оплачено: {pay['paid_at'][:19].replace('T', ' ')}")

    text = "\n".join(text_parts)

    # Context-aware action buttons
    kb_rows = []

    # Contact customer (Telegram) — if we have username/id stored
    tg_id = cust.get("telegram_id")
    tg_username = cust.get("telegram_username")
    contact_url = None
    if tg_username:
        contact_url = f"https://t.me/{tg_username}"
    elif tg_id and not str(tg_id).startswith("sandbox"):
        contact_url = f"tg://user?id={tg_id}"
    if contact_url:
        kb_rows.append([types.InlineKeyboardButton(
            text="💬 Написати клієнту", url=contact_url)])

    if o.get("status") in ("paid", "new") and not deliv.get("tracking_number"):
        kb_rows.append([types.InlineKeyboardButton(
            text="📦 Створити ТТН", callback_data=f"create_ttn:{order_id}")])
    if deliv.get("tracking_number"):
        kb_rows.append([
            types.InlineKeyboardButton(
                text="🔄 Оновити статус", callback_data=f"refresh_ttn:{order_id}"),
            types.InlineKeyboardButton(
                text="🖨 PDF", callback_data=f"print_pdf:{deliv['tracking_number']}"),
        ])
    kb_rows.append([
        types.InlineKeyboardButton(
            text="📨 SMS клієнту", callback_data=f"send_sms:{order_id}"),
    ])
    kb_rows.append([
        types.InlineKeyboardButton(
            text="🚫 Блокувати клієнта", callback_data=f"mark_block:{order_id}"),
    ])
    kb = types.InlineKeyboardMarkup(inline_keyboard=kb_rows)

    try:
        await callback.message.answer(text, parse_mode="HTML", reply_markup=kb, disable_web_page_preview=True)
    except Exception as e:
        logger.warning(f"view_order render error: {e}")
        await callback.message.answer(text[:4000], parse_mode="HTML", reply_markup=kb, disable_web_page_preview=True)
    await callback.answer()


# ============= TEXT MESSAGE HANDLER (for wizard states) =============

@dp.message(F.text)
async def handle_text(message: types.Message):
    """Handle text based on current state"""
    session = await sessions_repo.get(message.from_user.id)
    state = session.get("state", "")

    # TTN wizard
    if state and state.startswith("TTN:"):
        handled = await ttn_wizard.handle_text(message)
        if handled:
            return

    # Broadcast wizard
    if state and state.startswith("BLAST:"):
        handled = await broadcast_wizard.handle_text(message)
        if handled:
            return

    # CRM search
    if state == "CRM:SEARCH":
        phone = message.text.strip()
        customer = await db["customers"].find_one(
            {"phone": {"$regex": phone, "$options": "i"}},
            {"_id": 0}
        )

        if customer:
            tags = ", ".join(customer.get("tags", [])) or "-"
            await message.answer(
                f"👤 <b>Клієнт знайдений</b>\n\n"
                f"☎️ Телефон: <code>{customer.get('phone', '-')}</code>\n"
                f"📧 Email: {customer.get('email', '-')}\n"
                f"📦 Замовлень: {customer.get('orders_count', 0)}\n"
                f"💰 LTV: {float(customer.get('total_spent', 0)):,.2f} грн\n"
                f"🏷 Сегмент: {customer.get('segment', '-')}\n"
                f"🏷 Теги: {tags}",
                parse_mode="HTML"
            )
        else:
            await message.answer("❌ Клієнта не знайдено.")

        await sessions_repo.clear(message.from_user.id)
        return

    # Default - show hint
    await message.answer(
        "ℹ️ Надішліть /menu для головного меню."
    )


# ============= BACKGROUND WORKERS =============

async def alerts_loop():
    """Background loop for sending alerts"""
    await alerts_worker.init()
    logger.info("🔔 Alerts worker started")

    while True:
        try:
            result = await alerts_worker.process_once()
            if result.get("processed", 0) > 0:
                logger.info(f"Alerts processed: {result}")
        except Exception as e:
            logger.error(f"Alerts worker error: {e}")

        await asyncio.sleep(10)


async def automation_loop():
    """Background loop for automation engine"""
    await automation_engine.init()
    logger.info("🤖 Automation engine started")

    while True:
        try:
            result = await automation_engine.run_once()
            if not result.get("skipped"):
                logger.info(f"Automation run: {result}")
        except Exception as e:
            logger.error(f"Automation engine error: {e}")

        await asyncio.sleep(600)  # Every 10 minutes


# ============= MAIN =============

async def main():
    """Main entry point"""
    print("=" * 50)
    print("🚀 Y-Store Telegram Admin Bot")
    print("=" * 50)

    logger.info("🚀 Starting Y-Store Telegram Admin Bot...")
    logger.info(f"Bot token: {TOKEN[:20]}...{TOKEN[-10:]}")
    logger.info(f"MongoDB: {MONGO_URL}")
    logger.info(f"DB: {DB_NAME}")

    # Get bot info
    bot_info = await bot.get_me()
    logger.info(f"✅ Bot connected: @{bot_info.username} (ID: {bot_info.id})")
    print(f"✅ Bot: @{bot_info.username}")

    # Initialize repos
    await alerts_repo.ensure_indexes()
    await sessions_repo.ensure_indexes()
    await audit_repo.ensure_indexes()
    logger.info("✅ Indexes created")

    # Get current settings
    settings = await settings_repo.get()
    chat_ids = settings.get("admin_chat_ids", [])
    user_ids = settings.get("admin_user_ids", [])
    logger.info(f"📬 Admin chat_ids: {chat_ids}")
    logger.info(f"👤 Admin user_ids: {user_ids}")

    # Start background tasks
    asyncio.create_task(alerts_loop())
    asyncio.create_task(automation_loop())

    # Встановити глобальну Menu Button → Mini App
    try:
        await bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(
                text="🛍 Магазин",
                web_app=WebAppInfo(url=TMA_URL),
            )
        )
        logger.info(f"✅ Menu button set to TMA: {TMA_URL}")
    except Exception as e:
        logger.warning(f"Menu button setup failed: {e}")

    print("=" * 50)
    print("✅ Bot ready! Starting polling...")
    print("Commands: /start, /menu, /shop, /wizards, /debug, /help")
    print("=" * 50)

    logger.info("✅ Bot ready, starting polling...")

    # Start polling with drop_pending_updates to avoid old messages
    await dp.start_polling(bot, drop_pending_updates=True)


if __name__ == "__main__":
    print("\n🤖 Launching Telegram Admin Bot...\n")
    asyncio.run(main())
