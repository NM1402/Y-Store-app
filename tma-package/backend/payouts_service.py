"""
Payouts Service
Manages seller payout requests and processing
"""
from datetime import datetime, timezone
from typing import Dict, List, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from uuid import uuid4

class PayoutsService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def calculate_seller_balance(self, seller_id: str) -> Dict[str, float]:
        """Calculate seller's available balance"""
        # Get all completed orders for this seller
        pipeline = [
            {"$unwind": "$items"},
            {
                "$match": {
                    "items.seller_id": seller_id,
                    "payment_status": "paid",
                    "status": {"$in": ["delivered", "completed"]}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total_revenue": {"$sum": {"$multiply": ["$items.price", "$items.quantity"]}}
                }
            }
        ]
        
        result = await self.db.orders.aggregate(pipeline).to_list(1)
        total_revenue = result[0]["total_revenue"] if result else 0
        
        # Get total paid out amount
        payouts = await self.db.payouts.find(
            {"seller_id": seller_id, "status": {"$in": ["completed", "processing"]}},
            {"_id": 0}
        ).to_list(1000)
        
        total_paid = sum(p.get("amount", 0) for p in payouts)
        
        # Platform commission (10%)
        commission = total_revenue * 0.10
        available_balance = total_revenue - commission - total_paid
        
        return {
            "total_revenue": round(total_revenue, 2),
            "commission": round(commission, 2),
            "total_paid": round(total_paid, 2),
            "available_balance": round(max(0, available_balance), 2)
        }
    
    async def create_payout_request(self, seller_id: str, amount: float, payment_method: str, payment_details: Dict) -> Dict:
        """Create a new payout request"""
        # Verify seller has sufficient balance
        balance = await self.calculate_seller_balance(seller_id)
        
        if amount > balance["available_balance"]:
            raise ValueError("Insufficient balance for payout")
        
        if amount < 50:  # Minimum payout amount
            raise ValueError("Minimum payout amount is $50")
        
        payout = {
            "id": str(uuid4()),
            "seller_id": seller_id,
            "amount": amount,
            "payment_method": payment_method,
            "payment_details": payment_details,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "processed_at": None
        }
        
        await self.db.payouts.insert_one(payout)
        
        return payout
    
    async def get_seller_payouts(self, seller_id: str) -> List[Dict]:
        """Get all payouts for a seller"""
        payouts = await self.db.payouts.find(
            {"seller_id": seller_id},
            {"_id": 0}
        ).sort([("created_at", -1)]).to_list(1000)
        
        return payouts
    
    async def get_pending_payouts(self) -> List[Dict]:
        """Get all pending payouts (admin only)"""
        payouts = await self.db.payouts.find(
            {"status": "pending"},
            {"_id": 0}
        ).sort([("created_at", -1)]).to_list(1000)
        
        # Enrich with seller info
        for payout in payouts:
            seller = await self.db.users.find_one(
                {"id": payout["seller_id"]},
                {"_id": 0, "full_name": 1, "company_name": 1, "email": 1}
            )
            if seller:
                payout["seller_name"] = seller.get("company_name") or seller.get("full_name")
                payout["seller_email"] = seller.get("email")
        
        return payouts
    
    async def process_payout(self, payout_id: str, admin_id: str, status: str = "completed") -> Dict:
        """Process a payout request (admin only)"""
        result = await self.db.payouts.update_one(
            {"id": payout_id},
            {
                "$set": {
                    "status": status,
                    "processed_at": datetime.now(timezone.utc).isoformat(),
                    "processed_by": admin_id,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        if result.modified_count == 0:
            raise ValueError("Payout not found")
        
        payout = await self.db.payouts.find_one({"id": payout_id}, {"_id": 0})
        return payout

payouts_service = None

def init_payouts(db: AsyncIOMotorDatabase):
    global payouts_service
    payouts_service = PayoutsService(db)
    return payouts_service
