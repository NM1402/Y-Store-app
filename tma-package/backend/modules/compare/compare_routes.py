"""
BLOCK V2-19: Compare API
Backend for product comparison functionality
"""
from fastapi import APIRouter, HTTPException
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, timezone
from core.db import db

router = APIRouter(prefix="/api/v2/compare", tags=["Compare"])


class CompareRequest(BaseModel):
    product_ids: List[str]


@router.post("/products")
async def get_comparison_products(payload: CompareRequest):
    """Get full product details for comparison"""
    product_ids = payload.product_ids[:4]  # Max 4 products
    
    if not product_ids:
        return {"products": []}
    
    products = await db.products.find(
        {"id": {"$in": product_ids}},
        {"_id": 0}
    ).to_list(4)
    
    # Get specifications for comparison
    specs_keys = set()
    for p in products:
        specs = p.get("specifications") or []
        for spec in specs:
            if isinstance(spec, dict):
                specs_keys.add(spec.get("name") or spec.get("key", ""))
    
    return {
        "products": products,
        "comparison_attributes": list(specs_keys)
    }


@router.get("/specs")
async def get_comparable_specs(category: Optional[str] = None):
    """Get common specifications for comparison in a category"""
    query = {"status": "published"}
    if category:
        query["$or"] = [
            {"category_name": category},
            {"category_slug": category},
            {"category_id": category}
        ]
    
    # Get all specs from products in category
    pipeline = [
        {"$match": query},
        {"$unwind": "$specifications"},
        {"$group": {
            "_id": {
                "name": "$specifications.name",
                "key": "$specifications.key"
            },
            "count": {"$sum": 1}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 20}
    ]
    
    result = await db.products.aggregate(pipeline).to_list(20)
    
    specs = []
    for r in result:
        spec_id = r.get("_id") or {}
        name = spec_id.get("name") or spec_id.get("key")
        if name:
            specs.append({
                "name": name,
                "count": r.get("count", 0)
            })
    
    return {"specs": specs}
