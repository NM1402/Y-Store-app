"""
Fondy Routes - Webhook endpoint
"""
from fastapi import APIRouter, Request
import os
from core.db import db
from modules.payments.fondy_webhook import FondyWebhookHandler

router = APIRouter(prefix="/api/v2/payments/webhook", tags=["Fondy Webhook"])


@router.post("/fondy")
async def fondy_webhook(request: Request):
    """
    Fondy callback webhook endpoint.
    
    Fondy sends payment status updates here.
    Verifies signature, processes payment, updates order status.
    """
    payload = await request.json()
    password = os.getenv("FONDY_MERCHANT_PASSWORD", "")
    
    handler = FondyWebhookHandler(db, fondy_password=password)
    return await handler.handle(payload)


@router.get("/fondy/health")
async def fondy_webhook_health():
    """Health check for webhook endpoint"""
    return {"ok": True, "endpoint": "/api/v2/payments/webhook/fondy"}
