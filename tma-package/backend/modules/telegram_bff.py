"""
Telegram BFF — Backend for Frontend layer для Telegram Mini App.
Агрегує дані у mobile-optimized DTO, щоб фронт робив менше запитів.
Використовує той самий backend-домен (products, categories, orders, users),
але віддає скомпоновані payload'и спеціально для мобільного клієнта.
"""
import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends

from core.db import db
from modules.tma.routes import product_to_out, require_tma_user, get_tma_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/telegram", tags=["Telegram BFF"])


def compact_product(p: dict) -> dict:
    """Мобільний compact DTO для карточки товару."""
    discount = None
    if p.get("old_price") and p["old_price"] > p["price"]:
        discount = round((1 - p["price"] / p["old_price"]) * 100)
    return {
        "id": p.get("id"),
        "title": p.get("title") or p.get("name"),
        "brand": p.get("brand"),
        "image": (p.get("images") or [None])[0],
        "price": float(p.get("price") or 0),
        "old_price": float(p["old_price"]) if p.get("old_price") else None,
        "discount": discount,
        "rating": float(p.get("rating") or 0),
        "reviews": int(p.get("reviews_count") or 0),
        "in_stock": bool(p.get("in_stock", True)),
        "bestseller": bool(p.get("is_bestseller", False)),
    }


# ========================= BOOTSTRAP =========================

@router.get("/bootstrap")
async def bootstrap(authorization: Optional[str] = None):
    """Первинне завантаження mini-app: config + user (якщо є)."""
    user = await get_tma_user(authorization)
    return {
        "config": {
            "currency": "UAH",
            "currency_symbol": "₴",
            "free_shipping_threshold": 2000,
            "shipping_flat": 70,
            "support_url": "https://t.me/p_fomo_bot",
            "phone": "+380502474161",
        },
        "user": user,
        "authenticated": user is not None,
    }


# ========================= HOME =========================

@router.get("/home")
async def home_feed(authorization: Optional[str] = None):
    """Агрегована mobile home: один запит — увесь стрічковий фід."""
    user = await get_tma_user(authorization)

    # Quick categories (тільки важливе)
    cats_cur = db.categories.find({}, {"_id": 0})
    cats = [c async for c in cats_cur]
    cats.sort(key=lambda x: -(x.get("product_count") or 0))
    quick_categories = [
        {
            "id": c.get("id"),
            "slug": c.get("slug"),
            "name": c.get("name_uk") or c.get("name"),
            "emoji": c.get("icon"),
            "count": int(c.get("product_count") or 0),
        }
        for c in cats[:8]
    ]

    # Hero banners
    hero = [
        {
            "id": "h1",
            "title": "Apple SALE",
            "subtitle": "Знижки до −30%",
            "accent": "#111827",
            "bg": "https://images.unsplash.com/photo-1603791239531-1dda55e194a6?w=800",
            "cta_slug": "smartphones",
        },
        {
            "id": "h2",
            "title": "Нові MacBook",
            "subtitle": "Вже у продажу",
            "accent": "#0f172a",
            "bg": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800",
            "cta_slug": "laptops",
        },
    ]

    # Rows
    bestsellers_cur = db.products.find({"is_bestseller": True}, {"_id": 0}).limit(10)
    bestsellers = [compact_product(p) async for p in bestsellers_cur]

    new_cur = db.products.find({}, {"_id": 0}).sort("created_at", -1).limit(10)
    new_arrivals = [compact_product(p) async for p in new_cur]

    # Recently viewed (з tma_recently_viewed)
    recent: list = []
    if user:
        rv = await db.tma_recently_viewed.find_one({"user_id": user["id"]}, {"_id": 0})
        ids = (rv or {}).get("product_ids", [])[:10]
        if ids:
            prods = await db.products.find({"id": {"$in": ids}}, {"_id": 0}).to_list(20)
            pmap = {p["id"]: p for p in prods}
            recent = [compact_product(pmap[i]) for i in ids if i in pmap]

    # Greeting
    if user:
        name = (user.get("full_name") or "").split(" ")[0] or "друже"
        greeting = f"Вітаємо, {name} 👋"
    else:
        greeting = "Ласкаво просимо 👋"

    return {
        "greeting": greeting,
        "hero": hero,
        "quick_categories": quick_categories,
        "rows": [
            {"key": "bestsellers", "title": "Хіти продажу", "items": bestsellers},
            {"key": "new", "title": "Новинки", "items": new_arrivals},
            *([{"key": "recent", "title": "Ви переглядали", "items": recent}] if recent else []),
        ],
    }


