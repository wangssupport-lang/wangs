import uuid
from decimal import Decimal
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from .models import (
    AuditLog,
    CommissionSetting,
    FinancialAuditLog,
    ManufacturerProfile,
    Order,
    OrderItem,
    SellerBalance,
    SellerFinancialLedger,
    SellerPaymentProfile,
    SellerWithdrawal,
)


def mask_bank_account(account_number: str) -> str:
    """Mask sensitive bank account numbers, showing only the last 4 digits."""
    raw = str(account_number or '').strip()
    if not raw:
        return 'Not Provided'
    if len(raw) <= 4:
        return '••••' + raw
    return f"•••• •••• {raw[-4:]}"


def get_client_ip(request) -> str | None:
    if not request:
        return None
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def get_seller_bank_info(seller: ManufacturerProfile) -> dict:
    """Return masked bank & Razorpay Route verification info for a seller."""
    payment_profile = SellerPaymentProfile.objects.filter(seller=seller).first()
    has_bank_fields = bool(
        (seller.bank_account_holder or '').strip()
        and (seller.bank_account_number or '').strip()
        and (seller.bank_ifsc_code or '').strip()
    )

    if payment_profile:
        verification_status = payment_profile.bank_verification_status
        kyc_status = payment_profile.kyc_status
        route_status = payment_profile.onboarding_status
    else:
        verification_status = 'VERIFIED' if (has_bank_fields and seller.status == ManufacturerProfile.Status.APPROVED and seller.is_verified_producer) else 'PENDING'
        kyc_status = 'VERIFIED' if seller.is_verified_producer else 'PENDING'
        route_status = 'INCOMPLETE' if not has_bank_fields else 'PENDING_APPROVAL'

    return {
        'account_holder': seller.bank_account_holder or '',
        'bank_name': seller.bank_name or 'Not Specified',
        'masked_account_number': mask_bank_account(seller.bank_account_number),
        'ifsc_code': seller.bank_ifsc_code or '',
        'verification_status': verification_status,
        'kyc_status': kyc_status,
        'route_status': route_status,
        'is_bank_verified': verification_status == 'VERIFIED' and has_bank_fields,
    }


def get_or_create_seller_balance_locked(seller: ManufacturerProfile) -> SellerBalance:
    """Fetch or initialize SellerBalance with a row-level lock inside an atomic transaction."""
    balance = SellerBalance.objects.select_for_update().filter(seller=seller).first()
    if balance:
        return balance
    balance, _ = SellerBalance.objects.get_or_create(seller=seller)
    return SellerBalance.objects.select_for_update().get(pk=balance.pk)


class WithdrawalWorkflowError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


