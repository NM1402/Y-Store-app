"""
Support Module - Customer Support Ticket System
Handles support tickets with Telegram notifications
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from core.db import db
from core.security import get_current_user, get_current_admin
import uuid

router = APIRouter(prefix="/api/support", tags=["Support"])

# Ticket categories
TICKET_CATEGORIES = [
    {"id": "order", "name_uk": "Питання по замовленню", "name_ru": "Вопрос по заказу"},
    {"id": "payment", "name_uk": "Оплата та повернення", "name_ru": "Оплата и возврат"},
    {"id": "delivery", "name_uk": "Доставка", "name_ru": "Доставка"},
    {"id": "product", "name_uk": "Питання по товару", "name_ru": "Вопрос о товаре"},
    {"id": "technical", "name_uk": "Технічні проблеми", "name_ru": "Технические проблемы"},
    {"id": "other", "name_uk": "Інше", "name_ru": "Другое"},
]

class TicketCreate(BaseModel):
    category: str = Field(..., description="Ticket category ID")
    subject: str = Field(..., min_length=5, max_length=200)
    message: str = Field(..., min_length=10, max_length=2000)
    contact_telegram: Optional[str] = None
    contact_viber: Optional[str] = None
    order_id: Optional[str] = None

class TicketReply(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)

class TicketStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(new|in_progress|resolved|closed)$")

def serialize_ticket(t: dict) -> dict:
    """Convert MongoDB ticket to JSON-safe dict"""
    return {
        "id": t.get("id"),
        "user_id": t.get("user_id"),
        "user_email": t.get("user_email"),
        "user_name": t.get("user_name"),
        "category": t.get("category"),
        "subject": t.get("subject"),
        "message": t.get("message"),
        "contact_telegram": t.get("contact_telegram"),
        "contact_viber": t.get("contact_viber"),
        "order_id": t.get("order_id"),
        "status": t.get("status", "new"),
        "replies": t.get("replies", []),
        "created_at": t.get("created_at"),
        "updated_at": t.get("updated_at"),
    }

async def send_telegram_notification(ticket: dict, user_name: str, user_email: str):
    """Send notification to Telegram admin chat via alerts queue"""
    # Find category name
    category_name = next(
        (c["name_uk"] for c in TICKET_CATEGORIES if c["id"] == ticket.get("category")),
        ticket.get("category")
    )
    
    # Format message
    contact_info = ""
    if ticket.get("contact_telegram"):
        contact_info += f"\n📱 Telegram: {ticket['contact_telegram']}"
    if ticket.get("contact_viber"):
        contact_info += f"\n📞 Viber: {ticket['contact_viber']}"
    
    text = f"""🆘 <b>Новий тикет підтримки!</b>

👤 <b>Користувач:</b> {user_name}
📧 <b>Email:</b> {user_email}
{contact_info}

📁 <b>Категорія:</b> {category_name}
📋 <b>Тема:</b> {ticket['subject']}

💬 <b>Повідомлення:</b>
{ticket['message'][:500]}{'...' if len(ticket['message']) > 500 else ''}

