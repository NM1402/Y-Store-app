"""
ElasticSearch Service
Full-text search with autocomplete, fuzzy matching, and relevance scoring
"""
import os
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# ElasticSearch configuration
ES_HOST = os.environ.get("ELASTICSEARCH_HOST", "localhost")
ES_PORT = os.environ.get("ELASTICSEARCH_PORT", "9200")
ES_INDEX = os.environ.get("ELASTICSEARCH_INDEX", "products")
ES_ENABLED = os.environ.get("ELASTICSEARCH_ENABLED", "false").lower() == "true"

# Fallback to in-memory search if ES not available
_search_cache: Dict[str, Any] = {}
_products_index: List[Dict] = []


class SearchService:
    """
    ElasticSearch service with MongoDB fallback
    Provides: full-text search, autocomplete, fuzzy matching, filters
    """
    
    def __init__(self, db=None):
        self.db = db
        self.es_client = None
        self._init_elasticsearch()
    
    def _init_elasticsearch(self):
        """Initialize ElasticSearch client if enabled"""
        if not ES_ENABLED:
            logger.info("ElasticSearch disabled, using MongoDB fallback")
            return
        
        try:
            from elasticsearch import AsyncElasticsearch
            self.es_client = AsyncElasticsearch(
                hosts=[f"http://{ES_HOST}:{ES_PORT}"],
                request_timeout=30
            )
            logger.info(f"ElasticSearch connected: {ES_HOST}:{ES_PORT}")
        except ImportError:
            logger.warning("elasticsearch package not installed, using MongoDB fallback")
        except Exception as e:
            logger.error(f"ElasticSearch connection failed: {e}")
    
    async def search_products(
        self,
        query: str,
        category_id: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        brand: Optional[str] = None,
        in_stock: bool = True,
        sort_by: str = "relevance",
        page: int = 1,
        limit: int = 20,
        lang: str = "uk"
    ) -> Dict[str, Any]:
        """
        Advanced product search with filters and sorting
        """
        if self.es_client:
            return await self._es_search(
                query, category_id, min_price, max_price, 
                brand, in_stock, sort_by, page, limit, lang
            )
        else:
            return await self._mongo_search(
                query, category_id, min_price, max_price,
                brand, in_stock, sort_by, page, limit, lang
            )
    
    async def _es_search(
        self, query: str, category_id: Optional[str], 
        min_price: Optional[float], max_price: Optional[float],
        brand: Optional[str], in_stock: bool, sort_by: str,
        page: int, limit: int, lang: str
    ) -> Dict[str, Any]:
        """ElasticSearch query"""
        must = []
        filter_clauses = []
        
        # Full-text search with boost
        if query:
            must.append({
                "multi_match": {
                    "query": query,
                    "fields": [
                        f"title.{lang}^3",
                        "title.*^2",
                        f"description.{lang}",
                        "brand^2",
                        "sku",
                        "tags"
                    ],
                    "type": "best_fields",
                    "fuzziness": "AUTO",
                    "prefix_length": 2
                }
            })
        
        # Filters
        if category_id:
            filter_clauses.append({"term": {"category_id": category_id}})
        
        if min_price is not None or max_price is not None:
            price_range = {}
            if min_price is not None:
                price_range["gte"] = min_price
            if max_price is not None:
                price_range["lte"] = max_price
            filter_clauses.append({"range": {"price": price_range}})
        
        if brand:
            filter_clauses.append({"term": {"brand.keyword": brand}})
        
        if in_stock:
            filter_clauses.append({"range": {"stock_level": {"gt": 0}}})
        
        filter_clauses.append({"term": {"status": "published"}})
        
        # Build query
        es_query = {
            "bool": {
                "must": must if must else [{"match_all": {}}],
                "filter": filter_clauses
            }
        }
        
        # Sorting
        sort = []
        if sort_by == "price_asc":
            sort.append({"price": "asc"})
        elif sort_by == "price_desc":
            sort.append({"price": "desc"})
        elif sort_by == "newest":
            sort.append({"created_at": "desc"})
        elif sort_by == "popular":
            sort.append({"views_count": "desc"})
        else:  # relevance
            sort.append({"_score": "desc"})
        
        # Execute search
        try:
            result = await self.es_client.search(
                index=ES_INDEX,
                query=es_query,
                sort=sort,
                from_=(page - 1) * limit,
                size=limit,
                highlight={
                    "fields": {
                        f"title.{lang}": {},
                        f"description.{lang}": {"fragment_size": 150}
                    }
                },
                aggs={
                    "categories": {"terms": {"field": "category_id", "size": 20}},
                    "brands": {"terms": {"field": "brand.keyword", "size": 20}},
                    "price_stats": {"stats": {"field": "price"}}
                }
            )
            
            hits = result["hits"]["hits"]
            total = result["hits"]["total"]["value"]
            
            products = []
            for hit in hits:
                product = hit["_source"]
                product["_id"] = hit["_id"]
                product["_score"] = hit["_score"]
                if "highlight" in hit:
                    product["_highlight"] = hit["highlight"]
                products.append(product)
            
            return {
                "products": products,
                "total": total,
                "page": page,
                "limit": limit,
                "total_pages": (total + limit - 1) // limit,
                "aggregations": {
                    "categories": result["aggregations"]["categories"]["buckets"],
                    "brands": result["aggregations"]["brands"]["buckets"],
                    "price_stats": result["aggregations"]["price_stats"]
                }
            }
            
        except Exception as e:
            logger.error(f"ElasticSearch error: {e}")
            return await self._mongo_search(
                query, category_id, min_price, max_price,
                brand, in_stock, sort_by, page, limit, lang
            )
    
    async def _mongo_search(
        self, query: str, category_id: Optional[str],
        min_price: Optional[float], max_price: Optional[float],
        brand: Optional[str], in_stock: bool, sort_by: str,
        page: int, limit: int, lang: str
    ) -> Dict[str, Any]:
        """MongoDB fallback search with text index"""
        if self.db is None:
            return {"products": [], "total": 0, "page": page, "limit": limit}
        
        mongo_query = {"status": {"$in": ["published", "active"]}}
        
        # Text search
        if query:
            # Try text search first
            mongo_query["$or"] = [
                {"$text": {"$search": query}},
                {"title": {"$regex": query, "$options": "i"}},
                {"description": {"$regex": query, "$options": "i"}},
                {"brand": {"$regex": query, "$options": "i"}},
                {"sku": {"$regex": query, "$options": "i"}}
            ]
        
        # Filters
        if category_id:
            mongo_query["category_id"] = category_id
        
        if min_price is not None:
            mongo_query.setdefault("price", {})["$gte"] = min_price
        if max_price is not None:
            mongo_query.setdefault("price", {})["$lte"] = max_price
        
        if brand:
            mongo_query["brand"] = brand
        
        if in_stock:
            mongo_query["stock_level"] = {"$gt": 0}
        
        # Sorting
        sort_field = [("created_at", -1)]
        if sort_by == "price_asc":
            sort_field = [("price", 1)]
        elif sort_by == "price_desc":
            sort_field = [("price", -1)]
        elif sort_by == "newest":
            sort_field = [("created_at", -1)]
        elif sort_by == "popular":
            sort_field = [("views_count", -1)]
        
        # Execute query
        skip = (page - 1) * limit
        
        try:
            # Handle $text search separately
            if query and "$or" in mongo_query:
                # Try simple regex search if text search fails
                simple_query = {
                    k: v for k, v in mongo_query.items() 
                    if k != "$or"
                }
                simple_query["$or"] = [
                    {"title": {"$regex": query, "$options": "i"}},
                    {"description": {"$regex": query, "$options": "i"}},
                    {"brand": {"$regex": query, "$options": "i"}}
                ]
                mongo_query = simple_query
            
            cursor = self.db.products.find(mongo_query).sort(sort_field).skip(skip).limit(limit)
            products = await cursor.to_list(limit)
            
            # Convert ObjectId
            for p in products:
                p["_id"] = str(p.get("_id", ""))
            
            total = await self.db.products.count_documents(mongo_query)
            
            # Get aggregations
            agg_pipeline = [
                {"$match": mongo_query},
                {"$facet": {
                    "categories": [
                        {"$group": {"_id": "$category_id", "count": {"$sum": 1}}},
                        {"$sort": {"count": -1}},
                        {"$limit": 20}
                    ],
                    "brands": [
                        {"$match": {"brand": {"$exists": True, "$ne": None}}},
                        {"$group": {"_id": "$brand", "count": {"$sum": 1}}},
                        {"$sort": {"count": -1}},
                        {"$limit": 20}
                    ],
                    "price_stats": [
                        {"$group": {
                            "_id": None,
                            "min": {"$min": "$price"},
                            "max": {"$max": "$price"},
                            "avg": {"$avg": "$price"}
                        }}
                    ]
                }}
            ]
            
            agg_result = await self.db.products.aggregate(agg_pipeline).to_list(1)
            agg_data = agg_result[0] if agg_result else {}
            
            return {
                "products": products,
                "total": total,
                "page": page,
                "limit": limit,
                "total_pages": (total + limit - 1) // limit,
                "aggregations": {
                    "categories": [
                        {"key": c["_id"], "doc_count": c["count"]} 
                        for c in agg_data.get("categories", [])
                    ],
                    "brands": [
                        {"key": b["_id"], "doc_count": b["count"]}
                        for b in agg_data.get("brands", [])
                    ],
                    "price_stats": agg_data.get("price_stats", [{}])[0] if agg_data.get("price_stats") else {}
                }
            }
            
        except Exception as e:
            logger.error(f"MongoDB search error: {e}")
            return {"products": [], "total": 0, "page": page, "limit": limit}
    
    async def autocomplete(
        self, query: str, limit: int = 10, lang: str = "uk"
    ) -> List[Dict[str, Any]]:
        """
        Get autocomplete suggestions
        """
        if not query or len(query) < 2:
            return []
        
        if self.es_client:
            try:
                result = await self.es_client.search(
                    index=ES_INDEX,
                    query={
                        "bool": {
                            "should": [
                                {
                                    "match_phrase_prefix": {
                                        f"title.{lang}": {
                                            "query": query,
                                            "boost": 3
                                        }
                                    }
                                },
                                {
                                    "match_phrase_prefix": {
                                        "brand": {
                                            "query": query,
                                            "boost": 2
                                        }
                                    }
                                }
                            ],
                            "filter": [
                                {"term": {"status": "published"}},
                                {"range": {"stock_level": {"gt": 0}}}
                            ]
                        }
                    },
                    size=limit,
                    _source=["title", "price", "images", "id", "brand"]
                )
                
                return [hit["_source"] for hit in result["hits"]["hits"]]
                
            except Exception as e:
                logger.error(f"Autocomplete ES error: {e}")
        
        # MongoDB fallback
        if self.db is not None:
            try:
                cursor = self.db.products.find(
                    {
                        "$or": [
                            {"title": {"$regex": f"^{query}", "$options": "i"}},
                            {"brand": {"$regex": f"^{query}", "$options": "i"}}
                        ],
                        "status": {"$in": ["published", "active"]},
                        "stock_level": {"$gt": 0}
                    },
                    {"title": 1, "price": 1, "images": 1, "id": 1, "brand": 1, "_id": 0}
                ).limit(limit)
                
                return await cursor.to_list(limit)
            except Exception as e:
                logger.error(f"Autocomplete MongoDB error: {e}")
        
        return []
    
    async def get_popular_searches(self, limit: int = 10) -> List[str]:
        """Get popular search queries"""
        if self.db is None:
            return []
        
        try:
            pipeline = [
                {"$match": {"type": "search"}},
                {"$group": {"_id": "$query", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": limit}
            ]
            
            results = await self.db.search_logs.aggregate(pipeline).to_list(limit)
            return [r["_id"] for r in results if r["_id"]]
        except Exception:
            return []
    
    async def log_search(self, query: str, results_count: int, user_id: Optional[str] = None):
        """Log search query for analytics"""
        if self.db is None:
            return
        
        try:
            await self.db.search_logs.insert_one({
                "type": "search",
                "query": query,
                "results_count": results_count,
                "user_id": user_id,
                "created_at": datetime.now(timezone.utc)
            })
        except Exception:
            pass
    
    async def index_product(self, product: Dict[str, Any]):
        """Index a product in ElasticSearch"""
        if not self.es_client:
            return
        
        try:
            await self.es_client.index(
                index=ES_INDEX,
                id=product.get("id") or str(product.get("_id")),
                document=product
            )
        except Exception as e:
            logger.error(f"Failed to index product: {e}")
    
    async def delete_product(self, product_id: str):
        """Remove product from ElasticSearch index"""
        if not self.es_client:
            return
        
        try:
            await self.es_client.delete(index=ES_INDEX, id=product_id)
        except Exception as e:
            logger.error(f"Failed to delete product from index: {e}")
    
    async def reindex_all(self):
        """Reindex all products from MongoDB to ElasticSearch"""
        if not self.es_client or not self.db:
            return {"indexed": 0, "errors": 0}
        
        indexed = 0
        errors = 0
        
        try:
            cursor = self.db.products.find({"status": {"$in": ["published", "active"]}})
            async for product in cursor:
                try:
                    product["_id"] = str(product["_id"])
                    await self.index_product(product)
                    indexed += 1
                except Exception:
                    errors += 1
        except Exception as e:
            logger.error(f"Reindex error: {e}")
        
        return {"indexed": indexed, "errors": errors}


# Global instance
_search_service: Optional[SearchService] = None


def get_search_service(db=None) -> SearchService:
    """Get or create search service instance"""
    global _search_service
    if _search_service is None:
        _search_service = SearchService(db)
    elif db is not None and _search_service.db is None:
        _search_service.db = db
    return _search_service
