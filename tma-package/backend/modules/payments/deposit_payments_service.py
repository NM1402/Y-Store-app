"""
D-Mode: Deposit Payments Service
Creates and manages shipping deposit payments (Fondy)
"""
from datetime import datetime, timezone
import uuid
import os


def now_iso():
    return datetime.now(timezone.utc).isoformat()


class DepositPaymentsService:
    """
    Service for creating deposit payments.
    Deposit = small prepayment for shipping to enable COD.
    """

    def __init__(self, db, payment_provider=None):
        self.db = db
        self.orders = db["orders"]
        self.payments = db["payments"]
        self.payment_provider = payment_provider

    async def create_deposit_payment(self, order_id: str, amount: float, currency: str = "UAH"):
        """
        Create deposit payment for an order.
        Idempotent: returns existing payment if already created.
        """
        order = await self.orders.find_one({"id": order_id}, {"_id": 0})
        if not order:
            raise Exception("ORDER_NOT_FOUND")

        # Idempotency: 1 deposit per order
        existing = await self.payments.find_one(
            {"order_id": order_id, "purpose": "SHIP_DEPOSIT", "status": {"$in": ["CREATED", "PENDING"]}},
            {"_id": 0}
        )
        if existing and existing.get("payment_url"):
            return {
                "ok": True,
                "payment_url": existing["payment_url"],
                "payment_id": existing["id"],
                "already": True
            }

        payment_id = str(uuid.uuid4())

        # Create payment via provider
        if self.payment_provider:
            res = await self.payment_provider.create_payment({
                "payment_id": payment_id,
                "order_id": order_id,
                "amount": float(amount),
                "currency": currency,
                "purpose": "SHIP_DEPOSIT",
                "description": f"Deposit for shipping (Order {order_id[:8]})",
            })
            payment_url = res.get("payment_url")
        else:
            # Mock URL for development
            base_url = os.getenv("PUBLIC_BASE_URL", "http://localhost:3000")
            payment_url = f"{base_url}/payment/mock/{payment_id}"

        # Save payment record
        pay_doc = {
            "id": payment_id,
            "order_id": order_id,
            "purpose": "SHIP_DEPOSIT",
            "provider": "FONDY",
            "amount": float(amount),
            "currency": currency,
            "status": "CREATED",
            "payment_url": payment_url,
            "created_at": now_iso(),
        }
        await self.payments.insert_one(pay_doc)

        # Mark order as awaiting deposit payment
        await self.orders.update_one(
            {"id": order_id},
            {"$set": {
                "status": "AWAITING_PAYMENT",
                "deposit.required": True,
                "deposit.amount": float(amount),
                "deposit.paid": False,
                "deposit.payment_id": payment_id
            }}
        )

        return {
            "ok": True,
            "payment_url": payment_url,
            "payment_id": payment_id,
            "already": False
        }

    async def create_full_payment(self, order_id: str, amount: float, currency: str = "UAH"):
        """
        Create full order payment (for FULL_PREPAID mode).
        """
        order = await self.orders.find_one({"id": order_id}, {"_id": 0})
        if not order:
            raise Exception("ORDER_NOT_FOUND")

        # Idempotency
        existing = await self.payments.find_one(
            {"order_id": order_id, "purpose": "ORDER_PAYMENT", "status": {"$in": ["CREATED", "PENDING"]}},
            {"_id": 0}
        )
        if existing and existing.get("payment_url"):
            return {
                "ok": True,
                "payment_url": existing["payment_url"],
                "payment_id": existing["id"],
                "already": True
            }

        payment_id = str(uuid.uuid4())

        # Create payment via provider
        if self.payment_provider:
            res = await self.payment_provider.create_payment({
                "payment_id": payment_id,
                "order_id": order_id,
                "amount": float(amount),
                "currency": currency,
                "purpose": "ORDER_PAYMENT",
                "description": f"Payment for order {order_id[:8]}",
            })
            payment_url = res.get("payment_url")
        else:
            base_url = os.getenv("PUBLIC_BASE_URL", "http://localhost:3000")
            payment_url = f"{base_url}/payment/mock/{payment_id}"

        pay_doc = {
            "id": payment_id,
            "order_id": order_id,
            "purpose": "ORDER_PAYMENT",
            "provider": "FONDY",
            "amount": float(amount),
            "currency": currency,
            "status": "CREATED",
            "payment_url": payment_url,
            "created_at": now_iso(),
        }
        await self.payments.insert_one(pay_doc)

        await self.orders.update_one(
            {"id": order_id},
            {"$set": {"status": "AWAITING_PAYMENT", "payment_id": payment_id}}
        )

        return {
            "ok": True,
            "payment_url": payment_url,
            "payment_id": payment_id,
            "already": False
        }
