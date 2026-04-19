"""
O11: Smart Automation Engine
Auto-VIP, Auto-RISK, Delay Alerts, Notification Health
"""
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone, timedelta
import logging

from modules.bot.bot_settings_repo import BotSettingsRepo
from modules.bot.bot_alerts_repo import BotAlertsRepo
from .automation_repo import AutomationEventsRepo

logger = logging.getLogger(__name__)


def utcnow_dt():
    return datetime.now(timezone.utc)


def hours_between(iso_a: str, iso_b: str) -> float:
    """Calculate hours between two ISO datetime strings"""
    try:
        a = datetime.fromisoformat(iso_a.replace("Z", "+00:00"))
        b = datetime.fromisoformat(iso_b.replace("Z", "+00:00"))
        return (b - a).total_seconds() / 3600.0
    except (ValueError, AttributeError):
        return 0


class AutomationEngine:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.settings = BotSettingsRepo(db)
        self.alerts = BotAlertsRepo(db)
        self.repo = AutomationEventsRepo(db)
        self.customers = db["customers"]
        self.orders = db["orders"]
        self.notifs = db["notification_queue"]

    async def init(self):
        await self.repo.ensure_indexes()
        await self.alerts.ensure_indexes()

    async def run_once(self) -> dict:
        """Run all automation rules once"""
        st = await self.settings.get()
        auto = st.get("automation") or {}
        
        if not auto.get("enabled", True):
            return {"ok": True, "skipped": True, "reason": "automation_disabled"}

        await self.init()
        
        results = {
            "vip_upgrades": 0,
            "risk_marks": 0,
            "delay_alerts": 0,
            "notif_alerts": 0,
            "auto_blocks": 0
        }

        # 1) VIP upgrades — ВИМКНЕНО за запитом (VIP-логіка не використовується в продукті)
        # vip_cfg = auto.get("vip") or {}
        # if vip_cfg.get("enabled", True):
        #     results["vip_upgrades"] = await self._vip_upgrade(vip_cfg)

        # 2) RISK marks
        risk_cfg = auto.get("risk") or {}
        if risk_cfg.get("enabled", True):
            results["risk_marks"] = await self._risk_mark(risk_cfg)

        # 3) Delivery delay alerts
        delay_cfg = auto.get("delay") or {}
        if delay_cfg.get("enabled", True):
            results["delay_alerts"] = await self._delay_alert(delay_cfg)

        # 4) Notification fail alerts
        if risk_cfg.get("enabled", True):
            results["notif_alerts"] = await self._notif_fail_alert(risk_cfg)

        # 5) Auto-block (optional)
        block_cfg = auto.get("auto_block") or {}
        if block_cfg.get("enabled", False):
            results["auto_blocks"] = await self._auto_block(block_cfg)

        logger.info(f"🤖 Automation run: {results}")
        return {"ok": True, **results}

    async def _vip_upgrade(self, cfg: dict) -> int:
        """Auto-upgrade customers to VIP based on LTV/delivered count"""
        ltv = float(cfg.get("ltv_uah", 20000))
        delivered_need = int(cfg.get("delivered_count", 10))
        count = 0

        cur = self.customers.find({
            "is_blocked": {"$ne": True},
            "segment": {"$ne": "VIP"},
            "$or": [
                {"total_spent": {"$gte": ltv}},
                {"delivered_count": {"$gte": delivered_need}}
            ]
        }, {"_id": 0})

        async for c in cur:
            phone = c["phone"]
            dedupe = f"VIP_UPGRADE:{phone}:{ltv}:{delivered_need}"
            
            first = await self.repo.once(dedupe, {
                "rule": "VIP_UPGRADE",
                "entity": f"customer:{phone}"
            })
            
            if not first:
                continue

            # Update customer
            tags = list(set((c.get("tags") or []) + ["VIP"]))
            await self.customers.update_one(
                {"phone": phone},
                {"$set": {"tags": tags, "segment": "VIP"}}
            )

            # Send alert
            text = (
                f"⭐ <b>Авто-VIP</b>\n\n"
                f"Клієнт: <code>{phone}</code>\n"
                f"LTV: {float(c.get('total_spent', 0)):.2f} грн\n"
                f"Доставок: {int(c.get('delivered_count', 0))}\n\n"
                f"Дія: сегмент → VIP, тег → VIP"
            )
            await self.alerts.enqueue("VIP_UPGRADE", text, dedupe)
            count += 1

        return count

    async def _risk_mark(self, cfg: dict) -> int:
        """Auto-mark customers as RISK based on returns"""
        returns_need = int(cfg.get("returns_count", 2))
        count = 0

        cur = self.customers.find({
            "returned_count": {"$gte": returns_need},
            "is_blocked": {"$ne": True},
            "segment": {"$ne": "RISK"}
        }, {"_id": 0})

        async for c in cur:
            phone = c["phone"]
            dedupe = f"RISK_MARK:{phone}:{returns_need}"
            
            first = await self.repo.once(dedupe, {
                "rule": "RISK_MARK",
                "entity": f"customer:{phone}"
            })
            
            if not first:
                continue

            tags = list(set((c.get("tags") or []) + ["RISK"]))
            await self.customers.update_one(
                {"phone": phone},
                {"$set": {"tags": tags, "segment": "RISK"}}
            )

            text = (
                f"⚠️ <b>Авто-RISK</b>\n\n"
                f"Клієнт: <code>{phone}</code>\n"
                f"Повернень: {int(c.get('returned_count', 0))}\n\n"
                f"Дія: сегмент → RISK, тег → RISK"
            )
            await self.alerts.enqueue("RISK_MARK", text, dedupe)
            count += 1

        return count

    async def _delay_alert(self, cfg: dict) -> int:
        """Alert on delayed deliveries"""
        hours_thr = float(cfg.get("hours", 48))
        count = 0
        now_iso = utcnow_dt().isoformat()

        cur = self.orders.find({
            "status": "SHIPPED",
            "shipment.provider": "NOVAPOSHTA",
            "shipment.ttn": {"$exists": True},
            "shipment.created_at": {"$exists": True},
        }, {"_id": 0})

        async for o in cur:
            shipped_at = o.get("shipment", {}).get("created_at")
            if not shipped_at:
                continue

            h = hours_between(shipped_at, now_iso)
            if h < hours_thr:
                continue

            order_id = o["id"]
            ttn = o.get("shipment", {}).get("ttn")
            dedupe = f"DELAY_ALERT:{order_id}:{int(hours_thr)}"
            
            first = await self.repo.once(dedupe, {
                "rule": "DELAY_ALERT",
                "entity": f"order:{order_id}"
            })
            
            if not first:
                continue

            text = (
                f"⏳ <b>Затримка доставки</b>\n\n"
                f"Замовлення: <code>{order_id}</code>\n"
                f"ТТН: <code>{ttn}</code>\n"
                f"Тривалість: ~{h:.1f} год (поріг {hours_thr} год)\n\n"
                f"Рекомендація: перевірити статус/зв'язатися з клієнтом"
            )
            
            keyboard = {
                "inline_keyboard": [
                    [
                        {"text": "🔄 Оновити статус", "callback_data": f"refresh_ttn:{order_id}"},
                        {"text": "📨 SMS клієнту", "callback_data": f"send_sms:{order_id}"}
                    ]
                ]
            }
            
            await self.alerts.enqueue(
                "ЗАТРИМКА_ДОСТАВКИ", 
                text, 
                dedupe,
                reply_markup=keyboard
            )
            count += 1

        return count

    async def _notif_fail_alert(self, cfg: dict) -> int:
        """Alert on notification failure streaks"""
        streak_thr = int(cfg.get("notif_fail_streak", 5))
        count = 0
        now = utcnow_dt()
        hour_ago = (now - timedelta(hours=1)).isoformat()

        pipeline = [
            {"$match": {"created_at": {"$gte": hour_ago}, "status": "FAILED"}},
            {"$group": {"_id": "$channel", "count": {"$sum": 1}}},
        ]
        
        rows = await self.notifs.aggregate(pipeline).to_list(length=10)

        for r in rows:
            if int(r["count"]) < streak_thr:
                continue
            
            channel = r["_id"]
            dedupe = f"NOTIF_FAIL_ALERT:{channel}:{hour_ago[:13]}:{streak_thr}"
            
            first = await self.repo.once(dedupe, {
                "rule": "NOTIF_FAIL_ALERT",
                "entity": f"channel:{channel}"
            })
            
            if not first:
                continue

            text = (
                f"🚨 <b>Збої сповіщень</b>\n\n"
                f"Канал: <b>{channel}</b>\n"
                f"FAILED за годину: {int(r['count'])}\n"
                f"Поріг: {streak_thr}\n\n"
                f"Дія: перевірити креденшіали/ліміти провайдера"
            )
            await self.alerts.enqueue("NOTIF_FAIL_ALERT", text, dedupe)
            count += 1

        return count

    async def _auto_block(self, cfg: dict) -> int:
        """Auto-block customers with too many returns"""
        returns_thr = int(cfg.get("returns_count", 3))
        count = 0

        cur = self.customers.find({
            "returned_count": {"$gte": returns_thr},
            "is_blocked": {"$ne": True},
        }, {"_id": 0})

        async for c in cur:
            phone = c["phone"]
            dedupe = f"AUTO_BLOCK:{phone}:{returns_thr}"
            
            first = await self.repo.once(dedupe, {
                "rule": "AUTO_BLOCK",
                "entity": f"customer:{phone}"
            })
            
            if not first:
                continue

            await self.customers.update_one(
                {"phone": phone},
                {"$set": {"is_blocked": True}}
            )
            
            text = (
                f"🛑 <b>Авто-блокування клієнта</b>\n\n"
                f"Клієнт: <code>{phone}</code>\n"
                f"Повернень: {int(c.get('returned_count', 0))} (поріг {returns_thr})\n\n"
                f"Дія: is_blocked = True"
            )
            await self.alerts.enqueue("AUTO_BLOCK", text, dedupe)
            count += 1

        return count
