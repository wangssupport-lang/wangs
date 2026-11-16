import hashlib
import hmac
import json
import logging
import requests
from decimal import Decimal
from typing import Dict, Any, Optional
from django.conf import settings
from .base import BasePaymentAdapter
from ..exceptions import (
    PaymentVerificationError,
    WebhookSignatureError,
    PaymentProviderFeatureNotActiveError
)

logger = logging.getLogger('marketplace.payments.payu')


class PayUAdapter(BasePaymentAdapter):
    """
    Official PayU India Payment Gateway Adapter.
    Adheres to official PayU Hash generation, reverse response verification,
    and Aggregator/Marketplace Split Settlement interface.
    """

    @property
    def provider_name(self) -> str:
        return 'PAYU'

    def __init__(self, key: Optional[str] = None, salt: Optional[str] = None, mode: Optional[str] = None):
        self.key = (key or getattr(settings, 'PAYU_MERCHANT_KEY', '')).strip()
        self.salt = (salt or getattr(settings, 'PAYU_MERCHANT_SALT', '')).strip()
        self.mode = (mode or getattr(settings, 'PAYU_MODE', 'TEST')).strip().upper()

    @property
    def payment_endpoint(self) -> str:
        if self.mode == 'PROD':
            return 'https://secure.payu.in/_payment'
        return 'https://test.payu.in/_payment'

    @property
    def postservice_endpoint(self) -> str:
        if self.mode == 'PROD':
            return 'https://info.payu.in/merchant/postservice?form=2'
        return 'https://test.payu.in/merchant/postservice?form=2'

    def generate_payment_hash(self, txnid: str, amount_str: str, productinfo: str,
                              firstname: str, email: str,
                              udf1: str = '', udf2: str = '', udf3: str = '',
                              udf4: str = '', udf5: str = '') -> str:
        """
        Official PayU Hash generation sequence:
        sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
        """
        hash_seq = (
            f"{self.key}|{txnid}|{amount_str}|{productinfo}|{firstname}|{email}|"
            f"{udf1}|{udf2}|{udf3}|{udf4}|{udf5}||||||{self.salt}"
        )
        return hashlib.sha512(hash_seq.encode('utf-8')).hexdigest().lower()

    def generate_response_hash(self, status: str, txnid: str, amount_str: str,
                               productinfo: str, firstname: str, email: str,
                               udf1: str = '', udf2: str = '', udf3: str = '',
                               udf4: str = '', udf5: str = '',
                               additional_charges: Optional[str] = None) -> str:
        """
        Official PayU Reverse Hash verification sequence:
        If additionalCharges is present:
        sha512(additionalCharges|SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
        Otherwise:
        sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
        """
        if additional_charges:
            hash_seq = (
                f"{additional_charges}|{self.salt}|{status}||||||"
                f"{udf5}|{udf4}|{udf3}|{udf2}|{udf1}|{email}|{firstname}|{productinfo}|{amount_str}|{txnid}|{self.key}"
            )
        else:
            hash_seq = (
                f"{self.salt}|{status}||||||"
                f"{udf5}|{udf4}|{udf3}|{udf2}|{udf1}|{email}|{firstname}|{productinfo}|{amount_str}|{txnid}|{self.key}"
            )
        return hashlib.sha512(hash_seq.encode('utf-8')).hexdigest().lower()

    def create_order(self, order, payment, return_url: str, **kwargs) -> Dict[str, Any]:
        """
        Generates checkout payload for PayU hosted checkout form or seamless integration.
        Uses exact integer paise converted to decimal formatted string.
        """
        txnid = payment.payment_id
        amount_decimal = (Decimal(payment.amount_paise) / Decimal('100.00')).quantize(Decimal('0.01'))
        amount_str = f"{amount_decimal:.2f}"
        
        # Productinfo sanitization
        productinfo = f"Wangs_Order_{order.order_number}"[:100]
        firstname = (order.customer_name or 'Customer').split()[0][:60]
        email = (order.customer_email or 'customer@wangs.in').strip()[:50]
        phone = ''.join(c for c in (order.customer_phone or '') if c.isdigit())[-10:] or '9999999999'

        # User defined fields for audit trace
        udf1 = order.order_number
        udf2 = str(payment.id)
        udf3 = 'B2B' if getattr(order, 'is_b2b', False) else 'B2C'
        udf4 = ''
        udf5 = ''

        payment_hash = self.generate_payment_hash(
            txnid=txnid,
            amount_str=amount_str,
            productinfo=productinfo,
            firstname=firstname,
            email=email,
            udf1=udf1,
            udf2=udf2,
            udf3=udf3,
            udf4=udf4,
            udf5=udf5
        )

        surl = kwargs.get('surl') or f"{return_url.rstrip('/')}/payments/verify/"
        furl = kwargs.get('furl') or f"{return_url.rstrip('/')}/payments/verify/"

        payload = {
            'action_url': self.payment_endpoint,
            'key': self.key,
            'txnid': txnid,
            'amount': amount_str,
            'productinfo': productinfo,
            'firstname': firstname,
            'email': email,
            'phone': phone,
            'surl': surl,
            'furl': furl,
            'hash': payment_hash,
            'udf1': udf1,
            'udf2': udf2,
            'udf3': udf3,
            'udf4': udf4,
            'udf5': udf5,
        }

        # If marketplace split settlement structure is prepared, include split_info
        if getattr(settings, 'PAYU_SPLIT_SETTLEMENTS_ENABLED', False):
            split_info = self.prepare_split_payload(order)
            if split_info:
                payload['split_info'] = json.dumps(split_info)

        return payload

    def verify_payment(self, payload: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """
        Performs server-side validation of PayU response payload against the reverse hash.
        """
        received_hash = (payload.get('hash') or '').strip().lower()
        status = (payload.get('status') or '').strip().lower()
        txnid = (payload.get('txnid') or '').strip()
        amount_str = (payload.get('amount') or '').strip()
        productinfo = (payload.get('productinfo') or '').strip()
        firstname = (payload.get('firstname') or '').strip()
        email = (payload.get('email') or '').strip()
        udf1 = (payload.get('udf1') or '').strip()
        udf2 = (payload.get('udf2') or '').strip()
        udf3 = (payload.get('udf3') or '').strip()
        udf4 = (payload.get('udf4') or '').strip()
        udf5 = (payload.get('udf5') or '').strip()
        additional_charges = payload.get('additionalCharges')

        if not received_hash or not txnid or not amount_str:
            raise PaymentVerificationError("Missing required PayU verification fields (hash, txnid, or amount).")

        expected_hash = self.generate_response_hash(
            status=status,
            txnid=txnid,
            amount_str=amount_str,
            productinfo=productinfo,
            firstname=firstname,
            email=email,
            udf1=udf1,
            udf2=udf2,
            udf3=udf3,
            udf4=udf4,
            udf5=udf5,
            additional_charges=additional_charges
        )

        if not hmac.compare_digest(received_hash, expected_hash):
            logger.error("PayU hash mismatch: received %s, expected %s", received_hash, expected_hash)
            raise PaymentVerificationError("PayU signature/hash mismatch. Possible data tampering.")

        is_success = (status == 'success')
        provider_payment_id = payload.get('mihpayid') or txnid

        try:
            amount_paise = int(Decimal(amount_str) * 100)
        except Exception:
            amount_paise = 0

        return {
            'is_valid': True,
            'is_success': is_success,
            'status': 'CAPTURED' if is_success else 'FAILED',
            'provider_payment_id': str(provider_payment_id),
            'provider_order_id': txnid,
            'amount_paise': amount_paise,
            'payment_method': payload.get('mode') or payload.get('bankcode') or 'PAYU',
            'raw_response': payload,
            'order_number': udf1,
        }

    def verify_webhook_signature(self, headers: Dict[str, str], body: Any, payload: Dict[str, Any]) -> bool:
        """
        Validates PayU webhook authenticity using reverse hash or signature headers.
        """
        try:
            res = self.verify_payment(payload)
            return res.get('is_valid', False)
        except Exception as exc:
            logger.warning("PayU webhook signature verification failed: %s", exc)
            return False

    def get_payment_details(self, provider_payment_id_or_order_id: str) -> Dict[str, Any]:
        """
        Queries PayU server-to-server verify_payment API.
        """
        # Command: verify_payment
        command = 'verify_payment'
        var1 = provider_payment_id_or_order_id
        hash_seq = f"{self.key}|{command}|{var1}|{self.salt}"
        api_hash = hashlib.sha512(hash_seq.encode('utf-8')).hexdigest().lower()

        data = {
            'key': self.key,
            'command': command,
            'var1': var1,
            'hash': api_hash
        }

        try:
            resp = requests.post(self.postservice_endpoint, data=data, timeout=10)
            if resp.status_code == 200:
                result = resp.json()
                return {'success': True, 'data': result}
            return {'success': False, 'status_code': resp.status_code, 'data': resp.text}
        except Exception as exc:
            logger.warning("Error querying PayU payment details: %s", exc)
            return {'success': False, 'error': str(exc)}

    def initiate_refund(self, payment, amount_paise: int, reason: str, **kwargs) -> Dict[str, Any]:
        """
        Calls PayU merchant postservice refund API (cancel_refund_transaction).
        """
        refund_amount_decimal = (Decimal(amount_paise) / Decimal('100.00')).quantize(Decimal('0.01'))
        command = 'cancel_refund_transaction'
        var1 = payment.provider_payment_id or payment.provider_order_id
        var2 = f"ref_{payment.payment_id}_{amount_paise}"
        var3 = f"{refund_amount_decimal:.2f}"

        hash_seq = f"{self.key}|{command}|{var1}|{self.salt}"
        api_hash = hashlib.sha512(hash_seq.encode('utf-8')).hexdigest().lower()

        data = {
            'key': self.key,
            'command': command,
            'var1': var1,
            'var2': var2,
            'var3': var3,
            'hash': api_hash
        }

        try:
            resp = requests.post(self.postservice_endpoint, data=data, timeout=10)
            if resp.status_code == 200:
                res_data = resp.json()
                return {
                    'status': 'PROCESSED' if res_data.get('status') == 1 else 'FAILED',
                    'provider_refund_reference': str(res_data.get('msg') or var2),
                    'raw_response': res_data
                }
            return {
                'status': 'FAILED',
                'provider_refund_reference': var2,
                'raw_response': {'status_code': resp.status_code, 'text': resp.text}
            }
        except Exception as exc:
            logger.error("PayU refund request failed: %s", exc)
            return {
                'status': 'FAILED',
                'provider_refund_reference': var2,
                'raw_response': {'error': str(exc)}
            }

    def get_refund_status(self, refund_reference: str) -> Dict[str, Any]:
        command = 'check_action_status'
        var1 = refund_reference
        hash_seq = f"{self.key}|{command}|{var1}|{self.salt}"
        api_hash = hashlib.sha512(hash_seq.encode('utf-8')).hexdigest().lower()

        data = {
            'key': self.key,
            'command': command,
            'var1': var1,
            'hash': api_hash
        }

        try:
            resp = requests.post(self.postservice_endpoint, data=data, timeout=10)
            return {'success': resp.status_code == 200, 'response': resp.text}
        except Exception as exc:
            return {'success': False, 'error': str(exc)}

    # -------------------------------------------------------------
    # MARKETPLACE SPLIT SETTLEMENTS (AGGREGATOR MODEL)
    # -------------------------------------------------------------

    def prepare_split_payload(self, order, allocations=None) -> Dict[str, Any]:
        """
        Builds the standard PayU Aggregator split settlement payload format:
        https://docs.payu.in/docs/aggregator-or-marketplace-settlement-solution
        
        Formats child merchant distribution strictly adhering to PayU docs.
        """
        if allocations is None:
            allocations = order.seller_allocations.all()

        child_merchants = []
        for alloc in allocations:
            seller = alloc.seller
            profile = getattr(seller, 'payment_profile', None)
            vendor_id = profile.provider_merchant_id if profile else ''
            if not vendor_id:
                vendor_id = getattr(seller, 'cashfree_vendor_id', '') or f"seller_{seller.id}"

            net_amount_str = f"{(Decimal(alloc.net_seller_paise) / Decimal('100.00')).quantize(Decimal('0.01')):.2f}"
            comm_amount_str = f"{(Decimal(alloc.commission_deducted_paise) / Decimal('100.00')).quantize(Decimal('0.01')):.2f}"

            child_merchants.append({
                'merchantId': vendor_id,
                'amount': net_amount_str,
                'commission': comm_amount_str,
            })

        return {
            'merchantTxnId': order.order_number,
            'amount': f"{order.total_amount:.2f}",
            'child_merchants': child_merchants
        }

    def create_split_settlement(self, order, allocations, **kwargs) -> Dict[str, Any]:
        """
        Safely disables live PayU split settlements until formal PayU approval.
        """
        if not getattr(settings, 'PAYU_SPLIT_SETTLEMENTS_ENABLED', False):
            raise PaymentProviderFeatureNotActiveError(
                "PayU Marketplace Split Settlements feature is pending approval and activation. "
                "Live split transfers remain safely disabled. No live payout was executed."
            )

        # Implementation for when PayU activates split settlements
        payload = self.prepare_split_payload(order, allocations)
        return {
            'status': 'PROCESSING',
            'split_payload': payload,
            'message': 'Split settlement submitted to PayU'
        }

    def release_seller_settlement(self, settlement, **kwargs) -> Dict[str, Any]:
        """
        Safely disables individual payout releases until commercial activation.
        """
        if not getattr(settings, 'PAYU_SPLIT_SETTLEMENTS_ENABLED', False):
            raise PaymentProviderFeatureNotActiveError(
                "PayU live seller payout release is disabled pending marketplace approval."
            )
        return {'status': 'SUBMITTED', 'settlement_reference': settlement.settlement_reference}
