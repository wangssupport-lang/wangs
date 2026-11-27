from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient

from .models import (
    FinancialAuditLog,
    ManufacturerProfile,
    SellerBalance,
    SellerFinancialLedger,
    SellerPaymentProfile,
    SellerWithdrawal,
    User,
)


class AdminPaymentRequestsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin_fin',
            email='admin@wangs.in',
            password='pass1234',
            role=User.Role.ADMIN,
            is_staff=True,
            is_superuser=True,
        )
        self.seller_user = User.objects.create_user(
            username='seller_naga',
            email='maker@wangs.in',
            password='pass1234',
            role=User.Role.MANUFACTURER,
            first_name='Ato',
            last_name='Kikon',
        )
        self.seller = ManufacturerProfile.objects.create(
            user=self.seller_user,
            business_name='Naga Smokehouse',
            slug='naga-smokehouse',
            contact_email='maker@wangs.in',
            contact_phone='9876543210',
            business_address='Kohima Main Road',
            postal_code='797001',
            status=ManufacturerProfile.Status.APPROVED,
            is_verified_producer=True,
            bank_account_holder='Ato Kikon',
            bank_account_number='123456787890',
            bank_ifsc_code='SBIN0001234',
            bank_name='State Bank of India',
        )
        self.payment_profile = SellerPaymentProfile.objects.create(
            seller=self.seller,
            payment_provider='RAZORPAY',
            kyc_status=SellerPaymentProfile.KYCStatus.VERIFIED,
            bank_verification_status=SellerPaymentProfile.BankVerificationStatus.VERIFIED,
            onboarding_status=SellerPaymentProfile.OnboardingStatus.ACTIVE,
            payout_eligibility=True,
        )
        self.balance = SellerBalance.objects.create(
            seller=self.seller,
            pending_earnings=Decimal('450.00'),
            available_balance=Decimal('700.00'),
            withdrawal_processing=Decimal('500.00'),
            total_withdrawn=Decimal('300.00'),
            total_lifetime_earnings=Decimal('1950.00'),
        )
        self.paid_wd = SellerWithdrawal.objects.create(
            request_reference='WD-20261120-PAID01',
            seller=self.seller,
            requested_amount=Decimal('300.00'),
            available_balance_snapshot=Decimal('1500.00'),
            bank_verification_status_snapshot='VERIFIED',
            status=SellerWithdrawal.Status.PAID,
        )
        self.pending_wd = SellerWithdrawal.objects.create(
            request_reference='WD-20261127-REQ001',
            seller=self.seller,
            requested_amount=Decimal('500.00'),
            available_balance_snapshot=Decimal('1200.00'),
            bank_verification_status_snapshot='VERIFIED',
            status=SellerWithdrawal.Status.REQUESTED,
        )

    def test_non_admin_cannot_access_payment_requests(self):
        self.client.force_authenticate(user=self.seller_user)
        res = self.client.get('/api/admin/payment-requests/')
        self.assertEqual(res.status_code, 403)

    def test_admin_list_and_masked_detail(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/admin/payment-requests/?search=WD-20261127')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['summary']['total_pending_requests'], 1)
        self.assertEqual(res.data['summary']['total_requested_amount'], '500.00')
        self.assertEqual(res.data['summary']['completed_payout_amount'], '300.00')
        self.assertEqual(len(res.data['results']), 1)

        detail_res = self.client.get(f'/api/admin/payment-requests/{self.pending_wd.id}/')
        self.assertEqual(detail_res.status_code, 200)
        self.assertEqual(detail_res.data['bank_info']['masked_account_number'], '•••• •••• 7890')
        self.assertNotIn('123456787890', str(detail_res.data))

    def test_admin_approve_does_not_mark_paid_and_logs_audit(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(
            f'/api/admin/payment-requests/{self.pending_wd.id}/approve/',
            {'internal_note': 'Bank verified'},
            format='json',
        )
        self.assertEqual(res.status_code, 200)
        self.pending_wd.refresh_from_db()
        self.assertEqual(self.pending_wd.status, SellerWithdrawal.Status.APPROVED)
        self.assertIsNone(self.pending_wd.paid_at)
        self.assertTrue(
            FinancialAuditLog.objects.filter(withdrawal=self.pending_wd, action='WITHDRAWAL_APPROVED').exists()
        )

    def test_admin_reject_requires_reason_and_releases_reserved_balance(self):
        self.client.force_authenticate(user=self.admin)
        bad_res = self.client.post(
            f'/api/admin/payment-requests/{self.pending_wd.id}/reject/',
            {'reason': '   '},
            format='json',
        )
        self.assertEqual(bad_res.status_code, 400)

        ok_res = self.client.post(
            f'/api/admin/payment-requests/{self.pending_wd.id}/reject/',
            {'reason': 'IFSC mismatch on passbook'},
            format='json',
        )
        self.assertEqual(ok_res.status_code, 200)
        self.pending_wd.refresh_from_db()
        self.balance.refresh_from_db()
        self.assertEqual(self.pending_wd.status, SellerWithdrawal.Status.REJECTED)
        self.assertEqual(self.balance.available_balance, Decimal('1200.00'))
        self.assertEqual(self.balance.withdrawal_processing, Decimal('0.00'))
        self.assertTrue(
            SellerFinancialLedger.objects.filter(
                seller=self.seller,
                transaction_type=SellerFinancialLedger.TransactionType.WITHDRAWAL_RELEASE,
                signed_amount=Decimal('500.00'),
            ).exists()
        )

    def test_ledger_and_audit_log_are_immutable(self):
        entry = SellerFinancialLedger.objects.create(
            seller=self.seller,
            transaction_reference='TX-IMMUTABLE-01',
            transaction_type=SellerFinancialLedger.TransactionType.ORDER_EARNING,
            signed_amount=Decimal('450.00'),
        )
        entry.signed_amount = Decimal('999.00')
        with self.assertRaises(ValueError):
            entry.save()
        with self.assertRaises(ValueError):
            entry.delete()

    def test_seller_withdrawal_validation_and_reservation(self):
        self.client.force_authenticate(user=self.seller_user)

        # Below ₹300 -> rejected
        low_res = self.client.post('/api/sellers/withdrawals/', {'amount': '299.00'}, format='json')
        self.assertEqual(low_res.status_code, 400)

        # Exceeds available balance (700.00) -> rejected
        high_res = self.client.post('/api/sellers/withdrawals/', {'amount': '750.00'}, format='json')
        self.assertEqual(high_res.status_code, 400)

        # Exactly ₹300 -> succeeds and atomically reserves balance
        ok_res = self.client.post('/api/sellers/withdrawals/', {'amount': '300.00', 'seller_notes': 'Weekly payout'}, format='json')
        self.assertEqual(ok_res.status_code, 201)
        self.balance.refresh_from_db()
        self.assertEqual(self.balance.available_balance, Decimal('400.00'))
        self.assertEqual(self.balance.withdrawal_processing, Decimal('800.00'))

        # Seller earnings overview reflects updated balances and masked bank
        earn_res = self.client.get('/api/sellers/earnings/')
        self.assertEqual(earn_res.status_code, 200)
        self.assertEqual(earn_res.data['balances']['available_balance'], '400.00')
        self.assertEqual(earn_res.data['bank_info']['masked_account_number'], '•••• •••• 7890')

    def test_admin_seller_earnings_list_and_detail(self):
        self.client.force_authenticate(user=self.admin)
        list_res = self.client.get('/api/admin/seller-earnings/?search=Smokehouse')
        self.assertEqual(list_res.status_code, 200)
        self.assertEqual(len(list_res.data['results']), 1)
        row = list_res.data['results'][0]
        self.assertEqual(row['available_balance'], '700.00')
        self.assertEqual(row['total_withdrawn'], '300.00')

        detail_res = self.client.get(f'/api/admin/seller-earnings/{self.seller.id}/')
        self.assertEqual(detail_res.status_code, 200)
        self.assertEqual(detail_res.data['balances']['total_withdrawn'], '300.00')
        self.assertEqual(detail_res.data['bank_info']['masked_account_number'], '•••• •••• 7890')

    def test_user_and_seller_remove_account(self):
        # Customer without orders is deleted cleanly
        cust = User.objects.create_user(username='cust_del', email='cust_del@wangs.in', password='pass1234', role=User.Role.CUSTOMER)
        self.client.force_authenticate(user=cust)
        bad_del = self.client.post('/api/auth/delete-account/', {'confirm_text': 'NO'}, format='json')
        self.assertEqual(bad_del.status_code, 400)
        ok_del = self.client.post('/api/auth/delete-account/', {'confirm_text': 'DELETE'}, format='json')
        self.assertEqual(ok_del.status_code, 200)
        self.assertFalse(User.objects.filter(id=cust.id).exists())

        # Seller with active REQUESTED withdrawal is blocked
        self.client.force_authenticate(user=self.seller_user)
        blocked_res = self.client.post('/api/auth/delete-account/', {'confirm_text': 'DELETE'}, format='json')
        self.assertEqual(blocked_res.status_code, 400)

        # Reject pending withdrawal so no active withdrawals remain, then anonymize/deactivate seller preserving ledger
        SellerWithdrawal.objects.filter(id=self.pending_wd.id).update(status=SellerWithdrawal.Status.REJECTED)
        anon_res = self.client.post('/api/auth/delete-account/', {'confirm_text': 'DELETE'}, format='json')
        self.assertEqual(anon_res.status_code, 200)
        self.seller_user.refresh_from_db()
        self.seller.refresh_from_db()
        self.assertFalse(self.seller_user.is_active)
        self.assertEqual(self.seller.status, ManufacturerProfile.Status.SUSPENDED)
        self.assertEqual(self.seller.bank_account_number, '')
        self.assertTrue(SellerWithdrawal.objects.filter(seller=self.seller).exists())

    def test_razorpay_signature_webhook_and_route_gate(self):
        import hashlib
        import hmac
        from unittest.mock import patch
        from django.test import override_settings
        from .models import Order, OrderItem, Payment
        from .payments.adapters.razorpay import RazorpayAdapter
        from .payments.exceptions import (
            PaymentProviderFeatureNotActiveError,
            PaymentVerificationError,
            WebhookSignatureError,
        )

        adapter = RazorpayAdapter()

        # Route transfers/payouts remain disabled when RAZORPAY_ROUTE_ENABLED=False
        with override_settings(RAZORPAY_ROUTE_ENABLED=False):
            with self.assertRaises(PaymentProviderFeatureNotActiveError):
                adapter.create_split_settlement(None, [])
            with self.assertRaises(PaymentProviderFeatureNotActiveError):
                adapter.release_seller_settlement(None)

        # Live signature & webhook verification
        with override_settings(
            RAZORPAY_KEY_ID='rzp_live_testkey123',
            RAZORPAY_KEY_SECRET='rzp_live_secret_xyz',
            RAZORPAY_WEBHOOK_SECRET='whsec_test_12345',
        ):
            self.assertTrue(adapter.is_live_configured())

            # Invalid signature raises
            with self.assertRaises(PaymentVerificationError):
                adapter.verify_payment({
                    'razorpay_order_id': 'order_RZP123',
                    'razorpay_payment_id': 'pay_RZP123',
                    'razorpay_signature': 'forged_sig',
                })

            # Valid signature + mocked captured status passes
            valid_sig = hmac.new(
                b'rzp_live_secret_xyz',
                b'order_RZP123|pay_RZP123',
                hashlib.sha256,
            ).hexdigest()
            with patch.object(adapter, 'get_payment_details', return_value={'id': 'pay_RZP123', 'status': 'captured', 'amount': 58300, 'method': 'upi'}):
                res = adapter.verify_payment(
                    {
                        'razorpay_order_id': 'order_RZP123',
                        'razorpay_payment_id': 'pay_RZP123',
                        'razorpay_signature': valid_sig,
                    },
                    expected_amount_paise=58300,
                )
                self.assertTrue(res['is_valid'])
                self.assertEqual(res['status'], 'CAPTURED')

            # Webhook signature verification
            raw_body = b'{"event":"payment.captured"}'
            wh_sig = hmac.new(b'whsec_test_12345', raw_body, hashlib.sha256).hexdigest()
            self.assertTrue(adapter.verify_webhook_signature({'X-Razorpay-Signature': wh_sig}, raw_body, {}))
            with self.assertRaises(WebhookSignatureError):
                adapter.verify_webhook_signature({'X-Razorpay-Signature': 'bad_wh_sig'}, raw_body, {})

    def test_48h_eligibility_no_cod_and_complaints_refund_workflow(self):
        from datetime import timedelta
        from django.core.management import call_command
        from django.utils import timezone
        from .models import Category, Order, OrderComplaint, OrderItem, Payment, Product, Refund
        from .services import OrderService, PaymentService
        from .withdrawal_service import sync_seller_balance_from_paid_orders

        cat = Category.objects.create(name='Test Pickles', slug='test-pickles')
        prod = Product.objects.create(
            manufacturer=self.seller,
            category=cat,
            title='King Chilli Pickle',
            slug='king-chilli-pickle',
            price=Decimal('500.00'),
            weight_grams=250,
            stock_quantity=20,
            status=Product.Status.APPROVED,
            is_active=True,
        )
        cust = User.objects.create_user(username='cust_48h', email='cust48@wangs.in', password='pass1234', role=User.Role.CUSTOMER)

        # COD is rejected
        class DummyItem:
            def __init__(self, product, quantity):
                self.product = product
                self.quantity = quantity

        with self.assertRaises(ValueError):
            OrderService.create_order_from_cart(
                user=cust,
                customer_details={'name': 'Test Cust', 'email': 'cust48@wangs.in', 'phone': '9999999999'},
                shipping_details={'address_line1': 'Main Rd', 'city': 'Kohima', 'state': 'Nagaland', 'postal_code': '797001'},
                cart_items=[DummyItem(prod, 1)],
                payment_method='COD',
            )

        # Online Razorpay order -> payment captured -> pending earnings created (48h window)
        order = OrderService.create_order_from_cart(
            user=cust,
            customer_details={'name': 'Test Cust', 'email': 'cust48@wangs.in', 'phone': '9999999999'},
            shipping_details={'address_line1': 'Main Rd', 'city': 'Kohima', 'state': 'Nagaland', 'postal_code': '797001'},
            cart_items=[DummyItem(prod, 1)],
            payment_method='RAZORPAY',
        )
        PaymentService.create_razorpay_order(order)
        PaymentService.verify_and_confirm_payment(
            order=order,
            payment_id='pay_sim_48h',
            razorpay_order_id=f'order_test_{order.order_number}',
            signature='sig_sim',
            provider='RAZORPAY',
        )
        order.refresh_from_db()
        self.assertIsNotNone(order.payment_captured_at)
        self.assertIsNotNone(order.seller_eligibility_at)
        pay_rec = Payment.objects.filter(order=order).first()
        self.assertIn('T+2', pay_rec.gateway_settlement_schedule)

        # Before 48h, earnings stay in pending_earnings (not available)
        prev_avail = self.balance.available_balance
        prev_pend = self.balance.pending_earnings
        bal = sync_seller_balance_from_paid_orders(self.seller)
        self.assertEqual(bal.available_balance, prev_avail)
        self.assertEqual(bal.pending_earnings, prev_pend + Decimal('450.00'))

        # Customer submits complaint -> blocks 48h release while unresolved
        self.client.force_authenticate(user=cust)
        cmp_res = self.client.post('/api/complaints/', {
            'order_id': order.order_number,
            'customer_name': 'Test Cust',
            'registered_email': 'cust48@wangs.in',
            'contact_number': '9999999999',
            'product_name': 'King Chilli Pickle',
            'issue_category': 'DAMAGED',
            'description': 'Jar arrived cracked',
        }, format='json')
        self.assertEqual(cmp_res.status_code, 201)
        cmp_id = cmp_res.data['id']

        # Fast-forward past 48h: still blocked by unresolved complaint
        Order.objects.filter(id=order.id).update(
            payment_captured_at=timezone.now() - timedelta(hours=50),
            seller_eligibility_at=timezone.now() - timedelta(hours=2),
        )
        call_command('release_eligible_earnings')
        self.balance.refresh_from_db()
        self.assertEqual(self.balance.available_balance, prev_avail)

        # Admin approves refund -> creates auditable Refund + REFUND_REVERSAL ledger entry
        self.client.force_authenticate(user=self.admin)
        act_res = self.client.post(f'/api/admin/complaints/{cmp_id}/action/', {
            'action': 'approve_refund',
            'refund_amount': '450.00',
            'reason': 'Verified broken jar',
        }, format='json')
        self.assertEqual(act_res.status_code, 200)
        self.assertTrue(Refund.objects.filter(order=order, status=Refund.Status.APPROVED).exists())
        self.assertTrue(
            SellerFinancialLedger.objects.filter(
                seller=self.seller,
                order=order,
                transaction_type=SellerFinancialLedger.TransactionType.REFUND_REVERSAL,
            ).exists()
        )

    def test_unified_razorpay_payment_verify_endpoint(self):
        import hmac
        import hashlib
        from unittest.mock import patch
        from django.test import override_settings
        from .models import Category, Order, Payment, Product
        from .services import OrderService

        cust = User.objects.create_user(
            username='custverify', email='custverify@wangs.in', password='pw',
            role='CUSTOMER',
        )
        cat = Category.objects.create(name='Verify Pickles', slug='verify-pickles')
        prod = Product.objects.create(
            manufacturer=self.seller,
            category=cat,
            title='Verify Pickle',
            slug='verify-pickle',
            price=Decimal('10.00'),
            base_price=Decimal('9.00'),
            weight_grams=250,
            stock_quantity=10,
            status=Product.Status.APPROVED,
            is_active=True,
        )

        class DummyItem:
            def __init__(self, product, quantity):
                self.product = product
                self.quantity = quantity

        order = OrderService.create_order_from_cart(
            user=cust,
            customer_details={'name': 'Verify Cust', 'email': 'custverify@wangs.in', 'phone': '9999999998'},
            shipping_details={'address_line1': 'Main Rd', 'city': 'Kohima', 'state': 'Nagaland', 'postal_code': '797001'},
            cart_items=[DummyItem(prod, 1)],
            payment_method='RAZORPAY',
        )
        Payment.objects.create(
            payment_id=f'PAY-{order.order_number}',
            order=order,
            customer=cust,
            payment_provider='RAZORPAY',
            amount_paise=int(order.total_amount * 100),
            currency='INR',
            status=Payment.Status.INITIATED,
            provider_order_id='order_live_123',
        )

        secret = 'rzp_test_secret_key'
        rzp_order_id = 'order_live_123'
        rzp_payment_id = 'pay_live_456'
        sig = hmac.new(secret.encode('utf-8'), f"{rzp_order_id}|{rzp_payment_id}".encode('utf-8'), hashlib.sha256).hexdigest()

        self.client.force_authenticate(user=cust)
        with override_settings(RAZORPAY_KEY_ID='rzp_test_id', RAZORPAY_KEY_SECRET=secret):
            with patch('marketplace.payments.adapters.razorpay.RazorpayAdapter.get_payment_details', return_value={
                'id': rzp_payment_id,
                'status': 'captured',
                'amount': int(order.total_amount * 100),
                'method': 'upi',
            }):
                res = self.client.post('/api/payments/verify/', {
                    'order_number': order.order_number,
                    'provider': 'RAZORPAY',
                    'razorpay_order_id': rzp_order_id,
                    'razorpay_payment_id': rzp_payment_id,
                    'razorpay_signature': sig,
                }, format='json')

        self.assertEqual(res.status_code, 200, res.data)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, Order.PaymentStatus.PAID)
        self.assertEqual(order.status, Order.Status.CONFIRMED)
        self.assertIsNotNone(order.payment_captured_at)
        self.assertIsNotNone(order.seller_eligibility_at)





