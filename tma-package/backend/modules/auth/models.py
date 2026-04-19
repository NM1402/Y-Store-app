"""
Auth Module - Pydantic Models
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    full_name: str


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    postal_code: Optional[str] = None
    delivery_method: Optional[str] = None
    np_department: Optional[str] = None
    delivery_notes: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class EmailChange(BaseModel):
    new_email: EmailStr
    password: str


class User(BaseModel):
    id: str
    email: str
    full_name: str
    role: str = "customer"
    created_at: datetime
    company_name: Optional[str] = None
    verified: bool = False
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    postal_code: Optional[str] = None
    delivery_method: str = "nova_poshta"
    np_department: Optional[str] = None
    delivery_notes: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    created_at: datetime
    company_name: Optional[str] = None
    verified: bool = False
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    postal_code: Optional[str] = None
    delivery_method: str = "nova_poshta"
    np_department: Optional[str] = None
    delivery_notes: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
