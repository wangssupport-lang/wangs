from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


class BasePaymentAdapter(ABC):
    """
    Provider-agnostic interface for marketplace payment gateways.
    Isolates provider-specific logic and payload formats.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of the payment provider (e.g. 'PAYU', 'MOCK')."""
        pass

    @abstractmethod
    def create_order(self, order, payment, return_url: str, **kwargs) -> Dict[str, Any]:
        """
        Initializes a payment intent with the provider.
        Returns the checkout parameters / payload required by the client or redirect form.
        """
        pass

    @abstractmethod
    def verify_payment(self, payload: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """
        Verifies provider response after customer checkout.
        Validates hash/signature, compares amounts, and returns normalized payment result:
        {
            'is_valid': bool,
            'provider_payment_id': str,
            'provider_order_id': str,
            'status': str,
            'amount_paise': int,
            'raw_response': dict
        }
        """
        pass

    @abstractmethod
    def verify_webhook_signature(self, headers: Dict[str, str], body: Any, payload: Dict[str, Any]) -> bool:
        """Validates provider webhook signature or hash."""
        pass

    @abstractmethod
    def get_payment_details(self, provider_payment_id_or_order_id: str) -> Dict[str, Any]:
        """Fetches authoritative transaction status from provider backend."""
        pass

    @abstractmethod
    def initiate_refund(self, payment, amount_paise: int, reason: str, **kwargs) -> Dict[str, Any]:
        """
        Initiates a refund via the provider.
        Returns:
        {
            'status': 'PROCESSED' | 'REQUESTED' | 'FAILED',
            'provider_refund_reference': str,
            'raw_response': dict
        }
        """
        pass

    @abstractmethod
    def get_refund_status(self, refund_reference: str) -> Dict[str, Any]:
        """Fetches refund status from the provider."""
        pass

    @abstractmethod
    def create_split_settlement(self, order, allocations, **kwargs) -> Dict[str, Any]:
        """
        Prepares and releases multi-vendor split settlements.
        Must remain disabled or raise PaymentProviderFeatureNotActiveError
        if marketplace split features are not commercially activated.
        """
        pass

    @abstractmethod
    def release_seller_settlement(self, settlement, **kwargs) -> Dict[str, Any]:
        """
        Releases an individual seller settlement payout.
        Must remain disabled or raise PaymentProviderFeatureNotActiveError
        if live payouts are not activated.
        """
        pass
