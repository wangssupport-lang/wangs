"""
Payment module exceptions for Wangs.in marketplace.
"""

class PaymentError(Exception):
    """Base exception for payment operations."""
    pass


class PaymentVerificationError(PaymentError):
    """Raised when payment verification or checksum fails."""
    pass


class WebhookSignatureError(PaymentError):
    """Raised when webhook signature or hash does not match expected value."""
    pass


class PaymentProviderFeatureNotActiveError(PaymentError):
    """
    Raised when an unapproved or inactive provider feature is called,
    such as PayU Marketplace Split Settlements before commercial activation.
    """
    pass


class IdempotencyError(PaymentError):
    """Raised on conflicting concurrent idempotent operations."""
    pass


class CommissionCalculationError(PaymentError):
    """Raised on invalid commission inputs or calculation anomalies."""
    pass
