"""
P1.1: Catalog Facets API
Single source of truth for categories, brands, price ranges
Used by: Header MegaMenu, SidebarCatalog, PopularCategories, Filters
"""
from fastapi import APIRouter, Query
from typing import Optional, List
from motor.motor_asyncio import AsyncIOMotorClient
import os

router = APIRouter(prefix="/api/v2/catalog", tags=["Catalog V2"])

# Get db from environment
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'marketplace_db')]


@router.get("/facets")
async def get_catalog_facets(
    category_id: Optional[str] = None,
    lang: str = Query("uk", description="Language: uk or ru")
):
    """
    Get catalog facets: categories, brands, price range, specs
    Single endpoint for all filter data
    """
    
    # 1. Get all categories with product counts
    categories_pipeline = [
        {"$match": {"status": "published"}},
        {"$group": {
            "_id": "$category_id",
            "count": {"$sum": 1}
        }}
    ]
    product_counts = {
        doc["_id"]: doc["count"] 
        async for doc in db.products.aggregate(categories_pipeline)
    }
    
    # Get categories from DB
    categories_cursor = db.categories.find({}, {"_id": 0})
    categories_raw = await categories_cursor.to_list(500)
    
    # Build category tree with counts
    categories = []
    for cat in categories_raw:
        cat_id = cat.get("id")
        categories.append({
            "id": cat_id,
            "slug": cat.get("slug", ""),
            "name": cat.get("name", ""),
            "icon": cat.get("icon", "Package"),
            "parent_id": cat.get("parent_id"),
            "count": product_counts.get(cat_id, 0),
            "image_url": cat.get("image_url")
        })
    
    # Sort by count (popular first)
    categories.sort(key=lambda x: x["count"], reverse=True)
    
    # 2. Get brands with counts
    brands_pipeline = [
        {"$match": {"status": "published", "brand": {"$exists": True, "$ne": None}}},
        {"$group": {
            "_id": "$brand",
            "count": {"$sum": 1}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 50}
    ]
    brands = [
        {"name": doc["_id"], "count": doc["count"], "slug": doc["_id"].lower().replace(" ", "-")}
        async for doc in db.products.aggregate(brands_pipeline)
    ]
    
    # 3. Get price range
    price_pipeline = [
        {"$match": {"status": "published"}},
        {"$group": {
            "_id": None,
            "min": {"$min": "$price"},
            "max": {"$max": "$price"},
            "avg": {"$avg": "$price"}
        }}
    ]
    price_result = await db.products.aggregate(price_pipeline).to_list(1)
    price_range = price_result[0] if price_result else {"min": 0, "max": 100000, "avg": 10000}
    price_range.pop("_id", None)
    
    # 4. Get total products count
    total_products = await db.products.count_documents({"status": "published"})
    
    # 5. If category_id specified, get available specs for filtering
    specs = []
    if category_id:
        specs_pipeline = [
            {"$match": {"status": "published", "category_id": category_id}},
            {"$unwind": "$specifications"},
            {"$group": {
                "_id": {
                    "name": "$specifications.name",
                    "value": "$specifications.value"
                },
                "count": {"$sum": 1}
            }},
            {"$group": {
                "_id": "$_id.name",
                "values": {
                    "$push": {
                        "value": "$_id.value",
                        "count": "$count"
                    }
                }
            }},
            {"$limit": 20}
        ]
        specs = [
            {"name": doc["_id"], "values": doc["values"]}
            async for doc in db.products.aggregate(specs_pipeline)
        ]
    
    return {
        "categories": categories,
        "brands": brands,
        "price_range": {
            "min": int(price_range.get("min", 0) or 0),
            "max": int(price_range.get("max", 100000) or 100000),
            "avg": int(price_range.get("avg", 10000) or 10000)
        },
        "specs": specs,
        "total_products": total_products,
        "lang": lang
    }


@router.get("/categories/tree")
async def get_categories_tree():
    """
    Get categories as hierarchical tree for MegaMenu
    """
    categories_cursor = db.categories.find({}, {"_id": 0})
    categories = await categories_cursor.to_list(500)
    
    # Get product counts
    counts_pipeline = [
        {"$match": {"status": "published"}},
        {"$group": {"_id": "$category_id", "count": {"$sum": 1}}}
    ]
    counts = {doc["_id"]: doc["count"] async for doc in db.products.aggregate(counts_pipeline)}
    
    # Build tree
    root_cats = []
    children_map = {}
    
    for cat in categories:
        cat["count"] = counts.get(cat.get("id"), 0)
        parent_id = cat.get("parent_id")
        
        if not parent_id:
            root_cats.append(cat)
        else:
            if parent_id not in children_map:
                children_map[parent_id] = []
            children_map[parent_id].append(cat)
    
    # Attach children
    for cat in root_cats:
        cat["children"] = children_map.get(cat.get("id"), [])
        # Sort children by count
        cat["children"].sort(key=lambda x: x["count"], reverse=True)
    
    # Sort root by count
    root_cats.sort(key=lambda x: x["count"], reverse=True)
    
    return {"categories": root_cats}


@router.get("/popular-categories")
async def get_popular_categories(limit: int = 8):
    """
    Get most popular categories for homepage
    """
    # Get categories with most products
    pipeline = [
        {"$match": {"status": "published"}},
        {"$group": {"_id": "$category_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": limit}
    ]
    
    popular_ids = [doc["_id"] async for doc in db.products.aggregate(pipeline)]
    
    # Get category details
    categories = []
    for cat_id in popular_ids:
        cat = await db.categories.find_one({"id": cat_id}, {"_id": 0})
        if cat:
            # Count products
            count = await db.products.count_documents({"category_id": cat_id, "status": "published"})
            cat["count"] = count
            categories.append(cat)
    
    return {"categories": categories}
