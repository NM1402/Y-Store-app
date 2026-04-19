# PRD — Y-Store Telegram Mini App

## Original Problem Statement
Разверни данный проект из репозитория https://github.com/svetlanaslinko057/dedede2333
Изучи структуру, архитектуру, интеграцию Нової Пошти и платежной системы WayForPay.
Затем продолжим доработку миниапки.

## Architecture
- **Backend**: FastAPI (Python 3.11) + MongoDB (Motor) — `/app/backend`
  - Entry: `server.py` 
  - Core: `core/` (db, config, models, security)
  - Routers: `modules/tma/routes.py` (main TMA API), `modules/shop_routes.py`, `modules/seed_routes.py`, `modules/telegram_bff.py`, `modules/tma/nova_poshta_routes.py`
  - Auto-seed of categories + products on startup
  - Sandbox auth enabled via `TMA_ALLOW_SANDBOX=1` for browser testing without Telegram
- **Frontend**: React 19 (CRA + craco) — `/app/frontend`
  - TMA mobile-first client: `src/tma-mobile/` mounted at route `/tma/*`
  - Web storefront: `src/` mounted at `/`
- **DB**: MongoDB `tma_store` (local) — indexes auto-created on startup
- **Telegram Bot**: `@Ystore_app_bot` (id `8524617770`) — polling under supervisor

## Integrations
- **Telegram Bot API** — token in `.env` (`TELEGRAM_BOT_TOKEN`); runs via supervisor `telegram_bot` program
- **Nova Poshta API** — key `5cb1e3ebc23e75d737fd57c1e056ecc9`; sender FOP counterparty/contact/city/warehouse refs in `.env`
- **WayForPay** — merchant `y_store_in_ua`, secret/password in `.env`, webhook `/api/v2/payments/wayforpay/webhook`

## Deployment status — 2026-04-19 (session current)
- ✅ Repo `svetlanaslinko057/dedede2333` cloned and mirrored into `/app`
- ✅ Backend deps installed via `pip install -r requirements.txt`
- ✅ Frontend deps installed via `yarn install`
- ✅ `.env` filled with real keys from INTEGRATION.md (Telegram bot, Nova Poshta, WayForPay, JWT)
- ✅ `TMA_URL` / `APP_URL` / `WAYFORPAY_*URL` pointed to `https://bot-app-deploy.preview.emergentagent.com`
- ✅ Supervisor services RUNNING: `backend` (:8001), `frontend` (:3000), `mongodb`, `telegram_bot`
- ✅ `/api/health` → `{"status":"ok","service":"tma-api"}`
- ✅ `/api/tma/categories`, `/api/tma/home`, `/api/tma/store-info` — возвращают реальные данные (seed сработал)
- ✅ TMA UI рендерится по `/tma` с каруселями, хитами продаж, категориями, bottom-nav
- ✅ Telegram bot `@Ystore_app_bot` стартанул, polling активен, menu-button настроен на TMA URL

## URLs
- Preview: https://bot-app-deploy.preview.emergentagent.com
- TMA: https://bot-app-deploy.preview.emergentagent.com/tma
- Backend health: `/api/health`
- Bot: @Ystore_app_bot

## Audit & Integration Guide (session 2 — 2026-04-19)
- ✅ Full backend/frontend code audit performed
- ✅ Created `/app/INTEGRATION_AUDIT.md` — comprehensive handoff для дев-інтегратора
  - Архітектура з діаграмами
  - Flows (auth, catalog, cart, checkout, WFP webhook, NP TTN, bot)
  - Моделі даних (users, products, categories, orders, tma_sessions, bot_settings)
  - Повний список endpoints `/api/tma/*` + публічні WFP webhook
  - 14 виявлених нюансів/TODO (store-info hardcoded, duplicate routes, missing JWT, WFP retry, etc.)
  - Production checklist (nginx, supervisor, BotFather, WFP admin)
  - Smoke-test scripts
- ✅ Створено skeleton `/app/backend/modules/tma/site_adapter.py`
  - 5 методів: list_products, get_product, list_categories, register_order, match_user
  - Lazy httpx client, feature-flag SITE_ADAPTER_ENABLED
  - Готові normalizer функції (заготовки під реальну схему сайту)

## Session 3 — Universal Responsive Fix (2026-04-19)
- ✅ Виявлено корінь проблеми: `aspect-ratio: 1` не підтримується в деяких Telegram Desktop WebView → картки схлопувались у 0px, видно було тільки rating
- ✅ Створено `/app/frontend/src/tma-mobile/styles/responsive-fix.css` (350+ рядків):
  - **aspect-ratio → padding-bottom fallback** з `@supports` перевіркою
  - Fluid typography/spacing через `clamp()` (працює від 280px до 720px)
  - Адаптивні grids: 1/2/3/4 колонки залежно від ширини контейнера
  - `min-width: 0` універсально на всіх grid/flex дітях (prevents blowout)
  - Container queries `@container tma` + media queries як fallback
  - Emergency `min-height` на картках (гарантовано видимі)
  - `@supports not (aspect-ratio: 1/1)` — повний fallback для старих WebView
  - Спеціальні правила для вузьких Telegram Desktop popup (<340px)
- ✅ JS-driven breakpoint detector в `App.jsx`:
  - ResizeObserver стежить за `#tma-root` clientWidth
  - Ставить класи `.tma-narrow` / `.tma-regular` / `.tma-wide` / `.tma-xwide`
  - Експонує `--tma-container-width` як CSS-змінну
