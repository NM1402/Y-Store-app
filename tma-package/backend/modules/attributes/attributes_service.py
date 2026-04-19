"""
Attributes Service - Business logic for dynamic filters
"""
from typing import Dict, Any, Optional, List
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging
import re

from .attributes_repo import AttributesRepository
from .attributes_types import (
    AttributeType, FilterUIType, FilterDefinition, FilterGroup,
    CategoryFiltersResponse, FilterOption, Facet, FacetValue
)

logger = logging.getLogger(__name__)


class AttributesService:
    """Service for attributes and dynamic filters"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.repo = AttributesRepository(db)
    
    async def init(self):
        """Initialize indexes"""
        await self.repo.ensure_indexes()
    
    # ============= FILTER SCHEMA FOR FRONTEND =============
    
    async def get_category_filters(
        self, 
        category_slug: str,
        lang: str = "uk"
    ) -> CategoryFiltersResponse:
        """
        Get complete filter schema for category.
        This is what frontend uses to render filters dynamically.
        """
        # Get category
        category = await self.db.categories.find_one(
            {"$or": [{"slug": category_slug}, {"id": category_slug}]},
            {"_id": 0}
        )
        if not category:
            # Return empty schema
            return CategoryFiltersResponse(
                category_id="",
                category_name="",
                groups=[],
                quick_filters=[],
                price_range={"min": 0, "max": 0}
            )
        
        category_id = category["id"]
        category_name = category.get(f"name_{lang}") or category.get("name", "")
        
        # Get category attributes with definitions
        cat_attrs = await self.repo.get_category_attributes(category_id, include_attribute=True)
        
        # Get facet values (counts)
        facets = await self.repo.get_facets_for_category(category_id)
        
        # Get price range
        price_range = await self.repo.get_price_range_for_category(category_id)
        
        # Build filter definitions
        filters_by_group: Dict[str, List[FilterDefinition]] = {}
        quick_filters: List[FilterDefinition] = []
        
        for ca in cat_attrs:
            attr = ca.get("attribute")
            if not attr:
                continue
            
            code = attr["code"]
            attr_type = attr["type"]
            facet_data = facets.get(code, {})
            
            # Get localized name
            name = attr.get(f"name_{lang}") or attr.get("name", code)
            unit = attr.get(f"unit_{lang}") or attr.get("unit")
            group = ca.get(f"group_{lang}") or ca.get("group") or "Інше"
            
            # Build options from facet data
            options = None
            min_val = None
            max_val = None
            
            if facet_data.get("type") == "range":
                min_val = facet_data.get("min")
                max_val = facet_data.get("max")
            elif facet_data.get("type") == "values":
                options = [
                    FilterOption(
                        value=str(v["value"]),
                        label=str(v["value"]),
                        count=v["count"],
                        color_hex=self._get_color_hex(attr, v["value"])
                    )
                    for v in facet_data.get("values", [])
                ]
            elif facet_data.get("type") == "boolean":
                options = [
                    FilterOption(value="true", label="Так", count=0),
                    FilterOption(value="false", label="Ні", count=0)
                ]
                for v in facet_data.get("values", []):
                    if v["value"] is True:
                        options[0].count = v["count"]
                    elif v["value"] is False:
                        options[1].count = v["count"]
            
            filter_def = FilterDefinition(
                code=code,
                name=name,
                type=AttributeType(attr_type),
                ui=FilterUIType(ca.get("filter_ui", "multiselect")),
                unit=unit,
                group=group,
                pinned=ca.get("pinned", False),
                collapsed=ca.get("collapsed", False),
                min_value=min_val,
                max_value=max_val,
                options=options
            )
            
            # Add to group
            if group not in filters_by_group:
                filters_by_group[group] = []
            filters_by_group[group].append(filter_def)
            
            # Add to quick filters if pinned
            if ca.get("pinned"):
                quick_filters.append(filter_def)
        
        # Build groups
        groups = [
            FilterGroup(name=name, filters=filters)
            for name, filters in filters_by_group.items()
        ]
        
        # Add price as special filter
        price_filter = FilterDefinition(
            code="price",
            name="Ціна" if lang == "uk" else "Цена",
            type=AttributeType.NUMBER,
            ui=FilterUIType.RANGE,
            unit="грн",
            group="Ціна",
            pinned=True,
            min_value=price_range["min"],
            max_value=price_range["max"]
        )
        quick_filters.insert(0, price_filter)
        
        return CategoryFiltersResponse(
            category_id=category_id,
            category_name=category_name,
            groups=groups,
            quick_filters=quick_filters,
            price_range=price_range
        )
    
    def _get_color_hex(self, attr: Dict, value: str) -> Optional[str]:
        """Get color hex for color attributes"""
        if attr.get("code") not in ("color", "colour", "колір"):
            return None
        
        options = attr.get("options", [])
        for opt in options:
            if opt.get("value") == value:
                return opt.get("color_hex")
        
        # Fallback colors
        color_map = {
            "black": "#000000", "чорний": "#000000",
            "white": "#FFFFFF", "білий": "#FFFFFF",
            "red": "#FF0000", "червоний": "#FF0000",
            "blue": "#0066CC", "синій": "#0066CC",
            "green": "#00AA00", "зелений": "#00AA00",
            "gold": "#FFD700", "золотий": "#FFD700",
            "silver": "#C0C0C0", "сріблястий": "#C0C0C0",
            "gray": "#808080", "сірий": "#808080",
            "grey": "#808080",
            "pink": "#FFC0CB", "рожевий": "#FFC0CB",
            "purple": "#800080", "фіолетовий": "#800080",
        }
        return color_map.get(value.lower())
    
    # ============= CATALOG QUERY WITH FILTERS =============
    
    async def query_catalog(
        self,
        category_slug: Optional[str] = None,
        search_query: Optional[str] = None,
        filters: Dict[str, Any] = None,  # {code: value} or {code: {min, max}}
        sort: str = "popular",
        page: int = 1,
        limit: int = 24,
        lang: str = "uk"
    ) -> Dict[str, Any]:
        """
        Query catalog with dynamic filters.
        
        Filter format in URL: f.price=1000-50000&f.brand=apple,samsung&f.nfc=true
        """
        filters = filters or {}
        
        # Build base query
        query = {"status": "published"}
        
        # Category filter
        if category_slug:
            category = await self.db.categories.find_one(
                {"$or": [{"slug": category_slug}, {"id": category_slug}]},
                {"_id": 0, "id": 1}
            )
            if category:
                query["category_id"] = category["id"]
        
        # Search query
        if search_query and len(search_query) >= 2:
            rx = re.compile(re.escape(search_query), re.IGNORECASE)
            query["$or"] = [
                {"title": rx},
                {"brand": rx},
                {"description": rx}
            ]
        
        # Price filter (special)
        if "price" in filters:
            price_val = filters["price"]
            price_q = {}
            if isinstance(price_val, dict):
                if price_val.get("min") is not None:
                    price_q["$gte"] = float(price_val["min"])
                if price_val.get("max") is not None:
                    price_q["$lte"] = float(price_val["max"])
            elif isinstance(price_val, str) and "-" in price_val:
                parts = price_val.split("-")
                if len(parts) == 2:
                    price_q["$gte"] = float(parts[0])
                    price_q["$lte"] = float(parts[1])
            if price_q:
                query["price"] = price_q
        
        # Brand filter (special - stored as product.brand, not in attrs)
        if "brand" in filters:
            brand_val = filters["brand"]
            if isinstance(brand_val, str):
                brand_list = [b.strip() for b in brand_val.split(",")]
            else:
                brand_list = brand_val if isinstance(brand_val, list) else [brand_val]
            if brand_list:
                query["brand"] = {"$in": brand_list}
        
        # In stock filter
        if "in_stock" in filters:
            val = filters["in_stock"]
            if val in (True, "true", "1", 1):
                query["stock_level"] = {"$gt": 0}
        
        # Dynamic attribute filters
        attr_filters = []
        for code, value in filters.items():
            if code in ("price", "brand", "in_stock", "sort", "page", "limit"):
                continue
            
            if isinstance(value, dict):
                # Range filter
                range_q = {"attrs.code": code}
                if value.get("min") is not None:
                    range_q["attrs.n"] = {"$gte": float(value["min"])}
                if value.get("max") is not None:
                    range_q.setdefault("attrs.n", {})["$lte"] = float(value["max"])
                attr_filters.append(range_q)
            
            elif isinstance(value, str):
                if value.lower() in ("true", "false"):
                    # Boolean
                    attr_filters.append({
                        "attrs": {"$elemMatch": {"code": code, "b": value.lower() == "true"}}
                    })
                elif "," in value:
                    # Multi-select
                    values = [v.strip() for v in value.split(",")]
                    attr_filters.append({
                        "attrs": {"$elemMatch": {"code": code, "s": {"$in": values}}}
                    })
                elif "-" in value and value.replace("-", "").replace(".", "").isdigit():
                    # Range as string "100-500"
                    parts = value.split("-")
                    if len(parts) == 2:
                        attr_filters.append({
                            "attrs": {"$elemMatch": {
                                "code": code,
                                "n": {"$gte": float(parts[0]), "$lte": float(parts[1])}
                            }}
                        })
                else:
                    # Single value
                    attr_filters.append({
                        "attrs": {"$elemMatch": {"code": code, "s": value}}
                    })
            
            elif isinstance(value, list):
                # Multi-select as list
                attr_filters.append({
                    "attrs": {"$elemMatch": {"code": code, "s": {"$in": value}}}
                })
            
            elif isinstance(value, bool):
                attr_filters.append({
                    "attrs": {"$elemMatch": {"code": code, "b": value}}
                })
        
        if attr_filters:
            query["$and"] = query.get("$and", []) + attr_filters
        
        # Sort
        sort_map = {
            "popular": [("views_count", -1), ("rating", -1)],
            "price_asc": [("price", 1)],
            "price_desc": [("price", -1)],
            "new": [("created_at", -1)],
            "rating": [("rating", -1)],
            "discount": [("discount_percent", -1)]
        }
        sort_order = sort_map.get(sort, sort_map["popular"])
        
        # Execute query
        skip = (page - 1) * limit
        cursor = self.db.products.find(query, {"_id": 0}).sort(sort_order).skip(skip).limit(limit)
        products = await cursor.to_list(limit)
        
        total = await self.db.products.count_documents(query)
        pages = max(1, (total + limit - 1) // limit)
        
        # Get facets for current query (without filters applied, to show all options)
        category_id = query.get("category_id")
        facets_data = await self.repo.get_facets_for_category(category_id) if category_id else {}
        
        # Format facets for response
        facets = []
        for code, data in facets_data.items():
            if data.get("type") == "values":
                facets.append(Facet(
                    code=code,
                    name=code,  # Would need to join with attribute for real name
                    type=AttributeType.STRING,
                    values=[
                        FacetValue(value=v["value"], label=v["value"], count=v["count"])
                        for v in data.get("values", [])
                    ]
                ))
        
        return {
            "products": products,
            "total": total,
            "page": page,
            "pages": pages,
            "facets": [f.model_dump() for f in facets],
            "applied_filters": filters
        }
    
    # ============= SEED INITIAL ATTRIBUTES =============
    
    async def seed_default_attributes(self):
        """Seed common marketplace attributes"""
        defaults = [
            # Common
            {"code": "brand", "name": "Бренд", "name_uk": "Бренд", "name_ru": "Бренд", 
             "type": "string", "facetable": True, "is_global": True},
            {"code": "color", "name": "Колір", "name_uk": "Колір", "name_ru": "Цвет",
             "type": "enum", "facetable": True, "is_global": True,
             "options": [
                 {"value": "black", "label": "Чорний", "color_hex": "#000000"},
                 {"value": "white", "label": "Білий", "color_hex": "#FFFFFF"},
                 {"value": "silver", "label": "Сріблястий", "color_hex": "#C0C0C0"},
                 {"value": "gold", "label": "Золотий", "color_hex": "#FFD700"},
                 {"value": "blue", "label": "Синій", "color_hex": "#0066CC"},
                 {"value": "red", "label": "Червоний", "color_hex": "#FF0000"},
                 {"value": "green", "label": "Зелений", "color_hex": "#00AA00"},
                 {"value": "pink", "label": "Рожевий", "color_hex": "#FFC0CB"},
             ]},
            {"code": "warranty_months", "name": "Гарантія", "name_uk": "Гарантія", "name_ru": "Гарантия",
             "type": "number", "unit": "міс", "facetable": True, "is_global": True},
            
            # Smartphones
            {"code": "memory_gb", "name": "Пам'ять", "name_uk": "Пам'ять", "name_ru": "Память",
             "type": "number", "unit": "GB", "facetable": True},
            {"code": "ram_gb", "name": "Оперативна пам'ять", "name_uk": "Оперативна пам'ять", "name_ru": "Оперативная память",
             "type": "number", "unit": "GB", "facetable": True},
            {"code": "screen_size", "name": "Діагональ екрану", "name_uk": "Діагональ екрану", "name_ru": "Диагональ экрана",
             "type": "number", "unit": "дюйм", "facetable": True},
            {"code": "screen_type", "name": "Тип екрану", "name_uk": "Тип екрану", "name_ru": "Тип экрана",
             "type": "enum", "facetable": True,
             "options": [
                 {"value": "OLED", "label": "OLED"},
                 {"value": "AMOLED", "label": "AMOLED"},
                 {"value": "Super AMOLED", "label": "Super AMOLED"},
                 {"value": "IPS", "label": "IPS"},
                 {"value": "LCD", "label": "LCD"},
             ]},
            {"code": "nfc", "name": "NFC", "name_uk": "NFC", "name_ru": "NFC",
             "type": "boolean", "facetable": True},
            {"code": "5g", "name": "5G", "name_uk": "5G", "name_ru": "5G",
             "type": "boolean", "facetable": True},
            {"code": "battery_mah", "name": "Ємність батареї", "name_uk": "Ємність батареї", "name_ru": "Емкость батареи",
             "type": "number", "unit": "mAh", "facetable": True},
            {"code": "camera_mp", "name": "Камера", "name_uk": "Камера", "name_ru": "Камера",
             "type": "number", "unit": "MP", "facetable": True},
            
            # Laptops
            {"code": "cpu", "name": "Процесор", "name_uk": "Процесор", "name_ru": "Процессор",
             "type": "string", "facetable": True},
            {"code": "gpu", "name": "Відеокарта", "name_uk": "Відеокарта", "name_ru": "Видеокарта",
             "type": "string", "facetable": True},
            {"code": "ssd_gb", "name": "SSD", "name_uk": "SSD", "name_ru": "SSD",
             "type": "number", "unit": "GB", "facetable": True},
            
            # TVs
            {"code": "resolution", "name": "Роздільна здатність", "name_uk": "Роздільна здатність", "name_ru": "Разрешение",
             "type": "enum", "facetable": True,
             "options": [
                 {"value": "HD", "label": "HD (1280x720)"},
                 {"value": "Full HD", "label": "Full HD (1920x1080)"},
                 {"value": "4K", "label": "4K (3840x2160)"},
                 {"value": "8K", "label": "8K (7680x4320)"},
             ]},
            {"code": "smart_tv", "name": "Smart TV", "name_uk": "Smart TV", "name_ru": "Smart TV",
             "type": "boolean", "facetable": True},
            {"code": "refresh_rate", "name": "Частота оновлення", "name_uk": "Частота оновлення", "name_ru": "Частота обновления",
             "type": "number", "unit": "Hz", "facetable": True},
            
            # Appliances
            {"code": "power_w", "name": "Потужність", "name_uk": "Потужність", "name_ru": "Мощность",
             "type": "number", "unit": "Вт", "facetable": True},
            {"code": "volume_l", "name": "Об'єм", "name_uk": "Об'єм", "name_ru": "Объем",
             "type": "number", "unit": "л", "facetable": True},
            {"code": "energy_class", "name": "Клас енергоспоживання", "name_uk": "Клас енергоспоживання", "name_ru": "Класс энергопотребления",
             "type": "enum", "facetable": True,
             "options": [
                 {"value": "A+++", "label": "A+++"},
                 {"value": "A++", "label": "A++"},
                 {"value": "A+", "label": "A+"},
                 {"value": "A", "label": "A"},
                 {"value": "B", "label": "B"},
                 {"value": "C", "label": "C"},
             ]},
        ]
        
        created = 0
        for attr in defaults:
            existing = await self.repo.get_attribute_by_code(attr["code"])
            if not existing:
                await self.repo.create_attribute(attr)
                created += 1
                logger.info(f"Created attribute: {attr['code']}")
        
        logger.info(f"Seeded {created} attributes")
        return {"created": created, "total": len(defaults)}
