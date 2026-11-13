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
    def sync_manufacturer_vendor(cls, mfg):
        """
        Registers or updates a manufacturer as a Vendor in Cashfree Easy Split.
        Uses manufacturer's registered bank details (Account number, IFSC, Holder name).
        """
        vendor_id = mfg.cashfree_vendor_id or f"mfg_{mfg.id}"

        # Clean phone to 10-digit standard
        raw_phone = str(mfg.contact_phone or getattr(mfg.user, 'phone_number', '') or '9999999999')
        cleaned_phone = ''.join(c for c in raw_phone if c.isdigit())[-10:]
        if len(cleaned_phone) < 10:
            cleaned_phone = '9999999999'

        vendor_name = (mfg.business_name or mfg.user.get_full_name() or f"Maker {mfg.id}").strip()[:100]
        vendor_email = (mfg.contact_email or mfg.user.email or "maker@wangs.in").strip()[:100]

        if not cls.is_configured():
            mfg.cashfree_vendor_id = vendor_id
            mfg.cashfree_vendor_status = "ACTIVE"
            mfg.save(update_fields=['cashfree_vendor_id', 'cashfree_vendor_status'])
            return {
                'success': True,
                'vendor_id': vendor_id,
                'status': 'ACTIVE',
                'simulated': True,
                'message': 'Simulated Easy Split vendor registered (sandbox mode active)'
            }

        vendor_payload = {
            "vendor_id": vendor_id,
            "status": "ACTIVE",
            "name": vendor_name,
            "email": vendor_email,
            "phone": cleaned_phone,
            "verify_account": False,
            "dashboard_access": False,
        }

        if mfg.bank_account_number and mfg.bank_ifsc_code:
            vendor_payload["bank"] = {
                "account_number": str(mfg.bank_account_number).strip(),
                "account_holder": (mfg.bank_account_holder or vendor_name)[:100],
                "ifsc": str(mfg.bank_ifsc_code).strip().upper()
            }

        headers = cls.get_headers()
        base_url = cls.get_base_url()
        vendor_url = f"{base_url}/easy-split/vendors"
        check_url = f"{vendor_url}/{vendor_id}"

        try:
            get_resp = requests.get(check_url, headers=headers, timeout=12)
            if get_resp.status_code == 200:
                # Update existing vendor
                put_resp = requests.put(check_url, headers=headers, json=vendor_payload, timeout=12)
                data = put_resp.json() if put_resp.status_code in (200, 201) else get_resp.json()
            else:
                # Create new vendor
                post_resp = requests.post(vendor_url, headers=headers, json=vendor_payload, timeout=12)
                data = post_resp.json()
                if post_resp.status_code not in (200, 201):
                    err_msg = data.get('message', 'Failed to register vendor on Cashfree')
                    logger.warning("Cashfree vendor registration status (%s): %s", post_resp.status_code, data)
                    mfg.cashfree_vendor_id = vendor_id
                    mfg.cashfree_vendor_status = "PENDING_CONFIGURATION"
                    mfg.save(update_fields=['cashfree_vendor_id', 'cashfree_vendor_status'])
                    return {'success': False, 'vendor_id': vendor_id, 'detail': err_msg, 'data': data}

            v_status = data.get('status') or 'ACTIVE'
            mfg.cashfree_vendor_id = vendor_id
            mfg.cashfree_vendor_status = v_status
            mfg.save(update_fields=['cashfree_vendor_id', 'cashfree_vendor_status'])
            return {'success': True, 'vendor_id': vendor_id, 'status': v_status, 'data': data}

        except Exception as e:
            logger.error("Error communicating with Cashfree Easy Split vendor API: %s", e)
            mfg.cashfree_vendor_id = vendor_id
            mfg.cashfree_vendor_status = "PENDING_SYNC"
            mfg.save(update_fields=['cashfree_vendor_id', 'cashfree_vendor_status'])
            return {'success': False, 'vendor_id': vendor_id, 'detail': str(e)}

    @classmethod
    def get_vendor_details(cls, vendor_id):
        """
        Queries Cashfree for vendor information.
        """
        if not cls.is_configured():
            return {'vendor_id': vendor_id, 'status': 'ACTIVE', 'simulated': True}

        url = f"{cls.get_base_url()}/easy-split/vendors/{vendor_id}"
        try:
            resp = requests.get(url, headers=cls.get_headers(), timeout=12)
            if resp.status_code == 200:
                return resp.json()
            return {'vendor_id': vendor_id, 'status': 'NOT_FOUND', 'detail': resp.text}
        except Exception as e:
            return {'vendor_id': vendor_id, 'status': 'ERROR', 'detail': str(e)}

    @classmethod
    def create_order(cls, order, request=None):
        """
        Creates a Cashfree payment session for the given Order with Easy Split support.
        If credentials are not yet configured in environment variables, returns a simulated session.
        """
        from decimal import Decimal

        # Calculate Easy Split splits across manufacturers in this order
        order_splits = []
        mfg_shares = {}
        for item in order.items.select_related('manufacturer').all():
            if item.manufacturer:
                mfg = item.manufacturer
                mfg_shares[mfg] = mfg_shares.get(mfg, Decimal('0.00')) + item.manufacturer_payout

        total_splits = Decimal('0.00')
        for mfg, payout in mfg_shares.items():
            if payout <= Decimal('0.00'):
                continue
            # Ensure maker is registered as Cashfree vendor if banking info exists
            if not mfg.cashfree_vendor_id and (mfg.bank_account_number and mfg.bank_ifsc_code):
                try:
                    cls.sync_manufacturer_vendor(mfg)
                except Exception as sync_exc:
                    logger.warning("Could not auto-register vendor %s: %s", mfg.id, sync_exc)

            if mfg.cashfree_vendor_id:
                split_amt = round(float(payout), 2)
                order_splits.append({
                    "vendor_id": mfg.cashfree_vendor_id,
                    "amount": split_amt
                })
                total_splits += Decimal(str(split_amt))

        # Sanity check: vendor splits should never exceed total order amount
        if total_splits > order.total_amount:
            logger.warning("Computed vendor split sum (%s) exceeds order total (%s). Resetting splits.", total_splits, order.total_amount)
            order_splits = []

        if not cls.is_configured():
            logger.info("Cashfree credentials not configured. Returning simulation order intent for #%s with Easy Split.", order.order_number)
            sim_session_id = f"session_sim_{order.order_number}_{uuid.uuid4().hex[:8]}"

            order.cashfree_split_data = {
                'order_splits': order_splits,
                'simulated': True,
                'total_splits': float(total_splits),
                'platform_commission': float(order.platform_commission_total),
                'delivery_fee': float(order.delivery_fee)
            }
            order.save(update_fields=['cashfree_split_data'])

            tx, _ = PaymentTransaction.objects.get_or_create(
                idempotency_key=f"cf_init_{order.order_number}",
                defaults={
                    'order': order,
                    'provider': 'CASHFREE',
                    'payment_order_id': order.order_number,
                    'status': PaymentTransaction.Status.PENDING,
                    'amount': order.total_amount,
                    'currency': 'INR',
                    'raw_payload': {'simulated_mode': True, 'session_id': sim_session_id, 'order_splits': order_splits}
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
                'order_splits': order_splits,
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

        if order_splits:
            payload["order_splits"] = order_splits

        try:
            resp = requests.post(url, headers=cls.get_headers(), json=payload, timeout=15)
            data = resp.json()

            # If rejected because Easy Split is not activated in Cashfree settings yet, fallback gracefully
            if resp.status_code not in (200, 201) and order_splits and any(term in str(data).lower() for term in ['split', 'vendor', 'easy_split']):
                logger.warning("Cashfree rejected order_splits (%s). Retrying as standard order to avoid blocking customer checkout.", data)
                payload.pop("order_splits", None)
                resp = requests.post(url, headers=cls.get_headers(), json=payload, timeout=15)
                data = resp.json()
                order.cashfree_split_data = {
                    'order_splits': order_splits,
                    'status': 'FALLBACK_PRIMARY_ACCOUNT',
                    'note': 'Easy Split pending merchant activation in Cashfree settings'
                }
            else:
                order.cashfree_split_data = {
                    'order_splits': order_splits,
                    'status': 'ACTIVE' if order_splits else 'NONE'
                }
            order.save(update_fields=['cashfree_split_data'])

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
                    'order_splits': order_splits,
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
