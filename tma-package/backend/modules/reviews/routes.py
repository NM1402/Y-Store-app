"""
Reviews Module - Models & Routes
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from core.db import db
from core.security import get_current_user, get_current_user_optional, get_current_admin

router = APIRouter(prefix="/reviews", tags=["Reviews"])


class ReviewCreate(BaseModel):
    product_id: str
    rating: int  # 1-5
    text: str


class Review(BaseModel):
    id: str
    product_id: str
    user_id: str
    user_name: str
    rating: int
    text: str
    is_featured: bool = False
    created_at: datetime


class ReviewWithProduct(Review):
    product_name: Optional[str] = None
    product_image: Optional[str] = None


@router.get("/product/{product_id}", response_model=List[Review])
async def get_product_reviews(product_id: str):
    """Get reviews for a product"""
    reviews = await db.reviews.find(
        {"product_id": product_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return [Review(**r) for r in reviews]


@router.get("/featured", response_model=List[ReviewWithProduct])
async def get_featured_reviews():
    """Get featured reviews for homepage"""
    reviews = await db.reviews.find(
        {"is_featured": True},
        {"_id": 0}
    ).limit(10).to_list(10)
    
    result = []
    for r in reviews:
        product = await db.products.find_one({"id": r["product_id"]}, {"name": 1, "images": 1})
        result.append(ReviewWithProduct(
            **r,
            product_name=product.get("name") if product else None,
            product_image=product["images"][0] if product and product.get("images") else None
        ))
    
    return result


@router.get("/can-review/{product_id}")
async def can_review_product(
    product_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Check if user can review a product (must have purchased)"""
    # Check if user has ordered this product
    order = await db.orders.find_one({
        "user_id": current_user["id"],
        "items.product_id": product_id,
        "status": {"$in": ["delivered", "completed"]}
    })
    
    if not order:
        return {"can_review": False, "reason": "Must purchase product first"}
    
    # Check if already reviewed
    existing = await db.reviews.find_one({
        "product_id": product_id,
        "user_id": current_user["id"]
    })
    
    if existing:
        return {"can_review": False, "reason": "Already reviewed"}
    
    return {"can_review": True}


@router.post("", response_model=Review)
async def create_review(
    data: ReviewCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a review"""
    # Validate rating
    if not 1 <= data.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5")
    
    # Check product exists
    product = await db.products.find_one({"id": data.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if already reviewed
    existing = await db.reviews.find_one({
        "product_id": data.product_id,
        "user_id": current_user["id"]
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already reviewed this product")
    
    review_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    review_doc = {
        "id": review_id,
        "product_id": data.product_id,
        "user_id": current_user["id"],
        "user_name": current_user["full_name"],
        "rating": data.rating,
        "text": data.text,
        "is_featured": False,
        "created_at": now
    }
    
    await db.reviews.insert_one(review_doc)
    
    # Update product rating
    all_reviews = await db.reviews.find({"product_id": data.product_id}, {"rating": 1}).to_list(1000)
    avg_rating = sum(r["rating"] for r in all_reviews) / len(all_reviews)
    
    await db.products.update_one(
        {"id": data.product_id},
        {"$set": {"rating": round(avg_rating, 1), "reviews_count": len(all_reviews)}}
    )
    
    return Review(**review_doc)


@router.delete("/{review_id}")
async def delete_review(
    review_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete own review or admin delete any"""
    review = await db.reviews.find_one({"id": review_id})
    
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    if current_user["role"] != "admin" and review["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.reviews.delete_one({"id": review_id})
    
    # Update product rating
    product_id = review["product_id"]
    all_reviews = await db.reviews.find({"product_id": product_id}, {"rating": 1}).to_list(1000)
    
    if all_reviews:
        avg_rating = sum(r["rating"] for r in all_reviews) / len(all_reviews)
        await db.products.update_one(
            {"id": product_id},
            {"$set": {"rating": round(avg_rating, 1), "reviews_count": len(all_reviews)}}
        )
    else:
        await db.products.update_one(
            {"id": product_id},
            {"$set": {"rating": 0, "reviews_count": 0}}
        )
    
    return {"message": "Review deleted"}


# Admin routes
@router.get("/admin/all", response_model=List[ReviewWithProduct])
async def get_all_reviews_admin(current_user: dict = Depends(get_current_admin)):
    """Get all reviews (admin)"""
    reviews = await db.reviews.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    result = []
    for r in reviews:
        product = await db.products.find_one({"id": r["product_id"]}, {"name": 1, "images": 1})
        result.append(ReviewWithProduct(
            **r,
            product_name=product.get("name") if product else None,
            product_image=product["images"][0] if product and product.get("images") else None
        ))
    
    return result


@router.put("/{review_id}/featured")
async def toggle_review_featured(
    review_id: str,
    current_user: dict = Depends(get_current_admin)
):
    """Toggle featured status (admin)"""
    review = await db.reviews.find_one({"id": review_id})
    
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    new_status = not review.get("is_featured", False)
    await db.reviews.update_one({"id": review_id}, {"$set": {"is_featured": new_status}})
    
    return {"is_featured": new_status}
