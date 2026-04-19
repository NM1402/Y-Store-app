# Y‑Store TMA — Integration Guide для інтеграції з основним вебсайтом

> Документ для розробника, який буде підключати Telegram Mini App до існуючого бекенду y-store.in.ua.  
> Мета: **передати TMA як ізольований модуль**, який після 1 кроку інтеграції (токен + заміна 5 адаптерних функцій) працює з реальним сайтом без дублювання логіки.

---

## 0. TL;DR — що робити розробнику за 30 хвилин

1. Розгорнути TMA як окремий сервіс (`backend/` + `frontend/`) на піддомені: **`tma.y-store.in.ua`** (або `/tma` reverse-proxy).
2. У конфігурації Telegram BotFather → Menu Button → вказати URL мініапки.
3. Замінити **5 адаптерних функцій** в `backend/modules/tma/site_adapter.py` (описано в §5) — щоб TMA брала дані з головного бекенду, а не з власної бази.
4. Налаштувати `.env` (див. §9). Більше нічого.

---

## 1. Загальна архітектура

```
  ┌─────────────────────────────────────────────────────────────┐
  │                    TELEGRAM (клієнт)                         │
  │  ┌──────────────────────┐        ┌────────────────────────┐ │
  │  │  @Ystore_app_bot     │        │  TMA WebApp /tma       │ │
  │  │  (polling, alerts)   │        │  (React, Zustand)      │ │
  │  └──────────┬───────────┘        └──────────┬─────────────┘ │
  └─────────────┼────────────────────────────────┼───────────────┘
                │                                │
                │       HTTPS                    │
                ▼                                ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                   TMA SERVICE (цей модуль)                   │
  │  ┌───────────────────────────────────────────────────────┐  │
  │  │   FastAPI /api/tma/*   (тонкий gateway + UX-логіка)   │  │
  │  │   MongoDB tma_store    (локальні:                     │  │
  │  │                          - orders (дзеркало)          │  │
  │  │                          - tma_users (сесії TMA)      │  │
  │  │                          - bot_settings, alerts_queue │  │
  │  │                          - audit_log)                 │  │
  │  └──────────────┬─────────────┬──────────────────────────┘  │
  │                 │             │                              │
  │   site_adapter  │   external  │    (точка інтеграції)        │
  │   (5 функцій)   │             │                              │
  └─────────────────┼─────────────┼──────────────────────────────┘
                    │             │
         ┌──────────┴───┐    ┌────┴──────────────────────────┐
         ▼              ▼    ▼                               ▼
  ┌───────────┐  ┌───────────────┐  ┌───────────────┐  ┌─────────────┐
  │ ГОЛОВНИЙ  │  │ Nova Poshta   │  │ WayForPay     │  │ Telegram    │
  │ Y‑STORE   │  │ API           │  │ API + webhook │  │ Bot API     │
  │ backend   │  │               │  │               │  │             │
  │ (products,│  │               │  │               │  │             │
  │  users,   │  │               │  │               │  │             │
  │  orders)  │  │               │  │               │  │             │
  └───────────┘  └───────────────┘  └───────────────┘  └─────────────┘
```

**Ключовий принцип:** TMA НЕ дублює бізнес-логіку сайту. Вона має 5 точок зв'язку з головним бекендом (див. §5). Решта — самодостатня.

---

## 2. Що ТМА вміє і що всередині неї (SELF‑CONTAINED)

Цей функціонал живе виключно всередині модуля. Розробник **нічого не робить** — це вже готове.

### 2.1 Telegram авторизація
- Endpoint `POST /api/tma/auth` — приймає `init_data` від `Telegram.WebApp.initData`, валідує підпис проти `TELEGRAM_BOT_TOKEN`, повертає JWT.
- Sandbox-режим для dev (`TMA_ALLOW_SANDBOX=1`) — приймає `"sandbox:<any_id>"`.
- JWT зберігає `user_id`, `telegram_id`, `username`.

### 2.2 Перший-візит онбординг
- Створює запис у `tma_users` з `telegram_id`, `telegram_username`, `first_name`, `last_name`, `language_code`.
- Bootstrap favorite/cart store в `localStorage` + Zustand.

### 2.3 Кошик і Checkout wizard
- 4 кроки: Контакти → Доставка (НП BottomSheet) → Оплата → Підтвердження.
- Валідація: телефон `+380\d{9}`, імʼя/прізвище regex, `cityRef`/`warehouseRef` обовʼязкові.
- Persistence через `zustand.persist` у localStorage.

