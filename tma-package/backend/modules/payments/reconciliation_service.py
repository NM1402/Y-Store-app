"""
D-Mode Step 6: Payment Reconciliation Service
Fixes orders stuck in AWAITING_PAYMENT when payment was actually completed
"""
from datetime import datetime, timezone, timedelta
import logging

logger = logging.getLogger(__name__)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


class PaymentReconciliationService:
    """
    Reconciliation engine: polls payment provider to fix stuck orders.
    Runs every 10 minutes to catch missed webhooks.
    """

    def __init__(self, db, provider=None):
        self.db = db
        self.provider = provider
        self.orders = db["orders"]
        self.payments = db["payments"]
        self.recon_logs = db["reconciliation_logs"]

    async def run_once(self, hours_back: int = 48, limit: int = 200):
        """
        Scan pending payments and reconcile with provider status.
        """
        since = (datetime.now(timezone.utc) - timedelta(hours=hours_back)).isoformat()

        # Find unconfirmed payments
        candidates = self.payments.find(
            {
                "status": {"$in": ["CREATED", "PENDING"]},
                "created_at": {"$gte": since}
            },
            {"_id": 0}
        ).limit(limit)

        scanned = 0
        fixed = 0
        errors = 0

        async for p in candidates:
            scanned += 1
            payment_id = p.get("id")
            order_id = p.get("order_id")
            purpose = p.get("purpose", "ORDER_PAYMENT")

            try:
                # Get status from provider
                if self.provider:
                    status = await self.provider.get_payment_status(payment_id)
                else:
                    # Mock: check if we have a manual confirmation
                    manual = await self.db["payment_confirmations"].find_one({"payment_id": payment_id})
                    status = "PAID" if manual else "PENDING"

                if status == "PAID":
                    # Update payment
                    await self.payments.update_one(
                        {"id": payment_id},
                        {"$set": {"status": "PAID", "paid_at": now_iso(), "reconciled": True}}
                    )

                    # Update order based on purpose
                    if purpose == "SHIP_DEPOSIT":
                        await self.orders.update_one(
                            {"id": order_id},
                            {"$set": {
                                "deposit.paid": True,
                                "deposit.paid_at": now_iso(),
                                "status": "NEW",  # Deposit paid, COD now allowed
                                "reconciled_at": now_iso()
                            }}
                        )
                    else:
                        await self.orders.update_one(
                            {"id": order_id, "status": "AWAITING_PAYMENT"},
                            {"$set": {"status": "PAID", "reconciled_at": now_iso()}}
                        )

                    fixed += 1
                    logger.info(f"Reconciled payment {payment_id} -> PAID")

                elif status in ["FAILED", "DECLINED", "CANCELLED", "EXPIRED"]:
                    await self.payments.update_one(
                        {"id": payment_id},
                        {"$set": {"status": status, "updated_at": now_iso()}}
                    )

            except Exception as e:
                errors += 1
                await self.recon_logs.insert_one({
                    "payment_id": payment_id,
                    "order_id": order_id,
                    "error": str(e),
                    "created_at": now_iso()
                })
                logger.error(f"Reconciliation error for {payment_id}: {e}")

        return {
            "ok": True,
            "scanned": scanned,
            "fixed": fixed,
            "errors": errors
        }
