"""
O20.3: Return Management Engine
Auto-detection, ledger, CRM counters, Telegram alerts
"""
from modules.returns.return_routes import router
from modules.returns.return_engine import ReturnEngine
from modules.returns.return_analytics import ReturnAnalyticsService
from modules.returns.return_scheduler import start_return_scheduler

__all__ = [
    "router",
    "ReturnEngine", 
    "ReturnAnalyticsService",
    "start_return_scheduler"
]
