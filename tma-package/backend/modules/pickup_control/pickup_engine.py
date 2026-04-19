"""
O20: Pickup Control Engine - Main processing logic
NP tracking → state → policy → outbox/alerts
"""
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import logging

from modules.pickup_control.pickup_types import ShipmentState
from modules.pickup_control.pickup_policy import (
    utcnow, parse_iso, iso,
    calc_storage_day1, calc_deadline_free,
    days_between, decide_reminder_level, make_decision, 
    pickup_risk, get_free_storage_days
)
from modules.pickup_control.pickup_templates import (
    sms_pickup_template, email_pickup_template, admin_alert_pickup_risk
)
from modules.pickup_control.pickup_repo import PickupRepo

logger = logging.getLogger(__name__)


class PickupControlEngine:
    """
    Main engine for pickup control:
    1. Fetch NP tracking for active shipments
    2. Calculate days at pickup point
    3. Send reminders based on policy
    4. Alert admin for high-risk shipments
    """
    
    def __init__(self, db, np_service=None):
        self.db = db
        self.repo = PickupRepo(db)
        self.np_service = np_service  # Nova Poshta tracking service

    async def run_once(self, limit: int = 500) -> Dict[str, Any]:
        """Run pickup control processing cycle"""
        await self.repo.ensure_indexes()
        
        orders = await self.repo.list_active_shipments(limit=limit)
        logger.info(f"Pickup control: processing {len(orders)} orders")
        
        now = utcnow()
        sent = 0
        processed = 0
        high_risk = []
        errors = []

        for o in orders:
            try:
                result = await self._process_order(o, now)
                processed += 1
                
                if result.get("sent"):
                    sent += 1
                if result.get("high_risk"):
                    high_risk.append(result["high_risk"])
                    
            except Exception as e:
                logger.error(f"Error processing order {o.get('id')}: {e}")
                errors.append({"order_id": o.get("id"), "error": str(e)})

        # Send admin alert if many high risk
        await self._maybe_admin_alert(high_risk, now)

        return {
            "ok": True,
            "processed": processed,
            "sent": sent,
            "high_risk_count": len(high_risk),
            "errors": len(errors)
        }

    async def _process_order(self, order: Dict, now: datetime) -> Dict[str, Any]:
        """Process single order for pickup control"""
        result = {"sent": False, "high_risk": None}
        
        shipment = order.get("shipment") or {}
        ttn = shipment.get("ttn")
        order_id = order.get("id")
        
        # Get recipient phone
        delivery = order.get("delivery") or {}
        recipient = delivery.get("recipient") or {}
        phone = recipient.get("phone") or order.get("buyer_phone")
        
        if not (ttn and phone and order_id):
            return result

        # Fetch NP tracking
        tracking = await self._fetch_tracking(ttn)
        if not tracking:
            return result
            
        # Normalize tracking data
        norm = self._normalize_tracking(ttn, tracking)
        
        # Check if arrived at pickup point
        if not norm.get("arrival_at"):
            return result

        arrival_at = parse_iso(norm["arrival_at"])
        if not arrival_at:
            return result
            
        storage_day1 = calc_storage_day1(arrival_at)
        point_type = norm.get("pickup_point_type") or "BRANCH"
        free_days = get_free_storage_days(point_type)
        deadline_free = calc_deadline_free(storage_day1, free_days)
        days_at = max(0, days_between(storage_day1, now))

        # Calculate risk
        risk = pickup_risk(days_at, free_days)

        # Update order with shipment state
        state = {
            "pickup_point_type": point_type,
            "arrival_at": iso(arrival_at),
            "storage_day1_at": iso(storage_day1),
            "deadline_free_at": iso(deadline_free),
            "days_at_point": int(days_at),
            "np_status_code": norm.get("np_status_code"),
            "np_status_text": norm.get("np_status_text"),
            "risk": risk.risk
        }
        await self.repo.update_shipment_state(order_id, state)

        # Track high risk
        if risk.risk == "HIGH":
            result["high_risk"] = {
                "order_id": order_id,
                "ttn": ttn,
                "phone": phone,
                "days": days_at,
                "deadline": iso(deadline_free),
                "amount": float((order.get("totals") or {}).get("grand") or order.get("total_amount") or 0)
            }

        # Check if should send reminder
        prefs = await self.repo.get_user_prefs(phone)
        if prefs.get("opt_out") or prefs.get("is_blocked"):
            return result

        cooldown_ok = await self.repo.cooldown_ok(order)
        sent_levels = await self.repo.get_sent_levels(order)
        level = decide_reminder_level(point_type, int(days_at))
        
        decision = make_decision(
            ttn=ttn,
            level=level,
            now=now,
            can_send=True,
            cooldown_ok=cooldown_ok,
            already_sent_levels=sent_levels
        )

        if not decision.should_send:
            return result

        # Check dedupe
        if not await self.repo.dedupe_once(decision.dedupe_key):
            return result

        # Generate and send SMS
        text = sms_pickup_template(
            decision.level, ttn,
            order_id=order_id,
            days=int(days_at),
            deadline=iso(deadline_free)
        )
        
        meta = {
            "order_id": order_id,
            "ttn": ttn,
            "level": decision.level,
            "days_at": int(days_at),
            "deadline_free_at": iso(deadline_free)
        }

        # Enqueue SMS
        sms_sent = await self.repo.enqueue_sms(phone, text, decision.dedupe_key, meta)
        
        if sms_sent:
            await self.repo.mark_reminder_sent(order_id, decision.level, iso(now))
            
            # Add timeline event
            await self.repo.timeline_event(
                phone=phone,
                ts=iso(now),
                type_="PICKUP_REMINDER_SENT",
                title="📲 Надіслано нагадування про отримання",
                description=f"Рівень {decision.level}, ТТН {ttn}, днів у точці: {int(days_at)}",
                payload=meta
            )
            
            result["sent"] = True
            logger.info(f"Pickup reminder sent: TTN {ttn}, level {decision.level}")

            # Send email for critical levels
            if decision.level in ["D7", "L5"] and prefs.get("email"):
                subj, body = email_pickup_template(
                    decision.level, ttn,
                    days=int(days_at),
                    deadline=iso(deadline_free)
                )
                email_key = f"{decision.dedupe_key}:email"
                if await self.repo.dedupe_once(email_key):
                    await self.repo.enqueue_email(prefs["email"], subj, body, email_key, meta)

        return result

    async def _maybe_admin_alert(self, high_risk: list, now: datetime):
        """Send admin alert if many high-risk shipments"""
        if not high_risk:
            return

        total_amount = sum(float(x.get("amount") or 0) for x in high_risk)
        count = len(high_risk)

        # Alert if: count >= 3 OR total >= 10000
        if count < 3 and total_amount < 10000:
            return

        day = now.date().isoformat()
        dedupe_key = f"pickup_admin_alert:{day}"

        if not await self.repo.dedupe_once(dedupe_key):
            return

        text = admin_alert_pickup_risk(count, total_amount, high_risk)

        reply_markup = {
            "inline_keyboard": [
                [{"text": "📦 Список ризикових", "callback_data": "pickup:risk:list"}],
                [{"text": "🔕 Заглушити 24 год", "callback_data": "pickup:risk:mute:24"}],
            ]
        }

        await self.repo.enqueue_admin_alert(text, f"admin_alert:{dedupe_key}", reply_markup=reply_markup)
        logger.info(f"Admin alert sent: {count} high-risk shipments, {total_amount:.0f} UAH at risk")

    async def _fetch_tracking(self, ttn: str) -> Optional[Dict]:
        """Fetch tracking from Nova Poshta"""
        if self.np_service:
            try:
                return await self.np_service.get_tracking_status(ttn)
            except Exception as e:
                logger.error(f"NP tracking fetch failed for {ttn}: {e}")
                return None
        
        # Fallback: try to get from stored shipment data
        order = await self.db["orders"].find_one({"shipment.ttn": ttn}, {"_id": 0, "shipment": 1})
        if order and order.get("shipment"):
            return order["shipment"]
        return None

    def _normalize_tracking(self, ttn: str, tr: Dict) -> Dict:
        """Normalize NP tracking response to our format"""
        if not tr:
            return {"ttn": ttn}
            
        # Handle various field names
        status_code = tr.get("status_code") or tr.get("StatusCode") or tr.get("np_status_code")
        status_text = (
            tr.get("status_text") or 
            tr.get("Status") or 
            tr.get("StatusText") or
            tr.get("lastStatusText") or
            tr.get("np_status_text") or
            ""
        )

        # Determine pickup point type
        pt = tr.get("pickupPointType") or tr.get("pickup_point_type")
        if not pt:
            txt = status_text.lower()
            if "поштомат" in txt:
                pt = "LOCKER"
            elif "відділен" in txt:
                pt = "BRANCH"
            else:
                pt = "UNKNOWN"

        # Get arrival date
        arrival = (
            tr.get("arrival_at") or 
            tr.get("arrivalAt") or
            tr.get("DateArrived") or
            tr.get("ActualDeliveryDate")
        )

        # Try to extract from history/events
        if not arrival and tr.get("history"):
            for e in tr["history"]:
                t = (e.get("status") or e.get("text") or "").lower()
                if ("прибул" in t) or ("очікує" in t and ("відділен" in t or "поштомат" in t)):
                    arrival = e.get("ts") or e.get("date") or e.get("created_at")
                    break

        # Check for specific NP statuses that indicate arrival
        if not arrival and status_code:
            # NP status codes for "arrived at branch/waiting pickup"
            arrival_statuses = [7, 8, 9, 10, 11]  # Common NP "waiting pickup" statuses
            if int(status_code) in arrival_statuses:
                # Use last tracking time as arrival estimate
                arrival = tr.get("lastTrackingAt") or tr.get("updated_at")

        return {
            "ttn": ttn,
            "pickup_point_type": pt,
            "arrival_at": arrival,
            "np_status_code": int(status_code) if status_code is not None else None,
            "np_status_text": status_text,
            "np_raw": tr,
        }

    async def process_single_ttn(self, ttn: str) -> Dict[str, Any]:
        """Process single TTN (for manual trigger)"""
        order = await self.db["orders"].find_one({"shipment.ttn": ttn}, {"_id": 0})
        if not order:
            return {"ok": False, "error": "Order not found"}
        
        result = await self._process_order(order, utcnow())
        return {"ok": True, **result}