- ✅ `viewport meta` оновлено: `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover`
- ✅ Тестовано: TMA коректно відображається від 320px до 1920px width без overflow, без collapse карток

## Session 4 — Bug fixes after responsive (2026-04-19)
- ✅ **Fix TTN "RecipientName incorrect":** Nova Poshta вимагає мінімум 2 слова (Прізвище + Ім'я). Якщо sandbox user має одне ім'я ("Sandbox") — auto-append "Клієнт" fallback. `bot_actions_service.py#create_ttn`
- ✅ **Verified:** реальна ТТН створюється: order_id=cf53b7... → tracking=20451419147533
- ✅ **Fix Bundle "Додати комплект" radius:** 999px pill → 14px (консистентно з np-picker__trigger)
- ✅ **Fix "+" button lost:** responsive-fix робив `position: absolute` + `top/left/right/bottom: 0` на ВСІХ дітях image-wrapper → badges/add-btn/favorite розтягувались на весь wrapper. Fix: застосовується тільки до `.product-card-v2__image`, floating UI зберігає оригінальні координати з ProductCard-v2.css
- ✅ **Fix Checkout narrow inputs:** додано exceptions `min-height: 52px !important` для `.np-picker__trigger`, `.checkout-v3__input`, `.np-sheet__search-input`. NP BottomSheet має `min-height: 380px`, items `min-height: 56px`
- ✅ **Ukrainian operator validation:** повний список префіксів (Київстар 39/67/68/96/97/98, Vodafone 50/66/95/99, lifecell 63/73/93, Intertelecom 94, 3Mob 91, Ukrtelecom 92) + detectOperatorUA() хелпер + перевірка на "всі однакові цифри" (фейкові номери)

## Session 5 — Uniform card heights + handoff confirmation (2026-04-19)
- ✅ **Fix product card height inconsistency:**
  - `.product-card-v2` → `height: 100%` (заповнює grid cell)
  - `.product-card-v2__price-block` → `min-height: 34px` + `justify-content: flex-end` (резервує 2 рядки)
  - `.product-card-v2__old-price--placeholder` — невидимий `&nbsp;` коли немає знижки
  - `.home-v2__grid / .catalog-v2__grid` → `align-items: stretch` (картки рівняються по найвищій)
  - `.home-v2__scroll-row` → `align-items: stretch` + child `height: 100%`
  - **Перевірено:** усі 6 карток у home grid → `305.203125px` (ідеально однакові)
  - **Перевірено:** scroll-row cards → `290.984375px` (однакові)
- ✅ Створено `HANDOFF_CONFIRMATION.md` — офіційний документ передачі:
  - Таблиця ізоляції по кожному модулю
  - Підтвердження що NP/WFP/Bot/Auth/Cart — повністю всередині
  - Dev-чеклист (3 кроки: підняти → підключити каталог → production)
  - 3 діаграми flow (каталог, cash order, card order)
  - Smoke-test команди
  - 18-точковий чекбокс готовності

## Session 6 — Search icon overlap + Product page deduplication (2026-04-19)
- ✅ **Fix Search icon overlap**: responsive-fix застосовував `padding: 0 16px !important` до ВСІХ input[type=text], що overрайдило `.search-v2__input { padding-left: 48px }` → іконка лупи накладалась на placeholder. Рішення: scoped правило тільки до `.checkout-v3` і `.auth-form`
- ✅ **Fix corrupted Search-v2.jsx**: orphan JSX fragments рендерилися як текст (`); }`, `</Page>`) — перезаписав файл чисто
- ✅ **Merge Product sections**: видалено окремий блок "Доставка" з дублем Нової Пошти. Залишено ОДИН блок "Умови покупки": Швидка доставка + Самовивіз + Повернення 14 днів + Зручна оплата + note про безкоштовну доставку від 2000₴

## Session 7 — Root README for GitHub (2026-04-19)
- ✅ Створено повноцінний `/app/README.md` (36KB, 817 рядків) — буде показано як головна сторінка GitHub
- 📋 **Зміст (17 розділів):**
  1. Що це таке
  2. Огляд функціональності (для покупця + адміна)
  3. Стек технологій (повна таблиця версій)
  4. Структура репозиторію (ASCII tree з коментарями)
  5. Швидкий старт (2 варіанти)
  6. Архітектура (ASCII діаграма)
  7. Інтеграція з сайтом (концепція + код + feature-flag)
  8. Що вже працює з коробки (status table)
  9. API Reference (35+ endpoints у 3 таблицях)
  10. Моделі даних (9 колекцій у collapsible <details>)
  11. Flows (3 основні з діаграмами)
  12. Environment variables (повний .env з коментарями)
  13. Deployment (nginx, supervisor, BotFather, WFP cabinet)
  14. Тестування (smoke_test + manual curl)
  15. Документація (лінки на всі 8 MD-файлів)
  16. FAQ (7 питань у collapsible)
  17. Про проект + критичні інваріанти
- ✅ Badges: Telegram bot, Python, FastAPI, React, MongoDB, Status
- ✅ Table of Contents з anchor links
- ✅ 9 <details> collapsible блоків для довгого контенту
- ✅ Створено повний `.gitignore` (Python, Node.js, React build, IDE, logs, emergent artifacts)
- ✅ Підтверджено: додаток працює, tma-package інтактний
