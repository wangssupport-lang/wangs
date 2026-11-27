from django.conf import settings
from .base import BasePaymentAdapter
from .payu import PayUAdapter
from .mock import MockPaymentAdapter
from .razorpay import RazorpayAdapter


def get_payment_adapter(provider_name: str = None) -> BasePaymentAdapter:
    """
    Factory function returning the configured payment adapter.
    Defaults to Razorpay, or PayU / Mock when specified.
    """
    provider = (provider_name or getattr(settings, 'DEFAULT_PAYMENT_PROVIDER', 'RAZORPAY')).upper()
    if provider == 'MOCK':
        return MockPaymentAdapter()
    elif provider in ('RAZORPAY', 'RAZORPAY_TEST'):
        return RazorpayAdapter()
    elif provider == 'PAYU':
        return PayUAdapter()
    return RazorpayAdapter()


__all__ = ['BasePaymentAdapter', 'RazorpayAdapter', 'PayUAdapter', 'MockPaymentAdapter', 'get_payment_adapter']