### 2.4 Nova Poshta інтеграція (повністю всередині)
- `/api/tma/np/cities` + `/api/tma/np/warehouses` — проксі до NP API з cache.
- **Реальне створення ТТН** (`InternetDocument.save`) з retry без COD якщо Післяплата недоступна.
- Auto-TTN на `cash_on_delivery` + після `paid` вебхука.
- Sender counterparty береться з NP API (див. §9).

### 2.5 WayForPay інтеграція (повністю всередині)
- `POST /api/tma/orders` з `payment_method=card` → створює WFP-сесію → повертає `payment_url`.
- Клієнт редіректиться на secure.wayforpay.com.
- `POST /api/v2/payments/wayforpay/webhook` — публічний endpoint з HMAC-підписом, переводить статус у `paid`/`payment_failed`/`refunded`.
- Frontend polling `GET /api/tma/orders/{id}` кожні 3с поки не `paid`.

### 2.6 Order lifecycle UI
- **Статуси**: `new / pending_payment / paid / processing / shipped / delivered / payment_failed / cancelled / refunded`.
- Екран "Мої замовлення" з:
  - Копіюванням ТТН
  - Кнопкою "Доплатити" для pending
  - Кнопкою "Видалити" для неоплачених без ТТН
  - Кліком по товару → переходом на картку
  - (sandbox only) кнопкою "Симулювати оплату"

### 2.7 Telegram Admin Bot (@Ystore_app_bot)
- Отримує алерти про нові замовлення, оплати, помилки.
- Inline-кнопки: 📦 Створити ТТН / 👁 Деталі / 💬 Написати клієнту / 📨 SMS / 🚫 Блок.
- Wizards: TTN, Broadcast, Incidents.
- Автоматизація: алерти про затримки доставки, auto-return marks, risk marks.

### 2.8 Сповіщення
- Direct send через `Bot API sendMessage` до `bot_settings.admin_chat_ids`.
- Rich-notification через `AlertsService → AlertsWorker` queue.
- Дедуп через `dedupe_keys` у `alerts_queue`.

---

## 3. Що ТМА **дублює** з головного сайту — потрібно **пов'язати** (§5)

Зараз TMA має власні локальні колекції, але для production ці дані мають надходити з головного бекенду y-store.in.ua:

| Колекція в TMA | Роль | Що зробити |
|---|---|---|
| `products` | Каталог товарів | Замінити read на API сайту |
| `categories` | Категорії | Замінити read на API сайту |
| `users` (buyer-side) | Покупці | Матчити з `site_users` по telegram_id/phone |
| `orders` | Замовлення | **Dual-write** або синк у головну таблицю |
| `favorites` | Обране | Синхронізувати з профілем сайту (optional) |

TMA-специфічні колекції **не чіпати** — вони потрібні для роботи бота й UX:
- `bot_settings`, `alerts_queue`, `audit_log`, `bot_admins`, `bot_sessions`, `automation_runs`, `tma_users` (JWT сесії).

---

## 4. Структура проекту

```
/app
├── backend/
│   ├── server.py                          # FastAPI entrypoint
│   ├── requirements.txt
│   ├── .env                                # див. §9
│   ├── modules/
│   │   ├── tma/
│   │   │   ├── routes.py                   # 🔑 ОСНОВНИЙ gateway /api/tma/*
│   │   │   ├── nova_poshta_routes.py       # /api/tma/np/*
│   │   │   └── site_adapter.py             # ← ⚠️ СЮДИ ДОДАТИ виклики до сайту
│   │   ├── payments/
│   │   │   ├── wayforpay_routes.py         # POST /webhook + /create-session
│   │   │   └── providers/wayforpay/
│   │   │       ├── wayforpay_provider.py   # HMAC-підпис, create_payment
│   │   │       └── wayforpay_signature.py
│   │   ├── delivery/np/
│   │   │   └── np_ttn_service.py           # legacy, можна ігнорувати
│   │   ├── bot/
│   │   │   ├── bot_app.py                   # 🤖 aiogram dispatcher
│   │   │   ├── simple_bot.py               # (unused)
│   │   │   ├── bot_actions_service.py      # create_ttn, mark_block, SMS
│   │   │   ├── alerts_service.py           # push alerts queue
│   │   │   ├── alerts_worker.py            # consume queue
│   │   │   ├── bot_settings_repo.py
│   │   │   ├── audit_repo.py
│   │   │   ├── wizards/                    # TTN, Broadcast, Incidents
│   │   │   └── handlers/                   # PickupControl, Returns
│   │   ├── automation/
│   │   │   └── automation_engine.py        # планувальник кожні 5 хв
│   │   └── crm/
│   │       └── crm_repository.py           # сегментація клієнтів (REGULAR/RISK)
│   └── ...
│
├── frontend/
│   └── src/tma-mobile/
│       ├── App.jsx                          # роутер /tma/*
│       ├── lib/
│       │   ├── api-client.js               # axios + JWT + getToken
│       │   ├── np-client.js                # Nova Poshta helper
│       │   └── telegram-sdk.js             # WebApp.initData, openLink, haptic
│       ├── store/
│       │   ├── cart.js                     # Zustand + persist
│       │   ├── checkout.js                 # 4-step wizard state
│       │   └── favorites.js
│       ├── screens/
│       │   ├── Home-v2.jsx                 # hero + categories + feed
│       │   ├── Catalog.jsx
│       │   ├── Product-v3.jsx              # картка товару
│       │   ├── Cart-v2.jsx
│       │   ├── Checkout-v3.jsx             # 4-step wizard
│       │   ├── OrderSuccess.jsx            # polling + "Доплатити"
│       │   ├── Orders.jsx                  # історія з ТТН + copy
│       │   ├── Profile-v2.jsx
│       │   └── Favorites.jsx
│       └── components/
│           ├── NovaPoshtaPicker.jsx        # BottomSheet picker
│           ├── BottomSheet.jsx
│           └── ProductCard-v2.jsx
│
├── HANDOFF.md                               # коротка технічна пам'ятка
└── INTEGRATION.md                           # ← ЦЕЙ ДОКУМЕНТ
```

