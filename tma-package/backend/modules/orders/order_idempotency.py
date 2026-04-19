"""
Order Idempotency - Utilities for idempotent operations
"""
import hashlib
import json
from datetime import datetime, timedelta, timezone


def utcnow():
    """Get current UTC time"""
    return datetime.now(timezone.utc)


def make_idempotency_hash(key: str) -> str:
    """Create hash from idempotency key"""
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def stable_payload_hash(payload: dict) -> str:
    """Create stable hash from payload (order-independent)"""
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def ttl_expires(hours: int = 24) -> datetime:
    """Get expiration time for TTL"""
    return utcnow() + timedelta(hours=hours)
