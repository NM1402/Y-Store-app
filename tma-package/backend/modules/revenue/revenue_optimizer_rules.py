"""
Revenue Optimizer Rules - Decision logic for ROE
"""
from typing import Optional, Tuple, Dict, Any


def propose_changes(
    snap: dict, 
    current_cfg: dict, 
    settings: dict
) -> Optional[Tuple[str, Dict[str, Any], Dict[str, Any]]]:
    """
    Analyze snapshot and propose config changes if rules trigger.
    
    Returns:
        (reason, proposed_changes, expected_impact) or None
    """
    min_samples = int(settings.get("min_samples", 50))
    orders_total = int(snap.get("orders_total", 0))
    
    if orders_total < min_samples:
        return None

    # Current config values
    discount = float(current_cfg.get("prepaid_discount_value", 1.0))
    deposit = float(current_cfg.get("deposit_min_uah", 100))
    max_discount_step = float(settings.get("max_discount_step", 0.5))
    max_deposit_step = float(settings.get("max_deposit_step_uah", 50))

    # Snapshot metrics
    decline_rate = float(snap.get("decline_rate", 0))
    return_rate = float(snap.get("return_rate", 0))
    recovery_rate = float(snap.get("recovery_rate", 0))
    prepaid_conv = float(snap.get("prepaid_conversion", 0))

    # === RULE 1: High decline rate → increase discount ===
    if decline_rate > 0.18 and discount < 2.5:
        new_discount = round(min(2.5, discount + max_discount_step), 2)
        return (
            "DECLINE_HIGH",
            {"prepaid_discount_value": new_discount},
            {
                "trigger": f"decline_rate={decline_rate:.1%} > 18%",
                "action": f"discount {discount}% → {new_discount}%",
                "expected_conversion_uplift": 0.02,
            }
        )

    # === RULE 2: High return rate → increase deposit ===
    if return_rate > 0.12 and deposit < 250:
        new_deposit = round(min(250, deposit + max_deposit_step), 0)
        return (
            "RETURNS_HIGH",
            {"deposit_min_uah": new_deposit},
            {
                "trigger": f"return_rate={return_rate:.1%} > 12%",
                "action": f"deposit {deposit} → {new_deposit} грн",
                "expected_return_drop": 0.02,
                "expected_conversion_hit": 0.01,
            }
        )

    # === RULE 3: Low prepaid conversion → increase discount ===
    if prepaid_conv < 0.6 and discount < 2.0:
        new_discount = round(min(2.0, discount + max_discount_step), 2)
        return (
            "PREPAID_CONV_LOW",
            {"prepaid_discount_value": new_discount},
            {
                "trigger": f"prepaid_conversion={prepaid_conv:.1%} < 60%",
                "action": f"discount {discount}% → {new_discount}%",
                "expected_conversion_uplift": 0.03,
            }
        )

    # === RULE 4: Low recovery rate → suggest retry tune (manual) ===
    if recovery_rate < 0.05:
        return (
            "RECOVERY_LOW",
            {"_suggest_retry_tune": True},
            {
                "trigger": f"recovery_rate={recovery_rate:.1%} < 5%",
                "action": "Review retry intervals (manual)",
                "expected_recovery_uplift": 0.02,
            }
        )

    # === RULE 5: Good metrics but high discount → reduce discount ===
    if decline_rate < 0.10 and return_rate < 0.08 and prepaid_conv > 0.75 and discount > 1.0:
        new_discount = round(max(0.5, discount - max_discount_step), 2)
        return (
            "METRICS_GOOD_REDUCE_DISCOUNT",
            {"prepaid_discount_value": new_discount},
            {
                "trigger": f"Good metrics: decline={decline_rate:.1%}, returns={return_rate:.1%}, prepaid_conv={prepaid_conv:.1%}",
                "action": f"discount {discount}% → {new_discount}%",
                "expected_savings_pct": 0.5,
            }
        )

    return None
