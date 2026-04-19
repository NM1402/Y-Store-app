"""
Order Tracking Routes - Public endpoints for cabinet TTN tracking
BLOCK V2-9
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import httpx
import os
import logging

from core.db import db
from core.security import get_current_user_optional, get_current_user

router = APIRouter(prefix="/orders", tags=["Order Tracking V2"])
logger = logging.getLogger(__name__)

NP_API_KEY = os.getenv("NOVA_POSHTA_API_KEY")


async def fetch_np_status(ttn: str) -> dict | None:
    """Fetch TTN status from Nova Poshta API"""
    if not NP_API_KEY:
        logger.warning("Nova Poshta API key not configured")
        return None
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(
                "https://api.novaposhta.ua/v2.0/json/",
                json={
                    "apiKey": NP_API_KEY,
                    "modelName": "TrackingDocument",
                    "calledMethod": "getStatusDocuments",
                    "methodProperties": {
                        "Documents": [{"DocumentNumber": ttn}]
                    }
                }
            )
            data = r.json()
            if data.get("success") and data.get("data"):
                doc = data["data"][0]
                return {
                    "status": doc.get("Status"),
                    "status_code": doc.get("StatusCode"),
                    "city_sender": doc.get("CitySender"),
                    "city_recipient": doc.get("CityRecipient"),
                    "warehouse_recipient": doc.get("WarehouseRecipient"),
                    "actual_delivery_date": doc.get("ActualDeliveryDate"),
                    "scheduled_delivery_date": doc.get("ScheduledDeliveryDate"),
                    "recipient_full_name": doc.get("RecipientFullName"),
                }
    except Exception as e:
        logger.error(f"NP tracking fetch failed for {ttn}: {e}")
    return None


@router.get("/{order_id}/tracking")
async def get_order_tracking(order_id: str, user: dict = Depends(get_current_user_optional)):
    """
    Get tracking info for an order.
    
    Returns:
        - order status
        - TTN number (if shipped)
        - Nova Poshta tracking status (if TTN exists)
        - Timeline of status changes
    """
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="ORDER_NOT_FOUND")
    
    # Security: check order belongs to user (if authenticated)
    if user and order.get("user_id"):
        if order["user_id"] != user.get("id"):
            # Allow guest tracking by phone/email
            customer = order.get("customer") or order.get("shipping") or {}
            guest_phone = customer.get("phone", "")
            guest_email = customer.get("email", "")
            user_phone = user.get("phone", "")
            user_email = user.get("email", "")
            
            if not (guest_phone and guest_phone == user_phone) and not (guest_email and guest_email == user_email):
                raise HTTPException(status_code=403, detail="ACCESS_DENIED")
    
    result = {
        "order_id": order_id,
        "status": order.get("status"),
        "created_at": order.get("created_at"),
        "updated_at": order.get("updated_at"),
        "ttn": None,
        "np_status": None,
        "np_tracking": None,
        "timeline": order.get("status_history") or [],
    }
    
    # Get shipment info
    shipment = order.get("shipment") or {}
    ttn = shipment.get("ttn")
    
    if ttn:
        result["ttn"] = ttn
        result["np_status"] = shipment.get("tracking_status")
        result["estimated_delivery"] = shipment.get("estimated_delivery_date")
        
        # Fetch fresh status from NP
        np_data = await fetch_np_status(ttn)
        if np_data:
            result["np_tracking"] = np_data
            
            # Update order with fresh status
            await db.orders.update_one(
                {"id": order_id},
                {
                    "$set": {
                        "shipment.tracking_status": np_data.get("status"),
                        "shipment.tracking_code": np_data.get("status_code"),
                        "shipment.np_last_update": datetime.now(timezone.utc).isoformat(),
                    }
                }
            )
    
    return result


@router.get("/{order_id}/timeline")
async def get_order_timeline(order_id: str, user: dict = Depends(get_current_user_optional)):
    """
    Get detailed timeline for an order.
    
    Shows all status transitions with timestamps.
    """
    order = await db.orders.find_one({"id": order_id}, {"_id": 0, "status_history": 1, "status": 1, "user_id": 1})
    if not order:
        raise HTTPException(status_code=404, detail="ORDER_NOT_FOUND")
    
    # Basic access check
    if user and order.get("user_id") and order["user_id"] != user.get("id"):
        raise HTTPException(status_code=403, detail="ACCESS_DENIED")
    
    timeline = order.get("status_history") or []
    
    # Add current status as last entry if not in history
    if timeline:
        last_entry = timeline[-1]
        if last_entry.get("to") != order.get("status"):
            timeline.append({
                "from": last_entry.get("to"),
                "to": order.get("status"),
                "at": order.get("updated_at"),
                "reason": "CURRENT_STATUS",
            })
    
    return {
        "order_id": order_id,
        "current_status": order.get("status"),
        "timeline": timeline,
    }


@router.post("/{order_id}/refresh-tracking")
async def refresh_order_tracking(order_id: str, user: dict = Depends(get_current_user)):
    """
    Force refresh tracking status from Nova Poshta.
    
    Requires authentication.
    """
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="ORDER_NOT_FOUND")
    
    # Check ownership
    if order.get("user_id") and order["user_id"] != user.get("id"):
        raise HTTPException(status_code=403, detail="ACCESS_DENIED")
    
    shipment = order.get("shipment") or {}
    ttn = shipment.get("ttn")
    
    if not ttn:
        return {"ok": False, "error": "NO_TTN", "status": order.get("status")}
    
    np_data = await fetch_np_status(ttn)
    if not np_data:
        return {"ok": False, "error": "NP_FETCH_FAILED", "ttn": ttn}
    
    # Update order
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "shipment.tracking_status": np_data.get("status"),
                "shipment.tracking_code": np_data.get("status_code"),
                "shipment.np_last_update": datetime.now(timezone.utc).isoformat(),
            }
        }
    )
    
    return {
        "ok": True,
        "ttn": ttn,
        "np_status": np_data.get("status"),
        "np_tracking": np_data,
    }
