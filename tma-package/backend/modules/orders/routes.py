"""
Orders Module - Production-ready order management with state machine
Integrated with A/B testing for prepaid discount experiments
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging

from core.db import db
from core.security import get_current_user, get_current_admin
from .order_status import OrderStatus
from .order_state_machine import can_transition, get_allowed_transitions, is_cancellable
from .order_repository import order_repository
from .order_idempotency import make_idempotency_hash, stable_payload_hash
from modules.ab.ab_service import ABService
from modules.payments.prepaid_discount import calc_prepaid_discount

router = APIRouter(prefix="/orders", tags=["Orders"])
logger = logging.getLogger(__name__)

# A/B experiment ID for prepaid discount testing
AB_PREPAID_DISCOUNT_EXP_ID = "prepaid_discount_v1"


class OrderItem(BaseModel):
    product_id: str
    quantity: int
    price: float
    name: str


class ShippingAddress(BaseModel):
    full_name: str
    phone: str
    city: str
    address: str
    postal_code: Optional[str] = None
    np_department: Optional[str] = None
    notes: Optional[str] = None


class CreateOrderRequest(BaseModel):
    shipping: ShippingAddress
    payment_method: str = "cash"
    notes: Optional[str] = None


class UpdateStatusRequest(BaseModel):
    status: str
    reason: Optional[str] = None


class ABAssignment(BaseModel):
    """A/B test assignment info stored with order"""
    exp_id: Optional[str] = None
    variant: Optional[str] = None
    discount_pct: Optional[float] = None
    active: bool = False


class OrderResponse(BaseModel):
    id: str
    user_id: str
    items: List[OrderItem]
    shipping: ShippingAddress
    status: str
    version: int = 1
    payment_method: str
    payment: Optional[dict] = None
    subtotal: float
    shipping_cost: float = 0
    total: float
    discount: Optional[dict] = None
    ab: Optional[ABAssignment] = None
    notes: Optional[str] = None
    status_history: List[dict] = []
    created_at: datetime
    updated_at: Optional[datetime] = None


class OrderListResponse(OrderResponse):
    user_name: Optional[str] = None
    user_email: Optional[str] = None


@router.post("", response_model=OrderResponse)
async def create_order(
    data: CreateOrderRequest,
    current_user: dict = Depends(get_current_user),
    x_idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key")
):
    """
    Create new order from cart.
    Supports idempotency via X-Idempotency-Key header.
    Integrates with A/B testing for prepaid discount experiments.
    """
    user_id = current_user["id"]
    
    # Build payload for idempotency check
    payload = {
        "user_id": user_id,
        "shipping": data.shipping.model_dump(),
        "payment_method": data.payment_method,
    }
    
    # Handle idempotency if key provided
    if x_idempotency_key:
        key_hash = make_idempotency_hash(x_idempotency_key)
        payload_hash = stable_payload_hash(payload)
        
        existing = await order_repository.idem_get_or_lock(key_hash, payload_hash)
        if existing:
            if existing.get("status") == "DONE" and existing.get("result"):
                return OrderResponse(**existing["result"])
            if existing.get("payload_hash") != payload_hash:
                raise HTTPException(
                    status_code=422, 
                    detail="IDEMPOTENCY_PAYLOAD_MISMATCH"
                )
    
    # Get cart
    cart = await db.carts.find_one({"user_id": user_id})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    # Build order items
    order_items = []
    subtotal = 0
    
    for cart_item in cart["items"]:
        product = await db.products.find_one(
            {"id": cart_item["product_id"]}, 
            {"_id": 0}
        )
        if not product:
            continue
        
        # Handle both 'name' and 'title' field names
        product_name = product.get("name") or product.get("title", "Unknown Product")
        
        order_items.append(OrderItem(
            product_id=product["id"],
            quantity=cart_item["quantity"],
            price=product["price"],
            name=product_name
        ))
        subtotal += product["price"] * cart_item["quantity"]
        
        # Increment sales count
        await db.products.update_one(
            {"id": product["id"]},
            {"$inc": {"sales_count": cart_item["quantity"]}}
        )
    
    if not order_items:
        raise HTTPException(status_code=400, detail="No valid products in cart")
    
    order_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    # --- A/B Testing Integration ---
    # Use phone number as the unit for A/B assignment (stable across sessions)
    ab_unit = data.shipping.phone
    ab_assignment = None
    discount_pct_override = None
    discount_obj = None
    
    try:
        ab_service = ABService(db)
        assignment = await ab_service.get_assignment(AB_PREPAID_DISCOUNT_EXP_ID, ab_unit)
        
        if assignment and assignment.get("active"):
            ab_assignment = {
                "exp_id": assignment.get("exp_id"),
                "variant": assignment.get("variant"),
                "discount_pct": assignment.get("discount_pct"),
                "active": True
            }
            discount_pct_override = assignment.get("discount_pct")
            logger.info(f"A/B assignment for {ab_unit}: variant={assignment.get('variant')}, discount={discount_pct_override}%")
    except Exception as e:
        logger.warning(f"A/B assignment failed, using default: {e}")
        ab_assignment = {"exp_id": AB_PREPAID_DISCOUNT_EXP_ID, "variant": None, "discount_pct": None, "active": False}
    
    # Calculate discount based on payment method and A/B variant
    total = subtotal
    policy_mode = "FULL_PREPAID" if data.payment_method != "cash" else "COD"
    
    if policy_mode == "FULL_PREPAID":
        discount_obj = calc_prepaid_discount(subtotal, policy_mode, discount_pct_override)
        if discount_obj:
            total = round(subtotal - discount_obj["amount"], 2)
            logger.info(f"Discount applied: {discount_obj['amount']} UAH ({discount_obj['value']}%)")
    
    # Determine initial status based on payment method
    initial_status = (
        OrderStatus.AWAITING_PAYMENT 
        if data.payment_method != "cash" 
        else OrderStatus.NEW
    )
    
    order_doc = {
        "id": order_id,
        "user_id": user_id,
        "items": [item.model_dump() for item in order_items],
        "shipping": data.shipping.model_dump(),
        "status": initial_status.value,
        "version": 1,
        "payment_method": data.payment_method,
        "payment": None,
        "subtotal": subtotal,
        "shipping_cost": 0,
        "total": total,
        "discount": discount_obj,
        "ab": ab_assignment,
        "notes": data.notes,
        "status_history": [{
            "from": None,
            "to": initial_status.value,
            "actor": f"user:{user_id}",
            "reason": "ORDER_CREATED",
            "at": now.isoformat(),
        }],
        "created_at": now,
        "updated_at": None,
    }
    
    await db.orders.insert_one(order_doc)
    
    # Clear cart
    await db.carts.update_one(
        {"user_id": user_id},
        {"$set": {"items": [], "updated_at": now}}
    )
    
    # Store idempotency result
    if x_idempotency_key:
        result_doc = {k: v for k, v in order_doc.items() if k != "_id"}
        await order_repository.idem_store_result(key_hash, result_doc)
        await order_repository.idem_set_expires(key_hash, hours=24)
    
    return OrderResponse(**order_doc)


@router.get("/my", response_model=List[OrderResponse])
async def get_my_orders(current_user: dict = Depends(get_current_user)):
    """Get current user's orders"""
    orders = await db.orders.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return [OrderResponse(**o) for o in orders]


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get single order"""
    order = await order_repository.get_by_id(order_id)
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check ownership or admin
    if current_user["role"] != "admin" and order["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return OrderResponse(**order)


@router.get("/{order_id}/transitions")
async def get_available_transitions(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get available status transitions for an order"""
    order = await order_repository.get_by_id(order_id)
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    current_status = OrderStatus(order["status"])
    allowed = get_allowed_transitions(current_status)
    
    return {
        "order_id": order_id,
        "current_status": current_status.value,
        "allowed_transitions": [s.value for s in allowed],
        "version": order.get("version", 1),
    }


