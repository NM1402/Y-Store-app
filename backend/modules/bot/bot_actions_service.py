"""
O10: Bot Actions Service - executes actions from bot callbacks
Calls existing services (TTN, CRM, Notifications)
"""
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

logger = logging.getLogger(__name__)


class BotActionsService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db

    async def create_ttn(self, order_id: str) -> dict:
        """
        Create real TTN via Nova Poshta API for a TMA order.
        Works with TMA order schema: customer / delivery / total_amount.
        """
        try:
            import os
            import httpx

            order = await self.db["orders"].find_one({"id": order_id}, {"_id": 0})
            if not order:
                return {"ok": False, "error": "ORDER_NOT_FOUND"}

            # Already has TTN → idempotent return
            existing_ttn = (order.get("delivery") or {}).get("tracking_number") \
                or (order.get("shipment") or {}).get("ttn")
            if existing_ttn:
                return {"ok": True, "ttn": existing_ttn, "cached": True}

            # Only create TTN for paid card orders or new cash orders
            if order.get("status") not in ("paid", "new", "confirmed"):
                return {"ok": False, "error": f"ORDER_STATUS_NOT_ALLOWED: {order.get('status')}"}

            API_KEY = os.getenv("NP_API_KEY") or os.getenv("NOVAPOSHTA_API_KEY")
            SENDER = os.getenv("NP_SENDER_COUNTERPARTY_REF")
            CONTACT_SENDER = os.getenv("NP_SENDER_CONTACT_REF")
            CITY_SENDER = os.getenv("NP_SENDER_CITY_REF")
            SENDER_ADDRESS = os.getenv("NP_SENDER_WAREHOUSE_REF")
            SENDER_PHONE = os.getenv("NP_SENDER_PHONE") or ""

            if not all([API_KEY, SENDER, CONTACT_SENDER, CITY_SENDER, SENDER_ADDRESS]):
                return {"ok": False, "error": "NP_SENDER_NOT_CONFIGURED"}

            cust = order.get("customer") or {}
            deliv = order.get("delivery") or {}
            city_ref = deliv.get("city_ref")
            wh_ref = deliv.get("warehouse_ref")
            if not city_ref or not wh_ref:
                return {"ok": False, "error": "ORDER_MISSING_NP_REFS"}

            full_name = (cust.get("full_name") or "").strip()
            parts = [p for p in full_name.split() if p]
            if len(parts) >= 2:
                last_name, first_name = parts[0], parts[1]
                middle_name = parts[2] if len(parts) > 2 else ""
            else:
                last_name = cust.get("last_name") or "Покупець"
                first_name = cust.get("first_name") or (parts[0] if parts else "Клієнт")
                middle_name = ""
            # Нова Пошта вимагає ПІБ як "Прізвище Ім'я" (2+ слова) — не одне слово
            recipient_name = " ".join([p for p in [last_name, first_name, middle_name] if p]).strip()
            if len(recipient_name.split()) < 2:
                recipient_name = f"{recipient_name} Клієнт".strip()

            phone = (cust.get("phone") or "").replace("+", "").replace(" ", "").replace("-", "")
            total = float(order.get("total_amount") or 0)
            declared = max(int(total), 100)

            # Weight: 1kg base + 0.2kg per item
            items_total_qty = sum(int(it.get("quantity") or 1) for it in (order.get("items") or []))
            weight = round(1.0 + 0.2 * max(items_total_qty - 1, 0), 1)

            items = order.get("items") or []
            descr_parts = []
            for it in items[:3]:
                descr_parts.append(str(it.get("title") or "Товар"))
            description = (", ".join(descr_parts) or "Товари Y-Store")[:50]

            # Payment: COD if cash_on_delivery, else pre-paid
            is_cod = order.get("payment_method") in ("cash_on_delivery", "cash")
            cod_amount = int(total) if is_cod else 0

            props = {
                "PayerType": "Recipient",
                "PaymentMethod": "Cash",
                "CargoType": "Parcel",
                "VolumeGeneral": "0.001",
                "Weight": str(weight),
                "ServiceType": "WarehouseWarehouse",
                "SeatsAmount": "1",
                "Description": description,
                "Cost": str(declared),
                # Sender
                "CitySender": CITY_SENDER,
                "Sender": SENDER,
                "SenderAddress": SENDER_ADDRESS,
                "ContactSender": CONTACT_SENDER,
                "SendersPhone": SENDER_PHONE,
                # Recipient
                "CityRecipient": city_ref,
                "RecipientAddress": wh_ref,
                "NewAddress": "1",
                "RecipientCityName": deliv.get("city_name", ""),
                "RecipientArea": "",
                "RecipientAreaRegions": "",
                "RecipientAddressName": deliv.get("warehouse_name", "1"),
                "RecipientName": recipient_name,
                "RecipientType": "PrivatePerson",
                "RecipientsPhone": phone,
            }
            if cod_amount > 0:
                props["BackwardDeliveryData"] = [{
                    "PayerType": "Recipient",
                    "CargoType": "Money",
                    "RedeliveryString": str(cod_amount),
                }]

            async with httpx.AsyncClient(timeout=30) as cx:
                r = await cx.post("https://api.novaposhta.ua/v2.0/json/", json={
                    "apiKey": API_KEY,
                    "modelName": "InternetDocument",
                    "calledMethod": "save",
                    "methodProperties": props,
                })
                raw = r.json()

                # Retry без Післяплати якщо сервіс недоступний для counterparty
                if (not raw.get("success")) and cod_amount > 0:
                    errs = raw.get("errors") or []
                    err_text = " ".join([str(e) for e in errs]).lower()
                    if "післяплат" in err_text or "post-payment" in err_text or "backwarddelivery" in err_text:
                        logger.warning(f"NP COD unavailable for {order_id}, retrying without BackwardDelivery")
                        props.pop("BackwardDeliveryData", None)
                        r = await cx.post("https://api.novaposhta.ua/v2.0/json/", json={
                            "apiKey": API_KEY,
                            "modelName": "InternetDocument",
                            "calledMethod": "save",
                            "methodProperties": props,
                        })
                        raw = r.json()

            if not raw.get("success"):
                return {"ok": False, "error": "NP_CREATE_FAILED", "details": raw.get("errors") or raw.get("warnings")}

            data0 = (raw.get("data") or [{}])[0]
            ttn = data0.get("IntDocNumber")
            cost = data0.get("CostOnSite") or data0.get("Cost")
            est = data0.get("EstimatedDeliveryDate")

            if not ttn:
                return {"ok": False, "error": "NP_NO_TTN", "details": raw}

            from datetime import datetime, timezone
            now_iso = datetime.now(timezone.utc).isoformat()

            await self.db["orders"].update_one(
                {"id": order_id},
                {"$set": {
                    "delivery.tracking_number": ttn,
                    "delivery.tracking_provider": "novaposhta",
                    "delivery.tracking_cost": float(cost) if cost else None,
                    "delivery.estimated_delivery_date": est,
                    "status": "processing",
                    "updated_at": now_iso,
                }}
            )
            logger.info(f"✅ TTN {ttn} created for order {order_id}")

            return {
                "ok": True,
                "ttn": ttn,
                "cost": float(cost) if cost else None,
                "estimated_delivery_date": est,
            }
        except Exception as e:
            logger.error(f"Failed to create TTN: {e}", exc_info=True)
            return {"ok": False, "error": str(e)}

    async def refresh_tracking(self, order_id: str) -> dict:
        """Refresh tracking status for order"""
        try:
            from modules.delivery.np.np_ttn_service import NPTTNService
            
            # Get order to find TTN
            order = await self.db["orders"].find_one({"id": order_id}, {"_id": 0})
            if not order:
                return {"ok": False, "error": "ORDER_NOT_FOUND"}
            
            ttn = (order.get("shipment") or {}).get("ttn")
            if not ttn:
                return {"ok": False, "error": "NO_TTN"}
            
            service = NPTTNService(self.db)
            result = await service.sync_tracking_to_order(order_id, ttn)
            
            return {"ok": True, "result": result}
        except Exception as e:
            logger.error(f"Failed to refresh tracking: {e}")
            return {"ok": False, "error": str(e)}

    async def mark_vip(self, order_id: str) -> dict:
        """Mark customer as VIP based on order"""
        try:
            order = await self.db["orders"].find_one({"id": order_id}, {"_id": 0})
            if not order:
                return {"ok": False, "error": "ORDER_NOT_FOUND"}
            
            phone = (order.get("shipping") or {}).get("phone")
            if not phone:
                return {"ok": False, "error": "NO_PHONE"}
            
            from modules.crm.actions.crm_actions_service import CRMActionsService
            service = CRMActionsService(self.db)
            
            # Get current customer
            customer = await self.db["customers"].find_one({"phone": phone}, {"_id": 0})
            current_tags = customer.get("tags", []) if customer else []
            
            if "VIP" not in current_tags:
                current_tags.append("VIP")
            
            await service.set_tags(phone, current_tags)
            
            # Also update segment
            await self.db["customers"].update_one(
                {"phone": phone},
                {"$set": {"segment": "VIP"}}
            )
            
            return {"ok": True, "phone": phone, "tags": current_tags}
        except Exception as e:
            logger.error(f"Failed to mark VIP: {e}")
            return {"ok": False, "error": str(e)}

    async def mark_risk(self, order_id: str) -> dict:
        """Mark customer as RISK based on order"""
        try:
            order = await self.db["orders"].find_one({"id": order_id}, {"_id": 0})
            if not order:
                return {"ok": False, "error": "ORDER_NOT_FOUND"}
            
            phone = (order.get("shipping") or {}).get("phone")
            if not phone:
                return {"ok": False, "error": "NO_PHONE"}
            
            from modules.crm.actions.crm_actions_service import CRMActionsService
            service = CRMActionsService(self.db)
            
            customer = await self.db["customers"].find_one({"phone": phone}, {"_id": 0})
            current_tags = customer.get("tags", []) if customer else []
            
            if "RISK" not in current_tags:
                current_tags.append("RISK")
            
            await service.set_tags(phone, current_tags)
            await self.db["customers"].update_one(
                {"phone": phone},
                {"$set": {"segment": "RISK"}}
            )
            
            return {"ok": True, "phone": phone, "tags": current_tags}
        except Exception as e:
            logger.error(f"Failed to mark RISK: {e}")
            return {"ok": False, "error": str(e)}

    async def block_customer(self, order_id: str) -> dict:
        """Block customer based on order"""
        try:
            order = await self.db["orders"].find_one({"id": order_id}, {"_id": 0})
            if not order:
                return {"ok": False, "error": "ORDER_NOT_FOUND"}
            
            phone = (order.get("shipping") or {}).get("phone")
            if not phone:
                return {"ok": False, "error": "NO_PHONE"}
            
            from modules.crm.actions.crm_actions_service import CRMActionsService
            service = CRMActionsService(self.db)
            
            await service.toggle_block(phone, True)
            
            return {"ok": True, "phone": phone, "blocked": True}
        except Exception as e:
            logger.error(f"Failed to block customer: {e}")
            return {"ok": False, "error": str(e)}

    async def send_sms(self, order_id: str, custom_text: str = None) -> dict:
        """Send SMS to customer"""
        try:
            order = await self.db["orders"].find_one({"id": order_id}, {"_id": 0})
            if not order:
                return {"ok": False, "error": "ORDER_NOT_FOUND"}
            
            phone = (order.get("shipping") or {}).get("phone")
            if not phone:
                return {"ok": False, "error": "NO_PHONE"}
            
            ttn = (order.get("shipment") or {}).get("ttn", "")
            
            text = custom_text or f"Y-Store: Вашу посилку відправлено. ТТН: {ttn}."
            
            from modules.crm.actions.crm_actions_service import CRMActionsService
            service = CRMActionsService(self.db)
            await service.queue_sms(phone, text)
            
            return {"ok": True, "phone": phone, "text": text}
        except Exception as e:
            logger.error(f"Failed to send SMS: {e}")
            return {"ok": False, "error": str(e)}

    async def get_order_details(self, order_id: str) -> dict:
        """Get order details for display"""
        order = await self.db["orders"].find_one({"id": order_id}, {"_id": 0})
        if not order:
            return {"ok": False, "error": "ORDER_NOT_FOUND"}
        
        return {"ok": True, "order": order}

    async def get_pdf_url(self, ttn: str) -> str:
        """Get PDF label URL for TTN"""
        # In production, this would call NP API to get PDF
        # For now, return internal endpoint
        import os
        base = os.getenv("INTERNAL_API_BASE", "http://127.0.0.1:8001")
        return f"{base}/api/v2/delivery/novaposhta/ttn/{ttn}/label.pdf"
