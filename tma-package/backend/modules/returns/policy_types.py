"""
O20.5: Return Policy Engine - Types
Rule-based policy decisions for COD blocking, prepaid requirements
"""
from typing import Literal, Optional, Dict, Any
from pydantic import BaseModel

PolicyAction = Literal[
    "BLOCK_COD_CUSTOMER",
    "UNBLOCK_COD_CUSTOMER",
    "REQUIRE_PREPAID_CUSTOMER",
    "REQUIRE_PREPAID_CITY",
    "NOOP",
]


class PolicyDecision(BaseModel):
    """Policy decision to be applied or queued for approval"""
    action: PolicyAction
    target_type: Literal["CUSTOMER", "CITY"]
    target_id: str  # phone or city name
    reason: str
    meta: Dict[str, Any] = {}
    severity: Literal["LOW", "MEDIUM", "HIGH"] = "MEDIUM"
    requires_approval: bool = True
    dedupe_key: str


class PolicyRunResult(BaseModel):
    """Result of policy engine run"""
    ok: bool
    scanned_customers: int = 0
    scanned_cities: int = 0
    proposed: int = 0
    applied: int = 0
    approvals_enqueued: int = 0


class CustomerPolicy(BaseModel):
    """Customer policy flags"""
    cod_blocked: bool = False
    require_prepaid: bool = False
    block_reason: Optional[str] = None
    prepaid_reason: Optional[str] = None
    updated_at: Optional[str] = None
    updated_by: Optional[str] = None


class CityPolicy(BaseModel):
    """City-level policy"""
    city: str
    require_prepaid: bool = False
    reason: Optional[str] = None
    return_rate: float = 0.0
    orders_30d: int = 0
    returns_30d: int = 0
    updated_at: Optional[str] = None
