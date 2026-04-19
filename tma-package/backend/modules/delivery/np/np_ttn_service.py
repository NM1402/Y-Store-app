"""
Nova Poshta TTN Service - High-level TTN operations
"""
from typing import Dict, Any, Optional
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

from core.config import settings
from .np_client import np_client
from .np_ttn_repository import NPTTNRepository
from .np_types import NPTTNCreateRequest, NPTTNResponse, NPTrackingResponse

logger = logging.getLogger(__name__)


class NPTTNService:
    """Service for Nova Poshta TTN operations"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.repo = NPTTNRepository(db)
        self.client = np_client
    
    async def init(self):
        """Initialize indexes"""
        await self.repo.ensure_indexes()
    
    def _build_document_props(
        self, 
        order: dict, 
        req: NPTTNCreateRequest
    ) -> Dict[str, Any]:
        """Build Nova Poshta InternetDocument properties from order"""
        
        # Get recipient info from order
        shipping = order.get("shipping") or {}
        delivery = order.get("delivery") or {}
        np_data = delivery.get("np") or {}
        
        # Calculate values with optional overrides
        totals = order.get("totals") or {}
        weight = req.weight_kg or float(order.get("weight_kg", 1.0))
        seats = req.seats_amount or 1
        declared = req.declared_value or float(totals.get("grand") or 100)
        if declared < 1:
            declared = 100  # Minimum declared value
        desc = req.description or "Товари Y-Store"
        
        payer_type = req.payer_type or "Recipient"
        payment_method = req.payment_method or "Cash"
        
        # Parse recipient name into parts
        full_name = shipping.get("full_name", "")
        name_parts = full_name.split() if full_name else ["Покупець", "Y-Store", ""]
        # Ensure we have at least 3 parts
        while len(name_parts) < 3:
            name_parts.append("")
        last_name = name_parts[0]  # Прізвище
        first_name = name_parts[1] if name_parts[1] else "Покупець"  # Ім'я
        middle_name = name_parts[2] if len(name_parts) > 2 else ""  # По батькові
        
        recipient_phone = shipping.get("phone", "")
        
        props = {
            "PayerType": payer_type,
            "PaymentMethod": payment_method,
            "CargoType": "Parcel",
            "VolumeGeneral": "0.001",
            "Weight": str(weight),
            "ServiceType": "WarehouseWarehouse",
            "SeatsAmount": str(seats),
            "Description": desc,
            "Cost": str(int(declared)),
            
            # Sender (from env settings)
            "CitySender": settings.NP_SENDER_CITY_REF,
            "Sender": settings.NP_SENDER_COUNTERPARTY_REF,
            "SenderAddress": settings.NP_SENDER_WAREHOUSE_REF,
            "ContactSender": settings.NP_SENDER_CONTACT_REF,
            "SendersPhone": settings.NP_SENDER_PHONE,
            
            # Recipient location
            "CityRecipient": np_data.get("city_ref") or shipping.get("city_ref"),
            "RecipientAddress": np_data.get("warehouse_ref") or shipping.get("warehouse_ref"),
            
            # NEW: Using NewAddress format for private person recipient
            # This tells NP to auto-create counterparty
            "NewAddress": "1",
            
            # Recipient counterparty (will be created automatically)
            "RecipientCityName": shipping.get("city", ""),
            "RecipientAddressName": shipping.get("address", "1"),
            "RecipientName": full_name,
            "RecipientType": "PrivatePerson",
            "RecipientsPhone": recipient_phone,
        }
        
        # Add COD (cash on delivery) if specified
        if req.cod_amount is not None and req.cod_amount > 0:
            props["BackwardDeliveryData"] = [{
                "PayerType": "Recipient",
                "CargoType": "Money",
                "RedeliveryString": str(int(req.cod_amount)),
            }]
        
        return props
    
    async def create_ttn(
        self, 
        req: NPTTNCreateRequest, 
        idempotency_key: Optional[str] = None
    ) -> NPTTNResponse:
        """
        Create TTN for order.
        
        Features:
        - Idempotent: same request returns same TTN
        - Atomic: only creates if order is PROCESSING
        - Auto-transition: PROCESSING -> SHIPPED on success
        """
        idem_key = idempotency_key or f"order:{req.order_id}"
        
        # Step 1: Try to acquire idempotent lock
        lock = await self.repo.lock_ttn_idempotent(req.order_id, idem_key)
        
        if not lock["inserted"]:
            existing = lock["doc"] or {}
            # If already done, return cached result
            if existing.get("status") == "DONE" and existing.get("result"):
                r = existing["result"]
                return NPTTNResponse(**r, idempotent=True)
            # If LOCKED/FAILED - allow retry
        
        # Step 2: Get and validate order
        order = await self.repo.get_order(req.order_id)
        if not order:
            await self.repo.store_event_result(idem_key, {"ok": False}, "FAILED")
            raise HTTPException(status_code=404, detail="ORDER_NOT_FOUND")
        
        # Step 3: Check order status
        current_status = order.get("status", "")
        if current_status not in ("PROCESSING", "PAID"):
            raise HTTPException(
                status_code=400, 
                detail=f"ORDER_STATUS_NOT_ALLOWED_FOR_TTN: {current_status}"
            )
        
        # Auto-transition PAID -> PROCESSING if needed
        if current_status == "PAID":
            await self._transition_to_processing(req.order_id)
        
        # Step 4: Check if TTN already exists
        existing_ttn = (order.get("shipment") or {}).get("ttn")
        if existing_ttn:
            result = {
                "ok": True,
                "ttn": existing_ttn,
                "cost": order["shipment"].get("cost"),
                "estimated_delivery_date": order["shipment"].get("estimated_delivery_date"),
                "raw": order["shipment"].get("raw"),
            }
            await self.repo.store_event_result(idem_key, result, "DONE")
            return NPTTNResponse(**result, idempotent=True)
        
        # Step 5: Build props and call Nova Poshta API
        props = self._build_document_props(order, req)
        raw = await self.client.create_internet_document(props)
        
        if not raw.get("success"):
            result = {"ok": False, "raw": raw}
            await self.repo.store_event_result(idem_key, result, "FAILED")
            raise HTTPException(
                status_code=502, 
                detail={"error": "NP_CREATE_FAILED", "details": raw}
            )
        
        # Step 6: Extract TTN from response
        data0 = (raw.get("data") or [{}])[0]
        ttn = data0.get("IntDocNumber")
        cost = data0.get("CostOnSite") or data0.get("Cost")
        est_delivery = data0.get("EstimatedDeliveryDate")
        
        if not ttn:
            result = {"ok": False, "raw": raw}
            await self.repo.store_event_result(idem_key, result, "FAILED")
            raise HTTPException(status_code=502, detail="NP_NO_TTN_RETURNED")
        
        # Step 7: Atomic update - set TTN and transition to SHIPPED
        try:
            await self.repo.set_shipment_ttn_atomic(
                order_id=req.order_id,
                ttn=ttn,
                raw=raw,
                cost=float(cost) if cost else None,
                estimated_delivery_date=est_delivery,
                require_status="PROCESSING",
            )
        except ValueError:
            # Race condition - someone created TTN in parallel
            latest = await self.repo.get_order(req.order_id)
            if latest and (latest.get("shipment") or {}).get("ttn"):
                result = {
                    "ok": True,
                    "ttn": latest["shipment"]["ttn"],
                    "cost": latest["shipment"].get("cost"),
                    "estimated_delivery_date": latest["shipment"].get("estimated_delivery_date"),
                    "raw": latest["shipment"].get("raw"),
                }
                await self.repo.store_event_result(idem_key, result, "DONE")
                return NPTTNResponse(**result, idempotent=True)
            
            raise HTTPException(status_code=409, detail="TTN_CONFLICT")
        
        # Step 8: Store success result
        result = {
            "ok": True,
            "ttn": ttn,
            "cost": float(cost) if cost else None,
            "estimated_delivery_date": est_delivery,
            "raw": raw,
        }
        await self.repo.store_event_result(idem_key, result, "DONE")
        
        logger.info(f"✅ TTN created: {ttn} for order {req.order_id}")
        
        # O2: Emit event for notifications
        try:
            from modules.ops.events.events_repo import EventsRepo
            await EventsRepo(self.db).emit(
                "TTN_CREATED",
                req.order_id,
                {"ttn": ttn, "phone": order.get("shipping", {}).get("phone")}
            )
        except Exception as e:
            logger.error(f"Failed to emit TTN_CREATED event: {e}")
        
        # O5: Record shipping cost in finance ledger
        try:
            if cost:
                from modules.finance.finance_repo import FinanceRepo
                await FinanceRepo(self.db).record(
                    order_id=req.order_id,
                    type_="SHIP_COST_OUT",
                    amount=float(cost),
                    direction="OUT",
                    meta={"method": "NOVAPOSHTA", "ttn": ttn}
                )
        except Exception as e:
            logger.error(f"Failed to record shipping cost: {e}")
        
        # O9: Send Telegram alert
        try:
            from modules.bot.alerts_service import AlertsService
            alerts = AlertsService(self.db)
            await alerts.init()
            await alerts.alert_ttn_created(
                req.order_id, 
                ttn, 
                order.get("shipping", {})
            )
        except Exception as e:
            logger.error(f"Failed to send TTN_CREATED alert: {e}")
        
        return NPTTNResponse(**result, idempotent=False)
    
    async def _transition_to_processing(self, order_id: str):
        """Auto-transition PAID -> PROCESSING"""
        from datetime import datetime, timezone
        
        now = datetime.now(timezone.utc).isoformat()
        
        await self.db["orders"].update_one(
            {"id": order_id, "status": "PAID"},
            {
                "$set": {
                    "status": "PROCESSING",
                    "updated_at": now,
                },
                "$inc": {"version": 1},
                "$push": {
                    "status_history": {
                        "from": "PAID",
                        "to": "PROCESSING",
                        "actor": "delivery:novaposhta:auto",
                        "reason": "AUTO_TRANSITION_FOR_TTN",
                        "at": now,
                    }
                }
            }
        )
    
    async def get_tracking_status(self, ttn: str) -> NPTrackingResponse:
        """Get tracking status for TTN"""
        raw = await self.client.get_tracking_status(ttn)
        
        if not raw.get("success"):
            raise HTTPException(
                status_code=502, 
                detail={"error": "NP_TRACKING_FAILED", "details": raw}
            )
        
        data = (raw.get("data") or [{}])[0]
        
        return NPTrackingResponse(
            ttn=ttn,
            status=data.get("Status", "Unknown"),
            status_code=data.get("StatusCode"),
            actual_delivery_date=data.get("ActualDeliveryDate"),
            recipient_name=data.get("RecipientFullName"),
            city_sender=data.get("CitySender"),
            city_recipient=data.get("CityRecipient"),
            warehouse_recipient=data.get("WarehouseRecipient"),
            raw=raw,
        )
    
    async def sync_tracking_to_order(
        self, 
        order_id: str, 
        ttn: str
    ) -> Optional[dict]:
        """Fetch tracking and update order status"""
        tracking = await self.get_tracking_status(ttn)
        
        return await self.repo.update_tracking_status(
            order_id=order_id,
            ttn=ttn,
            status=tracking.status,
            status_code=tracking.status_code,
            actual_delivery_date=tracking.actual_delivery_date,
        )
