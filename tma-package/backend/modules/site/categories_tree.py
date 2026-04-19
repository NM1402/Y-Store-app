"""
Categories Tree Module - Hierarchical categories with icons
Provides tree structure for MegaMenu, Sidebar, etc.
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid
import re
from datetime import datetime, timezone

router = APIRouter()

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'marketplace_db')]

# ============= MODELS =============

class CategoryCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    icon: str = "Package"  # lucide-react icon name
    parentId: Optional[str] = None
    order: int = 0
    isActive: bool = True
    imageUrl: Optional[str] = None

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    icon: Optional[str] = None
    parentId: Optional[str] = None
    order: Optional[int] = None
    isActive: Optional[bool] = None
    imageUrl: Optional[str] = None

class CategoryResponse(BaseModel):
    id: str
    name: str
    slug: str
    icon: str
    parentId: Optional[str]
    order: int
    isActive: bool
    imageUrl: Optional[str] = None
    children: List["CategoryResponse"] = []

CategoryResponse.model_rebuild()

# Available icons for categories (lucide-react names)
AVAILABLE_ICONS = [
    "Smartphone", "Laptop", "Tablet", "Tv", "Headphones", "Watch",
    "Camera", "Gamepad2", "Home", "Refrigerator", "WashingMachine",
    "Coffee", "Microwave", "Fan", "Lightbulb", "Battery", "Cpu",
    "HardDrive", "Monitor", "Printer", "Speaker", "Radio", "Wifi",
    "Package", "ShoppingBag", "Gift", "Star", "Heart", "Zap"
]

# ============= HELPER FUNCTIONS =============

def generate_slug(name: str) -> str:
    """Generate URL-friendly slug from name"""
    slug = name.lower()
    # Transliterate Ukrainian
    translit = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd',
        'е': 'e', 'є': 'ye', 'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i',
        'ї': 'yi', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
        'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
        'ь': '', 'ю': 'yu', 'я': 'ya', "'": '', ' ': '-'
    }
    for ua, en in translit.items():
        slug = slug.replace(ua, en)
    slug = re.sub(r'[^a-z0-9-]', '', slug)
    slug = re.sub(r'-+', '-', slug).strip('-')
    return slug

async def build_tree(categories: list, parent_id: Optional[str] = None) -> List[dict]:
    """Build hierarchical tree from flat list"""
    tree = []
    for cat in categories:
        if cat.get("parentId") == parent_id:
            children = await build_tree(categories, cat["id"])
            node = {
                "id": cat["id"],
                "name": cat["name"],
                "slug": cat["slug"],
                "icon": cat.get("icon", "Package"),
                "parentId": cat.get("parentId"),
                "order": cat.get("order", 0),
                "isActive": cat.get("isActive", True),
                "imageUrl": cat.get("imageUrl"),
                "children": children
            }
            tree.append(node)
    # Sort by order
    tree.sort(key=lambda x: x["order"])
    return tree

# ============= PUBLIC ENDPOINTS =============

@router.get("/categories/tree")
async def get_categories_tree(include_inactive: bool = False):
    """
    Public endpoint: Get categories as hierarchical tree
    Used by MegaMenu, Sidebar, Popular Categories
    """
    query = {} if include_inactive else {"isActive": {"$ne": False}}
    
    categories = await db.categories_v2.find(query, {"_id": 0}).to_list(500)
    
    # If no v2 categories, try legacy categories
    if not categories:
        legacy = await db.categories.find({}, {"_id": 0}).to_list(500)
        # Convert legacy to v2 format
        categories = []
        for cat in legacy:
            categories.append({
                "id": cat.get("id"),
                "name": cat.get("name"),
                "slug": cat.get("slug"),
                "icon": cat.get("icon", "Package"),
                "parentId": cat.get("parent_id"),
                "order": 0,
                "isActive": True,
                "imageUrl": cat.get("image_url")
            })
    
    tree = await build_tree(categories)
    return tree

@router.get("/categories/icons")
async def get_available_icons():
    """Get list of available icons for categories"""
    return {"icons": AVAILABLE_ICONS}

# ============= ADMIN ENDPOINTS =============

@router.get("/admin/categories")
async def list_categories(
    include_inactive: bool = True,
    parent_id: Optional[str] = Query(None, alias="parentId")
):
    """Admin: List all categories (flat or filtered by parent)"""
    query = {}
    if not include_inactive:
        query["isActive"] = {"$ne": False}
    if parent_id is not None:
        query["parentId"] = parent_id if parent_id != "null" else None
    
    categories = await db.categories_v2.find(query, {"_id": 0}).sort("order", 1).to_list(500)
    return {"categories": categories, "total": len(categories)}

@router.post("/admin/categories")
async def create_category(data: CategoryCreate):
    """Admin: Create new category"""
    # Generate slug if not provided
    slug = data.slug or generate_slug(data.name)
    
    # Check slug uniqueness
    existing = await db.categories_v2.find_one({"slug": slug})
    if existing:
        slug = f"{slug}-{str(uuid.uuid4())[:6]}"
    
    category = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "slug": slug,
        "icon": data.icon,
        "parentId": data.parentId,
        "order": data.order,
        "isActive": data.isActive,
        "imageUrl": data.imageUrl,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat()
    }
    
    await db.categories_v2.insert_one(category)
    
    # Return without _id
    category.pop("_id", None)
    return category

@router.patch("/admin/categories/{category_id}")
async def update_category(category_id: str, data: CategoryUpdate):
    """Admin: Update category"""
    existing = await db.categories_v2.find_one({"id": category_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_dict = {"updatedAt": datetime.now(timezone.utc).isoformat()}
    
    if data.name is not None:
        update_dict["name"] = data.name
    if data.slug is not None:
        update_dict["slug"] = data.slug
    if data.icon is not None:
        update_dict["icon"] = data.icon
    if data.parentId is not None:
        update_dict["parentId"] = data.parentId if data.parentId != "" else None
    if data.order is not None:
        update_dict["order"] = data.order
    if data.isActive is not None:
        update_dict["isActive"] = data.isActive
    if data.imageUrl is not None:
        update_dict["imageUrl"] = data.imageUrl
    
    await db.categories_v2.update_one({"id": category_id}, {"$set": update_dict})
    
    updated = await db.categories_v2.find_one({"id": category_id}, {"_id": 0})
    return updated

@router.delete("/admin/categories/{category_id}")
async def delete_category(category_id: str, soft: bool = True):
    """Admin: Delete category (soft delete by default)"""
    existing = await db.categories_v2.find_one({"id": category_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    
    if soft:
        # Soft delete - just mark as inactive
        await db.categories_v2.update_one(
            {"id": category_id},
            {"$set": {"isActive": False, "updatedAt": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Category deactivated", "id": category_id}
    else:
        # Hard delete - also handle children
        await db.categories_v2.delete_many({"$or": [{"id": category_id}, {"parentId": category_id}]})
        return {"message": "Category deleted", "id": category_id}

@router.post("/admin/categories/reorder")
async def reorder_categories(items: List[dict]):
    """Admin: Reorder categories"""
    for item in items:
        if "id" in item and "order" in item:
            await db.categories_v2.update_one(
                {"id": item["id"]},
                {"$set": {"order": item["order"], "updatedAt": datetime.now(timezone.utc).isoformat()}}
            )
    return {"message": "Categories reordered", "count": len(items)}

@router.post("/admin/categories/seed")
async def seed_categories():
    """Admin: Seed default categories (for development)"""
    default_categories = [
        {"name": "Смартфони", "slug": "smartphones", "icon": "Smartphone", "order": 1},
        {"name": "Ноутбуки", "slug": "laptops", "icon": "Laptop", "order": 2},
        {"name": "Планшети", "slug": "tablets", "icon": "Tablet", "order": 3},
        {"name": "Телевізори", "slug": "tv", "icon": "Tv", "order": 4},
        {"name": "Аудіо", "slug": "audio", "icon": "Headphones", "order": 5},
        {"name": "Фото та відео", "slug": "photo-video", "icon": "Camera", "order": 6},
        {"name": "Побутова техніка", "slug": "appliances", "icon": "Home", "order": 7},
        {"name": "Аксесуари", "slug": "accessories", "icon": "Watch", "order": 8},
        {"name": "Ігри та консолі", "slug": "gaming", "icon": "Gamepad2", "order": 9},
        {"name": "Розумний дім", "slug": "smart-home", "icon": "Lightbulb", "order": 10},
    ]
    
    # Subcategories
    subcategories = [
        {"name": "iPhone", "slug": "iphone", "icon": "Smartphone", "parent": "smartphones", "order": 1},
        {"name": "Samsung", "slug": "samsung-phones", "icon": "Smartphone", "parent": "smartphones", "order": 2},
        {"name": "Xiaomi", "slug": "xiaomi-phones", "icon": "Smartphone", "parent": "smartphones", "order": 3},
        {"name": "Google Pixel", "slug": "google-pixel", "icon": "Smartphone", "parent": "smartphones", "order": 4},
        {"name": "MacBook", "slug": "macbook", "icon": "Laptop", "parent": "laptops", "order": 1},
        {"name": "Windows ноутбуки", "slug": "windows-laptops", "icon": "Laptop", "parent": "laptops", "order": 2},
        {"name": "Ігрові ноутбуки", "slug": "gaming-laptops", "icon": "Laptop", "parent": "laptops", "order": 3},
    ]
    
    created = 0
    parent_map = {}
    
    # Create root categories
    for cat in default_categories:
        existing = await db.categories_v2.find_one({"slug": cat["slug"]})
        if not existing:
            cat_id = str(uuid.uuid4())
            await db.categories_v2.insert_one({
                "id": cat_id,
                **cat,
                "parentId": None,
                "isActive": True,
                "createdAt": datetime.now(timezone.utc).isoformat()
            })
            parent_map[cat["slug"]] = cat_id
            created += 1
        else:
            parent_map[cat["slug"]] = existing["id"]
    
    # Create subcategories
    for sub in subcategories:
        existing = await db.categories_v2.find_one({"slug": sub["slug"]})
        if not existing and sub["parent"] in parent_map:
            await db.categories_v2.insert_one({
                "id": str(uuid.uuid4()),
                "name": sub["name"],
                "slug": sub["slug"],
                "icon": sub["icon"],
                "parentId": parent_map[sub["parent"]],
                "order": sub["order"],
                "isActive": True,
                "createdAt": datetime.now(timezone.utc).isoformat()
            })
            created += 1
    
    return {"message": f"Seeded {created} categories"}
