"""
O18: Analytics Types
"""
from typing import Dict, Any, List, Optional
from pydantic import BaseModel


class OpsKPI(BaseModel):
    range_days: int
    revenue: float
    orders: int
    aov: float
    paid: int
    awaiting_payment: int
    processing: int
    shipped: int
    delivered: int
    cancels: int
    returns: int
    sla: Dict[str, Any]
    by_day: List[Dict[str, Any]]


class CohortRow(BaseModel):
    cohort: str  # YYYY-MM
    users: int
    ltv: float
    retention: Dict[str, float]  # {"m1":0.25,"m2":0.18,...}


class RiskDist(BaseModel):
    range_days: int
    bands: Dict[str, int]  # LOW/WATCH/RISK counts
    top_reasons: List[Dict[str, Any]]
