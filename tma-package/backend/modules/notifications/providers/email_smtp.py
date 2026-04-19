# O2: SMTP Email Provider (mock for now)
import logging
from core.config import settings

logger = logging.getLogger(__name__)

class SMTPEmailProvider:
    async def send(self, to: str, subject: str, body: str) -> dict:
        # Check if credentials configured
        if not getattr(settings, 'SMTP_HOST', None):
            logger.warning(f"SMTP not configured, Email to {to} MOCKED: {subject}")
            return {"status": "MOCKED", "to": to, "subject": subject}
        
        try:
            import aiosmtplib
            from email.message import EmailMessage
            
            msg = EmailMessage()
            msg["From"] = settings.EMAIL_FROM
            msg["To"] = to
            msg["Subject"] = subject
            msg.set_content(body)

            await aiosmtplib.send(
                msg,
                hostname=settings.SMTP_HOST,
                port=int(settings.SMTP_PORT),
                username=settings.SMTP_USER,
                password=settings.SMTP_PASS,
                start_tls=True,
            )
            return {"ok": True, "to": to}
        except Exception as e:
            logger.error(f"SMTP error: {e}")
            raise
