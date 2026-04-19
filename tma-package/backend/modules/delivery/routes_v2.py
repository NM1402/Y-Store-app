"""
Delivery V2 Routes - Nova Poshta TTN automation
"""
from fastapi import APIRouter, Depends, Header, HTTPException
from typing import Optional
import logging

from core.db import db
from core.security import get_current_admin
from .np.np_types import NPTTNCreateRequest, NPTTNResponse, NPTrackingResponse
from .np.np_ttn_service import NPTTNService
from .np.np_sender_setup import np_sender_setup, SenderSetupRequest, SenderSetupResponse

router = APIRouter(prefix="/delivery", tags=["Delivery V2"])
logger = logging.getLogger(__name__)


@router.post("/novaposhta/ttn", response_model=NPTTNResponse)
async def create_ttn_novaposhta(
    body: NPTTNCreateRequest,
    admin: dict = Depends(get_current_admin),
    x_idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key"),
):
    """
    Create Nova Poshta TTN for an order.
    
    - Requires admin authentication
    - Supports idempotency via X-Idempotency-Key header
    - Auto-transitions order: PROCESSING -> SHIPPED
    - If PAID, auto-transitions to PROCESSING first
    
    Returns:
        TTN number, cost, estimated delivery date
    """
    service = NPTTNService(db)
    await service.init()
    return await service.create_ttn(body, x_idempotency_key)


@router.get("/novaposhta/ttn/{ttn}/status", response_model=NPTrackingResponse)
async def get_ttn_tracking_status(
    ttn: str,
    admin: dict = Depends(get_current_admin),
):
    """
    Get tracking status for a TTN.
    
    Returns current status from Nova Poshta API.
    """
    service = NPTTNService(db)
    return await service.get_tracking_status(ttn)


@router.post("/novaposhta/ttn/{ttn}/sync/{order_id}")
async def sync_ttn_tracking_to_order(
    ttn: str,
    order_id: str,
    admin: dict = Depends(get_current_admin),
):
    """
    Sync tracking status from Nova Poshta to order.
    
    - Fetches current tracking status
    - Updates order.shipment.tracking_status
    - Auto-transitions to DELIVERED if delivered
    """
    service = NPTTNService(db)
    await service.init()
    
    result = await service.sync_tracking_to_order(order_id, ttn)
    if not result:
        raise HTTPException(status_code=404, detail="ORDER_OR_TTN_NOT_FOUND")
    
    return {
        "ok": True,
        "order_id": order_id,
        "ttn": ttn,
        "status": result.get("shipment", {}).get("tracking_status"),
        "order_status": result.get("status"),
    }


@router.get("/orders/{order_id}/shipment")
async def get_order_shipment_info(
    order_id: str,
    admin: dict = Depends(get_current_admin),
):
    """
    Get shipment info for an order.
    """
    service = NPTTNService(db)
    order = await service.repo.get_order(order_id)
    
    if not order:
        raise HTTPException(status_code=404, detail="ORDER_NOT_FOUND")
    
    shipment = order.get("shipment") or {}
    
    return {
        "order_id": order_id,
        "order_status": order.get("status"),
        "has_ttn": bool(shipment.get("ttn")),
        "shipment": shipment,
    }


@router.post("/novaposhta/setup-sender", response_model=SenderSetupResponse)
async def setup_nova_poshta_sender(
    body: SenderSetupRequest,
    admin: dict = Depends(get_current_admin),
):
    """
    Setup Nova Poshta sender configuration.
    
    This endpoint will:
    1. Find city by name
    2. Find warehouse
    3. Get or create counterparty (sender)
    4. Get contact person
    5. Return all refs + ready-to-copy .env config
    
    Required:
    - phone: Sender phone number (+380XXXXXXXXX)
    
    Optional:
    - city_name: Default "Київ"
    - warehouse_number: Default "1"
    - company_name: Default "Y-Store"
    """
    return await np_sender_setup.setup_sender(body)


@router.get("/novaposhta/cities")
async def search_np_cities(
    q: str,
    admin: dict = Depends(get_current_admin),
):
    """Search Nova Poshta cities by name"""
    result = await np_sender_setup.search_city(q)
    if not result.get("success"):
        raise HTTPException(status_code=502, detail=result.get("errors", ["Search failed"]))
    
    addresses = (result.get("data") or [{}])[0].get("Addresses", [])
    return [
        {
            "ref": addr.get("DeliveryCity"),
            "name": addr.get("Present"),
            "city_name": addr.get("MainDescription"),
        }
        for addr in addresses
    ]


@router.get("/novaposhta/warehouses/{city_ref}")
async def get_np_warehouses(
    city_ref: str,
    number: Optional[str] = None,
    admin: dict = Depends(get_current_admin),
):
    """Get Nova Poshta warehouses for city"""
    result = await np_sender_setup.get_warehouses(city_ref, number)
    if not result.get("success"):
        raise HTTPException(status_code=502, detail=result.get("errors", ["Search failed"]))
    
    return [
        {
            "ref": wh.get("Ref"),
            "number": wh.get("Number"),
            "description": wh.get("Description"),
            "short_address": wh.get("ShortAddress"),
        }
        for wh in result.get("data", [])[:50]  # Limit to 50
    ]

