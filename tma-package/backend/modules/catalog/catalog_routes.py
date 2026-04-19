"""
V2-3: Catalog API with filters, sorting, pagination
V2-3: Categories Tree for MegaMenu
"""
from fastapi import APIRouter, Query
from typing import Optional, List
from core.db import db
import re

router = APIRouter(tags=["Catalog V2"])


# ============= CATALOG =============

@router.get("/api/v2/catalog")
async def catalog(
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    brand: Optional[str] = None,
    in_stock: Optional[bool] = None,
    sort_by: str = "popular",
    page: int = 1,
    limit: int = 24
):
    """
    Catalog endpoint with filters, sorting, pagination
    """
    q = {"status": "published"}
    
    if category:
        q["$or"] = [
            {"category_name": category},
            {"category_slug": category},
            {"category_id": category}
        ]
    
    if brand:
        q["brand"] = {"$regex": brand, "$options": "i"}
    
    if in_stock is True:
        q["stock_level"] = {"$gt": 0}
    elif in_stock is False:
        q["stock_level"] = {"$lte": 0}
    
    if min_price is not None or max_price is not None:
        price_q = {}
        if min_price is not None:
            price_q["$gte"] = min_price
        if max_price is not None:
            price_q["$lte"] = max_price
        q["price"] = price_q
    
    # Sort mapping
    sort_map = {
        "popular": [("views_count", -1), ("rating", -1)],
        "price_asc": [("price", 1)],
        "price_desc": [("price", -1)],
        "new": [("created_at", -1)],
        "rating": [("rating", -1)],
        "discount": [("compare_price", -1)]
    }
    
    sort_order = sort_map.get(sort_by, sort_map["popular"])
    skip = (page - 1) * limit
    
    cursor = db.products.find(q, {"_id": 0}).sort(sort_order).skip(skip).limit(limit)
    products = await cursor.to_list(limit)
    
    total = await db.products.count_documents(q)
    
    return {
        "products": products,
        "total": total,
        "page": page,
        "pages": (total // limit) + (1 if total % limit else 0)
    }


@router.get("/api/v2/catalog/filters")
async def get_catalog_filters(category: Optional[str] = None):
    """
    Get available filter values for catalog
    """
    q = {"status": "published"}
    if category:
        q["$or"] = [
            {"category_name": category},
            {"category_slug": category}
        ]
    
    # Get distinct brands
    brands = await db.products.distinct("brand", q)
    brands = [b for b in brands if b]
    
    # Get price range
    pipeline = [
        {"$match": q},
        {"$group": {
            "_id": None,
            "min_price": {"$min": "$price"},
            "max_price": {"$max": "$price"}
        }}
    ]
    price_result = await db.products.aggregate(pipeline).to_list(1)
    price_range = price_result[0] if price_result else {"min_price": 0, "max_price": 0}
    
    return {
        "brands": sorted(brands),
        "price_range": {
            "min": price_range.get("min_price", 0),
            "max": price_range.get("max_price", 0)
        }
    }


# ============= CATEGORIES TREE =============

@router.get("/api/v2/categories/tree")
async def categories_tree():
    """
    Get categories as tree structure for MegaMenu
    """
    items = await db.categories.find({}, {"_id": 0}).sort([("order", 1)]).to_list(1000)
    
    # If no categories_v2 structure, use flat categories
    if not items:
        items = await db.categories.find({}, {"_id": 0}).to_list(1000)
    
    # Build tree
    by_parent = {}
    for c in items:
        pid = c.get("parent_id") or None
        by_parent.setdefault(pid, []).append(c)
    
    def build(pid=None):
        result = []
        for c in by_parent.get(pid, []):
            node = {**c, "children": build(c.get("id"))}
            result.append(node)
        return result
    
    return {"tree": build(None)}


# ============= SEARCH =============

POPULAR_QUERIES_UK = ["айфон", "ноутбук", "пилосос", "телевізор", "пральна машина", "павербанк", "навушники"]
POPULAR_QUERIES_RU = ["айфон", "ноутбук", "пылесос", "телевизор", "стиральная машина", "пауэрбанк", "наушники"]

@router.get("/api/v2/search/suggest")
async def search_suggest(q: str = Query("", min_length=0), limit: int = 8, lang: str = "uk"):
    """
    Live search suggestions with categories and popular queries (B11)
    """
    q = q.strip()
    popular_pool = POPULAR_QUERIES_RU if lang == "ru" else POPULAR_QUERIES_UK
    
    if not q or len(q) < 2:
        return {
            "products": [],
            "categories": [],
            "popular": popular_pool[:5]
        }
    
    rx = re.compile(re.escape(q), re.IGNORECASE)
    
    # Get categories
    categories = []
    try:
        cat_cursor = db.categories.find(
            {"$or": [
                {"name": rx},
                {"slug": rx}
            ]},
            {"_id": 0, "id": 1, "name": 1, "slug": 1, "icon": 1}
        ).limit(6)
        cat_docs = await cat_cursor.to_list(6)
        categories = [{"slug": c.get("slug"), "name": c.get("name"), "icon": c.get("icon", "Package")} for c in cat_docs]
    except Exception:
        categories = []
    
    # Get products
    cursor = db.products.find(
        {"$or": [{"title": rx}, {"brand": rx}, {"description": rx}]},
        {"_id": 0, "id": 1, "title": 1, "name": 1, "price": 1, "compare_price": 1, "images": 1, "category_name": 1, "stock_level": 1, "rating": 1, "slug": 1}
    ).limit(limit)
    
    items = await cursor.to_list(limit)
    
    # Popular queries that match
    popular = [x for x in popular_pool if q.lower() in x.lower()][:5]
    if len(popular) < 3:
        popular = (popular + popular_pool)[:5]
    
    return {
        "products": items,
        "categories": categories,
        "popular": popular
    }


@router.get("/api/v2/search")
async def search_products(
    q: str = Query("", min_length=1),
    page: int = 1,
    limit: int = 24
):
    """
    Full search with pagination
    """
    q_str = q.strip()
    if not q_str:
        return {"products": [], "total": 0, "page": page, "pages": 0}
    
    rx = re.compile(re.escape(q_str), re.IGNORECASE)
    query = {"$or": [{"title": rx}, {"brand": rx}, {"description": rx}], "status": "published"}
    
    skip = (page - 1) * limit
    cursor = db.products.find(query, {"_id": 0}).skip(skip).limit(limit)
    products = await cursor.to_list(limit)
    
    total = await db.products.count_documents(query)
    
    return {
        "products": products,
        "total": total,
        "page": page,
        "pages": (total // limit) + (1 if total % limit else 0),
        "query": q_str
    }


@router.get("/api/v2/products/search")
async def catalog_search_products(
    q: str = Query("", description="Search query"),
    category: str = Query("", description="Category slug"),
    sort: str = Query("pop", description="Sort: pop|price_asc|price_desc|rating|new"),
    min_price: int = Query(0, description="Min price", alias="min"),
    max_price: int = Query(0, description="Max price", alias="max"),
    in_stock: str = Query("", description="1 for in stock only"),
    rating_gte: int = Query(0, description="Min rating"),
    brands: str = Query("", description="Comma-separated brands"),
    page: int = 1,
    limit: int = 24,
    lang: str = "uk"
):
    """
    Full catalog search with filters (B10/B13)
    Returns products + meta (available brands, price range)
    """
    query = {"status": "published"}
    
    # Search query
    if q.strip():
        rx = re.compile(re.escape(q.strip()), re.IGNORECASE)
        query["$or"] = [{"title": rx}, {"brand": rx}, {"description": rx}]
    
    # Category filter
    if category:
        query["$or"] = query.get("$or", [])
        query["$and"] = query.get("$and", [])
        query["$and"].append({"$or": [
            {"category_name": re.compile(re.escape(category), re.IGNORECASE)},
            {"category_id": category},
            {"category_slug": category}
        ]})
    
    # Price filter
    if min_price > 0:
        query["price"] = query.get("price", {})
        query["price"]["$gte"] = min_price
    if max_price > 0:
        query["price"] = query.get("price", {})
        query["price"]["$lte"] = max_price
    
    # In stock filter
    if in_stock == "1":
        query["stock_level"] = {"$gt": 0}
    
    # Rating filter
    if rating_gte > 0:
        query["rating"] = {"$gte": rating_gte}
    
    # Brands filter
    if brands:
        brand_list = [b.strip() for b in brands.split(",") if b.strip()]
        if brand_list:
            query["brand"] = {"$in": brand_list}
    
    # Clean up query
    if "$and" in query and not query["$and"]:
        del query["$and"]
    
    # Sort
    sort_map = {
        "pop": [("popularity", -1), ("rating", -1)],
        "price_asc": [("price", 1)],
        "price_desc": [("price", -1)],
        "rating": [("rating", -1)],
        "new": [("created_at", -1)]
    }
    sort_order = sort_map.get(sort, sort_map["pop"])
    
    skip = (page - 1) * limit
    
    cursor = db.products.find(query, {"_id": 0}).sort(sort_order).skip(skip).limit(limit)
    products = await cursor.to_list(limit)
    
    total = await db.products.count_documents(query)
    pages = max(1, (total + limit - 1) // limit)
    
    # Get meta for filters (available brands, price range)
    all_brands = []
    price_min = 0
    price_max = 0
    try:
        brands_cursor = db.products.distinct("brand", {"status": "published"})
        all_brands = [b for b in brands_cursor if b][:30]
        
        price_agg = await db.products.aggregate([
            {"$match": {"status": "published", "price": {"$gt": 0}}},
            {"$group": {"_id": None, "min": {"$min": "$price"}, "max": {"$max": "$price"}}}
        ]).to_list(1)
        if price_agg:
            price_min = price_agg[0].get("min", 0)
            price_max = price_agg[0].get("max", 0)
    except Exception:
        pass
    
    return {
        "items": products,
        "total": total,
        "page": page,
        "pages": pages,
        "meta": {
            "brands": all_brands,
            "price": {"min": price_min, "max": price_max}
        }
    }


# ============= PRODUCT V2 ENDPOINTS =============

@router.get("/api/v2/products/{product_id}/related")
async def related_products(product_id: str, limit: int = 10):
    """
    Get related products by category
    """
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        return {"products": []}
    
    category = product.get("category_name") or product.get("category_id")
    
    q = {"id": {"$ne": product_id}, "status": "published"}
    if category:
        q["$or"] = [{"category_name": category}, {"category_id": category}]
    
    cursor = db.products.find(q, {"_id": 0}).limit(limit * 2)
    items = await cursor.to_list(limit * 2)
    
    # Shuffle and return
    import random
    random.shuffle(items)
    
    return {"products": items[:limit]}


@router.get("/api/v2/products/{product_id}/bundles")
async def product_bundles(product_id: str, limit: int = 6):
    """
    Get 'buy together' products (cross-sell)
    """
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        return {"products": []}
    
    # Check for manual bundle links
    also_buy = product.get("buy_with") or []
    if also_buy:
        items = await db.products.find({"id": {"$in": also_buy}}, {"_id": 0}).to_list(20)
    else:
        # Fallback: accessories + same category
        q = {
            "id": {"$ne": product_id},
            "status": "published",
            "$or": [
                {"category_name": "accessories"},
                {"category_name": "aksesuary"},
                {"category_name": product.get("category_name")}
            ]
        }
        items = await db.products.find(q, {"_id": 0}).limit(limit * 3).to_list(limit * 3)
    
    import random
    random.shuffle(items)
    
    return {"products": items[:limit]}



# ============= DYNAMIC FILTERS (V3 - Production) =============

from bson import ObjectId
from fastapi import HTTPException, Request
from typing import Dict, Any


def _oid(x: str) -> ObjectId:
    """Convert string to ObjectId with validation"""
    try:
        return ObjectId(x)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id format")


def _norm_list(v: str) -> List[str]:
    """Parse comma-separated string to list"""
    if not v:
        return []
    return [x.strip() for x in v.split(",") if x.strip()]


def collect_descendant_ids(root_id: ObjectId, cats: List[dict]) -> List[ObjectId]:
    """Collect all descendant category IDs including root"""
    children_map: Dict[str, List[dict]] = {}
    for c in cats:
        pid = str(c.get("parent_id")) if c.get("parent_id") else None
        children_map.setdefault(pid, []).append(c)

    result = [root_id]
    stack = [str(root_id)]
    while stack:
        cur = stack.pop()
        for ch in children_map.get(cur, []):
            result.append(ch["_id"])
            stack.append(str(ch["_id"]))
    return result


@router.get("/api/v2/catalog/{category_slug}/filters")
async def get_dynamic_filters(
    category_slug: str,
    lang: str = Query("uk", pattern="^(uk|ru|ua)$")
):
    """
    Get dynamic filters for a category based on its filterSchema.
    Computes actual values from products in category.
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

    # Collect category + descendants
    cats = await db.categories.find({}, {"_id": 1, "parent_id": 1, "slug": 1}).to_list(1000)
    category_ids = collect_descendant_ids(category_id, cats)

    # Match by category_id (with legacy support for category_name/slug)
    match_legacy = {"$or": [
        {"category_id": {"$in": [str(cid) for cid in category_ids]}},
        {"category_slug": category_slug},
        {"category_name": cat.get("name_uk") or cat.get("name")}
    ]}

    # Compute price range
    price_pipeline = [
        {"$match": match_legacy},
        {"$group": {"_id": None, "min": {"$min": "$price"}, "max": {"$max": "$price"}}}
    ]
    price_stats = await db.products.aggregate(price_pipeline).to_list(1)
    min_price = float(price_stats[0]["min"]) if price_stats and price_stats[0].get("min") is not None else 0
    max_price = float(price_stats[0]["max"]) if price_stats and price_stats[0].get("max") is not None else 0

    filters_out = []
    
    # Always add price filter
    filters_out.append({
        "key": "price",
        "type": "range",
        "label": "Ціна" if lang == "uk" else "Цена",
        "min": min_price,
        "max": max_price
    })
    
    # Always add in_stock filter
    filters_out.append({
        "key": "in_stock",
        "type": "boolean",
        "label": "В наявності" if lang == "uk" else "В наличии"
    })

    # Process schema filters
    for f in schema:
        ftype = f.get("type")
        key = f.get("key")
        
        # Skip price and in_stock - already added
        if key in ("price", "in_stock"):
            continue
            
        label = f.get(f"label_{lang}") or f.get("label_uk") or f.get("label") or key

        if ftype in ("select", "color"):
            # Get distinct values for attributes.key
            pipeline = [
                {"$match": match_legacy},
                {"$group": {"_id": f"$attributes.{key}"}},
                {"$match": {"_id": {"$ne": None}}}
            ]
            vals_cursor = await db.products.aggregate(pipeline).to_list(100)
            vals = sorted(list(set(str(x["_id"]) for x in vals_cursor if x["_id"])))
            
            if vals:  # Only add filter if there are options
                filters_out.append({
                    "key": key,
                    "type": ftype,
                    "label": label,
                    "multi": bool(f.get("multi", True)),
                    "options": vals
                })

    return {
        "category": {
            "id": str(cat["_id"]),
            "slug": cat["slug"],
            "name": cat.get(f"name_{lang}") or cat.get("name_uk") or cat.get("name", "")
        },
        "filters": filters_out
    }


@router.get("/api/v2/catalog/{category_slug}/products")
async def get_catalog_products_v3(
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
    Get products for a category with dynamic attribute filtering.
    Dynamic attrs passed as: ?attr_brand=Apple,Samsung&attr_memory=256GB
    """
    # Normalize language
    if lang == "ua":
        lang = "uk"
    cat = await db.categories.find_one({"slug": category_slug})
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    # Collect category + descendants
    cats = await db.categories.find({}, {"_id": 1, "parent_id": 1}).to_list(1000)
    category_ids = collect_descendant_ids(cat["_id"], cats)

    # Build base query with legacy support
    query: Dict[str, Any] = {"$or": [
        {"category_id": {"$in": [str(cid) for cid in category_ids]}},
        {"category_slug": category_slug},
        {"category_name": cat.get("name_uk") or cat.get("name")}
    ]}

    # In stock filter
    if in_stock is True:
        query["$and"] = query.get("$and", [])
        query["$and"].append({"$or": [{"in_stock": True}, {"stock_level": {"$gt": 0}}]})

    # Price range
    if min_price is not None or max_price is not None:
        price_cond = {}
        if min_price is not None:
            price_cond["$gte"] = float(min_price)
        if max_price is not None:
            price_cond["$lte"] = float(max_price)
        query["price"] = price_cond

    # Parse dynamic attributes from query params (attr_brand, attr_memory, etc.)
    for key, value in request.query_params.items():
        if key.startswith("attr_") and value:
            attr_key = key[5:]  # Remove "attr_" prefix
            attr_values = _norm_list(value)
            if attr_values:
                query[f"attributes.{attr_key}"] = {"$in": attr_values}

    # Text search
    if q:
        rx = re.compile(re.escape(q), re.IGNORECASE)
        query["$and"] = query.get("$and", [])
        query["$and"].append({"$or": [
            {"title": rx},
            {"name": rx},
            {f"name_{lang}": rx},
            {"name_uk": rx},
            {"brand": rx}
        ]})

    # Sort options
    sort_map = {
        "popular": [("views_count", -1), ("sold_count", -1)],
        "price_asc": [("price", 1)],
        "price_desc": [("price", -1)],
        "new": [("created_at", -1)]
    }

    skip = (page - 1) * limit
    total = await db.products.count_documents(query)
    
    cursor = db.products.find(query, {"_id": 0}).sort(sort_map[sort]).skip(skip).limit(limit)
    items = await cursor.to_list(limit)

    # Format response
    for p in items:
        p["name"] = p.get(f"name_{lang}") or p.get("name_uk") or p.get("name") or p.get("title", "")

    return {
        "page": page,
        "limit": limit,
        "total": total,
        "pages": (total + limit - 1) // limit if total > 0 else 0,
        "items": items
    }


# ============= ADMIN - Category filterSchema =============

@router.get("/api/v2/admin/category/{category_id}/filter-schema")
async def admin_get_filter_schema(category_id: str):
    """Get category with filterSchema for admin editing"""
    try:
        cat = await db.categories.find_one({"_id": _oid(category_id)})
    except Exception:
        cat = await db.categories.find_one({"id": category_id})
    
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {
        "id": str(cat.get("_id", cat.get("id"))),
        "name": cat.get("name_uk") or cat.get("name"),
        "slug": cat.get("slug"),
        "filter_schema": cat.get("filter_schema") or []
    }


@router.put("/api/v2/admin/category/{category_id}/filter-schema")
async def admin_update_filter_schema(category_id: str, body: dict):
    """Update category filterSchema"""
    filter_schema = body.get("filter_schema", [])
    
    # Validate schema
    for f in filter_schema:
        if not f.get("key") or not f.get("type"):
            raise HTTPException(status_code=400, detail="Each filter must have key and type")
        if f["type"] not in ("select", "range", "boolean", "color"):
            raise HTTPException(status_code=400, detail=f"Invalid filter type: {f['type']}")

    try:
        result = await db.categories.update_one(
            {"_id": _oid(category_id)},
            {"$set": {"filter_schema": filter_schema}}
        )
    except Exception:
        result = await db.categories.update_one(
            {"id": category_id},
            {"$set": {"filter_schema": filter_schema}}
        )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"success": True, "message": "Filter schema updated"}
