#!/bin/bash
# Start Simple Customer Bot

cd "$(dirname "$0")"

# Kill any existing bot
pkill -f 'modules.bot'

# Start simple bot
nohup python -m modules.bot.simple_bot > /var/log/telegram_bot.log 2>&1 &

echo "🚀 Y-Store Customer Bot started"
echo "📝 Logs: tail -f /var/log/telegram_bot.log"
echo "🛑 Stop: pkill -f 'modules.bot.simple_bot'"
