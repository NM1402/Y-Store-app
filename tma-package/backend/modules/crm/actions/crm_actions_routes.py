# O8: CRM Actions Routes
from fastapi import APIRouter, Depends
from core.db import db
from core.security import get_current_admin
from .crm_actions_service import CRMActionsService

router = APIRouter(prefix="/crm/actions", tags=["CRM Actions"])

@router.post("/customer/{phone}/note")
async def add_note(
    phone: str,
    body: dict,
    admin: dict = Depends(get_current_admin)
):
    svc = CRMActionsService(db)
    return await svc.add_note(phone, body["text"], admin["id"])

@router.post("/customer/{phone}/tags")
async def set_tags(
    phone: str,
    body: dict,
    admin: dict = Depends(get_current_admin)
):
    await CRMActionsService(db).set_tags(phone, body["tags"])
    return {"ok": True}

@router.post("/customer/{phone}/block")
async def block(
    phone: str,
    body: dict,
    admin: dict = Depends(get_current_admin)
):
    await CRMActionsService(db).toggle_block(phone, body["block"])
    return {"ok": True}

@router.post("/customer/{phone}/sms")
async def send_sms(
    phone: str,
    body: dict,
    admin: dict = Depends(get_current_admin)
):
    await CRMActionsService(db).queue_sms(phone, body["text"])
    return {"queued": True}

@router.post("/customer/{email}/email")
async def send_email(
    email: str,
    body: dict,
    admin: dict = Depends(get_current_admin)
):
    await CRMActionsService(db).queue_email(email, body.get("subject", "Y-Store"), body["body"])
    return {"queued": True}
