"""
O9: Telegram Sender - sends messages to Telegram via Bot API
"""
import httpx
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class TelegramSender:
    def __init__(self, token: str):
        self.base = f"https://api.telegram.org/bot{token}"

    async def send_message(
        self, 
        chat_id: str, 
        text: str, 
        reply_markup: Optional[Dict[str, Any]] = None,
        parse_mode: str = "HTML"
    ) -> dict:
        """Send message to Telegram chat"""
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode,
            "disable_web_page_preview": True
        }
        
        if reply_markup:
            payload["reply_markup"] = reply_markup
        
        async with httpx.AsyncClient(timeout=25) as client:
            r = await client.post(f"{self.base}/sendMessage", json=payload)
            data = r.json()
            
            if not data.get("ok"):
                raise Exception(f"TG_SEND_FAILED: {data}")
            
            return data

    async def edit_message(
        self,
        chat_id: str,
        message_id: int,
        text: str,
        reply_markup: Optional[Dict[str, Any]] = None
    ) -> dict:
        """Edit existing message"""
        payload = {
            "chat_id": chat_id,
            "message_id": message_id,
            "text": text,
            "parse_mode": "HTML"
        }
        
        if reply_markup:
            payload["reply_markup"] = reply_markup
        
        async with httpx.AsyncClient(timeout=25) as client:
            r = await client.post(f"{self.base}/editMessageText", json=payload)
            return r.json()

    async def answer_callback(
        self,
        callback_query_id: str,
        text: str = None,
        show_alert: bool = False
    ) -> dict:
        """Answer callback query"""
        payload = {
            "callback_query_id": callback_query_id,
            "show_alert": show_alert
        }
        if text:
            payload["text"] = text
        
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(f"{self.base}/answerCallbackQuery", json=payload)
            return r.json()
