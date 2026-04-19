"""
O20: Pickup Control Types
"""
from typing import Literal, Optional, Dict, Any, List
from pydantic import BaseModel

PickupPointType = Literal["BRANCH", "LOCKER", "UNKNOWN"]


class ShipmentState(BaseModel):
    order_id: str
    ttn: str
    phone: str
    pickup_point_type: PickupPointType
    arrival_at: Optional[str] = None
    storage_day1_at: Optional[str] = None
    deadline_free_at: Optional[str] = None
    days_at_point: int = 0
    np_status_code: Optional[int] = None
    np_status_text: Optional[str] = None
    np_raw: Dict[str, Any] = {}
    total_amount: float = 0.0
    payment_method: Optional[str] = None


class ReminderDecision(BaseModel):
    should_send: bool
    level: Optional[str] = None  # "D2","D5","D7","L1","L3","L5"
    channel: Literal["SMS", "EMAIL", "BOTH"] = "SMS"
    reason: str = ""
    dedupe_key: Optional[str] = None


class PickupRisk(BaseModel):
    risk: Literal["LOW", "MED", "HIGH"] = "LOW"
    reason: str = ""


class PickupKPI(BaseModel):
    at_point_2plus: int = 0
    at_point_5plus: int = 0
    at_point_7plus: int = 0
    amount_at_risk: float = 0.0
    reminder_sent_today: int = 0
