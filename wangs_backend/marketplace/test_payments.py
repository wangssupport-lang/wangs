import uuid
import hashlib
from decimal import Decimal
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from marketplace.models import (
    User, ManufacturerProfile, Category, Product, Order, OrderItem,
    CommissionSetting, Payment, SellerPaymentProfile, Commission,
    SellerAllocation, Settlement, WebhookEvent, Refund
)
from marketplace.payments import (
    MarketplacePaymentService,
    CommissionEngine,
    to_paise,
    to_rupees,
    PaymentVerificationError,
    WebhookSignatureError,
    PaymentProviderFeatureNotActiveError,
    IdempotencyError
)
from marketplace.payments.adapters.payu import PayUAdapter
from marketplace.payments.adapters.mock import MockPaymentAdapter


class MarketplacePaymentInfrastructureTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Platform default commission: 10.00%
        self.commission_setting = CommissionSetting.objects.create(
            default_commission_rate=Decimal('10.00'),
            customer_platform_fee=Decimal('5.00'),
            default_delivery_fee=Decimal('50.00'),
            free_delivery_threshold=Decimal('999.00')
        )

        # Users
        self.admin_user = User.objects.create_superuser(
            username='admin_pay', email='admin@wangs.in', password='adminpassword', role=User.Role.ADMIN
        )
        self.customer_user = User.objects.create_user(
            username='shopper_pay', email='shopper@wangs.in', password='userpassword', role=User.Role.CUSTOMER
        )
        self.seller_user_a = User.objects.create_user(
            username='artisan_a', email='seller_a@wangs.in', password='sellerpassword', role=User.Role.MANUFACTURER
        )
        self.seller_user_b = User.objects.create_user(
            username='artisan_b', email='seller_b@wangs.in', password='sellerpassword', role=User.Role.MANUFACTURER
        )

        # Sellers / Manufacturer profiles
        self.seller_a = ManufacturerProfile.objects.create(
            user=self.seller_user_a,
            business_name="Nagaland Smoked Provisions",
            slug="nagaland-smoked-provisions",
            contact_email="seller_a@wangs.in",
            contact_phone="9876543210",
            business_address="Midland, Dimapur",
            postal_code="797112",
            status=ManufacturerProfile.Status.APPROVED,
            commission_rate_override=None  # Uses platform default 10%
        )

        self.seller_b = ManufacturerProfile.objects.create(
            user=self.seller_user_b,
            business_name="Kohima Heritage Pickles",
            slug="kohima-heritage-pickles",
            contact_email="seller_b@wangs.in",
            contact_phone="9876543211",
            business_address="PR Hill, Kohima",
            postal_code="797001",
            status=ManufacturerProfile.Status.APPROVED,
            commission_rate_override=Decimal('15.00')  # Custom 15% override
        )

        # Category and Products
        self.category = Category.objects.create(name="Authentic Meats", slug="authentic-meats")

        self.product_a = Product.objects.create(
            manufacturer=self.seller_a,
            category=self.category,
            title="Smoked Pork Chunks",
            slug="smoked-pork-chunks",
            price=Decimal('1000.00'),
            weight_grams=500,
            stock_quantity=100
        )

        self.product_b = Product.objects.create(
            manufacturer=self.seller_b,
            category=self.category,
            title="King Chilli Bamboo Shoot Pickle",
            slug="king-chilli-pickle",
            price=Decimal('500.00'),
            weight_grams=250,
            stock_quantity=100
        )

    def _create_sample_order(self, items_spec, order_num=None, is_b2b=False):
        """Helper to create an order with order items."""
        if not order_num:
            order_num = f"WNG-TEST-{uuid.uuid4().hex[:8].upper()}"

        subtotal = sum(p.price * qty for p, qty in items_spec)
        delivery_fee = Decimal('0.00')
        platform_fee = Decimal('0.00')
        total = subtotal + delivery_fee + platform_fee

        order = Order.objects.create(
            order_number=order_num,
            user=self.customer_user,
            customer_name="Lanu Ao",
            customer_email="lanu@wangs.in",
            customer_phone="9876543210",
            shipping_address_line1="High School Colony",
            shipping_city="Kohima",
            shipping_state="Nagaland",
            shipping_postal_code="797001",
            items_subtotal=subtotal,
            customer_platform_fee=platform_fee,
            delivery_fee=delivery_fee,
            total_amount=total,
            platform_commission_total=Decimal('0.00'),
            manufacturer_payout_total=Decimal('0.00'),
            status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.PENDING,
            payment_method='MOCK'
        )
        if is_b2b:
            order.is_b2b = True

        for product, qty in items_spec:
            OrderItem.objects.create(
                order=order,
                product=product,
                manufacturer=product.manufacturer,
                product_title=product.title,
                weight_grams=product.weight_grams,
                unit_price=product.price,
                quantity=qty,
                subtotal=product.price * qty,
                commission_rate=Decimal('10.00'),
                commission_amount=Decimal('0.00'),
                manufacturer_payout=Decimal('0.00')
            )

        return order

    # 1. Successful Commission Calculation (10% platform, 90% seller)
    def test_01_successful_commission_calculation(self):
        order = self._create_sample_order([(self.product_a, 1)])  # ₹1000 product
        commissions = CommissionEngine.snapshot_order_commissions_and_allocations(order)

        self.assertEqual(len(commissions), 1)
        comm = commissions[0]
        self.assertEqual(comm.product_subtotal, Decimal('1000.00'))
        self.assertEqual(comm.product_subtotal_paise, 100000)
        self.assertEqual(comm.commission_percentage, Decimal('10.00'))
        self.assertEqual(comm.commission_amount, Decimal('100.00'))  # 10% = ₹100
        self.assertEqual(comm.commission_amount_paise, 10000)
        self.assertEqual(comm.seller_payable_amount, Decimal('900.00'))  # 90% = ₹900
        self.assertEqual(comm.seller_payable_paise, 90000)

        # Allocation
        alloc = SellerAllocation.objects.get(order=order, seller=self.seller_a)
        self.assertEqual(alloc.net_seller_amount, Decimal('900.00'))
        self.assertEqual(alloc.commission_deducted, Decimal('100.00'))
        self.assertEqual(alloc.transfer_status, SellerAllocation.TransferStatus.PENDING)

    # 2. Different Commission Rates (Custom override 15% vs default 10%)
    def test_02_different_commission_rates(self):
        order = self._create_sample_order([(self.product_b, 1)])  # ₹500 from Seller B (15% override)
        commissions = CommissionEngine.snapshot_order_commissions_and_allocations(order)

        comm = commissions[0]
        self.assertEqual(comm.commission_percentage, Decimal('15.00'))
        self.assertEqual(comm.commission_amount, Decimal('75.00'))  # 15% of ₹500 = ₹75
        self.assertEqual(comm.commission_amount_paise, 7500)
        self.assertEqual(comm.seller_payable_amount, Decimal('425.00'))  # 85% = ₹425
        self.assertEqual(comm.seller_payable_paise, 42500)

    # 3. Multi-Seller Order Allocation
    def test_03_multi_seller_order_allocation(self):
        # Order with 1x Product A (₹1000, 10% comm) and 2x Product B (2 x ₹500 = ₹1000, 15% comm)
        order = self._create_sample_order([(self.product_a, 1), (self.product_b, 2)])
        self.assertEqual(order.total_amount, Decimal('2000.00'))

        commissions = CommissionEngine.snapshot_order_commissions_and_allocations(order)
        self.assertEqual(len(commissions), 2)

        comm_a = next(c for c in commissions if c.seller == self.seller_a)
        comm_b = next(c for c in commissions if c.seller == self.seller_b)

        # Seller A (10% rate on ₹1000)
        self.assertEqual(comm_a.commission_amount, Decimal('100.00'))
        self.assertEqual(comm_a.seller_payable_amount, Decimal('900.00'))

        # Seller B (15% rate on ₹1000)
        self.assertEqual(comm_b.commission_amount, Decimal('150.00'))
        self.assertEqual(comm_b.seller_payable_amount, Decimal('850.00'))

        # Check total allocations
        alloc_a = SellerAllocation.objects.get(order=order, seller=self.seller_a)
        alloc_b = SellerAllocation.objects.get(order=order, seller=self.seller_b)
        self.assertEqual(alloc_a.net_seller_amount, Decimal('900.00'))
        self.assertEqual(alloc_b.net_seller_amount, Decimal('850.00'))

    # 4. B2B and B2C Orders
    def test_04_b2b_and_b2c_orders(self):
        order_b2c = self._create_sample_order([(self.product_a, 1)], is_b2b=False)
        order_b2b = self._create_sample_order([(self.product_a, 10)], is_b2b=True)

        comm_b2c = CommissionEngine.snapshot_order_commissions_and_allocations(order_b2c)[0]
        comm_b2b = CommissionEngine.snapshot_order_commissions_and_allocations(order_b2b)[0]

        self.assertFalse(comm_b2c.is_b2b)
        self.assertTrue(comm_b2b.is_b2b)
        self.assertEqual(comm_b2b.product_subtotal, Decimal('10000.00'))
        self.assertEqual(comm_b2b.commission_amount, Decimal('1000.00'))
        self.assertEqual(comm_b2b.seller_payable_amount, Decimal('9000.00'))

    # 5. Failed Payments
    def test_05_failed_payment_handling(self):
        order = self._create_sample_order([(self.product_a, 1)])
        payment_info = MarketplacePaymentService.initiate_payment(order, provider_name='MOCK')
        payment_id = payment_info['payment_id']

        with self.assertRaises(PaymentVerificationError):
            MarketplacePaymentService.verify_and_capture_payment(
                order=order,
                payload={'status': 'FAILED', 'payment_id': payment_id, 'amount_paise': 100000},
                provider_name='MOCK'
            )

        order.refresh_from_db()
        payment = Payment.objects.get(payment_id=payment_id)
        self.assertEqual(payment.status, Payment.Status.FAILED)
        self.assertEqual(order.payment_status, Order.PaymentStatus.FAILED)
        # Verify no seller allocations released
        self.assertFalse(order.seller_allocations.exists())

    # 6. Duplicate Webhook Events (Idempotency)
    def test_06_duplicate_webhook_events(self):
        order = self._create_sample_order([(self.product_a, 1)])
        payment_info = MarketplacePaymentService.initiate_payment(order, provider_name='MOCK')
        event_id = "evt_idempotent_test_001"

        payload = {
            'status': 'SUCCESS',
            'order_number': order.order_number,
            'txnid': payment_info['payment_id'],
            'amount': '1000.00',
            'amount_paise': 100000,
        }

        # First trigger
        res1 = MarketplacePaymentService.process_webhook(
            provider_name='MOCK',
            event_id=event_id,
            event_type='PAYMENT_SUCCESS',
            payload=payload
        )
        self.assertEqual(res1['status'], 'PROCESSED')

        order.refresh_from_db()
        self.assertEqual(order.payment_status, Order.PaymentStatus.PAID)
        initial_comm_count = Commission.objects.filter(order=order).count()
        self.assertEqual(initial_comm_count, 1)

        # Duplicate trigger with same event_id
        res2 = MarketplacePaymentService.process_webhook(
            provider_name='MOCK',
            event_id=event_id,
            event_type='PAYMENT_SUCCESS',
            payload=payload
        )
        self.assertEqual(res2['status'], 'ALREADY_PROCESSED')

        # Ensure no duplicate commission records created
        self.assertEqual(Commission.objects.filter(order=order).count(), initial_comm_count)

    # 7. Invalid Payment Signatures / Tampered Hash
    def test_07_invalid_payment_signatures(self):
        adapter = PayUAdapter(key='test_key', salt='test_salt')
        # Payload with deliberately forged/tampered hash
        tampered_payload = {
            'status': 'success',
            'txnid': 'PAY-ORDER-123',
            'amount': '1000.00',
            'productinfo': 'Test Product',
            'firstname': 'Customer',
            'email': 'customer@wangs.in',
            'hash': 'invalid_forged_sha512_hash_value'
        }

        with self.assertRaises(PaymentVerificationError):
            adapter.verify_payment(tampered_payload)

    # 8. Full Refunds
    def test_08_full_refund(self):
        order = self._create_sample_order([(self.product_a, 1)])
        init_res = MarketplacePaymentService.initiate_payment(order, provider_name='MOCK')
        MarketplacePaymentService.verify_and_capture_payment(
            order, {'status': 'SUCCESS', 'amount_paise': 100000}, provider_name='MOCK'
        )

        refund = MarketplacePaymentService.process_refund(
            order=order,
            amount_paise=100000,
            reason="Customer cancelled item"
        )

        order.refresh_from_db()
        payment = Payment.objects.get(order=order)

        self.assertEqual(refund.status, Refund.Status.PROCESSED)
        self.assertEqual(refund.amount, Decimal('1000.00'))
        self.assertEqual(payment.status, Payment.Status.REFUNDED)
        self.assertEqual(order.payment_status, Order.PaymentStatus.REFUNDED)

        # Check allocations reversed
        alloc = SellerAllocation.objects.get(order=order, seller=self.seller_a)
        self.assertEqual(alloc.transfer_status, SellerAllocation.TransferStatus.REVERSED)

    # 9. Partial Refunds
    def test_09_partial_refund(self):
        order = self._create_sample_order([(self.product_a, 2)])  # ₹2000 total
        MarketplacePaymentService.initiate_payment(order, provider_name='MOCK')
        MarketplacePaymentService.verify_and_capture_payment(
            order, {'status': 'SUCCESS', 'amount_paise': 200000}, provider_name='MOCK'
        )

        # Partial refund of ₹500 (50000 paise)
        refund = MarketplacePaymentService.process_refund(
            order=order,
            amount_paise=50000,
            reason="Partial damage on one item"
        )

        order.refresh_from_db()
        payment = Payment.objects.get(order=order)
        self.assertEqual(payment.status, Payment.Status.PARTIALLY_REFUNDED)
        self.assertEqual(refund.amount, Decimal('500.00'))

        # Check cannot refund more than remaining ₹1500
        with self.assertRaises(Exception):
            MarketplacePaymentService.process_refund(
                order=order,
                amount_paise=160000  # ₹1600 > remaining ₹1500
            )

    # 10. Failed Settlement Updates & Safe Disability of Unapproved Live Payouts
    @override_settings(PAYU_SPLIT_SETTLEMENTS_ENABLED=False)
    def test_10_unapproved_split_settlement_safely_disabled(self):
        order = self._create_sample_order([(self.product_a, 1)])
        adapter = PayUAdapter(key='test_key', salt='test_salt')

        with self.assertRaises(PaymentProviderFeatureNotActiveError) as ctx:
            adapter.create_split_settlement(order, [])
        self.assertIn("pending approval", str(ctx.exception).lower())

        with self.assertRaises(PaymentProviderFeatureNotActiveError) as ctx2:
            adapter.release_seller_settlement(None)
        self.assertIn("disabled pending marketplace approval", str(ctx2.exception).lower())

    # 11. Unauthorized Access
    def test_11_unauthorized_access(self):
        # Ordinary customer tries to access seller payment profile
        self.client.force_authenticate(user=self.customer_user)
        resp_seller = self.client.get('/api/sellers/payment-profile/')
        self.assertEqual(resp_seller.status_code, status.HTTP_403_FORBIDDEN)

        # Ordinary customer tries to access admin payments overview
        resp_admin = self.client.get('/api/admin/payments/')
        self.assertEqual(resp_admin.status_code, status.HTTP_403_FORBIDDEN)

        # Admin user access succeeds
        self.client.force_authenticate(user=self.admin_user)
        resp_admin_auth = self.client.get('/api/admin/payments/')
        self.assertEqual(resp_admin_auth.status_code, status.HTTP_200_OK)

    # 12. Decimal and Integer Paise Calculation Accuracy
    def test_12_decimal_and_paise_calculation_accuracy(self):
        # Test odd values e.g. ₹99.99 with 10% commission
        subtotal_paise = to_paise(Decimal('99.99'))
        self.assertEqual(subtotal_paise, 9999)

        calc = CommissionEngine.calculate_seller_commission(
            seller=self.seller_a,
            subtotal_paise=subtotal_paise,
            commission_rate=Decimal('10.00')
        )

        # 10% of 9999 = 999.9 -> rounds to 1000 paise (₹10.00)
        # Seller payable = 9999 - 1000 = 8999 paise (₹89.99)
        self.assertEqual(calc['commission_amount_paise'], 1000)
        self.assertEqual(calc['commission_amount'], Decimal('10.00'))
        self.assertEqual(calc['seller_payable_paise'], 8999)
        self.assertEqual(calc['seller_payable_amount'], Decimal('89.99'))

        # Sum of paise exactly equals total subtotal paise (zero rupee leak!)
        self.assertEqual(calc['commission_amount_paise'] + calc['seller_payable_paise'], subtotal_paise)
