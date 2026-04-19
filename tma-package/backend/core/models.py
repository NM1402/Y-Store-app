"""
P2.1: Shared Models
All Pydantic models used across the application
"""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid


# ============= USER MODELS =============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    role: str = "customer"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    company_name: Optional[str] = None
    verified: bool = False
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    postal_code: Optional[str] = None
    delivery_method: Optional[str] = "nova_poshta"
    np_department: Optional[str] = None
    delivery_notes: Optional[str] = None


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "customer"
    company_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user: User


# ============= CATEGORY MODELS =============

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    parent_id: Optional[str] = None
    icon: Optional[str] = 'Smartphone'
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CategoryCreate(BaseModel):
    name: str
    slug: str
    parent_id: Optional[str] = None
    icon: Optional[str] = 'Smartphone'
    image_url: Optional[str] = None


# ============= PRODUCT MODELS =============

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    seller_id: str
    title: str
    slug: str
    description: str
    description_html: Optional[str] = None
    short_description: Optional[str] = None
    category_id: str
    category_name: Optional[str] = None
    price: float
    compare_price: Optional[float] = None
    currency: str = "USD"
    stock_level: int = 0
    images: List[str] = []
    videos: Optional[List[str]] = []
    specifications: Optional[List[Dict[str, Any]]] = []
    status: str = "published"
    rating: float = 0.0
    reviews_count: int = 0
    installment_months: Optional[int] = None
    installment_available: bool = False
    views_count: int = 0
    is_bestseller: bool = False
    is_featured: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProductCreate(BaseModel):
    title: str
    slug: Optional[str] = None
    description: str
    description_html: Optional[str] = None
    short_description: Optional[str] = None
    category_id: str
    category_name: Optional[str] = None
    price: float
    compare_price: Optional[float] = None
    stock_level: int = 0
    images: List[str] = []
    videos: Optional[List[str]] = []
    specifications: Optional[List[Dict[str, Any]]] = []
    status: str = "published"
    installment_months: Optional[int] = None
    installment_available: bool = False


class ProductUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    description_html: Optional[str] = None
    short_description: Optional[str] = None
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    price: Optional[float] = None
    compare_price: Optional[float] = None
    stock_level: Optional[int] = None
    images: Optional[List[str]] = None
    videos: Optional[List[str]] = None
    specifications: Optional[List[Dict[str, Any]]] = None
    status: Optional[str] = None
    is_bestseller: Optional[bool] = None
    is_featured: Optional[bool] = None


# ============= REVIEW MODELS =============

class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    user_id: str
    user_name: str
    rating: int
    comment: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    featured: bool = False


class ReviewCreate(BaseModel):
    product_id: str
    rating: int = Field(ge=1, le=5)
    comment: str


class ReviewWithProduct(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    product_id: str
    product_name: str
    user_id: str
    user_name: str
    user_email: str
    rating: int
    comment: str
    created_at: datetime


# ============= CART MODELS =============

class CartItem(BaseModel):
    product_id: str
    quantity: int = 1
    price: float
    title: str
    image_url: Optional[str] = None


class Cart(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    items: List[CartItem] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============= ORDER MODELS =============

class OrderItem(BaseModel):
    product_id: str
    title: str
    quantity: int
    price: float
    image_url: Optional[str] = None


class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    items: List[OrderItem]
    total: float
    status: str = "pending"
    shipping_address: Optional[str] = None
    payment_status: str = "pending"
    payment_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OrderCreate(BaseModel):
    items: List[OrderItem]
    shipping_address: Optional[str] = None
