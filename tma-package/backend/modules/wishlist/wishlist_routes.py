"""
BLOCK V2-19: Wishlist API
Backend for favorites/wishlist functionality
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, timezone
from core.db import db
from core.security import get_current_user_optional

router = APIRouter(prefix="/api/v2/wishlist", tags=["Wishlist"])


class WishlistToggleRequest(BaseModel):
    product_id: str
    guest_token: Optional[str] = None


@router.get("")
async def get_wishlist(
    guest_token: Optional[str] = None,
    user=Depends(get_current_user_optional)
):
    """Get wishlist items with full product details"""
    key = None
    if user:
        key = {"user_id": str(user.get("id") or user.get("_id"))}
    elif guest_token:
        key = {"guest_token": guest_token}
    else:
        return {"items": [], "products": []}
    
    doc = await db.wishlists.find_one(key, {"_id": 0})
    if not doc:
        return {"items": [], "products": []}
    
    items = doc.get("items", [])
    
    # Get full product details
    if items:
        products = await db.products.find(
            {"id": {"$in": items}},
            {"_id": 0}
        ).to_list(100)
    else:
        products = []
    
    return {
        "items": items,
        "products": products
    }


@router.post("/toggle")
async def toggle_wishlist(
    payload: WishlistToggleRequest,
    user=Depends(get_current_user_optional)
):
    """Toggle product in wishlist"""
    product_id = payload.product_id
    guest_token = payload.guest_token
    
    if user:
        key = {"user_id": str(user.get("id") or user.get("_id"))}
    elif guest_token:
        key = {"guest_token": guest_token}
    else:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    doc = await db.wishlists.find_one(key)
    items = doc.get("items", []) if doc else []
    
    added = False
    if product_id in items:
        items.remove(product_id)
    else:
        items.append(product_id)
        added = True
    
    await db.wishlists.update_one(
        key,
        {
            "$set": {
                "items": items,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$setOnInsert": {
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {
        "ok": True,
        "items": items,
        "added": added,
        "count": len(items)
    }


@router.post("/add")
async def add_to_wishlist(
    payload: WishlistToggleRequest,
    user=Depends(get_current_user_optional)
):
    """Add product to wishlist"""
    product_id = payload.product_id
    guest_token = payload.guest_token
    
    if user:
        key = {"user_id": str(user.get("id") or user.get("_id"))}
    elif guest_token:
        key = {"guest_token": guest_token}
    else:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    await db.wishlists.update_one(
        key,
        {
            "$addToSet": {"items": product_id},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
            "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}
        },
        upsert=True
    )
    
    doc = await db.wishlists.find_one(key, {"_id": 0})
    items = doc.get("items", []) if doc else []
    
    return {"ok": True, "items": items, "count": len(items)}


@router.post("/remove")
async def remove_from_wishlist(
    payload: WishlistToggleRequest,
    user=Depends(get_current_user_optional)
):
    """Remove product from wishlist"""
    product_id = payload.product_id
    guest_token = payload.guest_token
    
    if user:
        key = {"user_id": str(user.get("id") or user.get("_id"))}
    elif guest_token:
        key = {"guest_token": guest_token}
    else:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    await db.wishlists.update_one(
        key,
        {
            "$pull": {"items": product_id},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    doc = await db.wishlists.find_one(key, {"_id": 0})
    items = doc.get("items", []) if doc else []
    
    return {"ok": True, "items": items, "count": len(items)}


@router.delete("/clear")
async def clear_wishlist(
    guest_token: Optional[str] = None,
    user=Depends(get_current_user_optional)
):
    """Clear entire wishlist"""
    if user:
        key = {"user_id": str(user.get("id") or user.get("_id"))}
    elif guest_token:
        key = {"guest_token": guest_token}
    else:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    await db.wishlists.update_one(
        key,
        {"$set": {"items": [], "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"ok": True, "items": [], "count": 0}


@router.post("/merge")
async def merge_wishlist(
    guest_token: str,
    user=Depends(get_current_user_optional)
):
    """Merge guest wishlist into user account after login"""
    if not user:
        raise HTTPException(status_code=401, detail="Must be logged in to merge")
    
    user_id = str(user.get("id") or user.get("_id"))
    
    # Get guest wishlist
    guest_doc = await db.wishlists.find_one({"guest_token": guest_token})
    guest_items = guest_doc.get("items", []) if guest_doc else []
    
    if not guest_items:
        return {"ok": True, "merged": 0}
    
    # Get user wishlist
    user_doc = await db.wishlists.find_one({"user_id": user_id})
    user_items = user_doc.get("items", []) if user_doc else []
    
    # Merge (unique items)
    merged = list(set(user_items + guest_items))
    
    await db.wishlists.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "items": merged,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}
        },
        upsert=True
    )
    
    # Delete guest wishlist
    await db.wishlists.delete_one({"guest_token": guest_token})
    
    return {"ok": True, "merged": len(guest_items), "total": len(merged)}
