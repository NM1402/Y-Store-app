# plan.md — New Mobile‑First Telegram Mini App (POC → V1 → Expand)

## Objectives
- Build a **separate mobile-first Telegram Mini App client** (not a resized web storefront).
- Keep **shared backend** (FastAPI + MongoDB) as source of truth; use `/api/tma/*` as the TMA BFF layer.
- **P0 (Functional Stability):** Ensure the TMA is fully functional end-to-end with real backend data (products, cart preview, orders, store/FOP info, payment methods).
- **P1 (Premium UI/UX):** Raise UI/UX quality to a **native, premium mobile feel** (Telegram-first behaviors, spacing/typography, polished components).
- Establish a **repeatable test harness** (API + E2E smoke) so regressions don’t return.

## Current Status (as of now)
### What’s done
- Old web-wrapper TMA frontend deleted (`/app/frontend/src/tma/` removed).
- New TMA client implemented at `/app/frontend/src/tma-mobile/` and mounted under route `/tma/*`.
- Backend TMA layer available (`/api/tma/*`), including `/api/tma/store-info` for FOP/shop info.
- New customer bot `simple_bot.py` created and wired to token `8524617770:AAECLj0A8wTjg3cy-KxYcIkvlK4HE3VROqY`.
- Implemented baseline mobile components (BottomNav, BottomSheet, Skeleton loading).

### What was broken / findings (resolved)
- Previously observed frontend startup error in logs (`Cannot find module ./plugins/visual-edits/dev-server-setup`). After supervisor restart and config validation, frontend now **compiles and runs** reliably.
- Automated UI checks show `/tma` loads without console errors.

### Testing / Audit results (P0)
- **Comprehensive audit completed via `testing_agent_v3`:**
  - Backend success: **93.8%**
  - Frontend success: **85%**
  - **No critical bugs** found in core flow.
- Minor/medium notes:
  - Some product images sometimes show placeholders or appear “dark” depending on Unsplash assets/network (non-blocking).
  - `/api/tma/orders` validation for empty items returns 422 (Pydantic) rather than 400; low priority.

### Design progress (P1)
- Added premium design system + tokens:
  - Created `/app/frontend/src/tma-mobile/styles/theme.css` (Telegram-theme-mapped design tokens).
  - Updated `/app/frontend/src/tma-mobile/styles/main.css` to import tokens and reduce duplication.
- Refreshed premium UI styling:
  - `ProductCard.css` upgraded (shadows, micro-interactions, image press zoom).
  - `TopBar.css` upgraded (translucent + blur, compact, better touch targets).
  - `BottomNav.css` upgraded (Telegram-native bottom bar, active pill, safe-area, badge styles).
- Added `data-testid` to key interactive components:
  - `BottomNav` buttons: `bottom-nav-{id}`
  - `ProductCard` elements: `product-card`, `product-card-title`, `product-card-price`, `product-card-add-to-cart`

### Immediate priorities (updated)
- **P0 is considered done** for the core flow stability.
- **P1 design is improved**, but remaining work is to:
  - apply premium tokens consistently across all screens,
  - extend `data-testid` coverage to all screens and critical CTAs,
  - finalize Telegram-native MainButton/BackButton behavior per route.

---

## Phase 1 — Core Flow POC (Isolation → fix until works) [P0]
**Core to prove:** Telegram auth/session bootstrap + catalog → product → cart → checkout → order creation.

### User Stories (POC)
1. As a user, I can open the mini app and get authenticated via Telegram initData (or sandbox).
2. As a user, I can browse a home feed and open a product.
3. As a user, I can add/remove items in cart and see totals.
4. As a user, I can place an order with delivery + payment selection.
5. As a user, I can see my order in the orders list after checkout.

### Implementation Steps (UPDATED)
- **✅ Completed:** Stabilized runtime and verified supervisor-managed startup.
- **✅ Completed:** Verified auth flow (Telegram initData + sandbox) and token handling in `/src/tma-mobile/lib/api-client.js`.
- **✅ Completed:** Full E2E audit using `testing_agent_v3`.
- **✅ Completed:** Backend/API smoke checks were executed as part of the test harness created by testing agent (`/app/backend_test.py`).
- **✅ Completed:** Confirmed core screens navigation works in mobile viewport.

### Success Criteria (UPDATED)
- ✅ No runtime crashes in the core journey.
- ✅ One full test pass reliably produces: **token → product → cart preview → order created → order visible**.
- ✅ No unexpected 401 in sandbox/browser testing; re-auth on 401 handled by clearing token.

### Next Actions
- Convert `/app/backend_test.py` into a stable, documented smoke test script (rename to `scripts/tma_poc_smoke.py` or add pytest wrapper) and document in `/app/PROJECT_STATUS.md`.

---

## Phase 2 — New TMA Core Architecture (V1 app shell + navigation)
**Goal:** Telegram-only frontend with its own shell, routing, state, and design tokens.

### User Stories (V1 shell)
1. As a user, I have a Telegram-like shell with safe-area padding and fast load.
2. As a user, I can switch tabs: Home/Catalog/Search/Cart/Profile.
3. As a user, I can navigate back using Telegram BackButton behavior.
4. As a user, I see consistent loading/skeleton/empty/error states per screen.
5. As a user, I can restore state after closing/reopening the mini app.

