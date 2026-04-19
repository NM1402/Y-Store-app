"""
V2 Auth Module - Google OAuth + Guest Checkout
Implements BLOCK V2-1 of the roadmap
"""
from fastapi import APIRouter, HTTPException, Request, Response, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import httpx
import logging

from core.db import db
from core.security import get_password_hash, verify_password, create_access_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v2/auth", tags=["Auth V2"])

# Session expiry: 7 days
SESSION_EXPIRY_DAYS = 7


# ============= MODELS =============

class GoogleAuthRequest(BaseModel):
    session_id: str


class GoogleAuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class GuestCheckoutRequest(BaseModel):
    email: Optional[EmailStr] = None
    phone: str
    full_name: str


class GuestCheckoutResponse(BaseModel):
    guest_token: str
    guest_id: str


class EmailPasswordLogin(BaseModel):
    email: EmailStr
    password: str


class EmailPasswordRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None


# ============= GOOGLE OAUTH =============

@router.post("/google", response_model=GoogleAuthResponse)
async def google_auth(request: GoogleAuthRequest, response: Response):
    """
    Exchange Emergent OAuth session_id for user data and create session
    """
    try:
        # Call Emergent Auth to get session data
        async with httpx.AsyncClient() as client:
            auth_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": request.session_id},
                timeout=10.0
            )
        
        if auth_response.status_code != 200:
            logger.error(f"Emergent Auth error: {auth_response.status_code} - {auth_response.text}")
            raise HTTPException(status_code=401, detail="Invalid session_id")
        
        auth_data = auth_response.json()
        email = auth_data.get("email")
        name = auth_data.get("name")
        picture = auth_data.get("picture")
        session_token = auth_data.get("session_token")
        
        if not email:
            raise HTTPException(status_code=401, detail="Email not provided by Google")
        
        # Find or create user
        existing_user = await db.users.find_one({"email": email}, {"_id": 0})
        
        if existing_user:
            # Update existing user with Google data
            await db.users.update_one(
                {"email": email},
                {"$set": {
                    "google_id": auth_data.get("id"),
                    "full_name": name or existing_user.get("full_name"),
                    "picture": picture,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            user_id = existing_user["id"]
        else:
            # Create new user
            user_id = str(uuid.uuid4())
            new_user = {
                "id": user_id,
                "email": email,
                "full_name": name or "User",
                "google_id": auth_data.get("id"),
                "picture": picture,
                "role": "customer",
                "verified": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(new_user)
            logger.info(f"Created new user via Google OAuth: {email}")
        
        # Create session
        expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_EXPIRY_DAYS)
        await db.user_sessions.delete_many({"user_id": user_id})  # Clear old sessions
        await db.user_sessions.insert_one({
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc)
        })
        
        # Set httpOnly cookie
        response.set_cookie(
            key="session_token",
            value=session_token,
            path="/",
            secure=True,
            httponly=True,
            samesite="none",
            max_age=SESSION_EXPIRY_DAYS * 24 * 60 * 60
        )
        
        # Get updated user
        user_doc = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
        
        return GoogleAuthResponse(
            access_token=session_token,
            user=user_doc
        )
        
    except httpx.RequestError as e:
        logger.error(f"Request error during Google auth: {e}")
        raise HTTPException(status_code=503, detail="Authentication service unavailable")
    except Exception as e:
        logger.error(f"Google auth error: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed")


@router.get("/me")
async def get_current_user_v2(request: Request):
    """
    Get current authenticated user from session token (cookie or header)
    """
    # Try cookie first
    session_token = request.cookies.get("session_token")
    
    # Fallback to Authorization header
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header[7:]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session
    session = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        await db.user_sessions.delete_one({"session_token": session_token})
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user = await db.users.find_one(
        {"id": session["user_id"]},
        {"_id": 0, "password_hash": 0}
    )
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user


@router.post("/logout")
async def logout(request: Request, response: Response):
    """
    Logout user - clear session
    """
    session_token = request.cookies.get("session_token")
    
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    
    response.delete_cookie(
        key="session_token",
        path="/",
        secure=True,
        httponly=True,
        samesite="none"
    )
    
    return {"message": "Logged out successfully"}


# ============= EMAIL/PASSWORD AUTH =============

@router.post("/register")
async def register_email_password(data: EmailPasswordRegister, response: Response):
    """
    Register with email/password
    """
    # Check if email exists
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    password_hash = get_password_hash(data.password)
    
    user_doc = {
        "id": user_id,
        "email": data.email,
        "full_name": data.full_name,
        "phone": data.phone,
        "password_hash": password_hash,
        "role": "customer",
        "verified": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    # Create session
    session_token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_EXPIRY_DAYS)
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        path="/",
        secure=True,
        httponly=True,
        samesite="none",
        max_age=SESSION_EXPIRY_DAYS * 24 * 60 * 60
    )
    
    user_doc.pop("password_hash", None)
    user_doc.pop("_id", None)
    
    return {
        "access_token": session_token,
        "token_type": "bearer",
        "user": user_doc
    }


@router.post("/login")
async def login_email_password(data: EmailPasswordLogin, response: Response):
    """
    Login with email/password
    """
    user_doc = await db.users.find_one({"email": data.email})
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user_doc.get("password_hash"):
        raise HTTPException(status_code=401, detail="Please use Google login for this account")
    
    if not verify_password(data.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_id = user_doc["id"]
    
    # Clear old sessions and create new
    await db.user_sessions.delete_many({"user_id": user_id})
    
    session_token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_EXPIRY_DAYS)
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        path="/",
        secure=True,
        httponly=True,
        samesite="none",
        max_age=SESSION_EXPIRY_DAYS * 24 * 60 * 60
    )
    
    user_doc.pop("password_hash", None)
    user_doc.pop("_id", None)
    
    return {
        "access_token": session_token,
        "token_type": "bearer",
        "user": user_doc
    }


