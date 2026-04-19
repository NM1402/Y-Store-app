"""
Attributes API Routes - Admin + Public endpoints for dynamic filters

Public:
- GET /api/v2/categories/{slug}/filters - Get filter schema for category
- GET /api/v2/catalog - Query with dynamic filters

Admin:
- CRUD for attributes
- Category attribute schema management
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

from core.db import db
from core.security import get_current_admin
from .attributes_service import AttributesService
from .attributes_repo import AttributesRepository
from .attributes_types import (
    AttributeCreate, Attribute, CategoryAttributeCreate,
    CategoryFiltersResponse, FilterUIType
)

router = APIRouter(tags=["Attributes & Filters"])

# Service instance
def get_service():
    return AttributesService(db)

def get_repo():
    return AttributesRepository(db)


# ============= PUBLIC ENDPOINTS =============

@router.get("/api/v2/categories/{slug}/filters", response_model=CategoryFiltersResponse)
async def get_category_filters(
    slug: str,
    lang: str = Query("uk", description="Language: uk or ru")
):
    """
    Get complete filter schema for category.
    Frontend uses this to render filters dynamically.
    """
    service = get_service()
    return await service.get_category_filters(slug, lang)


@router.get("/api/v2/catalog/filtered")
async def catalog_with_filters(
    category: Optional[str] = Query(None, description="Category slug"),
    q: Optional[str] = Query(None, description="Search query"),
    sort: str = Query("popular", description="Sort: popular, price_asc, price_desc, new, rating"),
    page: int = Query(1, ge=1),
    limit: int = Query(24, ge=1, le=100),
    lang: str = Query("uk"),
    # Dynamic filters come as f.{code}={value}
    # e.g., f.price=1000-50000, f.brand=apple,samsung, f.nfc=true
):
    """
    Query catalog with dynamic filters.
    
    Filter format:
    - Range: f.price=1000-50000, f.memory_gb=64-256
    - Multi-select: f.brand=apple,samsung
    - Boolean: f.nfc=true
    - Single: f.color=black
    """
    from fastapi import Request
    from starlette.requests import Request as StarletteRequest
    import re
    
    # Parse filters from query params
    # This is a workaround since FastAPI doesn't support dynamic query params well
    service = get_service()
    
    # For now, accept filters as JSON body or specific params
    filters = {}
    
    result = await service.query_catalog(
        category_slug=category,
        search_query=q,
        filters=filters,
        sort=sort,
        page=page,
        limit=limit,
        lang=lang
    )
    
    return result


@router.post("/api/v2/catalog/filtered")
async def catalog_with_filters_post(
    body: Dict[str, Any] = Body(...)
):
    """
    Query catalog with filters (POST version for complex filters).
    
    Body:
    {
        "category": "smartphones",
        "q": "iphone",
        "filters": {
            "price": {"min": 10000, "max": 50000},
            "brand": ["apple", "samsung"],
            "memory_gb": {"min": 128},
            "nfc": true
        },
        "sort": "popular",
        "page": 1,
        "limit": 24
    }
    """
    service = get_service()
    
    result = await service.query_catalog(
        category_slug=body.get("category"),
        search_query=body.get("q"),
        filters=body.get("filters", {}),
        sort=body.get("sort", "popular"),
        page=body.get("page", 1),
        limit=body.get("limit", 24),
        lang=body.get("lang", "uk")
    )
    
    return result


# ============= ADMIN: ATTRIBUTES CRUD =============

@router.get("/api/v2/admin/attributes")
async def list_attributes(
    skip: int = 0,
    limit: int = 100,
    type: Optional[str] = None,
    is_global: Optional[bool] = None,
    admin: dict = Depends(get_current_admin)
):
    """List all attribute definitions"""
    repo = get_repo()
    items = await repo.list_attributes(skip, limit, type, is_global)
    return {"items": items, "total": len(items)}


@router.post("/api/v2/admin/attributes")
async def create_attribute(
    data: AttributeCreate,
    admin: dict = Depends(get_current_admin)
):
    """Create new attribute definition"""
    repo = get_repo()
    
    # Check if code exists
    existing = await repo.get_attribute_by_code(data.code)
    if existing:
        raise HTTPException(status_code=400, detail=f"Attribute with code '{data.code}' already exists")
    
    result = await repo.create_attribute(data.model_dump())
    return result


@router.get("/api/v2/admin/attributes/{attr_id}")
async def get_attribute(
    attr_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Get attribute by ID"""
    repo = get_repo()
    attr = await repo.get_attribute(attr_id)
    if not attr:
        raise HTTPException(status_code=404, detail="Attribute not found")
    return attr


