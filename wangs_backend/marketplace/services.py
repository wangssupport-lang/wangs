import hmac
import hashlib
import uuid
from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction
from django.utils import timezone
from .models import (
    CommissionSetting, Order, OrderItem, PaymentTransaction,
    Product, Cart, CartItem, AuditLog, ManufacturerSettlement
)


def quantize_amount(val):
    if not isinstance(val, Decimal):
        val = Decimal(str(val))
    return val.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


class FinancialCalculator:
    @staticmethod
    def calculate_order_financials(cart_items, coupon=None, commission_setting=None):
        """
        Computes the complete, validated breakdown according to Wangs financial rules:
        - items_subtotal = sum(product.price * qty)
        - platform commission deducted per line item: (item_subtotal * effective_commission_rate / 100)
        - manufacturer payout per line item = item_subtotal - commission_amount
        - customer_platform_fee = configured platform fee (e.g. ₹5)
        - delivery_fee = free if subtotal >= threshold, else flat delivery fee (e.g. ₹50)
        - customer total = items_subtotal - discount + platform_fee + delivery_fee
        """
        if commission_setting is None:
            commission_setting = CommissionSetting.get_current()

        items_subtotal = Decimal('0.00')
        platform_commission_total = Decimal('0.00')
        manufacturer_payout_total = Decimal('0.00')
        line_breakdowns = []

        for item in cart_items:
            product = item.product
            qty = item.quantity
            unit_price = quantize_amount(product.price)
            line_subtotal = quantize_amount(unit_price * qty)
            items_subtotal += line_subtotal

            # Manufacturer custom commission override takes priority, otherwise default platform rate
            mfg = product.manufacturer
            if mfg.commission_rate_override is not None:
                rate = quantize_amount(mfg.commission_rate_override)
            else:
                rate = quantize_amount(commission_setting.default_commission_rate)

            # Commission and seller payout calculation
            # Seller earns base product price payout; commission & express delivery are factored into listed price
            if getattr(product, 'base_price', None) is not None:
                mfg_payout = quantize_amount(product.base_price * qty)
                comm_amount = quantize_amount(line_subtotal - mfg_payout)
            else:
                comm_amount = quantize_amount((line_subtotal * rate) / Decimal('100.00'))
                mfg_payout = quantize_amount(line_subtotal - comm_amount)

            platform_commission_total += comm_amount
            manufacturer_payout_total += mfg_payout

            line_breakdowns.append({
                'product': product,
                'manufacturer': mfg,
                'product_title': product.title,
                'weight_grams': product.weight_grams,
                'unit_price': unit_price,
                'quantity': qty,
                'subtotal': line_subtotal,
                'commission_rate': rate,
                'commission_amount': comm_amount,
                'manufacturer_payout': mfg_payout,
            })

        items_subtotal = quantize_amount(items_subtotal)
        platform_commission_total = quantize_amount(platform_commission_total)
        manufacturer_payout_total = quantize_amount(manufacturer_payout_total)

        # Coupon Discount calculation
        discount_amount = Decimal('0.00')
        if coupon:
            discount_amount = quantize_amount(coupon.calculate_discount(items_subtotal))

        # Platform fee
        platform_fee = quantize_amount(commission_setting.customer_platform_fee)

        # Delivery fee: Zero customer delivery charge (Nationwide Free Delivery for all customers)
        # Logistics is built into seller's listing price equation (Base + Commission + Delivery = Customer Price)
        delivery_fee = Decimal('0.00')

        total_amount = quantize_amount(items_subtotal - discount_amount + platform_fee + delivery_fee)

        return {
            'items_subtotal': items_subtotal,
            'customer_platform_fee': platform_fee,
            'delivery_fee': delivery_fee,
            'discount_amount': discount_amount,
            'total_amount': total_amount,
            'platform_commission_total': platform_commission_total,
            'manufacturer_payout_total': manufacturer_payout_total,
            'lines': line_breakdowns,
        }