@transaction.atomic
def approve_withdrawal(
    withdrawal_id: int,
    admin_user,
    internal_note: str = '',
    ip_address: str | None = None,
) -> SellerWithdrawal:
    """
    Approve a seller withdrawal request after re-validating balance, minimum threshold,
    and bank/account verification. Never marks status as PAID on approval alone.
    """
    withdrawal = SellerWithdrawal.objects.select_for_update().select_related('seller', 'seller__user').filter(pk=withdrawal_id).first()
    if not withdrawal:
        raise WithdrawalWorkflowError('Withdrawal request not found.', status_code=404)

    if withdrawal.status not in (SellerWithdrawal.Status.REQUESTED, SellerWithdrawal.Status.UNDER_REVIEW):
        raise WithdrawalWorkflowError(
            f'Cannot approve a request with status "{withdrawal.get_status_display()}".',
            status_code=400,
        )

    seller = withdrawal.seller
    if seller.status != ManufacturerProfile.Status.APPROVED:
        raise WithdrawalWorkflowError('Seller account must be Approved before approving withdrawals.', status_code=400)

    bank_info = get_seller_bank_info(seller)
    if not bank_info['is_bank_verified']:
        raise WithdrawalWorkflowError(
            'Seller bank details must be verified before approving a withdrawal request.',
            status_code=400,
        )

    settings_obj = CommissionSetting.get_current()
    min_amount = settings_obj.minimum_withdrawal_amount or Decimal('300.00')
    if withdrawal.requested_amount < min_amount:
        raise WithdrawalWorkflowError(f'Minimum withdrawal amount is ₹{min_amount}.', status_code=400)

    balance = get_or_create_seller_balance_locked(seller)
    if balance.withdrawal_processing < withdrawal.requested_amount:
        raise WithdrawalWorkflowError(
            'Reserved processing balance is lower than the requested amount. Reconciliation required.',
            status_code=409,
        )

    prev_state = {
        'status': withdrawal.status,
        'admin_internal_note': withdrawal.admin_internal_note,
        'withdrawal_processing': str(balance.withdrawal_processing),
        'available_balance': str(balance.available_balance),
    }

    now = timezone.now()
    withdrawal.status = SellerWithdrawal.Status.APPROVED
    withdrawal.reviewed_by = admin_user
    withdrawal.reviewed_at = now
    withdrawal.approved_at = now
    withdrawal.bank_verification_status_snapshot = bank_info['verification_status']
    if internal_note.strip():
        withdrawal.admin_internal_note = internal_note.strip()
    withdrawal.save()

    new_state = {
        'status': withdrawal.status,
        'admin_internal_note': withdrawal.admin_internal_note,
        'approved_at': now.isoformat(),
    }

    FinancialAuditLog.objects.create(
        actor=admin_user,
        action='WITHDRAWAL_APPROVED',
        target_model='SellerWithdrawal',
        target_id=str(withdrawal.id),
        seller=seller,
        withdrawal=withdrawal,
        reason=internal_note.strip() or 'Approved by admin after bank & balance verification.',
        previous_state=prev_state,
        new_state=new_state,
        ip_address=ip_address,
    )
    AuditLog.objects.create(
        user=admin_user,
        action='WITHDRAWAL_APPROVED',
        target_model='SellerWithdrawal',
        target_id=str(withdrawal.id),
        details={'request_reference': withdrawal.request_reference, 'amount': str(withdrawal.requested_amount)},
    )
    return withdrawal


@transaction.atomic
def reject_withdrawal(
    withdrawal_id: int,
    admin_user,
    reason: str,
    internal_note: str = '',
    ip_address: str | None = None,
) -> SellerWithdrawal:
    """
    Reject a withdrawal request with a mandatory reason and atomically release
    the reserved funds back into the seller's available balance.
    """
    clean_reason = (reason or '').strip()
    if not clean_reason:
        raise WithdrawalWorkflowError('A rejection reason is mandatory.', status_code=400)

    withdrawal = SellerWithdrawal.objects.select_for_update().select_related('seller', 'seller__user').filter(pk=withdrawal_id).first()
    if not withdrawal:
        raise WithdrawalWorkflowError('Withdrawal request not found.', status_code=404)

    if withdrawal.status not in (
        SellerWithdrawal.Status.REQUESTED,
        SellerWithdrawal.Status.UNDER_REVIEW,
        SellerWithdrawal.Status.APPROVED,
    ):
        raise WithdrawalWorkflowError(
            f'Cannot reject a request with status "{withdrawal.get_status_display()}".',
            status_code=400,
        )

    seller = withdrawal.seller
    balance = get_or_create_seller_balance_locked(seller)
    if balance.withdrawal_processing < withdrawal.requested_amount:
        raise WithdrawalWorkflowError(
            'Reserved processing balance is lower than the requested amount. Reconciliation required.',
            status_code=409,
        )

    prev_state = {
        'status': withdrawal.status,
        'available_balance': str(balance.available_balance),
        'withdrawal_processing': str(balance.withdrawal_processing),
    }

    # Release reserved funds back to available balance
    balance.withdrawal_processing -= withdrawal.requested_amount
    balance.available_balance += withdrawal.requested_amount
    balance.save(update_fields=['withdrawal_processing', 'available_balance', 'updated_at'])

    # Record immutable ledger release entry
    SellerFinancialLedger.objects.create(
        seller=seller,
        transaction_reference=f"WDREL-{withdrawal.request_reference}-{uuid.uuid4().hex[:6].upper()}",
        transaction_type=SellerFinancialLedger.TransactionType.WITHDRAWAL_RELEASE,
        signed_amount=withdrawal.requested_amount,
        status=SellerFinancialLedger.Status.POSTED,
        description=f"Released reserved withdrawal {withdrawal.request_reference}: {clean_reason}",
        created_by=admin_user,
    )

    now = timezone.now()
    withdrawal.status = SellerWithdrawal.Status.REJECTED
    withdrawal.rejection_reason = clean_reason
    withdrawal.reviewed_by = admin_user
    withdrawal.reviewed_at = now
    if internal_note.strip():
        withdrawal.admin_internal_note = internal_note.strip()
    withdrawal.save()

    new_state = {
        'status': withdrawal.status,
        'rejection_reason': clean_reason,
        'available_balance': str(balance.available_balance),
        'withdrawal_processing': str(balance.withdrawal_processing),
    }

    FinancialAuditLog.objects.create(
        actor=admin_user,
        action='WITHDRAWAL_REJECTED',
        target_model='SellerWithdrawal',
        target_id=str(withdrawal.id),
        seller=seller,
        withdrawal=withdrawal,
        reason=clean_reason,
        previous_state=prev_state,
        new_state=new_state,
        ip_address=ip_address,
    )
    AuditLog.objects.create(
        user=admin_user,
        action='WITHDRAWAL_REJECTED',
        target_model='SellerWithdrawal',
        target_id=str(withdrawal.id),
        details={'request_reference': withdrawal.request_reference, 'reason': clean_reason},
    )
    return withdrawal


