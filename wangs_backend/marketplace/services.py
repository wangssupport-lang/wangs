import hmac
import hashlib
import uuid
import secrets
import io
import base64
import qrcode
from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction
from django.utils import timezone
from .models import (
    CommissionSetting, Order, OrderItem, PaymentTransaction,
    Product, Cart, CartItem, AuditLog, ManufacturerSettlement,
    RewardSettings, CustomerRewardWallet, OrderUnit, ProductQRCode,
    DeliveryConfirmation, RewardTransaction, SuspiciousScanLog
)


def quantize_amount(val):
    if not isinstance(val, Decimal):
        val = Decimal(str(val))
    return val.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


class FinancialCalculator:
    @staticmethod
    def calculate_order_financials(cart_items, coupon=None, commission_setting=None, shipping_details=None, requested_method=None):
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

        # Delivery fee calculation via DeliveryCalculator if destination provided
        shipping_quote = None
        delivery_fee = Decimal('0.00')
        if shipping_details and shipping_details.get('postal_code'):
            from .delivery_service import DeliveryCalculator
            shipping_quote = DeliveryCalculator.calculate_delivery_quote(
                cart_items=cart_items,
                postal_code=shipping_details.get('postal_code'),
                city=shipping_details.get('city', ''),
                state=shipping_details.get('state', ''),
                requested_method=requested_method
            )
            if not shipping_quote['is_deliverable']:
                raise ValueError(shipping_quote.get('error_message') or 'Delivery not available for this location')
            delivery_fee = quantize_amount(Decimal(str(shipping_quote['total_delivery_fee'])))

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
            'shipping_quote': shipping_quote,
        }


