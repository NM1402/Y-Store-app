"""
O20: Pickup Policy - Branch/Locker rules + anti-spam
"""
from datetime import datetime, timezone, timedelta
from modules.pickup_control.pickup_types import ReminderDecision, PickupRisk


def utcnow():
    return datetime.now(timezone.utc)


def parse_iso(x: str) -> datetime:
    if not x:
        return None
    try:
        return datetime.fromisoformat(x.replace("Z", "+00:00"))
    except:
        return None


def iso(dt: datetime) -> str:
    return dt.isoformat()


def days_between(a: datetime, b: datetime) -> int:
    if not a or not b:
        return 0
    return int((b - a).total_seconds() // 86400)


def quiet_hours_ok(now: datetime, start_h: int = 9, end_h: int = 20) -> bool:
    """Check if current time is within allowed notification hours (Kyiv time)"""
    # Kyiv = UTC+2 (or UTC+3 in summer)
    local = now + timedelta(hours=2)
    return start_h <= local.hour <= end_h


def calc_storage_day1(arrival_at: datetime) -> datetime:
    """Storage starts next day 00:00 after arrival"""
    d = arrival_at.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    return d


def calc_deadline_free(storage_day1: datetime, free_days: int) -> datetime:
    """Calculate free storage deadline (inclusive)"""
    return storage_day1 + timedelta(days=free_days - 1)


def pickup_risk(days_at: int, free_days: int) -> PickupRisk:
    """Evaluate pickup risk level"""
    if days_at >= free_days:
        return PickupRisk(risk="HIGH", reason="FREE_STORAGE_EXPIRED_OR_LAST_DAY")
    if days_at >= max(1, free_days - 2):
        return PickupRisk(risk="MED", reason="NEAR_DEADLINE")
    return PickupRisk(risk="LOW", reason="OK")


def decide_reminder_level(point_type: str, days_at: int) -> str:
    """
    Determine which reminder level to send based on point type and days at point.
    Branch: D2, D5, D7
    Locker: L1, L3, L5
    Returns None if no reminder should be sent today.
    """
    if point_type == "BRANCH":
        if days_at == 2:
            return "D2"
        if days_at == 5:
            return "D5"
        if days_at == 7:
            return "D7"
        return None
    
    if point_type == "LOCKER":
        if days_at == 1:
            return "L1"
        if days_at == 3:
            return "L3"
        if days_at == 5:
            return "L5"
        return None
    
    return None


def make_decision(
    ttn: str, 
    level: str, 
    now: datetime, 
    can_send: bool, 
    cooldown_ok: bool,
    already_sent_levels: list = None
) -> ReminderDecision:
    """Make final decision whether to send reminder"""
    
    if not level:
        return ReminderDecision(should_send=False, reason="NO_LEVEL_TODAY")
    
    if not can_send:
        return ReminderDecision(should_send=False, reason="USER_OPTOUT_OR_BLOCKED")
    
    if not cooldown_ok:
        return ReminderDecision(should_send=False, reason="COOLDOWN_ACTIVE")
    
    if not quiet_hours_ok(now):
        return ReminderDecision(should_send=False, reason="QUIET_HOURS")
    
    # Check if this level already sent
    if already_sent_levels and level in already_sent_levels:
        return ReminderDecision(should_send=False, reason="LEVEL_ALREADY_SENT")
    
    return ReminderDecision(
        should_send=True,
        level=level,
        channel="SMS",
        reason="SCHEDULED_LEVEL",
        dedupe_key=f"pickup:{ttn}:{level}"
    )


def get_free_storage_days(point_type: str) -> int:
    """Get free storage days by point type"""
    if point_type == "LOCKER":
        return 5
    return 7  # BRANCH or UNKNOWN
