"""
O16: Risk Config
"""
DEFAULT_RISK_CONFIG = {
    "enabled": True,
    "thresholds": {
        "alert_score": 80,
        "risk_band": 80,
        "watch_band": 50
    },
    "weights": {
        "returns_60d": 35,
        "cod_refusals_30d": 25,
        "burst_1h": 25,
        "payment_fails_30d": 15
    },
    "caps": {
        "returns_60d": 35,
        "cod_refusals_30d": 25,
        "burst_1h": 25,
        "payment_fails_30d": 15
    }
}
