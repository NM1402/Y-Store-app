"""
Nova Poshta TTN Types - Request/Response models
"""
from pydantic import BaseModel
from typing import Optional, Literal, Dict, Any


class NPTTNCreateRequest(BaseModel):
    """Request to create TTN for an order"""
    order_id: str
    # Optional overrides
    weight_kg: Optional[float] = None
    seats_amount: Optional[int] = 1
    declared_value: Optional[float] = None
    description: Optional[str] = None
    
    payer_type: Optional[Literal["Sender", "Recipient"]] = None
    payment_method: Optional[Literal["Cash", "NonCash"]] = None
    cod_amount: Optional[float] = None  # Cash on delivery amount


class NPTTNResponse(BaseModel):
    """Response from TTN creation"""
    ok: bool
    ttn: Optional[str] = None
    cost: Optional[float] = None
    estimated_delivery_date: Optional[str] = None
    raw: Optional[Dict[str, Any]] = None
    idempotent: bool = False


class NPTrackingResponse(BaseModel):
    """TTN tracking status response"""
    ttn: str
    status: str
    status_code: Optional[str] = None
    actual_delivery_date: Optional[str] = None
    recipient_name: Optional[str] = None
    city_sender: Optional[str] = None
    city_recipient: Optional[str] = None
    warehouse_recipient: Optional[str] = None
    raw: Optional[Dict[str, Any]] = None
