"""
Attributes Repository - Database operations for attributes system
"""
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid
import logging

logger = logging.getLogger(__name__)


class AttributesRepository:
    """Repository for attributes, category_attributes, product_attributes"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.attributes = db["attributes"]
        self.category_attributes = db["category_attributes"]
        self.products = db["products"]
    
    async def ensure_indexes(self):
        """Create necessary indexes"""
        # Attributes
        await self.attributes.create_index("code", unique=True)
        await self.attributes.create_index("type")
        await self.attributes.create_index("is_global")
        
        # Category attributes
        await self.category_attributes.create_index([
            ("category_id", 1),
            ("attribute_id", 1)
        ], unique=True)
        await self.category_attributes.create_index("category_id")
        await self.category_attributes.create_index([("category_id", 1), ("sort", 1)])
        await self.category_attributes.create_index([("category_id", 1), ("pinned", -1)])
        
        # Product attributes - compound index for filtering
        await self.products.create_index([
            ("category_id", 1),
            ("attrs", 1)
        ])
        await self.products.create_index("attrs.code")
        
        logger.info("✅ Attributes indexes created")
    
    # ============= ATTRIBUTES CRUD =============
    
    async def create_attribute(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new attribute definition"""
        now = datetime.now(timezone.utc)
        doc = {
            **data,
            "id": str(uuid.uuid4()),
            "created_at": now,
            "updated_at": now
        }
        await self.attributes.insert_one(doc)
        doc.pop("_id", None)
        return doc
    
    async def get_attribute(self, attr_id: str) -> Optional[Dict[str, Any]]:
        """Get attribute by ID"""
        doc = await self.attributes.find_one({"id": attr_id}, {"_id": 0})
        return doc
    
    async def get_attribute_by_code(self, code: str) -> Optional[Dict[str, Any]]:
        """Get attribute by code"""
        doc = await self.attributes.find_one({"code": code}, {"_id": 0})
        return doc
    
    async def list_attributes(
        self, 
        skip: int = 0, 
        limit: int = 100,
        type_filter: Optional[str] = None,
        is_global: Optional[bool] = None
    ) -> List[Dict[str, Any]]:
        """List all attributes"""
        query = {}
        if type_filter:
            query["type"] = type_filter
        if is_global is not None:
            query["is_global"] = is_global
        
        cursor = self.attributes.find(query, {"_id": 0}).skip(skip).limit(limit)
        return await cursor.to_list(limit)
    
    async def update_attribute(self, attr_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update attribute"""
        data["updated_at"] = datetime.now(timezone.utc)
        result = await self.attributes.find_one_and_update(
            {"id": attr_id},
            {"$set": data},
            return_document=True,
            projection={"_id": 0}
        )
        return result
    
    async def delete_attribute(self, attr_id: str) -> bool:
        """Delete attribute (also removes from category bindings)"""
        result = await self.attributes.delete_one({"id": attr_id})
        if result.deleted_count:
            # Remove from all category bindings
            await self.category_attributes.delete_many({"attribute_id": attr_id})
            return True
        return False
    
    # ============= CATEGORY ATTRIBUTES CRUD =============
    
    async def add_attribute_to_category(
        self, 
        category_id: str, 
        attribute_id: str,
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Add attribute to category with filter configuration"""
        now = datetime.now(timezone.utc)
        
        # Check if already exists
        existing = await self.category_attributes.find_one({
            "category_id": category_id,
            "attribute_id": attribute_id
        })
        
        if existing:
            # Update existing
            result = await self.category_attributes.find_one_and_update(
                {"category_id": category_id, "attribute_id": attribute_id},
                {"$set": {**config, "updated_at": now}},
                return_document=True,
                projection={"_id": 0}
            )
            return result
        
        # Create new
        doc = {
            "id": str(uuid.uuid4()),
            "category_id": category_id,
            "attribute_id": attribute_id,
            **config,
            "created_at": now
        }
        await self.category_attributes.insert_one(doc)
        doc.pop("_id", None)
        return doc
    
    async def get_category_attributes(
        self, 
        category_id: str,
        include_attribute: bool = True
    ) -> List[Dict[str, Any]]:
        """Get all attributes configured for category"""
        cursor = self.category_attributes.find(
            {"category_id": category_id},
            {"_id": 0}
        ).sort("sort", 1)
        
        items = await cursor.to_list(100)
        
        if include_attribute:
            # Join attribute definitions
            attr_ids = [item["attribute_id"] for item in items]
            attrs = await self.attributes.find(
                {"id": {"$in": attr_ids}},
                {"_id": 0}
            ).to_list(100)
            attrs_map = {a["id"]: a for a in attrs}
            
            for item in items:
                item["attribute"] = attrs_map.get(item["attribute_id"])
        
        return items
    
    async def get_category_attribute(
        self, 
        category_id: str, 
        attribute_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get single category attribute binding"""
        return await self.category_attributes.find_one(
            {"category_id": category_id, "attribute_id": attribute_id},
            {"_id": 0}
        )
    
    async def update_category_attribute(
        self, 
        category_id: str, 
        attribute_id: str,
        config: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update category attribute configuration"""
        result = await self.category_attributes.find_one_and_update(
            {"category_id": category_id, "attribute_id": attribute_id},
            {"$set": config},
            return_document=True,
            projection={"_id": 0}
        )
        return result
    
    async def remove_attribute_from_category(
        self, 
        category_id: str, 
        attribute_id: str
    ) -> bool:
        """Remove attribute from category"""
        result = await self.category_attributes.delete_one({
            "category_id": category_id,
            "attribute_id": attribute_id
        })
        return result.deleted_count > 0
    
    async def reorder_category_attributes(
        self, 
        category_id: str, 
        attribute_ids: List[str]
    ) -> bool:
        """Reorder attributes in category"""
        for i, attr_id in enumerate(attribute_ids):
            await self.category_attributes.update_one(
                {"category_id": category_id, "attribute_id": attr_id},
                {"$set": {"sort": i}}
            )
        return True
    
    # ============= PRODUCT ATTRIBUTES =============
    
    async def set_product_attributes(
        self, 
        product_id: str, 
        attributes: List[Dict[str, Any]]
    ) -> bool:
        """Set product attributes (replaces existing)"""
        # Format: [{code, value_number/value_string/value_bool/value_set}]
        formatted = []
        for attr in attributes:
            item = {
                "code": attr["attribute_code"],
                "attr_id": attr.get("attribute_id")
            }
            if attr.get("value_number") is not None:
                item["n"] = attr["value_number"]
            if attr.get("value_string") is not None:
                item["s"] = attr["value_string"]
            if attr.get("value_bool") is not None:
                item["b"] = attr["value_bool"]
            if attr.get("value_set"):
                item["set"] = attr["value_set"]
            formatted.append(item)
        
        result = await self.products.update_one(
            {"id": product_id},
            {"$set": {"attrs": formatted, "updated_at": datetime.now(timezone.utc)}}
        )
        return result.modified_count > 0
    
    async def get_product_attributes(self, product_id: str) -> List[Dict[str, Any]]:
        """Get product attributes"""
        product = await self.products.find_one({"id": product_id}, {"attrs": 1})
        return product.get("attrs", []) if product else []
    
    # ============= FACETS & AGGREGATION =============
    
    async def get_facets_for_category(
        self, 
        category_id: str,
        base_query: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Get facet values with counts for category.
        Returns: {attr_code: [{value, count}]}
        """
        base_query = base_query or {"status": "published"}
        if category_id:
            base_query["category_id"] = category_id
        
        # Get category attributes to know what to aggregate
        cat_attrs = await self.get_category_attributes(category_id, include_attribute=True)
        if not cat_attrs:
            return {}
        
        facets = {}
        
        for ca in cat_attrs:
            attr = ca.get("attribute")
            if not attr or not attr.get("facetable", True):
                continue
            
            code = attr["code"]
            attr_type = attr["type"]
            
            if attr_type in ("number",):
                # Range aggregation
                pipeline = [
                    {"$match": {**base_query, f"attrs.code": code}},
                    {"$unwind": "$attrs"},
                    {"$match": {"attrs.code": code}},
                    {"$group": {
                        "_id": None,
                        "min": {"$min": "$attrs.n"},
                        "max": {"$max": "$attrs.n"}
                    }}
                ]
                result = await self.products.aggregate(pipeline).to_list(1)
                if result:
                    facets[code] = {
                        "type": "range",
                        "min": result[0].get("min"),
                        "max": result[0].get("max")
                    }
            
            elif attr_type in ("string", "enum"):
                # Value counts
                pipeline = [
                    {"$match": {**base_query, f"attrs.code": code}},
                    {"$unwind": "$attrs"},
                    {"$match": {"attrs.code": code}},
                    {"$group": {
                        "_id": "$attrs.s",
                        "count": {"$sum": 1}
                    }},
                    {"$sort": {"count": -1}},
                    {"$limit": 50}
                ]
                result = await self.products.aggregate(pipeline).to_list(50)
                facets[code] = {
                    "type": "values",
                    "values": [{"value": r["_id"], "count": r["count"]} for r in result if r["_id"]]
                }
            
            elif attr_type == "boolean":
                # Boolean counts
                pipeline = [
                    {"$match": {**base_query, f"attrs.code": code}},
                    {"$unwind": "$attrs"},
                    {"$match": {"attrs.code": code}},
                    {"$group": {
                        "_id": "$attrs.b",
                        "count": {"$sum": 1}
                    }}
                ]
                result = await self.products.aggregate(pipeline).to_list(2)
                facets[code] = {
                    "type": "boolean",
                    "values": [{"value": r["_id"], "count": r["count"]} for r in result]
                }
            
            elif attr_type == "set":
                # Multi-value counts
                pipeline = [
                    {"$match": {**base_query, f"attrs.code": code}},
                    {"$unwind": "$attrs"},
                    {"$match": {"attrs.code": code}},
                    {"$unwind": "$attrs.set"},
                    {"$group": {
                        "_id": "$attrs.set",
                        "count": {"$sum": 1}
                    }},
                    {"$sort": {"count": -1}},
                    {"$limit": 50}
                ]
                result = await self.products.aggregate(pipeline).to_list(50)
                facets[code] = {
                    "type": "values",
                    "values": [{"value": r["_id"], "count": r["count"]} for r in result if r["_id"]]
                }
        
        return facets
    
    async def get_price_range_for_category(
        self, 
        category_id: str = None,
        base_query: Dict[str, Any] = None
    ) -> Dict[str, float]:
        """Get min/max price for category"""
        query = base_query or {"status": "published"}
        if category_id:
            query["category_id"] = category_id
        
        pipeline = [
            {"$match": query},
            {"$group": {
                "_id": None,
                "min": {"$min": "$price"},
                "max": {"$max": "$price"}
            }}
        ]
        result = await self.products.aggregate(pipeline).to_list(1)
        if result:
            return {"min": result[0].get("min", 0), "max": result[0].get("max", 0)}
        return {"min": 0, "max": 0}
