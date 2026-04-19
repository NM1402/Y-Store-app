"""
WayForPay Routes - Payment endpoints and webhook handler
"""
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from .providers.wayforpay import WayForPayProvider

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v2/payments/wayforpay", tags=["WayForPay Payments"])

# Initialize provider
wayforpay_provider = WayForPayProvider()


class CreatePaymentRequest(BaseModel):
    order_id: str
    amount: float
    currency: str = "UAH"
    items: Optional[List[dict]] = None
    customer: Optional[dict] = None
    return_url: Optional[str] = None


class CreatePaymentResponse(BaseModel):
    checkout_url: str
    provider_payment_id: str
    provider: str = "WAYFORPAY"
    form_data: Optional[dict] = None
    method: Optional[str] = None


@router.post("/create", response_model=CreatePaymentResponse)
async def create_payment(request: CreatePaymentRequest, req: Request):
    """
    Create WayForPay payment session.
    Returns checkout URL or form data for redirect.
    """
    try:
        order_data = {
            "id": request.order_id,
            "total": request.amount,
            "items": request.items or [{"title": "Замовлення", "quantity": 1, "price": request.amount}],
            "customer": request.customer or {},
        }
        
        # Override return URL if provided
        if request.return_url:
            wayforpay_provider.return_url = request.return_url
        
        result = await wayforpay_provider.create_payment(order_data)
        
        return CreatePaymentResponse(
            checkout_url=result["checkout_url"],
            provider_payment_id=result["provider_payment_id"],
            provider=result.get("provider", "WAYFORPAY"),
            form_data=result.get("form_data"),
            method=result.get("method"),
        )
        
    except Exception as e:
        logger.error(f"WayForPay create payment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhook")
async def webhook(request: Request):
    """
    WayForPay webhook handler.
    Receives payment status updates and responds with signed confirmation.
    """
    from core.db import db
    
    try:
        # Get raw body
        raw_body = await request.body()
        
        # Parse JSON
        try:
            payload = await request.json()
        except Exception:
            logger.error("WayForPay webhook: Invalid JSON")
            return {"status": "error", "message": "Invalid JSON"}
        
        logger.info(f"WayForPay webhook received: {payload.get('orderReference')} - {payload.get('transactionStatus')}")
        
        # Verify signature
        if not wayforpay_provider.verify_webhook(raw_body, payload):
            logger.warning(f"WayForPay webhook: Invalid signature for {payload.get('orderReference')}")
            # Continue processing but log warning (WayForPay may retry)
        
        # Parse into normalized format
        parsed = wayforpay_provider.parse_webhook(payload)
        order_reference = parsed["order_id"]
        status = parsed["status"]
        
        logger.info(f"WayForPay: Order {order_reference} status={status}")
        
        # Update order status in database
        now = datetime.now(timezone.utc)
        
        if status == "PAID":
            new_status = "paid"
        elif status == "PENDING":
            new_status = "pending_payment"
        elif status == "FAILED":
            new_status = "payment_failed"
        elif status == "REFUNDED":
            new_status = "refunded"
        else:
            new_status = None
        
        if new_status:
            result = await db.orders.update_one(
                {"id": order_reference},
                {
                    "$set": {
                        "status": new_status,
                        "payment": {
                            "provider": "WAYFORPAY",
                            "status": status,
                            "auth_code": parsed.get("auth_code"),
                            "card_pan": parsed.get("card_pan"),
                            "paid_at": now.isoformat() if status == "PAID" else None,
                        },
                        "updated_at": now
                    }
                }
            )
            logger.info(f"WayForPay: Order {order_reference} updated to {new_status}, modified={result.modified_count}")

            # Повідомити бот/адмінів про зміну статусу
            try:
                order_doc = await db.orders.find_one({"id": order_reference})
                if order_doc:
                    from modules.bot.alerts_service import AlertsService
                    alerts = AlertsService(db)
                    await alerts.init()
                    adapted = {
                        "id": order_reference,
                        "totals": {"grand": order_doc.get("total_amount", 0)},
                        "shipping": {
                            "full_name": order_doc.get("customer", {}).get("full_name", ""),
                            "phone": order_doc.get("customer", {}).get("phone", ""),
                            "city": order_doc.get("delivery", {}).get("city_name", ""),
                        },
                    }
                    if new_status == "paid":
                        await alerts.alert_order_paid(adapted)

                        # Auto-TTN after real WFP payment
                        try:
                            from modules.bot.bot_actions_service import BotActionsService
                            actions = BotActionsService(db)
                            ttn_res = await actions.create_ttn(order_reference)
                            if ttn_res.get("ok"):
                                logger.info(f"✅ Auto-TTN {ttn_res.get('ttn')} after WFP payment for {order_reference}")
                            else:
                                logger.warning(f"Auto-TTN after WFP paid failed: {ttn_res.get('error')}")
                        except Exception as te:
                            logger.warning(f"Auto-TTN after WFP paid error: {te}")

                    # Direct fallback alert
                    import os, httpx
                    bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
                    settings_doc = await db.bot_settings.find_one({"id": "global"})
                    admin_ids = settings_doc.get("admin_chat_ids", []) if settings_doc else []
                    if admin_ids and bot_token:
                        emoji = {"paid": "✅", "payment_failed": "❌", "refunded": "↩️"}.get(new_status, "ℹ️")
                        status_ua = {"paid": "Оплачено", "payment_failed": "Помилка оплати", "refunded": "Повернення"}.get(new_status, new_status)
                        msg = (
                            f"{emoji} <b>Оновлення статусу замовлення</b>\n\n"
                            f"№ <code>{order_doc.get('order_number', order_reference)}</code>\n"
                            f"Статус: <b>{status_ua}</b>\n"
                            f"Сума: {order_doc.get('total_amount', 0):.2f} ₴\n"
                            f"Клієнт: {order_doc.get('customer', {}).get('full_name', '-')}"
                        )
                        async with httpx.AsyncClient(timeout=5) as client:
                            for cid in admin_ids:
                                try:
                                    await client.post(
                                        f"https://api.telegram.org/bot{bot_token}/sendMessage",
                                        json={"chat_id": cid, "text": msg, "parse_mode": "HTML"},
                                    )
                                except Exception as ie:
                                    logger.warning(f"WFP status alert send failed: {ie}")
            except Exception as e:
                logger.warning(f"WFP alerts error: {e}")
        
        # Build response (required by WayForPay)
        response = wayforpay_provider.build_webhook_response(order_reference, "accept")
        
        return response
        
    except Exception as e:
        logger.error(f"WayForPay webhook error: {e}")
        return {"status": "error", "message": str(e)}