@router.put("/api/v2/admin/attributes/{attr_id}")
async def update_attribute(
    attr_id: str,
    data: Dict[str, Any] = Body(...),
    admin: dict = Depends(get_current_admin)
):
    """Update attribute"""
    repo = get_repo()
    
    # Don't allow changing code
    data.pop("code", None)
    data.pop("id", None)
    
    result = await repo.update_attribute(attr_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Attribute not found")
    return result


@router.delete("/api/v2/admin/attributes/{attr_id}")
async def delete_attribute(
    attr_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Delete attribute"""
    repo = get_repo()
    success = await repo.delete_attribute(attr_id)
    if not success:
        raise HTTPException(status_code=404, detail="Attribute not found")
    return {"ok": True}


# ============= ADMIN: CATEGORY FILTER SCHEMA =============

@router.get("/api/v2/admin/categories/{category_id}/attributes")
async def get_category_attributes(
    category_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Get all attributes configured for category"""
    repo = get_repo()
    items = await repo.get_category_attributes(category_id, include_attribute=True)
    return {"items": items, "category_id": category_id}


class AddAttributeToCategoryRequest(BaseModel):
    attribute_id: str
    filter_ui: FilterUIType = FilterUIType.MULTISELECT
    group: Optional[str] = None
    group_uk: Optional[str] = None
    group_ru: Optional[str] = None
    sort: int = 0
    pinned: bool = False
    collapsed: bool = False
    required: bool = False
    show_in_card: bool = True
    show_in_list: bool = False


@router.post("/api/v2/admin/categories/{category_id}/attributes")
async def add_attribute_to_category(
    category_id: str,
    data: AddAttributeToCategoryRequest,
    admin: dict = Depends(get_current_admin)
):
    """Add attribute to category filter schema"""
    repo = get_repo()
    
    # Verify attribute exists
    attr = await repo.get_attribute(data.attribute_id)
    if not attr:
        raise HTTPException(status_code=404, detail="Attribute not found")
    
    result = await repo.add_attribute_to_category(
        category_id, 
        data.attribute_id,
        data.model_dump(exclude={"attribute_id"})
    )
    return result


@router.put("/api/v2/admin/categories/{category_id}/attributes/{attribute_id}")
async def update_category_attribute(
    category_id: str,
    attribute_id: str,
    data: Dict[str, Any] = Body(...),
    admin: dict = Depends(get_current_admin)
):
    """Update category attribute configuration"""
    repo = get_repo()
    
    # Don't allow changing IDs
    data.pop("category_id", None)
    data.pop("attribute_id", None)
    
    result = await repo.update_category_attribute(category_id, attribute_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Category attribute not found")
    return result


@router.delete("/api/v2/admin/categories/{category_id}/attributes/{attribute_id}")
async def remove_attribute_from_category(
    category_id: str,
    attribute_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Remove attribute from category"""
    repo = get_repo()
    success = await repo.remove_attribute_from_category(category_id, attribute_id)
    if not success:
        raise HTTPException(status_code=404, detail="Category attribute not found")
    return {"ok": True}


@router.post("/api/v2/admin/categories/{category_id}/attributes/reorder")
async def reorder_category_attributes(
    category_id: str,
    attribute_ids: List[str] = Body(...),
    admin: dict = Depends(get_current_admin)
):
    """Reorder attributes in category"""
    repo = get_repo()
    await repo.reorder_category_attributes(category_id, attribute_ids)
    return {"ok": True}


# ============= ADMIN: PRODUCT ATTRIBUTES =============

class ProductAttributeInput(BaseModel):
    attribute_id: str
    attribute_code: str
    value_number: Optional[float] = None
    value_string: Optional[str] = None
    value_bool: Optional[bool] = None
    value_set: Optional[List[str]] = None


@router.get("/api/v2/admin/products/{product_id}/attributes")
async def get_product_attributes(
    product_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Get product attributes"""
    repo = get_repo()
    attrs = await repo.get_product_attributes(product_id)
    return {"product_id": product_id, "attributes": attrs}


@router.put("/api/v2/admin/products/{product_id}/attributes")
async def set_product_attributes(
    product_id: str,
    attributes: List[ProductAttributeInput] = Body(...),
    admin: dict = Depends(get_current_admin)
):
    """Set product attributes (replaces existing)"""
    repo = get_repo()
    success = await repo.set_product_attributes(
        product_id,
        [a.model_dump() for a in attributes]
    )
    return {"ok": success, "product_id": product_id}


# ============= ADMIN: SEED & UTILS =============

@router.post("/api/v2/admin/attributes/seed")
async def seed_default_attributes(
    admin: dict = Depends(get_current_admin)
):
    """Seed default marketplace attributes"""
    service = get_service()
    result = await service.seed_default_attributes()
    return result


@router.post("/api/v2/admin/attributes/init-indexes")
async def init_indexes(
    admin: dict = Depends(get_current_admin)
):
    """Initialize database indexes for attributes"""
    service = get_service()
    await service.init()
    return {"ok": True, "message": "Indexes created"}
