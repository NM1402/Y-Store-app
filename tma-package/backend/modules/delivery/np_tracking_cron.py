"""
Nova Poshta Tracking Cron - Auto-update delivery statuses
BLOCK V2-10
"""
from datetime import datetime, timezone
from core.db import db
from modules.orders.orders_status_service import atomic_transition
import logging
import httpx
import os

logger = logging.getLogger(__name__)

NP_API_KEY = os.getenv("NOVA_POSHTA_API_KEY")

# Nova Poshta status codes for DELIVERED
DELIVERED_STATUS_CODES = {9, 10, 11}  # Отримано, Отримано (каса), Відмова від отримання


async def track_ttn_status(ttn: str) -> dict | None:
    """Fetch tracking status from Nova Poshta"""
    if not NP_API_KEY:
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
                    "status_code": int(doc.get("StatusCode", 0)),
                    "status_text": doc.get("Status", ""),
                    "actual_delivery_date": doc.get("ActualDeliveryDate"),
                }
    except Exception as e:
        logger.error(f"NP tracking failed for {ttn}: {e}")
    return None


async def np_tracking_sync():
    """
    Sync Nova Poshta tracking statuses for all SHIPPED orders.
    
    Should be run periodically (every 30 min).
    Auto-transitions to DELIVERED when package is received.
    """
    logger.info("Starting Nova Poshta tracking sync...")
    
    cursor = db.orders.find(
        {"status": "SHIPPED", "shipment.ttn": {"$exists": True}},
        {"id": 1, "shipment": 1}
    )
    
    updated = 0
    delivered = 0
    
    async for order in cursor:
        order_id = order.get("id")
        ttn = order.get("shipment", {}).get("ttn")
        
        if not ttn:
            continue
        
        status_data = await track_ttn_status(ttn)
        if not status_data:
            continue
        
        # Update tracking info
        await db.orders.update_one(
            {"id": order_id},
            {
                "$set": {
                    "shipment.tracking_status": status_data.get("status_text"),
                    "shipment.tracking_code": status_data.get("status_code"),
                    "shipment.np_last_update": datetime.now(timezone.utc).isoformat(),
                }
            }
        )
        updated += 1
        
        # Auto-transition to DELIVERED
        if status_data.get("status_code") in DELIVERED_STATUS_CODES:
            try:
                await atomic_transition(
                    order_id,
                    "SHIPPED",
                    "DELIVERED",
                    reason="NP_DELIVERED",
                    meta=status_data,
                    actor="cron:np_tracking",
                )
                delivered += 1
                logger.info(f"Order {order_id} auto-delivered (TTN: {ttn})")
            except Exception as e:
                logger.error(f"Failed to transition {order_id} to DELIVERED: {e}")
    
    logger.info(f"NP tracking sync complete: {updated} updated, {delivered} delivered")
    return {"updated": updated, "delivered": delivered}
