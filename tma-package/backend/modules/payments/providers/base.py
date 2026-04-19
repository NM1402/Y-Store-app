"""
Payment Provider - Abstract base class for payment providers
"""
from abc import ABC, abstractmethod
from typing import Dict, Any


class PaymentProvider(ABC):
    """Abstract base class for payment providers (Fondy, WayForPay, LiqPay, etc.)"""
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name (FONDY, WAYFORPAY, etc.)"""
        pass
    
    @abstractmethod
    async def create_payment(self, order: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create payment/checkout session.
        Returns: { checkout_url, provider_payment_id }
        """
        pass
    
    @abstractmethod
    def verify_webhook(self, raw_body: bytes, payload: Dict[str, Any]) -> bool:
        """
        Verify webhook signature.
        Raises exception if invalid.
        """
        pass
    
    @abstractmethod
    def parse_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse webhook payload into normalized format.
        Returns: { event_id, order_id, status, amount, currency, payment_id }
        """
        pass
    
    async def refund(self, order: Dict[str, Any], amount: float = None) -> Dict[str, Any]:
        """Refund payment (optional, implement in subclass)"""
        raise NotImplementedError("Refund not implemented for this provider")