@transaction.atomic
def review_withdrawal(
    withdrawal_id: int,
    admin_user,
    internal_note: str = '',
    set_under_review: bool = True,
    ip_address: str | None = None,
) -> SellerWithdrawal:
    """Place a withdrawal request under review and/or update the admin internal note."""
    withdrawal = SellerWithdrawal.objects.select_for_update().select_related('seller').filter(pk=withdrawal_id).first()
    if not withdrawal:
        raise WithdrawalWorkflowError('Withdrawal request not found.', status_code=404)

    prev_state = {
        'status': withdrawal.status,
        'admin_internal_note': withdrawal.admin_internal_note,
    }

    if set_under_review and withdrawal.status == SellerWithdrawal.Status.REQUESTED:
        withdrawal.status = SellerWithdrawal.Status.UNDER_REVIEW
        withdrawal.reviewed_by = admin_user
        withdrawal.reviewed_at = timezone.now()

    if internal_note is not None and internal_note.strip():
        withdrawal.admin_internal_note = internal_note.strip()

    withdrawal.save()

    FinancialAuditLog.objects.create(
        actor=admin_user,
        action='WITHDRAWAL_REVIEW_UPDATED',
        target_model='SellerWithdrawal',
        target_id=str(withdrawal.id),
        seller=withdrawal.seller,
        withdrawal=withdrawal,
        reason=internal_note.strip() or 'Marked under review by admin.',
        previous_state=prev_state,
        new_state={
            'status': withdrawal.status,
            'admin_internal_note': withdrawal.admin_internal_note,
        },
        ip_address=ip_address,
    )
    return withdrawal


def get_seller_earnings_breakdown(seller: ManufacturerProfile, limit: int = 20) -> list[dict]:
    """Return completed/paid order items for the seller showing Wangs commission & net earnings."""
    items = (
        OrderItem.objects.filter(
            manufacturer=seller,
            order__payment_status=Order.PaymentStatus.PAID,
        )
        .select_related('order')
        .order_by('-order__created_at')[:limit]
    )
    rows = []
    for item in items:
        rows.append({
            'order_number': item.order.order_number,
            'order_date': item.order.created_at.isoformat(),
            'order_status': item.order.status,
            'product_title': item.product_title,
            'quantity': item.quantity,
            'product_value': str(item.subtotal),
            'commission_rate': str(item.commission_rate),
            'commission_amount': str(item.commission_amount),
            'delivery_allocation': '0.00',
            'net_seller_earnings': str(item.manufacturer_payout),
            'fulfillment_status': item.fulfillment_status,
        })
    return rows