@router.get("/status/{order_reference}")
async def check_status(order_reference: str):
    """
    Check payment status for an order.
    """
    try:
        result = await wayforpay_provider.check_status(order_reference)
        return result
    except Exception as e:
        logger.error(f"WayForPay check status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class RefundRequest(BaseModel):
    order_id: str
    amount: Optional[float] = None
    reason: Optional[str] = "Customer request"
    partial: bool = False


class RefundResponse(BaseModel):
    ok: bool
    order_id: str
    refund_amount: float
    status: str
    provider: str = "WAYFORPAY"
    error: Optional[str] = None


@router.post("/refund", response_model=RefundResponse)
async def refund_payment(request: RefundRequest, req: Request):
    """
    Refund a WayForPay payment.
    
    - Full refund: omit amount or set partial=False
    - Partial refund: set amount and partial=True
    - Updates order status to REFUNDED
    - Records in finance ledger
    """
    from core.db import db
    
    try:
        # Get order from DB
        order = await db.orders.find_one({"id": request.order_id})
        if not order:
            return RefundResponse(
                ok=False, 
                order_id=request.order_id, 
                refund_amount=0,
                status="ERROR",
                error="ORDER_NOT_FOUND"
            )
        
        # Check if order was paid
        payment = order.get("payment", {})
        if payment.get("status") != "PAID" and order.get("status") not in ("PAID", "PROCESSING", "SHIPPED"):
            return RefundResponse(
                ok=False,
                order_id=request.order_id,
                refund_amount=0,
                status="ERROR",
                error="ORDER_NOT_PAID"
            )
        
        # Calculate refund amount
        order_total = float(order.get("total_amount") or order.get("totals", {}).get("grand", 0))
        refund_amount = request.amount if request.partial and request.amount else order_total
        
        if refund_amount <= 0:
            return RefundResponse(
                ok=False,
                order_id=request.order_id,
                refund_amount=0,
                status="ERROR", 
                error="INVALID_REFUND_AMOUNT"
            )
        
        # Prepare order data for provider
        order_data = {
            "id": request.order_id,
            "totals": {"grand": refund_amount}
        }
        
        # Call WayForPay refund API
        logger.info(f"WayForPay: Initiating refund for {request.order_id}, amount={refund_amount}")
        result = await wayforpay_provider.refund(order_data, refund_amount)
        
        now = datetime.now(timezone.utc)
        
        if result.get("status") == "REFUNDED":
            # Update order status
            new_status = "REFUNDED" if not request.partial else order.get("status")
            
            await db.orders.update_one(
                {"id": request.order_id},
                {
                    "$set": {
                        "status": new_status,
                        "refund": {
                            "provider": "WAYFORPAY",
                            "amount": refund_amount,
                            "partial": request.partial,
                            "reason": request.reason,
                            "refunded_at": now.isoformat(),
                            "refund_id": result.get("refund_id")
                        },
                        "updated_at": now
                    },
                    "$push": {
                        "status_history": {
                            "from": order.get("status"),
                            "to": new_status,
                            "actor": "payments:wayforpay:refund",
                            "reason": request.reason,
                            "at": now.isoformat()
                        }
                    }
                }
            )
            
            # Record in finance ledger
            try:
                await db.finance_ledger.insert_one({
                    "order_id": request.order_id,
                    "type": "REFUND_OUT",
                    "amount": refund_amount,
                    "direction": "OUT",
                    "provider": "WAYFORPAY",
                    "meta": {
                        "reason": request.reason,
                        "partial": request.partial,
                        "refund_id": result.get("refund_id")
                    },
                    "created_at": now
                })
            except Exception as e:
                logger.error(f"Failed to record refund in ledger: {e}")
            
            logger.info(f"WayForPay: Refund successful for {request.order_id}, amount={refund_amount}")
            
            return RefundResponse(
                ok=True,
                order_id=request.order_id,
                refund_amount=refund_amount,
                status="REFUNDED"
            )
        else:
            return RefundResponse(
                ok=False,
                order_id=request.order_id,
                refund_amount=refund_amount,
                status="FAILED",
                error=str(result)
            )
            
    except ValueError as e:
        logger.error(f"WayForPay refund error: {e}")
        return RefundResponse(
            ok=False,
            order_id=request.order_id,
            refund_amount=request.amount or 0,
            status="ERROR",
            error=str(e)
        )
    except Exception as e:
        logger.error(f"WayForPay refund error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