# ========================= CATALOG =========================

@router.get("/catalog")
async def catalog_feed(
    category: Optional[str] = None,
    q: Optional[str] = None,
    sort: str = "default",
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    limit: int = 30,
    skip: int = 0,
):
    query: dict[str, Any] = {}
    if category:
        query["$or"] = [{"category_slug": category}, {"category_id": category}]
    if q:
        query["$and"] = query.get("$and", []) + [
            {
                "$or": [
                    {"title": {"$regex": q, "$options": "i"}},
                    {"brand": {"$regex": q, "$options": "i"}},
                ]
            }
        ]
    if min_price is not None or max_price is not None:
        price_q: dict = {}
        if min_price is not None:
            price_q["$gte"] = min_price
        if max_price is not None:
            price_q["$lte"] = max_price
        query["price"] = price_q

    sort_spec: list = [("is_bestseller", -1), ("rating", -1)]
    if sort == "price_asc":
        sort_spec = [("price", 1)]
    elif sort == "price_desc":
        sort_spec = [("price", -1)]
    elif sort == "new":
        sort_spec = [("created_at", -1)]
    elif sort == "popular":
        sort_spec = [("reviews_count", -1), ("rating", -1)]

    cur = db.products.find(query, {"_id": 0}).sort(sort_spec).skip(skip).limit(limit)
    items = [compact_product(p) async for p in cur]
    total = await db.products.count_documents(query)

    # Для зручного UI — брендів у поточному зрізі
    if category and not q:
        brand_pipe = [
            {"$match": query},
            {"$group": {"_id": "$brand", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10},
        ]
        brands = [
            {"name": b["_id"], "count": b["count"]}
            async for b in db.products.aggregate(brand_pipe)
            if b.get("_id")
        ]
    else:
        brands = []

    return {
        "items": items,
        "total": total,
        "has_more": skip + len(items) < total,
        "brands": brands,
    }


# ========================= PRODUCT =========================

@router.get("/product/{product_id}")
async def product_detail(
    product_id: str, authorization: Optional[str] = None
):
    p = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not p:
        from fastapi import HTTPException
        raise HTTPException(404, "Product not found")

    user = await get_tma_user(authorization)

    # запис у recently viewed
    if user:
        rv = await db.tma_recently_viewed.find_one({"user_id": user["id"]}, {"_id": 0})
        ids = [product_id] + [i for i in (rv or {}).get("product_ids", []) if i != product_id]
        ids = ids[:30]
        await db.tma_recently_viewed.update_one(
            {"user_id": user["id"]},
            {"$set": {"user_id": user["id"], "product_ids": ids}},
            upsert=True,
        )

    # Reviews aggregate (короткий preview)
    rv_cur = db.reviews.find({"product_id": product_id}, {"_id": 0}).sort("created_at", -1).limit(3)
    reviews_preview = [r async for r in rv_cur]
    all_reviews = await db.reviews.count_documents({"product_id": product_id})
    avg = 0.0
    if all_reviews:
        rating_agg = db.reviews.aggregate(
            [
                {"$match": {"product_id": product_id}},
                {"$group": {"_id": None, "avg": {"$avg": "$rating"}}},
            ]
        )
        async for row in rating_agg:
            avg = round(row.get("avg", 0), 1)

    # Related
    related_cur = db.products.find(
        {"category_id": p.get("category_id"), "id": {"$ne": product_id}},
        {"_id": 0},
    ).limit(8)
    related = [compact_product(x) async for x in related_cur]

    # Is favorite
    is_fav = False
    if user:
        f = await db.tma_favorites.find_one({"user_id": user["id"], "product_id": product_id})
        is_fav = bool(f)

    full = product_to_out(p)
    full["is_favorite"] = is_fav
    full["reviews_preview"] = reviews_preview
    full["reviews_total"] = all_reviews
    full["reviews_avg"] = avg
    full["related"] = related
    full["in_cart"] = False  # фронт сам знає з локального cart

    return full


# ========================= SEARCH =========================

@router.get("/search/suggest")
async def search_suggest(q: str, limit: int = 6):
    if not q or len(q.strip()) < 2:
        return {"items": [], "popular_queries": ["iPhone", "MacBook", "AirPods", "Samsung", "PS5"]}
    cur = db.products.find(
        {"$or": [
            {"title": {"$regex": q, "$options": "i"}},
            {"brand": {"$regex": q, "$options": "i"}},
        ]},
        {"_id": 0},
    ).limit(limit)
    items = [compact_product(p) async for p in cur]
    return {"items": items, "popular_queries": []}


# ========================= CHECKOUT =========================

@router.post("/checkout/summary")
async def checkout_summary(payload: dict):
    """Порахувати суму у реальному часі (qty changes)."""
    items = payload.get("items", [])
    if not items:
        return {"items": [], "subtotal": 0, "shipping": 0, "total": 0, "count": 0}
    pids = [i["product_id"] for i in items]
    prods = await db.products.find({"id": {"$in": pids}}, {"_id": 0}).to_list(len(pids))
    pmap = {p["id"]: p for p in prods}

    result_items = []
    subtotal = 0.0
    count = 0
    for item in items:
        p = pmap.get(item["product_id"])
        if not p:
            continue
        qty = int(item.get("quantity", 1))
        price = float(p.get("price") or 0)
        line = price * qty
        subtotal += line
        count += qty
        result_items.append({
            "product_id": p["id"],
            "title": p.get("title"),
            "image": (p.get("images") or [None])[0],
            "price": price,
            "quantity": qty,
            "line_total": round(line, 2),
        })

    shipping = 0.0 if subtotal >= 2000 or subtotal == 0 else 70.0
    total = subtotal + shipping

    return {
        "items": result_items,
        "count": count,
        "subtotal": round(subtotal, 2),
        "shipping": round(shipping, 2),
        "total": round(total, 2),
        "free_shipping_remaining": max(0, 2000 - subtotal) if shipping else 0,
    }


# ========================= ORDERS =========================

@router.get("/orders")
async def my_orders(user: dict = Depends(require_tma_user)):
    cur = db.orders.find({"buyer_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(50)
    out = []
    async for o in cur:
        out.append({
            "id": o.get("id"),
            "order_number": o.get("order_number"),
            "status": o.get("status", "new"),
            "payment_status": o.get("payment_status"),
            "total": float(o.get("total_amount") or 0),
            "currency": o.get("currency", "UAH"),
            "items_count": len(o.get("items", [])),
            "first_item": (o.get("items") or [{}])[0],
            "created_at": o.get("created_at"),
        })
    return {"items": out}


@router.get("/order/{order_id}")
async def order_detail(order_id: str, user: dict = Depends(require_tma_user)):
    from fastapi import HTTPException
    o = await db.orders.find_one({"id": order_id, "buyer_id": user["id"]}, {"_id": 0})
    if not o:
        raise HTTPException(404, "Order not found")
    return o


# ========================= PROFILE =========================

@router.get("/profile")
async def profile_summary(user: dict = Depends(require_tma_user)):
    orders_count = await db.orders.count_documents({"buyer_id": user["id"]})
    fav_count = await db.tma_favorites.count_documents({"user_id": user["id"]})
    total_spent_agg = db.orders.aggregate([
        {"$match": {"buyer_id": user["id"], "status": {"$in": ["delivered", "completed", "paid"]}}},
        {"$group": {"_id": None, "sum": {"$sum": "$total_amount"}}},
    ])
    total_spent = 0.0
    async for row in total_spent_agg:
        total_spent = float(row.get("sum") or 0)

    return {
        "user": user,
        "stats": {
            "orders": orders_count,
            "favorites": fav_count,
            "total_spent": round(total_spent, 2),
        },
    }
