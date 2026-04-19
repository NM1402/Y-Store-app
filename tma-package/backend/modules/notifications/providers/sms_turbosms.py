# O2: TurboSMS Provider (mock for now)
import httpx
import logging
from core.config import settings

logger = logging.getLogger(__name__)

class TurboSMSProvider:
    async def send(self, to: str, text: str) -> dict:
        # Check if credentials configured
        if not getattr(settings, 'TURBOSMS_TOKEN', None):
            logger.warning(f"TURBOSMS not configured, SMS to {to} MOCKED: {text[:50]}...")
            return {"status": "MOCKED", "to": to}
        
        url = f"{settings.TURBOSMS_API_BASE}/message/send.json"
        payload = {
            "recipients": [to],
            "sms": {"sender": settings.TURBOSMS_SENDER, "text": text}
        }
        headers = {"Authorization": f"Bearer {settings.TURBOSMS_TOKEN}"}

        try:
            async with httpx.AsyncClient(timeout=20) as client:
                r = await client.post(url, json=payload, headers=headers)
                return {
                    "status_code": r.status_code,
                    "body": r.json() if "application/json" in r.headers.get("content-type", "") else r.text
                }
        except Exception as e:
            logger.error(f"TurboSMS error: {e}")
            raise
