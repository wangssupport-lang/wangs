import uuid
import logging
from decimal import Decimal
from typing import Dict, Any, Optional
from django.db import transaction
from django.utils import timezone
from ..models import (
    Order, Payment, Commission, SellerAllocation, Settlement,
    Refund, WebhookEvent, AuditLog, PaymentTransaction
)
from .exceptions import (
    PaymentError,
    PaymentVerificationError,
    WebhookSignatureError,
    IdempotencyError
)
from .adapters import get_payment_adapter
from .commission_engine import CommissionEngine, to_paise, to_rupees

logger = logging.getLogger('marketplace.payments.service')


class MarketplacePaymentService:
    """
    Core Payment Lifecycle and Multi-Vendor Settlement Orchestrator.
    Manages payment creation, server-side verification, commission snapshots,
    idempotent webhook processing, and refunds.
    """

    @classmethod
    @transaction.atomic
    def initiate_payment(
        cls,
        order: Order,
        provider_name: Optional[str] = None,
        return_url: str = 'https://wangs.in',
        idempotency_key: Optional[str] = None,
        customer=None
    ) -> Dict[str, Any]:
        """
        Initializes a payment intent for an order and returns checkout form data.
        """
        adapter = get_payment_adapter(provider_name)
        actual_provider = adapter.provider_name
        amount_paise = to_paise(order.total_amount)

        if not idempotency_key:
            idempotency_key = f"pay_init_{order.order_number}"

        # Check existing payment
        existing_payment = Payment.objects.filter(
            idempotency_key=idempotency_key
        ).first()

        if existing_payment and existing_payment.status == Payment.Status.CAPTURED:
            raise IdempotencyError(f"Payment for order #{order.order_number} is already completed.")

        if existing_payment:
            payment = existing_payment
            payment.payment_provider = actual_provider
            payment.amount_paise = amount_paise
            payment.status = Payment.Status.INITIATED
            payment.save(update_fields=['payment_provider', 'amount_paise', 'status', 'updated_at'])
        else:
            payment_id = f"PAY-{order.order_number}-{uuid.uuid4().hex[:6].upper()}"
            payment = Payment.objects.create(
                payment_id=payment_id,
                order=order,
                customer=customer or order.user,
                payment_provider=actual_provider,
                amount_paise=amount_paise,
                currency='INR',
                status=Payment.Status.INITIATED,
                idempotency_key=idempotency_key,
                payment_method=actual_provider
            )

        checkout_data = adapter.create_order(order, payment, return_url=return_url)

        # Backwards compatibility: keep PaymentTransaction record in sync
        PaymentTransaction.objects.get_or_create(
            idempotency_key=f"tx_{payment.payment_id}",
            defaults={
                'order': order,
                'provider': actual_provider,
                'payment_order_id': payment.payment_id,
                'status': PaymentTransaction.Status.PENDING,
                'amount': order.total_amount,
                'currency': 'INR',
                'raw_payload': {'payment_id': payment.payment_id, 'amount_paise': amount_paise}
            }
        )

        return {
            'payment_id': payment.payment_id,
            'order_number': order.order_number,
            'amount_paise': amount_paise,
            'amount': str(order.total_amount),
            'currency': 'INR',
            'provider': actual_provider,
            'checkout_data': checkout_data,
        }

    @classmethod
    def verify_and_capture_payment(
        cls,
        order: Order,
        payload: Dict[str, Any],
        provider_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Validates payment with the provider adapter and idempotently transitions
        the order to PAID and allocations to PENDING settlement.
        """
        adapter = get_payment_adapter(provider_name)

        # Look up corresponding payment
        payment = Payment.objects.filter(order=order).order_by('-created_at').first()
        if not payment:
            amount_paise = to_paise(order.total_amount)
            payment = Payment.objects.create(
                payment_id=f"PAY-{order.order_number}-{uuid.uuid4().hex[:6].upper()}",
                order=order,
                customer=order.user,
                payment_provider=adapter.provider_name,
                amount_paise=amount_paise,
                currency='INR',
                status=Payment.Status.INITIATED,
                idempotency_key=f"pay_auto_{order.order_number}"
            )

        if payment.status == Payment.Status.CAPTURED:
            return {
                'status': 'ALREADY_CAPTURED',
                'payment': payment,
                'order': order,
                'detail': 'Payment was already verified and captured.'
            }

        # Verify through adapter
        verification = adapter.verify_payment(payload)
        if not verification.get('is_valid') or not verification.get('is_success'):
            payment.status = Payment.Status.FAILED
            payment.raw_response = payload
            payment.save(update_fields=['status', 'raw_response', 'updated_at'])
            order.payment_status = Order.PaymentStatus.FAILED
            order.save(update_fields=['payment_status', 'updated_at'])
            raise PaymentVerificationError("Payment verification failed or status is not successful.")

        # Amount sanity check
        verified_amount_paise = verification.get('amount_paise', 0)
        if verified_amount_paise and verified_amount_paise != payment.amount_paise:
            logger.error(
                "Payment amount mismatch for order #%s: expected %s, got %s",
                order.order_number, payment.amount_paise, verified_amount_paise
            )
            payment.status = Payment.Status.FAILED
            payment.save(update_fields=['status', 'updated_at'])
            raise PaymentVerificationError("Tampered payment amount detected.")

        with transaction.atomic():
            # Update payment record
            now = timezone.now()
            payment.status = Payment.Status.CAPTURED
            payment.provider_payment_id = verification.get('provider_payment_id', '')
            payment.provider_order_id = verification.get('provider_order_id', '')
            payment.payment_method = verification.get('payment_method') or payment.payment_method
            payment.verification_timestamp = now
            payment.raw_response = payload
            payment.save(update_fields=[
                'status', 'provider_payment_id', 'provider_order_id',
                'payment_method', 'verification_timestamp', 'raw_response', 'updated_at'
            ])

            # Update order status
            order.payment_status = Order.PaymentStatus.PAID
            order.status = Order.Status.CONFIRMED
            order.payment_method = adapter.provider_name
            order.save(update_fields=['payment_status', 'status', 'payment_method', 'updated_at'])

            # Create immutable Commission snapshots & Seller Allocations
            commissions = CommissionEngine.snapshot_order_commissions_and_allocations(order)

            # Sync legacy PaymentTransaction record
            PaymentTransaction.objects.filter(order=order).update(
                status=PaymentTransaction.Status.SUCCESS,
                transaction_id=payment.provider_payment_id or payment.payment_id
            )

            # Create audit log
            AuditLog.objects.create(
                user=order.user,
                action='PAYMENT_CAPTURED',
                target_model='Payment',
                target_id=payment.payment_id,
                details={
                    'order_number': order.order_number,
                    'amount_paise': payment.amount_paise,
                    'provider': adapter.provider_name,
                    'status': payment.status,
                    'commissions_count': len(commissions)
                }
            )

        # Notify manufacturers safely
        try:
            from ..resend_service import send_order_notifications_to_manufacturers
            send_order_notifications_to_manufacturers(order)
        except Exception as exc:
            logger.warning("Could not send manufacturer notification: %s", exc)

        return {
            'status': 'CAPTURED',
            'payment': payment,
            'order': order,
            'commissions': commissions
        }

    @classmethod
    @transaction.atomic
    def process_webhook(
        cls,
        provider_name: str,
        event_id: str,
        event_type: str,
        payload: Dict[str, Any],
        headers: Optional[Dict[str, str]] = None,
        body: Any = None
    ) -> Dict[str, Any]:
        """
        Idempotent webhook processor for payment events.
        Guarantees that duplicate webhook triggers will not cause duplicate operations.
        """
        adapter = get_payment_adapter(provider_name)

        # Idempotency check on WebhookEvent
        event, created = WebhookEvent.objects.get_or_create(
            provider=adapter.provider_name,
            event_id=event_id,
            defaults={
                'event_type': event_type,
                'payload': payload,
                'processing_status': WebhookEvent.ProcessingStatus.RECEIVED
            }
        )

        if not created and event.processing_status == WebhookEvent.ProcessingStatus.PROCESSED:
            logger.info("Webhook %s already processed. Skipping duplicate.", event_id)
            return {'status': 'ALREADY_PROCESSED', 'event_id': event_id}

        # Verify webhook signature / hash
        is_valid = adapter.verify_webhook_signature(headers or {}, body, payload)
        if not is_valid:
            event.processing_status = WebhookEvent.ProcessingStatus.FAILED
            event.error_message = "Webhook signature verification failed"
            event.save(update_fields=['processing_status', 'error_message'])
            raise WebhookSignatureError("Invalid webhook signature.")

        # Identify related order from payload (txnid or udf1 or order_id)
        order_number = (
            payload.get('udf1') or
            payload.get('order_number') or
            payload.get('txnid', '').replace('PAY-', '').split('-')[0]
        )
        order = Order.objects.filter(order_number=order_number).first()
        if not order and payload.get('txnid'):
            # Try finding via payment
            payment_by_tx = Payment.objects.filter(payment_id=payload['txnid']).first()
            if payment_by_tx:
                order = payment_by_tx.order

        if not order:
            event.processing_status = WebhookEvent.ProcessingStatus.IGNORED
            event.error_message = f"No related order found for payload identifier: {order_number}"
            event.save(update_fields=['processing_status', 'error_message'])
            return {'status': 'IGNORED', 'reason': 'Order not found'}

        # Process payment status update
        try:
            status_str = payload.get('status', '').lower()
            if status_str in ('success', 'captured', 'paid'):
                cls.verify_and_capture_payment(order, payload, provider_name=adapter.provider_name)
            elif status_str in ('failed', 'failure'):
                payment = Payment.objects.filter(order=order).last()
                if payment and payment.status != Payment.Status.CAPTURED:
                    payment.status = Payment.Status.FAILED
                    payment.save(update_fields=['status', 'updated_at'])
                order.payment_status = Order.PaymentStatus.FAILED
                order.save(update_fields=['payment_status', 'updated_at'])

            event.related_payment = Payment.objects.filter(order=order).last()
            event.processing_status = WebhookEvent.ProcessingStatus.PROCESSED
            event.processed_timestamp = timezone.now()
            event.save(update_fields=['related_payment', 'processing_status', 'processed_timestamp'])

            return {'status': 'PROCESSED', 'event_id': event_id, 'order_number': order.order_number}
        except Exception as exc:
            event.processing_status = WebhookEvent.ProcessingStatus.FAILED
            event.error_message = str(exc)
            event.save(update_fields=['processing_status', 'error_message'])
            raise

    @classmethod
    @transaction.atomic
    def process_refund(
        cls,
        order: Order,
        amount_paise: Optional[int] = None,
        reason: str = "Customer requested cancellation",
        admin_user=None
    ) -> Refund:
        """
        Processes a full or partial refund for a captured payment.
        Validates against duplicate refunds and over-refunding.
        """
        payment = Payment.objects.filter(order=order, status=Payment.Status.CAPTURED).last()
        if not payment:
            raise PaymentError(f"No captured payment found for order #{order.order_number} to refund.")

        if amount_paise is None:
            amount_paise = payment.amount_paise

        # Check total previous refunds
        existing_refunds = Refund.objects.filter(order=order, status=Refund.Status.PROCESSED)
        already_refunded_paise = sum(to_paise(r.amount) for r in existing_refunds)
        available_paise = payment.amount_paise - already_refunded_paise

        if amount_paise <= 0:
            raise PaymentError("Refund amount must be greater than zero.")
        if amount_paise > available_paise:
            raise PaymentError(
                f"Requested refund (₹{to_rupees(amount_paise)}) exceeds available amount (₹{to_rupees(available_paise)})."
            )

        adapter = get_payment_adapter(payment.payment_provider)
        refund_res = adapter.initiate_refund(payment, amount_paise, reason)

        refund_status = (
            Refund.Status.PROCESSED
            if refund_res.get('status') == 'PROCESSED'
            else Refund.Status.REQUESTED
        )

        refund = Refund.objects.create(
            order=order,
            payment=payment,
            amount=to_rupees(amount_paise),
            amount_paise=amount_paise,
            reason=reason,
            status=refund_status,
            refund_transaction_id=refund_res.get('provider_refund_reference', ''),
            provider_refund_reference=refund_res.get('provider_refund_reference', ''),
            admin_notes=f"Processed by {admin_user.username if admin_user else 'System'}"
        )

        # Update payment and order statuses
        new_total_refunded = already_refunded_paise + amount_paise
        if new_total_refunded >= payment.amount_paise:
            payment.status = Payment.Status.REFUNDED
            order.payment_status = Order.PaymentStatus.REFUNDED
            order.status = Order.Status.REFUNDED
            # Update seller allocations to REVERSED
            order.seller_allocations.update(transfer_status=SellerAllocation.TransferStatus.REVERSED)
        else:
            payment.status = Payment.Status.PARTIALLY_REFUNDED
            order.payment_status = Order.PaymentStatus.PAID  # partially refunded

        payment.save(update_fields=['status', 'updated_at'])
        order.save(update_fields=['payment_status', 'status', 'updated_at'])

        return refund
