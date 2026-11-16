from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Any, Optional
from django.db import transaction
from django.utils import timezone
from ..models import (
    CommissionSetting, Order, OrderItem, ManufacturerProfile,
    Commission, SellerAllocation
)
from .exceptions import CommissionCalculationError


def to_paise(amount: Any) -> int:
    """Converts a Decimal, float, int, or numeric string to integer paise."""
    if amount is None:
        return 0
    if not isinstance(amount, Decimal):
        amount = Decimal(str(amount))
    return int((amount * Decimal('100.00')).quantize(Decimal('1'), rounding=ROUND_HALF_UP))


def to_rupees(paise: int) -> Decimal:
    """Converts integer paise back to a 2-decimal place rupee Decimal."""
    return (Decimal(paise) / Decimal('100.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


class CommissionEngine:
    """
    Reusable Backend Commission Calculation Engine for Wangs.in Marketplace.
    
    Guarantees:
    - Accurate Integer Paise Arithmetic (eliminates floating-point issues).
    - Support for Multi-Vendor Orders (seller-wise item isolation).
    - Configurable Platform Default Rate (10.00% standard).
    - Custom Seller Overrides (ManufacturerProfile.commission_rate_override).
    - Strict Exclusion of Delivery Fees, Gateway Charges, and Customer Platform Fees.
    - Snapshot immutability: commission rate and calculations are stored permanently.
    - Full support for B2C and B2B orders.
    """

    @classmethod
    def get_effective_commission_rate(cls, seller: ManufacturerProfile, is_b2b: bool = False) -> Decimal:
        """
        Determines the effective commission rate for a seller.
        Priority:
        1. Seller-specific custom rate override.
        2. Platform default setting (default: 10.00%).
        """
        if seller.commission_rate_override is not None:
            return seller.commission_rate_override.quantize(Decimal('0.01'))
        setting = CommissionSetting.get_current()
        return setting.default_commission_rate.quantize(Decimal('0.01'))

    @classmethod
    def calculate_seller_commission(
        cls,
        seller: ManufacturerProfile,
        subtotal_paise: int,
        commission_rate: Optional[Decimal] = None,
        is_b2b: bool = False
    ) -> Dict[str, Any]:
        """
        Calculates commission and seller payout for a single seller in integer paise.
        """
        if subtotal_paise < 0:
            raise CommissionCalculationError(f"Subtotal cannot be negative: {subtotal_paise}")

        if commission_rate is None:
            commission_rate = cls.get_effective_commission_rate(seller, is_b2b=is_b2b)

        # Integer paise calculation: (subtotal_paise * rate) / 100
        rate_decimal = commission_rate / Decimal('100.00')
        comm_paise = int((Decimal(subtotal_paise) * rate_decimal).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
        
        # Ensure commission does not exceed subtotal
        comm_paise = min(comm_paise, subtotal_paise)
        seller_payable_paise = subtotal_paise - comm_paise

        return {
            'seller_id': seller.id,
            'business_name': seller.business_name,
            'commission_rate': commission_rate,
            'product_subtotal_paise': subtotal_paise,
            'product_subtotal': to_rupees(subtotal_paise),
            'commission_amount_paise': comm_paise,
            'commission_amount': to_rupees(comm_paise),
            'seller_payable_paise': seller_payable_paise,
            'seller_payable_amount': to_rupees(seller_payable_paise),
            'is_b2b': is_b2b,
        }

    @classmethod
    def calculate_order_commissions(cls, order: Order) -> List[Dict[str, Any]]:
        """
        Groups order items by manufacturer/seller and calculates commission breakdown for each.
        Excludes delivery fees, customer platform fees, and logistics fees.
        """
        items = order.items.all().select_related('manufacturer', 'product')
        is_b2b = getattr(order, 'is_b2b', False)

        # Partition line items by seller
        seller_buckets: Dict[int, Dict[str, Any]] = {}
        for item in items:
            seller = item.manufacturer
            if not seller:
                continue

            item_subtotal_paise = to_paise(item.subtotal)
            if seller.id not in seller_buckets:
                seller_buckets[seller.id] = {
                    'seller': seller,
                    'subtotal_paise': 0,
                    'items': [],
                }
            seller_buckets[seller.id]['subtotal_paise'] += item_subtotal_paise
            seller_buckets[seller.id]['items'].append(item)

        results = []
        for seller_id, bucket in seller_buckets.items():
            seller = bucket['seller']
            subtotal_paise = bucket['subtotal_paise']
            calc = cls.calculate_seller_commission(seller, subtotal_paise, is_b2b=is_b2b)
            calc['seller_instance'] = seller
            calc['item_count'] = len(bucket['items'])
            results.append(calc)

        return results

    @classmethod
    @transaction.atomic
    def snapshot_order_commissions_and_allocations(cls, order: Order) -> List[Commission]:
        """
        Creates immutable Commission snapshot and SellerAllocation records in the database.
        Idempotent: if already created for this order, existing records are returned.
        """
        existing_commissions = list(order.commissions.all())
        if existing_commissions:
            return existing_commissions

        breakdowns = cls.calculate_order_commissions(order)
        created_commissions = []

        for b in breakdowns:
            seller = b['seller_instance']
            comm = Commission.objects.create(
                order=order,
                seller=seller,
                product_subtotal=b['product_subtotal'],
                product_subtotal_paise=b['product_subtotal_paise'],
                commission_percentage=b['commission_rate'],
                commission_amount=b['commission_amount'],
                commission_amount_paise=b['commission_amount_paise'],
                seller_payable_amount=b['seller_payable_amount'],
                seller_payable_paise=b['seller_payable_paise'],
                is_b2b=b['is_b2b'],
                metadata={
                    'item_count': b['item_count'],
                    'order_number': order.order_number,
                }
            )
            created_commissions.append(comm)

            # Create or get SellerAllocation in PENDING status
            SellerAllocation.objects.get_or_create(
                order=order,
                seller=seller,
                defaults={
                    'gross_allocated_amount': b['product_subtotal'],
                    'gross_allocated_paise': b['product_subtotal_paise'],
                    'commission_deducted': b['commission_amount'],
                    'commission_deducted_paise': b['commission_amount_paise'],
                    'net_seller_amount': b['seller_payable_amount'],
                    'net_seller_paise': b['seller_payable_paise'],
                    'transfer_status': SellerAllocation.TransferStatus.PENDING,
                    'notes': f"Allocation pending settlement release. Commission snapshot: {b['commission_rate']}%"
                }
            )

        return created_commissions
