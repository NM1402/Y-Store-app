# Y‑Store TMA — Technical Handoff

**Status:** Production‑ready core flow
**Last updated:** 2026‑04‑19
**Owner contract:** Telegram Mini App client + Adapter over existing site backend.

---

## 1. Architectural contract (не змінювати)

```
Telegram Mini App (React, /tma/*)
            │  (HTTPS)
            ▼
  TMA Gateway  /api/tma/*     ← тонкий адаптер, без бізнес‑логіки
            │
            ▼
  Existing site backend (FastAPI + MongoDB)
            │
            ▼
  External providers: Nova Poshta, WayForPay, Telegram Bot API
```

Головні правила:

- TMA **не дублює** бізнес‑логіку сайту.
- Вся «розумність» (стани, валідація, UX) живе у клієнті.
- Gateway `/api/tma/*` — лише перевірка сесії + нормалізація даних.
- Backend — єдине джерело правди для `orders`, `products`, `users`.

---

## 2. Environment variables (backend `.env`)

Обов'язкові:

```
MONGO_URL=mongodb://localhost:27017
DB_NAME=tma_store
CORS_ORIGINS=*

TELEGRAM_BOT_TOKEN=<bot token>
TMA_URL=https://<host>/tma
APP_URL=https://<host>
TMA_ALLOW_SANDBOX=1        # увімкнути лише в dev/preview

NOVAPOSHTA_API_KEY=<np key>
NP_API_KEY=<np key>        # дубль — деякі сервіси читають цю змінну

WAYFORPAY_MERCHANT_ACCOUNT=<merchant login>
WAYFORPAY_MERCHANT_SECRET=<secret key>
WAYFORPAY_MERCHANT_PASSWORD=<password>
WAYFORPAY_MERCHANT_DOMAIN=<your-domain>
WAYFORPAY_RETURN_URL=https://<host>/tma/order-success
WAYFORPAY_SERVICE_URL=https://<host>/api/v2/payments/wayforpay/webhook

JWT_SECRET_KEY=<random 32+ chars>
```

Frontend `.env` — не чіпати:

```
REACT_APP_BACKEND_URL=https://<host>
```

---

## 3. Обов'язкові endpoints TMA gateway

Префікс: `/api/tma`. Усі endpoints, крім `/auth` та публічного каталогу, потребують `Authorization: Bearer <token>`.

| Method | Path                        | Призначення                                              |
| ------ | --------------------------- | -------------------------------------------------------- |
| POST   | `/auth`                     | Обмін `initData` на `session_token` (або `sandbox:<id>`) |
| GET    | `/me`                       | Поточний користувач                                      |
| GET    | `/home`                     | Стрічка головної                                         |
| GET    | `/categories`               | Категорії                                                |
| GET    | `/products`                 | Список товарів + фільтри (`q`, `category_slug`, ...)     |
| GET    | `/products/{id}`            | Деталі товару                                            |
| GET    | `/search/suggest`           | Підказки пошуку                                          |
| POST   | `/cart/preview`             | Preview суми кошика                                      |
| POST   | `/orders`                   | Створення замовлення (+ WFP session для card)            |
| GET    | `/orders`                   | Мої замовлення                                           |
| GET    | `/orders/{id}`              | Статус замовлення (polling)                              |
| GET    | `/np/cities?q=&limit=`      | Nova Poshta — пошук міст                                 |
| GET    | `/np/warehouses?city_ref=&q=&limit=` | NP — пошук відділень                             |
| GET    | `/store-info`               | ФОП, реквізити, контакти                                 |
| GET    | `/favorites` / `/favorites/ids` / POST `/favorites/toggle` | Обране    |

Платіжний webhook (WayForPay → backend):

```
POST /api/v2/payments/wayforpay/webhook
```

Вхід — JSON від WFP. Відповідь — підписаний `{orderReference, status, time, signature}`. Це **єдиний** шлях переходу `pending_payment → paid`.

---

## 4. Order state machine

```
                         ┌──────────────────┐
cash → (POST /orders) →  │  new             │
                         └────────┬─────────┘
                                  │ (manual via admin bot / delivery)
                                  ▼
                         ┌──────────────────┐
                         │  paid            │
                         └──────────────────┘

                         ┌──────────────────┐
card → (POST /orders) →  │  pending_payment │  ← повертає payment_url
                         └────────┬─────────┘
                        webhook ↙     ↘ webhook
                ┌──────────────┐   ┌──────────────────┐
                │  paid        │   │  payment_failed  │
                └──────────────┘   └──────────────────┘
                                          │
                                          ▼ (user retry)
                                   pending_payment
```

Статуси (нижній регістр, single source of truth):

- `new` — створено, оплата не потрібна на цьому кроці (cash)
- `pending_payment` — створено, чекаємо WayForPay
- `paid` — оплачено (WFP webhook `transactionStatus=Approved`)
- `payment_failed` — не оплачено (WFP `Declined`/`Expired`)
- `refunded` — повернуто
- `cancelled` — скасовано

Також у документі `order.payment` зберігається:

