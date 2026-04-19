"""
CRM Service - Customer Relationship Management
Handles customer analytics, segmentation, and RFM analysis
"""

from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class CRMService:
    def __init__(self, db):
        self.db = db
    
    async def get_customer_profile(self, user_id: str) -> Dict[str, Any]:
        """
        Get comprehensive customer profile with all CRM data
        """
        try:
            # Get user info
            user = await self.db.users.find_one({"id": user_id}, {"_id": 0})
            if not user:
                return None
            
            # Get orders
            orders = await self.db.orders.find({"buyer_id": user_id}, {"_id": 0}).to_list(1000)
            
            # Calculate metrics
            total_orders = len(orders)
            total_spent = sum(order.get("total_amount", 0) for order in orders)
            avg_order_value = total_spent / total_orders if total_orders > 0 else 0
            
            # Last order date
            last_order_date = None
            if orders:
                last_order_date = max(order.get("created_at") for order in orders if order.get("created_at"))
            
            # Days since last order
            days_since_last_order = None
            if last_order_date:
                days_since_last_order = (datetime.now(timezone.utc) - last_order_date).days
            
            # Customer segment
            segment = self.determine_segment(total_orders, total_spent, days_since_last_order)
            
            # Get notes
            notes = await self.db.customer_notes.find({"customer_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
            
            # Get tasks
            tasks = await self.db.crm_tasks.find({"customer_id": user_id}, {"_id": 0}).to_list(100)
            
            # Get cart (abandoned cart check)
            cart = await self.db.carts.find_one({"user_id": user_id}, {"_id": 0})
            has_abandoned_cart = cart and len(cart.get("items", [])) > 0
            
            return {
                "id": user["id"],
                "email": user["email"],
                "full_name": user.get("full_name", ""),
                "phone": user.get("phone"),
                "city": user.get("city"),
                "created_at": user.get("created_at"),
                "total_orders": total_orders,
                "total_spent": total_spent,
                "avg_order_value": avg_order_value,
                "last_order_date": last_order_date,
                "days_since_last_order": days_since_last_order,
                "segment": segment,
                "notes_count": len(notes),
                "tasks_count": len(tasks),
                "has_abandoned_cart": has_abandoned_cart,
                "orders": orders[-10:],  # Last 10 orders
                "notes": notes[:20],  # Last 20 notes
                "tasks": tasks[:20]  # Last 20 tasks
            }
        except Exception as e:
            logger.error(f"Error getting customer profile: {str(e)}")
            return None
    
    def determine_segment(
        self, 
        total_orders: int, 
        total_spent: float, 
        days_since_last_order: Optional[int]
    ) -> str:
        """
        Determine customer segment based on behavior
        """
        # VIP: 5+ orders or $2000+ spent
        if total_orders >= 5 or total_spent >= 2000:
            return "VIP"
        
        # Active: ordered in last 30 days
        if days_since_last_order is not None and days_since_last_order <= 30:
            return "Active"
        
        # At Risk: ordered 30-90 days ago
        if days_since_last_order is not None and 30 < days_since_last_order <= 90:
            return "At Risk"
        
        # Inactive: ordered 90+ days ago
        if days_since_last_order is not None and days_since_last_order > 90:
            return "Inactive"
        
        # New: registered but no orders
        if total_orders == 0:
            return "New"
        
        return "Regular"
    
    async def get_all_customers_with_metrics(self) -> List[Dict[str, Any]]:
        """
        Get all customers with CRM metrics
        """
        try:
            # Aggregate query to get customer metrics
            pipeline = [
                {
                    "$lookup": {
                        "from": "orders",
                        "localField": "id",
                        "foreignField": "buyer_id",
                        "as": "orders"
                    }
                },
                {
                    "$project": {
                        "_id": 0,
                        "id": 1,
                        "email": 1,
                        "full_name": 1,
                        "phone": 1,
                        "city": 1,
                        "created_at": 1,
                        "total_orders": {"$size": "$orders"},
                        "total_spent": {"$sum": "$orders.total_amount"},
                        "last_order": {"$max": "$orders.created_at"}
                    }
                }
            ]
            
            customers = await self.db.users.aggregate(pipeline).to_list(1000)
            
            # Calculate additional metrics
            now = datetime.now(timezone.utc)
            for customer in customers:
                # Average order value
                total_orders = customer.get("total_orders", 0)
                total_spent = customer.get("total_spent", 0)
                customer["avg_order_value"] = total_spent / total_orders if total_orders > 0 else 0
                
                # Days since last order
                if customer.get("last_order"):
                    customer["days_since_last_order"] = (now - customer["last_order"]).days
                else:
                    customer["days_since_last_order"] = None
                
                # Segment
                customer["segment"] = self.determine_segment(
                    total_orders,
                    total_spent,
                    customer["days_since_last_order"]
                )
                
                # Get notes count
                notes_count = await self.db.customer_notes.count_documents({"customer_id": customer["id"]})
                customer["notes_count"] = notes_count
                
                # Get pending tasks count  
                tasks_count = await self.db.crm_tasks.count_documents({
                    "customer_id": customer["id"],
                    "status": {"$in": ["pending", "in_progress"]}
                })
                customer["pending_tasks"] = tasks_count
            
            return customers
        except Exception as e:
            logger.error(f"Error getting customers with metrics: {str(e)}")
            return []
    
    async def get_sales_pipeline(self) -> Dict[str, Any]:
        """
        Get leads pipeline status
        """
        try:
            # Count leads by status
            new_leads = await self.db.leads.count_documents({"status": "new"})
            contacted = await self.db.leads.count_documents({"status": "contacted"})
            qualified = await self.db.leads.count_documents({"status": "qualified"})
            converted = await self.db.leads.count_documents({"status": "converted"})
            lost = await self.db.leads.count_documents({"status": "lost"})
            
            total_leads = new_leads + contacted + qualified + converted + lost
            
            return {
                "new": new_leads,
                "contacted": contacted,
                "qualified": qualified,
                "converted": converted,
                "lost": lost,
                "total": total_leads,
                "conversion_rate": (converted / total_leads * 100) if total_leads > 0 else 0
            }
        except Exception as e:
            logger.error(f"Error getting sales pipeline: {str(e)}")
            return {
                "new": 0,
                "contacted": 0,
                "qualified": 0,
                "converted": 0,
                "lost": 0,
                "total": 0,
                "conversion_rate": 0
            }
    
    async def get_customer_segments_stats(self) -> Dict[str, int]:
        """
        Get count of customers in each segment
        """
        customers = await self.get_all_customers_with_metrics()
        
        segments = {}
        for customer in customers:
            segment = customer.get("segment", "Unknown")
            segments[segment] = segments.get(segment, 0) + 1
        
        return segments
    
    async def get_customer_activity(self, days: int = 30) -> Dict[str, Any]:
        """
        Get customer activity for the last N days
        """
        try:
            start_date = datetime.now(timezone.utc) - timedelta(days=days)
            
            # New registrations
            new_customers = await self.db.users.count_documents({
                "created_at": {"$gte": start_date}
            })
            
            # Orders placed
            orders_placed = await self.db.orders.count_documents({
                "created_at": {"$gte": start_date}
            })
            
            # Active customers (placed orders)
            active_customers_pipeline = [
                {
                    "$match": {
                        "created_at": {"$gte": start_date}
                    }
                },
                {
                    "$group": {
                        "_id": "$buyer_id"
                    }
                },
                {
                    "$count": "count"
                }
            ]
            
            active_result = await self.db.orders.aggregate(active_customers_pipeline).to_list(1)
            active_customers = active_result[0]["count"] if active_result else 0
            
            return {
                "new_customers": new_customers,
                "orders_placed": orders_placed,
                "active_customers": active_customers,
                "period_days": days
            }
        except Exception as e:
            logger.error(f"Error getting customer activity: {str(e)}")
            return {
                "new_customers": 0,
                "orders_placed": 0,
                "active_customers": 0,
                "period_days": days
            }
