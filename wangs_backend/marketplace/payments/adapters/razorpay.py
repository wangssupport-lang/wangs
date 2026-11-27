import hashlib
import hmac
import logging
import uuid
from typing import Any, Dict

import requests
from django.conf import settings

from .base import BasePaymentAdapter
from ..exceptions import (
    PaymentError,
    PaymentProviderFeatureNotActiveError,
    PaymentVerificationError,
    WebhookSignatureError,
)

logger = logging.getLogger('marketplace.payments.razorpay')


class RazorpayAdapter(BasePaymentAdapter):
    """
    Razorpay Checkout & Route Adapter.
    Supports both live/test Razorpay REST API (when RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET are configured)
    and safe local simulation when placeholder keys are present.
    Razorpay Route transfers remain gated behind RAZORPAY_ROUTE_ENABLED=True.
    """

    API_BASE = 'https://api.razorpay.com/v1'

    @property
    def provider_name(self) -> str:
        return 'RAZORPAY'

    @classmethod
    def is_live_configured(cls) -> bool:
        key_id = getattr(settings, 'RAZORPAY_KEY_ID', '') or ''
        key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', '') or ''
        return (
            bool(key_id and key_secret)
            and 'placeholder' not in key_id.lower()
            and 'placeholder' not in key_secret.lower()
        )

    @classmethod
    def _auth(cls):
        return (settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)

    def create_order(self, order, payment, return_url: str = 'https://wangs.in', **kwargs) -> Dict[str, Any]:
        amount_paise = int(payment.amount_paise)
        if amount_paise < 100:
            raise PaymentError('Razorpay minimum order amount is ₹1.00 (100 paise).')

        if not self.is_live_configured():
            sim_order_id = f"order_test_{order.order_number}_{uuid.uuid4().hex[:6]}"
            payment.provider_order_id = sim_order_id
            payment.raw_response = {'simulated': True, 'razorpay_order_id': sim_order_id}
            payment.save(update_fields=['provider_order_id', 'raw_response', 'updated_at'])
            return {
                'provider': 'RAZORPAY',
                'is_simulated': True,
                'key_id': getattr(settings, 'RAZORPAY_KEY_ID', 'rzp_test_placeholder_key'),
                'razorpay_order_id': sim_order_id,
                'payment_order_id': sim_order_id,
                'amount_paise': amount_paise,
                'amount': str(order.total_amount),
                'currency': 'INR',
                'order_number': order.order_number,
                'name': 'Wangs Marketplace',
                'description': f'Order #{order.order_number}',
                'prefill': {
                    'name': order.customer_name,
                    'email': order.customer_email,
                    'contact': order.customer_phone,
                },
            }

        resp = requests.post(
            f"{self.API_BASE}/orders",
            auth=self._auth(),
            json={
                'amount': amount_paise,
                'currency': 'INR',
                'receipt': order.order_number,
                'notes': {
                    'order_number': order.order_number,
                    'payment_id': payment.payment_id,
                },
            },
            timeout=20,
        )
        data = resp.json() if resp.content else {}
        if resp.status_code not in (200, 201) or not data.get('id'):
            err_msg = (data.get('error') or {}).get('description') or f'Razorpay order creation failed ({resp.status_code})'
            logger.error("Razorpay create_order failed for %s: %s", order.order_number, err_msg)
            raise PaymentError(err_msg)

        rzp_order_id = data['id']
        payment.provider_order_id = rzp_order_id
        payment.raw_response = data
        payment.save(update_fields=['provider_order_id', 'raw_response', 'updated_at'])

        return {
            'provider': 'RAZORPAY',
            'is_simulated': False,
            'key_id': settings.RAZORPAY_KEY_ID,
            'razorpay_order_id': rzp_order_id,
            'payment_order_id': rzp_order_id,
            'amount_paise': amount_paise,
            'amount': str(order.total_amount),
            'currency': 'INR',
            'order_number': order.order_number,
            'name': 'Wangs Marketplace',
            'description': f'Order #{order.order_number}',
            'prefill': {
                'name': order.customer_name,
                'email': order.customer_email,
                'contact': order.customer_phone,
            },
        }

    def verify_payment(self, payload: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        rzp_order_id = str(payload.get('razorpay_order_id') or '').strip()
        rzp_payment_id = str(payload.get('razorpay_payment_id') or payload.get('payment_id') or '').strip()
        rzp_signature = str(payload.get('razorpay_signature') or payload.get('signature') or '').strip()

        if not self.is_live_configured() and rzp_order_id.startswith('order_test_'):
            return {
                'is_valid': True,
                'provider_payment_id': rzp_payment_id or f"pay_test_{uuid.uuid4().hex[:10]}",
                'provider_order_id': rzp_order_id,
                'status': 'CAPTURED',
                'amount_paise': payload.get('expected_amount_paise'),
                'raw_response': {'simulated': True, **payload},
            }

        if not rzp_order_id or not rzp_payment_id or not rzp_signature:
            raise PaymentVerificationError('Missing Razorpay payment verification parameters (order_id, payment_id, signature).')

        message = f"{rzp_order_id}|{rzp_payment_id}".encode('utf-8')
        secret = (settings.RAZORPAY_KEY_SECRET or '').encode('utf-8')
        expected_sig = hmac.new(secret, message, hashlib.sha256).hexdigest()

        if not hmac.compare_digest(expected_sig, rzp_signature):
            logger.warning("Razorpay signature mismatch for order %s / payment %s", rzp_order_id, rzp_payment_id)
            raise PaymentVerificationError('Invalid Razorpay payment signature.')

        details = self.get_payment_details(rzp_payment_id)
        rzp_status = str(details.get('status') or '').lower()
        if rzp_status not in ('captured', 'authorized'):
            raise PaymentVerificationError(f'Razorpay payment is not captured/authorized (status: {rzp_status}).')

        expected_paise = kwargs.get('expected_amount_paise')
        paid_paise = details.get('amount')
        if expected_paise is not None and paid_paise is not None and int(paid_paise) != int(expected_paise):
            raise PaymentVerificationError(
                f'Razorpay paid amount mismatch: expected {expected_paise} paise, got {paid_paise} paise.'
            )

        return {
            'is_valid': True,
            'provider_payment_id': rzp_payment_id,
            'provider_order_id': rzp_order_id,
            'status': 'CAPTURED',
            'amount_paise': int(paid_paise) if paid_paise is not None else expected_paise,
            'payment_method': details.get('method', ''),
            'raw_response': details,
        }

    def verify_webhook_signature(self, headers: Dict[str, str], body: Any, payload: Dict[str, Any]) -> bool:
        webhook_secret = getattr(settings, 'RAZORPAY_WEBHOOK_SECRET', '') or ''
        if not webhook_secret:
            if not self.is_live_configured():
                return True
            raise WebhookSignatureError('RAZORPAY_WEBHOOK_SECRET is not configured on backend.')

        lower_headers = {str(k).lower(): v for k, v in (headers or {}).items()}
        signature = str(lower_headers.get('x-razorpay-signature') or '').strip()
        if not signature:
            raise WebhookSignatureError('Missing X-Razorpay-Signature header.')

        raw_bytes = body if isinstance(body, (bytes, bytearray)) else str(body or '').encode('utf-8')
        expected = hmac.new(webhook_secret.encode('utf-8'), raw_bytes, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise WebhookSignatureError('Invalid Razorpay webhook signature.')
        return True

    def get_payment_details(self, provider_payment_id_or_order_id: str) -> Dict[str, Any]:
        if not self.is_live_configured():
            return {'id': provider_payment_id_or_order_id, 'status': 'captured'}
        resp = requests.get(
            f"{self.API_BASE}/payments/{provider_payment_id_or_order_id}",
            auth=self._auth(),
            timeout=15,
        )
        data = resp.json() if resp.content else {}
        if resp.status_code != 200:
            err_msg = (data.get('error') or {}).get('description') or f'Failed to fetch Razorpay payment ({resp.status_code})'
            raise PaymentError(err_msg)
        return data

    def initiate_refund(self, payment, amount_paise: int, reason: str, **kwargs) -> Dict[str, Any]:
        if not self.is_live_configured():
            return {
                'status': 'PROCESSED',
                'provider_refund_reference': f"rfnd_test_{uuid.uuid4().hex[:10]}",
                'raw_response': {'simulated': True, 'amount': amount_paise, 'reason': reason},
            }
        resp = requests.post(
            f"{self.API_BASE}/payments/{payment.provider_payment_id}/refund",
            auth=self._auth(),
            json={'amount': int(amount_paise), 'notes': {'reason': reason[:200]}},
            timeout=20,
        )
        data = resp.json() if resp.content else {}
        if resp.status_code not in (200, 201) or not data.get('id'):
            err_msg = (data.get('error') or {}).get('description') or f'Razorpay refund failed ({resp.status_code})'
            return {'status': 'FAILED', 'provider_refund_reference': '', 'raw_response': {'error': err_msg}}
        return {
            'status': 'PROCESSED' if data.get('status') == 'processed' else 'REQUESTED',
            'provider_refund_reference': data['id'],
            'raw_response': data,
        }

    def get_refund_status(self, refund_reference: str) -> Dict[str, Any]:
        if not self.is_live_configured():
            return {'id': refund_reference, 'status': 'processed'}
        resp = requests.get(f"{self.API_BASE}/refunds/{refund_reference}", auth=self._auth(), timeout=15)
        return resp.json() if resp.content else {}

    def create_split_settlement(self, order, allocations, **kwargs) -> Dict[str, Any]:
        if not getattr(settings, 'RAZORPAY_ROUTE_ENABLED', False):
            raise PaymentProviderFeatureNotActiveError(
                'Razorpay Route split transfers are disabled until marketplace Route approval is activated.'
            )
        return {'status': 'READY_FOR_ROUTE_TRANSFER'}

    def release_seller_settlement(self, settlement, **kwargs) -> Dict[str, Any]:
        if not getattr(settings, 'RAZORPAY_ROUTE_ENABLED', False):
            raise PaymentProviderFeatureNotActiveError(
                'Razorpay Route live seller payouts are disabled until marketplace Route approval is activated.'
            )
        return {'status': 'READY_FOR_ROUTE_PAYOUT'}
