"""
Prepaid Discount Calculator
Applies discount for FULL_PREPAID payments to incentivize online payment
Supports A/B testing override for discount percentage
"""
import os
from typing import Optional


def _env_bool(name: str, default: str = "false") -> bool:
    return os.getenv(name, default).lower() in ("1", "true", "yes", "on")


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except (ValueError, TypeError):
        return default


def calc_prepaid_discount(
    grand_uah: float, 
    policy_mode: str,
    discount_pct_override: Optional[float] = None
) -> Optional[dict]:
    """
    Calculate prepaid discount based on payment policy mode.
    
    Args:
        grand_uah: Total order amount in UAH
        policy_mode: Payment policy mode (FULL_PREPAID, SHIP_DEPOSIT, etc.)
        discount_pct_override: Override discount percentage from A/B test (0.0-100.0)
    
    Returns:
        dict with discount info or None if not applicable
    """
    if not _env_bool("PREPAID_DISCOUNT_ENABLED", "true"):
        return None

    apply_to = os.getenv("PREPAID_DISCOUNT_APPLY_TO", "FULL_PREPAID")
    
    # Check if discount applies to this mode
    allowed = (
        policy_mode == "FULL_PREPAID"
        or (apply_to == "FULL_PREPAID_AND_DEPOSIT" and policy_mode == "SHIP_DEPOSIT")
    )
    if not allowed:
        return None

    grand = float(grand_uah)
    if grand <= 0:
        return None

    mode = os.getenv("PREPAID_DISCOUNT_MODE", "PERCENT").upper()
    
    # Use A/B test override if provided, otherwise use env value
    if discount_pct_override is not None:
        val = float(discount_pct_override)
        # If A/B variant has 0% discount, return None (control group)
        if val <= 0:
            return None
    else:
        val = _env_float("PREPAID_DISCOUNT_VALUE", 1.0)  # 1% default
    
    cap = _env_float("PREPAID_DISCOUNT_MAX_UAH", 300.0)
    min_order = _env_float("PREPAID_DISCOUNT_MIN_ORDER", 500.0)

    # Don't apply discount for small orders
    if grand < min_order:
        return None

    if mode == "FIXED":
        amount = val
    else:
        amount = grand * (val / 100.0)

    amount = max(0.0, min(round(amount, 2), cap))
    if amount <= 0:
        return None

    return {
        "type": mode,
        "value": val,
        "amount": amount,
        "reason": "PREPAID_PROMO",
        "description": f"Знижка {val}% за онлайн оплату" if mode == "PERCENT" else f"Знижка {val} грн за онлайн оплату",
        "ab_override": discount_pct_override is not None
    }


def apply_discount_to_totals(
    totals: dict, 
    policy_mode: str,
    discount_pct_override: Optional[float] = None
) -> tuple[dict, Optional[dict]]:
    """
    Apply prepaid discount to order totals.
    
    Args:
        totals: dict with subtotal, shipping, grand
        policy_mode: payment policy mode
        discount_pct_override: A/B test discount percentage override
        
    Returns:
        tuple of (updated_totals, discount_obj_or_none)
    """
    grand = float(totals.get("grand") or totals.get("total") or 0)
    disc = calc_prepaid_discount(grand, policy_mode, discount_pct_override)
    
    if not disc:
        return totals, None

    totals = dict(totals)
    totals["grand_before_discount"] = round(grand, 2)
    totals["grand"] = round(max(0.0, grand - float(disc["amount"])), 2)
    
    return totals, disc


# Environment defaults (add to .env):
# PREPAID_DISCOUNT_ENABLED=true
# PREPAID_DISCOUNT_MODE=PERCENT
# PREPAID_DISCOUNT_VALUE=1
# PREPAID_DISCOUNT_APPLY_TO=FULL_PREPAID
# PREPAID_DISCOUNT_MAX_UAH=300
# PREPAID_DISCOUNT_MIN_ORDER=500
