"""
Nova Poshta TTN Idempotent Service - Order-bound TTN creation
BLOCK V2-10
"""
from datetime import datetime, timezone
from core.db import db
import logging

logger = logging.getLogger(__name__)


async def ensure_ttn_for_order(order_id: str) -> dict:
    """
    Create TTN for order idempotently.
    
    If TTN already exists - returns it.
    Uses lock to prevent parallel TTN creation.
    
    Returns:
        dict with ok, ttn, idempotent, error fields
    """
    # 1) Check if TTN already exists
    order = await db.orders.find_one({"id": order_id})
    if not order:
        return {"ok": False, "error": "ORDER_NOT_FOUND"}
    
    shipment = order.get("shipment") or {}
    if shipment.get("ttn"):
        return {"ok": True, "ttn": shipment["ttn"], "idempotent": True}
    
    # 2) Acquire lock
    lock = await db.order_ops.find_one_and_update(
        {"order_id": order_id, "op": "CREATE_TTN"},
        {
            "$setOnInsert": {
                "order_id": order_id,
                "op": "CREATE_TTN",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        },
        upsert=True,
        return_document=True,
    )
    
    # If lock already existed, re-check order
    if lock and lock.get("created_at"):
        order = await db.orders.find_one({"id": order_id})
        if order and (order.get("shipment") or {}).get("ttn"):
            return {"ok": True, "ttn": order["shipment"]["ttn"], "idempotent": True}
    
    # 3) Create TTN via NP API
    try:
        from modules.delivery.np.np_ttn_service import NPTTNService
        from modules.delivery.np.np_types import NPTTNCreateRequest
        
        service = NPTTNService(db)
        await service.init()
        
        req = NPTTNCreateRequest(order_id=order_id)
        result = await service.create_ttn(req)
        
        return {
            "ok": True,
            "ttn": result.ttn,
            "cost": result.cost,
            "estimated_delivery_date": result.estimated_delivery_date,
        }
    except Exception as e:
        logger.error(f"TTN creation failed for order {order_id}: {e}")
        return {"ok": False, "error": str(e)}
