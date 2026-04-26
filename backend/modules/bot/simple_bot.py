"""
Y-Store - Telegram Bot (customer + admin mode)
• Customer: /start, /shop, /help, /about — Mini App entry
• Admin:    /be_admin activates Операційна панель reply-keyboard
            with live data for Orders / Deliveries / CRM / Finance / Returns / etc.
"""
import asyncio
import os
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from dotenv import load_dotenv

from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import (
    WebAppInfo,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    ReplyKeyboardMarkup,
    ReplyKeyboardRemove,
    KeyboardButton,
    MenuButtonWebApp,
    BotCommand,
)
from motor.motor_asyncio import AsyncIOMotorClient

# ------------------------------------------------------------------ CONFIG
ROOT_DIR = Path(__file__).parent.parent.parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
_app_url = (os.getenv("APP_URL") or "").rstrip("/")
TMA_URL = os.getenv("TMA_URL") or (f"{_app_url}/tma" if _app_url else "")
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "tma_store")

if not TOKEN:
    raise ValueError("TELEGRAM_BOT_TOKEN not set")

if not TMA_URL:
    raise ValueError("TMA_URL (or APP_URL) not set")

bot = Bot(token=TOKEN)
dp = Dispatcher()

# MongoDB
mongo = AsyncIOMotorClient(MONGO_URL)
db = mongo[DB_NAME]


# ------------------------------------------------------------------ CUSTOMER TEXTS
WELCOME_TEXT = """👋 <b>Вітаємо в Y-Store!</b>

🛒 <b>Інтернет-магазин на зв'язку — від побуту до фронтових потреб</b>

📦 <b>Що у нас є:</b>
• 🏠 Побутова техніка
• 💡 Освітлення
• 💄 Краса
• ❤️‍🩹 Здоров'я
• 🕯 Свічки та блекаут
• 🔌 Електроніка
• 🪖 Товари для військових

✨ <b>Переваги:</b>
• 🚚 Швидка доставка Новою Поштою
• 💳 Зручна оплата (картою або при отриманні)
• ✅ Перевірені постачальники
• 🛡 Повернення 14 днів без питань
• 💬 Підтримка 24/7

Натисніть кнопку нижче, щоб відкрити магазин 👇"""

SHOP_TEXT = """🛍 <b>Y-Store — Магазин</b>

Відкрийте каталог — побутова техніка, освітлення, краса, здоров'я, свічки та блекаут, електроніка, товари для військових.

📦 Оформлення замовлення — 2 хвилини
🚚 Доставка по всій Україні

Натисніть кнопку нижче:"""

HELP_TEXT = """📱 <b>Як користуватися ботом:</b>

1️⃣ Натисніть "🛍 Відкрити магазин"
2️⃣ Оберіть категорію — побутова техніка, освітлення, краса, здоров'я, свічки та блекаут, електроніка або товари для військових
3️⃣ Додайте товари в кошик
4️⃣ Оформіть замовлення та оберіть спосіб оплати

<b>Команди:</b>
/start  — Головна
/shop   — Відкрити магазин
/help   — Допомога
/about  — Про нас

<b>Підтримка:</b>
Напишіть нам через розділ "Підтримка" в магазині."""

ABOUT_TEXT = """ℹ️ <b>Про Y-Store</b>

🏪 Y-Store — український маркетплейс корисних речей: від техніки й побуту до того, що тримає тил та фронт.

<b>Наші категорії:</b>
• 🏠 Побутова техніка — для дому та кухні
• 💡 Освітлення — лампи, ліхтарі, налобники
• 💄 Краса — косметика, догляд
• ❤️‍🩹 Здоров'я — товари для здоров'я та відновлення
• 🕯 Свічки та блекаут — тепло та світло на випадок відключень
• 🔌 Електроніка — павербанки, кабелі, станції
• 🪖 Товари для військових — амуніція, аптечки, оптика

<b>Чому Y-Store:</b>
✅ Перевірений асортимент
✅ Прозора ціна
✅ Швидка доставка Новою Поштою
✅ Офіційна гарантія
✅ Повернення 14 днів

📧 support@y-store.ua
Дякуємо, що обрали Y-Store! 🎉"""

