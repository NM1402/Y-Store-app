"""
D-Mode Step 2: Payment Retry Service
Auto-reminders for unpaid orders: 15min, 60min, 24h auto-cancel
"""
from datetime import datetime, timezone, timedelta
import os


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def minutes_since(iso_ts: str) -> int:
    try:
        dt = datetime.fromisoformat(iso_ts.replace("Z", "+00:00"))
    except Exception:
        dt = datetime.now(timezone.utc)
    return int((datetime.now(timezone.utc) - dt).total_seconds() // 60)


class PaymentRetryRepo:
    def __init__(self, db):
        self.db = db
        self.orders = db["orders"]
        self.outbox = db["notifications_outbox"]
        self.retry_events = db["retry_events"]

    async def ensure_indexes(self):
        try:
            await self.retry_events.create_index("dedupe_key", unique=True)
        except Exception:
            pass
        try:
            await self.outbox.create_index("dedupe_key", unique=True)
        except Exception:
            pass

    async def mark_once(self, dedupe_key: str, payload: dict) -> bool:
        try:
            await self.retry_events.insert_one({
                "dedupe_key": dedupe_key,
                "payload": payload,
                "created_at": now_iso()
            })
            return True
        except Exception:
            return False

    async def find_awaiting_payment(self, since_iso: str, limit: int = 500):
        q = {
            "status": "AWAITING_PAYMENT",
            "created_at": {"$gte": since_iso},
        }
        cur = self.orders.find(q, {"_id": 0}).sort("created_at", 1).limit(limit)
        return [x async for x in cur]

    async def enqueue_outbox(self, channel: str, to: str, text: str, dedupe_key: str, meta: dict):
        doc = {
            "status": "PENDING",
            "channel": channel,
            "to": to,
            "text": text,
            "meta": meta,
            "dedupe_key": dedupe_key,
            "created_at": now_iso(),
            "attempts": 0,
        }
        try:
            await self.outbox.insert_one(doc)
            return True
        except Exception:
            return False

    async def cancel_order(self, order_id: str, reason: str):
        await self.orders.update_one(
            {"id": order_id, "status": "AWAITING_PAYMENT"},
            {"$set": {"status": "CANCELLED_AUTO", "cancel_reason": reason, "cancelled_at": now_iso()}}
        )


class PaymentRetryService:
    """
    Automated payment reminder flow:
    - 15 min: first reminder
    - 60 min: second reminder
    - 24 hours: auto-cancel
    """

    def __init__(self, db):
        self.db = db
        self.repo = PaymentRetryRepo(db)

    async def run_once(self, limit: int = 500):
        await self.repo.ensure_indexes()

        # Scan orders from last 3 days
        since = (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()
        orders = await self.repo.find_awaiting_payment(since, limit=limit)

        enqueued = 0
        cancelled = 0

        for o in orders:
            order_id = o.get("id")
            created_at = o.get("created_at")
            if not (order_id and created_at):
                continue

            mins = minutes_since(created_at)

            # Get payment URL
            pay = await self.db["payments"].find_one(
                {"order_id": order_id, "status": {"$in": ["CREATED", "PENDING"]}},
                {"_id": 0, "payment_url": 1, "purpose": 1}
            )
            pay_url = (pay or {}).get("payment_url")

            # Get recipient info
            rec = ((o.get("delivery") or {}).get("recipient") or {})
            shipping = o.get("shipping") or {}
            phone = rec.get("phone") or shipping.get("phone") or ""
            email = rec.get("email") or shipping.get("email") or ""
            tg = rec.get("telegram_chat_id")

            # Skip if no payment URL
            if not pay_url:
                continue

            # Stage: 15 minutes
            if 15 <= mins < 60:
                did = await self._enqueue_reminder(o, "REMIND_15M", tg, phone, email, pay_url)
                enqueued += (1 if did else 0)

            # Stage: 60 minutes
            if 60 <= mins < 24 * 60:
                did = await self._enqueue_reminder(o, "REMIND_60M", tg, phone, email, pay_url)
                enqueued += (1 if did else 0)

            # Stage: 24 hours - auto cancel
            if mins >= 24 * 60:
                dedupe_key = f"payretry:{order_id}:CANCEL_24H"
                if await self.repo.mark_once(dedupe_key, {"order_id": order_id, "mins": mins}):
                    await self.repo.cancel_order(order_id, reason="PAYMENT_TIMEOUT_24H")
                    cancelled += 1

        return {"ok": True, "scanned": len(orders), "enqueued": enqueued, "cancelled": cancelled}

    async def _enqueue_reminder(self, o: dict, stage: str, tg, phone: str, email: str, pay_url: str) -> bool:
        order_id = o["id"]
        dedupe_key = f"payretry:{order_id}:{stage}"

        if not await self.repo.mark_once(dedupe_key, {"order_id": order_id, "stage": stage}):
            return False

        amount = float((o.get("totals") or {}).get("grand") or 0)
        mode = ((o.get("payment_policy") or {}).get("mode") or "")
        deposit = ((o.get("payment_policy") or {}).get("deposit") or {}).get("amount", 0)

        # Build resume URL (better UX than direct payment URL)
        base_url = os.getenv("PUBLIC_BASE_URL", "http://localhost:3000")
        resume_url = f"{base_url}/payment/resume/{order_id}?auto=1"

        # Ukrainian texts (no blame, no pressure)
        if mode == "SHIP_DEPOSIT":
            title = "Нагадування: підтвердіть доставку"
            body = f"Ваше замовлення {order_id[:8]} очікує оплату доставки ({int(deposit)} грн), після чого буде доступна оплата при отриманні."
        else:
            title = "Нагадування: замовлення очікує оплату"
            body = f"Ваше замовлення {order_id[:8]} очікує онлайн-оплату на суму {int(amount)} грн."

        text = f"{title}\n{body}\n\nОплатити: {resume_url}\n\nЯкщо ви вже оплатили — ігноруйте це повідомлення."

        meta = {
            "order_id": order_id,
            "stage": stage,
            "pay_url": pay_url,
            "resume_url": resume_url,
            "mode": mode,
        }

        # Priority: Telegram -> SMS -> Email
        if tg:
            return await self.repo.enqueue_outbox("TELEGRAM", str(tg), text, f"outbox:{dedupe_key}:tg", meta)

        if phone:
            short = f"Y-Store: замовлення {order_id[:8]} очікує оплату. Оплатити: {resume_url}"
            return await self.repo.enqueue_outbox("SMS", phone, short, f"outbox:{dedupe_key}:sms", meta)

        if email:
            return await self.repo.enqueue_outbox("EMAIL", email, text, f"outbox:{dedupe_key}:email", meta)

        return False
