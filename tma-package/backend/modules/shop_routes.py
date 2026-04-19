"""
Shop routes — поиск, общий каталог, избранное, отзывы и тикеты поддержки.
Используется TMA фронтендом.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.db import db
from modules.tma.routes import require_tma_user, product_to_out

logger = logging.getLogger(__name__)
router = APIRouter()


# ======================= Models =======================

class FavoriteToggleRequest(BaseModel):
    product_id: str


class ReviewCreateRequest(BaseModel):
    product_id: str
    rating: int
    comment: str


class SupportTicketRequest(BaseModel):
    subject: str
    message: str
    order_id: Optional[str] = None


# ======================= Favorites =======================

@router.get("/tma/favorites")
async def list_favorites(user: dict = Depends(require_tma_user)):
    cur = db.tma_favorites.find({"user_id": user["id"]}, {"_id": 0})
    favs = [f async for f in cur]
    pids = [f["product_id"] for f in favs]
    if not pids:
        return {"items": []}
    prods = await db.products.find({"id": {"$in": pids}}, {"_id": 0}).to_list(len(pids))
    items = [product_to_out(p) for p in prods]
    return {"items": items}


@router.get("/tma/favorites/ids")
async def favorite_ids(user: dict = Depends(require_tma_user)):
    cur = db.tma_favorites.find({"user_id": user["id"]}, {"_id": 0, "product_id": 1})
    ids = [f["product_id"] async for f in cur]
    return {"ids": ids}


@router.post("/tma/favorites/toggle")
async def toggle_favorite(
    payload: FavoriteToggleRequest,
    user: dict = Depends(require_tma_user),
):
    existing = await db.tma_favorites.find_one(
        {"user_id": user["id"], "product_id": payload.product_id}
    )
    if existing:
        await db.tma_favorites.delete_one(
            {"user_id": user["id"], "product_id": payload.product_id}
        )
        return {"status": "removed", "product_id": payload.product_id}
    await db.tma_favorites.insert_one({
        "user_id": user["id"],
        "product_id": payload.product_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"status": "added", "product_id": payload.product_id}


# ======================= Reviews =======================

@router.get("/tma/products/{product_id}/reviews")
async def product_reviews(product_id: str):
    cur = db.reviews.find({"product_id": product_id}, {"_id": 0}).sort("created_at", -1).limit(100)
    items = [r async for r in cur]
    if items:
        avg = sum(r.get("rating", 0) for r in items) / len(items)
    else:
        avg = 0.0
    return {"items": items, "count": len(items), "average": round(avg, 1)}


@router.post("/tma/reviews")
async def create_review(
    payload: ReviewCreateRequest,
    user: dict = Depends(require_tma_user),
):
    if payload.rating < 1 or payload.rating > 5:
        raise HTTPException(400, "Rating must be 1..5")
    review = {
        "id": str(uuid.uuid4()),
        "product_id": payload.product_id,
        "user_id": user["id"],
        "user_name": user.get("full_name") or "Користувач",
        "rating": int(payload.rating),
        "comment": payload.comment,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.reviews.insert_one(review)

    # оновити агрегат в картці товару
    all_reviews = await db.reviews.find(
        {"product_id": payload.product_id}, {"_id": 0}
    ).to_list(10000)
    avg = sum(r.get("rating", 0) for r in all_reviews) / max(len(all_reviews), 1)
    await db.products.update_one(
        {"id": payload.product_id},
        {"$set": {"rating": round(avg, 1), "reviews_count": len(all_reviews)}},
    )
    review.pop("_id", None)
    return review


# ======================= Support tickets =======================

@router.get("/tma/support/tickets")
async def list_tickets(user: dict = Depends(require_tma_user)):
    cur = db.tma_support_tickets.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).limit(50)
    return {"items": [t async for t in cur]}


@router.post("/tma/support/tickets")
async def create_ticket(
    payload: SupportTicketRequest,
    user: dict = Depends(require_tma_user),
):
    ticket_id = str(uuid.uuid4())
    ticket_no = f"SP-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:5].upper()}"
    doc = {
        "id": ticket_id,
        "ticket_no": ticket_no,
        "user_id": user["id"],
        "subject": payload.subject[:200],
        "message": payload.message[:2000],
        "order_id": payload.order_id,
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "telegram_username": user.get("telegram_username"),
        "telegram_id": user.get("telegram_id"),
        "full_name": user.get("full_name"),
    }
    await db.tma_support_tickets.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ======================= Search autosuggest =======================

@router.get("/tma/search/suggest")
async def search_suggest(q: str, limit: int = 6):
    if not q or len(q.strip()) < 2:
        return {"items": []}
    cur = db.products.find(
        {"$or": [
            {"title": {"$regex": q, "$options": "i"}},
            {"brand": {"$regex": q, "$options": "i"}},
        ]},
        {"_id": 0, "id": 1, "title": 1, "price": 1, "images": 1, "brand": 1},
    ).limit(limit)
    items = []
    async for p in cur:
        items.append({
            "id": p.get("id"),
            "title": p.get("title"),
            "price": float(p.get("price") or 0),
            "image": (p.get("images") or [None])[0],
            "brand": p.get("brand"),
        })
    return {"items": items}
