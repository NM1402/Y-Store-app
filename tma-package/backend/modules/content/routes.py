"""
Content Module - Slides, Sections, Promotions
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from core.db import db
from core.security import get_current_admin

router = APIRouter(prefix="/content", tags=["Content"])


# ============ SLIDES ============

class SlideBase(BaseModel):
    title: str
    title_uk: Optional[str] = None
    subtitle: Optional[str] = None
    subtitle_uk: Optional[str] = None
    image_url: str
    link: Optional[str] = None
    button_text: Optional[str] = None
    button_text_uk: Optional[str] = None
    order: int = 0
    is_active: bool = True


class SlideCreate(SlideBase):
    pass


class Slide(SlideBase):
    id: str


@router.get("/slides", response_model=List[Slide])
async def get_active_slides():
    """Get active slides for homepage"""
    slides = await db.slides.find(
        {"is_active": True},
        {"_id": 0}
    ).sort("order", 1).to_list(20)
    return [Slide(**s) for s in slides]


@router.get("/slides/all", response_model=List[Slide])
async def get_all_slides(current_user: dict = Depends(get_current_admin)):
    """Get all slides (admin)"""
    slides = await db.slides.find({}, {"_id": 0}).sort("order", 1).to_list(50)
    return [Slide(**s) for s in slides]


@router.post("/slides", response_model=Slide)
async def create_slide(
    data: SlideCreate,
    current_user: dict = Depends(get_current_admin)
):
    """Create slide (admin)"""
    slide_id = str(uuid.uuid4())
    slide_doc = {"id": slide_id, **data.model_dump()}
    await db.slides.insert_one(slide_doc)
    return Slide(**slide_doc)


@router.put("/slides/{slide_id}", response_model=Slide)
async def update_slide(
    slide_id: str,
    data: SlideCreate,
    current_user: dict = Depends(get_current_admin)
):
    """Update slide (admin)"""
    result = await db.slides.update_one(
        {"id": slide_id},
        {"$set": data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Slide not found")
    
    slide = await db.slides.find_one({"id": slide_id}, {"_id": 0})
    return Slide(**slide)


@router.delete("/slides/{slide_id}")
async def delete_slide(
    slide_id: str,
    current_user: dict = Depends(get_current_admin)
):
    """Delete slide (admin)"""
    result = await db.slides.delete_one({"id": slide_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Slide not found")
    return {"message": "Slide deleted"}


# ============ PROMOTIONS ============

class PromotionBase(BaseModel):
    name: str
    name_uk: Optional[str] = None
    code: str
    discount_percent: Optional[int] = None
    discount_amount: Optional[float] = None
    min_order: float = 0
    max_uses: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: bool = True


class PromotionCreate(PromotionBase):
    pass


class Promotion(PromotionBase):
    id: str
    uses_count: int = 0


@router.get("/promotions", response_model=List[Promotion])
async def get_promotions():
    """Get active promotions"""
    now = datetime.now(timezone.utc)
    promos = await db.promotions.find({
        "is_active": True,
        "$or": [
            {"end_date": None},
            {"end_date": {"$gte": now}}
        ]
    }, {"_id": 0}).to_list(50)
    return [Promotion(**p) for p in promos]


@router.get("/promotions/all", response_model=List[Promotion])
async def get_all_promotions(current_user: dict = Depends(get_current_admin)):
    """Get all promotions (admin)"""
    promos = await db.promotions.find({}, {"_id": 0}).to_list(100)
    return [Promotion(**p) for p in promos]


@router.post("/promotions", response_model=Promotion)
async def create_promotion(
    data: PromotionCreate,
    current_user: dict = Depends(get_current_admin)
):
    """Create promotion (admin)"""
    promo_id = str(uuid.uuid4())
    promo_doc = {"id": promo_id, "uses_count": 0, **data.model_dump()}
    await db.promotions.insert_one(promo_doc)
    return Promotion(**promo_doc)


@router.delete("/promotions/{promo_id}")
async def delete_promotion(
    promo_id: str,
    current_user: dict = Depends(get_current_admin)
):
    """Delete promotion (admin)"""
    result = await db.promotions.delete_one({"id": promo_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Promotion not found")
    return {"message": "Promotion deleted"}


# ============ CUSTOM SECTIONS ============

class SectionBase(BaseModel):
    name: str
    slug: str
    title: str
    title_uk: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True
    order: int = 0
    product_ids: List[str] = []


class SectionCreate(SectionBase):
    pass


class Section(SectionBase):
    id: str


@router.get("/sections", response_model=List[Section])
async def get_sections():
    """Get active sections"""
    sections = await db.sections.find(
        {"is_active": True},
        {"_id": 0}
    ).sort("order", 1).to_list(20)
    return [Section(**s) for s in sections]


@router.post("/sections", response_model=Section)
async def create_section(
    data: SectionCreate,
    current_user: dict = Depends(get_current_admin)
):
    """Create section (admin)"""
    section_id = str(uuid.uuid4())
    section_doc = {"id": section_id, **data.model_dump()}
    await db.sections.insert_one(section_doc)
    return Section(**section_doc)
