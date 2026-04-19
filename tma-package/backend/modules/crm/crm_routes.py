# O5/O8: CRM Routes
from fastapi import APIRouter, Depends, Query
from core.db import db
from core.security import get_current_admin
from .crm_repository import CRMRepository

router = APIRouter(prefix="/crm", tags=["CRM"])

@router.get("/customers")
async def customers(
    q: str = None,
    segment: str = None,
    skip: int = 0,
    limit: int = 50,
    admin: dict = Depends(get_current_admin)
):
    col = db["customers"]
    flt = {}
    if segment:
        flt["segment"] = segment
    if q:
        flt["$or"] = [
            {"phone": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
            {"name": {"$regex": q, "$options": "i"}},
        ]
    cur = col.find(flt, {"_id": 0}).sort("last_order_at", -1).skip(skip).limit(limit)
    return [x async for x in cur]

@router.get("/customer/{phone}")
async def customer_detail(
    phone: str,
    admin: dict = Depends(get_current_admin)
):
    customer = await db["customers"].find_one({"phone": phone}, {"_id": 0})
    if not customer:
        return {"error": "NOT_FOUND"}

    orders = await db["orders"].find(
        {"shipping.phone": phone},
        {"_id": 0}
    ).sort("created_at", -1).limit(100).to_list(100)

    return {"customer": customer, "orders": orders}

@router.get("/stats")
async def crm_stats(admin: dict = Depends(get_current_admin)):
    """CRM statistics"""
    pipeline = [
        {"$group": {"_id": "$segment", "count": {"$sum": 1}, "total_spent": {"$sum": "$total_spent"}}}
    ]
    segments = await db["customers"].aggregate(pipeline).to_list(20)
    total = await db["customers"].count_documents({})
    return {"total": total, "segments": segments}
