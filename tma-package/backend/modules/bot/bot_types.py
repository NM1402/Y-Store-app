"""
O9: Bot Types and Models
"""
from typing import Dict, Any, List, Optional, Literal
from pydantic import BaseModel

AlertType = Literal[
    "НОВЕ_ЗАМОВЛЕННЯ",
    "ОПЛАТА_ПРОЙШЛА", 
    "ТТН_СТВОРЕНО",
    "ЗАТРИМКА_ДОСТАВКИ",
    "ПОМИЛКА_СПОВІЩЕННЯ",
    "ВЕЛИКЕ_ЗАМОВЛЕННЯ",
    "VIP_UPGRADE",
    "RISK_MARK",
    "AUTO_BLOCK"
]

class BotSettings(BaseModel):
    id: str = "global"
    enabled: bool = True
    admin_chat_ids: List[str] = []
    admin_user_ids: List[int] = []
    alerts: Dict[str, bool] = {
        "НОВЕ_ЗАМОВЛЕННЯ": True,
        "ОПЛАТА_ПРОЙШЛА": True,
        "ТТН_СТВОРЕНО": True,
        "ЗАТРИМКА_ДОСТАВКИ": True,
        "ПОМИЛКА_СПОВІЩЕННЯ": True,
        "ВЕЛИКЕ_ЗАМОВЛЕННЯ": True,
    }
    thresholds: Dict[str, Any] = {
        "big_order_uah": 10000,
        "delivery_delay_hours": 48,
        "notif_fail_streak": 5,
    }
    automation: Dict[str, Any] = {
        "enabled": True,
        "vip": {
            "enabled": True,
            "ltv_uah": 20000,
            "delivered_count": 10
        },
        "risk": {
            "enabled": True,
            "returns_count": 2,
            "notif_fail_streak": 5
        },
        "delay": {
            "enabled": True,
            "hours": 48
        },
        "auto_block": {
            "enabled": False,
            "returns_count": 3
        }
    }

class AdminAlert(BaseModel):
    id: str
    type: str
    text: str
    payload: Dict[str, Any] = {}
    reply_markup: Optional[Dict[str, Any]] = None
    dedupe_key: str
    status: str = "PENDING"
    attempts: int = 0
    next_retry_at: Optional[str] = None
    created_at: str
    updated_at: str
