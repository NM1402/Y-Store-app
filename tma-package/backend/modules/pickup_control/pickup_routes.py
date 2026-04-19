"""
O20.2: Pickup Control Routes - Admin API endpoints (Extended)
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime, timezone, timedelta

from core.db import db
from core.security import get_current_admin
from modules.pickup_control.pickup_repo import PickupRepo
from modules.pickup_control.pickup_engine import PickupControlEngine

router = APIRouter(prefix="/pickup-control", tags=["Pickup Control"])


# ============= O20.2: NEW ENDPOINTS =============

@router.get("/summary")
async def get_pickup_summary(current_user: dict = Depends(get_current_admin)):
    """
    O20.2: Get pickup control summary KPIs
    Returns: days2plus, days5plus, days7plus, amount_at_risk_7plus
    """
    orders = db["orders"]
    
    def base_query(days: int):
        return {
            "shipment.daysAtPoint": {"$gte": days},
            "status": {"$in": ["SHIPPED", "shipped", "PROCESSING", "processing"]}
        }
    
    days2 = await orders.count_documents(base_query(2))
    days5 = await orders.count_documents(base_query(5))
    days7 = await orders.count_documents(base_query(7))
    
    # Calculate amount at risk (7+ days)
    cursor = orders.find(base_query(7), {"totals.grand": 1, "total_amount": 1, "_id": 0})
    amount = 0
    async for o in cursor:
        amt = float((o.get("totals") or {}).get("grand") or o.get("total_amount") or 0)
        amount += amt
    
    return {
        "days2plus": days2,
        "days5plus": days5,
        "days7plus": days7,
        "amount_at_risk_7plus": round(amount, 2)
    }


@router.post("/send")
async def manual_send_reminder(
    body: dict,
    current_user: dict = Depends(get_current_admin)
):
    """
    O20.2: Manual send reminder for specific TTN
    Body: {"ttn": "2045...", "level": "D5"}
    Respects cooldown and dedupe
    """
    ttn = body.get("ttn")
    level = body.get("level")
    
    if not ttn or not level:
        raise HTTPException(status_code=400, detail="ttn and level required")
    
    # Find order
    order = await db["orders"].find_one({"shipment.ttn": ttn}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    repo = PickupRepo(db)
    
    # Check cooldown
    reminders = (order.get("reminders") or {}).get("pickup") or {}
    cooldown_until = reminders.get("cooldownUntil")
    if cooldown_until:
        try:
            cooldown_dt = datetime.fromisoformat(cooldown_until.replace("Z", "+00:00"))
            if datetime.now(timezone.utc) < cooldown_dt:
                return {"ok": False, "reason": "cooldown_active", "until": cooldown_until}
        except:
            pass
    
    # Get phone
    delivery = order.get("delivery") or {}
    recipient = delivery.get("recipient") or {}
    phone = recipient.get("phone") or order.get("buyer_phone")
    
    if not phone:
        return {"ok": False, "reason": "no_phone"}
    
    # Dedupe check
    dedupe_key = f"pickup:{ttn}:MANUAL:{level}"
    existing = await db["notification_outbox"].find_one({"dedupe_key": dedupe_key})
    if existing:
        return {"ok": False, "reason": "duplicate", "dedupe_key": dedupe_key}
    
    # Get SMS template
    from modules.pickup_control.pickup_templates import sms_pickup_template
    days_at = (order.get("shipment") or {}).get("daysAtPoint") or 0
    text = sms_pickup_template(level, ttn, order_id=order.get("id"), days=int(days_at))
    
    # Enqueue SMS
    now = datetime.now(timezone.utc)
    await db["notification_outbox"].insert_one({
        "channel": "sms",
        "recipient": phone,
        "text": text,
        "status": "pending",
        "created_at": now.isoformat(),
        "dedupe_key": dedupe_key,
        "meta": {
            "order_id": order.get("id"),
            "ttn": ttn,
            "level": level,
            "manual": True,
            "sent_by": current_user.get("email", "admin")
        }
    })
    
    # Mark reminder sent
    sent_levels = reminders.get("sentLevels") or []
    if level not in sent_levels:
        sent_levels.append(level)
    
    await db["orders"].update_one(
        {"shipment.ttn": ttn},
        {"$set": {
            "reminders.pickup.sentLevels": sent_levels,
            "reminders.pickup.lastSentAt": now.isoformat()
        }}
    )
    
    # Timeline event
    await db["timeline_events"].insert_one({
        "phone": phone,
        "ts": now.isoformat(),
        "type": "PICKUP_REMINDER_SENT_MANUAL",
        "title": "📩 Ручне нагадування",
        "description": f"Manual reminder {level} для ТТН {ttn}",
        "payload": {"ttn": ttn, "level": level, "sent_by": current_user.get("email", "admin")},
        "created_at": now.isoformat()
    })
    
    return {"ok": True, "ttn": ttn, "level": level, "phone": phone}


@router.post("/mute")
async def mute_ttn_reminder(
    body: dict,
    current_user: dict = Depends(get_current_admin)
):
    """
    O20.2: Mute reminders for TTN
    Body: {"ttn": "2045...", "hours": 168}
    """
    ttn = body.get("ttn")
    hours = int(body.get("hours", 168))  # Default 7 days
    
    if not ttn:
        raise HTTPException(status_code=400, detail="ttn required")
    
    until = datetime.now(timezone.utc) + timedelta(hours=hours)
    
    result = await db["orders"].update_one(
        {"shipment.ttn": ttn},
        {"$set": {"reminders.pickup.cooldownUntil": until.isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Timeline event
    order = await db["orders"].find_one({"shipment.ttn": ttn}, {"delivery.recipient.phone": 1})
    phone = ((order.get("delivery") or {}).get("recipient") or {}).get("phone") if order else None
    if phone:
        await db["timeline_events"].insert_one({
            "phone": phone,
            "ts": datetime.now(timezone.utc).isoformat(),
            "type": "PICKUP_MUTED",
            "title": "🔕 Нагадування заглушено",
            "description": f"TTN {ttn} muted на {hours}h",
            "payload": {"ttn": ttn, "hours": hours, "muted_by": current_user.get("email", "admin")},
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    return {"ok": True, "ttn": ttn, "muted_until": until.isoformat()}


@router.post("/unmute")
async def unmute_ttn_reminder(
    body: dict,
    current_user: dict = Depends(get_current_admin)
):
    """
    O20.2: Unmute reminders for TTN
    Body: {"ttn": "2045..."}
    """
    ttn = body.get("ttn")
    
    if not ttn:
        raise HTTPException(status_code=400, detail="ttn required")
    
    result = await db["orders"].update_one(
        {"shipment.ttn": ttn},
        {"$unset": {"reminders.pickup.cooldownUntil": ""}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"ok": True, "ttn": ttn}


@router.get("/find")
async def find_by_ttn(
    ttn: str,
    current_user: dict = Depends(get_current_admin)
):
    """
    O20.2: Find order by TTN
    """
    order = await db["orders"].find_one({"shipment.ttn": ttn}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


# ============= EXISTING ENDPOINTS (UPDATED) =============


@router.get("/risk")
async def get_risk_list(
    days: int = 7,
    skip: int = 0,
    limit: int = 20,
    current_user: dict = Depends(get_current_admin)
):
    """
    O20.2: Get list of shipments at pickup point for N+ days
    With pagination: skip, limit
    Sorted by daysAtPoint desc, then by amount desc
    """
    query = {
        "shipment.daysAtPoint": {"$gte": days},
        "status": {"$in": ["SHIPPED", "shipped", "PROCESSING", "processing"]}
    }
    
    cursor = db["orders"].find(query, {"_id": 0}) \
        .sort([
            ("shipment.daysAtPoint", -1),
            ("totals.grand", -1)
        ]) \
        .skip(skip) \
        .limit(limit)
    
    items = [item async for item in cursor]
    total = await db["orders"].count_documents(query)
    
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit,
        "filter_days": days
    }


@router.get("/kpi")
async def get_pickup_kpi(current_user: dict = Depends(get_current_admin)):
    """Get pickup control KPI stats"""
    repo = PickupRepo(db)
    kpi = await repo.get_pickup_kpi()
    return kpi


@router.post("/run")
async def run_pickup_control(
    body: dict = {},
    current_user: dict = Depends(get_current_admin)
):
    """Manually trigger pickup control processing"""
    limit = int(body.get("limit", 300))
    
    # Get NP service if available
    np_service = None
    try:
        from modules.delivery.np.np_tracking_service import NPTrackingService
        np_service = NPTrackingService(db)
    except ImportError:
        pass
    
    engine = PickupControlEngine(db, np_service=np_service)
    result = await engine.run_once(limit=limit)
    return result


@router.post("/process/{ttn}")
async def process_single_ttn(
    ttn: str,
    current_user: dict = Depends(get_current_admin)
):
    """Process single TTN manually"""
    np_service = None
    try:
        from modules.delivery.np.np_tracking_service import NPTrackingService
        np_service = NPTrackingService(db)
    except ImportError:
        pass
    
    engine = PickupControlEngine(db, np_service=np_service)
    result = await engine.process_single_ttn(ttn)
    return result


@router.post("/mute/{ttn}")
async def mute_ttn(
    ttn: str,
    body: dict = {},
    current_user: dict = Depends(get_current_admin)
):
    """Mute reminders for specific TTN"""
    days = int(body.get("days", 7))
    repo = PickupRepo(db)
    await repo.mute_ttn(ttn, days=days)
    return {"ok": True, "ttn": ttn, "muted_days": days}


@router.post("/send-reminder/{ttn}")
async def send_reminder_now(
    ttn: str,
    body: dict = {},
    current_user: dict = Depends(get_current_admin)
):
    """Force send reminder for TTN right now"""
    level = body.get("level", "D5")
    
    # Find order
    order = await db["orders"].find_one({"shipment.ttn": ttn}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get phone
    delivery = order.get("delivery") or {}
    recipient = delivery.get("recipient") or {}
    phone = recipient.get("phone") or order.get("buyer_phone")
    
    if not phone:
        raise HTTPException(status_code=400, detail="No phone number")
    
    # Import templates
    from modules.pickup_control.pickup_templates import sms_pickup_template
    
    # Get days at point
    days_at = (order.get("shipment") or {}).get("daysAtPoint") or 0
    
    text = sms_pickup_template(level, ttn, order_id=order.get("id"), days=int(days_at))
    dedupe_key = f"pickup_manual:{ttn}:{datetime.now(timezone.utc).isoformat()}"
    
    repo = PickupRepo(db)
    await repo.enqueue_sms(phone, text, dedupe_key, {
        "order_id": order.get("id"),
        "ttn": ttn,
        "level": level,
        "manual": True
    })
    
    return {"ok": True, "ttn": ttn, "phone": phone, "level": level}


@router.get("/order/{order_id}")
async def get_order_pickup_status(
    order_id: str,
    current_user: dict = Depends(get_current_admin)
):
    """Get pickup status for specific order"""
    order = await db["orders"].find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    shipment = order.get("shipment") or {}
    reminders = (order.get("reminders") or {}).get("pickup") or {}
    
    return {
        "order_id": order_id,
        "ttn": shipment.get("ttn"),
        "status": order.get("status"),
        "pickup_point_type": shipment.get("pickupPointType"),
        "arrival_at": shipment.get("arrivalAt"),
        "days_at_point": shipment.get("daysAtPoint"),
        "deadline_free_at": shipment.get("deadlineFreeAt"),
        "risk": shipment.get("risk"),
        "reminders": {
            "sent_levels": reminders.get("sentLevels") or [],
            "last_sent_at": reminders.get("lastSentAt"),
            "cooldown_until": reminders.get("cooldownUntil"),
            "muted": reminders.get("muted", False)
        }
    }
