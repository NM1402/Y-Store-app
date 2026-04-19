"""
O9: Alerts Service - enqueues alerts for various events
"""
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Dict, Any

from .bot_alerts_repo import BotAlertsRepo
from .bot_settings_repo import BotSettingsRepo


class AlertsService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.alerts_repo = BotAlertsRepo(db)
        self.settings_repo = BotSettingsRepo(db)

    async def init(self):
        await self.alerts_repo.ensure_indexes()

    def _order_keyboard(self, order_id: str) -> dict:
        """Build inline keyboard for order alerts"""
        return {
            "inline_keyboard": [
                [
                    {"text": "📦 Створити ТТН", "callback_data": f"create_ttn:{order_id}"},
                    {"text": "👁 Деталі", "callback_data": f"view_order:{order_id}"}
                ],
                [
                    {"text": "🚫 Блокувати клієнта", "callback_data": f"mark_block:{order_id}"}
                ]
            ]
        }

    def _ttn_keyboard(self, order_id: str, ttn: str) -> dict:
        """Build inline keyboard for TTN alerts"""
        return {
            "inline_keyboard": [
                [
                    {"text": "🖨 PDF етикетка", "callback_data": f"print_pdf:{ttn}"},
                    {"text": "🔄 Оновити статус", "callback_data": f"refresh_ttn:{order_id}"}
                ],
                [
                    {"text": "📨 SMS клієнту", "callback_data": f"send_sms:{order_id}"}
                ]
            ]
        }

    async def alert_new_order(self, order: dict):
        """Alert: New order created"""
        order_id = order.get("id", "")
        amount = order.get("totals", {}).get("grand", 0)
        shipping = order.get("shipping", {})
        name = shipping.get("full_name", "-")
        phone = shipping.get("phone", "-")
        
        # Check big order threshold
        settings = await self.settings_repo.get()
        threshold = settings.get("thresholds", {}).get("big_order_uah", 10000)
        
        is_big = float(amount) >= threshold
        prefix = "🔥 <b>ВЕЛИКЕ ЗАМОВЛЕННЯ!</b>\n\n" if is_big else ""
        
        text = (
            f"{prefix}"
            f"🧾 <b>Нове замовлення</b>\n\n"
            f"ID: <code>{order_id}</code>\n"
            f"💰 Сума: <b>{float(amount):.2f} грн</b>\n"
            f"👤 Клієнт: {name}\n"
            f"☎️ Телефон: <code>{phone}</code>"
        )
        
        alert_type = "ВЕЛИКЕ_ЗАМОВЛЕННЯ" if is_big else "НОВЕ_ЗАМОВЛЕННЯ"
        dedupe = f"order:new:{order_id}"
        
        await self.alerts_repo.enqueue(
            alert_type=alert_type,
            text=text,
            dedupe_key=dedupe,
            payload={"order_id": order_id},
            reply_markup=self._order_keyboard(order_id)
        )

    async def alert_order_paid(self, order: dict):
        """Alert: Order paid"""
        order_id = order.get("id", "")
        amount = order.get("totals", {}).get("grand", 0)
        
        text = (
            f"✅ <b>Оплата отримана</b>\n\n"
            f"Замовлення: <code>{order_id}</code>\n"
            f"💰 Сума: <b>{float(amount):.2f} грн</b>\n\n"
            f"Можна створювати ТТН"
        )
        
        dedupe = f"order:paid:{order_id}"
        
        await self.alerts_repo.enqueue(
            alert_type="ОПЛАТА_ПРОЙШЛА",
            text=text,
            dedupe_key=dedupe,
            payload={"order_id": order_id},
            reply_markup=self._order_keyboard(order_id)
        )

    async def alert_ttn_created(self, order_id: str, ttn: str, shipping: dict = None):
        """Alert: TTN created"""
        shipping = shipping or {}
        city = shipping.get("city", "-")
        phone = shipping.get("phone", "-")
        
        text = (
            f"📦 <b>ТТН створено</b>\n\n"
            f"Замовлення: <code>{order_id}</code>\n"
            f"ТТН: <code>{ttn}</code>\n"
            f"📍 Місто: {city}\n"
            f"☎️ Клієнт: <code>{phone}</code>"
        )
        
        dedupe = f"ttn:created:{order_id}:{ttn}"
        
        await self.alerts_repo.enqueue(
            alert_type="ТТН_СТВОРЕНО",
            text=text,
            dedupe_key=dedupe,
            payload={"order_id": order_id, "ttn": ttn},
            reply_markup=self._ttn_keyboard(order_id, ttn)
        )

    async def alert_delivery_delay(self, order_id: str, ttn: str, hours: float):
        """Alert: Delivery delayed"""
        text = (
            f"⏳ <b>Затримка доставки</b>\n\n"
            f"Замовлення: <code>{order_id}</code>\n"
            f"ТТН: <code>{ttn}</code>\n"
            f"⏱ Тривалість: {hours:.1f} год\n\n"
            f"Рекомендація: перевірити статус/зв'язатися з клієнтом"
        )
        
        dedupe = f"delay:{order_id}:{int(hours / 24)}"  # one per day
        
        await self.alerts_repo.enqueue(
            alert_type="ЗАТРИМКА_ДОСТАВКИ",
            text=text,
            dedupe_key=dedupe,
            payload={"order_id": order_id, "ttn": ttn, "hours": hours},
            reply_markup={
                "inline_keyboard": [
                    [
                        {"text": "🔄 Оновити статус", "callback_data": f"refresh_ttn:{order_id}"},
                        {"text": "📨 SMS клієнту", "callback_data": f"send_sms:{order_id}"}
                    ]
                ]
            }
        )

    async def alert_notification_failure(self, channel: str, failed_count: int):
        """Alert: Notification failures"""
        text = (
            f"🚨 <b>Збої сповіщень</b>\n\n"
            f"Канал: <b>{channel}</b>\n"
            f"FAILED за годину: {failed_count}\n\n"
            f"Дія: перевірити креденшіали/ліміти провайдера"
        )
        
        from datetime import datetime, timezone
        hour = datetime.now(timezone.utc).strftime("%Y-%m-%d:%H")
        dedupe = f"notif:fail:{channel}:{hour}"
        
        await self.alerts_repo.enqueue(
            alert_type="ПОМИЛКА_СПОВІЩЕННЯ",
            text=text,
            dedupe_key=dedupe,
            payload={"channel": channel, "count": failed_count}
        )
