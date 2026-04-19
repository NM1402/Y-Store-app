# O5: Finance Repository
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
import uuid

def utcnow():
    return datetime.now(timezone.utc).isoformat()

class FinanceRepo:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.ledger = db["finance_ledger"]

    async def ensure_indexes(self):
        await self.ledger.create_index("order_id")
        await self.ledger.create_index("created_at")
        await self.ledger.create_index("type")

    async def record(self, order_id: str, type_: str, amount: float, direction: str, meta: dict = None):
        doc = {
            "id": str(uuid.uuid4()),
            "order_id": order_id,
            "type": type_,
            "amount": float(amount),
            "direction": direction,
            "meta": meta or {},
            "created_at": utcnow(),
        }
        await self.ledger.insert_one(doc)
        return doc
