"""
Banners Module - Admin API for managing hero banners
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os
import uuid

router = APIRouter()

# MongoDB
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'marketplace_db')]

# ============= MODELS =============

class Banner(BaseModel):
    id: str = None
    title: str
    subtitle: Optional[str] = None
    badge: Optional[str] = None
    image_url: str
    link_url: Optional[str] = "/catalog"
    link_text: Optional[str] = "Переглянути"
    bg_color: Optional[str] = "#1e293b"
    text_color: Optional[str] = "#ffffff"
    order: int = 0
    is_active: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class BannerCreate(BaseModel):
    title: str
    subtitle: Optional[str] = None
    badge: Optional[str] = None
    image_url: str
    link_url: Optional[str] = "/catalog"
    link_text: Optional[str] = "Переглянути"
    bg_color: Optional[str] = "#1e293b"
    text_color: Optional[str] = "#ffffff"
    order: int = 0
    is_active: bool = True

class BannerUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    badge: Optional[str] = None
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    link_text: Optional[str] = None
    bg_color: Optional[str] = None
    text_color: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None

# ============= HELPERS =============

def get_default_banners():
    """Get fresh copy of default banners"""
    return [
        {
            "id": str(uuid.uuid4()),
            "title": "Знижки до -30%",
            "subtitle": "На техніку Apple",
            "badge": "Спеціальна пропозиція",
            "image_url": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200",
            "link_url": "/catalog?category=smartphones",
            "link_text": "Переглянути",
            "bg_color": "#6366f1",
            "text_color": "#ffffff",
            "order": 1,
            "is_active": True
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Нові надходження",
            "subtitle": "Смартфони 2026",
            "badge": "Новинки",
            "image_url": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200",
            "link_url": "/catalog?sort=-created_at",
            "link_text": "Дивитись",
            "bg_color": "#0ea5e9",
            "text_color": "#ffffff",
            "order": 2,
            "is_active": True
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Безкоштовна доставка",
            "subtitle": "При замовленні від 2000 грн",
            "badge": "Акція",
            "image_url": "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200",
            "link_url": "/delivery-payment",
            "link_text": "Детальніше",
            "bg_color": "#22c55e",
            "text_color": "#ffffff",
            "order": 3,
            "is_active": True
        }
    ]

async def get_or_create_banners():
    """Get banners or create defaults"""
    banners = await db.banners.find({"is_active": True}).sort("order", 1).to_list(100)
    if not banners:
        # Insert defaults
        now = datetime.now(timezone.utc).isoformat()
        defaults = get_default_banners()
        for b in defaults:
            b["created_at"] = now
            b["updated_at"] = now
        await db.banners.insert_many(defaults)
        return defaults
    # Remove _id for JSON
    return [{k: v for k, v in b.items() if k != "_id"} for b in banners]

# ============= PUBLIC ENDPOINTS =============

@router.get("/banners")
async def get_banners():
    """Public: Get active banners for hero carousel"""
    banners = await get_or_create_banners()
    return {"banners": banners}

# ============= ADMIN ENDPOINTS =============

@router.get("/admin/banners")
async def admin_get_banners():
    """Admin: Get all banners including inactive"""
    banners = await db.banners.find().sort("order", 1).to_list(100)
    if not banners:
        await get_or_create_banners()
        banners = await db.banners.find().sort("order", 1).to_list(100)
    return {"banners": [{k: v for k, v in b.items() if k != "_id"} for b in banners]}

@router.post("/admin/banners")
async def create_banner(data: BannerCreate):
    """Admin: Create new banner"""
    now = datetime.now(timezone.utc).isoformat()
    banner = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
        "created_at": now,
        "updated_at": now
    }
    await db.banners.insert_one(banner)
    return {"message": "Banner created", "banner": {k: v for k, v in banner.items() if k != "_id"}}

@router.patch("/admin/banners/{banner_id}")
async def update_banner(banner_id: str, data: BannerUpdate):
    """Admin: Update banner"""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.banners.update_one(
        {"id": banner_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    banner = await db.banners.find_one({"id": banner_id}, {"_id": 0})
    return {"message": "Banner updated", "banner": banner}

@router.delete("/admin/banners/{banner_id}")
async def delete_banner(banner_id: str):
    """Admin: Delete banner"""
    result = await db.banners.delete_one({"id": banner_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Banner not found")
    return {"message": "Banner deleted"}

@router.post("/admin/banners/reorder")
async def reorder_banners(order: List[str]):
    """Admin: Reorder banners by ID list"""
    for idx, banner_id in enumerate(order):
        await db.banners.update_one(
            {"id": banner_id},
            {"$set": {"order": idx + 1, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    return {"message": "Banners reordered"}

@router.post("/admin/banners/seed")
async def seed_banners():
    """Admin: Reset to default banners"""
    await db.banners.delete_many({})
    now = datetime.now(timezone.utc).isoformat()
    defaults = get_default_banners()
    for b in defaults:
        b["created_at"] = now
        b["updated_at"] = now
    await db.banners.insert_many(defaults)
    return {"message": "Banners seeded", "count": len(defaults)}