🔗 Відкрийте адмін-панель для відповіді"""

    try:
        # Create alert in queue for bot to process (with dedupe_key)
        alert = {
            "id": str(uuid.uuid4()),
            "type": "support_ticket",
            "text": text,
            "payload": {
                "ticket_id": ticket["id"],
                "category": ticket["category"],
                "user_email": user_email
            },
            "dedupe_key": f"support_ticket_{ticket['id']}",
            "status": "PENDING",
            "reply_markup": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "attempts": 0,
            "next_retry_at": None
        }
        await db.admin_alerts_queue.insert_one(alert)
        print(f"Support ticket alert queued: {ticket['id']}")
    except Exception as e:
        print(f"Failed to queue Telegram notification: {e}")

@router.get("/categories")
async def get_categories():
    """Get available ticket categories"""
    return TICKET_CATEGORIES

@router.post("/tickets")
async def create_ticket(
    data: TicketCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new support ticket (requires auth)"""
    now = datetime.now(timezone.utc).isoformat()
    
    ticket = {
        "id": str(uuid.uuid4()),
        "user_id": current_user.get("id"),
        "user_email": current_user.get("email"),
        "user_name": current_user.get("full_name", current_user.get("email", "").split("@")[0]),
        "category": data.category,
        "subject": data.subject,
        "message": data.message,
        "contact_telegram": data.contact_telegram,
        "contact_viber": data.contact_viber,
        "order_id": data.order_id,
        "status": "new",
        "replies": [],
        "created_at": now,
        "updated_at": now,
    }
    
    await db.support_tickets.insert_one(ticket)
    
    # Send Telegram notification via alerts queue
    await send_telegram_notification(
        ticket,
        user_name=current_user.get("full_name", "Користувач"),
        user_email=current_user.get("email", "")
    )
    
    return serialize_ticket(ticket)

@router.get("/tickets")
async def get_user_tickets(
    current_user: dict = Depends(get_current_user)
):
    """Get tickets for current user"""
    cursor = db.support_tickets.find(
        {"user_id": current_user.get("id")},
        {"_id": 0}
    ).sort("created_at", -1)
    
    tickets = await cursor.to_list(100)
    return [serialize_ticket(t) for t in tickets]

@router.get("/tickets/{ticket_id}")
async def get_ticket(
    ticket_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get specific ticket"""
    ticket = await db.support_tickets.find_one(
        {"id": ticket_id},
        {"_id": 0}
    )
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check access - user can only see own tickets, admin can see all
    if ticket["user_id"] != current_user.get("id") and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    return serialize_ticket(ticket)

# Admin endpoints
@router.get("/admin/tickets")
async def get_all_tickets(
    status: Optional[str] = None,
    admin_user: dict = Depends(get_current_admin)
):
    """Get all tickets (admin only)"""
    query = {}
    if status:
        query["status"] = status
    
    cursor = db.support_tickets.find(query, {"_id": 0}).sort("created_at", -1)
    tickets = await cursor.to_list(500)
    return [serialize_ticket(t) for t in tickets]

@router.patch("/admin/tickets/{ticket_id}/status")
async def update_ticket_status(
    ticket_id: str,
    data: TicketStatusUpdate,
    admin_user: dict = Depends(get_current_admin)
):
    """Update ticket status (admin only)"""
    result = await db.support_tickets.update_one(
        {"id": ticket_id},
        {"$set": {
            "status": data.status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    return {"success": True, "status": data.status}

@router.post("/admin/tickets/{ticket_id}/reply")
async def reply_to_ticket(
    ticket_id: str,
    data: TicketReply,
    admin_user: dict = Depends(get_current_admin)
):
    """Reply to ticket (admin only)"""
    now = datetime.now(timezone.utc).isoformat()
    
    reply = {
        "id": str(uuid.uuid4()),
        "admin_id": admin_user.get("id"),
        "admin_name": admin_user.get("full_name", "Адміністратор"),
        "message": data.message,
        "created_at": now
    }
    
    result = await db.support_tickets.update_one(
        {"id": ticket_id},
        {
            "$push": {"replies": reply},
            "$set": {
                "status": "in_progress",
                "updated_at": now
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    return {"success": True, "reply": reply}

@router.get("/admin/stats")
async def get_support_stats(
    admin_user: dict = Depends(get_current_admin)
):
    """Get support statistics (admin only)"""
    pipeline = [
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1}
        }}
    ]
    
    cursor = db.support_tickets.aggregate(pipeline)
    stats = await cursor.to_list(10)
    
    result = {
        "new": 0,
        "in_progress": 0,
        "resolved": 0,
        "closed": 0,
        "total": 0
    }
    
    for s in stats:
        if s["_id"] in result:
            result[s["_id"]] = s["count"]
        result["total"] += s["count"]
    
    return result