---

## 5. ⚠️ Адаптер для сайту: 5 функцій, які треба реалізувати

Створіть файл `backend/modules/tma/site_adapter.py`, який експортує 5 async-функцій. TMA-gateway викликає їх замість прямих Mongo-запитів. Це **єдина точка інтеграції** з y-store.in.ua.

### 5.1 `async def list_products(filters: dict) -> list[dict]`

**Вхід:**
```python
{
  "q": "iphone",                 # пошуковий запит (optional)
  "category_slug": "electronics", # (optional)
  "limit": 20, "offset": 0,
  "sort": "price_asc" | "price_desc" | "popular" | "new"
}
```

**Вихід (обов'язкові поля):**
```json
[
  {
    "id": "stable-id-from-site",           // = slug або UUID
    "title": "iPhone 15 Pro Max 256GB",
    "price": 59999,                         // UAH
    "price_old": 64999,                     // nullable
    "images": ["https://y-store.in.ua/..."], // повні URL
    "slug": "iphone-15-pro-max-256",
    "category_slug": "electronics",
    "brand": "Apple",
    "in_stock": true,
    "short_description": "...",
    "attributes": {"color": "Titanium", "storage": "256GB"}
  }
]
```

**Що робить дев:** робить `GET https://y-store.in.ua/api/v1/products?q=...` з авторизацією service-token і нормалізує поля.

---

### 5.2 `async def get_product(product_id: str) -> dict | None`

Те саме що 5.1, але по одному товару. Додатково має повертати `description` (HTML), `characteristics`, `reviews_count`.

---

### 5.3 `async def list_categories() -> list[dict]`

**Вихід:**
```json
[
  {"slug": "electronics", "name": "Електроніка", "icon": "Cpu", "products_count": 142},
  {"slug": "military", "name": "Для військових", "icon": "Shield", "products_count": 58}
]
```

---

### 5.4 `async def register_order(tma_order: dict) -> dict`

**Критично важлива функція.** Коли TMA створює замовлення, вона зберігає його локально, АЛЕ також має **надіслати копію у головну базу сайту** (щоб бухгалтер/менеджер бачив його в основній CRM).

**Вхід (TMA order у внутрішньому форматі):**
```json
{
  "id": "uuid",
  "order_number": "TMA-20260419-A7D689",
  "buyer_id": "tma_user_uuid",
  "source": "telegram_tma",
  "customer": {
    "full_name": "Іван Тестенко",
    "phone": "+380501112233",
    "email": "...",
    "telegram_id": 577782582,
    "telegram_username": "ivanov"
  },
  "delivery": {
    "method": "nova_poshta",
    "city_ref": "8d5a980d-...", "city_name": "Київ",
    "warehouse_ref": "...", "warehouse_name": "Відділення №1",
    "tracking_number": "20451419119553",   // якщо вже створена
    "estimated_delivery_date": "19.04.2026"
  },
  "items": [
    {"product_id": "iphone-15", "title": "iPhone 15 Pro Max 256GB", "quantity": 1, "price": 59999}
  ],
  "subtotal": 59999, "shipping_cost": 0, "total_amount": 59999,
  "status": "processing", "payment_status": "paid",
  "payment_method": "card",
  "payment": {"provider": "WAYFORPAY", "status": "PAID", "paid_at": "..."}
}
```

**Вихід:**
```json
{"ok": true, "site_order_id": "y-store-internal-id", "crm_url": "https://admin.y-store.in.ua/orders/123"}
```

**Що робить дев:** `POST https://y-store.in.ua/api/v1/orders/import` з правильним маппінгом полів. Якщо головна CRM не приймає деякі поля (`payment.checkout_url`, `source: telegram_tma`) — додає в `metadata`.

**Важливо про ідемпотентність:** TMA викликає `register_order` при створенні + при кожному оновленні статусу (paid, ttn_created, cancelled). Dev має використовувати `order_number` як унікальний ключ і робити `upsert`.

---

### 5.5 `async def match_user(telegram_id: int, telegram_username: str, phone: str | None) -> dict | None`

Коли клієнт заходить у TMA через Telegram — спробувати знайти його у базі сайту за `phone` або `telegram_id` (якщо сайт таке зберігає), повернути профіль для bootstrap (адреси, обране, бонуси).

**Вихід:**
```json
{
  "site_user_id": "y-store-user-uuid",
  "email": "...",
  "bonus_points": 1250,
  "saved_addresses": [...],
  "discount_level": "10%_first_order"
}
```

Якщо дев не має такої можливості зараз — функція може повертати `None`, і TMA працюватиме як для нового користувача.

---

### Як TMA викликає адаптер

У `routes.py` зараз викликається напряму Mongo. Після інтеграції — треба обгорнути так:

```python
# модуль: backend/modules/tma/routes.py

from modules.tma.site_adapter import site_adapter  # ← новий

@router.get("/products")
async def tma_products(q: str = "", category_slug: str = "", limit: int = 20):
    # БУЛО: direct Mongo
    # items = await db.products.find({...}).to_list(limit)
    #
    # СТАЛО:
    items = await site_adapter.list_products({
        "q": q, "category_slug": category_slug, "limit": limit
    })
    return {"items": items, "total": len(items)}
```

І в `POST /orders` після insert:

```python
await db.orders.insert_one(order_doc)
await site_adapter.register_order(order_doc)  # ← синхронний dual-write
```

**Dev може вибрати:**
- **Read-through mode**: TMA завжди ходить у сайт за продуктами/категоріями. Найчистіше, але +latency.
- **Cache-aside**: TMA синхронізує продукти раз на 10 хв у локальний Mongo, читає з нього. Швидше.
- **Webhook-based**: сайт пуш-інгом оновлює TMA (сайт шле на `/api/tma/internal/product-updated`).

---

## 6. Схеми даних TMA

### 6.1 Колекція `orders` (обов'язкові поля)

```js
{
  id: "uuid",                      // internal
  order_number: "TMA-20260419-XXX",// human-readable, unique
  buyer_id: "uuid",                // -> tma_users._id
  source: "telegram_tma",
  customer: {
    full_name, first_name, last_name, phone, email,
    telegram_id: number, telegram_username: string
  },
  delivery: {
    method: "nova_poshta",
    city_ref, city_name,
    warehouse_ref, warehouse_name,
    delivery_cost: number,
    tracking_number,               // TTN
    tracking_provider: "novaposhta",
    estimated_delivery_date: "DD.MM.YYYY"
  },
  items: [
    {product_id, title, quantity, price, image_url}
  ],
  subtotal, shipping_cost, total_amount,
  currency: "UAH",
  status: "new|pending_payment|paid|processing|shipped|delivered|payment_failed|cancelled|refunded",
  payment_status: "pending|awaiting_payment|paid|failed",
  payment_method: "card|cash_on_delivery|cash",
  payment: {
    provider: "WAYFORPAY|SIMULATION",
    status, checkout_url, provider_payment_id,
    paid_at, auth_code, card_pan
  },
  created_at, updated_at,
  comment
}
```

### 6.2 Колекція `tma_users`

```js
{
  id: "uuid",
  telegram_id: number,             // unique
  telegram_username: string,
  first_name, last_name, language_code,
  created_at, last_login_at,
  site_user_id: string | null      // ← результат match_user()
}
```

### 6.3 Колекція `bot_settings` (singleton)

```js
{
  id: "global",
  enabled: true,
  admin_chat_ids: ["577782582"],   // куди шлемо сповіщення
  admin_user_ids: [577782582],      // хто має доступ до /menu
  triggers: {
    new_order: true,
    order_paid: true,
    big_order_uah: 10000,          // поріг для 🔥 ВЕЛИКЕ ЗАМОВЛЕННЯ
    delayed_order_hours: 24
  },
  automation: {
    delay_alerts: {enabled: true},
    risk_marks: {enabled: true, returns_count: 3}
    // vip_upgrades: DISABLED — не використовується
  }
}
```

---

## 7. API Endpoints TMA (повний перелік)

Префікс: **`/api/tma`**. Авторизація: `Authorization: Bearer <jwt>` (крім `/auth` та публічних).

| Method | Path | Опис |
|---|---|---|
| POST | `/auth` | Telegram `initData` → JWT |
| GET | `/me` | Поточний профіль |
| GET | `/home` | Лід-стрічка (featured, bestsellers) |
| GET | `/categories` | Категорії |
| GET | `/products` | Каталог з фільтрами |
| GET | `/products/{id}` | Деталі товару |
| GET | `/search/suggest` | Підказки |
| POST | `/cart/preview` | Перерахунок кошика (shipping, totals) |
| POST | `/orders` | Створення замовлення (+ auto-TTN for cash, + WFP for card) |
| GET | `/orders` | Мої замовлення (list) |
| GET | `/orders/{id}` | Одне замовлення (polling) |
| DELETE | `/orders/{id}` | Видалити (лише unpaid, без ТТН) |
| POST | `/orders/{id}/simulate-payment` | TEST-ONLY (sandbox) |
| GET | `/np/cities?q=&limit=` | NP пошук міст |
| GET | `/np/warehouses?city_ref=&q=&limit=` | NP пошук відділень |
| GET | `/favorites`, `/favorites/ids`, POST `/favorites/toggle` | Обране |
| GET | `/store-info` | ФОП, реквізити |

### Публічні (без auth)
| Method | Path | Опис |
|---|---|---|
| POST | `/api/v2/payments/wayforpay/webhook` | WFP callback з HMAC-перевіркою |
| GET | `/api/health` | liveness |

---

## 8. Точки інтеграції (step-by-step для дева)

### Крок 1 — Підключення домену
- Розгорнути TMA на `tma.y-store.in.ua` або додати `location /tma { proxy_pass http://tma-backend:8001/; }` на основному nginx.
- Сертифікат SSL (Let's Encrypt).
- У BotFather: `/setmenubutton` → URL = `https://y-store.in.ua/tma`.

### Крок 2 — .env з токенами
Всі секрети (див. §9) додати у оркестратор секретів (не в git).

### Крок 3 — `site_adapter.py`
Реалізувати 5 функцій з §5 з правильним маппінгом полів. Якщо у вас REST-API сайту — OK. Якщо SQL-база — пряме підключення через SQLAlchemy.

Приклад-скелет:
```python
# backend/modules/tma/site_adapter.py
import httpx, os

SITE_API_URL = os.getenv("SITE_API_URL")
SITE_API_TOKEN = os.getenv("SITE_API_TOKEN")

class SiteAdapter:
    def __init__(self):
        self.client = httpx.AsyncClient(
            base_url=SITE_API_URL,
            headers={"Authorization": f"Bearer {SITE_API_TOKEN}"},
            timeout=15
        )

    async def list_products(self, filters):
        r = await self.client.get("/api/v1/products", params=filters)
        r.raise_for_status()
        raw = r.json()
        # Нормалізація формату сайту → TMA-формат:
        return [self._normalize_product(p) for p in raw.get("items", [])]

    async def get_product(self, pid):
        r = await self.client.get(f"/api/v1/products/{pid}")
        if r.status_code == 404: return None
        return self._normalize_product(r.json())

    async def list_categories(self):
        r = await self.client.get("/api/v1/categories")
        return r.json().get("items", [])

    async def register_order(self, tma_order):
        payload = self._map_order_to_site(tma_order)
        r = await self.client.post("/api/v1/orders/import", json=payload)
        r.raise_for_status()
        return r.json()

    async def match_user(self, telegram_id, username, phone):
        r = await self.client.post("/api/v1/users/match", json={
            "telegram_id": telegram_id,
            "telegram_username": username,
            "phone": phone,
        })
        return r.json() if r.status_code == 200 else None

    # ---- helpers ----
    def _normalize_product(self, p):
        return {
            "id": str(p["id"]),
            "title": p["name"],
            "price": p["price"],
            "price_old": p.get("old_price"),
            "images": p.get("gallery", []),
            "slug": p.get("slug"),
            "category_slug": p.get("category", {}).get("slug"),
            "in_stock": p.get("in_stock", True),
            "short_description": p.get("short_description"),
            "attributes": p.get("specs", {}),
        }

    def _map_order_to_site(self, o):
        # Маппінг у формат вашої CRM-системи
        return {
            "external_id": o["order_number"],
            "source": "telegram_mini_app",
            "customer": o["customer"],
            "line_items": [
                {"sku": it["product_id"], "qty": it["quantity"], "unit_price": it["price"]}
                for it in o["items"]
            ],
            "delivery": o["delivery"],
            "totals": {
                "subtotal": o["subtotal"],
                "shipping": o["shipping_cost"],
                "total": o["total_amount"]
            },
            "status": o["status"],
            "payment": o.get("payment"),
        }

site_adapter = SiteAdapter()
```

### Крок 4 — Замінити прямі Mongo-виклики на адаптер
У `backend/modules/tma/routes.py` знайти функції:
- `tma_list_products` → викликати `site_adapter.list_products`
- `tma_get_product` → `site_adapter.get_product`
- `tma_list_categories` → `site_adapter.list_categories`
- У `tma_create_order` після `db.orders.insert_one` → додати `await site_adapter.register_order(order_doc)`

**Всі інші endpoints (NP, WFP, auth, orders GET/DELETE) НЕ чіпати** — вони самодостатні.

### Крок 5 — Матчинг користувачів (опціонально)
У `require_tma_user` або в `/auth` після створення `tma_user` можна викликати `site_adapter.match_user(...)` і зберегти `site_user_id`. Це дозволяє в CRM бачити купівлі одного користувача в обох каналах.

### Крок 6 — Webhook з сайту → TMA (опціонально, для синку)
Якщо на сайті змінили ціну/наявність — сайт може надіслати webhook на:
```
POST https://tma.y-store.in.ua/api/tma/internal/product-updated
Body: {"product_id": "...", "updated_at": "..."}
```
TMA інвалідує кеш (якщо cache-aside режим).

### Крок 7 — Тестування
Див. §11 чекліст.

---

## 9. Environment variables (повний список)

### Обов'язкові
```bash
# Database
MONGO_URL="mongodb://localhost:27017"
DB_NAME="tma_store"

# CORS (для frontend)
CORS_ORIGINS="https://y-store.in.ua,https://tma.y-store.in.ua"

# Telegram
TELEGRAM_BOT_TOKEN="8524617770:AAECLj0A8..."
TMA_URL="https://y-store.in.ua/tma"
APP_URL="https://y-store.in.ua"
TMA_ALLOW_SANDBOX="0"    # ← в production!

# Nova Poshta
NP_API_KEY="5cb1e3ebc23e75d737fd57c1e056ecc9"
NOVAPOSHTA_API_KEY="5cb1e3ebc23e75d737fd57c1e056ecc9"
NP_SENDER_NAME="Y-Store"
NP_SENDER_PHONE="380637247703"
NP_SENDER_COUNTERPARTY_REF="07f0c105-442e-11ea-8133-005056881c6b"
NP_SENDER_CONTACT_REF="4deeee78-44d2-11ea-8133-005056881c6b"
NP_SENDER_CITY_REF="8d5a980d-391c-11dd-90d9-001a92567626"
NP_SENDER_WAREHOUSE_REF="1ec09d88-e1c2-11e3-8c4a-0050568002cf"

# WayForPay
WAYFORPAY_MERCHANT_ACCOUNT="y_store_in_ua"
WAYFORPAY_MERCHANT_SECRET="4f27e43c7052b31c5df78863e0119b51b1e406ef"
WAYFORPAY_MERCHANT_PASSWORD="a6fcf5fe2a413bdd25bb8b2e7100663a"
WAYFORPAY_MERCHANT_DOMAIN="y-store.in.ua"
WAYFORPAY_RETURN_URL="https://y-store.in.ua/tma/order-success"
WAYFORPAY_SERVICE_URL="https://y-store.in.ua/api/v2/payments/wayforpay/webhook"

# JWT
JWT_SECRET_KEY="<random 32+ chars>"
JWT_ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_DAYS="7"
```

### Для інтеграції з сайтом (додати)
```bash
SITE_API_URL="https://api.y-store.in.ua"
SITE_API_TOKEN="<service-to-service token>"
SITE_WEBHOOK_SECRET="<HMAC для webhook з сайту>"
```

### Frontend (`frontend/.env`, НЕ ЧІПАТИ)
```bash
REACT_APP_BACKEND_URL="https://y-store.in.ua"
WDS_SOCKET_PORT=443
```

---

## 10. Nova Poshta — нюанси для production

### 10.1 Sender setup
Sender counterparty береться з існуючого кабінету `ТИЩЕНКО ОЛЕКСАНДР МИКОЛАЙОВИЧ ФОП`. **Якщо ФОП зміниться**:
1. Викликати `POST /v2.0/json/ Counterparty.getCounterparties` з новим API-ключем.
2. Взяти перший `Ref` → записати в `NP_SENDER_COUNTERPARTY_REF`.
3. Викликати `Counterparty.getCounterpartyContactPersons` → взяти `Ref` → у `NP_SENDER_CONTACT_REF`.
4. Викликати `Address.getWarehouses` для міста-відправника → обрати потрібне відділення → `NP_SENDER_WAREHOUSE_REF`.

### 10.2 Післяплата (COD)
- За замовчуванням у цієї counterparty **недоступна** — TMA автоматично робить retry без `BackwardDeliveryData`.
- Якщо ФОП хоче COD — треба підписати угоду з НП на послугу "Післяплата".

### 10.3 Обмеження
- Wave/rate limits: НП API не любить >10 req/sec. У TMA стоїть debounce 250ms на cities search.
- Вага: зараз TMA рахує `1.0kg + 0.2kg per item`. Треба замінити на реальні ваги товарів (поле `weight` у картці продукту).

---

## 11. WayForPay — нюанси для production

### 11.1 Webhook URL
У кабінеті merchant.wayforpay.com → Налаштування магазину → Service URL = `https://y-store.in.ua/api/v2/payments/wayforpay/webhook`. Public endpoint, перевірка через HMAC (`merchantSignature` у payload).

### 11.2 Return URL
Туди редіректиться клієнт після оплати. Має бути сторінка `/tma/order-success`, яка одразу робить polling статусу.

### 11.3 Тестовий режим
Додати у `.env` `WAYFORPAY_TEST_MODE=true` → WFP проводить симуляцію без реальних списань. Перед go-live — прибрати.

### 11.4 Повернення платежів
WFP API має метод `REFUND`. Наразі в TMA немає UI для цього. Admin може робити через кабінет WFP. Якщо потрібно автоматизувати — дев має додати endpoint `POST /api/tma/orders/{id}/refund` + відповідне callback-оновлення.

---

## 12. Безпека

### 12.1 Обов'язково перед go-live
- [ ] `TMA_ALLOW_SANDBOX=0`
- [ ] `JWT_SECRET_KEY` — 32+ випадкових байт
- [ ] `WAYFORPAY_MERCHANT_SECRET` у vault, не в git
- [ ] WFP webhook: HMAC-перевірка працює (тест з неправильним підписом → 403)
- [ ] CORS: обмежити до `https://y-store.in.ua` + telegram domains
- [ ] `/api/tma/orders/{id}/simulate-payment` заблоковано (через `TMA_ALLOW_SANDBOX=0`)
- [ ] Prevent IDOR: `require_tma_user` перевіряє `buyer_id == user.id` в усіх endpoint-ах з `order_id`

### 12.2 Telegram initData перевірка
В `routes.py` функція `_verify_init_data` перевіряє HMAC-SHA256 від `TELEGRAM_BOT_TOKEN`. Якщо токен скомпрометовано — автоматично всі сесії рекрутяться.

---

## 13. Deployment (production checklist)

### 13.1 Сервіси
```ini
# /etc/supervisor/conf.d/tma_backend.conf
[program:tma_backend]
command=/usr/bin/gunicorn -w 4 -k uvicorn.workers.UvicornWorker server:app --bind 0.0.0.0:8001
directory=/opt/tma/backend
autostart=true
autorestart=true

# /etc/supervisor/conf.d/tma_bot.conf
[program:tma_bot]
command=/usr/bin/python -m modules.bot.bot_app
directory=/opt/tma/backend
autostart=true
autorestart=true

# /etc/supervisor/conf.d/tma_frontend.conf — для CRA/Vite build
# (або nginx serve static з /opt/tma/frontend/build)
```

### 13.2 nginx
```nginx
# /etc/nginx/sites-enabled/tma.y-store.in.ua
server {
    listen 443 ssl http2;
    server_name y-store.in.ua;

    # Основний сайт
    location / {
        proxy_pass http://127.0.0.1:3000;  # або серверний рендер
    }

    # Мініапка
    location /tma {
        proxy_pass http://127.0.0.1:3000;  # той самий React SPA
    }

    # TMA API
    location /api/tma/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header X-Forwarded-For $remote_addr;
    }

    # WayForPay webhook
    location /api/v2/payments/wayforpay/webhook {
        proxy_pass http://127.0.0.1:8001;
    }
}
```

### 13.3 SSL
`certbot --nginx -d y-store.in.ua`. Telegram вимагає валідний HTTPS для Mini App.

---

## 14. Тестовий чекліст після інтеграції

### 14.1 Sanity
- [ ] `GET /api/health` → 200 OK
- [ ] `POST /api/tma/auth` з реальним initData → JWT
- [ ] `GET /api/tma/products` → 20 товарів з реального сайту (не seed-тестові)
- [ ] `GET /api/tma/products/{id}` → повні дані з описом
- [ ] `GET /api/tma/categories` → категорії сайту

### 14.2 Checkout flow
- [ ] Cart: додати товар, відкрити checkout
- [ ] Step 2: пошук "Київ" → справжні міста НП
- [ ] Step 2: вибір відділення → справжній список
- [ ] Step 3: оберемо **"Карткою"**
- [ ] Step 4: CTA "Перейти до оплати • X ₴"
- [ ] Redirect на secure.wayforpay.com → реальна merchant page
- [ ] Після успішної оплати в тестовому режимі WFP → повернення на `/tma/order-success`
- [ ] Через 3–6 секунд статус у UI змінюється на "Оплачено"
- [ ] В БД сайту з'являється order (через `register_order`)
- [ ] Автоматично створюється TTN → видно в UI + в НП-кабінеті

### 14.3 Cash flow
- [ ] Оформити з методом "Накладений платіж"
- [ ] Одразу після submit статус "Сформовано ТТН"
- [ ] TTN створено в НП (перевірити через novaposhta.ua)
- [ ] Бот отримав повідомлення з кнопками "👁 Деталі" + "💬 Написати клієнту"

### 14.4 My orders
- [ ] Переглянути список замовлень
- [ ] Натиснути на назву товару → відкривається картка товару
- [ ] Натиснути "📋 Copy" → номер TTN у буфері
- [ ] Видалити неоплачене замовлення → зникає зі списку
- [ ] Спроба видалити оплачене → 400 "Cannot delete"

### 14.5 Bot
- [ ] `/start` як клієнт → вітальне повідомлення + кнопка "🛍 Відкрити магазин"
- [ ] `/start` як адмін → меню керування
- [ ] При новому замовленні → алерт у групу адмінів з inline-кнопками
- [ ] Натиснути "📦 Створити ТТН" → (якщо TTN вже є) "cached=true", інакше — створиться
- [ ] Натиснути "👁 Деталі" → картка замовлення з усіма полями
- [ ] Натиснути "💬 Написати клієнту" → відкривається чат Telegram

---

## 15. Troubleshooting (типові помилки)

| Симптом | Причина | Фікс |
|---|---|---|
| `/auth` повертає 401 | Невалідний initData HMAC | Перевір `TELEGRAM_BOT_TOKEN` у .env |
| Продукти не видно | `site_adapter.list_products` кинув exception | tail backend.err.log, перевір `SITE_API_URL` + токен |
| WFP webhook не змінює статус | HMAC не збігається | Перевір `WAYFORPAY_MERCHANT_SECRET` |
| TTN не створюється | `NP_SENDER_*` refs порожні | Запусти sender discovery (див. 10.1) |
| "Післяплата недоступна" | Не підписано угоду з НП | TMA автоматично робить retry без COD — але COD не буде |
| Бот не відповідає | supervisor не запустив | `sudo supervisorctl status telegram_bot` + `tail /var/log/telegram_bot.err.log` |
| Orders empty for real user | JWT з іншого sandbox → різний user_id | У production TMA_ALLOW_SANDBOX=0, реальний telegram_id гарантує правильне замовлення |

---

## 16. Що точно **не треба** ламати / переписувати

- ❌ Префікс `/api` (kubernetes ingress залежить)
- ❌ Структура status enum (lowercase)
- ❌ `city_ref` + `warehouse_ref` у замовленні
- ❌ WayForPay redirect-only (жодної card-логіки на фронті)
- ❌ Bot — він окремий процес під supervisor
- ❌ BottomSheet picker для НП (мобільний UX)
- ❌ JWT_SECRET_KEY — генерувати новий на кожен environment

---

## 17. Контакти та посилання

- **Бот:** https://t.me/Ystore_app_bot
- **Telegram Bot API:** https://core.telegram.org/bots/api
- **Nova Poshta API:** https://developers.novaposhta.ua/documentation
- **WayForPay docs:** https://wiki.wayforpay.com/
- **Aiogram 3:** https://docs.aiogram.dev/
- **WebApp SDK:** https://core.telegram.org/bots/webapps

---

## 18. Висновок

TMA побудована як **ізольований модуль** з принципом "UI → Adapter → Backend". Розробнику треба:

1. Реалізувати **5 функцій адаптера** (`site_adapter.py`) — це мінімум для production.
2. Налаштувати **`.env`** з токенами (все, що потребує нестатичних значень).
3. Розгорнути **3 сервіси** (backend, frontend, bot) під supervisor.
4. Підключити **nginx** + SSL.

Після цього:
- Каталог, категорії, users — з головного сайту (dual-read)
- Замовлення — дзеркально у TMA + site (dual-write)
- NP, WFP, Telegram bot — самодостатні модулі всередині, нічого не чіпати
- Безпека, HMAC, JWT — вже реалізовано

**Очікуваний час інтеграції розробником:** 4–8 годин (без дебагу інтеграції з CRM сайту).
