"""
Catalog V2 Routes - Tree, Filters, Products with dynamic attributes
"""
from fastapi import APIRouter, Query, HTTPException, Request
from typing import Optional, List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import re

router = APIRouter(prefix="/api/v2/catalog", tags=["catalog-v2"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]


def _norm_list(v: Optional[str]) -> Optional[List[str]]:
    """Parse comma-separated string to list: 'Apple,Samsung' -> ['Apple','Samsung']"""
    if not v:
        return None
    return [x.strip() for x in v.split(",") if x.strip()]


def str_id(doc: dict) -> dict:
    """Convert _id to string id"""
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


# ============= TREE ENDPOINT =============

@router.get("/tree")
async def get_categories_tree(lang: str = Query("uk", pattern="^(uk|ru|ua)$")):
    """
    Get categories as hierarchical tree
    Returns: { items: [...] } with nested children
    """
    # Normalize language
    if lang == "ua":
        lang = "uk"
    # Find all active categories
    cursor = db.categories.find({}).sort([("order", 1), ("name", 1)])
    cats = await cursor.to_list(500)
    
    # Build lookup by id
    by_id = {}
    for c in cats:
        c["id"] = str(c["_id"])
        # Get localized name
        c["name"] = c.get(f"name_{lang}") or c.get("name_uk") or c.get("name_ru") or c.get("name", "")
        c["parent_id"] = str(c["parent_id"]) if c.get("parent_id") else None
        c["children"] = []
        by_id[c["id"]] = c
        # Remove mongo _id
        del c["_id"]
    
    # Build tree
    roots = []
    for c in cats:
        pid = c["parent_id"]
        if pid and pid in by_id:
            by_id[pid]["children"].append(c)
        else:
            roots.append(c)
    
    return {"items": roots}


# ============= FILTERS ENDPOINT =============

@router.get("/{category_slug}/filters")
async def get_filters_for_category(
    category_slug: str, 
    lang: str = Query("uk", pattern="^(uk|ru|ua)$")
):
    """
    Get dynamic filters for category based on filterSchema
    Computes available options from actual product attributes
    """
    # Normalize language
    if lang == "ua":
        lang = "uk"
    # Find category
    cat = await db.categories.find_one({"slug": category_slug})
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    
    schema = cat.get("filter_schema") or []
    category_id = cat["_id"]
    
    # Collect category + all descendants (for subcategory filtering)
    all_cats = await db.categories.find({}, {"_id": 1, "parent_id": 1}).to_list(500)
    children_map: Dict[str, List] = {}
    for c in all_cats:
        pid = str(c.get("parent_id")) if c.get("parent_id") else None
        children_map.setdefault(pid, []).append(c)
    
    def collect_descendant_ids(root_id: ObjectId) -> List[ObjectId]:
        """Recursively collect all descendant category IDs"""
        out = [root_id]
        stack = [str(root_id)]
        while stack:
            cur = stack.pop()
            for ch in children_map.get(cur, []):
                out.append(ch["_id"])
                stack.append(str(ch["_id"]))
        return out
    
    category_ids = collect_descendant_ids(category_id)
    
    # Base match for products in this category tree
    match = {"category_id": {"$in": [str(cid) for cid in category_ids]}, "status": "published"}
    
    # Compute price range
    price_pipeline = [
        {"$match": match},
        {"$group": {"_id": None, "min": {"$min": "$price"}, "max": {"$max": "$price"}}}
    ]
    price_stats = await db.products.aggregate(price_pipeline).to_list(1)
    min_price = float(price_stats[0]["min"]) if price_stats and price_stats[0].get("min") is not None else 0
    max_price = float(price_stats[0]["max"]) if price_stats and price_stats[0].get("max") is not None else 0
    
    # Build filters from schema
    filters_out = []
    for f in schema:
        ftype = f.get("type")
        key = f.get("key")
        label = f.get(f"label_{lang}") or f.get("label_uk") or key
        
        if ftype == "range" and key == "price":
            filters_out.append({
                "key": "price", 
                "type": "range", 
                "label": label, 
                "min": min_price, 
                "max": max_price
            })
            continue
        
        if ftype == "boolean" and key == "in_stock":
            filters_out.append({
                "key": "in_stock", 
                "type": "boolean", 
                "label": label
            })
            continue
        
        if ftype in ("select", "color"):
            # Get distinct values for this attribute from products
            pipeline = [
                {"$match": match},
                {"$group": {"_id": f"$attributes.{key}"}},
                {"$match": {"_id": {"$ne": None}}}
            ]
            vals_cursor = db.products.aggregate(pipeline)
            vals = [x["_id"] async for x in vals_cursor]
            vals = sorted(list(set(v for v in vals if v)))
            
            filters_out.append({
                "key": key,
                "type": ftype,
                "label": label,
                "multi": bool(f.get("multi", True)),
                "options": vals
            })
    
    return {
        "category": {
            "slug": cat["slug"], 
            "name": cat.get(f"name_{lang}") or cat.get("name_uk") or cat.get("name")
        }, 
        "filters": filters_out
    }


# ============= PRODUCTS ENDPOINT =============

@router.get("/{category_slug}/products")
async def get_catalog_products(
    request: Request,
    category_slug: str,
    lang: str = Query("uk", pattern="^(uk|ru|ua)$"),
    q: Optional[str] = None,
    sort: str = Query("popular", pattern="^(popular|price_asc|price_desc|new)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(24, ge=1, le=100),
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    in_stock: Optional[bool] = None,
):
    """
    Get products for category with dynamic attribute filtering
    Supports: ?attr_brand=Apple,Samsung&attr_memory=256GB
    """
    # Normalize language
    if lang == "ua":
        lang = "uk"
    # Find category
    cat = await db.categories.find_one({"slug": category_slug})
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    
    category_id = cat["_id"]
    
    # Collect all descendant categories
    all_cats = await db.categories.find({}, {"_id": 1, "parent_id": 1}).to_list(500)
    children_map: Dict[str, List] = {}
    for c in all_cats:
        pid = str(c.get("parent_id")) if c.get("parent_id") else None
        children_map.setdefault(pid, []).append(c)
    
    def collect_ids(root_id: ObjectId) -> List[str]:
        out = [str(root_id)]
        stack = [str(root_id)]
        while stack:
            cur = stack.pop()
            for ch in children_map.get(cur, []):
                out.append(str(ch["_id"]))
                stack.append(str(ch["_id"]))
        return out
    
    category_ids = collect_ids(category_id)
    
    # Build query
    query: Dict[str, Any] = {
        "category_id": {"$in": category_ids},
        "status": "published"
    }
    
    # Stock filter
    if in_stock is True:
        query["stock_level"] = {"$gt": 0}
    
    # Price filter
    if min_price is not None or max_price is not None:
        query["price"] = {}
        if min_price is not None:
            query["price"]["$gte"] = float(min_price)
        if max_price is not None:
            query["price"]["$lte"] = float(max_price)
        if not query["price"]:
            del query["price"]
    
    # Dynamic attribute filters from query params (attr_brand, attr_memory, etc.)
    for key, value in request.query_params.items():
        if key.startswith("attr_") and value:
            attr_key = key[5:]  # Remove 'attr_' prefix
            values = _norm_list(value)
            if values:
                query[f"attributes.{attr_key}"] = {"$in": values}
    
    # Text search
    if q:
        search_regex = {"$regex": q, "$options": "i"}
        query["$or"] = [
            {"title": search_regex},
            {"description": search_regex},
            {"slug": search_regex}
        ]
    
    # Sorting
    sort_map = {
        "popular": [("views_count", -1), ("rating", -1)],
        "price_asc": [("price", 1)],
        "price_desc": [("price", -1)],
        "new": [("created_at", -1)]
    }
    
    # Execute query
    skip = (page - 1) * limit
    total = await db.products.count_documents(query)
    
    cursor = db.products.find(query, {"_id": 0}).sort(sort_map[sort]).skip(skip).limit(limit)
    items = await cursor.to_list(limit)
    
    # Localize names
    for p in items:
        p["name"] = p.get(f"name_{lang}") or p.get("name_uk") or p.get("name_ru") or p.get("title", "")
    
    return {
        "page": page, 
        "limit": limit, 
        "total": total, 
        "items": items
    }


# ============= ADMIN: UPDATE CATEGORY FILTER SCHEMA =============

@router.put("/admin/categories/{category_id}/filter-schema")
async def update_category_filter_schema(category_id: str, data: dict):
    """
    Admin: Update filterSchema for a category
    Body: { filter_schema: [...] }
    """
    filter_schema = data.get("filter_schema", [])
    
    # Validate schema
    for f in filter_schema:
        if not f.get("key") or not f.get("type"):
            raise HTTPException(status_code=400, detail="Each filter must have key and type")
        if f["type"] not in ("select", "range", "boolean", "color"):
            raise HTTPException(status_code=400, detail=f"Invalid filter type: {f['type']}")
    
    result = await db.categories.update_one(
        {"id": category_id},
        {"$set": {"filter_schema": filter_schema}}
    )
    
    if result.modified_count == 0:
        # Try with slug
        result = await db.categories.update_one(
            {"slug": category_id},
            {"$set": {"filter_schema": filter_schema}}
        )
    
    return {"success": True, "modified": result.modified_count}


# ============= ADMIN: UPDATE PRODUCT ATTRIBUTES =============

@router.put("/admin/products/{product_id}/attributes")
async def update_product_attributes(product_id: str, data: dict):
    """
    Admin: Update attributes for a product
    Body: { attributes: {...} }
    """
    attributes = data.get("attributes", {})
    
    result = await db.products.update_one(
        {"id": product_id},
        {"$set": {"attributes": attributes}}
    )
    
    return {"success": True, "modified": result.modified_count}