```json
{
  "provider": "WAYFORPAY",
  "status": "PAID",
  "checkout_url": "https://secure.wayforpay.com/...",
  "provider_payment_id": "...",
  "auth_code": "...",
  "paid_at": "2026-..."
}
```

---

## 5. Checkout flow (клієнтський контракт)

```
Cart
  ↓
Checkout step 1 (contact) → step 2 (NP) → step 3 (payment) → step 4 (summary)
  ↓
POST /api/tma/orders  { items, full_name, first/last_name, phone,
                        city, city_ref, warehouse, warehouse_ref,
                        payment_method: 'card' | 'cash_on_delivery' }
  ↓
  ├── cash         → redirect → /tma/order-success  (state: paid/new)
  └── card         → save pending to localStorage → open payment_url
                   → /tma/order-success (polling)
                          ↓ webhook ...
                     status: paid → success UI
                     status: pending_payment → "Оплатити" CTA (reuses payment_url)
                     status: payment_failed → "Спробувати ще раз"
```

Gateway ДОВЖЕН:

- зберігати **`city_ref` та `warehouse_ref`** (не текст).
- повертати `payment_url` у відповіді на `POST /orders` для card‑оплати.
- приймати lowercase `payment_method` значення: `card`, `cash_on_delivery`.

---

## 6. Nova Poshta — UX контракт

- Input — лише read‑only trigger, який відкриває `BottomSheet`.
- Пошук міст: мінімум 2 літери, debounce 250ms, limit 20.
- Вибір міста → автоматично відкриває sheet відділень.
- Warehouse sheet підвантажує всі відділення міста + client‑side фільтр по номеру/адресі.
- Зберігається `cityRef` / `warehouseRef` (рядки). Без них checkout НЕ дозволяє submit (валідація `Виберіть з зі списку`).

---

## 7. Валідація (клієнт)

```js
phone:  /^(\+?380)\d{9}$/                    // після видалення нецифр
name:   /^[A-Za-zА-ЯЁІЇЄҐа-яёіїєґ\s'\u2019-]{2,30}$/
cityRef, warehouseRef: required non‑empty
email:  optional
```

UI: тост з описом помилки, без фейкового «Успіх».

---

## 8. Поллінг статусу (`OrderSuccess`)

- При mount сторінки `state.orderId || localStorage.tma_pending_order.id`.
- Інтервал: `setInterval(loadOrder, 3000)` поки `status ∉ {paid, payment_failed, cancelled}`.
- `paid` → очищає `localStorage.tma_pending_order` → success UI.
- `pending_payment` → показує кнопку "Оплатити" (`tg.openLink(payment_url)`).
- TTL `localStorage` запису — 30 хв, після чого чиститься.

---

## 9. Service control

```bash
# перезапуск
sudo supervisorctl restart backend frontend

# Telegram bot (polling, поза supervisor)
bash /app/backend/start_simple_bot.sh
pkill -f 'modules.bot.simple_bot'

# логи
tail -n 100 /var/log/supervisor/backend.err.log
tail -n 100 /var/log/supervisor/frontend.out.log
tail -n 100 /var/log/telegram_bot.log

# health
curl http://localhost:8001/api/health
```

---

## 10. Що **НЕ МОЖНА** ламати

Якщо зламаєш це — TMA перестане бути стабільним продуктом.

1. **`REACT_APP_BACKEND_URL` і `MONGO_URL`** в `.env` — не перезаписувати.
2. **Префікс `/api`** для всіх backend routes (ingress routing залежить від нього).
3. Backend має зв'язуватись з `0.0.0.0:8001` — не змінювати.
4. **Ніякої бізнес‑логіки** у `/api/tma/*` шарі — лише проксі + перевірка сесії.
5. **`city_ref` / `warehouse_ref`** — обов'язково зберігати у замовленні.
6. WayForPay `payment_url` → **тільки redirect**, жодних прямих card‑запитів з фронта.
7. Webhook `/api/v2/payments/wayforpay/webhook` — **публічний** endpoint з перевіркою `merchantSignature`. Не закривати авторизацією.
8. Статуси замовлення — lowercase (`paid`, `pending_payment`, ...). Не змішувати з uppercase.
9. NP picker — **тільки BottomSheet**. Dropdown поверх input на мобільному НЕ використовувати.
10. Sandbox auth (`init_data = 'sandbox:<id>'`) — **вимкнути** у production (`TMA_ALLOW_SANDBOX=0`).

---

## 11. Що зроблено в цій ітерації

- [x] Повне розгортання репозиторію в `/app` + bot token + NP key у `.env`
- [x] Telegram bot `@Ystore_app_bot` — polling + MenuButton на TMA
- [x] Nova Poshta BFF: `/api/tma/np/cities`, `/api/tma/np/warehouses`
- [x] `NovaPoshtaPicker` на BottomSheet (без keyboard overlap)
- [x] WayForPay інтеграція: order creation → `payment_url` → redirect → webhook → `paid`
- [x] `Checkout-v3` — валідація, CTA з сумою, secondary button
- [x] `OrderSuccess` — state polling, "Оплатити" UI для pending
- [x] Кольорова ієрархія: ціна чорна, total card нейтральна, teal — лише для CTA/selected/success

Ready for production. End-to-end verified.
