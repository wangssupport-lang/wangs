from django.conf import settings
from .base import BasePaymentAdapter
from .payu import PayUAdapter
from .mock import MockPaymentAdapter


def get_payment_adapter(provider_name: str = None) -> BasePaymentAdapter:
    """
    Factory function returning the configured payment adapter.
    Defaults to PayU, or Mock/test adapter when specified.
    """
    provider = (provider_name or getattr(settings, 'DEFAULT_PAYMENT_PROVIDER', 'PAYU')).upper()
    if provider == 'MOCK':
        return MockPaymentAdapter()
    elif provider == 'PAYU':
        return PayUAdapter()
    # Default fallback
    return PayUAdapter()


__all__ = ['BasePaymentAdapter', 'PayUAdapter', 'MockPaymentAdapter', 'get_payment_adapter']
