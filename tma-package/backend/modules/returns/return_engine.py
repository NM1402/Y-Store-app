"""
O20.3: Return Management Engine - Main Engine
Processes shipments, detects returns, updates ledger/CRM/alerts
"""
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import logging

from modules.returns.return_repo import ReturnRepo
from modules.returns.return_mapping import detect_return_from_np
from modules.returns.return_types import ReturnDetection

logger = logging.getLogger(__name__)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


class ReturnEngine:
    """
    Main engine for return management:
    1. Fetch NP tracking for active shipments
    2. Detect return scenarios
    3. Update order status
    4. Record ledger losses
    5. Update CRM counters
    6. Send admin alerts
    """
    
    def __init__(self, db, np_client=None):
        self.db = db
        self.np_client = np_client
        self.repo = ReturnRepo(db)

    async def run_once(self, limit: int = 500) -> Dict[str, Any]:
        """Run return detection and processing cycle"""
        await self.repo.ensure_indexes()
        
        orders = await self.repo.list_active_shipments(limit=limit)
        logger.info(f"Return engine: processing {len(orders)} orders")
        
        updated = 0
        detected = 0
        errors = []

        for o in orders:
            try:
                result = await self._process_order(o)
                if result.get("detected"):
                    detected += 1
                if result.get("updated"):
                    updated += 1
            except Exception as e:
                logger.error(f"Error processing order {o.get('id')}: {e}")
                errors.append({"order_id": o.get("id"), "error": str(e)})

        return {
            "ok": True,
            "scanned": len(orders),
            "detected": detected,
            "updated": updated,
            "errors": len(errors)
        }

    async def _process_order(self, order: Dict) -> Dict[str, Any]:
        """Process single order for return detection"""
        result = {"detected": False, "updated": False}
        
        shipment = order.get("shipment") or {}
        ttn = shipment.get("ttn")
        order_id = order.get("id")
        
        # Get recipient phone
        delivery = order.get("delivery") or {}
        recipient = delivery.get("recipient") or {}
        shipping = order.get("shipping") or {}
        phone = (
            recipient.get("phone") or 
            shipping.get("phone") or 
            order.get("buyer_phone")
        )
        
        if not (ttn and order_id):
            return result

        # Fetch NP tracking
        tracking = await self._fetch_tracking(ttn)
        if not tracking:
            return result
            
        # Detect return
        det = detect_return_from_np(tracking)
        if not det.is_return:
            return result

        result["detected"] = True

        # Idempotency per (ttn + stage + reason)
        dedupe_key = f"return:{ttn}:{det.stage}:{det.reason}"
        if not await self.repo.mark_event_once(dedupe_key, {
            "order_id": order_id, 
            "ttn": ttn, 
            "det": det.model_dump()
        }):
            return result

        # 1) Set returns block
        await self.repo.set_return_state(order_id, det.stage, det.reason, {
            "status_code": det.raw_status_code,
            "status_text": det.raw_status_text
        })

        # 2) Transition order status
        if det.stage == "RETURNING":
            await self.repo.transition_order_status(order_id, "RETURNING")
        elif det.stage == "RETURNED":
            await self.repo.transition_order_status(order_id, "RETURNED")

        # 3) Ledger - shipping losses
        ship_cost = float(shipment.get("cost") or shipment.get("delivery_cost") or 0)
        return_cost = float((order.get("returns") or {}).get("return_cost") or ship_cost * 0.5)
        amount = float((order.get("totals") or {}).get("grand") or order.get("total_amount") or 0)

        ledger_entries = 0
        if await self.repo.add_ledger_once(
            order_id, "SHIP_COST_OUT", ship_cost, 
            ref=f"{ttn}:ship", 
            meta={"ttn": ttn, "reason": det.reason}
        ):
            ledger_entries += 1
            
        if await self.repo.add_ledger_once(
            order_id, "RETURN_COST_OUT", return_cost, 
            ref=f"{ttn}:return", 
            meta={"ttn": ttn, "reason": det.reason}
        ):
            ledger_entries += 1

        # If COD - record SALE_LOST for analytics
        payment_method = (order.get("payment") or {}).get("method") or order.get("payment_method")
        is_cod = str(payment_method).upper() in ["COD", "CASH_ON_DELIVERY", "POSTPAID"]
        
        if is_cod:
            if await self.repo.add_ledger_once(
                order_id, "SALE_LOST", amount, 
                ref=f"{ttn}:sale_lost", 
                meta={"ttn": ttn, "reason": det.reason}
            ):
                ledger_entries += 1

        # 4) CRM counters + risk segment
        if phone:
            await self.repo.inc_customer_return_counters(phone, is_cod=is_cod, reason=det.reason)
            await self.repo.set_customer_risk_if_needed(phone)

            # 5) Timeline event
            await self.repo.timeline_event(
                phone=phone,
                type_="RETURN_DETECTED",
                title="↩️ Виявлено повернення",
                description=f"ТТН {ttn} • {det.stage} • {det.reason}",
                payload={
                    "order_id": order_id, 
                    "ttn": ttn, 
                    "amount": amount, 
                    "reason": det.reason, 
                    "stage": det.stage
                }
            )

        # 6) Telegram admin alert
        await self._admin_alert(order, det, amount)

        result["updated"] = True
        logger.info(f"Return detected: TTN {ttn}, stage={det.stage}, reason={det.reason}")
        
        return result

    async def _admin_alert(self, order: dict, det: ReturnDetection, amount: float):
        """Send admin alert about return"""
        ttn = (order.get("shipment") or {}).get("ttn")
        order_id = order.get("id")
        
        # Get phone
        delivery = order.get("delivery") or {}
        recipient = delivery.get("recipient") or {}
        shipping = order.get("shipping") or {}
        phone = recipient.get("phone") or shipping.get("phone") or "-"

        dedupe_key = f"admin_return_alert:{ttn}:{det.stage}:{det.reason}"

        # Calculate shipping loss
        ship_cost = float((order.get("shipment") or {}).get("cost") or 0)
        return_cost = ship_cost * 0.5
        loss = ship_cost + return_cost

        text = (
            f"↩️ <b>Повернення / проблема з отриманням</b>\n\n"
            f"ТТН: <code>{ttn}</code>\n"
            f"Стадія: <b>{det.stage}</b>\n"
            f"Причина: <b>{det.reason}</b>\n"
            f"Сума замовлення: <b>{amount:.0f} грн</b>\n"
            f"Втрати доставки: <b>{loss:.0f} грн</b>\n"
            f"Клієнт: <code>{phone}</code>\n"
            f"Замовлення: <code>{order_id[:8] if order_id else '-'}</code>"
        )

        reply_markup = {
            "inline_keyboard": [
                [{"text": "👤 Клієнт", "callback_data": f"customer:open:{phone}"}],
                [{"text": "📦 Замовлення", "callback_data": f"order:open:{order_id}"}],
                [{"text": "🔒 Заблокувати COD", "callback_data": f"crm:block_cod:{phone}"}],
            ]
        }

        await self.repo.enqueue_admin_alert(dedupe_key, text, reply_markup=reply_markup)

    async def _fetch_tracking(self, ttn: str) -> Optional[Dict]:
        """Fetch tracking from Nova Poshta"""
        if self.np_client:
            try:
                return await self.np_client.get_tracking_status(ttn)
            except Exception as e:
                logger.error(f"NP tracking fetch failed for {ttn}: {e}")
                return None
        
        # Fallback: get from stored shipment data
        order = await self.db["orders"].find_one(
            {"shipment.ttn": ttn}, 
            {"_id": 0, "shipment": 1}
        )
        if order and order.get("shipment"):
            return order["shipment"]
        return None

    async def process_single_ttn(self, ttn: str) -> Dict[str, Any]:
        """Process single TTN (for manual trigger)"""
        order = await self.db["orders"].find_one({"shipment.ttn": ttn}, {"_id": 0})
        if not order:
            return {"ok": False, "error": "Order not found"}
        
        result = await self._process_order(order)
        return {"ok": True, **result}
