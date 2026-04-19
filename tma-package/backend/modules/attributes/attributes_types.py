"""
Attributes Types - Pydantic models for dynamic filter system

Architecture:
- Attribute: definition of a characteristic (memory_gb, color, nfc)
- CategoryAttribute: filter configuration for category (which attrs, UI type, grouping)
- ProductAttribute: actual values for product
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from enum import Enum


# ============= ENUMS =============

class AttributeType(str, Enum):
    """Data type of attribute value"""
    NUMBER = "number"       # 256, 6.7, 1.5
    STRING = "string"       # "Black", "Samsung"
    BOOLEAN = "boolean"     # true/false (NFC, 5G)
    ENUM = "enum"           # single choice from list
    SET = "set"             # multiple choices (colors available)


class FilterUIType(str, Enum):
    """How filter is rendered in UI"""
    RANGE = "range"         # slider min-max (price, memory)
    SELECT = "select"       # single dropdown (warranty)
    MULTISELECT = "multiselect"  # checkboxes (brands, colors)
    BOOLEAN = "boolean"     # toggle (in stock, NFC)
    NUMBER_INPUT = "number_input"  # direct input


# ============= ATTRIBUTE DEFINITION =============

class AttributeValueOption(BaseModel):
    """Option for enum/set attributes"""
    value: str
    label: Optional[str] = None  # display name (optional)
    color_hex: Optional[str] = None  # for color attributes
    icon: Optional[str] = None
    sort: int = 0


class AttributeBase(BaseModel):
    """Base attribute definition"""
    code: str = Field(..., pattern=r'^[a-z][a-z0-9_]*$', min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=100)
    name_uk: Optional[str] = None
    name_ru: Optional[str] = None
    type: AttributeType
    unit: Optional[str] = None  # GB, кг, дюйм, мм
    unit_uk: Optional[str] = None
    unit_ru: Optional[str] = None
    description: Optional[str] = None
    options: Optional[List[AttributeValueOption]] = None  # for enum/set types
    facetable: bool = True  # can be used in filters
    searchable: bool = False  # include in text search
    comparable: bool = True  # show in product comparison
    is_global: bool = False  # available for all categories


class AttributeCreate(AttributeBase):
    """Create new attribute"""
    pass


class Attribute(AttributeBase):
    """Full attribute with ID and timestamps"""
    id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ============= CATEGORY ATTRIBUTE (FILTER SCHEMA) =============

class CategoryAttributeBase(BaseModel):
    """Configuration of attribute for specific category"""
    category_id: str
    attribute_id: str
    filter_ui: FilterUIType = FilterUIType.MULTISELECT
    group: Optional[str] = None  # "Екран", "Пам'ять", "Додатково"
    group_uk: Optional[str] = None
    group_ru: Optional[str] = None
    sort: int = 0
    pinned: bool = False  # show in quick filters
    collapsed: bool = False  # collapsed by default in sidebar
    required: bool = False  # required when adding product
    show_in_card: bool = True  # show in product card
    show_in_list: bool = False  # show in product list item
    
    # Validation rules
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    
    # Override options for this category (subset of attribute options)
    allowed_values: Optional[List[str]] = None


class CategoryAttributeCreate(CategoryAttributeBase):
    """Create category attribute binding"""
    pass


class CategoryAttribute(CategoryAttributeBase):
    """Full category attribute with metadata"""
    id: str
    created_at: datetime
    
    # Joined data (populated by service)
    attribute: Optional[Attribute] = None
    
    class Config:
        from_attributes = True


# ============= PRODUCT ATTRIBUTE VALUE =============

class ProductAttributeValue(BaseModel):
    """Single attribute value for product"""
    attribute_id: str
    attribute_code: str  # denormalized for fast queries
    value_number: Optional[float] = None
    value_string: Optional[str] = None
    value_bool: Optional[bool] = None
    value_set: Optional[List[str]] = None  # for multi-value


class ProductAttributesUpdate(BaseModel):
    """Update product attributes"""
    product_id: str
    attributes: List[ProductAttributeValue]


# ============= FILTER SCHEMA RESPONSE =============

class FilterOption(BaseModel):
    """Single option in filter with count"""
    value: str
    label: str
    count: int = 0
    color_hex: Optional[str] = None


class FilterDefinition(BaseModel):
    """Single filter definition for frontend"""
    code: str
    name: str
    type: AttributeType
    ui: FilterUIType
    unit: Optional[str] = None
    group: Optional[str] = None
    pinned: bool = False
    collapsed: bool = False
    
    # For range filters
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    
    # For select/multiselect
    options: Optional[List[FilterOption]] = None


class FilterGroup(BaseModel):
    """Group of filters"""
    name: str
    filters: List[FilterDefinition]


class CategoryFiltersResponse(BaseModel):
    """Complete filter schema for category"""
    category_id: str
    category_name: str
    groups: List[FilterGroup]
    quick_filters: List[FilterDefinition]  # pinned filters for top bar
    price_range: Dict[str, float]  # {min, max}


# ============= CATALOG QUERY =============

class FilterValue(BaseModel):
    """Single filter value in query"""
    code: str
    value: Optional[str] = None  # for single value
    values: Optional[List[str]] = None  # for multi-select
    min: Optional[float] = None  # for range
    max: Optional[float] = None  # for range


class CatalogQuery(BaseModel):
    """Catalog query with filters"""
    category_slug: Optional[str] = None
    q: Optional[str] = None  # search query
    filters: Optional[List[FilterValue]] = []
    sort: str = "popular"
    page: int = 1
    limit: int = 24


# ============= FACETS RESPONSE =============

class FacetValue(BaseModel):
    """Single facet value with count"""
    value: str
    label: str
    count: int


class Facet(BaseModel):
    """Facet for attribute"""
    code: str
    name: str
    type: AttributeType
    values: List[FacetValue]


class CatalogResponse(BaseModel):
    """Catalog response with products and facets"""
    products: List[Dict[str, Any]]
    total: int
    page: int
    pages: int
    facets: List[Facet]
    applied_filters: List[FilterValue]