### Implementation Steps (UPDATED)
- ✅ Confirmed `/tma/*` is the canonical route for the new app (mounted in `src/App.js`).
- ✅ TMA renders without legacy web layout.
- **Next:**
  - Add a **global ErrorBoundary** for TMA to prevent white-screen on unexpected runtime exceptions.
  - Implement route-driven policies for:
    - showing/hiding BottomNav on Checkout,
    - safe-area paddings using `--tma-safe-*` tokens.
  - Ensure consistent use of `tma-*` tokens across all screens.

### Success Criteria
- `/tma` loads consistently and reliably authenticates + renders Home tab.

### Next Actions
- Decide whether to keep old web storefront at `/` and TMA at `/tma` permanently (recommended) or introduce `/web`.

---

## Phase 3 — Mobile UI Components (Telegram-first kit) [P1]
**Goal:** Build reusable touch-optimized components used across screens and upgrade design quality.

### User Stories
1. As a user, I can tap large CTAs without misclicks.
2. As a user, I see consistent cards for products across Home/Catalog/Search.
3. As a user, filters/sort open as bottom sheets.
4. As a user, I can see toast/alerts styled for Telegram context.
5. As a user, the UI adapts to light/dark Telegram theme.

### Implementation Steps (UPDATED)
- ✅ Implemented premium design tokens (`styles/theme.css`) mapped to `--tg-theme-*`.
- ✅ Updated `TopBar`, `BottomNav`, `ProductCard` to premium styling.
- ✅ Added initial `data-testid` coverage for navigation and product cards.
- **Next:**
  - Extend premium styling to remaining components:
    - BottomSheet (drag handle, backdrop blur, spring-like animation)
    - Buttons (primary/secondary variants consistent with tokens)
    - Skeletons (consistent shimmer + spacing)
  - Replace emoji icons in navigation with a consistent icon set (FontAwesome/Lucide) per guidelines (avoid emoji-based icons in final).
  - Add missing `data-testid` across screens and key actions (Cart checkout button, Checkout steps, Orders list, Profile links).

### Success Criteria
- Components reused by at least 3 screens; consistent look & feel.
- Visual quality meets “premium mobile” expectation.

### Next Actions
- Freeze tokens + component APIs before further screen scaling.

---

## Phase 4 — Screen Implementation (Mobile IA)
**Goal:** Build V1 screens around proven core flow with real backend data.

### User Stories
1. As a user, Home shows quick categories + featured/new products.
2. As a user, Catalog supports category chips + sorting + infinite scroll.
3. As a user, Search provides suggestions + recent queries + results.
4. As a user, Product page has gallery, key attrs, and sticky Add to Cart.
5. As a user, Checkout is step-based and prevents invalid submission.

### Implementation Steps (UPDATED)
- ✅ Screens exist in `/src/tma-mobile/screens/*` and are wired to real backend data.
- **Next:**
  - Apply design guidelines consistently per screen blueprint (spacing/typography/hierarchy).
  - Improve media reliability:
    - add `onError` fallback for images (swap to placeholder)
    - optionally proxy/resize external images or store local thumbnails.
  - Ensure Orders screen supports both list and detail view (sheet/modal) with proper empty/loading states.
  - Run screenshot-based UI review for Home/Product/Cart/Checkout after styling changes.

### Success Criteria
- End-to-end: browse → add to cart → checkout → order appears in Orders.

### Next Actions
- Capture performance metrics (payload sizes, render time) and optimize.

---

## Phase 5 — Telegram SDK Integration (interaction layer) [P1]
**Goal:** Native-feeling Telegram behavior.

### User Stories
1. As a user, BackButton works consistently across nested routes.
2. As a user, MainButton appears only when relevant (e.g., Checkout submit).
3. As a user, I get haptic feedback on key actions.
4. As a user, sharing a product uses Telegram mechanisms.
5. As a user, theme changes reflect instantly.

### Implementation Steps (UPDATED)
- ✅ Telegram SDK wrapper exists (`/tma-mobile/lib/telegram-sdk.js`).
- **Next:**
  - Implement **route-driven BackButton/MainButton policy** and sync with TopBar back icon.
  - Use Telegram MainButton for primary actions:
    - Product: “Додати в кошик”
    - Cart: “Оформити”
    - Checkout: “Далі / Підтвердити замовлення”
  - Add haptics per key interactions (tab switch, add-to-cart, successful order).
  - Add deep-link handling from bot start params if required.

### Success Criteria
- No “web feel”: navigation and CTAs behave like a mini app.

### Next Actions
- Align with bot flows (open product/category from bot links).

---

## Phase 6 — Testing & Optimization (stability before expansion)

### User Stories
1. As a user, errors show clear recovery actions (retry/back).
2. As a user, slow network still provides skeletons and partial content.
3. As a user, cart never silently resets.
4. As a user, orders are consistent after refresh.
5. As a user, the app works on iOS/Android Telegram insets.

### Implementation Steps (UPDATED)
- ✅ E2E + backend API testing completed once via `testing_agent_v3`.
- **Next:**
  - Formalize automated testing:
    - API smoke test script (stable, documented, repeatable)
    - minimal frontend route smoke (open `/tma`, navigate tabs, verify key selectors)
  - Manual + screenshot-based:
    - verify safe areas (top/bottom)
    - verify dark mode + Telegram theme param mapping
  - Optimize:
    - reduce overfetch
    - cache home feed results
    - image optimization (lazy loading + fallbacks)
  - Regression:
    - ensure web storefront remains unaffected by TMA routing.

### Success Criteria
- Zero critical bugs in core flow; acceptable performance and UX polish.

### Next Actions
- Only after stability: expand features (favorites, support, richer checkout steps) and consider additional BFF endpoints.
