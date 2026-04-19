"""
V2 Orders Module - Guest Checkout Support
Implements order creation without mandatory registration
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
import logging

from core.db import db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v2/orders", tags=["Orders V2"])


# ============= MODELS =============

class OrderCustomer(BaseModel):
    full_name: str
    phone: str
    email: Optional[EmailStr] = None


class OrderDelivery(BaseModel):
    method: str = "nova_poshta"  # nova_poshta, courier, pickup
    city_ref: Optional[str] = None
    city_name: Optional[str] = None
    warehouse_ref: Optional[str] = None
    warehouse_name: Optional[str] = None
    address: Optional[str] = None
    delivery_cost: float = 0


class OrderItemInput(BaseModel):
    product_id: str
    quantity: int
    price: float


class CreateOrderV2Request(BaseModel):
    customer: OrderCustomer
    delivery: OrderDelivery
    items: List[OrderItemInput]
    payment_method: str = "cash_on_delivery"  # cash_on_delivery, card, fondy
    comment: Optional[str] = None
    guest_token: Optional[str] = None  # For guest checkout


class OrderV2Response(BaseModel):
    order_id: str
    order_number: str
    status: str
    total_amount: float
    payment_url: Optional[str] = None


# ============= HELPER FUNCTIONS =============

async def get_optional_user(request: Request) -> Optional[dict]:
    """
    Get user from session token if available, otherwise return None (guest)
    """
    session_token = request.cookies.get("session_token")
    
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header[7:]
    
    if not session_token:
        return None
    
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        return None
    
    # Check expiry
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at and expires_at < datetime.now(timezone.utc):
        return None
    
    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0, "password_hash": 0})
    return user


# ============= ENDPOINTS =============

@router.post("/create", response_model=OrderV2Response)
async def create_order_v2(request: Request, order_data: CreateOrderV2Request):
    """
    Create order - supports both authenticated users and guests
    Guest checkout: no registration required, just phone/email
    """
    # Try to get authenticated user
    user = await get_optional_user(request)
    
    # Validate items
    if not order_data.items:
        raise HTTPException(status_code=400, detail="Order must have at least one item")
    
    # Validate customer info
    if not order_data.customer.phone:
        raise HTTPException(status_code=400, detail="Phone number is required")
    
    # Calculate totals and validate products
    total_amount = 0
    order_items = []
    
    for item in order_data.items:
        product = await db.products.find_one({"id": item.product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        
        if product.get("stock_level", 0) < item.quantity:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient stock for {product['title']}"
            )
        
        item_total = item.price * item.quantity
        total_amount += item_total
        
        order_items.append({
            "product_id": item.product_id,
            "title": product["title"],
            "quantity": item.quantity,
            "price": item.price,
            "seller_id": product.get("seller_id", "system"),
            "image": product.get("images", [None])[0]
        })
    
    # Add delivery cost
    total_amount += order_data.delivery.delivery_cost
    
    # Generate order number
    order_number = f"ORD-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
    order_id = str(uuid.uuid4())
    
    # Determine buyer_id or guest_id
    buyer_id = None
    guest_id = None
    
    if user:
        buyer_id = user["id"]
    elif order_data.guest_token:
        # Get guest session
        guest = await db.guest_sessions.find_one({"guest_token": order_data.guest_token}, {"_id": 0})
        if guest:
            guest_id = guest["guest_id"]
        else:
            # Create anonymous guest
            guest_id = f"guest_{uuid.uuid4().hex[:12]}"
    else:
        # Anonymous guest without token
        guest_id = f"guest_{uuid.uuid4().hex[:12]}"
    
    # Create order document
    order_doc = {
        "id": order_id,
        "order_number": order_number,
        "buyer_id": buyer_id,
        "guest_id": guest_id,
        "customer": order_data.customer.model_dump(),
        "delivery": order_data.delivery.model_dump(),
        "items": order_items,
        "total_amount": total_amount,
        "currency": "UAH",
        "status": "pending",
        "payment_status": "pending",
        "payment_method": order_data.payment_method,
        "comment": order_data.comment,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Save order
    await db.orders.insert_one(order_doc)
    
    # Update product stock
    for item in order_data.items:
        await db.products.update_one(
            {"id": item.product_id},
            {"$inc": {"stock_level": -item.quantity}}
        )
    
    # Clear cart if user is authenticated
    if user:
        await db.carts.update_one(
            {"user_id": user["id"]},
            {"$set": {"items": [], "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    logger.info(f"Order created: {order_number} - {'User' if buyer_id else 'Guest'}: {order_data.customer.phone}")
    
    # Generate payment URL if needed
    payment_url = None
    if order_data.payment_method == "fondy":
        # TODO: Integrate with Fondy payment
        pass
    
    return OrderV2Response(
        order_id=order_id,
        order_number=order_number,
        status="pending",
        total_amount=total_amount,
        payment_url=payment_url
    )


@router.get("/my")
async def get_my_orders(request: Request):
    """
    Get orders for current user (requires auth)
    """
    user = await get_optional_user(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    orders = await db.orders.find(
        {"buyer_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return orders


@router.get("/guest/{phone}")
async def get_guest_orders(phone: str):
    """
    Get orders by phone number (for guests to track their orders)
    """
    # Find orders by customer phone
    orders = await db.orders.find(
        {"customer.phone": phone},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    if not orders:
        raise HTTPException(status_code=404, detail="No orders found for this phone number")
    
    # Return limited info for privacy
    return [{
        "order_number": o["order_number"],
        "status": o["status"],
        "payment_status": o["payment_status"],
        "total_amount": o["total_amount"],
        "created_at": o["created_at"],
        "items_count": len(o.get("items", []))
    } for o in orders]


@router.get("/{order_id}")
async def get_order_details(order_id: str, request: Request):
    """
    Get order details - accessible by owner or guest with matching phone
    """
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check access
    user = await get_optional_user(request)
    
    if user and order.get("buyer_id") == user["id"]:
        return order
    
    # For guests, require phone verification via query param
    phone = request.query_params.get("phone")
    if phone and order.get("customer", {}).get("phone") == phone:
        return order
    
    raise HTTPException(status_code=403, detail="Access denied")
