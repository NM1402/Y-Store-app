<div align="center">

# 🛍 Y-Store Telegram Mini App

### Український маркетплейс в Telegram з повною e-commerce функціональністю

[![Bot](https://img.shields.io/badge/Telegram-@Ystore__app__bot-0088cc?logo=telegram)](https://t.me/Ystore_app_bot)
[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.118-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6%2B-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Status](https://img.shields.io/badge/Status-Ready%20for%20handoff-brightgreen)](docs/02_HANDOFF.md)

**Готовий до інтеграції з головним сайтом `y-store.in.ua`**

[🚀 Швидкий старт](#-швидкий-старт-5-хвилин) •
[📐 Архітектура](#-архітектура) •
[🔌 Інтеграція](#-інтеграція-з-сайтом) •
[📚 Документація](#-документація) •
[🧪 Тестування](#-тестування)

</div>

---

## 📖 Зміст

- [Що це таке](#-що-це-таке)
- [Огляд функціональності](#-огляд-функціональності)
- [Стек технологій](#-стек-технологій)
- [Структура репозиторію](#-структура-репозиторію)
- [Швидкий старт](#-швидкий-старт-5-хвилин)
- [Архітектура](#-архітектура)
- [Інтеграція з сайтом](#-інтеграція-з-сайтом-y-storeinua)
- [Що вже працює з коробки](#-що-вже-працює-з-коробки)
- [API Reference](#-api-reference)
- [Моделі даних](#-моделі-даних)
- [Flows (потоки даних)](#-flows-потоки-даних)
- [Environment](#%EF%B8%8F-environment-variables)
- [Deployment](#-deployment)
- [Тестування](#-тестування)
- [Документація](#-документація)
- [FAQ](#-faq)

---

## 🎯 Що це таке

**Y-Store TMA** — повнофункціональна **Telegram Mini App** для інтернет-магазину `y-store.in.ua`.
Це окремий сервіс, який **ізольовано** працює з Telegram-юзерами і інтегрується з основним сайтом через **одну адаптерну прошарку** (`site_adapter.py`).

### Переваги ізольованого модуля

✅ **Один токен — один запуск.** Розробник сайту отримує папку, заповнює `.env`, запускає `deploy.sh` — і все працює.
✅ **Нова Пошта всередині.** Автокомплит міст, відділень, автоматичне створення ТТН з sender-counterparty ФОП.
✅ **WayForPay всередині.** Створення платежів, HMAC-підпис, webhook-обробка, signed-response.
✅ **Telegram Bot всередині.** Aiogram polling, menu-button, admin-panel, алерти про замовлення.
✅ **Каталог — точка інтеграції.** Одна функція адаптера підключає реальний каталог з сайту.

---

## 🎨 Огляд функціональності

<table>
<tr>
<td width="50%">

### 🛒 Для покупця
- Авторизація через Telegram initData (HMAC_SHA256)
- Перегляд каталогу з категоріями
- Пошук товарів з live-підказками
- Картка товару з "Часто купують разом"
- Обрані (favorites) + історія переглядів
- Кошик (localStorage + Zustand)
- 4-крокове оформлення замовлення:
  1. Контакти (з валідацією UA-операторів)
  2. Нова Пошта (BottomSheet picker)
  3. Оплата (card / cash on delivery)
  4. Підтвердження
- Оплата карткою через WayForPay
- Трекінг статусу замовлення з ТТН
- Відгуки про товар + оцінки
- Саппорт-тікети з Telegram-алертами

</td>
<td width="50%">

### 👨‍💼 Для адміна (в Telegram-боті)
- `/be_admin <password>` → операційна панель
- Алерти про нові замовлення
- Алерти про оплату (WayForPay webhook)
- Створення ТТН вручну (якщо потрібно)
- Затримки доставки (>24 год) — автоматичні
- CRM сегменти (REGULAR/RISK)
- Finance ledger
- Повернення та incident management
- Маркетинговий broadcast wizard
- Support tickets з inline-кнопками відповіді
- Inline-кнопки в алертах:
  - 💬 Написати клієнту (t.me/@username)
  - 📦 Створити ТТН
  - 👁 Деталі замовлення

</td>
</tr>
</table>

---

## 🧰 Стек технологій

| Шар | Технологія | Версія |
|---|---|---|
| **Backend** | FastAPI + Uvicorn | 0.118 |
| | MongoDB (Motor async driver) | 6+ |
| | aiogram (Telegram bot) | 3.27 |
| | httpx (async HTTP client) | 0.28 |
| | Pydantic v2 | 2.11 |
| **Frontend** | React | 19.0 |
| | Zustand (state management) | 5.0 |
| | react-router-dom | 7.5 |
| | lucide-react (icons) | 0.507 |
| | Tailwind CSS | 3.4 |
| | CRA + craco | 7.1 |
| **DevOps** | supervisor | 4+ |
| | nginx | 1.20+ |
| | systemd / Docker | opt. |
| **External APIs** | Telegram Bot API | v7 |
| | Nova Poshta API | v2.0 |
| | WayForPay | Pay API v1 |

---

## 📁 Структура репозиторію

```
/
├── 📖 README.md                      ← ВИ ТУТ (головна сторінка GitHub)
│
├── 📦 tma-package/                   ← ⭐ ІЗОЛЬОВАНИЙ ПАКЕТ ДЛЯ ДЕВА
│   ├── README.md                        master entry point (карта + 5 кроків)
│   ├── MANIFEST.json                    machine-readable metadata
│   ├── STRUCTURE.txt                    повне дерево файлів
│   ├── backend/                         full snapshot без __pycache__
│   ├── frontend/                        full snapshot без node_modules
│   ├── docs/                            6 MD файлів (архітектура, handoff, ключі, ...)
│   ├── config/                          env.example, nginx, supervisor
│   ├── scripts/                         deploy.sh + smoke_test.sh
│   └── integration/                     site_adapter.py скелет
│
├── 🔧 backend/                       ← РОБОЧИЙ backend (FastAPI, port 8001)
│   ├── server.py                        FastAPI entry
│   ├── requirements.txt                 Python dependencies
│   ├── .env                             бойові секрети (НЕ комітити!)
│   ├── core/                            config, db, models, security
│   └── modules/
│       ├── tma/                         /api/tma/* gateway
│       │   ├── routes.py                BFF endpoints (auth, catalog, orders, …)
│       │   ├── nova_poshta_routes.py    /api/tma/np/cities|warehouses
│       │   └── site_adapter.py          ⚡ ТОЧКА ІНТЕГРАЦІЇ З САЙТОМ
│       ├── payments/
│       │   ├── wayforpay_routes.py      /api/v2/payments/wayforpay/*
│       │   └── providers/wayforpay/     HMAC_MD5 signature + create/webhook/refund
│       ├── delivery/np/                 Nova Poshta (client, TTN, tracking)
│       ├── bot/
│       │   ├── simple_bot.py            aiogram polling (supervisor-managed)
│       │   ├── bot_actions_service.py   create_ttn, mark_block, SMS
│       │   ├── alerts_service.py        черга алертів → Telegram
│       │   └── wizards/                 TTN/Broadcast/Incidents wizards
│       ├── shop_routes.py               /api/tma/favorites, reviews, support
│       ├── seed_routes.py               auto-seed (8 categories + 20 products)
│       └── ...                          analytics, crm, finance, returns, …
│
├── 🎨 frontend/                      ← РОБОЧИЙ frontend (React, port 3000)
│   ├── package.json                     Node dependencies
│   ├── .env                             REACT_APP_BACKEND_URL
│   ├── craco.config.js                  CRA override
│   └── src/
│       ├── App.js                       root router (/ → web site, /tma → TMA)
│       └── tma-mobile/
│           ├── App.jsx                  TMA routes + ResizeObserver adapter
│           ├── lib/                     api-client, telegram-sdk, np-client, validators
│           ├── store/                   Zustand slices (cart, auth, user, checkout)
│           ├── screens/                 12 екранів (Home, Catalog, Product, Checkout, ...)
│           ├── components/              ProductCard, BottomNav, NovaPoshtaPicker, ...
│           ├── hooks/
│           └── styles/                  design-tokens.css + responsive-fix.css
│
├── 📚 docs у корені                  ← для зручного перегляду через GitHub
│   ├── INTEGRATION_AUDIT.md             повна архітектура (13 розділів)
│   ├── HANDOFF_CONFIRMATION.md          executive summary
│   ├── INTEGRATION.md                   оригінальний playbook з ключами
│   ├── HANDOFF.md                       технічна пам'ятка
│   ├── design_guidelines.md             UI/UX гайдлайни
│   └── plan.md                          історія фаз розробки
│
├── 🧠 memory/
│   ├── PRD.md                           product requirements + dev-лог
│   └── test_credentials.md              тестові облікові дані
│
└── 🧪 tests/                         placeholder для E2E-тестів
```

---

## 🚀 Швидкий старт (5 хвилин)

### Варіант 1 — через готовий пакет

```bash
git clone https://github.com/svetlanaslinko057/dedede2333.git
cd dedede2333/tma-package

# 1. Налаштувати environment
cp config/env.example ../backend/.env          # заповнити URLs під свій домен
cp frontend/.env.example ../frontend/.env

# 2. Одна команда розгортання
./scripts/deploy.sh

# 3. Перевірка
./scripts/smoke_test.sh
```

### Варіант 2 — manually

```bash
# Backend
cd backend
pip install -r requirements.txt
cp ../tma-package/config/env.example .env      # відредагувати
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Frontend (в новому терміналі)
cd frontend
yarn install
cp ../tma-package/frontend/.env.example .env
yarn start                                      # стартує на :3000

# Telegram bot (в новому терміналі або через supervisor)
cd backend
python -m modules.bot.simple_bot
```

**Готово:** TMA доступна на `http://localhost:3000/tma`, backend на `http://localhost:8001/api/*`.

---

## 📐 Архітектура

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TELEGRAM                                     │
│  ┌──────────────────────┐      ┌─────────────────────────────────┐  │
│  │  @Ystore_app_bot     │      │  TMA WebApp                     │  │
│  │  aiogram polling     │      │  React 19 + Zustand             │  │
│  │  MenuButton→TMA      │      │  mount /tma/*                   │  │
│  └──────────┬───────────┘      └──────────┬──────────────────────┘  │
└─────────────┼─────────────────────────────┼─────────────────────────┘
              │                             │  HTTPS
              ▼                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    TMA SERVICE (цей пакет)                           │
│                                                                      │
│  FastAPI :8001                                                       │
│    ├── /api/health                   liveness                        │
│    ├── /api/tma/auth                 HMAC_SHA256 initData            │
│    ├── /api/tma/products             ← через site_adapter            │
│    ├── /api/tma/categories           ← через site_adapter            │
│    ├── /api/tma/orders               ← +auto-TTN +WFP session        │
│    ├── /api/tma/np/cities            Nova Poshta autocomplete        │
│    ├── /api/tma/np/warehouses                                        │
│    └── /api/v2/payments/wayforpay/   webhook + create + refund       │
│                                                                      │
│  MongoDB (database: tma_store)                                       │
│    └── 9 collections (auto-indexed on startup)                       │
│                                                                      │
│  Supervisor processes:                                               │
│    ├── backend        (FastAPI :8001)                                │
│    ├── frontend       (React :3000 or nginx static)                  │
│    └── telegram_bot   (aiogram polling)                              │
│                                                                      │
│        ▼ site_adapter.py (ЄДИНА точка інтеграції з сайтом)           │
└────────┼────────────┬────────────┬───────────────────┬───────────────┘
         ▼            ▼            ▼                   ▼
  ┌──────────┐ ┌───────────┐ ┌───────────┐      ┌──────────────┐
  │ y-store  │ │ Nova      │ │ WayForPay │      │  Telegram    │
  │ .in.ua   │ │ Poshta    │ │ HMAC_MD5  │      │  Bot API     │
  │ (сайт)   │ │ API v2.0  │ │ + webhook │      │              │
  └──────────┘ └───────────┘ └───────────┘      └──────────────┘
```

**Детальна архітектура** з flow-діаграмами — у [`INTEGRATION_AUDIT.md`](INTEGRATION_AUDIT.md).

---

## 🔌 Інтеграція з сайтом `y-store.in.ua`

### Концепція

TMA **НЕ дублює** бізнес-логіку сайту. Замість цього, дев заповнює **один файл** — `backend/modules/tma/site_adapter.py` — який проксує запити до API сайту.

### Що заповнює дев

```python
# backend/modules/tma/site_adapter.py

class SiteAdapter:
    # ========== Обов'язкові ==========
    async def list_products(self, filters: dict) -> list[dict]:
        """GET /api/v1/products → нормалізувати у TMAProductOut"""
        ...

    async def get_product(self, pid: str) -> Optional[dict]:
        """GET /api/v1/products/{pid} + related → TMAProductOut"""
        ...

    async def list_categories(self) -> list[dict]:
        """GET /api/v1/categories → нормалізувати у TMACategoryOut"""
        ...

    # ========== Бажані (для єдиної CRM) ==========
    async def register_order(self, tma_order: dict) -> dict:
        """POST /api/v1/orders/import (idempotent за order_number)"""
        ...

    async def match_user(self, telegram_id, ...) -> Optional[dict]:
        """Link TMA user з профілем сайту"""
        ...
```

### Feature-flag

```bash
# .env
SITE_ADAPTER_ENABLED=0   # seed caталог (local MongoDB)
SITE_ADAPTER_ENABLED=1   # реальний каталог з сайту
```

Поки `0` — TMA працює на seed-каталозі з **20 товарів і 8 категорій**, які автоматично створюються при першому запуску. Це дозволяє **працювати без інтеграції** з першого дня.

### Детальний гід по інтеграції

👉 **[docs/01_ARCHITECTURE.md §5](tma-package/docs/01_ARCHITECTURE.md)** — повні приклади HTTP-запитів, нормалізаторів, feature-flag, режими (read-through / cache-aside / webhook-based).

---

## ✅ Що вже працює з коробки

| Модуль | Внутрі пакета? | Статус | Перевірено |
|---|---|---|---|
| 🤖 Telegram Bot `@Ystore_app_bot` | ✅ 100% | Ready | polling активний, menu-button встановлений |
| 💳 WayForPay (create + HMAC + webhook + refund + signed-response) | ✅ 100% | Ready | payment_url генерується, підпис валідний |
| 📦 Nova Poshta (autocomplete + TTN + tracking) | ✅ 100% | Ready | **Реальна ТТН `20451419147533`** створена через API |
| 🔐 Telegram Auth (HMAC_SHA256 initData + sessions) | ✅ 100% | Ready | TTL 30 днів, auto-cleanup |
| 🛒 Cart/Checkout (4-step wizard) | ✅ 100% | Ready | UA-оператори, card+COD, sandbox |
| ⭐ Favorites / Reviews / Support | ✅ 100% | Ready | Tickets з Telegram-алертами |
| 📱 Адаптивний фронт (280px → 720px) | ✅ 100% | Ready | Fluid typography, однакова висота карток |
| 📋 Валідація UA-телефонів | ✅ 100% | Ready | Kyivstar/Vodafone/lifecell/Intertelecom/3Mob/Ukrtelecom |
| 📚 **Каталог** (продукти+категорії) | 🔌 Адаптер | ⚠ Seed | Дев заповнює 3 функції |
| 🧾 **Дзеркало замовлень** у CRM сайту | 🔌 Адаптер | ⚠ Off | Дев заповнює `register_order` |

---

## 📡 API Reference

### Telegram BFF (префікс `/api/tma`)

| Method | Path | Auth | Опис |
|---|---|---|---|
| POST | `/auth` | ❌ | Telegram initData → session token |
| GET | `/me` | ✅ | Поточний user |
| GET | `/home` | ❌ | Banners + categories + bestsellers + new arrivals |
| GET | `/categories` | ❌ | Всі категорії |
| GET | `/products` | ❌ | `?q=&category=&sort=&limit=&skip=` |
| GET | `/products/{id}` | ❌ | Товар + related |
| GET | `/search/suggest` | ❌ | Live suggestions `?q=&limit=6` |
| POST | `/cart/preview` | ❌ | Розрахунок підсумку з актуальними цінами |
| POST | `/orders` | ✅ | Створити замовлення (+auto-TTN +WFP session) |
| GET | `/orders` | ✅ | Історія замовлень user'а |
| GET | `/orders/{id}` | ✅ | Одне замовлення (для полінгу статусу) |
| DELETE | `/orders/{id}` | ✅ | Тільки неоплачені без ТТН |
| GET | `/np/cities?q=` | ❌ | Nova Poshta cities autocomplete |
| GET | `/np/warehouses?city_ref=&q=` | ❌ | Warehouses по місту |
| GET/POST | `/favorites*` | ✅ | Обрані товари |
| POST | `/reviews` | ✅ | Залишити відгук |
| GET/POST | `/support/tickets*` | ✅ | Саппорт |
| GET | `/store-info` | ❌ | ФОП, реквізити, контакти |

### Payments (публічні)

| Method | Path | Опис |
|---|---|---|
| POST | `/api/v2/payments/wayforpay/create` | Створити WFP-сесію |
| **POST** | **`/api/v2/payments/wayforpay/webhook`** | **Callback з WFP (HMAC-signed)** |
| GET | `/api/v2/payments/wayforpay/status/{order}` | Прямий статус |
| POST | `/api/v2/payments/wayforpay/refund` | Рефанд (full/partial) |

### Health

| Method | Path |
|---|---|
| GET | `/api/health` |

**Повний список (35+ endpoints)** — [`docs/01_ARCHITECTURE.md §9`](INTEGRATION_AUDIT.md).

---

## 🗂 Моделі даних

MongoDB database `tma_store` — 9 колекцій, всі індекси створюються автоматично на startup.

<details>
<summary><b>👉 Показати схеми</b></summary>

### `users`
```js
{
  id: "uuid",
  telegram_id: "577782582",
  telegram_username: "ivanov",
  full_name: "Іван Тестенко",
  email: null, phone: null,
  role: "customer",
  source: "telegram_tma",
  created_at: ISO, last_seen_at: ISO,
  site_user_id: null       // заповнюється адаптером після match_user()
}
```

### `products`
```js
{
  id: "uuid", slug: "iphone-15-pro-max-...",
  title: "iPhone 15 Pro Max 256GB",
  brand: "Apple",
  category_id: "uuid", category_slug: "smartphones",
  description: "...",
  price: 59999, old_price: 64999,
  images: ["https://..."],
  in_stock: true, is_bestseller: true,
  rating: 4.9, reviews_count: 124,
  specifications: {"Екран": "6.7\"", ...}
}
```

### `orders`
```js
{
  id: "uuid",
  order_number: "TMA-20260419-A7D689",   // → WayForPay orderReference
  buyer_id: "<users.id>",
  source: "telegram_tma",
  customer: {full_name, phone, email, telegram_id, telegram_username},
  delivery: {
    method: "nova_poshta",
    city_name, city_ref,                  // ОБОВ'ЯЗКОВО
    warehouse_name, warehouse_ref,         // ОБОВ'ЯЗКОВО
    tracking_number: "20451419119553",
    tracking_provider: "novaposhta"
  },
  items: [{product_id, title, quantity, price, image}],
  subtotal, shipping_cost, total_amount,
  status: "new|pending_payment|paid|processing|shipped|delivered|cancelled|refunded",
  payment_method: "card|cash_on_delivery",
  payment: {provider, status, checkout_url, auth_code, card_pan, paid_at},
  created_at, updated_at
}
```

**Усі інші колекції** (`tma_sessions`, `categories`, `tma_favorites`, `reviews`, `tma_support_tickets`, `bot_settings`) — [`docs/01_ARCHITECTURE.md §4`](INTEGRATION_AUDIT.md).

</details>

---

## 🔄 Flows (потоки даних)

### 1️⃣ Авторизація

```
Telegram WebApp → відкриває /tma → lib/telegram-sdk.js збирає WebApp.initData
         ↓
POST /api/tma/auth { init_data }
         ↓
validate_init_data(HMAC_SHA256, BOT_TOKEN)  ← стандарт Telegram
         ↓
users.upsert (telegram_id) + tma_sessions.insert (token UUID, TTL 30д)
         ↓
Response: { token, user }
         ↓
localStorage.tma_token → axios Authorization: Bearer <token>
```

### 2️⃣ Замовлення cash_on_delivery (все в TMA)

```
Checkout step 4 → POST /api/tma/orders
         ↓
orders.insert (status="new")
         ↓
BotActionsService.create_ttn(order_id)   ← Nova Poshta InternetDocument.save
         ↓
orders.delivery.tracking_number = "20451419..."
         ↓
AlertsService.alert_new_order → admin_chat_ids (Telegram)
         ↓ [якщо USE_ADAPTER]
site_adapter.register_order → POST {SITE_API}/v1/orders/import
```

### 3️⃣ Замовлення card (WayForPay)

```
Checkout → POST /api/tma/orders (payment_method="card")
         ↓
WayForPayProvider.create_payment(order)
         ↓  HMAC_MD5 signature
POST https://secure.wayforpay.com/pay → payment_url
         ↓
orders.payment.checkout_url = payment_url
         ↓
Frontend: telegram.openLink(payment_url) → користувач оплачує
         ↓
         ↓ ← callback:
POST /api/v2/payments/wayforpay/webhook
         ↓  verify HMAC
orders.status = "paid"
         ↓
BotActionsService.create_ttn (auto)
         ↓
Signed-response: {orderReference, status: "accept", time, signature}
         ↓ [якщо USE_ADAPTER]
site_adapter.register_order (status=paid + tracking_number)
```

**Повний список flows** (Nova Poshta, checkout, авторизація, bot commands) — [`docs/01_ARCHITECTURE.md §3`](INTEGRATION_AUDIT.md).

---

## ⚙️ Environment variables

<details>
<summary><b>👉 Показати повний список (.env)</b></summary>

```bash
# --- MongoDB ---
MONGO_URL="mongodb://localhost:27017"
DB_NAME="tma_store"
CORS_ORIGINS="https://y-store.in.ua,https://tma.y-store.in.ua"

# --- Telegram Bot (@Ystore_app_bot) ---
TELEGRAM_BOT_TOKEN="8524617770:AAECLj0A8wTjg3cy-KxYcIkvlK4HE3VROqY"
TMA_URL="https://tma.y-store.in.ua/tma"
APP_URL="https://tma.y-store.in.ua"
TMA_ALLOW_SANDBOX="0"                     # 0 у production!

# --- Nova Poshta (sender: ФОП Тищенко О.М.) ---
NOVAPOSHTA_API_KEY="5cb1e3ebc23e75d737fd57c1e056ecc9"
NP_API_KEY="5cb1e3ebc23e75d737fd57c1e056ecc9"
NP_SENDER_NAME="Y-Store"
NP_SENDER_PHONE="380637247703"
NP_SENDER_COUNTERPARTY_REF="07f0c105-442e-11ea-8133-005056881c6b"
NP_SENDER_CONTACT_REF="4deeee78-44d2-11ea-8133-005056881c6b"
NP_SENDER_CITY_REF="8d5a980d-391c-11dd-90d9-001a92567626"
NP_SENDER_WAREHOUSE_REF="1ec09d88-e1c2-11e3-8c4a-0050568002cf"

# --- WayForPay ---
WAYFORPAY_MERCHANT_ACCOUNT="y_store_in_ua"
WAYFORPAY_MERCHANT_SECRET="4f27e43c7052b31c5df78863e0119b51b1e406ef"
WAYFORPAY_MERCHANT_PASSWORD="a6fcf5fe2a413bdd25bb8b2e7100663a"
WAYFORPAY_MERCHANT_DOMAIN="y-store.in.ua"
WAYFORPAY_RETURN_URL="https://tma.y-store.in.ua/tma/order-success"
WAYFORPAY_SERVICE_URL="https://tma.y-store.in.ua/api/v2/payments/wayforpay/webhook"

# --- JWT ---
JWT_SECRET_KEY="<openssl rand -hex 32>"
JWT_ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_DAYS="7"

# --- Site integration (optional, default: off) ---
SITE_ADAPTER_ENABLED="0"
SITE_API_URL="https://api.y-store.in.ua"
SITE_API_TOKEN="<service-to-service>"
```

</details>

Template з коментарями: [`tma-package/config/env.example`](tma-package/config/env.example).

---

## 🚢 Deployment

### nginx (production)

```nginx
server {
    listen 443 ssl http2;
    server_name tma.y-store.in.ua;

    ssl_certificate     /etc/letsencrypt/live/tma.y-store.in.ua/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tma.y-store.in.ua/privkey.pem;

    # Telegram WebApp security headers
    add_header Content-Security-Policy "frame-ancestors https://web.telegram.org https://t.me;" always;

    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location / {
        root /opt/tma/frontend/build;
        try_files $uri /index.html;
    }
}
```

**Повний config з обома варіантами** (окремий домен / reverse-proxy): [`tma-package/config/nginx_example.conf`](tma-package/config/nginx_example.conf).

### supervisor

```ini
[program:telegram_bot]
command=/opt/tma/venv/bin/python -m modules.bot.simple_bot
directory=/opt/tma/backend
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/telegram_bot.err.log
```

Готовий config: [`tma-package/config/supervisord_telegram_bot.conf`](tma-package/config/supervisord_telegram_bot.conf).

### Налаштування @BotFather

1. Відкрити [@BotFather](https://t.me/botfather) → `/mybots` → `@Ystore_app_bot`
2. **Bot Settings → Menu Button** → URL: `https://tma.y-store.in.ua/tma`, Text: `🛍 Магазин`
3. **Domain** → `https://tma.y-store.in.ua`

### Налаштування WayForPay кабінету

1. Увійти в `https://m.wayforpay.com` → Мерчанти → `y_store_in_ua`
2. **Налаштування** → **«URL для серверного зворотного повідомлення»** →
   `https://tma.y-store.in.ua/api/v2/payments/wayforpay/webhook`
3. Перевірити IP-whitelist (якщо увімкнений — додати IP сервера)

---

## 🧪 Тестування

### Smoke test (7 точок)

```bash
./tma-package/scripts/smoke_test.sh
```

Перевіряє:
1. `/api/health` → `{"status":"ok"}`
2. `/api/tma/categories` → count > 0
3. `/api/tma/products?limit=5`
4. `/api/tma/auth` (sandbox mode)
5. `/api/tma/np/cities?q=ки`
6. `/api/tma/store-info`
7. Telegram bot `/getMe`

### Ручне тестування в dev

```bash
# 1. Sandbox auth (потрібно TMA_ALLOW_SANDBOX=1)
TOKEN=$(curl -s -X POST localhost:8001/api/tma/auth \
  -H "Content-Type: application/json" \
  -d '{"init_data":"sandbox:99999"}' | jq -r .token)

# 2. Test COD order
curl -X POST localhost:8001/api/tma/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"product_id":"<real_id>","quantity":1}],
    "full_name":"Тищенко Олексій",
    "phone":"+380501234567",
    "city":"Київ","city_ref":"8d5a980d-391c-11dd-90d9-001a92567626",
    "warehouse":"Відділення №1",
    "warehouse_ref":"1ec09d88-e1c2-11e3-8c4a-0050568002cf",
    "payment_method":"cash_on_delivery"
  }' | jq '{id, tracking:.delivery.tracking_number, status}'
```

Очікуваний вихід:
```json
{
  "id": "cf53b745-63bf-41e1-819b-ae84232d0d79",
  "tracking": "20451419147533",
  "status": "processing"
}
```

---

## 📚 Документація

### Для швидкого старту
1. 🏁 [`tma-package/README.md`](tma-package/README.md) — карта пакета, 5 кроків
2. 🚀 [`HANDOFF_CONFIRMATION.md`](HANDOFF_CONFIRMATION.md) — executive summary + dev-чеклист

### Для глибокого занурення
3. 🏛 [`INTEGRATION_AUDIT.md`](INTEGRATION_AUDIT.md) — повна архітектура (13 розділів, ~700 рядків):
   - Структура проекту з мапою файлів
   - 7 flow-діаграм (auth, catalog, cart, checkout, WFP webhook, NP TTN, bot)
   - Моделі даних (9 колекцій з повними схемами)
   - Скелет `site_adapter.py` з прикладами
   - Environment variables (повний список)
   - Deployment checklist
   - 14 виявлених нюансів/TODO
   - Повний API-reference
4. 🔑 [`INTEGRATION.md`](INTEGRATION.md) — оригінальний playbook з усіма реальними ключами
5. 📝 [`HANDOFF.md`](HANDOFF.md) — технічна пам'ятка (nuances, checklists)
6. 🎨 [`design_guidelines.md`](design_guidelines.md) — UI/UX дизайн-система
7. 📅 [`plan.md`](plan.md) — історія фаз розробки
8. 🧠 [`memory/PRD.md`](memory/PRD.md) — dev-log по сесіях

---

## ❓ FAQ

<details>
<summary><b>Чи обов'язково інтегрувати з сайтом одразу?</b></summary>

Ні. За замовчуванням `SITE_ADAPTER_ENABLED=0` — TMA працює на локальному seed-каталозі (20 товарів, 8 категорій). Можна запустити, протестувати, показати замовникам, і тільки потім підключити реальний каталог.
</details>

<details>
<summary><b>Що робити, якщо змінюється sender-акаунт Нової Пошти?</b></summary>

Замінити 6 полів у `.env`:
- `NP_SENDER_NAME`
- `NP_SENDER_PHONE`
- `NP_SENDER_COUNTERPARTY_REF`
- `NP_SENDER_CONTACT_REF`
- `NP_SENDER_CITY_REF`
- `NP_SENDER_WAREHOUSE_REF`

Refs беруться з особистого кабінету НП → "Адресна книга" → клік правою → "Копіювати Ref".
</details>

<details>
<summary><b>Чи можна використати іншу платіжну систему замість WayForPay?</b></summary>

Так. Код payments модульний: `backend/modules/payments/providers/` — додати нову папку `fondy/` / `liqpay/` з таким же інтерфейсом (`create_payment`, `parse_webhook`, `verify_signature`). У `routes.py` додати роутер.
</details>

<details>
<summary><b>Як переключити TMA на production WayForPay (реальні платежі)?</b></summary>

1. У `.env` замінити `WAYFORPAY_MERCHANT_ACCOUNT/SECRET` на production ключі з кабінету WFP
2. Переконатись що `TMA_ALLOW_SANDBOX=0`
3. У WFP-кабінеті вказати production webhook URL
4. `/api/tma/orders/{id}/simulate-payment` автоматично заблокується (видасть 403)
</details>

<details>
<summary><b>Чи є щось що потрібно видалити перед production?</b></summary>

Так. Endpoints для DEV-режиму:
- `POST /api/tma/admin/make-me-admin` — будь-який user стає OWNER (треба захистити паролем або видалити)
- `POST /api/tma/orders/{id}/simulate-payment` — автоматично 403 коли `TMA_ALLOW_SANDBOX=0`
- `TMA_ALLOW_SANDBOX=0` — обов'язково

Повний чеклист — [`INTEGRATION_AUDIT.md §8`](INTEGRATION_AUDIT.md).
</details>

<details>
<summary><b>Куди зберігати node_modules / venv?</b></summary>

Вони НЕ в репозиторії. Встановлюються локально через `yarn install` / `pip install -r requirements.txt`. Додані у `.gitignore`.
</details>

<details>
<summary><b>Як додати нову функцію в TMA?</b></summary>

1. **Backend:** додати endpoint у `backend/modules/tma/routes.py` з префіксом `/api/tma/`
2. **Frontend:** додати виклик у `frontend/src/tma-mobile/lib/api-client.js`, створити екран у `screens/`, додати route у `App.jsx`
3. **State (якщо потрібно):** створити Zustand slice у `store/`
4. **Тест:** оновити `scripts/smoke_test.sh`
</details>

---

## 🤝 Про проект

**Розробник TMA:** Emergent AI Agent
**Замовник:** Y-Store (Україна)
**Бот:** [@Ystore_app_bot](https://t.me/Ystore_app_bot)
**Сайт:** [y-store.in.ua](https://y-store.in.ua)
**Telegram Menu:** кнопка "🛍 Магазин" → відкриває TMA

### Критичні інваріанти (НЕ ЧІПАТИ)

1. Префікс `/api` у всіх backend routes
2. Backend binding `0.0.0.0:8001`
3. Lowercase статуси замовлень
4. `city_ref` / `warehouse_ref` у order.delivery — обов'язкові
5. HMAC верифікація WayForPay webhook
6. Signed-response на webhook (`{orderReference, status: "accept", time, signature}`)
7. `TMA_ALLOW_SANDBOX=0` у production

---

<div align="center">

**🎯 Готово до передачі.**

Дев отримує цю папку → читає README → запускає `deploy.sh` → заповнює `site_adapter.py` → TMA працює з реальним каталогом сайту.

[⬆ Нагору](#-y-store-telegram-mini-app)

</div>
