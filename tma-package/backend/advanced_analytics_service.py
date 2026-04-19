"""
Advanced Analytics Service
Comprehensive analytics and metrics for admin dashboard
"""

from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)

class AdvancedAnalyticsService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def get_site_visits(self, days: int = 30) -> Dict[str, Any]:
        """
        Get site visit statistics with time metrics
        """
        try:
            start_date = datetime.now(timezone.utc) - timedelta(days=days)
            
            # Get page views
            page_views = await self.db.analytics_events.count_documents({
                "event_type": "page_view",
                "created_at": {"$gte": start_date.isoformat()}
            })
            
            # Get unique visitors
            pipeline = [
                {
                    "$match": {
                        "event_type": "page_view",
                        "created_at": {"$gte": start_date.isoformat()}
                    }
                },
                {
                    "$group": {
                        "_id": "$user_id"
                    }
                },
                {"$count": "unique_visitors"}
            ]
            
            unique_result = await self.db.analytics_events.aggregate(pipeline).to_list(1)
            unique_visitors = unique_result[0]["unique_visitors"] if unique_result else 0
            
            # Get average session duration
            session_pipeline = [
                {
                    "$match": {
                        "event_type": "session_end",
                        "created_at": {"$gte": start_date.isoformat()}
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "avg_duration": {"$avg": "$session_duration"},
                        "total_sessions": {"$sum": 1}
                    }
                }
            ]
            
            session_result = await self.db.analytics_events.aggregate(session_pipeline).to_list(1)
            
            avg_session_duration = 0
            total_sessions = 0
            if session_result:
                avg_duration = session_result[0].get("avg_duration", 0)
                avg_session_duration = avg_duration / 1000 if avg_duration else 0  # Convert to seconds
                total_sessions = session_result[0].get("total_sessions", 0)
            
            # Get bounce rate (sessions with only 1 page view)
            bounce_pipeline = [
                {
                    "$match": {
                        "event_type": "session_end",
                        "created_at": {"$gte": start_date.isoformat()}
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "bounced": {
                            "$sum": {
                                "$cond": [{"$lte": ["$pages_viewed", 1]}, 1, 0]
                            }
                        },
                        "total": {"$sum": 1}
                    }
                }
            ]
            
            bounce_result = await self.db.analytics_events.aggregate(bounce_pipeline).to_list(1)
            bounce_rate = 0
            if bounce_result and bounce_result[0]["total"] > 0:
                bounce_rate = (bounce_result[0]["bounced"] / bounce_result[0]["total"]) * 100
            
            return {
                "unique_visitors": unique_visitors,
                "total_page_views": page_views,
                "total_sessions": total_sessions,
                "avg_session_duration": round(avg_session_duration, 2),
                "bounce_rate": round(bounce_rate, 2),
                "pages_per_session": round(page_views / total_sessions, 2) if total_sessions > 0 else 0,
                "period_days": days
            }
        except Exception as e:
            logger.error(f"Error getting site visits: {str(e)}")
            return {
                "unique_visitors": 0, 
                "total_page_views": 0,
                "total_sessions": 0,
                "avg_session_duration": 0,
                "bounce_rate": 0,
                "pages_per_session": 0,
                "period_days": days
            }
    
    async def get_abandoned_carts(self) -> Dict[str, Any]:
        """
        Get abandoned cart statistics
        Users who added to cart but didn't complete purchase
        """
        try:
            # Get all carts with items
            carts = await self.db.carts.find(
                {"items": {"$exists": True, "$ne": []}},
                {"_id": 0}
            ).to_list(1000)
            
            abandoned_carts = []
            total_value = 0
            
            for cart in carts:
                user_id = cart.get("user_id")
                
                # Check if user has any completed orders
                order = await self.db.orders.find_one(
                    {"buyer_id": user_id, "status": {"$in": ["completed", "processing"]}},
                    {"_id": 0}
                )
                
                if not order:  # No completed order = abandoned cart
                    cart_value = sum(
                        item.get("price", 0) * item.get("quantity", 0) 
                        for item in cart.get("items", [])
                    )
                    
                    # Get user info
                    user = await self.db.users.find_one(
                        {"id": user_id},
                        {"_id": 0, "email": 1, "full_name": 1}
                    )
                    
                    abandoned_carts.append({
                        "user_id": user_id,
                        "user_email": user.get("email") if user else "Unknown",
                        "user_name": user.get("full_name") if user else "Unknown",
                        "items_count": len(cart.get("items", [])),
                        "cart_value": cart_value,
                        "last_updated": cart.get("updated_at", "Unknown")
                    })
                    
                    total_value += cart_value
            
            return {
                "total_abandoned": len(abandoned_carts),
                "total_value": total_value,
                "carts": abandoned_carts[:20]  # Return top 20
            }
        except Exception as e:
            logger.error(f"Error getting abandoned carts: {str(e)}")
            return {"total_abandoned": 0, "total_value": 0, "carts": []}
    
    async def get_wishlist_analytics(self) -> Dict[str, Any]:
        """
        Analyze products in wishlist that haven't been purchased
        """
        try:
            # Get all products in wishlists
            pipeline = [
                {"$unwind": "$products"},
                {
                    "$group": {
                        "_id": "$products",
                        "users_count": {"$sum": 1},
                        "user_ids": {"$push": "$user_id"}
                    }
                },
                {"$sort": {"users_count": -1}},
                {"$limit": 20}
            ]
            
            wishlist_products = await self.db.favorites.aggregate(pipeline).to_list(100)
            
            result = []
            total_wishlist_value = 0
            
            for item in wishlist_products:
                product_id = item["_id"]
                
                # Get product details
                product = await self.db.products.find_one(
                    {"id": product_id},
                    {"_id": 0, "title": 1, "price": 1, "images": 1, "category_name": 1}
                )
                
                if product:
                    # Check how many actually bought it
                    purchased_count = 0
                    for user_id in item["user_ids"]:
                        order = await self.db.orders.find_one({
                            "buyer_id": user_id,
                            "items.product_id": product_id,
                            "status": {"$in": ["completed", "processing"]}
                        })
                        if order:
                            purchased_count += 1
                    
                    wishlist_count = item["users_count"]
                    not_purchased = wishlist_count - purchased_count
                    
                    result.append({
                        "product_id": product_id,
                        "product_name": product.get("title", "Unknown"),
                        "product_price": product.get("price", 0),
                        "product_image": product.get("images", [""])[0] if product.get("images") else "",
                        "category": product.get("category_name", "N/A"),
                        "in_wishlist": wishlist_count,
                        "purchased": purchased_count,
                        "not_purchased": not_purchased,
                        "conversion_rate": (purchased_count / wishlist_count * 100) if wishlist_count > 0 else 0
                    })
                    
                    total_wishlist_value += product.get("price", 0) * not_purchased
            
            return {
                "total_products": len(result),
                "potential_revenue": total_wishlist_value,
                "products": result
            }
        except Exception as e:
            logger.error(f"Error getting wishlist analytics: {str(e)}")
            return {"total_products": 0, "potential_revenue": 0, "products": []}
    
    async def get_conversion_funnel(self) -> Dict[str, Any]:
        """
        Get conversion funnel: Views → Add to Cart → Purchase
        """
        try:
            # Total unique visitors
            total_users = await self.db.users.count_documents({})
            
            # Users who added to cart
            users_with_cart = await self.db.carts.count_documents(
                {"items": {"$exists": True, "$ne": []}}
            )
            
            # Users who completed purchase
            pipeline = [
                {"$group": {"_id": "$buyer_id"}},
                {"$count": "total"}
            ]
            result = await self.db.orders.aggregate(pipeline).to_list(1)
            users_purchased = result[0]["total"] if result else 0
            
            return {
                "total_users": total_users,
                "added_to_cart": users_with_cart,
                "completed_purchase": users_purchased,
                "cart_conversion": (users_with_cart / total_users * 100) if total_users > 0 else 0,
                "purchase_conversion": (users_purchased / users_with_cart * 100) if users_with_cart > 0 else 0,
                "overall_conversion": (users_purchased / total_users * 100) if total_users > 0 else 0
            }
        except Exception as e:
            logger.error(f"Error getting conversion funnel: {str(e)}")
            return {}
    
    async def get_product_performance(self, days: int = 30) -> List[Dict[str, Any]]:
        """
        Get product performance metrics: views, carts, purchases
        """
        try:
            start_date = datetime.now(timezone.utc) - timedelta(days=days)
            
            # Get all products
            products = await self.db.products.find({}, {"_id": 0}).to_list(1000)
            
            result = []
            for product in products:
                product_id = product["id"]
                
                # Count in carts
                in_cart_count = 0
                carts = await self.db.carts.find(
                    {"items.product_id": product_id},
                    {"_id": 0}
                ).to_list(1000)
                for cart in carts:
                    for item in cart.get("items", []):
                        if item.get("product_id") == product_id:
                            in_cart_count += item.get("quantity", 0)
                
                # Count purchases
                pipeline = [
                    {
                        "$match": {
                            "created_at": {"$gte": start_date.isoformat()},
                            "items.product_id": product_id
                        }
                    },
                    {"$unwind": "$items"},
                    {
                        "$match": {"items.product_id": product_id}
                    },
                    {
                        "$group": {
                            "_id": None,
                            "total_sold": {"$sum": "$items.quantity"},
                            "total_revenue": {
                                "$sum": {
                                    "$multiply": ["$items.price", "$items.quantity"]
                                }
                            }
                        }
                    }
                ]
                
                sales_result = await self.db.orders.aggregate(pipeline).to_list(1)
                
                total_sold = 0
                total_revenue = 0
                if sales_result:
                    total_sold = sales_result[0].get("total_sold", 0)
                    total_revenue = sales_result[0].get("total_revenue", 0)
                
                # Count in wishlist
                wishlist_count = await self.db.favorites.count_documents(
                    {"products": product_id}
                )
                
                result.append({
                    "product_id": product_id,
                    "product_name": product.get("title", "Unknown"),
                    "category": product.get("category_name", "N/A"),
                    "price": product.get("price", 0),
                    "stock": product.get("stock_level", 0),
                    "in_cart": in_cart_count,
                    "in_wishlist": wishlist_count,
                    "total_sold": total_sold,
                    "revenue": total_revenue,
                    "cart_to_purchase_rate": (total_sold / in_cart_count * 100) if in_cart_count > 0 else 0
                })
            
            # Sort by revenue
            result.sort(key=lambda x: x["revenue"], reverse=True)
            
            return result[:50]  # Top 50
        except Exception as e:
            logger.error(f"Error getting product performance: {str(e)}")
            return []
    
    async def get_time_based_analytics(self, months: int = 12) -> Dict[str, Any]:
        """
        Get analytics broken down by time periods
        """
        try:
            start_date = datetime.now(timezone.utc) - timedelta(days=months * 30)
            
            # Orders by month
            pipeline = [
                {
                    "$match": {
                        "created_at": {"$gte": start_date.isoformat()}
                    }
                },
                {
                    "$addFields": {
                        "created_date": {"$toDate": "$created_at"}
                    }
                },
                {
                    "$group": {
                        "_id": {
                            "year": {"$year": "$created_date"},
                            "month": {"$month": "$created_date"}
                        },
                        "orders_count": {"$sum": 1},
                        "revenue": {"$sum": "$total_amount"}
                    }
                },
                {"$sort": {"_id.year": 1, "_id.month": 1}}
            ]
            
            monthly_data = await self.db.orders.aggregate(pipeline).to_list(100)
            
            # Format results
            months_data = []
            for item in monthly_data:
                month_name = datetime(item["_id"]["year"], item["_id"]["month"], 1).strftime("%B %Y")
                months_data.append({
                    "month": month_name,
                    "orders": item["orders_count"],
                    "revenue": item["revenue"]
                })
            
            return {
                "monthly_breakdown": months_data,
                "total_months": len(months_data)
            }
        except Exception as e:
            logger.error(f"Error getting time-based analytics: {str(e)}")
            return {"monthly_breakdown": [], "total_months": 0}
    
    async def get_customer_lifetime_value(self) -> List[Dict[str, Any]]:
        """
        Calculate customer lifetime value (LTV)
        """
        try:
            pipeline = [
                {
                    "$group": {
                        "_id": "$buyer_id",
                        "total_orders": {"$sum": 1},
                        "total_spent": {"$sum": "$total_amount"},
                        "first_order": {"$min": "$created_at"},
                        "last_order": {"$max": "$created_at"}
                    }
                },
                {"$sort": {"total_spent": -1}},
                {"$limit": 50}
            ]
            
            customers = await self.db.orders.aggregate(pipeline).to_list(100)
            
            result = []
            for customer in customers:
                user = await self.db.users.find_one(
                    {"id": customer["_id"]},
                    {"_id": 0, "email": 1, "full_name": 1}
                )
                
                result.append({
                    "user_id": customer["_id"],
                    "user_name": user.get("full_name") if user else "Unknown",
                    "user_email": user.get("email") if user else "Unknown",
                    "total_orders": customer["total_orders"],
                    "total_spent": customer["total_spent"],
                    "average_order": customer["total_spent"] / customer["total_orders"],
                    "first_order": customer["first_order"],
                    "last_order": customer["last_order"]
                })
            
            return result
        except Exception as e:
            logger.error(f"Error calculating LTV: {str(e)}")
            return []
    
    async def get_category_performance(self) -> List[Dict[str, Any]]:
        """
        Analyze performance by category
        """
        try:
            # Get all orders with items
            orders = await self.db.orders.find({}, {"_id": 0}).to_list(10000)
            
            category_stats = {}
            
            for order in orders:
                for item in order.get("items", []):
                    # Get product to find category
                    product = await self.db.products.find_one(
                        {"id": item.get("product_id")},
                        {"_id": 0, "category_name": 1}
                    )
                    
                    if product:
                        category = product.get("category_name", "Без категории")
                        
                        if category not in category_stats:
                            category_stats[category] = {
                                "orders": 0,
                                "items_sold": 0,
                                "revenue": 0
                            }
                        
                        category_stats[category]["orders"] += 1
                        category_stats[category]["items_sold"] += item.get("quantity", 0)
                        category_stats[category]["revenue"] += item.get("price", 0) * item.get("quantity", 0)
            
            # Convert to list
            result = [
                {
                    "category": cat,
                    "orders": stats["orders"],
                    "items_sold": stats["items_sold"],
                    "revenue": stats["revenue"]
                }
                for cat, stats in category_stats.items()
            ]
            
            result.sort(key=lambda x: x["revenue"], reverse=True)
            
            return result
        except Exception as e:
            logger.error(f"Error getting category performance: {str(e)}")
            return []

    async def get_time_on_pages(self) -> List[Dict[str, Any]]:
        """
        Get average time spent on different pages
        """
        try:
            pipeline = [
                {
                    "$match": {
                        "event_type": "page_leave",
                        "time_spent": {"$exists": True, "$gt": 0}
                    }
                },
                {
                    "$group": {
                        "_id": "$page_path",
                        "avg_time": {"$avg": "$time_spent"},
                        "total_visits": {"$sum": 1},
                        "min_time": {"$min": "$time_spent"},
                        "max_time": {"$max": "$time_spent"}
                    }
                },
                {"$sort": {"total_visits": -1}},
                {"$limit": 20}
            ]
            
            results = await self.db.analytics_events.aggregate(pipeline).to_list(100)
            
            formatted_results = []
            for item in results:
                formatted_results.append({
                    "page": item["_id"],
                    "avg_time_seconds": round(item["avg_time"] / 1000, 2),
                    "total_visits": item["total_visits"],
                    "min_time_seconds": round(item["min_time"] / 1000, 2),
                    "max_time_seconds": round(item["max_time"] / 1000, 2)
                })
            
            return formatted_results
        except Exception as e:
            logger.error(f"Error getting time on pages: {str(e)}")
            return []
    
    async def get_product_page_analytics(self) -> List[Dict[str, Any]]:
        """
        Get analytics for product pages (time spent, conversion)
        """
        try:
            # Get time spent on product pages
            pipeline = [
                {
                    "$match": {
                        "event_type": "page_leave",
                        "page_path": {"$regex": "^/product/"}
                    }
                },
                {
                    "$group": {
                        "_id": "$page_path",
                        "avg_time": {"$avg": "$time_spent"},
                        "visits": {"$sum": 1}
                    }
                },
                {"$sort": {"visits": -1}},
                {"$limit": 50}
            ]
            
            time_results = await self.db.analytics_events.aggregate(pipeline).to_list(100)
            
            # Get add to cart events
            cart_pipeline = [
                {"$match": {"event_type": "add_to_cart"}},
                {
                    "$group": {
                        "_id": "$product_id",
                        "cart_adds": {"$sum": 1}
                    }
                }
            ]
            
            cart_results = await self.db.analytics_events.aggregate(cart_pipeline).to_list(1000)
            cart_map = {item["_id"]: item["cart_adds"] for item in cart_results}
            
            formatted_results = []
            for item in time_results:
                product_id = item["_id"].split("/")[-1] if "/" in item["_id"] else None
                
                if product_id:
                    # Get product details
                    product = await self.db.products.find_one(
                        {"id": product_id},
                        {"_id": 0, "title": 1, "price": 1, "category_name": 1}
                    )
                    
                    if product:
                        cart_adds = cart_map.get(product_id, 0)
                        conversion_rate = (cart_adds / item["visits"] * 100) if item["visits"] > 0 else 0
                        
                        formatted_results.append({
                            "product_id": product_id,
                            "product_name": product.get("title", "Unknown"),
                            "category": product.get("category_name", "N/A"),
                            "price": product.get("price", 0),
                            "page_visits": item["visits"],
                            "avg_time_seconds": round(item["avg_time"] / 1000, 2),
                            "add_to_cart_count": cart_adds,
                            "view_to_cart_rate": round(conversion_rate, 2)
                        })
            
            return formatted_results
        except Exception as e:
            logger.error(f"Error getting product page analytics: {str(e)}")
            return []
    
    async def get_user_behavior_flow(self) -> Dict[str, Any]:
        """
        Get user behavior flow (which pages they visit in sequence)
        """
        try:
            # Get most common page sequences
            pipeline = [
                {"$match": {"event_type": "page_view"}},
                {"$sort": {"session_id": 1, "created_at": 1}},
                {
                    "$group": {
                        "_id": "$session_id",
                        "pages": {"$push": "$page_path"}
                    }
                },
                {"$limit": 1000}
            ]
            
            sessions = await self.db.analytics_events.aggregate(pipeline).to_list(1000)
            
            # Count page transitions
            transitions = {}
            for session in sessions:
                pages = session["pages"]
                for i in range(len(pages) - 1):
                    from_page = pages[i]
                    to_page = pages[i + 1]
                    key = f"{from_page} → {to_page}"
                    transitions[key] = transitions.get(key, 0) + 1
            
            # Sort by frequency
            sorted_transitions = sorted(
                transitions.items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:20]
            
            return {
                "top_transitions": [
                    {"flow": k, "count": v} 
                    for k, v in sorted_transitions
                ]
            }
        except Exception as e:
            logger.error(f"Error getting user behavior flow: {str(e)}")
            return {"top_transitions": []}

def get_advanced_analytics_service(db: AsyncIOMotorDatabase) -> AdvancedAnalyticsService:
    return AdvancedAnalyticsService(db)
