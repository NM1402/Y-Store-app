"""
Products Module - Pydantic Models
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class CategoryBase(BaseModel):
    name: str
    name_uk: Optional[str] = None
    slug: str
    icon: Optional[str] = None
    parent_id: Optional[str] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    name_uk: Optional[str] = None
    slug: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[str] = None


class Category(CategoryBase):
    id: str
    product_count: int = 0
    children: List['Category'] = []


Category.model_rebuild()


class ProductBase(BaseModel):
    name: Optional[str] = Field(None, alias='name')
    title: Optional[str] = None  # Alias for legacy data
    name_uk: Optional[str] = None
    description: str = ""
    description_uk: Optional[str] = None
    price: float
    old_price: Optional[float] = None
    category_id: Optional[str] = None
    images: List[str] = []
    specifications: Dict[str, Any] = {}
    in_stock: bool = True
    sku: Optional[str] = None
    brand: Optional[str] = None
    
    @property
    def display_name(self) -> str:
        return self.name or self.title or "Product"
    
    class Config:
        populate_by_name = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    name_uk: Optional[str] = None
    description: Optional[str] = None
    description_uk: Optional[str] = None
    price: Optional[float] = None
    old_price: Optional[float] = None
    category_id: Optional[str] = None
    images: Optional[List[str]] = None
    specifications: Optional[Dict[str, Any]] = None
    in_stock: Optional[bool] = None
    sku: Optional[str] = None
    brand: Optional[str] = None


class Product(ProductBase):
    id: str
    seller_id: Optional[str] = None
    rating: float = 0.0
    reviews_count: int = 0
    views: int = 0
    sales_count: int = 0
    is_bestseller: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    category_name: Optional[str] = None
    seller_name: Optional[str] = None
    slug: Optional[str] = None


class ProductListResponse(BaseModel):
    items: List[Product]
    total: int
    page: int
    pages: int
