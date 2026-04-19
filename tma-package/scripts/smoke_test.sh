#!/usr/bin/env bash
# ==========================================================================
# Y-Store TMA — Smoke Test
# ==========================================================================
# Перевіряє що всі компоненти відгукаються.
# Usage:
#   BASE_URL=https://tma.y-store.in.ua ./scripts/smoke_test.sh
# ==========================================================================

set -e
BASE_URL="${BASE_URL:-http://localhost:8001}"

echo "▶ Testing: $BASE_URL"
echo

# 1. Health
echo "[1] /api/health"
curl -sf "$BASE_URL/api/health" | grep -q '"status":"ok"' || { echo "❌ health failed"; exit 1; }
echo "    ✅ ok"

# 2. Categories
echo "[2] /api/tma/categories"
COUNT=$(curl -sf "$BASE_URL/api/tma/categories" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
[ "$COUNT" -gt 0 ] || { echo "❌ no categories"; exit 1; }
echo "    ✅ $COUNT categories"

# 3. Products
echo "[3] /api/tma/products?limit=5"
PCOUNT=$(curl -sf "$BASE_URL/api/tma/products?limit=5" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('items', [])))")
[ "$PCOUNT" -gt 0 ] || { echo "❌ no products"; exit 1; }
echo "    ✅ $PCOUNT products"

# 4. Sandbox auth (only if TMA_ALLOW_SANDBOX=1)
echo "[4] /api/tma/auth (sandbox)"
AUTH=$(curl -sf -X POST "$BASE_URL/api/tma/auth" \
    -H "Content-Type: application/json" \
    -d '{"init_data":"sandbox:99999"}' 2>/dev/null || echo '{}')
TOKEN=$(echo "$AUTH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null)
if [ -n "$TOKEN" ]; then
    echo "    ✅ token=${TOKEN:0:16}..."
else
    echo "    ⚠️  sandbox disabled (TMA_ALLOW_SANDBOX=0 у production — це очікувано)"
fi

# 5. Nova Poshta autocomplete (public, no auth)
echo "[5] /api/tma/np/cities?q=ки"
CITIES=$(curl -sf "$BASE_URL/api/tma/np/cities?q=%D0%BA%D0%B8&limit=5" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('items', [])))")
[ "$CITIES" -gt 0 ] && echo "    ✅ $CITIES cities" || echo "    ⚠️  NP API недоступне або ключ невалідний"

# 6. Store info
echo "[6] /api/tma/store-info"
curl -sf "$BASE_URL/api/tma/store-info" | grep -q '"name"' && echo "    ✅ ok" || echo "    ❌ failed"

# 7. Bot API
echo "[7] Telegram bot"
TOKEN_ENV=$(cd "$(dirname "$0")/../backend" 2>/dev/null && grep '^TELEGRAM_BOT_TOKEN' .env 2>/dev/null | cut -d'"' -f2)
if [ -n "$TOKEN_ENV" ]; then
    BOT=$(curl -sf "https://api.telegram.org/bot$TOKEN_ENV/getMe" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['result']['username'])" 2>/dev/null || echo "")
    [ -n "$BOT" ] && echo "    ✅ @$BOT" || echo "    ❌ bot unreachable"
else
    echo "    ⚠️  TELEGRAM_BOT_TOKEN not set"
fi

echo
echo "✅ Smoke test complete."
