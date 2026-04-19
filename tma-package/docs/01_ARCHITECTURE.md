# AUDIT & INTEGRATION GUIDE — Y-Store Telegram Mini App

> Документ для дев-розробника, який буде **підключати вже готову TMA** до реального
> бекенду `y-store.in.ua`. Дата аудиту: 2026-04-19. Версія коду: `svetlanaslinko057/dedede2333@main`.
>
> Мета: передати TMA як **ізольований модуль**. Після конфігурації `.env` + реалізації
> **однієї адаптерної прошарки (site_adapter)** вона працює з реальною базою сайту.
> Платіжка (WayForPay), доставка (Нова Пошта), Telegram Bot — **уже всередині апки**,
> нічого більше підключати не потрібно.

---

## 0. TL;DR — що зробить дев за 1 день

| Крок | Що робить | Час |
|---|---|---|
| 1 | Розгорнути TMA на піддомені `tma.y-store.in.ua` (або reverse-proxy `location /tma`) | 1 год |
| 2 | Заповнити `backend/.env` (див. §6) — токени вже є в `INTEGRATION.md` | 15 хв |
| 3 | Створити файл `backend/modules/tma/site_adapter.py` з **3 функціями** (products, categories, register_order) | 2–3 год |
| 4 | Замінити в `backend/modules/tma/routes.py` 4 прямих виклики Mongo на `site_adapter.*` | 30 хв |
| 5 | У `@BotFather` → Menu Button → URL мініапки; WayForPay admin → service URL = `https://tma.y-store.in.ua/api/v2/payments/wayforpay/webhook` | 15 хв |
| 6 | Smoke test: `/api/health`, TMA `/tma`, замовлення cash + card | 1 год |

**Все інше — бот, НП, WFP, JWT-сесії, checkout, ТТН, алерти — уже працює з коробки.**

---