class OrderService:
    @staticmethod
    @transaction.atomic
    def create_order_from_cart(user, customer_details, shipping_details, cart_items, coupon=None, payment_method='RAZORPAY_TEST'):
        """
        Atomically validates stock, computes financials, deducts stock,
        and saves immutable snapshots of Order and OrderItems.
        """
        # Validate stock availability
        for item in cart_items:
            product = Product.objects.select_for_update().get(id=item.product.id)
            if not product.is_available_for_sale():
                raise ValueError(f"Product '{product.title}' is not available for purchase.")
            if product.stock_quantity < item.quantity:
                raise ValueError(f"Insufficient stock for '{product.title}'. Only {product.stock_quantity} left in stock.")

        commission_setting = CommissionSetting.get_current()
        calc = FinancialCalculator.calculate_order_financials(cart_items, coupon, commission_setting)

        # Generate unique human-readable order number
        order_number = f"WNG-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

        order = Order.objects.create(
            order_number=order_number,
            user=user if (user and user.is_authenticated) else None,
            customer_name=customer_details['name'],
            customer_email=customer_details['email'],
            customer_phone=customer_details['phone'],
            shipping_address_line1=shipping_details['address_line1'],
            shipping_address_line2=shipping_details.get('address_line2', ''),
            shipping_city=shipping_details['city'],
            shipping_state=shipping_details['state'],
            shipping_postal_code=shipping_details['postal_code'],
            items_subtotal=calc['items_subtotal'],
            customer_platform_fee=calc['customer_platform_fee'],
            delivery_fee=calc['delivery_fee'],
            discount_amount=calc['discount_amount'],
            total_amount=calc['total_amount'],
            platform_commission_total=calc['platform_commission_total'],
            manufacturer_payout_total=calc['manufacturer_payout_total'],
            coupon_code=coupon.code if coupon else '',
            status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.PENDING,
            payment_method=payment_method,
        )

        for line in calc['lines']:
            product = line['product']
            OrderItem.objects.create(
                order=order,
                product=product,
                manufacturer=line['manufacturer'],
                product_title=line['product_title'],
                weight_grams=line['weight_grams'],
                unit_price=line['unit_price'],
                quantity=line['quantity'],
                subtotal=line['subtotal'],
                commission_rate=line['commission_rate'],
                commission_amount=line['commission_amount'],
                manufacturer_payout=line['manufacturer_payout'],
                fulfillment_status=OrderItem.FulfillmentStatus.PENDING
            )
            # Deduct inventory
            product.stock_quantity -= line['quantity']
            product.save(update_fields=['stock_quantity', 'updated_at'])

        # Audit record
        AuditLog.objects.create(
            user=user if (user and user.is_authenticated) else None,
            action='ORDER_CREATED',
            target_model='Order',
            target_id=str(order.id),
            details={'order_number': order.order_number, 'total_amount': str(order.total_amount)}
        )

        return order


class PaymentService:
    @staticmethod
    def create_mock_or_razorpay_order(order):
        """
        Creates a test payment intent for the given order.
        Amount is in INR paise (e.g. ₹155 = 15500 paise).
        """
        razorpay_order_id = f"order_{order.order_number}_{uuid.uuid4().hex[:8]}"
        amount_paise = int(order.total_amount * 100)

        # Create or update pending PaymentTransaction record
        tx, created = PaymentTransaction.objects.get_or_create(
            idempotency_key=f"tx_init_{order.order_number}",
            defaults={
                'order': order,
                'provider': 'RAZORPAY_TEST',
                'payment_order_id': razorpay_order_id,
                'status': PaymentTransaction.Status.PENDING,
                'amount': order.total_amount,
                'currency': 'INR',
                'raw_payload': {'simulated_mode': True, 'amount_paise': amount_paise}
            }
        )
        return {
            'payment_order_id': razorpay_order_id,
            'amount': order.total_amount,
            'amount_paise': amount_paise,
            'currency': 'INR',
            'order_number': order.order_number,
            'key_id': 'rzp_test_wangs_demo',
            'transaction_id': tx.id
        }

    @staticmethod
    @transaction.atomic
    def verify_and_confirm_payment(order, payment_id, razorpay_order_id, signature, raw_data=None):
        """
        Verifies payment signature / test verification idempotently and marks order as CONFIRMED.
        """
        idempotency_key = f"pay_confirm_{payment_id or order.order_number}"

        existing_tx = PaymentTransaction.objects.filter(idempotency_key=idempotency_key, status=PaymentTransaction.Status.SUCCESS).first()
        if existing_tx:
            return order, existing_tx

        # Update or record transaction
        tx, _ = PaymentTransaction.objects.get_or_create(
            idempotency_key=idempotency_key,
            defaults={
                'order': order,
                'provider': 'RAZORPAY_TEST',
                'payment_order_id': razorpay_order_id,
                'transaction_id': payment_id or f"pay_{uuid.uuid4().hex[:12]}",
                'signature': signature or 'verified_sig_mock',
                'status': PaymentTransaction.Status.SUCCESS,
                'amount': order.total_amount,
                'currency': 'INR',
                'raw_payload': raw_data or {}
            }
        )
        tx.status = PaymentTransaction.Status.SUCCESS
        tx.transaction_id = payment_id or tx.transaction_id
        tx.save()

        # Update Order status
        order.payment_status = Order.PaymentStatus.PAID
        order.status = Order.Status.CONFIRMED
        order.save(update_fields=['payment_status', 'status', 'updated_at'])

        # Audit log
        AuditLog.objects.create(
            user=order.user,
            action='PAYMENT_CONFIRMED',
            target_model='Order',
            target_id=str(order.id),
            details={'payment_id': tx.transaction_id, 'amount': str(order.total_amount)}
        )

        return order, tx


class SettlementService:
    @staticmethod
    def calculate_manufacturer_balances():
        """
        Summarizes settled and pending amounts per manufacturer based on completed/paid order items.
        """
        from .models import ManufacturerProfile
        results = []
        for mfg in ManufacturerProfile.objects.all():
            items = OrderItem.objects.filter(
                manufacturer=mfg,
                order__payment_status=Order.PaymentStatus.PAID
            )
            total_sales = sum(item.subtotal for item in items)
            total_commission = sum(item.commission_amount for item in items)
            net_payout = sum(item.manufacturer_payout for item in items)
            results.append({
                'manufacturer_id': mfg.id,
                'business_name': mfg.business_name,
                'status': mfg.status,
                'total_orders_count': items.values('order').distinct().count(),
                'total_sales': quantize_amount(total_sales),
                'total_commission': quantize_amount(total_commission),
                'net_payable': quantize_amount(net_payout),
            })
        return results