class OrderService:
    @staticmethod
    @transaction.atomic
    def create_order_from_cart(user, customer_details, shipping_details, cart_items, coupon=None, payment_method='RAZORPAY_TEST', credits_to_redeem=0, requested_method=None):
        """
        Atomically validates stock, computes financials, applies Wangs Rewards credits,
        deducts stock, saves immutable snapshots of Order and OrderItems, and generates
        unique OrderUnits and ProductQRCodes for every individual item unit.
        """
        # Validate stock availability
        for item in cart_items:
            product = Product.objects.select_for_update().get(id=item.product.id)
            if not product.is_available_for_sale():
                raise ValueError(f"Product '{product.title}' is not available for purchase.")
            if product.stock_quantity < item.quantity:
                raise ValueError(f"Insufficient stock for '{product.title}'. Only {product.stock_quantity} left in stock.")

        commission_setting = CommissionSetting.get_current()
        calc = FinancialCalculator.calculate_order_financials(
            cart_items=cart_items,
            coupon=coupon,
            commission_setting=commission_setting,
            shipping_details=shipping_details,
            requested_method=requested_method or shipping_details.get('delivery_method')
        )

        shipping_quote = calc.get('shipping_quote') or {}
        breakdown_items = shipping_quote.get('fulfillment_breakdown') or []
        primary_courier = breakdown_items[0].get('courier_name') if breakdown_items else 'SwiftZone Express'
        applied_rate_id = breakdown_items[0].get('rate_id') if breakdown_items else None
        estimated_delivery = shipping_quote.get('estimated_delivery') or '1–2 Business Days'
        package_count = shipping_quote.get('total_packages', 1)
        selected_method_name = shipping_details.get('delivery_method') or (breakdown_items[0].get('delivery_method_display') if breakdown_items else 'Standard Delivery')

        # Wangs Rewards: Credit Redemption at checkout
        credit_discount = Decimal('0.00')
        actual_credits_redeemed = 0
        wallet = None
        if credits_to_redeem and int(credits_to_redeem) > 0 and user and user.is_authenticated:
            reward_settings = RewardSettings.get_settings()
            if reward_settings.is_enabled:
                wallet, _ = CustomerRewardWallet.objects.select_for_update().get_or_create(user=user)
                max_rupees_discount = (calc['total_amount'] * Decimal(str(reward_settings.max_redemption_percentage))) / Decimal('100.00')
                max_credits_from_total = int(max_rupees_discount / reward_settings.credit_value_rupees)

                max_redeemable = max(0, min(wallet.balance, reward_settings.max_credits_per_order, max_credits_from_total))
                actual_credits_redeemed = min(int(credits_to_redeem), max_redeemable)

                if actual_credits_redeemed > 0:
                    credit_discount = quantize_amount(Decimal(str(actual_credits_redeemed)) * reward_settings.credit_value_rupees)
                    wallet.balance -= actual_credits_redeemed
                    wallet.total_redeemed += actual_credits_redeemed
                    wallet.save(update_fields=['balance', 'total_redeemed', 'updated_at'])

        # Generate unique human-readable order number
        order_number = f"WNG-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

        final_total = max(Decimal('0.00'), calc['total_amount'] - credit_discount)

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
            credits_redeemed=actual_credits_redeemed,
            credit_discount_amount=credit_discount,
            total_amount=final_total,
            platform_commission_total=calc['platform_commission_total'],
            manufacturer_payout_total=calc['manufacturer_payout_total'],
            coupon_code=coupon.code if coupon else '',
            status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.PENDING,
            payment_method=payment_method,
            courier_partner=primary_courier,
            shipping_rate_id=applied_rate_id,
            shipping_delivery_method=selected_method_name,
            shipping_estimated_delivery=estimated_delivery,
            shipping_package_count=package_count,
            shipping_breakdown=shipping_quote,
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

        # Record reward redemption transaction
        if actual_credits_redeemed > 0 and wallet:
            RewardTransaction.objects.create(
                wallet=wallet,
                user=user,
                transaction_type=RewardTransaction.Type.REDEEM,
                credits=-actual_credits_redeemed,
                balance_after=wallet.balance,
                order=order,
                description=f"Redeemed {actual_credits_redeemed} Wangs Credits at checkout (Saved ₹{credit_discount})",
                performed_by=user
            )

        # Audit record
        AuditLog.objects.create(
            user=user if (user and user.is_authenticated) else None,
            action='ORDER_CREATED',
            target_model='Order',
            target_id=str(order.id),
            details={
                'order_number': order.order_number,
                'total_amount': str(order.total_amount),
                'credits_redeemed': actual_credits_redeemed,
                'credit_discount': str(credit_discount)
            }
        )

        # Automatically generate OrderUnits and cryptographically secure ProductQRCodes for every unit
        RewardService.ensure_order_units_and_qrs(order)

        # Notify each manufacturer of their particular ordered product(s) upon order creation
        try:
            from .resend_service import send_order_notifications_to_manufacturers
            send_order_notifications_to_manufacturers(order)
        except Exception as exc:
            import logging
            logging.getLogger('marketplace.orders').warning("Could not dispatch manufacturer order notifications upon creation: %s", exc)

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

        # Notify each manufacturer of their particular product(s) ordered
        try:
            from .resend_service import send_order_notifications_to_manufacturers
            send_order_notifications_to_manufacturers(order)
        except Exception as exc:
            import logging
            logging.getLogger('marketplace.orders').warning("Could not dispatch manufacturer order notifications: %s", exc)

        return order, tx


class SettlementService:
    @staticmethod
    def calculate_manufacturer_balances():
        """
        Summarizes settled and pending amounts per manufacturer based on completed/paid order items.
        Optimized with single grouped aggregation to avoid N+1 query overhead.
        """
        from django.db.models import Sum, Count
        from .models import ManufacturerProfile

        paid_items = OrderItem.objects.filter(
            order__payment_status=Order.PaymentStatus.PAID
        ).values('manufacturer').annotate(
            total_sales=Sum('subtotal'),
            total_commission=Sum('commission_amount'),
            net_payout=Sum('manufacturer_payout'),
            total_orders=Count('order', distinct=True)
        )
        stats_by_mfg = {item['manufacturer']: item for item in paid_items}

        results = []
        for mfg in ManufacturerProfile.objects.all():
            stats = stats_by_mfg.get(mfg.id, {})
            results.append({
                'manufacturer_id': mfg.id,
                'business_name': mfg.business_name,
                'status': mfg.status,
                'total_orders_count': stats.get('total_orders', 0),
                'total_sales': quantize_amount(stats.get('total_sales') or Decimal('0.00')),
                'total_commission': quantize_amount(stats.get('total_commission') or Decimal('0.00')),
                'net_payable': quantize_amount(stats.get('net_payout') or Decimal('0.00')),
            })
        return results


