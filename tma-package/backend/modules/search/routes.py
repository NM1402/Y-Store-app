"""
Search Routes - ElasticSearch-powered product search
"""
from fastapi import APIRouter, Query, Request
from typing import Optional
import os
from motor.motor_asyncio import AsyncIOMotorClient

from .service import get_search_service

router = APIRouter(prefix="/api/v2/search", tags=["Search V2"])

# Database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "ystore")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


@router.get("")
async def search_products(
    request: Request,
    q: str = Query(..., min_length=1, description="Search query"),
    category: Optional[str] = Query(None, description="Filter by category ID"),
    brand: Optional[str] = Query(None, description="Filter by brand"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price"),
    in_stock: bool = Query(True, description="Only show in-stock items"),
    sort: str = Query("relevance", description="Sort by: relevance, price_asc, price_desc, newest, popular"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    lang: str = Query("uk", description="Language for search")
):
    """
    Advanced product search with filters, sorting, and aggregations
    
    Returns products matching query with:
    - Full-text search with fuzzy matching
    - Filter by category, brand, price range
    - Aggregations (available categories, brands, price stats)
    - Pagination
    """
    service = get_search_service(db)
    
    result = await service.search_products(
        query=q,
        category_id=category,
        min_price=min_price,
        max_price=max_price,
        brand=brand,
        in_stock=in_stock,
        sort_by=sort,
        page=page,
        limit=limit,
        lang=lang
    )
    
    # Log search for analytics
    user_id = None  # Could extract from auth token
    await service.log_search(q, result.get("total", 0), user_id)
    
    return result


@router.get("/autocomplete")
async def autocomplete(
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(10, ge=1, le=20, description="Max suggestions"),
    lang: str = Query("uk", description="Language")
):
    """
    Get autocomplete suggestions for search input
    
    Returns product titles and brands matching prefix
    """
    service = get_search_service(db)
    suggestions = await service.autocomplete(q, limit, lang)
    
    return {
        "query": q,
        "suggestions": suggestions
    }


@router.get("/suggest")
async def suggest(
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(6, ge=1, le=20, description="Max suggestions")
):
    """
    Get product suggestions for live search header
    BLOCK V2-12 - Returns products with images for dropdown
    """
    if len(q) < 2:
        return {"items": []}
    
    # Search in both name and title fields
    query = {
        "$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"title": {"$regex": q, "$options": "i"}},
            {"brand": {"$regex": q, "$options": "i"}},
        ]
    }
    
    cursor = db.products.find(
        query,
        {"_id": 0, "id": 1, "name": 1, "title": 1, "price": 1, "images": 1, "brand": 1}
    ).limit(limit)
    
    items = await cursor.to_list(length=limit)
    
    # Normalize name field
    for item in items:
        if not item.get("name") and item.get("title"):
            item["name"] = item["title"]
    
    return {"items": items}


@router.get("/popular")
async def popular_searches(
    limit: int = Query(10, ge=1, le=50, description="Max results")
):
    """
    Get popular search queries
    
    Based on search logs analytics
    """
    service = get_search_service(db)
    queries = await service.get_popular_searches(limit)
    
    return {
        "popular": queries
    }


@router.get("/filters")
async def get_available_filters(
    category: Optional[str] = Query(None, description="Category ID")
):
    """
    Get available filter options for search
    
    Returns:
    - Available brands in category
    - Price range
    - Stock availability
    """
    query = {"status": {"$in": ["published", "active"]}}
    if category:
        query["category_id"] = category
    
    pipeline = [
        {"$match": query},
        {"$facet": {
            "brands": [
                {"$match": {"brand": {"$exists": True, "$ne": None}}},
                {"$group": {"_id": "$brand", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 50}
            ],
            "price_range": [
                {"$group": {
                    "_id": None,
                    "min": {"$min": "$price"},
                    "max": {"$max": "$price"}
                }}
            ],
            "categories": [
                {"$group": {"_id": "$category_id", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 30}
            ],
            "total_in_stock": [
                {"$match": {"stock_level": {"$gt": 0}}},
                {"$count": "count"}
            ]
        }}
    ]
    
    result = await db.products.aggregate(pipeline).to_list(1)
    data = result[0] if result else {}
    
    price_range = data.get("price_range", [{}])[0] if data.get("price_range") else {}
    in_stock = data.get("total_in_stock", [{}])[0].get("count", 0) if data.get("total_in_stock") else 0
    
    return {
        "brands": [{"name": b["_id"], "count": b["count"]} for b in data.get("brands", [])],
        "price_range": {
            "min": price_range.get("min", 0),
            "max": price_range.get("max", 0)
        },
        "categories": [{"id": c["_id"], "count": c["count"]} for c in data.get("categories", [])],
        "in_stock_count": in_stock
    }


@router.post("/reindex")
async def reindex_products():
    """
    Reindex all products to ElasticSearch
    
    Admin endpoint - requires authentication in production
    """
    service = get_search_service(db)
    result = await service.reindex_all()
    
    return {
        "status": "completed",
        "indexed": result["indexed"],
        "errors": result["errors"]
    }


@router.get("/stats")
async def search_stats():
    """
    Get search analytics stats
    """
    # Count total searches
    total_searches = await db.search_logs.count_documents({"type": "search"})
    
    # Top queries
    pipeline = [
        {"$match": {"type": "search"}},
        {"$group": {"_id": "$query", "count": {"$sum": 1}, "avg_results": {"$avg": "$results_count"}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    top_queries = await db.search_logs.aggregate(pipeline).to_list(10)
    
    # Zero result queries
    zero_results = await db.search_logs.count_documents({
        "type": "search",
        "results_count": 0
    })
    
    return {
        "total_searches": total_searches,
        "zero_result_rate": round(zero_results / total_searches * 100, 2) if total_searches > 0 else 0,
        "top_queries": [
            {"query": q["_id"], "count": q["count"], "avg_results": round(q["avg_results"], 1)}
            for q in top_queries
        ]
    }
