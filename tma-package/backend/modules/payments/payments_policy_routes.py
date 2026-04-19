"""
D-Mode: Payment Policy & Deposit Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from core.db import db
from modules.payments.payment_policy_decider import PaymentPolicyDecider
from modules.payments.deposit_payments_service import DepositPaymentsService

router = APIRouter(tags=["D-Mode Payments"])


# --- Policy Preview ---

class PolicyPreviewBody(BaseModel):
    phone: str
    city: Optional[str] = None
    amount: float = 0
    is_new_customer: bool = False


@router.post("/api/v2/payments/policy/preview")
async def preview_policy(body: PolicyPreviewBody):
    """
    Preview payment policy decision before checkout.
    Returns mode (FULL_PREPAID/SHIP_DEPOSIT/COD_ALLOWED), reasons, deposit info.
    """
    decider = PaymentPolicyDecider(db)
    return await decider.decide(
        phone=body.phone,
        city=body.city,
        amount=float(body.amount),
        is_new_customer=bool(body.is_new_customer),
    )


# --- Deposit Payment ---

class CreateDepositBody(BaseModel):
    order_id: str
    amount: float


@router.post("/api/v2/payments/deposit/create")
async def create_deposit_payment(body: CreateDepositBody):
    """
    Create shipping deposit payment for an order.
    Used when policy mode is SHIP_DEPOSIT.
    """
    svc = DepositPaymentsService(db)
    try:
        return await svc.create_deposit_payment(
            order_id=body.order_id,
            amount=float(body.amount)
        )
    except Exception as e:
        raise HTTPException(400, str(e))


class CreateFullPaymentBody(BaseModel):
    order_id: str
    amount: float


@router.post("/api/v2/payments/full/create")
async def create_full_payment(body: CreateFullPaymentBody):
    """
    Create full order payment.
    Used when policy mode is FULL_PREPAID.
    """
    svc = DepositPaymentsService(db)
    try:
        return await svc.create_full_payment(
            order_id=body.order_id,
            amount=float(body.amount)
        )
    except Exception as e:
        raise HTTPException(400, str(e))
