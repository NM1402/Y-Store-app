"""
O14: Guard Types
"""
from typing import Literal, Optional, Dict, Any, List
from pydantic import BaseModel

IncidentType = Literal[
    "KPI_REVENUE_DROP",
    "KPI_AWAITING_PAYMENT_SPIKE",
    "FRAUD_BURST_ORDERS",
    "FRAUD_COD_REFUSALS",
    "FRAUD_RETURNS",
    "RISK_SCORE_HIGH"
]

IncidentStatus = Literal["OPEN", "MUTED", "RESOLVED"]


class GuardIncident(BaseModel):
    key: str
    type: IncidentType
    status: IncidentStatus
    severity: Literal["INFO", "WARN", "CRITICAL"]
    title: str
    description: str
    entity: str  # "customer:<phone>" or "order:<id>" or "system"
    payload: Dict[str, Any] = {}
    created_at: str
    updated_at: str
    muted_until: Optional[str] = None
    resolved_at: Optional[str] = None
