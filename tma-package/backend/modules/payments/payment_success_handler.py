"""
Payment Success Handler - Unified handler for payment confirmations
BLOCK V2-10

Handles the flow:
1. Payment confirmed -> Order PAID
2. PAID -> PROCESSING (auto)
3. Create TTN (if auto-ship enabled)
4. PROCESSING -> SHIPPED (on TTN success)
"""
from core.db import db
from modules.orders.orders_status_service import atomic_transition
import logging

logger = logging.getLogger(__name__)


async def handle_payment_success(
    order_id: str,
    provider: str,
    provider_payment_id: str,
    amount_uah: int
) -> dict:
    """
    Handle successful payment for an order.
    
    Args:
        order_id: Order ID
        provider: Payment provider (FONDY, LIQPAY, etc.)
        provider_payment_id: Provider's payment ID
        amount_uah: Amount paid in UAH (kopecks)
    
    Returns:
        dict with ok, error, ttn fields
    """
    # 1) Load order
    order = await db.orders.find_one({"id": order_id})
    if not order:
        return {"ok": False, "error": "ORDER_NOT_FOUND"}
    
    status = order.get("status")
    
    # 2) Idempotent: if already PAID or further - do nothing
    if status in ("PAID", "PROCESSING", "SHIPPED", "DELIVERED"):
        logger.info(f"Order {order_id} already paid/processed, skipping")
        return {"ok": True, "already_paid": True}
    
    # 3) Atomic transition AWAITING_PAYMENT -> PAID
    if status == "AWAITING_PAYMENT":
        order = await atomic_transition(
            order_id,
            "AWAITING_PAYMENT",
            "PAID",
            reason="PAYMENT_CONFIRMED",
            meta={
                "provider": provider,
                "provider_payment_id": provider_payment_id,
                "amount_uah": amount_uah,
            },
            actor=f"payment:{provider}",
        )
    elif status == "NEW":
        # If somehow NEW without await - auto-align
        order = await atomic_transition(order_id, "NEW", "AWAITING_PAYMENT", reason="AUTO_ALIGN")
        order = await atomic_transition(
            order_id,
            "AWAITING_PAYMENT",
            "PAID",
            reason="PAYMENT_CONFIRMED",
            meta={"provider": provider, "provider_payment_id": provider_payment_id},
        )
    else:
        # Conflicting status
        return {"ok": False, "error": f"BAD_STATUS_{status}"}
    
    # 4) PAID -> PROCESSING
    try:
        order = await atomic_transition(
            order_id,
            "PAID",
            "PROCESSING",
            reason="AUTO_PROCESSING",
            actor="system:payment_handler",
        )
    except Exception as e:
        logger.warning(f"Could not transition to PROCESSING: {e}")
    
    # 5) Record payment in ledger
    try:
        await db.ledger.insert_one({
            "type": "PAYMENT_IN",
            "order_id": order_id,
            "amount_uah": amount_uah,
            "provider": provider,
            "provider_payment_id": provider_payment_id,
            "created_at": order.get("updated_at"),
        })
    except Exception as e:
        logger.error(f"Failed to record payment in ledger: {e}")
    
    # 6) Try to create TTN (optional auto-ship)
    ttn_result = None
    auto_ship = order.get("auto_ship", False)
    
    if auto_ship:
        try:
            from modules.delivery.novaposhta_ttn_service import ensure_ttn_for_order
            ttn_result = await ensure_ttn_for_order(order_id)
            
            if ttn_result.get("ok") and ttn_result.get("ttn"):
                # PROCESSING -> SHIPPED
                await atomic_transition(
                    order_id,
                    "PROCESSING",
                    "SHIPPED",
                    reason="TTN_CREATED",
                    meta={"ttn": ttn_result["ttn"]},
                    actor="system:auto_ship",
                )
        except Exception as e:
            logger.error(f"Auto-ship TTN creation failed: {e}")
    
    return {
        "ok": True,
        "order_id": order_id,
        "new_status": order.get("status"),
        "ttn": ttn_result.get("ttn") if ttn_result else None,
    }