def get_previous_withdrawals_total(seller: ManufacturerProfile, exclude_id: int | None = None) -> tuple[Decimal, int]:
    qs = SellerWithdrawal.objects.filter(seller=seller, status=SellerWithdrawal.Status.PAID)
    if exclude_id:
        qs = qs.exclude(id=exclude_id)
    agg = qs.aggregate(total=Sum('requested_amount'))
    return (agg['total'] or Decimal('0.00')), qs.count()


@transaction.atomic
def sync_seller_balance_from_paid_orders(seller: ManufacturerProfile) -> SellerBalance:
    """
    Idempotently post missing ORDER_EARNING ledger entries for PAID order items
    and release pending earnings to available_balance once delivered + return_period_days elapsed.
    """
    from datetime import timedelta

    balance = get_or_create_seller_balance_locked(seller)
    settings_obj = CommissionSetting.get_current()
    return_days = int(getattr(settings_obj, 'return_period_days', 7) or 7)
    cutoff = timezone.now() - timedelta(days=return_days)

    paid_items = (
        OrderItem.objects.filter(
            manufacturer=seller,
            order__payment_status=Order.PaymentStatus.PAID,
        )
        .exclude(order__status__in=[Order.Status.CANCELLED, Order.Status.REFUNDED])
        .select_related('order')
    )

    existing_refs = set(
        SellerFinancialLedger.objects.filter(
            seller=seller,
            transaction_type=SellerFinancialLedger.TransactionType.ORDER_EARNING,
        ).values_list('transaction_reference', flat=True)
    )
    released_refs = set(
        SellerFinancialLedger.objects.filter(
            seller=seller,
            transaction_type=SellerFinancialLedger.TransactionType.ELIGIBILITY_RELEASE,
        ).values_list('transaction_reference', flat=True)
    )

    for item in paid_items:
        earn_ref = f"ORDITEM-{item.id}"
        payout = (item.manufacturer_payout or Decimal('0.00')).quantize(Decimal('0.01'))
        if payout <= Decimal('0.00'):
            continue

        is_delivered = (
            item.order.status == Order.Status.DELIVERED
            or item.fulfillment_status == OrderItem.FulfillmentStatus.DELIVERED
        )
        is_eligible_now = is_delivered and (item.order.updated_at <= cutoff)

        if earn_ref not in existing_refs:
            SellerFinancialLedger.objects.create(
                seller=seller,
                order=item.order,
                order_item=item,
                transaction_reference=earn_ref,
                transaction_type=SellerFinancialLedger.TransactionType.ORDER_EARNING,
                product_amount=item.subtotal,
                commission_deduction=item.commission_amount,
                delivery_allocation=Decimal('0.00'),
                signed_amount=payout,
                status=SellerFinancialLedger.Status.COMPLETED if is_eligible_now else SellerFinancialLedger.Status.PENDING,
                description=f"Order #{item.order.order_number} · {item.quantity}x {item.product_title}",
            )
            balance.total_lifetime_earnings += payout
            if is_eligible_now:
                balance.available_balance += payout
                # Also mark eligibility release ref so we don't double-release
                rel_ref = f"RELITEM-{item.id}"
                if rel_ref not in released_refs:
                    SellerFinancialLedger.objects.create(
                        seller=seller,
                        order=item.order,
                        order_item=item,
                        transaction_reference=rel_ref,
                        transaction_type=SellerFinancialLedger.TransactionType.ELIGIBILITY_RELEASE,
                        signed_amount=Decimal('0.00'),
                        status=SellerFinancialLedger.Status.COMPLETED,
                        description=f"Return period completed for #{item.order.order_number}",
                    )
                    released_refs.add(rel_ref)
            else:
                balance.pending_earnings += payout
            existing_refs.add(earn_ref)
        else:
            # Item was already recorded earlier; check if it should now transition from pending -> available
            rel_ref = f"RELITEM-{item.id}"
            if is_eligible_now and rel_ref not in released_refs and balance.pending_earnings >= payout:
                balance.pending_earnings -= payout
                balance.available_balance += payout
                SellerFinancialLedger.objects.create(
                    seller=seller,
                    order=item.order,
                    order_item=item,
                    transaction_reference=rel_ref,
                    transaction_type=SellerFinancialLedger.TransactionType.ELIGIBILITY_RELEASE,
                    signed_amount=Decimal('0.00'),
                    status=SellerFinancialLedger.Status.COMPLETED,
                    description=f"Return period completed for #{item.order.order_number}",
                )
                released_refs.add(rel_ref)

    balance.save()
    return balance