WEBAPP_KB = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text="🛍 Відкрити магазин", web_app=WebAppInfo(url=TMA_URL))]
])


# ------------------------------------------------------------------ ADMIN PANEL
def admin_kb() -> ReplyKeyboardMarkup:
    """Reply-keyboard для адміна — Операційна панель."""
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="📊 Операційна панель")],
            [KeyboardButton(text="📦 Замовлення"), KeyboardButton(text="🚚 Доставки")],
            [KeyboardButton(text="👤 CRM"), KeyboardButton(text="💰 Фінанси")],
            [KeyboardButton(text="📦 Майстер ТТН"), KeyboardButton(text="📣 Розсилка")],
            [KeyboardButton(text="📮 Повернення"), KeyboardButton(text="⚠️ Ризики")],
            [KeyboardButton(text="📈 Аналітика"), KeyboardButton(text="🛡️ Guard")],
            [KeyboardButton(text="🧯 Інциденти"), KeyboardButton(text="⚙️ Налаштування")],
            [KeyboardButton(text="🚪 Вийти з адмінки")],
        ],
        resize_keyboard=True,
        is_persistent=True,
    )


async def is_admin(user_id: int) -> bool:
    doc = await db.bot_admins.find_one({"telegram_id": int(user_id)}, {"_id": 0})
    return bool(doc)


