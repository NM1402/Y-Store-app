"""
Cart Module - Models & Routes
Supports both authenticated users and guest sessions
"""
from fastapi import APIRouter, HTTPException, Depends, Request, Response
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from core.db import db
from core.security import get_current_user_optional

router = APIRouter(prefix="/cart", tags=["Cart"])

GUEST_CART_COOKIE = "guest_cart_id"


class CartItem(BaseModel):
    product_id: str
    quantity: int = 1


class AddToCartRequest(BaseModel):
    product_id: str
    quantity: int = 1


class CartItemResponse(BaseModel):
    product_id: str
    quantity: int
    price: float = 0
    product: Optional[dict] = None


class CartResponse(BaseModel):
    items: List[CartItemResponse]
    total: float
    count: int


def get_cart_id(request: Request, response: Response, user: Optional[dict] = None) -> tuple:
    """Get cart identifier - user_id for authenticated, guest_id for anonymous"""
    if user:
        return ("user_id", user["id"])
    
    # Guest cart via cookie
    guest_id = request.cookies.get(GUEST_CART_COOKIE)
    if not guest_id:
        guest_id = str(uuid.uuid4())
        response.set_cookie(
            key=GUEST_CART_COOKIE,
            value=guest_id,
            max_age=60*60*24*30,  # 30 days
            httponly=True,
            samesite="lax"
        )
    return ("guest_id", guest_id)


@router.get("", response_model=CartResponse)
async def get_cart(
    request: Request,
    response: Response,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Get cart - works for both authenticated and guest users"""
    id_field, id_value = get_cart_id(request, response, current_user)
    
    cart = await db.carts.find_one({id_field: id_value}, {"_id": 0})
    
    if not cart:
        return CartResponse(items=[], total=0, count=0)
    
    items = []
    total = 0
    
    for item in cart.get("items", []):
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if product:
            items.append(CartItemResponse(
                product_id=item["product_id"],
                quantity=item["quantity"],
                price=product.get("price", 0),
                product=product
            ))
            total += product.get("price", 0) * item["quantity"]
    
    return CartResponse(
        items=items,
        total=total,
        count=sum(i.quantity for i in items)
    )


@router.post("/add")
async def add_to_cart(
    data: AddToCartRequest,
    request: Request,
    response: Response,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Add item to cart - works for both authenticated and guest users"""
    # Verify product exists
    product = await db.products.find_one({"id": data.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    id_field, id_value = get_cart_id(request, response, current_user)
    
    cart = await db.carts.find_one({id_field: id_value})
    
    if not cart:
        await db.carts.insert_one({
            id_field: id_value,
            "items": [{"product_id": data.product_id, "quantity": data.quantity}],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        })
    else:
        # Check if product already in cart
        existing = next((i for i in cart.get("items", []) if i["product_id"] == data.product_id), None)
        
        if existing:
            await db.carts.update_one(
                {id_field: id_value, "items.product_id": data.product_id},
                {
                    "$inc": {"items.$.quantity": data.quantity},
                    "$set": {"updated_at": datetime.now(timezone.utc)}
                }
            )
        else:
            await db.carts.update_one(
                {id_field: id_value},
                {
                    "$push": {"items": {"product_id": data.product_id, "quantity": data.quantity}},
                    "$set": {"updated_at": datetime.now(timezone.utc)}
                }
            )
    
    return {"message": "Added to cart", "product_id": data.product_id}


@router.post("/update")
async def update_cart_item(
    data: AddToCartRequest,
    request: Request,
    response: Response,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Update cart item quantity"""
    id_field, id_value = get_cart_id(request, response, current_user)
    
    if data.quantity <= 0:
        await db.carts.update_one(
            {id_field: id_value},
            {"$pull": {"items": {"product_id": data.product_id}}}
        )
    else:
        await db.carts.update_one(
            {id_field: id_value, "items.product_id": data.product_id},
            {"$set": {"items.$.quantity": data.quantity, "updated_at": datetime.now(timezone.utc)}}
        )
    
    return {"message": "Cart updated"}


@router.delete("/{product_id}")
async def remove_from_cart(
    product_id: str,
    request: Request,
    response: Response,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Remove item from cart"""
    id_field, id_value = get_cart_id(request, response, current_user)
    
    await db.carts.update_one(
        {id_field: id_value},
        {"$pull": {"items": {"product_id": product_id}}}
    )
    return {"message": "Removed from cart"}


@router.delete("")
async def clear_cart(
    request: Request,
    response: Response,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Clear entire cart"""
    id_field, id_value = get_cart_id(request, response, current_user)
    
    await db.carts.update_one(
        {id_field: id_value},
        {"$set": {"items": [], "updated_at": datetime.now(timezone.utc)}}
    )
    return {"message": "Cart cleared"}


@router.post("/merge")
async def merge_guest_cart(
    request: Request,
    response: Response,
    current_user: dict = Depends(get_current_user_optional)
):
    """Merge guest cart into user cart after login"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Login required to merge cart")
    
    guest_id = request.cookies.get(GUEST_CART_COOKIE)
    if not guest_id:
        return {"message": "No guest cart to merge"}
    
    guest_cart = await db.carts.find_one({"guest_id": guest_id})
    if not guest_cart or not guest_cart.get("items"):
        return {"message": "Guest cart is empty"}
    
    user_id = current_user["id"]
    user_cart = await db.carts.find_one({"user_id": user_id})
    
    if not user_cart:
        # Transfer guest cart to user
        await db.carts.update_one(
            {"guest_id": guest_id},
            {
                "$set": {"user_id": user_id},
                "$unset": {"guest_id": ""}
            }
        )
    else:
        # Merge items
        for guest_item in guest_cart.get("items", []):
            existing = next(
                (i for i in user_cart.get("items", []) if i["product_id"] == guest_item["product_id"]),
                None
            )
            if existing:
                await db.carts.update_one(
                    {"user_id": user_id, "items.product_id": guest_item["product_id"]},
                    {"$inc": {"items.$.quantity": guest_item["quantity"]}}
                )
            else:
                await db.carts.update_one(
                    {"user_id": user_id},
                    {"$push": {"items": guest_item}}
                )
        
        # Delete guest cart
        await db.carts.delete_one({"guest_id": guest_id})
    
    # Clear guest cookie
    response.delete_cookie(GUEST_CART_COOKIE)
    
    return {"message": "Cart merged successfully"}
