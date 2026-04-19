#!/usr/bin/env bash
# ==========================================================================
# Y-Store TMA — One-command deployment script
# ==========================================================================
# Usage:
#   ./scripts/deploy.sh
# Prerequisites:
#   - Python 3.11+, Node 18+, yarn, MongoDB 6+, supervisor
#   - backend/.env заповнений (cp config/env.example ../backend/.env)
#   - frontend/.env заповнений (cp frontend/.env.example ../frontend/.env)
# ==========================================================================

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT="$( dirname "$SCRIPT_DIR" )"

echo "════════════════════════════════════════════════════════════════════"
echo "  Y-Store TMA — Deployment"
echo "════════════════════════════════════════════════════════════════════"
echo "Package root: $ROOT"
echo ""

# Check prerequisites
command -v python3 >/dev/null || { echo "❌ python3 required"; exit 1; }
command -v yarn    >/dev/null || { echo "❌ yarn required"; exit 1; }
command -v mongosh >/dev/null || command -v mongo >/dev/null || echo "⚠️  mongodb client not found (тільки для діагностики)"

# ============ 1. Backend ============
echo "▶ [1/4] Installing backend deps..."
cd "$ROOT/backend"
[ -f .env ] || { echo "❌ backend/.env missing. Copy from config/env.example"; exit 1; }
pip install -q -r requirements.txt

# ============ 2. Frontend ============
echo "▶ [2/4] Installing frontend deps..."
cd "$ROOT/frontend"
[ -f .env ] || { echo "❌ frontend/.env missing. Copy from .env.example"; exit 1; }
yarn install --silent

# ============ 3. Supervisor ============
echo "▶ [3/4] Setting up supervisor for telegram bot..."
if [ -d /etc/supervisor/conf.d ]; then
    sudo cp "$ROOT/config/supervisord_telegram_bot.conf" /etc/supervisor/conf.d/
    sudo supervisorctl reread
    sudo supervisorctl update
else
    echo "⚠️  /etc/supervisor/conf.d not found — skip (install supervisor manually)"
fi

# ============ 4. Start services ============
echo "▶ [4/4] Starting backend + frontend + bot..."
sudo supervisorctl restart backend frontend telegram_bot 2>&1 | sed 's/^/    /'

echo ""
echo "✅ Deployment complete."
echo ""
echo "Next steps:"
echo "  1. Verify:  curl http://localhost:8001/api/health"
echo "  2. Open:    https://<your-domain>/tma"
echo "  3. Bot:     @Ystore_app_bot — has Menu Button pointing to TMA"
echo "  4. Run smoke test:  ./scripts/smoke_test.sh"
echo ""
