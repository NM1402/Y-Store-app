# 🛍 Y-Store Telegram Mini App — Integration Package

> **Self-contained snapshot** всього проєкту для передачі розробнику основного сайту `y-store.in.ua`.
> Усе, що стосується TMA, знаходиться в цій одній папці: код, конфіги, документація, ключі.
>
> **Версія:** 2026-04-19 · **Статус:** ✅ Ready for handoff · **Bot:** [@Ystore_app_bot](https://t.me/Ystore_app_bot)

---

## 🗺 Карта пакета

```
tma-package/
│
├── 📖 README.md                        ← ВИ ТУТ · entry point
│
├── 📚 docs/                            ← ДОКУМЕНТАЦІЯ (читати в порядку номерів)
│   ├── 01_ARCHITECTURE.md              ← повна архітектура + flows + API + models (13 розділів)
│   ├── 02_HANDOFF.md                   ← executive summary + dev-чеклист
│   ├── 03_INTEGRATION_KEYS.md          ← всі реальні ключі (NP, WFP, Telegram)
│   ├── 04_TECH_NOTES.md                ← технічна пам'ятка
│   ├── 05_DESIGN_GUIDELINES.md         ← UI/UX guidelines (v2 дизайн-система)
│   └── 06_DEV_PLAN.md                  ← історія фаз розробки
│
├── 🔧 backend/                         ← FastAPI backend (повний snapshot)
│   ├── server.py                       FastAPI entry
│   ├── requirements.txt                всі залежності зафіксовані
│   ├── core/                           config, db, models, security
│   └── modules/
│       ├── tma/                        ← /api/tma/* gateway
│       │   ├── routes.py               BFF для TMA UI
│       │   ├── nova_poshta_routes.py   NP autocomplete
│       │   └── site_adapter.py         ⚡ ТОЧКА ІНТЕГРАЦІЇ
│       ├── payments/                   WayForPay (create + webhook + refund)
│       ├── delivery/np/                Nova Poshta (ТТН + tracking)
│       └── bot/                        Telegram bot (aiogram)
│
├── 🎨 frontend/                        ← React TMA (повний snapshot)
│   ├── package.json                    всі залежності зафіксовані
│   ├── .env.example                    шаблон (REACT_APP_BACKEND_URL)
│   └── src/tma-mobile/                 TMA UI
│       ├── App.jsx                     routing + responsive adapter
│       ├── screens/                    12 екранів (Home, Catalog, Product, Checkout, …)
│       ├── components/                 ProductCard, BottomNav, NovaPoshtaPicker, …
│       ├── store/                      Zustand (cart, auth, user, checkout)
│       ├── lib/                        api-client, telegram-sdk, validators, np-client
│       └── styles/                     design-tokens.css + responsive-fix.css
│
├── ⚙️ config/                          ← КОНФІГИ ДЛЯ DEV-OPS
│   ├── env.example                     шаблон backend/.env (всі ключі)
│   ├── nginx_example.conf              2 варіанти (окремий домен / reverse-proxy)
│   └── supervisord_telegram_bot.conf   supervisor unit для бота
│
├── 🚀 scripts/                         ← АВТОМАТИЗАЦІЯ
│   ├── deploy.sh                       одна команда: `./scripts/deploy.sh`
│   └── smoke_test.sh                   перевірка всіх endpoint'ів
│
└── 🔌 integration/                     ← ТОЧКА ІНТЕГРАЦІЇ З САЙТОМ
    └── site_adapter.py                 скелет з 5-ма функціями (дев заповнює ~3)
```

---

## ⚡ TL;DR — 5 кроків для запуску

```bash
# 1. Скопіювати пакет на сервер
scp -r tma-package/ user@server:/opt/tma/

# 2. Заповнити env файли
cp config/env.example backend/.env
cp frontend/.env.example frontend/.env
# → відредагувати URL, JWT_SECRET_KEY, (пізніше) SITE_API_URL/TOKEN

# 3. Деплой одною командою
cd /opt/tma && ./scripts/deploy.sh

# 4. Smoke-test
./scripts/smoke_test.sh

# 5. Відкрити у браузері або Telegram
# Browser: https://tma.y-store.in.ua/tma
# Telegram: t.me/Ystore_app_bot → /start → Menu Button
```

Через **15 хвилин** TMA працює з seed-каталогом (20 товарів). Для підключення до каталогу сайту — дивіться `docs/01_ARCHITECTURE.md §5` та розділ "Інтеграція з сайтом" нижче.

---

## 🧩 Що вже працює (готово з коробки)

| Модуль | Ізоляція | Статус |
|---|---|---|
| 🤖 Telegram Bot `@Ystore_app_bot` (aiogram polling + алерти + admin panel) | 100% внутрі | ✅ |
| 💳 WayForPay (create payment + webhook + HMAC + refund + signed response) | 100% внутрі | ✅ |
| 📦 Nova Poshta (cities/warehouses autocomplete + TTN створення + tracking) | 100% внутрі | ✅ |
| 🔐 Telegram Auth (HMAC_SHA256 initData + session tokens з TTL 30д) | 100% внутрі | ✅ |
| 🛒 Cart/Checkout/Orders (4-step wizard + sandbox + real payments) | 100% внутрі | ✅ |
| ⭐ Favorites/Reviews/Support tickets | 100% внутрі | ✅ |
| 📱 Адаптивний фронт (від 280px до 720px, fluid typography) | 100% внутрі | ✅ |
| 📋 Валідація UA-телефонів (Kyivstar/Vodafone/lifecell/Intertelecom/3Mob/Ukrtelecom) | 100% внутрі | ✅ |
| 📚 **Каталог товарів** (продукти + категорії) | 🔌 **Точка інтеграції** | ⚠ Заповнити адаптер |
| 🧾 Дзеркало замовлень у CRM сайту | 🔌 Точка інтеграції | ⚠ Заповнити адаптер |

---

## 🔌 Інтеграція з бекендом сайту

### Крок 1 — що треба заповнити

Є ОДНА папка-інтерфейс: `integration/site_adapter.py`.

Дев заповнює **три обов'язкові функції**:
```python
async def list_products(filters: dict) -> list[dict]     # каталог
async def get_product(pid: str) -> Optional[dict]         # картка товару + related
async def list_categories() -> list[dict]                 # всі категорії
```

І **дві бажані** (для єдиної CRM):
```python
async def register_order(tma_order: dict) -> dict         # дзеркало замовлення у сайт
async def match_user(telegram_id, ...) -> Optional[dict]  # матчинг TMA-user ↔ профіль сайту
```

Детально — у `docs/01_ARCHITECTURE.md §5`.

### Крок 2 — увімкнути адаптер

```bash
# У backend/.env
SITE_ADAPTER_ENABLED=1
SITE_API_URL=https://api.y-store.in.ua
SITE_API_TOKEN=<service-to-service token>

# Restart
sudo supervisorctl restart backend
```

### Крок 3 — перевірити

```bash
curl https://tma.y-store.in.ua/api/tma/products?q=iphone | jq '.items[0]'
# Повинно повернути товар з вашого сайту, не seed
```

**Поки `SITE_ADAPTER_ENABLED=0`** — TMA працює на локальному seed (20 товарів, 8 категорій авто-створюються при першому запуску). Нічого не ламається, фронт функціональний.

---

## 📋 Чеклист передачі (що отримує дев сайту)

- [x] **Весь код** — backend + frontend, без node_modules/__pycache__ (розмір ~6MB)
- [x] **Всі ключі** — Telegram Bot, Nova Poshta (sender refs), WayForPay (merchant+secret+password) — у `config/env.example`
- [x] **Документація** — 6 MD-файлів у `docs/` (архітектура, handoff, ключі, технічні нюанси, дизайн, план)
- [x] **Конфіги** — nginx (2 варіанти), supervisor, env templates
- [x] **Автоматизація** — `deploy.sh` + `smoke_test.sh`
- [x] **Скелет адаптера** — `integration/site_adapter.py` з готовими нормалізаторами
- [x] **Перевірено функціонально:**
  - ✅ Реальна ТТН створюється: `20451419147533` (Нова Пошта API)
  - ✅ WayForPay payment_url генерується з валідним HMAC_MD5
  - ✅ Telegram bot polling працює, menu-button прив'язана
  - ✅ MongoDB indexes авто-створюються при старті
  - ✅ Seed каталогу авто-запускається (20 товарів, 8 категорій)
  - ✅ TMA UI адаптивна (280px→720px, усі картки мають однакову висоту)

---

## 🧪 Stack & Requirements

**Runtime:**
- Python 3.11+ (FastAPI 0.118, Motor async MongoDB, aiogram 3.27, httpx 0.28)
- Node.js 18+ + Yarn (React 19, CRA + craco, Zustand, lucide-react, react-router-dom 7)
- MongoDB 6+
- supervisor
- nginx (для reverse-proxy SSL)

**External APIs (усе через httpx):**
- Telegram Bot API — `api.telegram.org`
- Nova Poshta API v2.0 — `api.novaposhta.ua/v2.0/json/`
- WayForPay — `secure.wayforpay.com/pay` + webhook callback

**База даних (MongoDB, database `tma_store`):**
9 колекцій: `users`, `tma_sessions`, `products`, `categories`, `orders`, `tma_favorites`, `reviews`, `tma_support_tickets`, `bot_settings` — всі індекси створюються автоматично на старті.

---

## 📞 Коли виникають питання

1. **Архітектурне питання** → `docs/01_ARCHITECTURE.md` (13 розділів, ~700 рядків)
2. **Як деплоїти** → `docs/02_HANDOFF.md` + `scripts/deploy.sh`
3. **Де ключ X?** → `docs/03_INTEGRATION_KEYS.md` або `config/env.example`
4. **Технічна деталь** → `docs/04_TECH_NOTES.md`
5. **Як має виглядати?** → `docs/05_DESIGN_GUIDELINES.md`
6. **Чому це працює саме так?** → `docs/06_DEV_PLAN.md` (історія рішень)

---

## 🚦 Що НЕ МОЖНА чіпати

1. Префікс `/api` у backend routes — nginx/ingress залежить
2. Backend binding `0.0.0.0:8001` — supervisor біндить саме так
3. Lowercase статуси замовлень (`paid`, `pending_payment`, …)
4. `city_ref` / `warehouse_ref` у order — обов'язкові для TTN
5. HMAC верифікація WayForPay webhook — без неї платежі зламаються
6. Signed response на webhook (`orderReference + status + time + signature`)
7. `TMA_ALLOW_SANDBOX=0` у production (інакше зловмисник може увійти як будь-який user)

**Детально** — `docs/01_ARCHITECTURE.md §10`.

---

## 🎯 Фінальна ціль інтеграції

**Коли все зроблено:**
1. Розробник сайту зайшов у TMA через Telegram → побачив реальний каталог свого магазину
2. Додав iPhone у кошик → пройшов checkout → вказав НП → оплатив WayForPay
3. У кабінеті сайту — з'явилось замовлення з `external_id=TMA-20260419-...`
4. У ФОП-кабінеті НП — автоматично створена ТТН, SMS прийшла клієнту
5. В Telegram admin-групі — алерт "🧾 Нове замовлення оплачено, ТТН 20451419..."

**Все через 1 мініапку, 1 пакет коду, 1 адаптер.**

---

*Готово до передачі. Якщо щось незрозуміло — `docs/01_ARCHITECTURE.md` з посиланнями на конкретні файли коду.*
