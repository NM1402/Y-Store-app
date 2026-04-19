"""
Analytics Models
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime


class TrackEvent(BaseModel):
    """Event tracking model"""
    event: str
    ts: datetime = None
    sid: str  # session id
    user_id: Optional[str] = None
    phone: Optional[str] = None
    
    page: Optional[str] = None
    ref: Optional[str] = None
    ua: Optional[str] = None
    ip: Optional[str] = None
    
    product_id: Optional[str] = None
    order_id: Optional[str] = None
    
    props: Dict[str, Any] = {}
    
    class Config:
        json_schema_extra = {
            "example": {
                "event": "page_view",
                "sid": "session_123",
                "page": "/product/abc123"
            }
        }


class FunnelStep(BaseModel):
    """Funnel step model"""
    event: str
    count: int


class ConversionRate(BaseModel):
    """Conversion rate between funnel steps"""
    from_step: str
    to_step: str
    rate: float


class FunnelSummary(BaseModel):
    """Funnel summary response"""
    days: int
    steps: List[FunnelStep]
    conversion: List[ConversionRate]
    total_visitors: int
    total_orders: int
    overall_conversion: float