async def make_admin(user_id: int, username: str | None = None):
    await db.bot_admins.update_one(
        {"telegram_id": int(user_id)},
        {"$set": {
            "telegram_id": int(user_id),
            "username": username,
            "activated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )


async def remove_admin(user_id: int):
    await db.bot_admins.delete_one({"telegram_id": int(user_id)})


def fmt_money(n: float | int | None) -> str:
    if not n:
        return "0 ₴"
    return f"{int(round(n)):,} ₴".replace(",", " ")


# ------------------------------------------------------------------ COMMAND HANDLERS
@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    await message.answer(WELCOME_TEXT, parse_mode="HTML", reply_markup=WEBAPP_KB)


@dp.message(Command("shop"))
async def cmd_shop(message: types.Message):
    await message.answer(SHOP_TEXT, parse_mode="HTML", reply_markup=WEBAPP_KB)


@dp.message(Command("help"))
async def cmd_help(message: types.Message):
    await message.answer(HELP_TEXT, parse_mode="HTML", reply_markup=WEBAPP_KB)


@dp.message(Command("about"))
async def cmd_about(message: types.Message):
    await message.answer(ABOUT_TEXT, parse_mode="HTML", reply_markup=WEBAPP_KB)


@dp.message(Command("be_admin"))
async def cmd_be_admin(message: types.Message):
    """Ativate admin mode — відкриває Операційну панель."""
    user = message.from_user
    await make_admin(user.id, user.username)
    logger.info(f"✅ Admin activated: id={user.id} @{user.username}")
    await message.answer(
        f"🛡 <b>Адмін-режим активовано</b>\n\n"
        f"Вітаємо, {user.first_name or 'Адмін'}! Знизу відкрилось меню Операційної панелі.",
        parse_mode="HTML",
        reply_markup=admin_kb(),
    )


# ============ ADMIN BUTTON HANDLERS (text match) ============

@dp.message(F.text == "📊 Операційна панель")
async def admin_ops(message: types.Message):
    if not await is_admin(message.from_user.id):
        return
    now = datetime.now(timezone.utc)
    today = now - timedelta(days=1)
    orders_total = await db.orders.count_documents({})
    orders_today = await db.orders.count_documents({"created_at": {"$gte": today.isoformat()}})
    agg = await db.orders.aggregate([
        {"$group": {"_id": None, "sum": {"$sum": "$total"}}}
    ]).to_list(length=1)
    revenue = agg[0]["sum"] if agg else 0
    users = await db.users.count_documents({})
    await message.answer(
        "📊 <b>Операційна панель</b>\n\n"
        f"📦 Замовлень усього: <b>{orders_total}</b>\n"
        f"📦 За 24 години: <b>{orders_today}</b>\n"
        f"💰 Виручка всього: <b>{fmt_money(revenue)}</b>\n"
        f"👤 Користувачів: <b>{users}</b>",
        parse_mode="HTML",
    )


@dp.message(F.text == "📦 Замовлення")
async def admin_orders(message: types.Message):
    if not await is_admin(message.from_user.id):
        return
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(length=10)
    if not orders:
        return await message.answer("📦 Замовлень поки немає")
    lines = ["📦 <b>Останні 10 замовлень</b>\n"]
    for o in orders:
        oid = (o.get("id") or "")[:8]
        status = o.get("status", "new")
        total = fmt_money(o.get("total"))
        lines.append(f"• <code>{oid}</code> • {status} • {total}")
    await message.answer("\n".join(lines), parse_mode="HTML")


@dp.message(F.text == "🚚 Доставки")
async def admin_deliveries(message: types.Message):
    if not await is_admin(message.from_user.id):
        return
    total = await db.orders.count_documents({"delivery.ttn": {"$exists": True}})
    pending = await db.orders.count_documents({"status": {"$in": ["new", "confirmed"]}})
    shipped = await db.orders.count_documents({"status": "shipped"})
    delivered = await db.orders.count_documents({"status": "delivered"})
    await message.answer(
        "🚚 <b>Доставки</b>\n\n"
        f"📮 ТТН створено: <b>{total}</b>\n"
        f"⏳ Чекають відправки: <b>{pending}</b>\n"
        f"🚛 В дорозі: <b>{shipped}</b>\n"
        f"✅ Доставлено: <b>{delivered}</b>",
        parse_mode="HTML",
    )


@dp.message(F.text == "👤 CRM")
async def admin_crm(message: types.Message):
    if not await is_admin(message.from_user.id):
        return
    total = await db.users.count_documents({})
    tma = await db.users.count_documents({"source": "telegram_tma"})
    last_7 = datetime.now(timezone.utc) - timedelta(days=7)
    active = await db.users.count_documents({"last_seen_at": {"$gte": last_7.isoformat()}})
    await message.answer(
        "👤 <b>CRM</b>\n\n"
        f"📋 База: <b>{total}</b>\n"
        f"📱 Через TMA: <b>{tma}</b>\n"
        f"🔥 Активні (7 днів): <b>{active}</b>",
        parse_mode="HTML",
    )


@dp.message(F.text == "💰 Фінанси")
async def admin_finance(message: types.Message):
    if not await is_admin(message.from_user.id):
        return
    today = datetime.now(timezone.utc) - timedelta(days=1)
    week = datetime.now(timezone.utc) - timedelta(days=7)
    month = datetime.now(timezone.utc) - timedelta(days=30)

    async def sum_since(since):
        agg = await db.orders.aggregate([
            {"$match": {"created_at": {"$gte": since.isoformat()}}},
            {"$group": {"_id": None, "sum": {"$sum": "$total"}, "count": {"$sum": 1}}},
        ]).to_list(length=1)
        return (agg[0]["sum"], agg[0]["count"]) if agg else (0, 0)

    d_sum, d_cnt = await sum_since(today)
    w_sum, w_cnt = await sum_since(week)
    m_sum, m_cnt = await sum_since(month)
    await message.answer(
        "💰 <b>Фінанси</b>\n\n"
        f"📅 24 год: <b>{fmt_money(d_sum)}</b> ({d_cnt} зам.)\n"
        f"📅 7 днів: <b>{fmt_money(w_sum)}</b> ({w_cnt} зам.)\n"
        f"📅 30 днів: <b>{fmt_money(m_sum)}</b> ({m_cnt} зам.)",
        parse_mode="HTML",
    )


@dp.message(F.text == "📦 Майстер ТТН")
async def admin_ttn(message: types.Message):
    if not await is_admin(message.from_user.id):
        return
    pending = await db.orders.count_documents({"status": {"$in": ["new", "confirmed"]}})
    await message.answer(
        "📦 <b>Майстер ТТН</b>\n\n"
        f"⏳ Чекають створення ТТН: <b>{pending}</b>\n\n"
        "Щоб створити ТТН — оберіть замовлення з підтвердженим статусом.\n"
        "<i>Повна інтеграція з Новою Поштою — в модулі /app/backend/novaposhta_service.py</i>",
        parse_mode="HTML",
    )


@dp.message(F.text == "📣 Розсилка")
async def admin_broadcast(message: types.Message):
    if not await is_admin(message.from_user.id):
        return
    audience = await db.users.count_documents({"source": "telegram_tma"})
    await message.answer(
        "📣 <b>Розсилка</b>\n\n"
        f"📨 Аудиторія TMA: <b>{audience}</b> користувачів\n\n"
        "Сегменти: VIP / REGULAR / RISK / NEW / УСІ.\n"
        "<i>Для масової розсилки відправте текст повідомлення після обрання сегменту.</i>",
        parse_mode="HTML",
    )


@dp.message(F.text == "📮 Повернення")
async def admin_returns(message: types.Message):
    if not await is_admin(message.from_user.id):
        return
    total = await db.returns.count_documents({}) if "returns" in await db.list_collection_names() else 0
    await message.answer(
        "📮 <b>Повернення</b>\n\n"
        f"📥 Запитів на повернення: <b>{total}</b>\n\n"
        "Термін повернення: 14 днів від дати отримання.",
        parse_mode="HTML",
    )


@dp.message(F.text == "⚠️ Ризики")
async def admin_risks(message: types.Message):
    if not await is_admin(message.from_user.id):
        return
    stuck = await db.orders.count_documents({
        "status": "shipped",
        "created_at": {"$lt": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()},
    })
    await message.answer(
        "⚠️ <b>Ризики</b>\n\n"
        f"🟠 Завислих відправлень (>5 днів): <b>{stuck}</b>\n"
        "🔴 Підозрілих клієнтів: <b>0</b>\n"
        "🟡 Невиконаних повернень: <b>0</b>",
        parse_mode="HTML",
    )


@dp.message(F.text == "📈 Аналітика")
async def admin_analytics(message: types.Message):
    if not await is_admin(message.from_user.id):
        return
    # Top categories by revenue
    pipe = [
        {"$unwind": "$items"},
        {"$group": {"_id": "$items.category", "revenue": {"$sum": "$items.price"}, "qty": {"$sum": "$items.quantity"}}},
        {"$sort": {"revenue": -1}},
        {"$limit": 5},
    ]
    rows = await db.orders.aggregate(pipe).to_list(length=5)
    lines = ["📈 <b>Аналітика — топ категорій</b>\n"]
    if rows:
        for r in rows:
            lines.append(f"• {r.get('_id') or '—'} — {fmt_money(r.get('revenue'))} · {r.get('qty')} шт")
    else:
        lines.append("Ще немає замовлень для аналітики.")
    await message.answer("\n".join(lines), parse_mode="HTML")


@dp.message(F.text == "🛡️ Guard")
async def admin_guard(message: types.Message):
    if not await is_admin(message.from_user.id):
        return
    admins_count = await db.bot_admins.count_documents({})
    sessions = await db.tma_sessions.count_documents({})
    await message.answer(
        "🛡 <b>Guard — безпека</b>\n\n"
        f"👑 Адмінів: <b>{admins_count}</b>\n"
        f"🔐 Активних TMA-сесій: <b>{sessions}</b>\n"
        "🚫 Заблокованих: <b>0</b>",
        parse_mode="HTML",
    )


@dp.message(F.text == "🧯 Інциденти")
async def admin_incidents(message: types.Message):
    if not await is_admin(message.from_user.id):
        return
    open_inc = 0
    try:
        open_inc = await db.incidents.count_documents({"status": "open"})
    except Exception:
        pass
    await message.answer(
        "🧯 <b>Інциденти</b>\n\n"
        f"🔴 Відкритих: <b>{open_inc}</b>\n"
        "🟢 Вирішених (7 днів): <b>0</b>",
        parse_mode="HTML",
    )


@dp.message(F.text == "⚙️ Налаштування")
async def admin_settings(message: types.Message):
    if not await is_admin(message.from_user.id):
        return
    await message.answer(
        "⚙️ <b>Налаштування</b>\n\n"
        f"🤖 Бот: <code>@Ystore_app_bot</code>\n"
        f"🛍 TMA: <code>{TMA_URL}</code>\n"
        f"💾 БД: <code>{DB_NAME}</code>\n"
        "📧 Підтримка: support@y-store.ua",
        parse_mode="HTML",
    )


@dp.message(F.text == "🚪 Вийти з адмінки")
async def admin_exit(message: types.Message):
    if not await is_admin(message.from_user.id):
        return
    await remove_admin(message.from_user.id)
    await message.answer(
        "🚪 Ви вийшли з адмін-режиму. Для повернення натисніть /be_admin",
        reply_markup=ReplyKeyboardRemove(),
    )


# ------------------------------------------------------------------ CALLBACK FALLBACK
@dp.callback_query(lambda c: c.data == "about")
async def callback_about(callback: types.CallbackQuery):
    await callback.message.answer(ABOUT_TEXT, parse_mode="HTML", reply_markup=WEBAPP_KB)
    await callback.answer()


# ------------------------------------------------------------------ BOT SETUP
async def set_bot_info():
    try:
        commands = [
            BotCommand(command="start", description="🏠 Головна"),
            BotCommand(command="shop", description="🛍 Відкрити магазин"),
            BotCommand(command="help", description="❓ Допомога"),
            BotCommand(command="about", description="ℹ️ Про магазин"),
            BotCommand(command="be_admin", description="🛡 Активувати адмін-панель"),
        ]
        await bot.set_my_commands(commands)
        logger.info("✅ Bot commands set")

        description = (
            "🛒 Y-Store — маркетплейс з доставкою по Україні.\n\n"
            "Категорії: побутова техніка, освітлення, краса, здоров'я, свічки та блекаут, "
            "електроніка, товари для військових.\n\n"
            "🚚 Доставка Новою Поштою\n"
            "💳 Зручна оплата\n"
            "🛡 Повернення 14 днів\n\n"
            "Натисніть /start щоб почати!"
        )
        await bot.set_my_description(description)
        logger.info("✅ Bot description set")

        short = (
            "🛒 Маркетплейс: побут, освітлення, краса, здоров'я, блекаут, електроніка, для військових."
        )
        await bot.set_my_short_description(short)
        logger.info("✅ Bot short description set")

        menu_button = MenuButtonWebApp(
            text="🛍 Магазин",
            web_app=WebAppInfo(url=TMA_URL),
        )
        await bot.set_chat_menu_button(menu_button=menu_button)
        logger.info(f"✅ Menu button set to: {TMA_URL}")
    except Exception as e:
        logger.error(f"❌ Failed to set bot info: {e}")


async def main():
    logger.info("🤖 Запуск Y-Store Bot...")
    try:
        await set_bot_info()
        me = await bot.get_me()
        logger.info(f"✅ Бот запущено: @{me.username}  id={me.id}")
        logger.info(f"🛍 TMA URL: {TMA_URL}")
        await dp.start_polling(bot)
    except Exception as e:
        logger.error(f"❌ Помилка бота: {e}")
        raise
    finally:
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
