#!/bin/bash
# Start Telegram Admin Bot as background process

cd /app/backend

# Check if already running
if pgrep -f "modules.bot.bot_app" > /dev/null; then
    echo "⚠️ Bot already running. Stopping..."
    pkill -f "modules.bot.bot_app"
    sleep 2
fi

# Start bot
echo "🚀 Starting Telegram Admin Bot..."
nohup python -m modules.bot.bot_app > /var/log/telegram_bot.log 2>&1 &
BOT_PID=$!

echo "✅ Bot started with PID: $BOT_PID"
echo "📝 Logs: /var/log/telegram_bot.log"
echo ""
echo "Commands:"
echo "  View logs: tail -f /var/log/telegram_bot.log"
echo "  Stop bot:  pkill -f 'modules.bot.bot_app'"
