import os
import json
import uuid
import hmac
import hashlib
import base64
import logging
import requests
from django.conf import settings
from .models import PaymentTransaction, Order

logger = logging.getLogger('marketplace.cashfree')


class CashfreeService:
    @staticmethod
    def is_configured():
        app_id = getattr(settings, 'CASHFREE_APP_ID', '')
        secret_key = getattr(settings, 'CASHFREE_SECRET_KEY', '')
        return bool(app_id and secret_key and app_id.strip() and secret_key.strip())

    @staticmethod
    def get_base_url(env=None):
        target_env = (env or getattr(settings, 'CASHFREE_ENV', 'PROD')).upper()
        if target_env in ['TEST', 'SANDBOX']:
            return 'https://sandbox.cashfree.com/pg'
        return 'https://api.cashfree.com/pg'

    @classmethod
    def get_headers(cls):
        return {
            'x-client-id': getattr(settings, 'CASHFREE_APP_ID', ''),
            'x-client-secret': getattr(settings, 'CASHFREE_SECRET_KEY', ''),
            'x-api-version': getattr(settings, 'CASHFREE_API_VERSION', '2023-08-01'),
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }

    @classmethod
    def create_order(cls, order, request=None):
        """
        Creates a Cashfree payment session for the given Order.
        If credentials are not yet configured in environment variables, returns a simulated session.
        """
        if not cls.is_configured():
            logger.info("Cashfree credentials not configured. Returning simulation order intent for #%s.", order.order_number)
            sim_session_id = f"session_sim_{order.order_number}_{uuid.uuid4().hex[:8]}"
            tx, _ = PaymentTransaction.objects.get_or_create(
                idempotency_key=f"cf_init_{order.order_number}",
                defaults={
                    'order': order,
                    'provider': 'CASHFREE',
                    'payment_order_id': order.order_number,
                    'status': PaymentTransaction.Status.PENDING,
                    'amount': order.total_amount,
                    'currency': 'INR',
                    'raw_payload': {'simulated_mode': True, 'session_id': sim_session_id}
                }
            )
            return {
                'success': True,
                'provider': 'CASHFREE',
                'order_id': order.order_number,
                'cf_order_id': f"cf_sim_{order.order_number}",
                'payment_session_id': sim_session_id,
                'order_status': 'ACTIVE',
                'mode': 'sandbox',
                'is_configured': False,
                'amount': str(order.total_amount),
                'currency': 'INR',
                'transaction_id': tx.id,
            }

        # Live or Sandbox API call to Cashfree
        url = f"{cls.get_base_url()}/orders"
        frontend_url = getattr(settings, 'FRONTEND_BASE_URL', 'https://wangs.in').rstrip('/')
        return_url = f"{frontend_url}/checkout?order_number={order.order_number}&cf_order_id={{order_id}}"
        notify_url = f"{frontend_url}/api/payments/cashfree-webhook/"

        # Sanitize phone to valid 10-digit format
        raw_phone = str(order.customer_phone or '9999999999').replace(' ', '').replace('-', '')
        if raw_phone.startswith('+91'):
            raw_phone = raw_phone[3:]
        cleaned_phone = ''.join(c for c in raw_phone if c.isdigit())
        if len(cleaned_phone) < 10:
            cleaned_phone = '9999999999'
        cleaned_phone = cleaned_phone[-10:]

        customer_id = f"cust_{order.user.id if order.user else 'guest'}_{order.id}"

        payload = {
            "order_id": order.order_number,
            "order_amount": float(order.total_amount),
            "order_currency": "INR",
            "customer_details": {
                "customer_id": customer_id[:50],
                "customer_name": (order.customer_name or "Valued Customer")[:100],
                "customer_email": (order.customer_email or "customer@wangs.in")[:100],
                "customer_phone": cleaned_phone,
            },
            "order_meta": {
                "return_url": return_url,
                "notify_url": notify_url,
                "payment_methods": "cc,dc,upi,nb,wallet"
            },
            "order_note": f"Wangs Order {order.order_number}"
        }

        try:
            resp = requests.post(url, headers=cls.get_headers(), json=payload, timeout=15)
            data = resp.json()

            if resp.status_code in (200, 201):
                cf_order_id = data.get('cf_order_id')
                session_id = data.get('payment_session_id')

                tx, _ = PaymentTransaction.objects.get_or_create(
                    idempotency_key=f"cf_init_{order.order_number}",
                    defaults={
                        'order': order,
                        'provider': 'CASHFREE',
                        'payment_order_id': order.order_number,
                        'transaction_id': str(cf_order_id or ''),
                        'status': PaymentTransaction.Status.PENDING,
                        'amount': order.total_amount,
                        'currency': 'INR',
                        'raw_payload': data
                    }
                )

                env = getattr(settings, 'CASHFREE_ENV', 'PROD').upper()
                return {
                    'success': True,
                    'provider': 'CASHFREE',
                    'order_id': order.order_number,
                    'cf_order_id': cf_order_id,
                    'payment_session_id': session_id,
                    'order_status': data.get('order_status', 'ACTIVE'),
                    'mode': 'production' if env == 'PROD' else 'sandbox',
                    'is_configured': True,
                    'amount': str(order.total_amount),
                    'currency': 'INR',
                    'transaction_id': tx.id,
                }
            else:
                err_msg = data.get('message', 'Failed to initialize Cashfree order session')
                logger.error("Cashfree order creation error: %s (Status: %s)", data, resp.status_code)
                raise ValueError(err_msg)

        except requests.RequestException as e:
            logger.exception("Cashfree network connection error: %s", e)
            raise ValueError(f"Could not connect to Cashfree payment gateway: {str(e)}")

    @classmethod
    def get_order_status(cls, order_number):
        """
        Fetches live order status directly from Cashfree PG API.
        """
        if not cls.is_configured():
            return {'order_status': 'ACTIVE', 'simulated': True}

        url = f"{cls.get_base_url()}/orders/{order_number}"
        try:
            resp = requests.get(url, headers=cls.get_headers(), timeout=12)
            if resp.status_code == 200:
                return resp.json()
            return {'order_status': 'UNKNOWN', 'error': resp.text}
        except Exception as e:
            logger.error("Failed to fetch Cashfree order status: %s", e)
            return {'order_status': 'ERROR', 'detail': str(e)}

    @classmethod
    def get_order_payments(cls, order_number):
        """
        Fetches payment transactions for an order from Cashfree PG API.
        """
        if not cls.is_configured():
            return []

        url = f"{cls.get_base_url()}/orders/{order_number}/payments"
        try:
            resp = requests.get(url, headers=cls.get_headers(), timeout=12)
            if resp.status_code == 200:
                return resp.json()
            return []
        except Exception as e:
            logger.error("Failed to fetch Cashfree order payments: %s", e)
            return []

    @classmethod
    def verify_webhook_signature(cls, timestamp, raw_body, signature):
        """
        Verifies Cashfree webhook signature using HMAC-SHA256.
        """
        secret_key = getattr(settings, 'CASHFREE_SECRET_KEY', '')
        if not secret_key:
            return False

        try:
            data = f"{timestamp}{raw_body}"
            expected_sig = base64.b64encode(
                hmac.new(
                    secret_key.encode('utf-8'),
                    data.encode('utf-8'),
                    hashlib.sha256
                ).digest()
            ).decode('utf-8')
            return hmac.compare_digest(expected_sig, signature)
        except Exception as e:
            logger.error("Error verifying Cashfree webhook signature: %s", e)
            return False
