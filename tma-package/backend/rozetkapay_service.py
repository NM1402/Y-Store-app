"""
RozetkaPay Payment Integration Service
Implements Hosted Checkout flow with redirect to RozetkaPay payment page
"""

import os
import logging
import base64
import hashlib
import requests
from typing import Dict, Any, Optional
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)


class RozetkaPayService:
    """Service for interacting with RozetkaPay API - Hosted Checkout Mode"""
    
    def __init__(self):
        self.api_url = os.environ.get('ROZETKAPAY_API_URL', 'https://api.rozetkapay.com')
        self.login = os.environ.get('ROZETKAPAY_LOGIN')
        self.password = os.environ.get('ROZETKAPAY_PASSWORD')
        
        if not self.login or not self.password:
            logger.warning("RozetkaPay credentials not configured")
    
    def _get_auth_headers(self) -> Dict[str, str]:
        """Generate Basic Auth headers for API requests"""
        credentials = f"{self.login}:{self.password}"
        encoded = base64.b64encode(credentials.encode('utf-8')).decode('utf-8')
        
        return {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": f"Basic {encoded}"
        }
    
    def create_payment(
        self,
        external_id: str,
        amount: float,
        currency: str,
        customer: Dict[str, Any],
        callback_url: str,
        result_url: str,
        description: str = "Оплата заказа"
    ) -> Dict[str, Any]:
        """
        Create a hosted checkout payment (with RozetkaPay payment page)
        
        Args:
            external_id: Unique order identifier
            amount: Payment amount in main currency units (e.g., 100.50 UAH)
            currency: Currency code (UAH, USD, EUR)
            customer: Customer information dict
            callback_url: URL for payment status webhooks
            result_url: URL to redirect user after payment
            description: Payment description
            
        Returns:
            Dict with payment response including checkout URL
        """
        try:
            # Amount should be in main currency units according to API docs
            payload = {
                "external_id": external_id,
                "amount": amount,
                "currency": currency,
                "description": description,
                "mode": "hosted",
                "confirm": True,
                "callback_url": callback_url,
                "result_url": result_url,
                "customer": {
                    "email": customer.get("email"),
                    "first_name": customer.get("first_name", ""),
                    "last_name": customer.get("last_name", ""),
                    "phone": customer.get("phone", "")
                }
            }
            
            headers = self._get_auth_headers()
            
            logger.info(f"Creating payment for order {external_id}")
            logger.info(f"Payload: {payload}")
            
            response = requests.post(
                f"{self.api_url}/api/payments/v1/new",
                json=payload,
                headers=headers,
                timeout=30
            )
            
            logger.info(f"Response status: {response.status_code}")
            response.raise_for_status()
            
            result = response.json()
            logger.info(f"Payment created successfully: {external_id}")
            logger.info(f"RozetkaPay API Response: {result}")
            
            # Ensure result is not None
            if result is None:
                logger.error("API returned None result")
                return {
                    "success": False,
                    "error": "API returned None",
                    "external_id": external_id
                }
            
            return {
                "success": True,
                "payment_id": result.get("id"),
                "external_id": result.get("external_id"),
                "is_success": result.get("is_success"),
                "action_required": result.get("action_required", False),
                "action": result.get("action"),  # This should contain checkout URL for hosted mode
                "details": result.get("details"),
                "status": result.get("details", {}).get("status") if result.get("details") is not None else None,
                "raw_response": result
            }
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Error creating payment {external_id}: {str(e)}")
            error_detail = ""
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_detail = e.response.json()
                except:
                    error_detail = e.response.text
            
            return {
                "success": False,
                "error": str(e),
                "error_detail": error_detail,
                "external_id": external_id
            }
        except Exception as e:
            logger.error(f"Unexpected error creating payment {external_id}: {str(e)}")
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}",
                "external_id": external_id
            }
    
    def get_payment_info(self, payment_id: str) -> Dict[str, Any]:
        """
        Get payment information by payment ID
        
        Args:
            payment_id: RozetkaPay payment ID
            
        Returns:
            Dict with payment information
        """
        try:
            headers = self._get_auth_headers()
            
            response = requests.get(
                f"{self.api_url}/api/payments/v1/info/{payment_id}",
                headers=headers,
                timeout=30
            )
            
            response.raise_for_status()
            result = response.json()
            
            logger.info(f"Payment info retrieved: {payment_id}")
            return {
                "success": True,
                "payment": result
            }
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Error getting payment info {payment_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def verify_webhook_signature(self, payload: str, signature: str) -> bool:
        """
        Verify webhook signature from RozetkaPay
        
        Signature calculation:
        signature = base64url_encode(sha1(password + base64url_encode(json_body) + password))
        
        Args:
            payload: Raw JSON body as string
            signature: Signature from X-ROZETKAPAY-SIGNATURE header
            
        Returns:
            True if signature is valid
        """
        try:
            # Encode payload to base64url
            base64_payload = base64.urlsafe_b64encode(
                payload.encode('utf-8')
            ).decode('utf-8')
            
            # Create signature string
            signature_string = f"{self.password}{base64_payload}{self.password}"
            
            # Calculate SHA1 hash
            sha1_hash = hashlib.sha1(signature_string.encode('utf-8')).digest()
            
            # Encode to base64url
            expected_signature = base64.urlsafe_b64encode(sha1_hash).decode('utf-8')
            
            # Compare signatures (constant-time comparison)
            return signature == expected_signature
        
        except Exception as e:
            logger.error(f"Error verifying webhook signature: {str(e)}")
            return False


# Create singleton instance
rozetkapay_service = RozetkaPayService()
