"""
Promo Codes Module - Manage discount codes with Telegram integration
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
import os
import uuid
import random
import string

router = APIRouter()

# MongoDB
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'marketplace_db')]

# ============= MODELS =============

class PromoCode(BaseModel):
    id: str = None
    code: str
    description: Optional[str] = None
    discount_type: str = "percent"  # percent | fixed
    discount_value: float
    min_order_amount: Optional[float] = None
    max_discount: Optional[float] = None
    usage_limit: Optional[int] = None
    used_count: int = 0
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    is_active: bool = True
    is_telegram_only: bool = False  # Промо тільки для Telegram
    created_at: Optional[str] = None

class PromoCodeCreate(BaseModel):
    code: Optional[str] = None  # Auto-generate if empty
    description: Optional[str] = None
    discount_type: str = "percent"
    discount_value: float
    min_order_amount: Optional[float] = None
    max_discount: Optional[float] = None
    usage_limit: Optional[int] = None
    valid_days: Optional[int] = 30
    is_telegram_only: bool = False

class PromoCodeValidate(BaseModel):
    code: str
    order_total: float
    telegram_user_id: Optional[str] = None

# ============= HELPERS =============

def generate_code(prefix: str = "YS", length: int = 6) -> str:
    """Generate unique promo code"""
    chars = string.ascii_uppercase + string.digits
    suffix = ''.join(random.choices(chars, k=length))
    return f"{prefix}{suffix}"

async def validate_promo(code: str, order_total: float, telegram_user_id: str = None):
    """Validate promo code and calculate discount"""
    promo = await db.promo_codes.find_one({"code": code.upper(), "is_active": True})
    
    if not promo:
        return {"valid": False, "error": "Промокод не знайдено"}
    
    now = datetime.now(timezone.utc)
    
    # Check validity period
    if promo.get("valid_from"):
        valid_from = datetime.fromisoformat(promo["valid_from"].replace("Z", "+00:00"))
        if now < valid_from:
            return {"valid": False, "error": "Промокод ще не активний"}
    
    if promo.get("valid_until"):
        valid_until = datetime.fromisoformat(promo["valid_until"].replace("Z", "+00:00"))
        if now > valid_until:
            return {"valid": False, "error": "Промокод закінчився"}
    
    # Check usage limit
    if promo.get("usage_limit") and promo.get("used_count", 0) >= promo["usage_limit"]:
        return {"valid": False, "error": "Промокод вичерпано"}
    
    # Check min order
    if promo.get("min_order_amount") and order_total < promo["min_order_amount"]:
        return {"valid": False, "error": f"Мінімальна сума замовлення {promo['min_order_amount']} грн"}
    
    # Check Telegram restriction
    if promo.get("is_telegram_only") and not telegram_user_id:
        return {"valid": False, "error": "Цей промокод доступний тільки через Telegram бот"}
    
    # Calculate discount
    if promo["discount_type"] == "percent":
        discount = order_total * (promo["discount_value"] / 100)
        if promo.get("max_discount") and discount > promo["max_discount"]:
            discount = promo["max_discount"]
    else:
        discount = promo["discount_value"]
    
    return {
        "valid": True,
        "code": promo["code"],
        "discount": round(discount, 2),
        "discount_type": promo["discount_type"],
        "discount_value": promo["discount_value"],
        "description": promo.get("description")
    }

# ============= PUBLIC ENDPOINTS =============

@router.post("/promo/validate")
async def validate_promo_code(data: PromoCodeValidate):
    """Validate promo code and return discount"""
    result = await validate_promo(data.code, data.order_total, data.telegram_user_id)
    return result

@router.post("/promo/apply/{code}")
async def apply_promo_code(code: str, order_id: str):
    """Mark promo code as used for order"""
    promo = await db.promo_codes.find_one({"code": code.upper(), "is_active": True})
    if not promo:
        raise HTTPException(status_code=404, detail="Promo code not found")
    
    # Increment usage
    await db.promo_codes.update_one(
        {"code": code.upper()},
        {"$inc": {"used_count": 1}}
    )
    
    # Log usage
    await db.promo_usage.insert_one({
        "promo_code": code.upper(),
        "order_id": order_id,
        "used_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Promo applied"}

# ============= ADMIN ENDPOINTS =============

@router.get("/admin/promo-codes")
async def admin_get_promo_codes():
    """Admin: Get all promo codes"""
    promos = await db.promo_codes.find().sort("created_at", -1).to_list(100)
    return {"promo_codes": [{k: v for k, v in p.items() if k != "_id"} for p in promos]}

@router.post("/admin/promo-codes")
async def admin_create_promo(data: PromoCodeCreate):
    """Admin: Create new promo code"""
    code = data.code.upper() if data.code else generate_code()
    
    # Check if code exists
    existing = await db.promo_codes.find_one({"code": code})
    if existing:
        raise HTTPException(status_code=400, detail="Code already exists")
    
    now = datetime.now(timezone.utc)
    valid_until = now + timedelta(days=data.valid_days) if data.valid_days else None
    
    promo = {
        "id": str(uuid.uuid4()),
        "code": code,
        "description": data.description or f"Знижка {data.discount_value}{'%' if data.discount_type == 'percent' else ' грн'}",
        "discount_type": data.discount_type,
        "discount_value": data.discount_value,
        "min_order_amount": data.min_order_amount,
        "max_discount": data.max_discount,
        "usage_limit": data.usage_limit,
        "used_count": 0,
        "valid_from": now.isoformat(),
        "valid_until": valid_until.isoformat() if valid_until else None,
        "is_active": True,
        "is_telegram_only": data.is_telegram_only,
        "created_at": now.isoformat()
    }
    
    await db.promo_codes.insert_one(promo)
    return {"message": "Promo created", "promo": {k: v for k, v in promo.items() if k != "_id"}}

@router.delete("/admin/promo-codes/{promo_id}")
async def admin_delete_promo(promo_id: str):
    """Admin: Delete promo code"""
    result = await db.promo_codes.delete_one({"id": promo_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Promo not found")
    return {"message": "Promo deleted"}

@router.patch("/admin/promo-codes/{promo_id}/toggle")
async def admin_toggle_promo(promo_id: str):
    """Admin: Toggle promo code active status"""
    promo = await db.promo_codes.find_one({"id": promo_id})
    if not promo:
        raise HTTPException(status_code=404, detail="Promo not found")
    
    new_status = not promo.get("is_active", True)
    await db.promo_codes.update_one(
        {"id": promo_id},
        {"$set": {"is_active": new_status}}
    )
    return {"message": f"Promo {'activated' if new_status else 'deactivated'}"}

# ============= TELEGRAM BOT INTEGRATION =============

@router.get("/telegram/promo/{telegram_user_id}")
async def get_telegram_promo(telegram_user_id: str):
    """Generate or get personal promo code for Telegram user"""
    # Check if user already has a promo
    existing = await db.telegram_promos.find_one({"telegram_user_id": telegram_user_id})
    
    if existing:
        promo = await db.promo_codes.find_one({"code": existing["promo_code"], "is_active": True})
        if promo:
            return {
                "promo_code": promo["code"],
                "discount": f"{promo['discount_value']}{'%' if promo['discount_type'] == 'percent' else ' грн'}",
                "valid_until": promo.get("valid_until"),
                "already_used": promo.get("used_count", 0) > 0
            }
    
    # Generate new personal promo
    code = generate_code("TG", 8)
    now = datetime.now(timezone.utc)
    valid_until = now + timedelta(days=7)
    
    promo = {
        "id": str(uuid.uuid4()),
        "code": code,
        "description": "Персональна знижка з Telegram",
        "discount_type": "percent",
        "discount_value": 5,  # 5% discount for Telegram users
        "min_order_amount": 500,
        "usage_limit": 1,
        "used_count": 0,
        "valid_from": now.isoformat(),
        "valid_until": valid_until.isoformat(),
        "is_active": True,
        "is_telegram_only": True,
        "created_at": now.isoformat()
    }
    
    await db.promo_codes.insert_one(promo)
    await db.telegram_promos.insert_one({
        "telegram_user_id": telegram_user_id,
        "promo_code": code,
        "created_at": now.isoformat()
    })
    
    return {
        "promo_code": code,
        "discount": "5%",
        "valid_until": valid_until.isoformat(),
        "message": "Ваш персональний промокод на 5% знижку!"
    }
