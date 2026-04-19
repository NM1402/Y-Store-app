"""
D-Mode: Smart Payment Policy Decider
Determines payment mode: FULL_PREPAID | SHIP_DEPOSIT | COD_ALLOWED
"""
from datetime import datetime, timezone, timedelta
import os

FULL_PREPAID = "FULL_PREPAID"
SHIP_DEPOSIT = "SHIP_DEPOSIT"
COD_ALLOWED = "COD_ALLOWED"


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def since_iso(days: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()


def clamp(x, a, b):
    return max(a, min(b, x))


class PaymentPolicyDecider:
    """
    D-mode Payment Policy:
    - FULL_PREPAID: only online payment (Fondy/Apple Pay/Google Pay)
    - SHIP_DEPOSIT: COD allowed after prepaying shipping deposit
    - COD_ALLOWED: standard COD without restrictions
    """

    def __init__(self, db):
        self.db = db
        self.orders = db["orders"]
        self.customers = db["customers"]
        self.city_policies = db["city_policies"]

    async def decide(self, phone: str, city: str = None, amount: float = 0, is_new_customer: bool = False):
        """
        Evaluate risk and return payment policy decision.
        
        Returns:
            dict with mode, severity, reasons, deposit info, signals
        """
        reasons = []
        severity = "LOW"
        mode = COD_ALLOWED
        deposit_amount = 0.0

        # --- Load customer data ---
        cust = await self.customers.find_one({"phone": phone}, {"_id": 0}) or {}
        segment = cust.get("segment") or "NORMAL"
        cpol = cust.get("policy") or {}

        # Hard block from customer policy
        if cpol.get("cod_blocked"):
            mode = FULL_PREPAID
            reasons.append("CUSTOMER_POLICY_BLOCK_COD")
            severity = "HIGH"

        # --- Window metrics from orders (30/60 days) ---
        since_30 = since_iso(30)
        since_60 = since_iso(60)

        # Returns in 60 days
        returns_60 = await self.orders.count_documents({
            "$or": [
                {"delivery.recipient.phone": phone},
                {"shipping.phone": phone},
                {"buyer_phone": phone}
            ],
            "returns.updated_at": {"$gte": since_60},
            "returns.stage": {"$in": ["RETURNING", "RETURNED"]}
        })

        # COD refusals in 30 days
        cod_ref_30 = await self.orders.count_documents({
            "$or": [
                {"delivery.recipient.phone": phone},
                {"shipping.phone": phone},
                {"buyer_phone": phone}
            ],
            "returns.updated_at": {"$gte": since_30},
            "returns.reason": {"$in": ["REFUSED", "NOT_PICKED_UP", "STORAGE_EXPIRED"]}
        })

        # --- City policy ---
        city_policy = None
        if city:
            city_policy = await self.city_policies.find_one({"city": city}, {"_id": 0})

        # --- HARD rules => FULL_PREPAID ---
        if mode != FULL_PREPAID:
            if segment == "BLOCK_COD":
                mode = FULL_PREPAID
                reasons.append("SEGMENT_BLOCK_COD")
                severity = "HIGH"
            elif cod_ref_30 >= 2:
                mode = FULL_PREPAID
                reasons.append("COD_REFUSALS_30D>=2")
                severity = "HIGH"
            elif returns_60 >= 3:
                mode = FULL_PREPAID
                reasons.append("RETURNS_60D>=3")
                severity = "HIGH"
            elif city_policy and city_policy.get("require_prepaid") is True:
                mode = FULL_PREPAID
                reasons.append("CITY_REQUIRE_PREPAID")
                severity = "MEDIUM"

        # --- MEDIUM rules => SHIP_DEPOSIT (if not already FULL_PREPAID) ---
        if mode == COD_ALLOWED:
            if returns_60 >= 2:
                mode = SHIP_DEPOSIT
                reasons.append("RETURNS_60D>=2")
                severity = "MEDIUM"

            # New customer + big order => deposit
            big_order_threshold = float(os.getenv("BIG_ORDER_THRESHOLD", "8000"))
            if is_new_customer and amount >= big_order_threshold:
                mode = SHIP_DEPOSIT
                reasons.append("NEW_CUSTOMER_BIG_AMOUNT")
                severity = "MEDIUM"

            # City deposit policy
            if city_policy and city_policy.get("deposit_amount"):
                mode = SHIP_DEPOSIT
                reasons.append("CITY_DEPOSIT_POLICY")
                severity = "MEDIUM"
                deposit_amount = float(city_policy.get("deposit_amount") or 0)

        # --- VIP softening (don't kill sales) ---
        if segment == "VIP":
            if mode == FULL_PREPAID:
                mode = SHIP_DEPOSIT
                reasons.append("VIP_SOFTEN_FULL_PREPAID->DEPOSIT")
                severity = "MEDIUM"
            elif mode == SHIP_DEPOSIT and returns_60 == 0 and cod_ref_30 == 0:
                mode = COD_ALLOWED
                reasons.append("VIP_SOFTEN_DEPOSIT->COD")
                severity = "LOW"

        # --- Calculate deposit amount ---
        if mode == SHIP_DEPOSIT and deposit_amount <= 0:
            # Base 120 UAH, or dynamic: 2% (min 80, max 200)
            base_deposit = float(os.getenv("BASE_DEPOSIT_AMOUNT", "120"))
            dynamic = clamp(amount * 0.02, 80, 200)
            deposit_amount = round(max(base_deposit, dynamic), 0)

        return {
            "mode": mode,
            "severity": severity,
            "reasons": reasons,
            "deposit": {
                "amount": float(deposit_amount) if mode == SHIP_DEPOSIT else 0.0,
                "currency": "UAH",
            },
            "signals": {
                "segment": segment,
                "returns_60d": int(returns_60),
                "cod_refusals_30d": int(cod_ref_30),
                "city_policy": city_policy,
                "is_new_customer": is_new_customer,
                "amount": amount,
            }
        }
