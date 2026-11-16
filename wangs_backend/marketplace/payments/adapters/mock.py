import uuid
from decimal import Decimal
from typing import Dict, Any
from .base import BasePaymentAdapter
from ..exceptions import PaymentProviderFeatureNotActiveError


class MockPaymentAdapter(BasePaymentAdapter):
    """
    Mock adapter for local development and deterministic unit testing.
    Never executes real payouts or network requests.
    """

    @property
    def provider_name(self) -> str:
        return 'MOCK'

    def create_order(self, order, payment, return_url: str, **kwargs) -> Dict[str, Any]:
        amount_decimal = (Decimal(payment.amount_paise) / Decimal('100.00')).quantize(Decimal('0.01'))
        return {
            'action_url': f"{return_url.rstrip('/')}/mock-gateway",
            'payment_id': payment.payment_id,
            'txnid': payment.payment_id,
            'order_number': order.order_number,
            'amount': str(amount_decimal),
            'amount_paise': payment.amount_paise,
            'currency': payment.currency,
            'provider': 'MOCK',
            'mock_token': f"mock_tok_{uuid.uuid4().hex[:12]}"
        }

    def verify_payment(self, payload: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        is_success = payload.get('status', '').upper() in ('SUCCESS', 'CAPTURED', 'PAID')
        txnid = payload.get('txnid') or payload.get('payment_id') or f"mock_tx_{uuid.uuid4().hex[:8]}"
        amount_paise = payload.get('amount_paise')
        if amount_paise is None and payload.get('amount'):
            amount_paise = int(Decimal(str(payload['amount'])) * 100)

        return {
            'is_valid': True,
            'is_success': is_success,
            'status': 'CAPTURED' if is_success else 'FAILED',
            'provider_payment_id': f"mock_pay_{uuid.uuid4().hex[:10]}",
            'provider_order_id': txnid,
            'amount_paise': amount_paise or 0,
            'payment_method': payload.get('payment_method', 'MOCK_UPI'),
            'raw_response': payload,
            'order_number': payload.get('order_number'),
        }

    def verify_webhook_signature(self, headers: Dict[str, str], body: Any, payload: Dict[str, Any]) -> bool:
        # Check mock test signature header or payload
        sig = headers.get('X-Mock-Signature') or payload.get('signature')
        if sig == 'invalid_signature':
            return False
        return True

    def get_payment_details(self, provider_payment_id_or_order_id: str) -> Dict[str, Any]:
        return {
            'success': True,
            'status': 'CAPTURED',
            'provider_payment_id': provider_payment_id_or_order_id
        }

    def initiate_refund(self, payment, amount_paise: int, reason: str, **kwargs) -> Dict[str, Any]:
        return {
            'status': 'PROCESSED',
            'provider_refund_reference': f"mock_ref_{uuid.uuid4().hex[:10]}",
            'raw_response': {'simulated': True, 'amount_paise': amount_paise, 'reason': reason}
        }

    def get_refund_status(self, refund_reference: str) -> Dict[str, Any]:
        return {'success': True, 'status': 'PROCESSED', 'reference': refund_reference}

    def create_split_settlement(self, order, allocations, **kwargs) -> Dict[str, Any]:
        raise PaymentProviderFeatureNotActiveError(
            "Marketplace Split Settlements feature is pending approval. Simulated payouts safely disabled."
        )

    def release_seller_settlement(self, settlement, **kwargs) -> Dict[str, Any]:
        raise PaymentProviderFeatureNotActiveError(
            "Seller payout release is disabled pending approval."
        )
