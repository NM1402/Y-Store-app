"""
Payment Events Repository - Idempotent event storage for webhooks
"""
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import hashlib

from core.db import db


def utcnow():
    return datetime.now(timezone.utc)


class PaymentEventsRepository:
    """Repository for payment events (webhook idempotency)"""
    
    def __init__(self):
        self.col = db["payment_events"]
    
    async def ensure_indexes(self):
        """Create required indexes"""
        # Unique constraint for idempotency
        await self.col.create_index(
            [("provider", 1), ("provider_event_id", 1)], 
            unique=True
        )
        await self.col.create_index("order_id")
        await self.col.create_index("created_at")
        await self.col.create_index("signature_hash", unique=True, sparse=True)
    
    async def insert_event_idempotent(
        self, 
        doc: Dict[str, Any],
        signature: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Insert event once. If duplicate key → return existing (idempotent).
        """
        doc = {
            **doc, 
            "created_at": doc.get("created_at") or utcnow().isoformat()
        }
        
        # Add signature hash for replay protection
        if signature:
            doc["signature_hash"] = hashlib.sha256(signature.encode()).hexdigest()
        
        try:
            await self.col.insert_one(doc)
            return {"inserted": True, "event": doc}
        except Exception:
            # Duplicate - return existing
            existing = await self.col.find_one(
                {
                    "provider": doc["provider"], 
                    "provider_event_id": doc["provider_event_id"]
                },
                {"_id": 0}
            )
            return {"inserted": False, "event": existing}
    
    async def update_event_status(
        self,
        provider: str,
        provider_event_id: str,
        status: str,
        extra: Optional[Dict[str, Any]] = None
    ):
        """Update event status"""
        update_data = {
            "status": status,
            "updated_at": utcnow().isoformat()
        }
        if extra:
            update_data.update(extra)
        
        await self.col.update_one(
            {"provider": provider, "provider_event_id": provider_event_id},
            {"$set": update_data}
        )
    
    async def get_event(
        self, 
        provider: str, 
        provider_event_id: str
    ) -> Optional[dict]:
        """Get event by provider and event ID"""
        return await self.col.find_one(
            {"provider": provider, "provider_event_id": provider_event_id},
            {"_id": 0}
        )


# Singleton instance
payment_events_repository = PaymentEventsRepository()