## 1. Високорівнева архітектура

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TELEGRAM                                     │
│  ┌──────────────────────┐      ┌─────────────────────────────────┐  │
│  │  @Ystore_app_bot     │      │  TMA WebApp                     │  │
│  │  aiogram 3.27        │      │  React 19 + Zustand + CRA       │  │
│  │  polling + MenuButton│      │  mount: /tma/*                  │  │
│  └──────────┬───────────┘      └──────────┬──────────────────────┘  │
└─────────────┼─────────────────────────────┼─────────────────────────┘
              │                             │  HTTPS  REACT_APP_BACKEND_URL + /api/tma
              ▼                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    TMA SERVICE  (цей модуль)                         │
│                                                                      │
│  FastAPI  →  /api/tma/*          ← BFF (auth, catalog, cart, orders)│
│            /api/tma/np/*         ← Nova Poshta autocomplete          │
│            /api/v2/payments/     ← WayForPay webhook                 │
│              wayforpay/webhook                                       │
│            /api/health                                               │
│                                                                      │
│  MongoDB  tma_store                                                  │
│  ├── users                ← TMA-користувачі (telegram_id → user)     │
│  ├── tma_sessions         ← JWT-подібні сесії TMA (TTL 30д)          │
│  ├── products, categories ← дзеркало каталогу сайту (або seed)       │
│  ├── orders               ← TMA-замовлення (source: telegram_tma)    │
│  ├── tma_favorites        ← обране                                   │
│  ├── tma_support_tickets  ← тікети                                   │
│  ├── reviews              ← відгуки                                  │
│  └── bot_settings + bot_admins + alerts_queue + audit_log            │
│                                                                      │
│        │ site_adapter.py (ЄДИНА точка інтеграції з сайтом)           │
└────────┼────────────┬────────────┬───────────────────┬───────────────┘
         ▼            ▼            ▼                   ▼
  ┌──────────┐ ┌───────────┐ ┌───────────┐      ┌──────────────┐
  │ y-store  │ │ Nova      │ │ WayForPay │      │  Telegram    │
  │ .in.ua   │ │ Poshta    │ │ HTTPS +   │      │  Bot API     │
  │ (сайт)   │ │ API v2.0  │ │ HMAC_MD5  │      │              │
  └──────────┘ └───────────┘ └───────────┘      └──────────────┘
```

**Ключовий принцип:** TMA НЕ дублює бізнес-логіку сайту. Для інтеграції дев робить лише
один адаптер `site_adapter.py` з 3 обов'язковими функціями (продукти, категорії,
дзеркалювання замовлень). Решта — self-contained.

---

## 2. Структура проєкту (після `git clone`)

```
/app
├── backend/
│   ├── server.py                     ← FastAPI entrypoint, реєструє роутери
│   ├── requirements.txt
│   ├── .env                           ← секрети (див. §6)
│   │
│   ├── core/
│   │   ├── config.py                  Settings з pydantic
│   │   ├── db.py                       Motor client → db (MongoDB)
│   │   ├── models.py
│   │   └── security.py
│   │
│   ├── modules/
│   │   ├── tma/
│   │   │   ├── routes.py              🔑 ГОЛОВНИЙ gateway `/api/tma/*`
│   │   │   ├── nova_poshta_routes.py     `/api/tma/np/cities|warehouses`
│   │   │   └── (site_adapter.py)      ← СТВОРИТИ ЙОГО (§5)
│   │   │
│   │   ├── payments/
│   │   │   ├── wayforpay_routes.py    `/api/v2/payments/wayforpay/webhook`
│   │   │   │                             + /create + /status + /refund
│   │   │   └── providers/wayforpay/
│   │   │       ├── wayforpay_provider.py  create_payment, parse_webhook
│   │   │       └── wayforpay_signature.py HMAC_MD5 helpers
│   │   │
│   │   ├── delivery/np/
│   │   │   ├── np_client.py           httpx обгортка NP API
│   │   │   ├── np_ttn_service.py      InternetDocument.save + idempotency
│   │   │   ├── np_tracking_service.py TrackingDocument
│   │   │   └── np_sender_setup.py     побудова Sender-counterparty/contact
│   │   │
│   │   ├── bot/
│   │   │   ├── simple_bot.py          🤖 aiogram dispatcher (РОЗГОРНУТИЙ пiд supervisor)
│   │   │   ├── bot_actions_service.py create_ttn, mark_block, SMS
│   │   │   ├── alerts_service.py      черга алертів → телеграм
│   │   │   ├── alerts_worker.py       consumer черги
│   │   │   ├── bot_settings_repo.py
│   │   │   └── wizards/               TTN/Broadcast/Incidents
│   │   │
│   │   ├── shop_routes.py             /api/tma/favorites, /reviews, /support
│   │   ├── seed_routes.py             авто-seed категорій + 20 товарів на старті
│   │   ├── telegram_bff.py            агреговані ендпоінти (поки не використов. фронтом)
│   │   └── … ops, analytics, crm, etc. (НЕ чіпати — внутрішні служби)
│   │
│   └── novaposhta_service.py          legacy helper для /api/tma/np/*
│
├── frontend/
│   └── src/
│       ├── App.js                     ← роут /tma/* → <TMAApp/>
│       └── tma-mobile/
│           ├── App.jsx                routes (Home/Catalog/Product/Cart/Checkout/…)
│           │
│           ├── lib/
│           │   ├── api-client.js      axios wrapper + Bearer token
│           │   ├── telegram-sdk.js    WebApp.initData, MainButton, BackButton, haptic
│           │   ├── np-client.js       виклики /api/tma/np/*
│           │   ├── validators.js      phone / name / email regex
│           │   ├── storage.js         localStorage helpers
│           │   ├── social-metrics.js  детерміністичні "N купили / залишилось"
│           │   └── recommendation-engine.js
│           │
│           ├── store/                 Zustand з persist
│           │   ├── auth.js
│           │   ├── cart.js            додати/видалити/кількість/очистити
│           │   ├── checkout.js        4-крокова анкета
│           │   ├── user.js
│           │   └── app.js
│           │
│           ├── screens/               (v2/v3 — поточні)
│           │   ├── Home-v2.jsx        банер + категорії + бестселери + новинки
│           │   ├── Catalog-v2.jsx     фільтри, сортування, infinite scroll
│           │   ├── Product-v3.jsx     карточка + related + social proof
│           │   ├── Search-v2.jsx
│           │   ├── Cart-v2.jsx
│           │   ├── Checkout-v3.jsx    ← 4 кроки: контакти → НП → оплата → підтвердження
│           │   ├── OrderSuccess.jsx   ← полінг статусу + кнопка "Доплатити"
│           │   ├── Orders.jsx         історія + копіювання ТТН
│           │   ├── Profile-v2.jsx
│           │   ├── Favorites.jsx
│           │   └── Support.jsx
│           │
│           ├── components/
│           │   ├── BottomNav-v2.jsx
│           │   ├── TopBar.jsx
│           │   ├── ProductCard-v2.jsx
│           │   ├── CartItemCard.jsx
│           │   ├── NovaPoshtaPicker.jsx   ← BottomSheet для міста/відділення
│           │   ├── BottomSheet.jsx
│           │   ├── Autocomplete.jsx
│           │   ├── Empty.jsx / Loading.jsx / Skeleton.jsx
│           │   └── Page.jsx
│           │
│           ├── hooks/
│           └── styles/                design-tokens.css + main-v2.css
│
├── plan.md                             план фаз
├── HANDOFF.md                          техпамятка
├── INTEGRATION.md                      (цей файл — оновлений)
└── design_guidelines.md
```

---

## 3. Потоки (flows) даних

### 3.1 Авторизація (Telegram initData → JWT-like session token)

```
Telegram WebApp → відкриває /tma
                     │
                     ▼
React SDK (lib/telegram-sdk.js)
                     │ WebApp.initData
                     ▼
POST /api/tma/auth { init_data }
                     │
     HMAC_SHA256(WebAppData, BOT_TOKEN) перевірка підпису
     (якщо TMA_ALLOW_SANDBOX=1 і init_data="sandbox:<id>" — пропускається)
                     │
                     ▼
users collection  (upsert за telegram_id)
tma_sessions      (token UUID, expires +30д)
                     │
                     ▼
Response: { token, user }
                     │
                     ▼
localStorage.tma_token → axios Authorization: Bearer <token>
```

Файл: `backend/modules/tma/routes.py#tma_auth` (рядки 186–256).
Підпис перевіряється функцією `validate_init_data` (рядки 31–62) — стандарт Telegram.

### 3.2 Каталог (products, categories, home, search)

```
TMA UI  →  GET /api/tma/categories       →  products collection  aggregate
TMA UI  →  GET /api/tma/products?category=…&q=…&sort=…  →  products.find + sort
TMA UI  →  GET /api/tma/products/{id}     →  products.find_one + related (same category)
TMA UI  →  GET /api/tma/home              →  bestsellers + new_arrivals + categories + banners
TMA UI  →  GET /api/tma/search/suggest?q= →  products regex-search (title, brand)
```

**⚠️ Це головна точка інтеграції з сайтом.**
Зараз читає з локальної `products` (seed або синхронізований кеш). Після інтеграції
**всі 5 ендпоінтів повинні ходити через `site_adapter`** (§5).

### 3.3 Кошик

Кошик **повністю локальний** (Zustand + `persist` → localStorage). Бекенд лише робить
preview-розрахунок `POST /api/tma/cart/preview` з актуальними цінами з БД (підтягуючи
по `product_id`). Інвалідований кошик (товар видалено/немає) просто пропускається.

### 3.4 Оформлення замовлення (4 кроки)

```
Checkout-v3.jsx
  Step 1: контакти       (ПІБ + телефон + email, regex валідація)
  Step 2: НП              (NovaPoshtaPicker — BottomSheet: місто → відділення)
                          city_ref / warehouse_ref ОБОВ'ЯЗКОВІ
  Step 3: оплата          (cash_on_delivery | card)
  Step 4: підтвердження   (підсумок + кнопка "Підтвердити замовлення")
                                     │
                                     ▼
                   POST /api/tma/orders  { items, full_name, phone, city, warehouse,
                                            city_ref, warehouse_ref, payment_method }
                                     │
  ┌──────────────────────────────────┴──────────────────────────────────┐
  │                                                                     │
  ▼ payment_method = "cash_on_delivery"           ▼ payment_method = "card"
                                                                       
  orders.insert (status=new)                       orders.insert (status=new → pending_payment)
  BotActionsService.create_ttn(order_id)           WayForPayProvider.create_payment(order)
     │                                                │
     ▼                                                ▼
  Nova Poshta InternetDocument.save                 POST https://secure.wayforpay.com/pay?behavior=offline
     │                                                │ HMAC_MD5 merchantSignature
     ▼                                                ▼
  IntDocNumber → orders.delivery.tracking_number    payment_url → orders.payment.checkout_url
                                                      │
                                                      ▼
                                                  client redirect → secure.wayforpay.com
                                                      │
                                                      ▼ (користувач оплатив)
                                                  POST /api/v2/payments/wayforpay/webhook
                                                      │  verify HMAC
                                                      ▼
                                                  orders.status = paid
                                                  BotActionsService.create_ttn (auto)
                                                  alerts.alert_order_paid → Telegram
  │                                                │
  └──────────────────┬─────────────────────────────┘
                     ▼
   Telegram bot → admin_chat_ids "🧾 Нове замовлення" з inline-кнопками:
     - 💬 Написати клієнту (t.me/@username)
     - 📦 Створити ТТН (callback create_ttn:<id>)
     - 👁 Деталі (callback view_order:<id>)
```

**Frontend контракт після створення:**
- Відповідь містить `payment_url` → TMA робить `telegram.openLink(payment_url)` або
  `window.location.href = payment_url`. Сесія замовлення зберігається у localStorage
  як `tma_pending_order` (ID + TTL 30 хв).
- TMA перенаправляє на `/tma/order-success` (з `state.orderId`), яка **опитує** бекенд
  кожні 3 с: `GET /api/tma/orders/{id}` поки `status` не стане `paid` / `payment_failed`.

### 3.5 WayForPay Webhook

```
POST /api/v2/payments/wayforpay/webhook
Body:
{
  "merchantAccount": "y_store_in_ua",
  "orderReference": "<order_id>",
  "amount": 59999.0,
  "currency": "UAH",
  "authCode": "12345",
  "cardPan": "4444****1111",
  "transactionStatus": "Approved",
  "reasonCode": 1100,
  "merchantSignature": "<hmac_md5>"
}
     │ verify_signature (HMAC_MD5 по полях:
     │ merchantAccount;orderReference;amount;currency;authCode;cardPan;transactionStatus;reasonCode)
     ▼
orders.status = {Approved→paid | Declined→payment_failed | Expired→payment_failed |
                  Refunded→refunded}
     │
     ▼
(якщо paid): BotActionsService.create_ttn(order_id) → AlertsService.alert_order_paid
     │
     ▼
Response (обов'язковий signed-ack):
{
  "orderReference": "<order_id>",
  "status": "accept",
  "time": <unix>,
  "signature": "<hmac_md5 of: orderReference;status;time>"
}
```

Файл: `backend/modules/payments/wayforpay_routes.py#webhook` (рядки 69–200).
Підпис будується у `wayforpay_signature.py`.

### 3.6 Nova Poshta — автокомпліт + ТТН

**Autocomplete** (TMA Checkout step 2):
```
GET /api/tma/np/cities?q=ки&limit=10
  → cache 10min  → novaposhta_service.search_cities() 
  → NP API v2.0  Address.searchSettlements
  → { items: [{ref, name, full, region}] }

GET /api/tma/np/warehouses?city_ref=<ref>&q=5&limit=30
  → cache 10min  → NP API  AddressGeneral.getWarehouses
  → client-side filter  → { items: [{ref, number, name, short, category}] }
```

**TTN creation** (`bot_actions_service.py#create_ttn`):
```
IF order.payment_method == cash_on_delivery  →  TTN створюється одразу після POST /orders
IF order.payment_method == card              →  TTN створюється після webhook Approved
ELIF idempotent (order вже має tracking_number)  →  return cached

Props:
  PayerType = Recipient
  PaymentMethod = Cash (для COD — з BackwardDeliveryData з сумою)
  CargoType = Parcel, SeatsAmount = 1
  Weight = 1.0 + 0.2 * max(qty-1, 0)  (1 кг база + 0.2 кг за позицію)
  Cost (declared) = max(total_amount, 100)
  CitySender = NP_SENDER_CITY_REF
  Sender = NP_SENDER_COUNTERPARTY_REF
  SenderAddress = NP_SENDER_WAREHOUSE_REF
  ContactSender = NP_SENDER_CONTACT_REF
  SendersPhone = NP_SENDER_PHONE
  CityRecipient = order.delivery.city_ref
  RecipientAddress = order.delivery.warehouse_ref
  RecipientName = order.customer.full_name
  RecipientType = PrivatePerson
  RecipientsPhone = order.customer.phone
  NewAddress = "1"  ← авто-створення контрагента на NP-стороні

→ POST https://api.novaposhta.ua/v2.0/json/  { modelName: "InternetDocument", calledMethod: "save", ... }
→ data[0].IntDocNumber → orders.delivery.tracking_number
```

Якщо NP повертає помилку про відсутність COD-опції у відділення — сервіс автоматично
**ретраїть без BackwardDeliveryData** (регулярна, не накладена).

### 3.7 Telegram Bot (@Ystore_app_bot)

Запущений як окремий supervisor-процес `telegram_bot`. Файл: `modules/bot/simple_bot.py`.

**Customer commands:**
| Команда | Дія |
|---|---|
| `/start`, `/shop` | Видає WebAppInfo-кнопку, що відкриває `TMA_URL` |
| `/help` | Текст-інструкція |
| `/about` | Інформація про магазин |

**Admin mode** (`/be_admin <password>` → `bot_admins` upsert):
Reply-keyboard "Операційна панель":
- Замовлення (нові, pending_payment, затримані)
- Доставка (ТТН, tracking, return marks)
- CRM (сегменти REGULAR/RISK)
- Finance (ledger)
- Returns / Incidents / Support tickets
- Broadcast wizard (маркетинг)

**Alerts** (автоматично з бекенду):
- Нове замовлення → `admin_chat_ids` (з `bot_settings`)
- Оплата отримана (WFP webhook)
- ТТН створено
- Затримки доставки > 24 год (automation_engine кожні 5 хв)

Menu button (glo-level, задається автоматично при старті бота):
```python
bot.set_chat_menu_button(menu_button=MenuButtonWebApp(text="🛍 Магазин", web_app=WebAppInfo(url=TMA_URL)))
```

---

## 4. Моделі даних (MongoDB colections)

### 4.1 `users` (TMA customer)
```js
{
  id: "uuid",
  telegram_id: "577782582",        // string
  telegram_username: "ivanov",
  telegram_photo_url: "...",
  full_name: "Іван Тестенко",
  email: null,
  phone: null,
  role: "customer",
  source: "telegram_tma",
  created_at: ISO,
  last_seen_at: ISO,
  site_user_id: null              // ← ПРИ ІНТЕГРАЦІЇ: заповнюється адаптером після match_user()
}
```

### 4.2 `tma_sessions`
```js
{
  token: "<64 hex>",
  user_id: "<users.id>",
  telegram_id: "577782582",
  created_at: Date,
  expires_at: Date                // TTL index автоматично чистить
}
```

### 4.3 `products`
```js
{
  id: "uuid",
  title: "iPhone 15 Pro Max 256GB",
  slug: "iphone-15-pro-max-…-<8hex>",
  brand: "Apple",
  category_id: "uuid",
  category_slug: "smartphones",
  description: "…",
  price: 59999,
  old_price: 64999,               // nullable
  images: ["https://…"],
  in_stock: true,
  is_bestseller: true,
  rating: 4.9,
  reviews_count: 124,
  specifications: {"Екран":"6.7\"", ...},
  created_at: ISO, updated_at: ISO,
  status: "published"
}
```

### 4.4 `categories`
```js
{
  id: "uuid",
  slug: "smartphones",
  name: "Смартфони", name_uk: "Смартфони",
  icon: "📱",
  image: "https://…",
  product_count: 4,
  created_at: ISO
}
```

### 4.5 `orders` (TMA + реальна CRM)
```js
{
  id: "uuid",
  order_number: "TMA-20260419-A7D689",   // human-readable, передається у WayForPay orderReference
  buyer_id: "<users.id>",
  source: "telegram_tma",
  customer: {
    full_name, first_name, last_name, phone, email,
    telegram_id, telegram_username
  },
  delivery: {
    method: "nova_poshta",
    city_name, city_ref,                 // ← ОБОВ'ЯЗКОВО city_ref (не текст)
    warehouse_name, warehouse_ref,        // ← ОБОВ'ЯЗКОВО warehouse_ref
    delivery_cost: 70,
    tracking_number: "20451419119553",   // після створення ТТН
    tracking_provider: "novaposhta",
    estimated_delivery_date: "19.04.2026"
  },
  items: [
    { product_id, title, quantity, price, image }
  ],
  subtotal, shipping_cost, total_amount, currency: "UAH",
  status: "new|pending_payment|paid|processing|shipped|delivered|payment_failed|cancelled|refunded",
  payment_status: "pending|awaiting_payment|paid|failed",
  payment_method: "card|cash_on_delivery|cash",
  payment: {
    provider: "WAYFORPAY" | "SIMULATION",
    status: "PAID|PENDING|FAILED|REFUNDED",
    checkout_url: "https://secure.wayforpay.com/...",
    provider_payment_id: "<order_id>",
    form_data: {...},                    // fallback для form-redirect
    auth_code, card_pan, paid_at
  },
  comment, created_at, updated_at
}
```

Статуси **lowercase** — не змішувати з uppercase з legacy routes.

### 4.6 `tma_favorites`, `reviews`, `tma_support_tickets` — стандартні.

### 4.7 `bot_settings` (singleton)
```js
{
  id: "global",
  enabled: true,
  admin_chat_ids: ["577782582"],     // куди шлемо сповіщення (ручна конфіг)
  admin_user_ids: [577782582],       // хто має доступ до /be_admin
  triggers: {
    new_order: true,
    order_paid: true,
    big_order_uah: 10000,
    delayed_order_hours: 24
  },
  automation: {
    delay_alerts: { enabled: true },
    risk_marks: { enabled: true, returns_count: 3 }
  }
}
```

---

## 5. ⚠️ site_adapter.py — ЄДИНА точка інтеграції з основним сайтом

Створіть `backend/modules/tma/site_adapter.py`. TMA-gateway викликатиме ці функції
замість прямих Mongo-запитів по товарах/категоріях і буде **дзеркалити** замовлення
у головну CRM сайту.

### 5.1 Обов'язковий мінімум — 3 функції

#### `list_products(filters: dict) -> list[dict]`
```python
async def list_products(filters: dict) -> list[dict]:
    """
    filters = {
      "q": str,                 # пошуковий запит
      "category_slug": str,
      "limit": int, "skip": int,
      "sort": "featured|price_asc|price_desc|new"
    }
    Повертає список товарів у форматі TMAProductOut (див. §4.3).
    """
```

#### `get_product(product_id: str) -> dict | None`
Те саме, але по одному ID. Додатково має повертати `related` (6 штук з тієї ж категорії).

#### `list_categories() -> list[dict]`
```python
async def list_categories() -> list[dict]:
    """
    Повертає масив категорій у форматі TMACategoryOut (§4.4)
    """
```

### 5.2 Дуже бажано (для єдиної CRM) — ще 2 функції

#### `register_order(tma_order: dict) -> dict`
**Критично для бухгалтерії**. Викликається у `tma_create_order` одразу після
`db.orders.insert_one` **і** після кожного апдейту статусу (paid, ttn_created, cancelled).

```python
async def register_order(tma_order: dict) -> dict:
    """
    Ідемпотентно (upsert за order_number) імпортує замовлення у головну CRM.
    Повертає: {"ok": bool, "site_order_id": str, "crm_url": str}
    """
    # POST https://api.y-store.in.ua/api/v1/orders/import з маппінгом полів
```

#### `match_user(telegram_id: int, username: str, phone: str|None) -> dict | None`
Викликається в `/api/tma/auth` **опціонально**. Дозволяє матчити Telegram-user'а з
існуючим профілем сайту (за phone або раніше збереженим telegram_id). Повертає
`site_user_id`, `bonus_points`, `saved_addresses`.

Якщо функція поверне `None` — TMA просто працюватиме як для нового користувача.

### 5.3 Точки, де треба підмінити виклики (у `routes.py`)

| Функція | Було | Стало |
|---|---|---|
| `tma_categories` (ln. 266–280) | `db.categories.find()` | `await site_adapter.list_categories()` |
| `tma_products` (ln. 283–315) | `db.products.find()` | `await site_adapter.list_products({…})` |
| `tma_product` (ln. 318–331) | `db.products.find_one()` | `await site_adapter.get_product(pid)` |
| `tma_home` (ln. 334–379) | `db.products.find()` x3 | `site_adapter.list_products` з sort `featured`/`new` |
| `tma_search_suggest` (shop_routes.py) | `db.products.find(regex)` | `site_adapter.list_products({q, limit:6})` |
| `tma_create_order` після `db.orders.insert_one` (ln. 490) | — | `await site_adapter.register_order(order_doc)` |
| WayForPay webhook після `paid` (wayforpay_routes.py ln. 120–132) | — | `await site_adapter.register_order(updated_order)` |

### 5.4 Варіанти режиму (обрати один)

| Режим | Плюси | Мінуси |
|---|---|---|
| **Read-through** — TMA завжди ходить у сайт | Найчистіше, завжди актуально | +100-300ms latency на кожен запит |
| **Cache-aside** — раз на 10 хв синк `products` у локальний Mongo | Швидко, економно | Eventual consistency |
| **Webhook-based** — сайт пушить `POST /api/tma/internal/product-updated` | Оптимально для великих каталогів | Треба прописати на сайті |

**Рекомендація:** `cache-aside` з TTL 10 хв для `list_products` + `read-through` для
`get_product` (бо картка товару має бути максимально актуальною по stock/ціні).

### 5.5 Скелет `site_adapter.py`

```python
# backend/modules/tma/site_adapter.py
import os, httpx
from typing import Optional

SITE_API_URL = os.getenv("SITE_API_URL", "")
SITE_API_TOKEN = os.getenv("SITE_API_TOKEN", "")


class SiteAdapter:
    def __init__(self):
        self._client: Optional[httpx.AsyncClient] = None

    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=SITE_API_URL,
                headers={"Authorization": f"Bearer {SITE_API_TOKEN}"},
                timeout=15,
            )
        return self._client

    # ---------- Products ----------
    async def list_products(self, filters: dict) -> list[dict]:
        r = await self.client.get("/api/v1/products", params=filters)
        r.raise_for_status()
        raw = r.json().get("items", [])
        return [self._normalize_product(p) for p in raw]

    async def get_product(self, pid: str) -> Optional[dict]:
        r = await self.client.get(f"/api/v1/products/{pid}")
        if r.status_code == 404:
            return None
        r.raise_for_status()
        return self._normalize_product(r.json())

    async def list_categories(self) -> list[dict]:
        r = await self.client.get("/api/v1/categories")
        r.raise_for_status()
        return [self._normalize_category(c) for c in r.json().get("items", [])]

    # ---------- Orders ----------
    async def register_order(self, tma_order: dict) -> dict:
        payload = self._map_order(tma_order)
        r = await self.client.post("/api/v1/orders/import", json=payload)
        r.raise_for_status()
        data = r.json()
        return {
            "ok": True,
            "site_order_id": data.get("id"),
            "crm_url": data.get("admin_url"),
        }

    # ---------- Users ----------
    async def match_user(self, telegram_id: int, username: str, phone: Optional[str]) -> Optional[dict]:
        r = await self.client.post("/api/v1/users/match", json={
            "telegram_id": telegram_id,
            "telegram_username": username,
            "phone": phone,
        })
        if r.status_code != 200:
            return None
        return r.json()

    # ---------- Normalizers (ПІД ВАШУ БАЗУ) ----------
    def _normalize_product(self, p: dict) -> dict:
        return {
            "id": str(p["id"]),
            "title": p["name"],
            "slug": p.get("slug"),
            "brand": p.get("brand"),
            "category_id": str(p.get("category_id") or ""),
            "category_slug": (p.get("category") or {}).get("slug"),
            "description": p.get("description", ""),
            "price": float(p["price"]),
            "old_price": float(p["old_price"]) if p.get("old_price") else None,
            "images": p.get("gallery") or p.get("images", []),
            "in_stock": p.get("in_stock", True),
            "is_bestseller": p.get("is_bestseller", False),
            "rating": float(p.get("rating", 0)),
            "reviews_count": int(p.get("reviews_count", 0)),
            "specifications": p.get("specs") or {},
        }

    def _normalize_category(self, c: dict) -> dict:
        return {
            "id": str(c["id"]),
            "slug": c["slug"],
            "name": c["name"],
            "name_uk": c.get("name_uk") or c["name"],
            "icon": c.get("icon"),
            "image": c.get("image"),
            "product_count": int(c.get("products_count", 0)),
        }

    def _map_order(self, o: dict) -> dict:
        return {
            "external_id": o["order_number"],
            "source": "telegram_mini_app",
            "customer": o["customer"],
            "line_items": [
                {
                    "sku": it["product_id"],
                    "qty": it["quantity"],
                    "unit_price": it["price"],
                }
                for it in o["items"]
            ],
            "delivery": o["delivery"],
            "totals": {
                "subtotal": o["subtotal"],
                "shipping": o["shipping_cost"],
                "total": o["total_amount"],
            },
            "status": o["status"],
            "payment": o.get("payment"),
            "metadata": {
                "order_number": o["order_number"],
                "telegram_id": o["customer"].get("telegram_id"),
                "telegram_username": o["customer"].get("telegram_username"),
            },
        }


site_adapter = SiteAdapter()
```

### 5.6 Feature-flag (щоб підключити адаптер не ламаючи поточну TMA)

Додайте у `.env`:
```
SITE_ADAPTER_ENABLED=0   # 0 — використовувати локальну Mongo (seed), 1 — ходити в сайт
```

У `routes.py`:
```python
USE_ADAPTER = os.environ.get("SITE_ADAPTER_ENABLED") == "1"

if USE_ADAPTER:
    from modules.tma.site_adapter import site_adapter
    items = await site_adapter.list_products({"q": q, "category_slug": category, "limit": limit})
else:
    items = [product_to_out(p) async for p in db.products.find({...})]
```

Це дозволить вам викласти TMA, пересвідчитись, що нічого не зламалось, і поступово
переключати ендпоінти на адаптер (спочатку `list_products`, потім `get_product` тощо).

---

## 6. Environment variables (повний список для production)

### 6.1 Обов'язкові — працюють, уже заповнені в `/app/backend/.env`

```bash
# MongoDB
MONGO_URL="mongodb://localhost:27017"   # або mongodb+srv://... для production
DB_NAME="tma_store"
CORS_ORIGINS="*"                         # або "https://y-store.in.ua,https://tma.y-store.in.ua"

# Telegram Bot (@Ystore_app_bot)
TELEGRAM_BOT_TOKEN="8524617770:AAECLj0A8wTjg3cy-KxYcIkvlK4HE3VROqY"
TMA_URL="https://tma.y-store.in.ua/tma"        # ← замінити на свій домен
APP_URL="https://tma.y-store.in.ua"            # ← замінити на свій домен
TMA_ALLOW_SANDBOX="0"                          # ← 0 у production (1 у dev/preview)

# Nova Poshta — sender ФОП ТИЩЕНКО ОЛЕКСАНДР МИКОЛАЙОВИЧ
NOVAPOSHTA_API_KEY="5cb1e3ebc23e75d737fd57c1e056ecc9"
NP_API_KEY="5cb1e3ebc23e75d737fd57c1e056ecc9"   # дубль — деякі сервіси читають його
NP_SENDER_NAME="Y-Store"
NP_SENDER_PHONE="380637247703"
NP_SENDER_COUNTERPARTY_REF="07f0c105-442e-11ea-8133-005056881c6b"
NP_SENDER_CONTACT_REF="4deeee78-44d2-11ea-8133-005056881c6b"
NP_SENDER_CITY_REF="8d5a980d-391c-11dd-90d9-001a92567626"    # Київ
NP_SENDER_WAREHOUSE_REF="1ec09d88-e1c2-11e3-8c4a-0050568002cf"

# WayForPay
WAYFORPAY_MERCHANT_ACCOUNT="y_store_in_ua"
WAYFORPAY_MERCHANT_SECRET="4f27e43c7052b31c5df78863e0119b51b1e406ef"
WAYFORPAY_MERCHANT_PASSWORD="a6fcf5fe2a413bdd25bb8b2e7100663a"
WAYFORPAY_MERCHANT_DOMAIN="y-store.in.ua"
WAYFORPAY_RETURN_URL="https://tma.y-store.in.ua/tma/order-success"
WAYFORPAY_SERVICE_URL="https://tma.y-store.in.ua/api/v2/payments/wayforpay/webhook"

# JWT
JWT_SECRET_KEY="<random 32+ chars — згенерувати openssl rand -hex 32>"
JWT_ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_DAYS="7"
```

### 6.2 Додати при інтеграції з сайтом (§5)

```bash
SITE_ADAPTER_ENABLED="1"
SITE_API_URL="https://api.y-store.in.ua"
SITE_API_TOKEN="<service-to-service token, згенерувати в адмінці сайту>"
SITE_WEBHOOK_SECRET="<HMAC для webhook з сайту → TMA>"
```

### 6.3 Frontend — `.env` (НЕ ЧІПАТИ)

```bash
REACT_APP_BACKEND_URL="https://tma.y-store.in.ua"
WDS_SOCKET_PORT=443
```

---

## 7. Deployment checklist (production)

### 7.1 DNS / nginx
Варіант A (окремий піддомен):
```nginx
server {
    server_name tma.y-store.in.ua;
    listen 443 ssl http2;
    ssl_certificate     /etc/letsencrypt/live/tma.y-store.in.ua/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tma.y-store.in.ua/privkey.pem;

    # Frontend
    location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; }
    # Backend
    location /api/ { proxy_pass http://127.0.0.1:8001; proxy_set_header Host $host; }
}
```

Варіант B (reverse-proxy на існуючий домен):
```nginx
location /tma/       { proxy_pass http://tma-frontend:3000/; }
location /api/tma/   { proxy_pass http://tma-backend:8001/; }
location /api/v2/payments/wayforpay/  { proxy_pass http://tma-backend:8001/; }
```

### 7.2 Supervisor services
Конфіги вже в репі (`supervisord_telegram_bot.conf`). Потрібні процеси:
- `backend` (FastAPI, port 8001)
- `frontend` (React dev OR `yarn build` + nginx)
- `mongodb` (локальна OR mongodb+srv)
- `telegram_bot` (aiogram polling)

### 7.3 WayForPay кабінет
1. Увійти у https://m.wayforpay.com → Мерчанти → обрати `y_store_in_ua`.
2. Вкладка **Налаштування** → поле **«URL для серверного зворотного повідомлення»** →
   `https://tma.y-store.in.ua/api/v2/payments/wayforpay/webhook`.
3. Перевірити IP-whitelist (якщо увімкнений — додати IP сервера).

### 7.4 @BotFather
1. `/mybots` → `@Ystore_app_bot` → **Bot Settings → Menu Button** →
   URL: `https://tma.y-store.in.ua/tma`
   Text: `🛍 Магазин`
2. **Domain** (для Web App) → `https://tma.y-store.in.ua`.

### 7.5 Indexes (створюються автоматично при старті `server.py#lifespan`)

```python
users.id (unique), users.telegram_id (sparse)
products.id (unique), products.category_id, products.category_slug
categories.id (unique), categories.slug (unique)
orders.id (unique), orders.buyer_id
tma_sessions.token (unique), tma_sessions.expires_at (TTL)
tma_favorites (user_id + product_id unique compound)
tma_support_tickets.id (unique)
```

### 7.6 Smoke test
```bash
# 1. Health
curl https://tma.y-store.in.ua/api/health
# {"status":"ok","service":"tma-api"}

# 2. Categories (сід має бути застосований автоматично при першому старті)
curl https://tma.y-store.in.ua/api/tma/categories | jq length
# 8

# 3. TMA UI (у браузері)
open https://tma.y-store.in.ua/tma
# має авторизуватись у sandbox-режимі (якщо ALLOW_SANDBOX=1) або redirect 401

# 4. Replay WayForPay webhook (test payload)
curl -X POST https://tma.y-store.in.ua/api/v2/payments/wayforpay/webhook \
     -H "Content-Type: application/json" \
     -d '{"merchantAccount":"y_store_in_ua","orderReference":"TEST","amount":100,"currency":"UAH","transactionStatus":"Approved","reasonCode":1100,"merchantSignature":"<build_hmac>"}'
# очікуємо: {"orderReference":"TEST","status":"accept","time":...,"signature":"..."}
```

---

## 8. Виявлені проблеми / нюанси аудиту

### 8.1 Hard-coded `store-info`
`modules/tma/routes.py#get_store_info` (ln. 793–881) повертає **захардкоджений JSON**
(ФОП, EDRPOU, IBAN, адреса тощо). При інтеграції з сайтом це має прийти з адаптера
(або з окремої колекції `shop_settings`). **TODO:** `site_adapter.get_store_info()`.

### 8.2 `telegram_bff.py` існує, але фронт не використовує
Агрегований BFF (`/api/tma-bff/*`) імпортований у `server.py`, але фронт звертається
тільки до `/api/tma/*`. Рекомендація: **видалити `telegram_bff.py`** з `server.py`,
щоб не плутати dev'а, або інтегрувати у фронт.

### 8.3 `SITE_ADAPTER` феатура ще **не впроваджена**
Наразі `tma_categories` / `tma_products` / `tma_product` читають з локального Mongo.
Дев має додати адаптер (§5) і feature-flag.

### 8.4 `make-me-admin` (DEV ONLY)
`POST /api/tma/admin/make-me-admin` (ln. 987–1020) — **не захищений**, будь-який
авторизований TMA-user може стати OWNER. **У production: видалити або захистити
паролем/whitelist.**

### 8.5 `simulate-payment` (DEV ONLY)
`POST /api/tma/orders/{id}/simulate-payment` працює тільки коли `TMA_ALLOW_SANDBOX=1`.
У production має бути `TMA_ALLOW_SANDBOX=0` — endpoint автоматично повертає 403.
**Дубль-перевірити перед продакшеном!**

### 8.6 JWT — не JWT
`tma_sessions.token` — це UUID, не JWT. Логічно, бо тільки читається з БД. Але
`JWT_SECRET_KEY` / `JWT_ALGORITHM` у `.env` не використовуються ніде в TMA-роутах.
Ризик: відмовив Mongo → немає авторизації. Для production варто переключити на
signed JWT (бібл. `PyJWT` уже є у requirements).

### 8.7 Hardcoded banners на home
`tma_home` повертає 2 захардкоджені банери з Unsplash. При інтеграції:
`site_adapter.list_banners()` з бази сайту.

### 8.8 Admin-alerts: 2 канали — дубль
Код робить і `AlertsService.alert_new_order` (черга), і прямий `POST sendMessage`
fallback. Це нормально (fallback якщо worker не крутиться), але якщо worker працює —
адмін отримає **2 повідомлення**. Варіант: в `alerts_service.py` додати прапорець
`direct_sent=True` коли worker впорався, і не дублювати fallback.

### 8.9 CORS `*` — не для production
У `.env` `CORS_ORIGINS="*"` — ОК для preview, але у production замінити на
`"https://y-store.in.ua,https://tma.y-store.in.ua"`.

### 8.10 Відсутній `/api/tma/store-info` у адаптері
Якщо сайт оновить контакти/ФОП — TMA цього не побачить. Виніс у адаптер або
`bot_settings` в Mongo, керовані з адмінки сайту.

### 8.11 Повторне оголошення `@router.get("/store-info")` (ln. 793–794)
Дубль декоратора — синтаксично валідно, але це помилка copy-paste. Варто прибрати.

### 8.12 Нема Webhook-Retry для WayForPay
Якщо TMA пропустив webhook (downtime) — статус замовлення залишиться `pending_payment`.
WayForPay **не ретраїть** автоматично. Варто раз на 10 хв крутити cron, який по всіх
`pending_payment > 15 min` викликає `WayForPayProvider.check_status(order_ref)`.
**TODO:** додати у `jobs/scheduler.py` (стаб уже є).

### 8.13 TTN creation — один retry, але без логіки "переважно без COD"
`bot_actions_service.create_ttn` не ретраїть без COD, якщо NP повертає помилку.
`INTEGRATION.md` згадує це (§2.4), але в коді — поки НЕ реалізовано у `simple_bot`
варіанті. Перевірити: якщо NP повертає "`PayerType` не дозволений для Поштомату" —
зробити другий виклик без `BackwardDeliveryData` і позначити замовлення як "no_cod".

### 8.14 Відгуки (reviews) пишуться тільки в Mongo TMA
При інтеграції: або sync у сайт, або показувати **тільки з сайту** (read-only).
Інакше маркетологи побачать різні цифри.

---

## 9. API Endpoints (повний список TMA gateway)

Префікс: `/api/tma` (крім WayForPay webhook і health).
Авторизація: `Authorization: Bearer <session_token>` — обов'язково для всього, крім
`/auth`, `/home`, `/categories`, `/products`, `/products/{id}`, `/search/suggest`,
`/np/cities`, `/np/warehouses`, `/store-info`.

| Method | Path | Auth | Опис |
|---|---|---|---|
| POST | `/auth` | ❌ | `init_data` → session token |
| GET  | `/me` | ✅ | Поточний user |
| GET  | `/home` | ❌ | banners + categories + bestsellers + new_arrivals |
| GET  | `/categories` | ❌ | Усі категорії |
| GET  | `/products` | ❌ | `?category=&q=&sort=&limit=&skip=` |
| GET  | `/products/{id}` | ❌ | Товар + `related` |
| GET  | `/search/suggest` | ❌ | `?q=&limit=6` |
| POST | `/cart/preview` | ❌ | `{items: [{product_id, quantity}]}` → підсумок |
| POST | `/orders` | ✅ | створення замовлення (+WFP session / auto-TTN) |
| GET  | `/orders` | ✅ | історія замовлень |
| GET  | `/orders/{id}` | ✅ | одне (для полінгу) |
| DELETE | `/orders/{id}` | ✅ | тільки неоплачені, без ТТН |
| POST | `/orders/{id}/simulate-payment` | ✅ | **DEV-only** (sandbox) |
| GET  | `/np/cities` | ❌ | `?q=&limit=` |
| GET  | `/np/warehouses` | ❌ | `?city_ref=&q=&limit=` |
| GET  | `/favorites` | ✅ | повні товари |
| GET  | `/favorites/ids` | ✅ | лише IDs для локальних кешів |
| POST | `/favorites/toggle` | ✅ | `{product_id}` |
| GET  | `/products/{id}/reviews` | ❌ | список + avg |
| POST | `/reviews` | ✅ | `{product_id, rating, comment}` |
| GET  | `/support/tickets` | ✅ | мої тікети |
| POST | `/support/tickets` | ✅ | новий тікет |
| POST | `/support/ticket` | ✅ | (дубль endpoint — є в `routes.py`) |
| GET  | `/support/my-tickets` | ✅ | (ще один дубль) |
| GET  | `/store-info` | ❌ | ФОП, реквізити — зараз hardcoded |
| GET  | `/my-orders` | ✅ | (дубль `/orders`) |
| POST | `/admin/make-me-admin` | ✅ | **DEV-only** (§8.4) |

### Публічні payment endpoints

| Method | Path | Опис |
|---|---|---|
| POST | `/api/v2/payments/wayforpay/create` | Стандартне створення WFP-сесії |
| POST | `/api/v2/payments/wayforpay/webhook` | Callback з WFP (обов'язковий signed-response) |
| GET  | `/api/v2/payments/wayforpay/status/{order}` | Пряма перевірка статусу |
| POST | `/api/v2/payments/wayforpay/refund` | Рефанд (full/partial) |

### Health/legacy

| Method | Path | Опис |
|---|---|---|
| GET | `/api/health` | liveness |
| GET | `/api` | ping |
| POST | `/api/analytics/event` | no-op (legacy) |
| GET | `/api/cart` | no-op (legacy) |
| GET | `/api/v2/auth/me` | no-op (legacy) |

---

## 10. Що **НЕ МОЖНА** чіпати (критичні інваріанти)

1. **Префікс `/api`** — у backend routes. Інгрес/nginx маршрутизація залежить від нього.
2. **Backend binding** `0.0.0.0:8001` — supervisor біндить саме так.
3. **`REACT_APP_BACKEND_URL`** і **`MONGO_URL`** у `.env` — не перезаписувати.
4. **WayForPay `payment_url` → лише redirect.** Не робити прямих card-request'ів з
   фронта. PCI-compliance не потрібен, бо карта вводиться на стороні WayForPay.
5. **Webhook `/api/v2/payments/wayforpay/webhook`** — публічний endpoint з перевіркою
   `merchantSignature`. Не закривати авторизацією.
6. **`city_ref` / `warehouse_ref`** у замовленні — обов'язково зберігати.
7. **Lowercase статуси** (`paid`, `pending_payment`, ...) — не змішувати з uppercase.
8. **NovaPoshtaPicker — лише BottomSheet.** Dropdown поверх input на мобільному —
   забороняється (keyboard overlap).
9. **Sandbox auth** (`TMA_ALLOW_SANDBOX=1`) — вимкнути у production (`=0`).
10. **Signed webhook-response** (`{orderReference, status, time, signature}`) —
    WayForPay повторюватиме webhook поки не отримає валідний підпис.

---

## 11. Тестування інтеграції (для дева)

### 11.1 Smoke (без сайту, з локальним seed)
```bash
# Backend
cd /app/backend && python -c "from server import app; print('ok')"
curl localhost:8001/api/health
curl localhost:8001/api/tma/categories | jq length   # 8

# Bot
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe"
# { "ok":true, "result":{"id":8524617770,"username":"Ystore_app_bot",...} }

# WayForPay сигнатура (sanity-check)
python -c "
from modules.payments.providers.wayforpay.wayforpay_signature import build_signature
data = {'merchantAccount':'y_store_in_ua','merchantDomainName':'y-store.in.ua',
        'orderReference':'TEST-123','orderDate':1234567890,
        'amount':100,'currency':'UAH',
        'productName':['test'],'productCount':[1],'productPrice':[100]}
print(build_signature(data, '<your_secret>'))
"
```

### 11.2 Після інтеграції адаптера
```bash
SITE_ADAPTER_ENABLED=1 supervisorctl restart backend

# Перевірити, що products тепер з сайту
curl "localhost:8001/api/tma/products?q=iphone" | jq '.items[0]'
# Має містити поля з вашої продакшн-бази, не seed

# Створити test-замовлення в sandbox
curl -X POST localhost:8001/api/tma/auth -d '{"init_data":"sandbox:99999"}' -H "Content-Type: application/json"
# → token

curl -X POST localhost:8001/api/tma/orders \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{
       "items":[{"product_id":"<real_id_from_site>","quantity":1}],
       "full_name":"Тест Тестенко",
       "phone":"+380501112233",
       "city":"Київ","city_ref":"8d5a980d-391c-11dd-90d9-001a92567626",
       "warehouse":"Відділення №1","warehouse_ref":"1ec09d88-e1c2-11e3-8c4a-0050568002cf",
       "payment_method":"cash_on_delivery"
     }'
# → має повернути замовлення + tracking_number (якщо NP сендер налаштований)
# → у сайті в адмінці — нове замовлення з external_id=TMA-...
```

### 11.3 Симуляція WFP webhook
Поки сайт не перевів у production WayForPay — можна використовувати sandbox endpoint
`POST /api/tma/orders/{id}/simulate-payment` (TMA_ALLOW_SANDBOX=1).

---

## 12. Roadmap (після інтеграції — що зробити)

### P1 — Production hardening
- [ ] `TMA_ALLOW_SANDBOX=0` + видалити/захистити `/admin/make-me-admin`
- [ ] Переключити `tma_sessions` на справжні JWT (`PyJWT`) з підписом `JWT_SECRET_KEY`
- [ ] Додати `/api/v2/payments/wayforpay/reconcile-cron` → раз на 10 хв по pending
- [ ] CORS_ORIGINS обмежити до конкретних доменів
- [ ] Фікс `/store-info` → адаптер / Mongo
- [ ] Дедубль admin-alerts (worker OR fallback, не обидва)

### P2 — UX polish
- [ ] Telegram MainButton policy per route (Product→"Додати в кошик",
      Cart→"Оформити", Checkout→"Підтвердити замовлення")
- [ ] BackButton on product/checkout
- [ ] Haptic на add-to-cart / success
- [ ] Image optimization (lazy + onError placeholder)

### P3 — Growth
- [ ] Deep-link з бот-повідомлень у TMA (`/tma/product/<id>?utm=bot_alert`)
- [ ] Retention worker (24h після purchase → "Як вам товар?")
- [ ] Рекомендаційна система на `site_adapter.list_products({sort:"similar", product_id})`
- [ ] Instant Buy для повторних покупців (skip Checkout step 1)

---

## 13. Контакти / саппорт інтеграції

- Токен бота, ключі НП, мерчант WFP — у `INTEGRATION.md` (git) + `backend/.env`.
- ФОП-аккаунт НП: ТИЩЕНКО О.М. — поки що на Y-Store. **Якщо міняється → §10.1 у HANDOFF.md.**
- WayForPay мерчант: `y_store_in_ua` — `https://m.wayforpay.com`
- Telegram bot owner: Telegram ID з `bot_settings.admin_user_ids`

> Готово до передачі. Дев-розробник має все необхідне: код, токени, структуру, скелет
> адаптера, feature-flag, deployment checklist, smoke-тести.
