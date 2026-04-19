"""
V2-2: Cabinet API - My Orders, Order Details, Guest Linking, OTP Auth
Includes guest cabinet with phone OTP authentication
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import random
import logging
from jose import JWTError, jwt

from core.db import db
from core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v2/cabinet", tags=["Cabinet V2"])


# ============= OTP Models =============

class OTPRequest(BaseModel):
    phone: str

class OTPVerify(BaseModel):
    phone: str
    code: str

class OTPResponse(BaseModel):
    success: bool
    message: str
    expires_in: Optional[int] = None

class CabinetSession(BaseModel):
    token: str
    phone: str
    expires_at: str


async def get_auth_user(request: Request) -> dict:
    """Get authenticated user from JWT token or session - REQUIRED"""
    # First try to get Bearer token from Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:]
        
        # Try JWT token first
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            user_id = payload.get("sub")
            if user_id:
                user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
                if user:
                    return user
        except JWTError:
            pass
        
        # Fall back to session token lookup
        session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
        if session:
            user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0, "password_hash": 0})
            if user:
                return user
    
    # Try session token from cookies
    session_token = request.cookies.get("session_token")
    if session_token:
        session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
        if session:
            user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0, "password_hash": 0})
            if user:
                return user
    
    raise HTTPException(status_code=401, detail="Unauthorized")


@router.get("/profile")
async def get_profile(request: Request):
    """Get current user profile"""
    user = await get_auth_user(request)
    return user


@router.put("/profile")
async def update_profile(request: Request):
    """Update user profile"""
    user = await get_auth_user(request)
    body = await request.json()
    
    allowed = ["full_name", "phone", "city", "address", "np_department"]
    update_data = {k: v for k, v in body.items() if k in allowed and v}
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return updated


@router.get("/orders")
async def get_my_orders(request: Request, page: int = 1, limit: int = 20):
    """Get user's orders with pagination"""
    user = await get_auth_user(request)
    
    skip = (page - 1) * limit
    
    cursor = db.orders.find(
        {"buyer_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit)
    
    orders = await cursor.to_list(limit)
    total = await db.orders.count_documents({"buyer_id": user["id"]})
    
    return {
        "orders": orders,
        "total": total,
        "page": page,
        "pages": (total // limit) + (1 if total % limit else 0)
    }


@router.get("/orders/{order_id}")
async def get_order_details(order_id: str, request: Request):
    """Get order details by ID"""
    user = await get_auth_user(request)
    
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check ownership
    if order.get("buyer_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get TTN tracking if available
    if order.get("delivery", {}).get("ttn"):
        ttn = order["delivery"]["ttn"]
        tracking = await db.ttn_tracking.find_one({"ttn": ttn}, {"_id": 0})
        order["tracking"] = tracking
    
    return order


@router.post("/orders/{order_id}/repeat")
async def repeat_order(order_id: str, request: Request):
    """Add items from previous order to cart"""
    user = await get_auth_user(request)
    
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.get("buyer_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get or create cart
    cart = await db.carts.find_one({"user_id": user["id"]})
    if not cart:
        cart = {"user_id": user["id"], "items": []}
    
    # Add order items to cart
    cart_items = cart.get("items", [])
    for item in order.get("items", []):
        existing = next((i for i in cart_items if i.get("product_id") == item.get("product_id")), None)
        if existing:
            existing["quantity"] += item.get("quantity", 1)
        else:
            cart_items.append({
                "product_id": item.get("product_id"),
                "quantity": item.get("quantity", 1),
                "price": item.get("price"),
                "title": item.get("title"),
                "image": item.get("image")
            })
    
    await db.carts.update_one(
        {"user_id": user["id"]},
        {"$set": {"items": cart_items, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"message": "Items added to cart", "items_count": len(cart_items)}


@router.get("/wishlist")
async def get_wishlist(request: Request):
    """Get user's wishlist"""
    user = await get_auth_user(request)
    
    wishlist = await db.wishlists.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not wishlist:
        return {"items": []}
    
    # Get product details
    product_ids = wishlist.get("product_ids", [])
    if product_ids:
        products = await db.products.find(
            {"id": {"$in": product_ids}},
            {"_id": 0}
        ).to_list(100)
        return {"items": products}
    
    return {"items": []}


@router.post("/wishlist/{product_id}")
async def add_to_wishlist(product_id: str, request: Request):
    """Add product to wishlist"""
    user = await get_auth_user(request)
    
    await db.wishlists.update_one(
        {"user_id": user["id"]},
        {"$addToSet": {"product_ids": product_id}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"message": "Added to wishlist"}


@router.delete("/wishlist/{product_id}")
async def remove_from_wishlist(product_id: str, request: Request):
    """Remove product from wishlist"""
    user = await get_auth_user(request)
    
    await db.wishlists.update_one(
        {"user_id": user["id"]},
        {"$pull": {"product_ids": product_id}}
    )
    
    return {"message": "Removed from wishlist"}


# ============= REVIEWS IN CABINET =============

@router.get("/products-to-review")
async def get_products_to_review(request: Request):
    """
    Get products that user can review (purchased in delivered/completed orders, not yet reviewed)
    """
    user = await get_auth_user(request)
    
    # Get delivered/completed orders
    orders = await db.orders.find({
        "buyer_id": user["id"],
        "status": {"$in": ["delivered", "completed"]}
    }, {"_id": 0}).to_list(100)
    
    # Get all purchased product IDs
    purchased_items = []
    for order in orders:
        for item in order.get("items", []):
            purchased_items.append({
                "product_id": item.get("product_id"),
                "title": item.get("title"),
                "image": item.get("image"),
                "order_id": order.get("id"),
                "order_number": order.get("order_number"),
                "order_date": order.get("created_at")
            })
    
    # Get existing reviews by this user
    user_reviews = await db.reviews.find(
        {"user_id": user["id"]},
        {"product_id": 1, "_id": 0}
    ).to_list(1000)
    reviewed_product_ids = {r["product_id"] for r in user_reviews}
    
    # Filter to only unreviewd products
    products_to_review = [
        p for p in purchased_items 
        if p["product_id"] not in reviewed_product_ids
    ]
    
    # Remove duplicates (same product from multiple orders)
    seen = set()
    unique_products = []
    for p in products_to_review:
        if p["product_id"] not in seen:
            seen.add(p["product_id"])
            unique_products.append(p)
    
    return {
        "products": unique_products,
        "total": len(unique_products)
    }


@router.get("/orders/{order_id}/reviewable-items")
async def get_order_reviewable_items(order_id: str, request: Request):
    """
    Get items from a specific order that can be reviewed
    """
    user = await get_auth_user(request)
    
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.get("buyer_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Only delivered/completed orders can have reviews
    if order.get("status") not in ["delivered", "completed"]:
        return {"items": [], "can_review": False, "reason": "Order not delivered yet"}
    
    # Get user's existing reviews
    user_reviews = await db.reviews.find(
        {"user_id": user["id"]},
        {"product_id": 1, "_id": 0}
    ).to_list(1000)
    reviewed_product_ids = {r["product_id"] for r in user_reviews}
    
    # Build reviewable items list
    items = []
    for item in order.get("items", []):
        product_id = item.get("product_id")
        items.append({
            "product_id": product_id,
            "title": item.get("title"),
            "image": item.get("image"),
            "price": item.get("price"),
            "can_review": product_id not in reviewed_product_ids,
            "already_reviewed": product_id in reviewed_product_ids
        })
    
    return {
        "items": items,
        "can_review": True,
        "order_status": order.get("status")
    }


# ============= OTP CABINET (GUEST ACCESS) =============

async def get_cabinet_session(request: Request) -> Optional[dict]:
    """Get cabinet session from token (for guest access)"""
    cabinet_token = request.cookies.get("cabinet_token")
    if not cabinet_token:
        auth_header = request.headers.get("X-Cabinet-Token")
        if auth_header:
            cabinet_token = auth_header
    
    if not cabinet_token:
        return None
    
    session = await db.cabinet_sessions.find_one({"token": cabinet_token}, {"_id": 0})
    if not session:
        return None
    
    # Check expiry
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        return None
    
    return session


@router.post("/otp/request", response_model=OTPResponse)
async def request_otp(data: OTPRequest):
    """
    Request OTP code for guest cabinet access
    MOCKED: Does not actually send SMS, just creates OTP in DB
    """
    phone = data.phone.replace(" ", "").replace("-", "")
    
    if len(phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")
    
    # Check for existing orders with this phone
    orders_count = await db.orders.count_documents({"customer.phone": phone})
    if orders_count == 0:
        raise HTTPException(status_code=404, detail="Немає замовлень з цим номером телефону")
    
    # Generate 6-digit OTP
    otp_code = str(random.randint(100000, 999999))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    
    # Save OTP
    await db.cabinet_otps.update_one(
        {"phone": phone},
        {
            "$set": {
                "code": otp_code,
                "expires_at": expires_at.isoformat(),
                "used": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    # MOCKED: In production, send SMS here
    logger.info(f"[MOCKED SMS] OTP for {phone}: {otp_code}")
    
    return OTPResponse(
        success=True,
        message=f"Код надіслано на {phone}. [DEV: код {otp_code}]",
        expires_in=300
    )


@router.post("/otp/verify")
async def verify_otp(data: OTPVerify):
    """
    Verify OTP and create cabinet session
    Returns session token for subsequent requests
    """
    phone = data.phone.replace(" ", "").replace("-", "")
    
    otp_record = await db.cabinet_otps.find_one({"phone": phone}, {"_id": 0})
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="OTP не знайдено. Спробуйте ще раз")
    
    if otp_record.get("used"):
        raise HTTPException(status_code=400, detail="Код вже використано")
    
    # Check expiry
    expires_at = otp_record.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Код протермінований")
    
    if otp_record.get("code") != data.code:
        raise HTTPException(status_code=400, detail="Невірний код")
    
    # Mark OTP as used
    await db.cabinet_otps.update_one(
        {"phone": phone},
        {"$set": {"used": True}}
    )
    
    # Create cabinet session
    session_token = str(uuid.uuid4())
    session_expires = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.cabinet_sessions.insert_one({
        "token": session_token,
        "phone": phone,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": session_expires.isoformat()
    })
    
    return {
        "success": True,
        "token": session_token,
        "phone": phone,
        "expires_at": session_expires.isoformat()
    }


@router.get("/guest/orders")
async def get_guest_orders(request: Request):
    """
    Get orders for guest user (via cabinet session)
    """
    session = await get_cabinet_session(request)
    
    if not session:
        raise HTTPException(status_code=401, detail="Необхідна авторизація через OTP")
    
    phone = session.get("phone")
    
    # Find orders by phone
    orders = await db.orders.find(
        {"customer.phone": phone},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {
        "orders": orders,
        "phone": phone,
        "total": len(orders)
    }


@router.get("/guest/orders/{order_id}")
async def get_guest_order_detail(order_id: str, request: Request):
    """
    Get single order details for guest user
    """
    session = await get_cabinet_session(request)
    
    if not session:
        raise HTTPException(status_code=401, detail="Необхідна авторизація через OTP")
    
    phone = session.get("phone")
    
    order = await db.orders.find_one(
        {"id": order_id, "customer.phone": phone},
        {"_id": 0}
    )
    
    if not order:
        raise HTTPException(status_code=404, detail="Замовлення не знайдено")
    
    # Get TTN tracking if available
    if order.get("delivery", {}).get("ttn"):
        ttn = order["delivery"]["ttn"]
        tracking = await db.ttn_tracking.find_one({"ttn": ttn}, {"_id": 0})
        order["tracking"] = tracking
    
    return order


@router.post("/guest/logout")
async def guest_logout(request: Request):
    """
    Logout from guest cabinet
    """
    session = await get_cabinet_session(request)
    
    if session:
        await db.cabinet_sessions.delete_one({"token": session.get("token")})
    
    return {"success": True, "message": "Вихід виконано"}
