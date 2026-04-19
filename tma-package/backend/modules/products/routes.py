"""
Products Module - API Routes
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import re

from core.db import db
from core.security import get_current_user, get_current_seller, get_current_admin
from .models import (
    Category, CategoryCreate, CategoryUpdate,
    Product, ProductCreate, ProductUpdate, ProductListResponse
)

router = APIRouter(prefix="/products", tags=["Products"])
categories_router = APIRouter(prefix="/categories", tags=["Categories"])


# ============ CATEGORIES ============

@categories_router.get("", response_model=List[Category])
async def get_categories(tree: bool = False):
    """Get all categories, optionally as tree structure"""
    categories = await db.categories.find({}, {"_id": 0}).to_list(1000)
    
    # Add product counts
    for cat in categories:
        cat["product_count"] = await db.products.count_documents({"category_id": cat["id"]})
    
    if not tree:
        return categories
    
    # Build tree structure
    cat_map = {c["id"]: {**c, "children": []} for c in categories}
    roots = []
    
    for cat in categories:
        if cat.get("parent_id") and cat["parent_id"] in cat_map:
            cat_map[cat["parent_id"]]["children"].append(cat_map[cat["id"]])
        else:
            roots.append(cat_map[cat["id"]])
    
    return roots


@categories_router.post("", response_model=Category)
async def create_category(
    data: CategoryCreate,
    current_user: dict = Depends(get_current_admin)
):
    """Create new category (admin only)"""
    cat_id = str(uuid.uuid4())
    
    cat_doc = {
        "id": cat_id,
        **data.model_dump()
    }
    
    await db.categories.insert_one(cat_doc)
    return Category(**cat_doc, product_count=0)


@categories_router.put("/{category_id}", response_model=Category)
async def update_category(
    category_id: str,
    data: CategoryUpdate,
    current_user: dict = Depends(get_current_admin)
):
    """Update category (admin only)"""
    update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.categories.update_one(
        {"id": category_id},
        {"$set": update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    category = await db.categories.find_one({"id": category_id}, {"_id": 0})
    category["product_count"] = await db.products.count_documents({"category_id": category_id})
    return Category(**category)


@categories_router.delete("/{category_id}")
async def delete_category(
    category_id: str,
    current_user: dict = Depends(get_current_admin)
):
    """Delete category (admin only)"""
    result = await db.categories.delete_one({"id": category_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"message": "Category deleted"}


# ============ PRODUCTS ============

@router.get("", response_model=ProductListResponse)
async def get_products(
    category_id: Optional[str] = None,
    seller_id: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    in_stock: Optional[bool] = None,
    is_bestseller: Optional[bool] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Get products with filters and pagination"""
    query = {}
    
    if category_id:
        query["category_id"] = category_id
    if seller_id:
        query["seller_id"] = seller_id
    if in_stock is not None:
        query["in_stock"] = in_stock
    if is_bestseller:
        query["is_bestseller"] = True
    if min_price is not None:
        query["price"] = {"$gte": min_price}
    if max_price is not None:
        query.setdefault("price", {})["$lte"] = max_price
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    sort_dir = -1 if sort_order == "desc" else 1
    skip = (page - 1) * limit
    
    total = await db.products.count_documents(query)
    products = await db.products.find(query, {"_id": 0})\
        .sort(sort_by, sort_dir)\
        .skip(skip)\
        .limit(limit)\
        .to_list(limit)
    
    # Enrich with category and seller names
    for p in products:
        if p.get("category_id"):
            cat = await db.categories.find_one({"id": p["category_id"]}, {"name": 1})
            p["category_name"] = cat["name"] if cat else None
        if p.get("seller_id"):
            seller = await db.users.find_one({"id": p["seller_id"]}, {"full_name": 1})
            p["seller_name"] = seller["full_name"] if seller else None
    
    return ProductListResponse(
        items=products,
        total=total,
        page=page,
        pages=(total + limit - 1) // limit
    )


@router.get("/search/suggestions")
async def search_suggestions(q: str, limit: int = 5):
    """Get search suggestions"""
    if len(q) < 2:
        return []
    
    products = await db.products.find(
        {"name": {"$regex": q, "$options": "i"}},
        {"_id": 0, "id": 1, "name": 1, "price": 1, "images": 1}
    ).limit(limit).to_list(limit)
    
    return products


@router.get("/{product_id}", response_model=Product)
async def get_product(product_id: str):
    """Get single product by ID"""
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Increment views
    await db.products.update_one({"id": product_id}, {"$inc": {"views": 1}})
    
    # Add category and seller names
    if product.get("category_id"):
        cat = await db.categories.find_one({"id": product["category_id"]}, {"name": 1})
        product["category_name"] = cat["name"] if cat else None
    if product.get("seller_id"):
        seller = await db.users.find_one({"id": product["seller_id"]}, {"full_name": 1})
        product["seller_name"] = seller["full_name"] if seller else None
    
    return Product(**product)


@router.post("", response_model=Product)
async def create_product(
    data: ProductCreate,
    current_user: dict = Depends(get_current_seller)
):
    """Create new product (seller/admin only)"""
    product_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    product_doc = {
        "id": product_id,
        "seller_id": current_user["id"],
        "rating": 0.0,
        "reviews_count": 0,
        "views": 0,
        "sales_count": 0,
        "is_bestseller": False,
        "created_at": now,
        **data.model_dump()
    }
    
    await db.products.insert_one(product_doc)
    return Product(**product_doc)


@router.put("/{product_id}", response_model=Product)
async def update_product(
    product_id: str,
    data: ProductUpdate,
    current_user: dict = Depends(get_current_seller)
):
    """Update product (owner or admin only)"""
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check ownership
    if current_user["role"] != "admin" and product["seller_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc)
    
    await db.products.update_one({"id": product_id}, {"$set": update_dict})
    
    updated = await db.products.find_one({"id": product_id}, {"_id": 0})
    return Product(**updated)


@router.delete("/{product_id}")
async def delete_product(
    product_id: str,
    current_user: dict = Depends(get_current_seller)
):
    """Delete product (owner or admin only)"""
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if current_user["role"] != "admin" and product["seller_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.products.delete_one({"id": product_id})
    return {"message": "Product deleted"}
