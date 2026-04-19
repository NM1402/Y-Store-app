"""
Nova Poshta API Client - Low-level API wrapper
"""
import httpx
from typing import Dict, Any
import logging

from core.config import settings

logger = logging.getLogger(__name__)

NP_API_URL = "https://api.novaposhta.ua/v2.0/json/"


class NPClient:
    """Low-level Nova Poshta API client"""
    
    def __init__(self):
        self.api_key = settings.NP_API_KEY or settings.NOVAPOSHTA_API_KEY
    
    async def call(self, model: str, method: str, props: Dict[str, Any]) -> Dict[str, Any]:
        """
        Make API call to Nova Poshta
        
        Args:
            model: API model name (e.g., 'InternetDocument', 'TrackingDocument')
            method: Method to call (e.g., 'save', 'getStatusDocuments')
            props: Method properties
            
        Returns:
            API response dict
        """
        payload = {
            "apiKey": self.api_key,
            "modelName": model,
            "calledMethod": method,
            "methodProperties": props,
        }
        
        logger.info(f"NP API Request: {model}.{method} with props: {list(props.keys())}")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(NP_API_URL, json=payload)
                data = response.json()
            
            if not data.get("success"):
                logger.warning(f"NP API error: {data.get('errors', [])} | warnings: {data.get('warnings', [])}")
            else:
                logger.info(f"NP API success: {model}.{method}")
            
            return data
            
        except Exception as e:
            logger.error(f"NP API call failed: {e}")
            return {"success": False, "errors": [str(e)]}
    
    async def create_internet_document(self, props: Dict[str, Any]) -> Dict[str, Any]:
        """Create TTN (InternetDocument)"""
        return await self.call("InternetDocument", "save", props)
    
    async def get_tracking_status(self, ttn: str) -> Dict[str, Any]:
        """Get TTN tracking status"""
        return await self.call(
            "TrackingDocument",
            "getStatusDocuments",
            {
                "Documents": [{"DocumentNumber": ttn}]
            }
        )
    
    async def delete_internet_document(self, document_ref: str) -> Dict[str, Any]:
        """Delete TTN (only if not yet sent)"""
        return await self.call(
            "InternetDocument",
            "delete",
            {"DocumentRefs": document_ref}
        )


# Singleton
np_client = NPClient()
