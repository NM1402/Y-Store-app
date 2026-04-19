"""
Auth Module - API Routes
"""
from fastapi import APIRouter, HTTPException, Depends, status
from datetime import datetime, timezone
import uuid

from core.db import db
from core.security import (
    verify_password, 
    get_password_hash, 
    create_access_token,
    get_current_user
)
from .models import (
    UserCreate, UserLogin, UserUpdate, 
    PasswordChange, EmailChange,
    Token, UserResponse
)

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=Token)
async def register(user_data: UserCreate):
    """Register new user"""
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "full_name": user_data.full_name,
        "hashed_password": get_password_hash(user_data.password),
        "role": "customer",
        "created_at": now,
        "verified": False,
        "delivery_method": "nova_poshta"
    }
    
    await db.users.insert_one(user_doc)
    
    access_token = create_access_token({"sub": user_id})
    
    return Token(
        access_token=access_token,
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            full_name=user_data.full_name,
            role="customer",
            created_at=now,
            verified=False,
            delivery_method="nova_poshta"
        )
    )


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    """Login user"""
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    
    if not user or not verify_password(credentials.password, user.get("hashed_password", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token({"sub": user["id"]})
    
    return Token(
        access_token=access_token,
        user=UserResponse(**{k: v for k, v in user.items() if k != "hashed_password"})
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    return UserResponse(**{k: v for k, v in current_user.items() if k != "hashed_password"})


@router.put("/me", response_model=UserResponse)
async def update_profile(
    update_data: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update current user profile"""
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if update_dict:
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": update_dict}
        )
    
    updated_user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    return UserResponse(**{k: v for k, v in updated_user.items() if k != "hashed_password"})


@router.post("/change-password")
async def change_password(
    data: PasswordChange,
    current_user: dict = Depends(get_current_user)
):
    """Change user password"""
    if not verify_password(data.current_password, current_user.get("hashed_password", "")):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"hashed_password": get_password_hash(data.new_password)}}
    )
    
    return {"message": "Password changed successfully"}


@router.post("/change-email")
async def change_email(
    data: EmailChange,
    current_user: dict = Depends(get_current_user)
):
    """Change user email"""
    if not verify_password(data.password, current_user.get("hashed_password", "")):
        raise HTTPException(status_code=400, detail="Password is incorrect")
    
    existing = await db.users.find_one({"email": data.new_email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already in use")
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"email": data.new_email}}
    )
    
    return {"message": "Email changed successfully"}
