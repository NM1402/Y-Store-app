"""
Growth Automation Scheduler
- Abandoned cart recovery
- Payment recovery
- Post-purchase review requests
- Telegram broadcasts
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
import os

logger = logging.getLogger(__name__)

# Global reference to scheduler task
_scheduler_task: Optional[asyncio.Task] = None
_db = None

# Telegram Bot Token
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")


async def send_telegram_message(chat_id: str, text: str) -> bool:
    """Send message via Telegram Bot"""
    if not TELEGRAM_BOT_TOKEN:
        logger.warning("Telegram bot token not configured")
        return False
    
    try:
        import aiohttp
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload) as resp:
                data = await resp.json()
                return data.get("ok", False)
    except Exception as e:
        logger.error(f"Telegram send error: {e}")
        return False


async def process_abandoned_carts():
    """Process abandoned carts and send notifications"""
    if _db is None:
        return
    
    threshold = datetime.now(timezone.utc) - timedelta(minutes=60)
    
    # Find abandoned carts
    carts = await _db.carts.find({
        "updated_at": {"$lt": threshold},
        "converted": {"$ne": True},
        "items": {"$exists": True, "$ne": []},
        "abandoned_notified": {"$ne": True}
    }).to_list(50)
    
    processed = 0
    for cart in carts:
        phone = cart.get("phone") or cart.get("user_phone")
        telegram_id = cart.get("telegram_id")
        
        if not phone and not telegram_id:
            continue
        
        items_count = len(cart.get("items", []))
        total = sum(
            item.get("price", 0) * item.get("quantity", 1)
            for item in cart.get("items", [])
        )
        
        # Create notification record
        notification = {
            "type": "abandoned_cart",
            "cart_id": str(cart.get("_id")),
            "phone": phone,
            "telegram_id": telegram_id,
            "items_count": items_count,
            "total_value": total,
            "status": "pending",
            "created_at": datetime.now(timezone.utc)
        }
        
        await _db.notifications.insert_one(notification)
        
        # Send Telegram notification if available
        if telegram_id:
            message = f"""🛒 <b>Ви забули завершити покупку!</b>

У вашому кошику {items_count} товар(ів) на суму <b>{total:.0f} грн</b>.

Оформіть замовлення зараз та не втратьте товар!

👉 <a href="https://y-store.ua/cart">Перейти до кошика</a>"""
            
            sent = await send_telegram_message(telegram_id, message)
            if sent:
                await _db.notifications.update_one(
                    {"_id": notification.get("_id")},
                    {"$set": {"status": "sent", "sent_at": datetime.now(timezone.utc)}}
                )
        
        # Mark cart as notified
        await _db.carts.update_one(
            {"_id": cart.get("_id")},
            {"$set": {"abandoned_notified": True}}
        )
        
        processed += 1
    
    if processed > 0:
        logger.info(f"📧 Processed {processed} abandoned carts")


async def process_payment_recovery():
    """Send payment recovery reminders"""
    if _db is None:
        return
    
    threshold = datetime.now(timezone.utc) - timedelta(minutes=30)
    
    # Find orders awaiting payment
    orders = await _db.orders.find({
        "status": {"$in": ["AWAITING_PAYMENT", "pending"]},
        "payment_status": {"$in": ["pending", "awaiting"]},
        "created_at": {"$lt": threshold},
        "payment_recovery_sent": {"$ne": True}
    }).to_list(30)
    
    processed = 0
    for order in orders:
        telegram_id = order.get("telegram_id") or order.get("user_telegram_id")
        order_id = order.get("id") or str(order.get("_id"))
        total = order.get("total_amount", 0)
        
        if not telegram_id:
            continue
        
        message = f"""💳 <b>Очікуємо оплату замовлення #{order_id[:8]}</b>

Сума до сплати: <b>{total:.0f} грн</b>

Оплатіть зараз, щоб ми відправили ваше замовлення сьогодні!

👉 <a href="https://y-store.ua/payment/resume/{order_id}">Оплатити замовлення</a>"""
        
        sent = await send_telegram_message(telegram_id, message)
        if sent:
            await _db.orders.update_one(
                {"_id": order.get("_id")},
                {"$set": {"payment_recovery_sent": True}}
            )
            processed += 1
    
    if processed > 0:
        logger.info(f"💳 Sent {processed} payment recovery reminders")


async def process_review_requests():
    """Request reviews for delivered orders"""
    if _db is None:
        return
    
    threshold = datetime.now(timezone.utc) - timedelta(days=3)
    
    # Find delivered orders ready for review request
    orders = await _db.orders.find({
        "status": "DELIVERED",
        "delivered_at": {"$lt": threshold},
        "review_requested": {"$ne": True}
    }).to_list(20)
    
    processed = 0
    for order in orders:
        telegram_id = order.get("telegram_id") or order.get("user_telegram_id")
        order_id = order.get("id") or str(order.get("_id"))
        
        if not telegram_id:
            continue
        
        message = f"""⭐ <b>Дякуємо за покупку!</b>

Сподіваємось, вам сподобались товари з замовлення #{order_id[:8]}.

Будемо вдячні за ваш відгук - це допоможе іншим покупцям!

👉 <a href="https://y-store.ua/review/{order_id}">Залишити відгук</a>"""
        
        sent = await send_telegram_message(telegram_id, message)
        if sent:
            await _db.orders.update_one(
                {"_id": order.get("_id")},
                {"$set": {"review_requested": True}}
            )
            processed += 1
    
    if processed > 0:
        logger.info(f"⭐ Sent {processed} review requests")


async def scheduler_loop():
    """Main scheduler loop"""
    logger.info("🚀 Growth scheduler started")
    
    while True:
        try:
            # Run tasks every 10 minutes
            await process_abandoned_carts()
            await asyncio.sleep(60)  # 1 min between tasks
            
            await process_payment_recovery()
            await asyncio.sleep(60)
            
            await process_review_requests()
            
            # Wait before next cycle (10 minutes total)
            await asyncio.sleep(480)  # 8 minutes
            
        except asyncio.CancelledError:
            logger.info("Growth scheduler stopped")
            break
        except Exception as e:
            logger.error(f"Growth scheduler error: {e}")
            await asyncio.sleep(300)  # Wait 5 min on error


def start_growth_scheduler(db):
    """Start the growth automation scheduler"""
    global _scheduler_task, _db
    _db = db
    
    loop = asyncio.get_event_loop()
    _scheduler_task = loop.create_task(scheduler_loop())
    logger.info("✅ Growth automation scheduler initialized")


def stop_growth_scheduler():
    """Stop the growth automation scheduler"""
    global _scheduler_task
    if _scheduler_task:
        _scheduler_task.cancel()
        _scheduler_task = None