@router.post("/{order_id}/cancel")
async def cancel_order(
    order_id: str,
    reason: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Cancel an order (if allowed by state machine)"""
    order = await order_repository.get_by_id(order_id)
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check ownership or admin
    if current_user["role"] != "admin" and order["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    current_status = OrderStatus(order["status"])
    
    if not is_cancellable(current_status):
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot cancel order in {current_status.value} status"
        )
    
    try:
        updated = await order_repository.atomic_transition(
            order_id=order_id,
            to_status=OrderStatus.CANCELED,
            actor=f"user:{current_user['id']}",
            reason=reason or "USER_CANCELLED",
        )
        return {"message": "Order cancelled", "order": OrderResponse(**updated)}
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.get("", response_model=List[OrderListResponse])
async def get_all_orders(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_admin)
):
    """Get all orders (admin only)"""
    query = {}
    if status:
        query["status"] = status
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Enrich with user info
    result = []
    for o in orders:
        user = await db.users.find_one(
            {"id": o["user_id"]}, 
            {"full_name": 1, "email": 1}
        )
        result.append(OrderListResponse(
            **o,
            user_name=user.get("full_name") if user else None,
            user_email=user.get("email") if user else None
        ))
    
    return result


@router.put("/{order_id}/status")
async def update_order_status(
    order_id: str,
    data: UpdateStatusRequest,
    current_user: dict = Depends(get_current_admin)
):
    """
    Update order status (admin only).
    Uses state machine to validate transitions.
    Uses optimistic locking to prevent conflicts.
    """
    try:
        to_status = OrderStatus(data.status)
    except ValueError:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid status: {data.status}"
        )
    
    try:
        updated = await order_repository.atomic_transition(
            order_id=order_id,
            to_status=to_status,
            actor=f"admin:{current_user['id']}",
            reason=data.reason or "ADMIN_UPDATE",
        )
        return {
            "message": "Status updated",
            "order_id": order_id,
            "new_status": updated["status"],
            "version": updated["version"],
        }
    except ValueError as e:
        msg = str(e)
        if msg == "ORDER_NOT_FOUND":
            raise HTTPException(status_code=404, detail="Order not found")
        if msg == "ORDER_CONFLICT":
            raise HTTPException(
                status_code=409, 
                detail="Order was modified by another request"
            )
        if msg.startswith("INVALID_TRANSITION"):
            raise HTTPException(status_code=400, detail=msg)
        raise HTTPException(status_code=400, detail=msg)
