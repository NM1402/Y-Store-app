# O2: Events Types
from pydantic import BaseModel
from typing import Literal, Dict, Any, Optional

EventType = Literal[
    "ORDER_PAID",
    "TTN_CREATED",
    "ORDER_DELIVERED",
]

class DomainEvent(BaseModel):
    id: str
    type: EventType
    order_id: str
    payload: Dict[str, Any] = {}
    status: Literal["NEW", "PROCESSING", "DONE", "FAILED"] = "NEW"
    attempts: int = 0
    next_retry_at: Optional[str] = None
    created_at: str
    updated_at: str