@transaction.atomic
def submit_seller_withdrawal(
    seller: ManufacturerProfile,
    amount,
    seller_notes: str = '',
    actor_user=None,
    ip_address: str | None = None,
) -> SellerWithdrawal:
    """
    Atomically validate and reserve funds for a seller withdrawal request (min ₹300).
    """
    from decimal import InvalidOperation

    if seller.status != ManufacturerProfile.Status.APPROVED:
        raise WithdrawalWorkflowError('Your seller account must be approved before requesting withdrawals.', status_code=403)

    try:
        req_amount = Decimal(str(amount)).quantize(Decimal('0.01'))
    except (InvalidOperation, TypeError, ValueError):
        raise WithdrawalWorkflowError('Enter a valid withdrawal amount.', status_code=400)

    settings_obj = CommissionSetting.get_current()
    min_amount = (settings_obj.minimum_withdrawal_amount or Decimal('300.00')).quantize(Decimal('0.01'))
    if req_amount < min_amount:
        raise WithdrawalWorkflowError(f'Minimum withdrawal amount is ₹{min_amount}.', status_code=400)

    bank_info = get_seller_bank_info(seller)
    if not bank_info['is_bank_verified']:
        raise WithdrawalWorkflowError(
            'Your bank account and KYC verification must be completed before requesting a withdrawal.',
            status_code=400,
        )

    balance = sync_seller_balance_from_paid_orders(seller)
    if req_amount > balance.available_balance:
        raise WithdrawalWorkflowError(
            f'Requested amount ₹{req_amount} exceeds your available balance of ₹{balance.available_balance}.',
            status_code=400,
        )

    avail_snapshot = balance.available_balance
    balance.available_balance -= req_amount
    balance.withdrawal_processing += req_amount
    balance.save(update_fields=['available_balance', 'withdrawal_processing', 'updated_at'])

    ref = f"WD-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    withdrawal = SellerWithdrawal.objects.create(
        request_reference=ref,
        seller=seller,
        requested_amount=req_amount,
        available_balance_snapshot=avail_snapshot,
        bank_verification_status_snapshot=bank_info['verification_status'],
        status=SellerWithdrawal.Status.REQUESTED,
        seller_notes=(seller_notes or '').strip(),
    )

    SellerFinancialLedger.objects.create(
        seller=seller,
        transaction_reference=f"WDRES-{ref}",
        transaction_type=SellerFinancialLedger.TransactionType.WITHDRAWAL_RESERVE,
        signed_amount=-req_amount,
        status=SellerFinancialLedger.Status.RESERVED,
        description=f"Withdrawal request {ref} reserved for admin review",
        created_by=actor_user,
    )

    FinancialAuditLog.objects.create(
        actor=actor_user,
        action='WITHDRAWAL_REQUESTED',
        target_model='SellerWithdrawal',
        target_id=str(withdrawal.id),
        seller=seller,
        withdrawal=withdrawal,
        reason=(seller_notes or '').strip() or 'Seller submitted withdrawal request.',
        previous_state={'available_balance': str(avail_snapshot)},
        new_state={
            'available_balance': str(balance.available_balance),
            'withdrawal_processing': str(balance.withdrawal_processing),
            'requested_amount': str(req_amount),
            'status': withdrawal.status,
        },
        ip_address=ip_address,
    )
    AuditLog.objects.create(
        user=actor_user,
        action='WITHDRAWAL_REQUESTED',
        target_model='SellerWithdrawal',
        target_id=str(withdrawal.id),
        details={'request_reference': ref, 'amount': str(req_amount)},
    )
    return withdrawal

