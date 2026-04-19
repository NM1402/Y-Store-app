#!/bin/bash
# Y-Store Quick Setup Script
# Run: chmod +x setup.sh && ./setup.sh

set -e

echo "🚀 Y-Store Quick Setup"
echo "======================"

# 1. Check Python
echo "📦 Checking Python..."
python3 --version || { echo "❌ Python3 required"; exit 1; }

# 2. Create virtual environment if not exists
if [ ! -d ".venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv .venv
fi

# 3. Activate and install dependencies
echo "📦 Installing dependencies..."
source .venv/bin/activate
pip install -r requirements.txt --quiet

# 4. Create .env if not exists
if [ ! -f ".env" ]; then
    echo "⚙️ Creating .env from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your settings!"
fi

# 5. Check MongoDB
echo "🔍 Checking MongoDB..."
python3 -c "
from pymongo import MongoClient
client = MongoClient('mongodb://localhost:27017', serverSelectionTimeoutMS=2000)
client.server_info()
print('✅ MongoDB connected')
" || echo "⚠️  MongoDB not running (start it or use remote)"

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the server:"
echo "  source .venv/bin/activate"
echo "  uvicorn app:app --reload --port 8001"
echo ""
echo "API docs: http://localhost:8001/docs"
