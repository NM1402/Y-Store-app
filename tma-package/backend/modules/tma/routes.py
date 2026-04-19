"""
Telegram Mini App — Auth & order routes.

Валідація Telegram WebApp initData згідно офіційної документації:
https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
"""
import hashlib
import hmac
import json
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from urllib.parse import parse_qsl

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel

from core.db import db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tma", tags=["Telegram Mini App"])

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
SESSION_TTL_DAYS = 30


# ======================= Helpers =======================

def validate_init_data(init_data: str, bot_token: str) -> Optional[dict]:
    """Перевірити підпис Telegram WebApp initData."""
    if not init_data or not bot_token:
        return None
    try:
        parsed = dict(parse_qsl(init_data, keep_blank_values=True))
        received_hash = parsed.pop("hash", None)
        if not received_hash:
            return None

        data_check_string = "\n".join(
            f"{k}={v}" for k, v in sorted(parsed.items())
        )
        secret_key = hmac.new(
            b"WebAppData", bot_token.encode("utf-8"), hashlib.sha256
        ).digest()
        calc_hash = hmac.new(
            secret_key, data_check_string.encode("utf-8"), hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(calc_hash, received_hash):
            return None

        if "user" in parsed:
            try:
                parsed["user"] = json.loads(parsed["user"])
            except Exception:
                pass
        return parsed
    except Exception as e:
        logger.error(f"Telegram initData validation failed: {e}")
        return None


async def get_tma_user(
    authorization: Optional[str] = Header(None),
) -> Optional[dict]:
    """Дістати користувача TMA з Bearer session_token."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization[7:]
    session = await db.tma_sessions.find_one({"token": token}, {"_id": 0})
    if not session:
        return None
    expires = session.get("expires_at")
    if isinstance(expires, str):
        expires = datetime.fromisoformat(expires)
    if expires and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires and expires < datetime.now(timezone.utc):
        return None
    user = await db.users.find_one(
        {"id": session["user_id"]}, {"_id": 0, "password_hash": 0}
    )
    return user


async def require_tma_user(
    authorization: Optional[str] = Header(None),
) -> dict:
    user = await get_tma_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="TMA session required")
    return user


# ======================= Models =======================

class TMAInitRequest(BaseModel):
    init_data: str


class TMAAuthResponse(BaseModel):
    token: str
    user: dict


class TMAProductOut(BaseModel):
    id: str
    title: str
    description: Optional[str] = ""
    price: float
    old_price: Optional[float] = None
    images: list = []
    category_id: Optional[str] = None
    category_slug: Optional[str] = None
    brand: Optional[str] = None
    rating: Optional[float] = None
    reviews_count: int = 0
    in_stock: bool = True
    is_bestseller: bool = False
    specifications: dict = {}


class TMACategoryOut(BaseModel):
    id: str
    name: str
    slug: str
    icon: Optional[str] = None
    image: Optional[str] = None
    product_count: int = 0


class TMACartItem(BaseModel):
    product_id: str
    quantity: int = 1


class TMACartPayload(BaseModel):
    items: list[TMACartItem]


class TMACheckoutRequest(BaseModel):
    items: list[TMACartItem]
    full_name: str
    phone: str
    email: Optional[str] = None
    city: str
    warehouse: str
    # Nova Poshta refs (required for real delivery)
    city_ref: Optional[str] = None
    warehouse_ref: Optional[str] = None
    # first_name / last_name — optional split for nicer invoices
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    payment_method: str = "cash_on_delivery"  # 'card' | 'cash' | 'cash_on_delivery'
    comment: Optional[str] = None


# ======================= Normalizer =======================

def product_to_out(p: dict) -> dict:
    title = p.get("title") or p.get("name") or "Товар"
    price = float(p.get("price") or 0)
    old = p.get("old_price") or p.get("compare_price")
    return {
        "id": p.get("id"),
        "title": title,
        "description": p.get("description") or "",
        "price": price,
        "old_price": float(old) if old else None,
        "images": p.get("images") or [],
        "category_id": p.get("category_id"),
        "category_slug": p.get("category_slug"),
        "brand": p.get("brand"),
        "rating": p.get("rating"),
        "reviews_count": int(p.get("reviews_count") or 0),
        "in_stock": bool(p.get("in_stock", True)),
        "is_bestseller": bool(p.get("is_bestseller", False)),
        "specifications": p.get("specifications") or {},
    }


# ======================= Auth endpoint =======================

@router.post("/auth", response_model=TMAAuthResponse)
async def tma_auth(payload: TMAInitRequest):
    """Обмін Telegram initData на session_token."""
    sandbox_mode = os.environ.get("TMA_ALLOW_SANDBOX") == "1"
    if not BOT_TOKEN and not sandbox_mode:
        raise HTTPException(500, "Bot token not configured")

    parsed = validate_init_data(payload.init_data, BOT_TOKEN) if BOT_TOKEN else None

    # Dev-режим: дозволити auth без підпису якщо передали пустий init_data
    # або sandbox (для тестування з браузера без Telegram)
    if not parsed:
        if os.environ.get("TMA_ALLOW_SANDBOX") == "1" and payload.init_data.startswith("sandbox:"):
            tg_user_id = int(payload.init_data.split(":", 1)[1] or "1")
            tg_user = {
                "id": tg_user_id,
                "first_name": "Sandbox",
                "username": f"sandbox_{tg_user_id}",
            }
        else:
            raise HTTPException(401, "Invalid Telegram signature")
    else:
        tg_user = parsed.get("user") or {}
        if not tg_user.get("id"):
            raise HTTPException(400, "Telegram user not provided")

    tg_id = str(tg_user["id"])
    now = datetime.now(timezone.utc)

    existing = await db.users.find_one({"telegram_id": tg_id}, {"_id": 0})
    if existing:
        user_id = existing["id"]
        await db.users.update_one(
            {"id": user_id},
            {"$set": {
                "telegram_username": tg_user.get("username"),
                "full_name": existing.get("full_name") or (
                    f"{tg_user.get('first_name','')} {tg_user.get('last_name','')}".strip()
                ),
                "telegram_photo_url": tg_user.get("photo_url"),
                "last_seen_at": now.isoformat(),
            }}
        )
    else:
        user_id = str(uuid.uuid4())
        await db.users.insert_one({
            "id": user_id,
            "telegram_id": tg_id,
            "telegram_username": tg_user.get("username"),
            "telegram_photo_url": tg_user.get("photo_url"),
            "full_name": f"{tg_user.get('first_name','')} {tg_user.get('last_name','')}".strip() or "Користувач",
            "email": None,
            "phone": None,
            "role": "customer",
            "source": "telegram_tma",
            "created_at": now.isoformat(),
        })

    token = uuid.uuid4().hex + uuid.uuid4().hex
    await db.tma_sessions.insert_one({
        "token": token,
        "user_id": user_id,
        "telegram_id": tg_id,
        "created_at": now,
        "expires_at": now + timedelta(days=SESSION_TTL_DAYS),
    })

    user_doc = await db.users.find_one(
        {"id": user_id}, {"_id": 0, "password_hash": 0}
    )
    return {"token": token, "user": user_doc}


@router.get("/me")
async def tma_me(user: dict = Depends(require_tma_user)):
    return user


# ======================= Catalog endpoints =======================

@router.get("/categories")
async def tma_categories():
    cats = await db.categories.find({}, {"_id": 0}).to_list(100)
    out = []
    for c in cats:
        out.append({
            "id": c.get("id"),
            "name": c.get("name_uk") or c.get("name") or "Категорія",
            "slug": c.get("slug"),
            "icon": c.get("icon"),
            "image": c.get("image"),
            "product_count": int(c.get("product_count") or 0),
        })
    out.sort(key=lambda x: -x["product_count"])
    return out


@router.get("/products")
async def tma_products(
    category: Optional[str] = None,
    q: Optional[str] = None,
    sort: str = "featured",
    limit: int = 50,
    skip: int = 0,
):
    query: dict[str, Any] = {}
    if category:
        query["$or"] = [{"category_slug": category}, {"category_id": category}]
    if q:
        query["$and"] = query.get("$and", []) + [{
            "$or": [
                {"title": {"$regex": q, "$options": "i"}},
                {"name": {"$regex": q, "$options": "i"}},
                {"description": {"$regex": q, "$options": "i"}},
                {"brand": {"$regex": q, "$options": "i"}},
            ]
        }]

    sort_spec = [("is_bestseller", -1), ("rating", -1)]
    if sort == "price_asc":
        sort_spec = [("price", 1)]
    elif sort == "price_desc":
        sort_spec = [("price", -1)]
    elif sort == "new":
        sort_spec = [("created_at", -1)]

    cur = db.products.find(query, {"_id": 0}).sort(sort_spec).skip(skip).limit(limit)
    items = [product_to_out(p) async for p in cur]
    total = await db.products.count_documents(query)
    return {"items": items, "total": total}


@router.get("/products/{product_id}")
async def tma_product(product_id: str):
    p = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Product not found")
    data = product_to_out(p)

    # related
    related_cur = db.products.find(
        {"category_id": p.get("category_id"), "id": {"$ne": product_id}},
        {"_id": 0}
    ).limit(6)
    data["related"] = [product_to_out(x) async for x in related_cur]
    return data


@router.get("/home")
async def tma_home():
    """Головна сторінка Mini App: слайдер, бестселери, популярні категорії."""
    bestsellers_cur = db.products.find(
        {"is_bestseller": True}, {"_id": 0}
    ).limit(10)
    bestsellers = [product_to_out(p) async for p in bestsellers_cur]

    new_cur = db.products.find({}, {"_id": 0}).sort("created_at", -1).limit(10)
    new_items = [product_to_out(p) async for p in new_cur]

    cats_cur = db.categories.find({}, {"_id": 0})
    cats = [c async for c in cats_cur]
    cats.sort(key=lambda x: -(x.get("product_count") or 0))
    categories = [{
        "id": c.get("id"),
        "name": c.get("name_uk") or c.get("name"),
        "slug": c.get("slug"),
        "icon": c.get("icon"),
        "image": c.get("image"),
        "product_count": int(c.get("product_count") or 0),
    } for c in cats[:8]]

    banners = [
        {
            "id": "b1",
            "title": "Знижки до -30%",
            "subtitle": "На техніку Apple",
            "image": "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=1200",
            "cta_slug": "smartphones",
        },
        {
            "id": "b2",
            "title": "Нова колекція",
            "subtitle": "Ноутбуки 2024",
            "image": "https://images.unsplash.com/photo-1593642532454-e138e28a63f4?w=1200",
            "cta_slug": "laptops",
        },
    ]

    return {
        "banners": banners,
        "categories": categories,
        "bestsellers": bestsellers,
        "new_arrivals": new_items,
    }


# ======================= Cart & Orders =======================

@router.post("/cart/preview")
async def tma_cart_preview(payload: TMACartPayload):
    """Швидкий розрахунок кошика без збереження."""
    if not payload.items:
        return {"items": [], "subtotal": 0, "count": 0}
    pids = [i.product_id for i in payload.items]
    prods = await db.products.find(
        {"id": {"$in": pids}}, {"_id": 0}
    ).to_list(len(pids))
    pmap = {p["id"]: p for p in prods}
    out_items = []
    subtotal = 0.0
    count = 0
    for item in payload.items:
        p = pmap.get(item.product_id)
        if not p:
            continue
        price = float(p.get("price") or 0)
        line_total = price * item.quantity
        subtotal += line_total
        count += item.quantity
        out_items.append({
            **product_to_out(p),
            "quantity": item.quantity,
            "line_total": line_total,
        })
    return {
        "items": out_items,
        "subtotal": round(subtotal, 2),
        "count": count,
    }


@router.post("/orders")
async def tma_create_order(
    payload: TMACheckoutRequest,
    user: dict = Depends(require_tma_user),
):
    """Створення замовлення з Mini App."""
    if not payload.items:
        raise HTTPException(400, "Cart is empty")

    pids = [i.product_id for i in payload.items]
    prods = await db.products.find(
        {"id": {"$in": pids}}, {"_id": 0}
    ).to_list(len(pids))
    pmap = {p["id"]: p for p in prods}

    order_items = []
    subtotal = 0.0
    for item in payload.items:
        p = pmap.get(item.product_id)
        if not p:
            raise HTTPException(404, f"Product {item.product_id} not found")
        price = float(p.get("price") or 0)
        subtotal += price * item.quantity
        order_items.append({
            "product_id": p["id"],
            "title": p.get("title") or p.get("name"),
            "quantity": item.quantity,
            "price": price,
            "image": (p.get("images") or [None])[0],
        })

    order_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    order_number = f"TMA-{now.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    shipping_cost = 0 if subtotal >= 2000 else 70
    total = subtotal + shipping_cost

    order_doc = {
        "id": order_id,
        "order_number": order_number,
        "buyer_id": user["id"],
        "source": "telegram_tma",
        "customer": {
            "full_name": payload.full_name,
            "first_name": payload.first_name,
            "last_name": payload.last_name,
            "phone": payload.phone,
            "email": payload.email,
            # Telegram contact info — щоб адмін міг написати клієнту прямо з бота
            "telegram_id": user.get("telegram_id"),
            "telegram_username": user.get("telegram_username"),
        },
        "delivery": {
            "method": "nova_poshta",
            "city_name": payload.city,
            "city_ref": payload.city_ref,
            "warehouse_name": payload.warehouse,
            "warehouse_ref": payload.warehouse_ref,
            "delivery_cost": shipping_cost,
        },
        "items": order_items,
        "subtotal": round(subtotal, 2),
        "shipping_cost": shipping_cost,
        "total_amount": round(total, 2),
        "currency": "UAH",
        "status": "new",
        "payment_status": "pending",
        "payment_method": payload.payment_method,
        "comment": payload.comment,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }

    await db.orders.insert_one(order_doc)

    # --- WayForPay: для оплати карткою створюємо payment session і повертаємо payment_url ---
    payment_url = None
    if payload.payment_method in ("card", "wayforpay", "online", "prepaid"):
        try:
            from modules.payments.providers.wayforpay import WayForPayProvider
            provider = WayForPayProvider()
            if provider.merchant_account and provider.merchant_secret:
                wfp_order = {
                    "id": order_id,
                    "total": round(total, 2),
                    "items": [
                        {
                            "title": it["title"],
                            "quantity": it["quantity"],
                            "price": it["price"],
                        }
                        for it in order_items
                    ],
                    "customer": {
                        "name": payload.full_name,
                        "phone": payload.phone,
                        "email": payload.email or "",
                    },
                }
                pay = await provider.create_payment(wfp_order)
                payment_url = pay.get("checkout_url")
                await db.orders.update_one(
                    {"id": order_id},
                    {"$set": {
                        "payment": {
                            "provider": "WAYFORPAY",
                            "checkout_url": payment_url,
                            "provider_payment_id": pay.get("provider_payment_id"),
                            "form_data": pay.get("form_data"),
                            "method": pay.get("method"),
                        },
                        "status": "pending_payment",
                        "payment_status": "pending",
                        "updated_at": now.isoformat(),
                    }},
                )
                # Reflect new status in doc returned to client
                order_doc["status"] = "pending_payment"
                order_doc["payment_status"] = "pending"
                order_doc["payment"] = {
                    "provider": "WAYFORPAY",
                    "checkout_url": payment_url,
                    "provider_payment_id": pay.get("provider_payment_id"),
                    "method": pay.get("method"),
                }
            else:
                logger.warning("WayForPay not configured (missing merchant account/secret); skipping payment session")
        except Exception as e:
            logger.error(f"WayForPay create_payment failed for {order_id}: {e}")

    # Для cash_on_delivery (накладений платіж) — одразу створюємо реальну ТТН Нової Пошти
    if payload.payment_method in ("cash_on_delivery", "cash"):
        try:
            from modules.bot.bot_actions_service import BotActionsService
            actions = BotActionsService(db)
            ttn_res = await actions.create_ttn(order_id)
            if ttn_res.get("ok"):
                ttn = ttn_res.get("ttn")
                logger.info(f"✅ Auto-TTN {ttn} created for cash order {order_id}")
                # Reflect in returned doc
                updated = await db.orders.find_one({"id": order_id}, {"_id": 0})
                if updated:
                    order_doc["status"] = updated.get("status")
                    order_doc["delivery"] = updated.get("delivery") or order_doc.get("delivery")
            else:
                logger.warning(f"Auto-TTN failed for {order_id}: {ttn_res.get('error')} {ttn_res.get('details')}")
        except Exception as e:
            logger.error(f"Auto-TTN error for {order_id}: {e}")

    # Надіслати алерт адмінам (bot_settings.admin_chat_ids) + використовувати AlertsService
    try:
        from modules.bot.alerts_service import AlertsService
        alerts = AlertsService(db)
        await alerts.init()
        # Адаптер формату для AlertsService (він очікує shipping / totals)
        adapted = {
            "id": order_id,
            "totals": {"grand": total},
            "shipping": {
                "full_name": payload.full_name,
                "phone": payload.phone,
                "city": payload.city,
                "warehouse": payload.warehouse,
            },
        }
        await alerts.alert_new_order(adapted)
    except Exception as e:
        logger.warning(f"AlertsService enqueue failed: {e}")

    # Fallback: direct Telegram send (якщо бот не запущений або alerts worker не крутить чергу)
    try:
        import httpx
        settings_doc = await db.bot_settings.find_one({"id": "global"})
        admin_ids = settings_doc.get("admin_chat_ids", []) if settings_doc else []
        if admin_ids and BOT_TOKEN:
            pay_label = "💳 Картка (WayForPay)" if payload.payment_method == "card" else "💵 Накладений платіж"
            status_label = "⏳ Очікує оплати" if payload.payment_method == "card" else "🆕 Новий"

            tg_id = user.get("telegram_id")
            tg_username = user.get("telegram_username")
            tg_link = None
            if tg_username:
                tg_link = f"https://t.me/{tg_username}"
            elif tg_id and not str(tg_id).startswith("sandbox"):
                tg_link = f"tg://user?id={tg_id}"

            msg = (
                f"🧾 <b>Нове замовлення з Mini App</b>\n\n"
                f"№ <code>{order_number}</code>\n"
                f"👤 {payload.full_name}\n"
                f"☎️ <code>{payload.phone}</code>\n"
                f"📍 {payload.city}, {payload.warehouse}\n\n"
                f"💰 Сума: <b>{total:.2f} ₴</b>\n"
                f"💳 Оплата: {pay_label}\n"
                f"📊 Статус: {status_label}\n"
                f"📦 Товарів: {len(order_items)}"
            )
            if tg_username:
                msg += f"\n💬 Telegram: @{tg_username}"

            # Inline buttons: "Написати клієнту" + "Деталі"
            kb_rows = []
            if tg_link:
                kb_rows.append([{"text": "💬 Написати клієнту", "url": tg_link}])
            kb_rows.append([
                {"text": "📦 Створити ТТН", "callback_data": f"create_ttn:{order_id}"},
                {"text": "👁 Деталі", "callback_data": f"view_order:{order_id}"},
            ])
            reply_markup = {"inline_keyboard": kb_rows}

            async with httpx.AsyncClient(timeout=5) as client:
                for cid in admin_ids:
                    try:
                        await client.post(
                            f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                            json={
                                "chat_id": cid,
                                "text": msg,
                                "parse_mode": "HTML",
                                "reply_markup": reply_markup,
                            },
                        )
                    except Exception as ie:
                        logger.warning(f"Admin alert send failed: {ie}")
    except Exception as e:
        logger.warning(f"Admin alerts error: {e}")

    # Прибрати _id перед поверненням
    order_out = {k: v for k, v in order_doc.items() if k != "_id"}
    if payment_url:
        order_out["payment_url"] = payment_url
    order_out["success"] = True
    return order_out


@router.get("/orders")
async def tma_list_orders(user: dict = Depends(require_tma_user)):
    cur = db.orders.find(
        {"buyer_id": user["id"], "source": "telegram_tma"},
        {"_id": 0},
    ).sort("created_at", -1).limit(50)
    items = [o async for o in cur]
    return {"orders": items, "total": len(items)}


@router.get("/orders/{order_id}")
async def tma_get_order(
    order_id: str, user: dict = Depends(require_tma_user)
):
    o = await db.orders.find_one(
        {"id": order_id, "buyer_id": user["id"]}, {"_id": 0}
    )
    if not o:
        raise HTTPException(404, "Order not found")
    return o


@router.delete("/orders/{order_id}")
async def tma_delete_order(
    order_id: str, user: dict = Depends(require_tma_user)
):
    """
    Дозволено видалення тільки неоплачених замовлень:
    new, pending_payment, awaiting_payment, payment_failed, cancelled.
    Заборонено: paid, confirmed, shipped, delivered, refunded.
    """
    o = await db.orders.find_one(
        {"id": order_id, "buyer_id": user["id"]}, {"_id": 0}
    )
    if not o:
        raise HTTPException(404, "Order not found")

    allowed = {"new", "pending_payment", "awaiting_payment", "payment_failed", "cancelled"}
    if o.get("status") not in allowed:
        raise HTTPException(
            400,
            detail=f"Cannot delete order in status '{o.get('status')}'. Allowed only for unpaid orders."
        )

    # Не має ТТН — точно безпечно видалити
    if (o.get("delivery") or {}).get("tracking_number") or (o.get("shipment") or {}).get("ttn"):
        raise HTTPException(400, "Cannot delete order with tracking number")

    await db.orders.delete_one({"id": order_id, "buyer_id": user["id"]})
    return {"success": True, "id": order_id, "deleted": True}


@router.post("/orders/{order_id}/simulate-payment")
async def tma_simulate_payment(
    order_id: str, user: dict = Depends(require_tma_user)
):
    """
    TEST-ONLY: симуляція успішної оплати для перевірки UI/статусів.
    Працює тільки коли TMA_ALLOW_SANDBOX=1 (dev/preview).
    """
    import os as _os
    if _os.getenv("TMA_ALLOW_SANDBOX") != "1":
        raise HTTPException(403, "Simulation disabled in production")

    o = await db.orders.find_one(
        {"id": order_id, "buyer_id": user["id"]}, {"_id": 0}
    )
    if not o:
        raise HTTPException(404, "Order not found")
    if o.get("status") not in ("pending_payment", "awaiting_payment", "payment_failed", "new"):
        return {"success": False, "status": o.get("status"), "message": "Already processed"}

    now = datetime.now(timezone.utc)
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "status": "paid",
            "payment": {
                **(o.get("payment") or {}),
                "provider": (o.get("payment") or {}).get("provider") or "SIMULATION",
                "status": "PAID",
                "paid_at": now.isoformat(),
                "simulated": True,
            },
            "updated_at": now.isoformat(),
        }}
    )

    # Fire admin notification (same як для реальної оплати)
    try:
        from modules.bot.alerts_service import AlertsService
        alerts = AlertsService(db)
        await alerts.init()
        adapted = {
            "id": order_id,
            "totals": {"grand": o.get("total_amount", 0)},
            "shipping": {
                "full_name": (o.get("customer") or {}).get("full_name", ""),
                "phone": (o.get("customer") or {}).get("phone", ""),
            },
        }
        await alerts.alert_order_paid(adapted)

        import httpx as _httpx
        settings_doc = await db.bot_settings.find_one({"id": "global"})
        admin_ids = settings_doc.get("admin_chat_ids", []) if settings_doc else []
        if admin_ids and BOT_TOKEN:
            msg = (
                f"✅ <b>Оплату отримано (SIMULATION)</b>\n\n"
                f"№ <code>{o.get('order_number', order_id)}</code>\n"
                f"Сума: <b>{float(o.get('total_amount', 0)):.2f} ₴</b>\n"
                f"Клієнт: {(o.get('customer') or {}).get('full_name', '-')}"
            )
            async with _httpx.AsyncClient(timeout=5) as c:
                for cid in admin_ids:
                    try:
                        await c.post(
                            f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                            json={"chat_id": cid, "text": msg, "parse_mode": "HTML"},
                        )
                    except Exception:
                        pass
    except Exception as e:
        logger.warning(f"Simulation alert error: {e}")

    # Auto-TTN after simulated payment (same as real paid flow)
    try:
        from modules.bot.bot_actions_service import BotActionsService
        actions = BotActionsService(db)
        ttn_res = await actions.create_ttn(order_id)
        if ttn_res.get("ok"):
            logger.info(f"✅ Auto-TTN created after simulation for order {order_id}: {ttn_res.get('ttn')}")
        else:
            logger.warning(f"Auto-TTN after simulation failed: {ttn_res.get('error')} {ttn_res.get('details')}")
    except Exception as te:
        logger.warning(f"Auto-TTN after simulation error: {te}")

    updated = await db.orders.find_one({"id": order_id}, {"_id": 0})
    return {"success": True, "order": updated}


@router.get("/store-info")
@router.get("/store-info")
async def get_store_info():
    """
    Інформація про магазин (ФОП, контакти, реквізити)
    """
    return {
        "name": "Y-Store",
        "full_name": "ФОП Сліпченко Світлана Віталіївна",
        "description": "Y-Store — український маркетплейс корисних речей. Побутова техніка, освітлення, краса та здоров'я, товари для дітей і тварин, блекаут, електроніка та товари для військових — усе від перевірених постачальників, швидко та чесно.",
        "slogan": "Усе для дому та тилу — в одному магазині",
        "about": {
            "mission": "Зробити купівлю корисних речей — від побуту до блекауту — простою, чесною та швидкою для кожного українця.",
            "values": [
                "Широкий асортимент товарів для життя",
                "Прозорі ціни без прихованих комісій",
                "Швидка доставка Новою Поштою 1–2 дні",
                "Повернення 14 днів без зайвих питань",
                "Підтримка українських військових і тилу",
                "Зручна оплата — карткою або при отриманні"
            ],
            "year_founded": 2020,
            "total_customers": "10,000+",
            "total_orders": "25,000+"
        },
        "contacts": {
            "phone": "+380 (99) 123-45-67",
            "email": "support@y-store.ua",
            "telegram": "@Ystore_app_bot",
            "viber": "+380991234567",
            "work_hours": "Пн-Нд: 9:00 - 21:00"
        },
        "legal": {
            "fop_name": "ФОП Сліпченко Світлана Віталіївна",
            "edrpou": "1234567890",
            "iban": "UA123456789012345678901234567",
            "bank": "ПриватБанк",
            "address": "м. Київ, вул. Хрещатик, 1",
            "license": "Свідоцтво про державну реєстрацію ФОП серія АБВ №123456"
        },
        "delivery": {
            "providers": ["Нова Пошта", "УкрПошта"],
            "free_delivery_from": 5000,
            "delivery_time": "1-3 дні",
            "available_cities": "По всій Україні"
        },
        "payment": {
            "methods": [
                {
                    "id": "cash_on_delivery",
                    "name": "Накладений платіж",
                    "description": "Оплата готівкою при отриманні",
                    "icon": "💵",
                    "available": True
                },
                {
                    "id": "card",
                    "name": "Оплата карткою",
                    "description": "Visa, Mastercard",
                    "icon": "💳",
                    "available": True
                },
                {
                    "id": "privat24",
                    "name": "ПриватБанк",
                    "description": "Онлайн оплата через Privat24",
                    "icon": "🏦",
                    "available": True
                },
                {
                    "id": "monobank",
                    "name": "Monobank",
                    "description": "Оплата через Monobank",
                    "icon": "🏦",
                    "available": True
                }
            ]
        },
        "warranty": {
            "official": True,
            "period": "12-24 місяці",
            "service_centers": "По всій Україні"
        },
        "social": {
            "instagram": "@ystore_ua",
            "facebook": "fb.com/ystore",
            "telegram_channel": "@ystore_news"
        }
    }


@router.get("/my-orders")
async def get_my_orders(user: dict = Depends(require_tma_user)):
    """
    Отримати замовлення поточного користувача
    """
    orders = await db.orders.find(
        {"buyer_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    return {"orders": orders}


# ======================= Support =======================

class SupportTicketRequest(BaseModel):
    subject: str
    message: str
    contact_info: Optional[str] = None


@router.post("/support/ticket")
async def create_support_ticket(
    payload: SupportTicketRequest,
    user: dict = Depends(require_tma_user),
):
    """
    Створити тікет підтримки від користувача TMA
    """
    ticket_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    ticket = {
        "id": ticket_id,
        "user_id": user["id"],
        "telegram_id": user.get("telegram_id"),
        "user_name": user.get("full_name") or "Користувач",
        "subject": payload.subject,
        "message": payload.message,
        "contact_info": payload.contact_info,
        "status": "new",
        "source": "tma",
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    
    await db.support_tickets.insert_one(ticket)
    
    # Надіслати повідомлення адмінам в Telegram
    try:
        import httpx
        bot_token = os.environ.get("TELEGRAM_BOT_TOKEN")
        
        # Знайти адмінів
        admins = await db.bot_admins.find({"active": True}, {"_id": 0}).to_list(100)
        
        msg_text = (
            f"🆘 <b>Нове звернення в підтримку</b>\n\n"
            f"👤 <b>Користувач:</b> {ticket['user_name']}\n"
            f"📝 <b>Тема:</b> {payload.subject}\n"
            f"💬 <b>Повідомлення:</b>\n{payload.message}\n\n"
            f"🆔 Ticket ID: <code>{ticket_id}</code>"
        )
        
        async with httpx.AsyncClient() as client:
            for admin in admins:
                try:
                    await client.post(
                        f"https://api.telegram.org/bot{bot_token}/sendMessage",
                        json={
                            "chat_id": admin["user_id"],
                            "text": msg_text,
                            "parse_mode": "HTML"
                        },
                        timeout=5.0
                    )
                except Exception as e:
                    logger.error(f"Failed to notify admin {admin['user_id']}: {e}")
    except Exception as e:
        logger.error(f"Failed to send support notifications: {e}")
    
    return {
        "success": True,
        "ticket_id": ticket_id,
        "message": "Ваше звернення отримано. Ми відповімо найближчим часом."
    }


@router.get("/support/my-tickets")
async def get_my_support_tickets(user: dict = Depends(require_tma_user)):
    """
    Отримати тікети підтримки користувача
    """
    tickets = await db.support_tickets.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    return {"tickets": tickets}


# ======================= Admin Utils =======================

@router.post("/admin/make-me-admin")
async def make_me_admin(user: dict = Depends(require_tma_user)):
    """
    DEV ONLY: Зробити поточного користувача адміном
    """
    telegram_id = user.get("telegram_id")
    if not telegram_id:
        raise HTTPException(400, "Telegram ID not found")
    
    telegram_id_int = int(telegram_id)
    
    # Додати до bot_admins
    await db.bot_admins.update_one(
        {"user_id": telegram_id_int},
        {
            "$set": {
                "user_id": telegram_id_int,
                "role": "OWNER",
                "active": True,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            "$setOnInsert": {
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        },
        upsert=True
    )
    
    return {
        "success": True,
        "message": f"Користувач {telegram_id_int} тепер OWNER адмін!",
        "telegram_id": telegram_id_int,
        "role": "OWNER"
    }
