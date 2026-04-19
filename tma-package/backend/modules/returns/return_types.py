"""
O20.3: Return Management Engine - Types
"""
from typing import Literal, Optional, Dict, Any
from pydantic import BaseModel

ReturnReason = Literal[
    "NOT_PICKED_UP",      # Не забрано
    "REFUSED",            # Відмова від отримання
    "STORAGE_EXPIRED",    # Термін зберігання минув
    "RETURN_TO_SENDER",   # Повернення відправнику
    "UNKNOWN"
]

ReturnStage = Literal["NONE", "RETURNING", "RETURNED", "RESOLVED"]


class ReturnDetection(BaseModel):
    """Result of NP status analysis for return detection"""
    is_return: bool
    stage: ReturnStage = "NONE"
    reason: ReturnReason = "UNKNOWN"
    raw_status_code: Optional[int] = None
    raw_status_text: Optional[str] = None
    confidence: float = 0.6
    payload: Dict[str, Any] = {}


class ReturnActionResult(BaseModel):
    """Result of return processing action"""
    ok: bool
    updated: bool = False
    order_id: Optional[str] = None
    ttn: Optional[str] = None
    reason: Optional[str] = None
    ledger_entries: int = 0
    crm_updated: bool = False
    alert_sent: bool = False


class ReturnSummary(BaseModel):
    """Return analytics summary"""
    today: int = 0
    days_7: int = 0
    days_30: int = 0
    return_rate_30d: float = 0.0
    cod_refusal_rate_30d: float = 0.0
    shipping_losses_30d: float = 0.0
    top_reasons_30d: list = []
    top_cities_30d: list = []