# -------------------------------------------------------------
# WANGS REWARDS SERVICE: QR DELIVERY CONFIRMATION & WALLET ENGINE
# -------------------------------------------------------------

class RewardService:
    @staticmethod
    def ensure_order_units_and_qrs(order):
        """
        Idempotently generates unique OrderUnits and ProductQRCodes for every unit
        in the order.
        """
        units_created = []
        for item in order.items.all():
            for idx in range(1, item.quantity + 1):
                clean_order_suffix = order.order_number.replace('-', '')[-6:]
                unit_uid = f"WNG-U-{clean_order_suffix}-{item.id}-{idx}"
                unit, created = OrderUnit.objects.get_or_create(
                    order_item=item,
                    unit_index=idx,
                    defaults={
                        'unit_uid': unit_uid,
                        'order': order,
                        'product': item.product,
                        'customer': order.user,
                        'product_title': item.product_title,
                        'weight_grams': item.weight_grams,
                        'status': OrderUnit.Status.PENDING,
                        'is_delivered': False,
                        'reward_awarded': False,
                    }
                )
                if not hasattr(unit, 'qr_code') or not ProductQRCode.objects.filter(unit=unit).exists():
                    token = f"WNG-QR-{secrets.token_urlsafe(16)}"
                    while ProductQRCode.objects.filter(token=token).exists():
                        token = f"WNG-QR-{secrets.token_urlsafe(16)}"
                    ProductQRCode.objects.create(
                        unit=unit,
                        token=token
                    )
                units_created.append(unit)
        return units_created

    @staticmethod
    def generate_qr_data_url(token):
        """
        Generates a standalone base64 PNG data URL for packaging QR label printing.
        """
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=2,
        )
        qr.add_data(f"https://wangs.in/rewards/scan?token={token}")
        qr.make(fit=True)
        img = qr.make_image(fill_color="#1e1b18", back_color="#ffffff")
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        img_str = base64.b64encode(buffer.getvalue()).decode()
        return f"data:image/png;base64,{img_str}"

    @staticmethod
    @transaction.atomic
    def confirm_delivery_and_award_reward(unit_id_or_instance, source, confirmed_by_user=None, courier_name='', ip_address=None, user_agent='', notes=''):
        """
        Two independent delivery confirmation methods:
        A. Customer QR scan
        B. Courier confirmation
        Delivery confirmation by either method is sufficient to award 1 Wangs Credit.
        If both happen, maintains both confirmation records without double-awarding credits.
        Uses select_for_update() row-level locking for strict concurrency protection.
        """
        unit_id = unit_id_or_instance.id if hasattr(unit_id_or_instance, 'id') else unit_id_or_instance
        unit = OrderUnit.objects.select_for_update().get(id=unit_id)
        order = unit.order

        # 1. Record DeliveryConfirmation
        DeliveryConfirmation.objects.create(
            unit=unit,
            confirmation_source=source,
            confirmed_by_user=confirmed_by_user if (confirmed_by_user and confirmed_by_user.is_authenticated) else None,
            confirmed_by_courier_name=courier_name or getattr(confirmed_by_user, 'first_name', '') or str(confirmed_by_user or ''),
            ip_address=ip_address,
            user_agent=user_agent,
            notes=notes
        )

        # 2. Mark Unit as Delivered
        unit.is_delivered = True
        unit.status = OrderUnit.Status.DELIVERED
        if not unit.delivered_at:
            unit.delivered_at = timezone.now()

        # Update order item and order fulfillment if all units delivered
        all_units = order.units.all()
        if all_units.exists() and all(u.is_delivered for u in all_units):
            was_already_delivered = (order.status == Order.Status.DELIVERED)
            order.status = Order.Status.DELIVERED
            order.save(update_fields=['status', 'updated_at'])
            order.items.all().update(fulfillment_status=OrderItem.FulfillmentStatus.DELIVERED)

            if not was_already_delivered:
                try:
                    from .resend_service import send_customer_delivery_status_email
                    send_customer_delivery_status_email(order=order, status='DELIVERED')
                except Exception as mail_exc:
                    logger.warning("Could not dispatch customer delivered email: %s", mail_exc)

        # 3. Determine the target customer user to receive the credits
        if source == DeliveryConfirmation.Source.COURIER:
            target_customer = order.user or unit.customer
        else:
            target_customer = order.user or unit.customer or (confirmed_by_user if (confirmed_by_user and confirmed_by_user.is_authenticated) else None)

        if not target_customer and order.customer_email:
            target_customer = User.objects.filter(email__iexact=order.customer_email.strip()).first()
        if not target_customer and order.customer_phone:
            clean_phone = re.sub(r'\D', '', str(order.customer_phone))[-10:]
            if len(clean_phone) >= 10:
                target_customer = User.objects.filter(phone_number__endswith=clean_phone).first()

        if source == DeliveryConfirmation.Source.CUSTOMER_QR and hasattr(unit, 'qr_code'):
            qr = unit.qr_code
            if not qr.is_claimed:
                qr.is_claimed = True
                qr.claimed_at = timezone.now()
                qr.claimed_by = target_customer
                qr.save(update_fields=['is_claimed', 'claimed_at', 'claimed_by'])

        # 4. Check if reward was already awarded and credited
        has_earned_transaction = RewardTransaction.objects.filter(
            unit=unit,
            transaction_type=RewardTransaction.Type.EARN
        ).exists()

        if (unit.reward_awarded and has_earned_transaction) or (hasattr(unit, 'qr_code') and unit.qr_code.is_claimed and has_earned_transaction):
            unit.save(update_fields=['is_delivered', 'status', 'delivered_at'])
            wallet = None
            if target_customer:
                wallet = CustomerRewardWallet.objects.filter(user=target_customer).first()
            return {
                'success': True,
                'already_claimed': True,
                'reward_awarded': False,
                'credits_awarded': 0,
                'current_balance': wallet.balance if wallet else 0,
                'message': 'This QR code has already been used. Rewards have already been claimed.',
                'product_name': unit.product_title,
                'order_number': order.order_number,
                'unit_uid': unit.unit_uid,
                'confirmation_source': unit.get_confirmation_source_display()
            }

        # 5. Check order payment status & cancellation rules
        # "Do not award credits for cancelled, unpaid, or failed orders."
        if order.status in [Order.Status.CANCELLED, Order.Status.REFUNDED] or order.payment_status in [Order.PaymentStatus.FAILED, Order.PaymentStatus.REFUNDED]:
            unit.save(update_fields=['is_delivered', 'status', 'delivered_at'])
            return {
                'success': True,
                'already_claimed': False,
                'reward_awarded': False,
                'credits_awarded': 0,
                'current_balance': 0,
                'message': 'Delivery confirmed, but rewards cannot be awarded for cancelled or refunded orders.',
                'product_name': unit.product_title,
                'order_number': order.order_number,
                'unit_uid': unit.unit_uid,
                'confirmation_source': unit.get_confirmation_source_display()
            }

        # 6. Check Rewards Program settings
        reward_settings = RewardSettings.get_settings()
        if not reward_settings.is_enabled:
            unit.save(update_fields=['is_delivered', 'status', 'delivered_at'])
            return {
                'success': True,
                'already_claimed': False,
                'reward_awarded': False,
                'credits_awarded': 0,
                'current_balance': 0,
                'message': 'Delivery confirmed. The rewards program is currently inactive.',
                'product_name': unit.product_title,
                'order_number': order.order_number,
                'unit_uid': unit.unit_uid,
                'confirmation_source': unit.get_confirmation_source_display()
            }

        # 7. Award 1 Wangs Credit to Customer Wallet
        credits_to_award = reward_settings.credits_per_unit or 1
        new_balance = 0

        if target_customer:
            # Associate order and unit if guest checkout
            if not order.user:
                order.user = target_customer
                order.save(update_fields=['user', 'updated_at'])
            if not unit.customer:
                unit.customer = target_customer
                unit.save(update_fields=['customer'])

            wallet, _ = CustomerRewardWallet.objects.select_for_update().get_or_create(user=target_customer)
            wallet.balance += credits_to_award
            wallet.total_earned += credits_to_award
            wallet.save(update_fields=['balance', 'total_earned', 'updated_at'])
            new_balance = wallet.balance

            # Maintain immutable transaction history
            RewardTransaction.objects.create(
                wallet=wallet,
                user=target_customer,
                transaction_type=RewardTransaction.Type.EARN,
                credits=credits_to_award,
                balance_after=new_balance,
                unit=unit,
                order=order,
                description=f"Earned {credits_to_award} Wangs Credit for delivered {unit.product_title} (Unit #{unit.unit_index})",
                performed_by=confirmed_by_user
            )

            unit.reward_awarded = True
            unit.reward_awarded_at = timezone.now()

            if hasattr(unit, 'qr_code'):
                qr = unit.qr_code
                qr.is_claimed = True
                qr.claimed_at = timezone.now()
                qr.claimed_by = target_customer
                qr.save(update_fields=['is_claimed', 'claimed_at', 'claimed_by'])

        unit.save(update_fields=['is_delivered', 'status', 'delivered_at', 'reward_awarded', 'reward_awarded_at'])

        # If all units in this order are delivered, set order status to DELIVERED
        if not order.units.exclude(id=unit.id).filter(is_delivered=False).exists():
            if order.status != Order.Status.DELIVERED:
                order.status = Order.Status.DELIVERED
                order.save(update_fields=['status', 'updated_at'])

        return {
            'success': True,
            'already_claimed': False,
            'reward_awarded': True,
            'credits_awarded': credits_to_award,
            'current_balance': new_balance,
            'message': f"Congratulations! Your product delivery is confirmed. You earned {credits_to_award} Wangs Credit!",
            'product_name': unit.product_title,
            'order_number': order.order_number,
            'unit_uid': unit.unit_uid,
            'confirmation_source': unit.get_confirmation_source_display()
        }

    @staticmethod
    @transaction.atomic
    def verify_and_claim_customer_qr(token, customer_user, ip_address=None, user_agent=''):
        """
        Validates token or order unboxing link, checks if revoked, verifies ownership against
        the logged-in customer, and triggers delivery confirmation and reward awarding.
        Accepts:
        - Direct unit QR token: WNG-QR-xxxx
        - URL with token parameter: https://wangs.in/rewards/scan?token=xxxx
        - URL with unboxing parameter: https://wangs.in/account?unboxing=WNG-xxxx
        - URL with order parameter: https://wangs.in/delivery?order=WNG-xxxx
        - Order number: WNG-20261111-xxxx
        - Unit UID: WNG-U-xxxx
        """
        import re
        clean_input = (token or '').strip()
        if not clean_input:
            raise ValueError("QR code token or scanned link is required.")

        clean_token = clean_input
        if 'token=' in clean_input:
            clean_token = clean_input.split('token=')[-1].split('&')[0].strip()

        # 1. Match direct ProductQRCode token
        qr = ProductQRCode.objects.select_related('unit', 'unit__order', 'unit__customer').filter(token=clean_token).first()

        # 2. If not found by direct token, check for Order Number or unboxing/order link
        if not qr:
            order_number = ''
            if 'unboxing=' in clean_input:
                order_number = clean_input.split('unboxing=')[-1].split('&')[0].strip()
            elif 'order=' in clean_input:
                order_number = clean_input.split('order=')[-1].split('&')[0].strip()
            else:
                m = re.search(r'(WNG-\d{8}-[A-Za-z0-9]+)', clean_input, re.IGNORECASE)
                if m:
                    order_number = m.group(1).upper()

            if order_number:
                order = Order.objects.filter(order_number__iexact=order_number).first()
                if order:
                    RewardService.ensure_order_units_and_qrs(order)

                    # Check if unboxing reward has already been claimed and credited for this order
                    has_order_reward_tx = RewardTransaction.objects.filter(order=order, transaction_type=RewardTransaction.Type.EARN).exists()

                    if has_order_reward_tx:
                        claimed_unit = order.units.filter(qr_code__is_claimed=True).first() or order.units.first()
                        wallet = CustomerRewardWallet.objects.filter(user=customer_user).first() if (customer_user and customer_user.is_authenticated) else None
                        return {
                            'success': True,
                            'already_claimed': True,
                            'reward_awarded': False,
                            'credits_awarded': 0,
                            'current_balance': wallet.balance if wallet else 0,
                            'message': 'This parcel QR code has already been scanned and redeemed. Each parcel QR code can only be claimed once.',
                            'product_name': claimed_unit.product_title if claimed_unit else 'Order Parcel',
                            'order_number': order.order_number,
                            'unit_uid': claimed_unit.unit_uid if claimed_unit else '',
                            'confirmation_source': 'Customer QR Scan'
                        }

                    # Find first unclaimed unit to claim
                    unclaimed_unit = order.units.select_related('qr_code', 'order', 'customer').filter(qr_code__is_claimed=False).first()
                    if not unclaimed_unit:
                        unclaimed_unit = order.units.select_related('qr_code', 'order', 'customer').first()
                    if unclaimed_unit and hasattr(unclaimed_unit, 'qr_code'):
                        qr = unclaimed_unit.qr_code

        # 3. If still not found, check for unit UID (WNG-U-...)
        if not qr and 'WNG-U-' in clean_input.upper():
            m = re.search(r'(WNG-U-[A-Za-z0-9\-]+)', clean_input, re.IGNORECASE)
            if m:
                unit_uid = m.group(1).upper()
                unit = OrderUnit.objects.select_related('qr_code', 'order', 'customer').filter(unit_uid__iexact=unit_uid).first()
                if unit and hasattr(unit, 'qr_code'):
                    qr = unit.qr_code

        if not qr:
            SuspiciousScanLog.objects.create(
                token_attempted=clean_input[:100],
                user=customer_user if (customer_user and customer_user.is_authenticated) else None,
                ip_address=ip_address,
                user_agent=user_agent,
                reason="Non-existent QR token or order identifier scanned"
            )
            raise ValueError("Invalid QR code or order link. This code does not match any product in the Wangs registry.")

        if qr.is_revoked:
            SuspiciousScanLog.objects.create(
                token_attempted=clean_input[:100],
                user=customer_user if (customer_user and customer_user.is_authenticated) else None,
                ip_address=ip_address,
                user_agent=user_agent,
                reason=f"Revoked QR token scanned: {qr.revoked_reason}"
            )
            raise ValueError(f"This QR code has been revoked. Reason: {qr.revoked_reason or 'Invalidated by administration'}.")

        unit = qr.unit
        order = unit.order

        # If direct token was already claimed and credited, prevent reuse immediately
        if qr.is_claimed and RewardTransaction.objects.filter(unit=unit, transaction_type=RewardTransaction.Type.EARN).exists():
            wallet = CustomerRewardWallet.objects.filter(user=customer_user).first() if (customer_user and customer_user.is_authenticated) else None
            return {
                'success': True,
                'already_claimed': True,
                'reward_awarded': False,
                'credits_awarded': 0,
                'current_balance': wallet.balance if wallet else 0,
                'message': 'This QR code has already been used. Rewards have already been claimed.',
                'product_name': unit.product_title,
                'order_number': order.order_number,
                'unit_uid': unit.unit_uid,
                'confirmation_source': unit.get_confirmation_source_display()
            }

        # Ownership verification with robust phone/email/guest matching
        def normalize_phone_num(p):
            if not p:
                return ''
            digits = re.sub(r'\D', '', str(p))
            return digits[-10:] if len(digits) >= 10 else digits

        is_owner = False
        if customer_user and customer_user.is_authenticated:
            if unit.customer_id == customer_user.id or order.user_id == customer_user.id:
                is_owner = True
            elif order.customer_email and customer_user.email and order.customer_email.strip().lower() == customer_user.email.strip().lower():
                is_owner = True
            elif order.customer_phone and getattr(customer_user, 'phone_number', None) and normalize_phone_num(order.customer_phone) == normalize_phone_num(customer_user.phone_number):
                is_owner = True
            elif customer_user.is_superuser or getattr(customer_user, 'role', '') == 'ADMIN':
                is_owner = True
            elif order.user_id is None:
                # Guest order being claimed by authenticated customer
                is_owner = True
                order.user = customer_user
                order.save(update_fields=['user', 'updated_at'])
                unit.customer = customer_user
                unit.save(update_fields=['customer'])

        if not is_owner:
            SuspiciousScanLog.objects.create(
                token_attempted=clean_input[:100],
                user=customer_user if (customer_user and customer_user.is_authenticated) else None,
                ip_address=ip_address,
                user_agent=user_agent,
                reason=f"Unauthorized scan: User #{customer_user.id if customer_user else 'Anon'} attempted to claim unit #{unit.id}"
            )
            raise PermissionError("This QR code belongs to a product purchased by another customer. Rewards can only be claimed by the purchasing account.")

        return RewardService.confirm_delivery_and_award_reward(
            unit_id_or_instance=unit,
            source=DeliveryConfirmation.Source.CUSTOMER_QR,
            confirmed_by_user=customer_user,
            ip_address=ip_address,
            user_agent=user_agent
        )

    @staticmethod
    @transaction.atomic
    def confirm_courier_delivery(order_identifier, courier_user=None, courier_name='', unit_ids=None, ip_address=None, user_agent='', notes=''):
        """
        Courier marks delivery for an entire order or specific product units.
        Enforces courier assignment check:
        'Do not allow couriers to confirm deliveries for orders that are not assigned to them
        unless an authorized administrator permits it.'
        """
        order = Order.objects.filter(order_number__iexact=order_identifier).first()
        if not order:
            order = Order.objects.filter(tracking_number__iexact=order_identifier).first()
        if not order:
            raise ValueError(f"Order '{order_identifier}' not found.")

        # Courier assignment check
        is_admin = courier_user and (courier_user.is_staff or getattr(courier_user, 'role', '') == 'ADMIN')
        if not is_admin and courier_user and getattr(courier_user, 'role', '') == 'COURIER':
            if order.assigned_courier_id and order.assigned_courier_id != courier_user.id:
                raise PermissionError("This parcel is assigned to another delivery agent. You cannot confirm this delivery.")

        # Ensure units exist
        RewardService.ensure_order_units_and_qrs(order)

        target_units = order.units.all()
        if unit_ids:
            target_units = target_units.filter(id__in=unit_ids)

        results = []
        for unit in target_units:
            res = RewardService.confirm_delivery_and_award_reward(
                unit_id_or_instance=unit,
                source=DeliveryConfirmation.Source.COURIER,
                confirmed_by_user=courier_user,
                courier_name=courier_name or getattr(courier_user, 'first_name', '') or 'Courier Fleet',
                ip_address=ip_address,
                user_agent=user_agent,
                notes=notes
            )
            results.append(res)

        return {
            'order_number': order.order_number,
            'total_units_confirmed': len(results),
            'units': results
        }

    @staticmethod
    @transaction.atomic
    def admin_adjust_balance(admin_user, target_user, delta_credits, audit_reason):
        """
        Allows administrator to manually correct rewards balance with required audit reason.
        """
        if not audit_reason or not audit_reason.strip():
            raise ValueError("An audit reason is strictly required for manual balance adjustments.")

        wallet, _ = CustomerRewardWallet.objects.select_for_update().get_or_create(user=target_user)
        new_balance = max(0, wallet.balance + delta_credits)
        actual_delta = new_balance - wallet.balance

        wallet.balance = new_balance
        if actual_delta > 0:
            wallet.total_earned += actual_delta
        wallet.save(update_fields=['balance', 'total_earned', 'updated_at'])

        RewardTransaction.objects.create(
            wallet=wallet,
            user=target_user,
            transaction_type=RewardTransaction.Type.ADMIN_ADJUSTMENT,
            credits=actual_delta,
            balance_after=new_balance,
            description=f"Manual Admin Adjustment: {actual_delta:+d} credits",
            performed_by=admin_user,
            audit_reason=audit_reason.strip()
        )

        AuditLog.objects.create(
            user=admin_user,
            action='REWARDS_BALANCE_ADJUSTMENT',
            target_model='CustomerRewardWallet',
            target_id=str(wallet.id),
            details={
                'target_user': target_user.username,
                'delta': actual_delta,
                'new_balance': new_balance,
                'reason': audit_reason.strip()
            }
        )

        return wallet

    @staticmethod
    @transaction.atomic
    def admin_revoke_qr(admin_user, qr_id, reason):
        """
        Revokes an unused QR code.
        """
        qr = ProductQRCode.objects.select_for_update().get(id=qr_id)
        if qr.is_claimed:
            raise ValueError("Cannot revoke a QR code that has already been claimed by a customer.")

        qr.is_revoked = True
        qr.revoked_reason = reason.strip() or 'Revoked by administrator'
        qr.revoked_at = timezone.now()
        qr.save(update_fields=['is_revoked', 'revoked_reason', 'revoked_at'])

        AuditLog.objects.create(
            user=admin_user,
            action='QR_REVOKED',
            target_model='ProductQRCode',
            target_id=str(qr.id),
            details={'token': qr.token, 'reason': qr.revoked_reason}
        )
        return qr
