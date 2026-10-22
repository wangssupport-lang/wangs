from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from .models import (
    User, CustomerProfile, ManufacturerProfile, Category, Product,
    CommissionSetting, Cart, CartItem, Order, OrderItem, PaymentTransaction, Coupon
)
from .services import FinancialCalculator, OrderService, PaymentService


class WangsFinancialAndOrderTests(TestCase):
    def setUp(self):
        self.comm_setting = CommissionSetting.objects.create(
            default_commission_rate=Decimal('10.00'),
            customer_platform_fee=Decimal('5.00'),
            default_delivery_fee=Decimal('50.00'),
            free_delivery_threshold=Decimal('999.00')
        )

        self.mfg_user = User.objects.create_user(
            username='aunt_arenla', email='aunt@wangs.in', password='password123',
            role=User.Role.MANUFACTURER
        )
        self.mfg_profile = ManufacturerProfile.objects.create(
            user=self.mfg_user,
            business_name="Aunt Arenla's Kitchen",
            slug='aunt-arenlas-kitchen',
            location_district='Kohima',
            contact_email='aunt@wangs.in',
            contact_phone='9436012345',
            business_address='Kohima, Nagaland',
            postal_code='797001',
            status=ManufacturerProfile.Status.APPROVED
        )

        self.cat = Category.objects.create(name='Pork Pickle', slug='pork-pickle')
        self.product = Product.objects.create(
            manufacturer=self.mfg_profile,
            category=self.cat,
            title="Smoked Pork Pickle",
            slug='smoked-pork-pickle',
            short_description="Smoked pork with Raja Mircha",
            description="Full description",
            price=Decimal('100.00'),
            weight_grams=250,
            stock_quantity=20,
            status=Product.Status.APPROVED,
            is_active=True
        )

        self.customer = User.objects.create_user(
            username='cust', email='cust@wangs.in', password='password123',
            role=User.Role.CUSTOMER
        )
        self.client = APIClient()

    def test_section_6_financial_calculation_rules(self):
        """
        Verify exact example from specification:
        Product price: ₹100
        Platform commission: 10% = ₹10
        Manufacturer gross payable: ₹90
        Customer platform fee: ₹5
        Delivery fee: ₹50
        Total paid by customer: ₹155
        """
        cart = Cart.objects.create(user=self.customer)
        item = CartItem.objects.create(cart=cart, product=self.product, quantity=1)

        breakdown = FinancialCalculator.calculate_order_financials([item], commission_setting=self.comm_setting)

        self.assertEqual(breakdown['items_subtotal'], Decimal('100.00'))
        self.assertEqual(breakdown['platform_commission_total'], Decimal('10.00'))
        self.assertEqual(breakdown['manufacturer_payout_total'], Decimal('90.00'))
        self.assertEqual(breakdown['customer_platform_fee'], Decimal('5.00'))
        self.assertEqual(breakdown['delivery_fee'], Decimal('50.00'))
        self.assertEqual(breakdown['total_amount'], Decimal('155.00'))

    def test_manufacturer_commission_override(self):
        """
        If seller has an individual override (e.g. 15%), it must take precedence over default.
        """
        self.mfg_profile.commission_rate_override = Decimal('15.00')
        self.mfg_profile.save()

        cart = Cart.objects.create(user=self.customer)
        item = CartItem.objects.create(cart=cart, product=self.product, quantity=1)

        breakdown = FinancialCalculator.calculate_order_financials([item], commission_setting=self.comm_setting)

        self.assertEqual(breakdown['items_subtotal'], Decimal('100.00'))
        self.assertEqual(breakdown['platform_commission_total'], Decimal('15.00'))
        self.assertEqual(breakdown['manufacturer_payout_total'], Decimal('85.00'))
        self.assertEqual(breakdown['total_amount'], Decimal('155.00'))

    def test_order_creation_deducts_inventory_and_snapshots(self):
        """
        Order creation must deduct product stock and create immutable snapshots of prices & commission.
        """
        initial_stock = self.product.stock_quantity
        cart = Cart.objects.create(user=self.customer)
        item = CartItem.objects.create(cart=cart, product=self.product, quantity=2)

        customer_details = {
            'name': 'Moa Longkumer',
            'email': 'moa@example.com',
            'phone': '9876543210'
        }
        shipping_details = {
            'address_line1': 'Midland',
            'city': 'Dimapur',
            'state': 'Nagaland',
            'postal_code': '797112'
        }

        order = OrderService.create_order_from_cart(
            user=self.customer,
            customer_details=customer_details,
            shipping_details=shipping_details,
            cart_items=[item]
        )

        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, initial_stock - 2)

        order_item = order.items.first()
        self.assertEqual(order_item.unit_price, Decimal('100.00'))
        self.assertEqual(order_item.quantity, 2)
        self.assertEqual(order_item.subtotal, Decimal('200.00'))
        self.assertEqual(order_item.commission_amount, Decimal('20.00'))
        self.assertEqual(order_item.manufacturer_payout, Decimal('180.00'))

        self.assertEqual(order.total_amount, Decimal('255.00'))

    def test_payment_verification_is_idempotent(self):
        """
        Verifying payment multiple times with same reference should be idempotent.
        """
        cart = Cart.objects.create(user=self.customer)
        item = CartItem.objects.create(cart=cart, product=self.product, quantity=1)

        order = OrderService.create_order_from_cart(
            user=self.customer,
            customer_details={'name': 'A', 'email': 'a@a.com', 'phone': '123'},
            shipping_details={'address_line1': 'A', 'city': 'B', 'state': 'C', 'postal_code': '797001'},
            cart_items=[item]
        )

        order, tx1 = PaymentService.verify_and_confirm_payment(
            order, payment_id='pay_test_12345', razorpay_order_id='order_test_999', signature='sig'
        )
        self.assertEqual(order.payment_status, Order.PaymentStatus.PAID)
        self.assertEqual(order.status, Order.Status.CONFIRMED)

        order2, tx2 = PaymentService.verify_and_confirm_payment(
            order, payment_id='pay_test_12345', razorpay_order_id='order_test_999', signature='sig'
        )
        self.assertEqual(tx1.id, tx2.id)

    def test_unapproved_manufacturer_cannot_sell(self):
        """
        New manufacturer products must not be available for sale until approved.
        """
        unapproved_user = User.objects.create_user(username='new_seller', password='password123', role=User.Role.MANUFACTURER)
        unapproved_mfg = ManufacturerProfile.objects.create(
            user=unapproved_user,
            business_name="Unapproved Naga Foods",
            slug='unapproved-naga-foods',
            contact_email='new@foods.in',
            contact_phone='1234567890',
            business_address='Dimapur',
            postal_code='797112',
            status=ManufacturerProfile.Status.PENDING
        )
        unapproved_product = Product.objects.create(
            manufacturer=unapproved_mfg,
            category=self.cat,
            title="Unapproved Chutney",
            slug='unapproved-chutney',
            short_description="...",
            description="...",
            price=Decimal('150.00'),
            weight_grams=200,
            stock_quantity=10,
            status=Product.Status.PENDING,
            is_active=True
        )

        self.assertFalse(unapproved_product.is_available_for_sale())

        response = self.client.get(reverse('product-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_slugs = [p['slug'] for p in response.data.get('results', response.data)]
        self.assertNotIn('unapproved-chutney', returned_slugs)
