"""
Advanced Analytics Service
Provides detailed analytics for admin dashboard
"""
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any
from motor.motor_asyncio import AsyncIOMotorDatabase

class AnalyticsService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def get_overview_stats(self) -> Dict[str, Any]:
        """Get overview statistics"""
        total_users = await self.db.users.count_documents({})
        total_products = await self.db.products.count_documents({})
        total_orders = await self.db.orders.count_documents({})
        
        orders = await self.db.orders.find({"payment_status": "paid"}).to_list(10000)
        total_revenue = sum(order.get("total_amount", 0) for order in orders)
        
        # Get counts by time period
        now = datetime.now(timezone.utc)
        month_ago = now - timedelta(days=30)
        week_ago = now - timedelta(days=7)
        
        users_this_month = await self.db.users.count_documents({
            "created_at": {"$gte": month_ago.isoformat()}
        })
        
        orders_this_month = await self.db.orders.count_documents({
            "created_at": {"$gte": month_ago.isoformat()}
        })
        
        return {
            "total_users": total_users,
            "total_products": total_products,
            "total_orders": total_orders,
            "total_revenue": round(total_revenue, 2),
            "users_this_month": users_this_month,
            "orders_this_month": orders_this_month,
            "avg_order_value": round(total_revenue / total_orders, 2) if total_orders > 0 else 0
        }
    
    async def get_revenue_by_period(self, days: int = 30) -> List[Dict[str, Any]]:
        """Get revenue grouped by day"""
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=days)
        
        pipeline = [
            {
                "$match": {
                    "payment_status": "paid",
                    "created_at": {"$gte": start_date.isoformat()}
                }
            },
            {
                "$group": {
                    "_id": {
                        "$dateToString": {
                            "format": "%Y-%m-%d",
                            "date": {"$dateFromString": {"dateString": "$created_at"}}
                        }
                    },
                    "revenue": {"$sum": "$total_amount"},
                    "orders": {"$sum": 1}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        
        results = await self.db.orders.aggregate(pipeline).to_list(100)
        
        return [
            {
                "date": r["_id"],
                "revenue": round(r["revenue"], 2),
                "orders": r["orders"]
            }
            for r in results
        ]
    
    async def get_top_products(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top selling products"""
        pipeline = [
            {"$unwind": "$items"},
            {
                "$group": {
                    "_id": "$items.product_id",
                    "total_quantity": {"$sum": "$items.quantity"},
                    "total_revenue": {"$sum": {"$multiply": ["$items.price", "$items.quantity"]}},
                    "order_count": {"$sum": 1}
                }
            },
            {"$sort": {"total_revenue": -1}},
            {"$limit": limit}
        ]
        
        results = await self.db.orders.aggregate(pipeline).to_list(limit)
        
        # Enrich with product details
        top_products = []
        for r in results:
            product = await self.db.products.find_one({"id": r["_id"]}, {"_id": 0, "title": 1, "images": 1})
            if product:
                top_products.append({
                    "product_id": r["_id"],
                    "title": product.get("title", "Unknown"),
                    "image": product.get("images", [None])[0],
                    "total_quantity": r["total_quantity"],
                    "total_revenue": round(r["total_revenue"], 2),
                    "order_count": r["order_count"]
                })
        
        return top_products
    
    async def get_category_distribution(self) -> List[Dict[str, Any]]:
        """Get product distribution by category"""
        pipeline = [
            {
                "$group": {
                    "_id": "$category_id",
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        
        results = await self.db.products.aggregate(pipeline).to_list(10)
        
        # Enrich with category names
        distribution = []
        for r in results:
            if r["_id"]:
                category = await self.db.categories.find_one({"id": r["_id"]}, {"_id": 0, "name": 1})
                if category:
                    distribution.append({
                        "category": category["name"],
                        "count": r["count"]
                    })
        
        return distribution
    
    async def get_user_growth(self, days: int = 30) -> List[Dict[str, Any]]:
        """Get user registration growth"""
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=days)
        
        pipeline = [
            {
                "$match": {
                    "created_at": {"$gte": start_date.isoformat()}
                }
            },
            {
                "$group": {
                    "_id": {
                        "$dateToString": {
                            "format": "%Y-%m-%d",
                            "date": {"$dateFromString": {"dateString": "$created_at"}}
                        }
                    },
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        
        results = await self.db.users.aggregate(pipeline).to_list(100)
        
        return [
            {
                "date": r["_id"],
                "count": r["count"]
            }
            for r in results
        ]
    
    async def get_seller_performance(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top performing sellers"""
        pipeline = [
            {"$unwind": "$items"},
            {
                "$group": {
                    "_id": "$items.seller_id",
                    "total_revenue": {"$sum": {"$multiply": ["$items.price", "$items.quantity"]}},
                    "total_orders": {"$sum": 1}
                }
            },
            {"$sort": {"total_revenue": -1}},
            {"$limit": limit}
        ]
        
        results = await self.db.orders.aggregate(pipeline).to_list(limit)
        
        # Enrich with seller details
        sellers = []
        for r in results:
            user = await self.db.users.find_one({"id": r["_id"]}, {"_id": 0, "full_name": 1, "company_name": 1})
            if user:
                sellers.append({
                    "seller_id": r["_id"],
                    "name": user.get("company_name") or user.get("full_name", "Unknown"),
                    "total_revenue": round(r["total_revenue"], 2),
                    "total_orders": r["total_orders"]
                })
        
        return sellers
    
    async def get_order_status_distribution(self) -> Dict[str, int]:
        """Get distribution of order statuses"""
        pipeline = [
            {
                "$group": {
                    "_id": "$status",
                    "count": {"$sum": 1}
                }
            }
        ]
        
        results = await self.db.orders.aggregate(pipeline).to_list(100)
        
        return {r["_id"]: r["count"] for r in results}

analytics_service = None

def init_analytics(db: AsyncIOMotorDatabase):
    global analytics_service
    analytics_service = AnalyticsService(db)
    return analytics_service
