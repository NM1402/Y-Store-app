"""
O17: Timeline Types
"""
from typing import Literal, Dict, Any
from pydantic import BaseModel

EventType = Literal[
    "ORDER_CREATED",
    "ORDER_STATUS",
    "PAYMENT",
    "TTN_CREATED",
    "DELIVERY_STATUS",
    "CRM_NOTE",
    "NOTIFICATION",
    "GUARD_INCIDENT",
    "RISK_UPDATED",
    "CUSTOMER_BLOCK",
    "CUSTOMER_TAG"
]


class TimelineEvent(BaseModel):
    ts: str
    type: EventType
    title: str
    description: str
    payload: Dict[str, Any] = {}
