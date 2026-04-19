"""
Payments Module - Production-ready payment routes with Fondy integration
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from typing import Optional
import logging

from core.security import get_current_user
from .service import payments_service

router = APIRouter(prefix="/payments", tags=["Payments"])
logger = logging.getLogger(__name__)


class CreateCheckoutRequest(BaseModel):
    order_id: str


class CheckoutResponse(BaseModel):
    checkout_url: str
    provider: str
    order_id: str


class PaymentStatusResponse(BaseModel):
    order_id: str
    order_status: str
    payment_status: str
    provider: Optional[str] = None
    checkout_url: Optional[str] = None


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    data: CreateCheckoutRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create payment checkout session for an order.
    Returns URL to redirect user to payment page.
    """
    try:
        result = await payments_service.create_checkout(data.order_id)
        return CheckoutResponse(**result)
    except ValueError as e:
        msg = str(e)
        if msg == "ORDER_NOT_FOUND":
            raise HTTPException(status_code=404, detail="Order not found")
        if msg.startswith("ORDER_NOT_PAYABLE"):
            raise HTTPException(status_code=400, detail=msg)
        if msg.startswith("FONDY_CREATE_FAILED"):
            logger.error(f"Fondy create failed: {msg}")
            raise HTTPException(status_code=502, detail="Payment service error")
        raise HTTPException(status_code=400, detail=msg)


@router.post("/webhook/fondy")
async def fondy_webhook(request: Request):
    """
    Handle Fondy payment webhook.
    - Verifies signature
    - Processes payment idempotently
    - Updates order status atomically
    """
    try:
        raw_body = await request.body()
        payload = await request.json()
        
        result = await payments_service.handle_webhook(raw_body, payload)
        
        return {"status": "ok", **result}
        
    except ValueError as e:
        msg = str(e)
        logger.warning(f"Webhook validation failed: {msg}")
        
        if msg in ("MISSING_SIGNATURE", "INVALID_SIGNATURE"):
            raise HTTPException(status_code=401, detail=msg)
        
        raise HTTPException(status_code=400, detail=msg)
        
    except HTTPException:
        raise
        
    except Exception as e:
        logger.exception(f"Webhook processing error: {e}")
        raise HTTPException(status_code=500, detail="Internal error")


@router.get("/status/{order_id}", response_model=PaymentStatusResponse)
async def get_payment_status(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get payment status for an order"""
    try:
        result = await payments_service.get_payment_status(order_id)
        return PaymentStatusResponse(**result)
    except ValueError as e:
        if str(e) == "ORDER_NOT_FOUND":
            raise HTTPException(status_code=404, detail="Order not found")
        raise HTTPException(status_code=400, detail=str(e))