# ============= GUEST CHECKOUT =============

@router.post("/guest", response_model=GuestCheckoutResponse)
async def create_guest_session(data: GuestCheckoutRequest):
    """
    Create guest session for checkout without registration
    Allows purchasing without an account
    """
    if not data.phone:
        raise HTTPException(status_code=400, detail="Phone number is required")
    
    guest_id = f"guest_{uuid.uuid4().hex[:12]}"
    guest_token = f"guest_{uuid.uuid4().hex}"
    
    # Store guest session
    guest_doc = {
        "guest_id": guest_id,
        "guest_token": guest_token,
        "email": data.email,
        "phone": data.phone,
        "full_name": data.full_name,
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=24)  # 24h expiry
    }
    
    await db.guest_sessions.insert_one(guest_doc)
    
    logger.info(f"Created guest session: {guest_id}")
    
    return GuestCheckoutResponse(
        guest_token=guest_token,
        guest_id=guest_id
    )


@router.get("/guest/{guest_token}")
async def get_guest_session(guest_token: str):
    """
    Get guest session data
    """
    guest = await db.guest_sessions.find_one(
        {"guest_token": guest_token},
        {"_id": 0}
    )
    
    if not guest:
        raise HTTPException(status_code=404, detail="Guest session not found")
    
    # Check expiry
    expires_at = guest["expires_at"]
    if isinstance(expires_at, datetime):
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        await db.guest_sessions.delete_one({"guest_token": guest_token})
        raise HTTPException(status_code=401, detail="Guest session expired")
    
    return guest


@router.post("/guest/link-account")
async def link_guest_to_account(request: Request):
    """
    Link guest orders to a registered account after registration
    """
    body = await request.json()
    guest_token = body.get("guest_token")
    user_id = body.get("user_id")
    
    if not guest_token or not user_id:
        raise HTTPException(status_code=400, detail="guest_token and user_id required")
    
    # Get guest session
    guest = await db.guest_sessions.find_one({"guest_token": guest_token})
    if not guest:
        raise HTTPException(status_code=404, detail="Guest session not found")
    
    guest_id = guest["guest_id"]
    
    # Link all guest orders to the user
    result = await db.orders.update_many(
        {"guest_id": guest_id},
        {"$set": {"buyer_id": user_id, "linked_from_guest": True}}
    )
    
    # Delete guest session
    await db.guest_sessions.delete_one({"guest_token": guest_token})
    
    logger.info(f"Linked {result.modified_count} guest orders to user {user_id}")
    
    return {
        "message": f"Linked {result.modified_count} orders to your account",
        "orders_linked": result.modified_count
    }
