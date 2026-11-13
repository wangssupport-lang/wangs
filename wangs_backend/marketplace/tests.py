import datetime
from unittest.mock import patch
from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from .models import (
    User, CustomerProfile, ManufacturerProfile, Category, Product,
    CommissionSetting, Cart, CartItem, Order, OrderItem, PaymentTransaction, Coupon,
    EmailOTP, MaintenanceSubscriber, AuditLog,
    RewardSettings, CustomerRewardWallet, OrderUnit, ProductQRCode,
    DeliveryConfirmation, RewardTransaction, SuspiciousScanLog,
    CourierProfile, CourierDeliveryScanLog,
    CourierService, DeliveryZone, DeliveryRate, ShippingPromotion
)
from .services import FinancialCalculator, OrderService, PaymentService, RewardService


class WangsFinancialAndOrderTests(TestCase):
    def setUp(self):
        self.comm_setting = CommissionSetting.objects.create(
            default_commission_rate=Decimal('10.00'),
            customer_platform_fee=Decimal('5.00'),
            default_delivery_fee=Decimal('50.00'),
            free_delivery_threshold=Decimal('999.00')
        )
        DeliveryRate.objects.create(
            title='Platform Default Test Rate',
            scope=DeliveryRate.Scope.ADMIN_DEFAULT,
            delivery_method=DeliveryRate.DeliveryMethod.STANDARD,
            base_rate=Decimal('0.00'),
            per_package_rate=Decimal('0.00'),
            is_active=True,
            approval_status=DeliveryRate.ApprovalStatus.APPROVED
        )

        # Setup Arenla Heritage Manufacturer Account
        self.mfg_user = User.objects.create_user(
            username='arenla_craft', email='arenla@wangs.in', password='password123',
            role=User.Role.MANUFACTURER
        )
        self.mfg_profile = ManufacturerProfile.objects.create(
            user=self.mfg_user,
            business_name="Arenla's Heritage Craft",
            slug='arenlas-heritage-craft',
            location_district='Kohima',
            contact_email='arenla@wangs.in',
            contact_phone='9436012345',
            business_address='Kohima',
            postal_code='797001',
            fssai_license_number='10023064000124',
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

    def test_customer_registration_does_not_require_username(self):
        response = self.client.post(
            reverse('auth-register'),
            {
                'email': 'newcustomer@example.com',
                'password': 'securepass123',
                'first_name': 'New',
                'last_name': 'Customer',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email='newcustomer@example.com')
        self.assertTrue(user.username.startswith('customer_'))
        self.assertTrue(CustomerProfile.objects.filter(user=user).exists())

    def test_customer_registration_saves_delivery_address(self):
        response = self.client.post(
            reverse('auth-register'),
            {
                'email': 'addresscustomer@example.com',
                'password': 'securepass123',
                'first_name': 'Address',
                'last_name': 'Customer',
                'phone_number': '9876543210',
                'address_line1': '12 Market Road',
                'address_line2': 'Near the post office',
                'city': 'Kohima',
                'state': 'Nagaland',
                'postal_code': '797001',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email='addresscustomer@example.com')
        address = user.addresses.get()
        self.assertEqual(address.full_name, 'Address Customer')
        self.assertEqual(address.address_line1, '12 Market Road')
        self.assertEqual(address.address_line2, 'Near the post office')
        self.assertEqual(address.city, 'Kohima')
        self.assertEqual(address.state, 'Nagaland')
        self.assertEqual(address.postal_code, '797001')
        self.assertTrue(address.is_default)

    def test_customer_registration_rejects_incomplete_delivery_address(self):
        response = self.client.post(
            reverse('auth-register'),
            {
                'email': 'incompleteaddress@example.com',
                'password': 'securepass123',
                'first_name': 'Incomplete',
                'phone_number': '9876543210',
                'address_line1': '12 Market Road',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email='incompleteaddress@example.com').exists())

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
        self.assertEqual(breakdown['delivery_fee'], Decimal('0.00'))
        self.assertEqual(breakdown['total_amount'], Decimal('105.00'))

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
        self.assertEqual(breakdown['total_amount'], Decimal('105.00'))

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

        self.assertEqual(order.total_amount, Decimal('205.00'))

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
            business_name="Unapproved Artisan Foods",
            slug='unapproved-artisan-foods',
            contact_email='new@foods.in',
            contact_phone='1234567890',
            business_address='Dimapur',
            postal_code='797112',
            fssai_license_number='10024075000341',
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

    def test_seller_registration_blocked_when_unauthorized(self):
        """Seller registration returns 403 when user is not authorized by admin."""
        payload = {
            'username': 'unauth_seller',
            'email': 'unauth@wangs.in',
            'password': 'password123',
            'full_name': 'Unauthorized Trader',
            'business_name': 'Unauthorized Maker',
            'location_district': 'Kohima',
            'contact_email': 'unauth@wangs.in',
            'contact_phone': '9876543210',
            'business_address': 'Main Market Kohima',
            'postal_code': '797001',
            'fssai_license_number': '10023064009999',
        }
        resp = self.client.post(reverse('mfg-register'), payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(resp.data.get('requires_authorization'))

    def test_seller_registration_rejects_missing_or_invalid_fssai(self):
        """Seller registration must mandate a valid 14-digit FSSAI license when authorized."""
        # Pre-authorize user
        auth_user = User.objects.create_user(
            username='auth_seller_candidate',
            email='nofssai@wangs.in',
            password='password123',
            can_sell=True
        )
        self.client.force_authenticate(user=auth_user)

        # Missing FSSAI
        payload_missing = {
            'username': 'noseller_fssai',
            'email': 'nofssai@wangs.in',
            'password': 'password123',
            'full_name': 'No FSSAI Trader',
            'business_name': 'No FSSAI Maker',
            'location_district': 'Kohima',
            'contact_email': 'nofssai@wangs.in',
            'contact_phone': '9876543210',
            'business_address': 'Main Market Kohima',
            'postal_code': '797001',
            'fssai_license_number': '',
        }
        resp = self.client.post(reverse('mfg-register'), payload_missing, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('fssai_license_number', resp.data)

        # Invalid length / non-numeric FSSAI
        payload_invalid = {**payload_missing, 'fssai_license_number': '12345'}
        resp2 = self.client.post(reverse('mfg-register'), payload_invalid, format='json')
        self.assertEqual(resp2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_seller_registration_succeeds_with_valid_fssai(self):
        """Seller registration succeeds when valid 14-digit FSSAI is provided by authorized user."""
        auth_user = User.objects.create_user(
            username='good_seller_user',
            email='good@wangs.in',
            password='password123',
            can_sell=True
        )
        self.client.force_authenticate(user=auth_user)

        payload_valid = {
            'username': 'good_seller',
            'email': 'good@wangs.in',
            'password': 'password123',
            'full_name': 'Kevi Angami',
            'business_name': 'Kevi Organic Pickles',
            'location_district': 'Kohima',
            'contact_email': 'good@wangs.in',
            'contact_phone': '9876543210',
            'business_address': 'BOC Kohima',
            'postal_code': '797001',
            'fssai_license_number': '10023064009999',
        }
        resp = self.client.post(reverse('mfg-register'), payload_valid, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['profile']['fssai_license_number'], '10023064009999')

    def test_direct_password_login_without_otp(self):
        """Users can log in directly using username/email and password without needing OTP."""
        # Setup test user
        User.objects.create_user(
            username='directlogin_user',
            email='direct@wangs.in',
            password='MySecurePassword123'
        )

        # Login with username
        resp_username = self.client.post(reverse('auth-login'), {
            'username': 'directlogin_user',
            'password': 'MySecurePassword123'
        }, format='json')
        self.assertEqual(resp_username.status_code, status.HTTP_200_OK)
        self.assertIn('token', resp_username.data)
        self.assertEqual(resp_username.data['user']['username'], 'directlogin_user')

        # Login with email
        resp_email = self.client.post(reverse('auth-login'), {
            'username': 'direct@wangs.in',
            'password': 'MySecurePassword123'
        }, format='json')
        self.assertEqual(resp_email.status_code, status.HTTP_200_OK)
        self.assertIn('token', resp_email.data)
        self.assertEqual(resp_email.data['user']['email'], 'direct@wangs.in')

    def test_resend_email_otp_send_and_verify(self):
        """Email OTP send and verification flow works for customer and seller sign up."""
        send_resp = self.client.post(reverse('auth-send-otp'), {'email': 'shopper@wangs.in', 'purpose': 'LOGIN'}, format='json')
        self.assertEqual(send_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(send_resp.data['success'])

        otp_record = EmailOTP.objects.filter(email='shopper@wangs.in', is_used=False).first()
        self.assertIsNotNone(otp_record)
        otp_code = otp_record.otp_code
        verify_resp = self.client.post(reverse('auth-verify-otp'), {
            'email': 'shopper@wangs.in',
            'otp_code': otp_code,
            'purpose': 'LOGIN'
        }, format='json')
        self.assertEqual(verify_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(verify_resp.data['verified'])
        self.assertIn('token', verify_resp.data)
        self.assertEqual(verify_resp.data['user']['email'], 'shopper@wangs.in')

    def test_brands_spotlight_api(self):
        """Brands API returns verified manufacturers with spotlight details."""
        resp = self.client.get(reverse('brands-list'))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(len(resp.data) >= 1)
        first_brand = resp.data[0]
        self.assertIn('business_name', first_brand)
        self.assertIn('is_featured', first_brand)
        self.assertIn('brand_badge', first_brand)

    def test_add_product_review(self):
        """Customers can post reviews with ratings on approved products."""
        url = reverse('product-detail', kwargs={'slug': self.product.slug}) + 'add_review/'
        review_data = {
            'author_name': 'Priya S.',
            'rating': 5,
            'title': 'Unbelievable aroma',
            'comment': 'Smoked pork chunks are tender and bathed in rich mustard oil. Exceptional quality!'
        }
        resp = self.client.post(url, review_data, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['rating'], 5)
        self.assertEqual(resp.data['author_name'], 'Priya S.')

        # Verify product detail includes review count
        detail_resp = self.client.get(reverse('product-detail', kwargs={'slug': self.product.slug}))
        self.assertEqual(detail_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_resp.data['reviews_count'], 1)
        self.assertEqual(detail_resp.data['manufacturer']['fssai_license_number'], '10023064000124')

    def test_review_submission_notifies_seller_via_email(self):
        """When a customer writes a review, the seller is notified via email."""
        url = reverse('product-detail', kwargs={'slug': self.product.slug}) + 'add_review/'
        review_data = {
            'author_name': 'Kavita M.',
            'rating': 5,
            'title': 'Rich authentic flavors',
            'comment': 'Best pickle I have tasted, will order again!'
        }
        with patch('marketplace.resend_service.dispatch_email') as mock_dispatch:
            mock_dispatch.return_value = (True, {'id': 'email_review_123'})
            resp = self.client.post(url, review_data, format='json')
            self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
            mock_dispatch.assert_called_once()
            call_args = mock_dispatch.call_args[0]
            # First arg: recipient email (seller's contact email)
            self.assertEqual(call_args[0], self.mfg_profile.contact_email)
            # Second arg: subject
            self.assertIn("New 5-Star Review", call_args[1])
            self.assertIn(self.product.title, call_args[1])
            # Third arg: HTML content contains reviewer and comment
            self.assertIn("Kavita M.", call_args[2])
            self.assertIn("Best pickle I have tasted", call_args[2])

    def test_platform_settings_and_admin_toggle(self):
        """Public platform settings can be checked and admin can toggle seller registration visibility."""
        pub_resp = self.client.get(reverse('platform-settings'))
        self.assertEqual(pub_resp.status_code, status.HTTP_200_OK)
        self.assertFalse(pub_resp.data['allow_seller_registration'])

        # Unauthorized cannot toggle
        toggle_resp = self.client.post(reverse('admin-toggle-seller-reg'))
        self.assertEqual(toggle_resp.status_code, status.HTTP_401_UNAUTHORIZED)

        # Admin can toggle
        admin_user = User.objects.create_user(username='admin_boss', password='password123', role=User.Role.ADMIN, is_staff=True)
        self.client.force_authenticate(user=admin_user)
        toggle_resp = self.client.post(reverse('admin-toggle-seller-reg'))
        self.assertEqual(toggle_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(toggle_resp.data['allow_seller_registration'])

        # Public endpoint now reflects enabled
        pub_resp2 = self.client.get(reverse('platform-settings'))
        self.assertTrue(pub_resp2.data['allow_seller_registration'])

    def test_seller_product_price_must_be_above_100(self):
        """Sellers can only list products priced strictly above ₹100."""
        # Authenticate as manufacturer
        self.client.force_authenticate(user=self.mfg_user)
        url = reverse('manufacturer-product-list')

        # Attempt to create product at ₹100 (should fail)
        invalid_data_100 = {
            'title': 'Low Price Pickle',
            'category_id': self.cat.id,
            'short_description': 'Test pickle',
            'description': 'Full description for test pickle',
            'price': '100.00',
            'weight_grams': 250,
            'stock_quantity': 15,
            'spice_level': 'HOT',
            'dietary_type': 'NON_VEG',
            'ingredients': 'Pork, oil, spices',
        }
        res_100 = self.client.post(url, invalid_data_100, format='json')
        self.assertEqual(res_100.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('price', res_100.data)

        # Attempt to create product at ₹50 (should fail)
        invalid_data_50 = {**invalid_data_100, 'price': '50.00'}
        res_50 = self.client.post(url, invalid_data_50, format='json')
        self.assertEqual(res_50.status_code, status.HTTP_400_BAD_REQUEST)

        # Attempt to create product at ₹150 (above ₹100, should succeed)
        valid_data = {**invalid_data_100, 'title': 'Premium Pork Pickle', 'price': '150.00'}
        res_valid = self.client.post(url, valid_data, format='json')
        self.assertEqual(res_valid.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(str(res_valid.data['price'])), Decimal('150.00'))

    def test_admin_set_manufacturer_priority_and_brands_order(self):
        """Admin can set display priority for brands and /api/brands/ respects the priority order."""
        # Create second approved manufacturer
        mfg_user_2 = User.objects.create_user(
            username='artisan_beta',
            email='beta@wangs.in',
            password='password123',
            role=User.Role.MANUFACTURER,
            can_sell=True
        )
        mfg2 = ManufacturerProfile.objects.create(
            user=mfg_user_2,
            business_name='Beta Artisan Pickles',
            slug='beta-artisan-pickles',
            location_district='Dimapur',
            contact_email='beta@wangs.in',
            contact_phone='9876543211',
            business_address='Circular Road Dimapur',
            postal_code='797112',
            fssai_license_number='10024075000999',
            status=ManufacturerProfile.Status.APPROVED,
            display_priority=10
        )

        # Admin sets mfg2 priority to 999
        admin_user = User.objects.create_user(username='admin_prio_boss', password='password123', role=User.Role.ADMIN, is_staff=True)
        self.client.force_authenticate(user=admin_user)
        set_prio_url = reverse('admin-manufacturer-set-priority', kwargs={'pk': mfg2.pk})
        resp = self.client.post(set_prio_url, {'display_priority': 999}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        mfg2.refresh_from_db()
        self.assertEqual(mfg2.display_priority, 999)

        # Anonymous visitor requests /api/brands/ - Beta must appear first due to priority 999
        self.client.force_authenticate(user=None)
        brands_resp = self.client.get(reverse('brands-list'))
        self.assertEqual(brands_resp.status_code, status.HTTP_200_OK)
        brand_names = [b['business_name'] for b in brands_resp.data]
        self.assertEqual(brand_names[0], 'Beta Artisan Pickles')

    def test_admin_toggle_maintenance_mode(self):
        """Admin can toggle storefront maintenance mode and custom notice."""
        admin_user = User.objects.create_user(username='admin_maint', password='password123', role=User.Role.ADMIN, is_staff=True)
        self.client.force_authenticate(user=admin_user)

        # Toggle on with custom notice
        resp = self.client.post(reverse('admin-toggle-maintenance-mode'), {
            'maintenance_message': 'Pantry restock in progress. Back at 6 PM!'
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['is_maintenance_mode'])
        self.assertEqual(resp.data['maintenance_message'], 'Pantry restock in progress. Back at 6 PM!')

        # Verify public platform settings reflects maintenance mode
        self.client.force_authenticate(user=None)
        pub_resp = self.client.get(reverse('platform-settings'))
        self.assertEqual(pub_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(pub_resp.data['is_maintenance_mode'])
        self.assertEqual(pub_resp.data['maintenance_message'], 'Pantry restock in progress. Back at 6 PM!')

        # Anonymous visitor accessing products is blocked with HTTP 503
        prod_resp = self.client.get(reverse('product-list'))
        self.assertEqual(prod_resp.status_code, 503)
        self.assertTrue(prod_resp.json().get('maintenance'))

        # Anonymous visitor subscribing to notification succeeds
        notify_resp = self.client.post(reverse('maintenance-notify'), {'email': 'shopper_waiting@wangs.in'}, format='json')
        self.assertEqual(notify_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(MaintenanceSubscriber.objects.filter(email='shopper_waiting@wangs.in').exists())

        # Authenticated Admin bypasses maintenance mode
        self.client.force_login(admin_user)
        admin_prod_resp = self.client.get(reverse('product-list'))
        self.assertEqual(admin_prod_resp.status_code, status.HTTP_200_OK)

    def test_admin_ban_customer_and_seller_accounts(self):
        """Admin can ban/suspend customer or seller violating rules, preventing logins and hiding seller listings."""
        admin_user = User.objects.create_user(username='admin_enforcer', password='password123', role=User.Role.ADMIN, is_staff=True)
        bad_customer = User.objects.create_user(username='bad_shopper', email='badshopper@wangs.in', password='shopperpass', role=User.Role.CUSTOMER)
        
        # Create seller account with approved product
        seller_user = User.objects.create_user(username='violating_seller', email='violatingseller@wangs.in', password='sellerpass', role=User.Role.MANUFACTURER)
        seller_mfg = ManufacturerProfile.objects.create(
            user=seller_user,
            business_name="Violating Artisan Foods",
            slug='violating-artisan-foods',
            contact_email='violatingseller@wangs.in',
            contact_phone='9436099999',
            business_address='Dimapur',
            postal_code='797112',
            fssai_license_number='10023064000999',
            status=ManufacturerProfile.Status.APPROVED
        )
        bad_product = Product.objects.create(
            manufacturer=seller_mfg,
            category=self.cat,
            title="Mislabeled Bamboo Shoot",
            slug='mislabeled-bamboo-shoot',
            price=Decimal('250.00'),
            weight_grams=250,
            status=Product.Status.APPROVED,
            is_active=True,
            stock_quantity=20
        )

        self.client.force_authenticate(user=admin_user)

        # 1. Admin bans bad customer for review manipulation
        ban_cust_url = reverse('admin-user-toggle-ban', kwargs={'pk': bad_customer.pk})
        resp = self.client.post(ban_cust_url, {
            'reason': 'Review manipulation and abusive messages'
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        bad_customer.refresh_from_db()
        self.assertTrue(bad_customer.is_banned)
        self.assertFalse(bad_customer.is_active)
        self.assertEqual(bad_customer.ban_reason, 'Review manipulation and abusive messages')

        # Customer login attempt is blocked with 403 Forbidden
        self.client.force_authenticate(user=None)
        login_resp = self.client.post(reverse('auth-login'), {
            'username': 'badshopper@wangs.in',
            'password': 'shopperpass'
        }, format='json')
        self.assertEqual(login_resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('suspended by administration', login_resp.data['detail'])

        # 2. Admin bans violating seller for FSSAI compliance failure
        self.client.force_authenticate(user=admin_user)
        ban_seller_url = reverse('admin-user-toggle-ban', kwargs={'pk': seller_user.pk})
        seller_ban_resp = self.client.post(ban_seller_url, {
            'reason': 'FSSAI hygiene failure and counterfeit ingredients'
        }, format='json')
        self.assertEqual(seller_ban_resp.status_code, status.HTTP_200_OK)

        seller_user.refresh_from_db()
        seller_mfg.refresh_from_db()
        bad_product.refresh_from_db()

        self.assertTrue(seller_user.is_banned)
        self.assertFalse(seller_user.is_active)
        self.assertEqual(seller_mfg.status, ManufacturerProfile.Status.SUSPENDED)
        self.assertFalse(bad_product.is_active)  # Automatically hidden from storefront!

        # 3. Admin cannot ban their own account
        self_ban_resp = self.client.post(reverse('admin-user-toggle-ban', kwargs={'pk': admin_user.pk}), format='json')
        self.assertEqual(self_ban_resp.status_code, status.HTTP_400_BAD_REQUEST)

        # 4. Admin reinstates customer upon successful dispute resolution
        unban_resp = self.client.post(ban_cust_url, {'is_banned': False}, format='json')
        self.assertEqual(unban_resp.status_code, status.HTTP_200_OK)
        bad_customer.refresh_from_db()
        self.assertFalse(bad_customer.is_banned)
        self.assertTrue(bad_customer.is_active)

        # Reinstated customer can log in again
        self.client.force_authenticate(user=None)
        login_ok_resp = self.client.post(reverse('auth-login'), {
            'username': 'badshopper@wangs.in',
            'password': 'shopperpass'
        }, format='json')
        self.assertEqual(login_ok_resp.status_code, status.HTTP_200_OK)

    def test_request_seller_access_email_verification(self):
        """
        Verify that requesting seller authorization requires verified email OTP.
        """
        url = reverse('request-seller-access')
        req_data = {
            'business_name': 'Hills Artisan Pickle Co',
            'email': 'producer@hills.in',
            'phone': '+91 94360 99999',
            'location_district': 'Kohima',
            'fssai_number': '12345678901234',
            'message': 'Organic Naga king chilli and bamboo shoot pickles',
        }

        # 1. Unverified submission is rejected
        resp = self.client.post(url, req_data, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Email verification is mandatory', resp.data['detail'])

        # 2. Mark OTP as verified for this email
        EmailOTP.objects.create(
            email='producer@hills.in',
            otp_code='654321',
            purpose='SELLER_REQUEST',
            is_used=True,
            expires_at=timezone.now() + datetime.timedelta(minutes=10)
        )

        # 3. Submission with missing or invalid FSSAI is rejected
        invalid_fssai_data = req_data.copy()
        invalid_fssai_data['fssai_number'] = '123'  # Not 14 digits
        inv_resp = self.client.post(url, invalid_fssai_data, format='json')
        self.assertEqual(inv_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('FSSAI Food Business License / Registration Number is mandatory', inv_resp.data['detail'])

        # 3b. Submission with banking details but missing passbook photo is rejected
        missing_passbook_data = req_data.copy()
        missing_passbook_data.update({
            'bank_account_holder': 'Arenla Jamir',
            'bank_name': 'State Bank of India',
            'bank_account_number': '302910482910',
            'bank_ifsc_code': 'SBIN0000214',
        })
        pb_resp = self.client.post(url, missing_passbook_data, format='json')
        self.assertEqual(pb_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Bank Passbook or Cancelled Cheque is strictly mandatory', pb_resp.data['detail'])

        # 4. Verified submission with valid 14-digit FSSAI succeeds
        req_with_bank = req_data.copy()
        req_with_bank.update({
            'bank_account_holder': 'Arenla Jamir',
            'bank_name': 'State Bank of India',
            'bank_account_number': '302910482910',
            'bank_ifsc_code': 'SBIN0000214',
            'bank_passbook_image': 'data:image/jpeg;base64,mockpassbookscan123',
        })
        ok_resp = self.client.post(url, req_with_bank, format='json')
        self.assertEqual(ok_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(ok_resp.data['success'])

        # Verify AuditLog recorded bank details & mandatory passbook image
        log = AuditLog.objects.filter(details__email='producer@hills.in').order_by('-created_at').first()
        self.assertIsNotNone(log)
        self.assertEqual(log.details.get('bank_account_number'), '302910482910')
        self.assertEqual(log.details.get('bank_ifsc_code'), 'SBIN0000214')
        self.assertEqual(log.details.get('bank_name'), 'State Bank of India')
        self.assertEqual(log.details.get('bank_account_holder'), 'Arenla Jamir')
        self.assertEqual(log.details.get('bank_passbook_image'), 'data:image/jpeg;base64,mockpassbookscan123')

    def test_seller_approval_email_dispatch_on_admin_actions(self):
        """
        Verify that approving a seller via:
        1. UserManagementViewSet.toggle_can_sell
        2. AdminSellerRequestView.post
        3. AdminManufacturerViewSet.update_status
        dispatches a confirmation email with direct web links to the seller portal (/manufacturer)
        and storefront.
        """
        from unittest.mock import patch
        from .resend_service import send_seller_approval_email

        admin_user = User.objects.create_superuser(
            username='platform_admin_approval',
            email='admin_approval@wangs.in',
            password='adminpass123'
        )
        self.client.force_authenticate(user=admin_user)

        # 1. Test helper directly
        seller_user = User.objects.create_user(
            username='artisan_seller',
            email='artisan@wangs.in',
            password='password123',
            role=User.Role.CUSTOMER,
            can_sell=False
        )

        with patch('marketplace.resend_service.dispatch_email') as mock_dispatch:
            mock_dispatch.return_value = (True, {'id': 'mock_email_1'})
            sent, info = send_seller_approval_email(user=seller_user, site_url='https://wangs.in')
            self.assertTrue(sent)
            self.assertTrue(mock_dispatch.called)
            args, _ = mock_dispatch.call_args
            to_email, subject, html = args[0], args[1], args[2]
            self.assertEqual(to_email, 'artisan@wangs.in')
            self.assertIn('Seller Account Has Been Approved', subject)
            self.assertIn('https://wangs.in/manufacturer', html)
            self.assertIn('Open Seller Portal', html)
            self.assertIn('wangssupport@gmail.com', html)

        # 2. Test toggle_can_sell endpoint triggers email
        with patch('marketplace.resend_service.dispatch_email') as mock_dispatch:
            mock_dispatch.return_value = (True, {'id': 'mock_email_2'})
            toggle_url = reverse('admin-user-toggle-can-sell', kwargs={'pk': seller_user.pk})
            resp = self.client.post(toggle_url, format='json')
            self.assertEqual(resp.status_code, status.HTTP_200_OK)
            seller_user.refresh_from_db()
            self.assertTrue(seller_user.can_sell)
            self.assertTrue(mock_dispatch.called)
            args, _ = mock_dispatch.call_args
            self.assertEqual(args[0], 'artisan@wangs.in')
            self.assertIn('https://wangs.in/manufacturer', args[2])

        # 3. Test AdminSellerRequestView approval triggers email
        with patch('marketplace.resend_service.dispatch_email') as mock_dispatch:
            mock_dispatch.return_value = (True, {'id': 'mock_email_3'})
            approve_req_url = reverse('admin-seller-requests')
            resp = self.client.post(approve_req_url, {'email': 'new_applicant@wangs.in'}, format='json')
            self.assertEqual(resp.status_code, status.HTTP_200_OK)
            new_seller = User.objects.get(email='new_applicant@wangs.in')
            self.assertTrue(new_seller.can_sell)
            self.assertTrue(mock_dispatch.called)
            args, _ = mock_dispatch.call_args
            self.assertEqual(args[0], 'new_applicant@wangs.in')
            self.assertIn('/manufacturer', args[2])

        # 4. Test AdminManufacturerViewSet.update_status to APPROVED triggers email
        pending_seller = User.objects.create_user(
            username='pending_mfg_user',
            email='pending_mfg@wangs.in',
            password='password123',
            role=User.Role.MANUFACTURER,
            can_sell=True
        )
        pending_profile = ManufacturerProfile.objects.create(
            user=pending_seller,
            business_name="Nagaland Pure Pickles",
            slug='nagaland-pure-pickles',
            location_district='Dimapur',
            contact_email='pending_mfg@wangs.in',
            contact_phone='9436098765',
            business_address='Dimapur',
            postal_code='797112',
            fssai_license_number='10023064999999',
            status=ManufacturerProfile.Status.PENDING
        )

        with patch('marketplace.resend_service.dispatch_email') as mock_dispatch:
            mock_dispatch.return_value = (True, {'id': 'mock_email_4'})
            status_url = reverse('admin-manufacturer-update-status', kwargs={'pk': pending_profile.pk})
            resp = self.client.post(status_url, {'status': 'APPROVED', 'admin_review_notes': 'All FSSAI verified'}, format='json')
            self.assertEqual(resp.status_code, status.HTTP_200_OK)
            pending_profile.refresh_from_db()
            self.assertEqual(pending_profile.status, ManufacturerProfile.Status.APPROVED)
            self.assertTrue(mock_dispatch.called)
            args, _ = mock_dispatch.call_args
            self.assertEqual(args[0], 'pending_mfg@wangs.in')
            self.assertIn('Nagaland Pure Pickles', args[2])
            self.assertIn('/manufacturer', args[2])

    def test_existing_email_detection_and_forgot_password_flow(self):
        """
        Verify that:
        1. When an email is already registered, registration OTP and signup are rejected
           with a clear 'account is already created with this email' error.
        2. Forgot password sends a reset OTP and allows setting a new password.
        """
        from unittest.mock import patch

        existing_user = User.objects.create_user(
            username='existing_customer',
            email='shopper_exists@wangs.in',
            password='oldpassword123',
            role=User.Role.CUSTOMER
        )

        # 1. Registration OTP rejects already created email
        send_otp_url = reverse('auth-send-otp')
        resp = self.client.post(send_otp_url, {
            'email': 'shopper_exists@wangs.in',
            'purpose': 'REGISTER'
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(resp.data.get('account_exists'))
        self.assertIn('already created with this email', resp.data.get('detail', ''))

        # 2. Registration endpoint itself also rejects already created email
        reg_url = reverse('auth-register')
        reg_resp = self.client.post(reg_url, {
            'email': 'shopper_exists@wangs.in',
            'password': 'brandnewpass123',
            'first_name': 'Test'
        }, format='json')
        self.assertEqual(reg_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', reg_resp.data)
        self.assertIn('already created with this email', str(reg_resp.data['email']))

        # 3. Forgot password OTP rejects unregistered email
        resp_unknown = self.client.post(send_otp_url, {
            'email': 'nobody@wangs.in',
            'purpose': 'RESET_PASSWORD'
        }, format='json')
        self.assertEqual(resp_unknown.status_code, status.HTTP_404_NOT_FOUND)

        # 4. Forgot password OTP succeeds for existing user
        with patch('marketplace.resend_service.dispatch_email') as mock_dispatch:
            mock_dispatch.return_value = (True, {'id': 'mock_reset_otp'})
            resp_reset_otp = self.client.post(send_otp_url, {
                'email': 'shopper_exists@wangs.in',
                'purpose': 'RESET_PASSWORD'
            }, format='json')
            self.assertEqual(resp_reset_otp.status_code, status.HTTP_200_OK)
            self.assertTrue(resp_reset_otp.data.get('success'))

        # Retrieve generated reset OTP
        otp_obj = EmailOTP.objects.filter(
            email='shopper_exists@wangs.in',
            purpose='RESET_PASSWORD',
            is_used=False
        ).latest('created_at')

        # 5. Reset password with wrong OTP fails
        reset_url = reverse('auth-reset-password')
        fail_resp = self.client.post(reset_url, {
            'email': 'shopper_exists@wangs.in',
            'otp_code': '000000',
            'password': 'mynewpassword999',
            'confirm_password': 'mynewpassword999',
        }, format='json')
        self.assertEqual(fail_resp.status_code, status.HTTP_400_BAD_REQUEST)

        # 6. Reset password with valid OTP succeeds
        ok_reset = self.client.post(reset_url, {
            'email': 'shopper_exists@wangs.in',
            'otp_code': otp_obj.otp_code,
            'password': 'mynewpassword999',
            'confirm_password': 'mynewpassword999',
        }, format='json')
        self.assertEqual(ok_reset.status_code, status.HTTP_200_OK)
        self.assertTrue(ok_reset.data.get('success'))
        self.assertIn('token', ok_reset.data)

        # 7. Old password no longer works, new password works
        existing_user.refresh_from_db()
        self.assertFalse(existing_user.check_password('oldpassword123'))
        self.assertTrue(existing_user.check_password('mynewpassword999'))

        login_resp = self.client.post(reverse('auth-login'), {
            'username': 'shopper_exists@wangs.in',
            'password': 'mynewpassword999'
        }, format='json')
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)

    def test_admin_delete_user(self):
        """Admin can delete users from admin page, but cannot delete themselves."""
        admin_boss = User.objects.create_user(
            username='admin_delete_tester', email='admin_tester@wangs.in',
            password='adminpassword123', role=User.Role.ADMIN, is_staff=True
        )
        target_customer = User.objects.create_user(
            username='spam_customer', email='spam@wangs.in',
            password='password123', role=User.Role.CUSTOMER
        )

        url = reverse('admin-user-detail', kwargs={'pk': target_customer.id})

        # 1. Anonymous fails
        anon_resp = self.client.delete(url)
        self.assertEqual(anon_resp.status_code, status.HTTP_401_UNAUTHORIZED)

        # 2. Regular customer fails
        self.client.force_authenticate(user=target_customer)
        cust_resp = self.client.delete(url)
        self.assertEqual(cust_resp.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Admin cannot delete themselves
        self.client.force_authenticate(user=admin_boss)
        self_url = reverse('admin-user-detail', kwargs={'pk': admin_boss.id})
        self_resp = self.client.delete(self_url)
        self.assertEqual(self_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("own admin account", self_resp.data['detail'])

        # 4. Admin successfully deletes target customer
        del_resp = self.client.delete(url)
        self.assertEqual(del_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(del_resp.data.get('success'))

        # Verify user no longer exists
        self.assertFalse(User.objects.filter(id=target_customer.id).exists())

        # 5. Admin can delete a seller who has products and historical order items
        seller_user = User.objects.create_user(
            username='seller_delete_tester', email='seller_del@wangs.in',
            password='password123', role=User.Role.MANUFACTURER
        )
        seller_profile = ManufacturerProfile.objects.create(
            user=seller_user, business_name='Delete Test Pickles', slug='del-test-pickles',
            contact_email='seller_del@wangs.in', contact_phone='9000000000'
        )
        cat = Category.objects.first()
        prod = Product.objects.create(
            manufacturer=seller_profile, category=cat, title='Sample Pickle',
            slug='sample-pickle-del', price=Decimal('250.00'), weight_grams=250
        )
        test_order = Order.objects.create(
            order_number='TEST-DEL-ORD-01',
            customer_name='Tester',
            customer_email='t@wangs.in',
            customer_phone='9000000001',
            shipping_address_line1='10 Valley View',
            shipping_city='Kohima',
            shipping_state='Nagaland',
            shipping_postal_code='797001',
            items_subtotal=Decimal('250.00'),
            customer_platform_fee=Decimal('5.00'),
            delivery_fee=Decimal('50.00'),
            total_amount=Decimal('305.00'),
            platform_commission_total=Decimal('25.00'),
            manufacturer_payout_total=Decimal('225.00'),
        )
        order_item = OrderItem.objects.create(
            order=test_order, product=prod, manufacturer=seller_profile,
            product_title='Sample Pickle', weight_grams=250, unit_price=Decimal('250.00'),
            quantity=1, subtotal=Decimal('250.00'), commission_rate=Decimal('10.00'),
            commission_amount=Decimal('25.00'), manufacturer_payout=Decimal('225.00')
        )

        # Create inbound authorization request to verify it does not resurrect after user deletion
        AuditLog.objects.create(
            action='SELLER_AUTHORIZATION_REQUESTED',
            target_model='ManufacturerProfile',
            target_id='Delete Test Pickles',
            details={'email': 'seller_del@wangs.in', 'business_name': 'Delete Test Pickles'}
        )

        seller_url = reverse('admin-user-detail', kwargs={'pk': seller_user.id})
        seller_del_resp = self.client.delete(seller_url)
        self.assertEqual(seller_del_resp.status_code, status.HTTP_200_OK)
        self.assertFalse(User.objects.filter(id=seller_user.id).exists())
        self.assertFalse(ManufacturerProfile.objects.filter(id=seller_profile.id).exists())
        self.assertFalse(Product.objects.filter(id=prod.id).exists())
        # Inbound authorization request purged so it never resurrects in Yet to be Approved
        self.assertFalse(
            AuditLog.objects.filter(details__email='seller_del@wangs.in', action='SELLER_AUTHORIZATION_REQUESTED').exists()
        )
        req_url = reverse('admin-seller-requests')
        req_resp = self.client.get(req_url)
        self.assertEqual(req_resp.status_code, status.HTTP_200_OK)
        self.assertFalse(any(r.get('email') == 'seller_del@wangs.in' for r in req_resp.data))

        # Historical order and order item persist with snapshot preserved
        order_item.refresh_from_db()
        self.assertIsNone(order_item.manufacturer)
        self.assertIsNone(order_item.product)
        self.assertEqual(order_item.product_title, 'Sample Pickle')
        self.assertEqual(order_item.subtotal, Decimal('250.00'))

    def test_admin_research_report_pdf_and_csv(self):
        """Admin can access and maintain research records in PDF and CSV formats for customers, sellers, and products."""
        admin_boss = User.objects.create_user(
            username='admin_researcher', email='research_boss@wangs.in',
            password='adminpassword123', role=User.Role.ADMIN, is_staff=True
        )
        target_customer = User.objects.create_user(
            username='shopper_subject', email='subject@wangs.in',
            password='password123', role=User.Role.CUSTOMER
        )

        url = reverse('admin-research-reports')

        # 1. Anonymous access rejected
        anon_resp = self.client.get(url)
        self.assertEqual(anon_resp.status_code, status.HTTP_401_UNAUTHORIZED)

        # 2. Regular customer rejected
        self.client.force_authenticate(user=target_customer)
        cust_resp = self.client.get(url)
        self.assertEqual(cust_resp.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Admin retrieves JSON metadata
        self.client.force_authenticate(user=admin_boss)
        json_resp = self.client.get(url, {'format': 'json'})
        self.assertEqual(json_resp.status_code, status.HTTP_200_OK)
        self.assertIn('stats', json_resp.data)
        self.assertIn('downloads', json_resp.data)
        self.assertGreaterEqual(json_resp.data['stats']['total_users'], 2)

        # 4. Admin exports CSV format
        csv_resp = self.client.get(url, {'format': 'csv', 'type': 'all'})
        self.assertEqual(csv_resp.status_code, status.HTTP_200_OK)
        self.assertIn('text/csv', csv_resp['Content-Type'])
        content = csv_resp.content.decode('utf-8')
        self.assertIn("WANGS MARKETPLACE PLATFORM RESEARCH", content)
        self.assertIn("SECTION 1: CUSTOMER RESEARCH DIRECTORY", content)
        self.assertIn("SECTION 2: ARTISAN SELLER & PRODUCER ECOSYSTEM", content)
        self.assertIn("SECTION 3: PRODUCT CATALOG PERFORMANCE & INVENTORY", content)

        # 5. Admin exports PDF format
        pdf_resp = self.client.get(url, {'format': 'pdf'})
        self.assertEqual(pdf_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(pdf_resp['Content-Type'], 'application/pdf')
        self.assertTrue(pdf_resp.content.startswith(b'%PDF-1.4'))
        self.assertTrue(pdf_resp.content.endswith(b'%%EOF\n'))

    def test_seller_request_approve_and_delete_never_resurrects(self):
        """When an admin approves and deletes a seller, it never resurrects in Yet to be Approved."""
        admin = User.objects.create_user(
            username='admin_auth_tester', email='admin_tester@wangs.in',
            password='password123', role=User.Role.ADMIN, is_staff=True
        )
        self.client.force_authenticate(user=admin)

        # 1. Simulate inbound seller application
        req_log = AuditLog.objects.create(
            action='SELLER_AUTHORIZATION_REQUESTED',
            target_model='ManufacturerProfile',
            target_id='Zunheboto Spice Co',
            details={'email': 'zunheboto@wangs.in', 'business_name': 'Zunheboto Spice Co', 'location_district': 'Zunheboto'}
        )

        req_url = reverse('admin-seller-requests')

        # 2. Approve applicant
        with patch('marketplace.resend_service.dispatch_email') as mock_email:
            mock_email.return_value = (True, {'id': 'mock_approve_1'})
            app_resp = self.client.post(req_url, {'email': 'zunheboto@wangs.in'}, format='json')
            self.assertEqual(app_resp.status_code, status.HTTP_200_OK)

        approved_user = User.objects.get(email='zunheboto@wangs.in')
        self.assertTrue(approved_user.can_sell)

        # 3. Admin deletes the user from Admin Users
        del_user_url = reverse('admin-user-detail', kwargs={'pk': approved_user.id})
        del_resp = self.client.delete(del_user_url)
        self.assertEqual(del_resp.status_code, status.HTTP_200_OK)

        # 4. Verify request does NOT reappear in Yet to be Approved queue
        list_resp = self.client.get(req_url)
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        self.assertFalse(any(r.get('email') == 'zunheboto@wangs.in' for r in list_resp.data))

        # 5. Verify dismissing a request cleans up duplicate requests for that email
        AuditLog.objects.create(
            action='SELLER_AUTHORIZATION_REQUESTED',
            target_model='ManufacturerProfile',
            target_id='Dup Co 1',
            details={'email': 'dup@wangs.in', 'business_name': 'Dup Co'}
        )
        dup2 = AuditLog.objects.create(
            action='SELLER_AUTHORIZATION_REQUESTED',
            target_model='ManufacturerProfile',
            target_id='Dup Co 2',
            details={'email': 'dup@wangs.in', 'business_name': 'Dup Co'}
        )
        del_req_resp = self.client.delete(req_url, {'id': dup2.id, 'email': 'dup@wangs.in'}, format='json')
        self.assertEqual(del_req_resp.status_code, status.HTTP_200_OK)
        self.assertFalse(AuditLog.objects.filter(details__email='dup@wangs.in').exists())

    def test_otp_email_recipient_strictly_matches_user_input_not_admin(self):
        """
        Verify that OTP email is dispatched strictly to the entered applicant/user email,
        never redirected to the platform support/admin email.
        """
        from unittest.mock import patch
        entered_applicant_email = 'applicant_seller@brand.in'

        with patch('marketplace.resend_service.dispatch_email') as mock_dispatch:
            mock_dispatch.return_value = (True, {'provider': 'SMTP', 'to': entered_applicant_email})
            resp = self.client.post(reverse('auth-send-otp'), {
                'email': entered_applicant_email,
                'purpose': 'SELLER_REQUEST'
            }, format='json')
            self.assertEqual(resp.status_code, status.HTTP_200_OK)
            self.assertTrue(resp.data['success'])
            self.assertEqual(resp.data['recipient'], entered_applicant_email)
            self.assertIn(entered_applicant_email, resp.data['message'])

            # Verify mock_dispatch was called with the entered applicant email as recipient
            self.assertTrue(mock_dispatch.called)
            recipient_arg = mock_dispatch.call_args[0][0]
            self.assertEqual(recipient_arg, entered_applicant_email)
            self.assertNotEqual(recipient_arg, 'wangssupport@gmail.com')

    def test_seller_request_notifies_support_admin_and_seller_applicant(self):
        """
        When a seller submits authorization request:
        1. Wangs Support (wangssupport@gmail.com) receives the administrative alert.
        2. The applicant receives an official confirmation email at their entered address.
        """
        from unittest.mock import patch
        applicant_email = 'new_artisan@hills.in'

        # Seed verified OTP
        EmailOTP.objects.create(
            email=applicant_email,
            otp_code='123456',
            purpose='SELLER_REQUEST',
            is_used=True,
            expires_at=timezone.now() + datetime.timedelta(minutes=10)
        )

        with patch('marketplace.resend_service.dispatch_email') as mock_dispatch:
            mock_dispatch.return_value = (True, {'id': 'mock_id'})
            req_url = reverse('request-seller-access')
            resp = self.client.post(req_url, {
                'business_name': 'Hills Slow Cure',
                'email': applicant_email,
                'phone': '+91 94360 88888',
                'location_district': 'Mokokchung',
                'fssai_number': '12345678901234',
                'message': 'Traditional smoked pork and fermented bamboo shoot pickles',
            }, format='json')
            self.assertEqual(resp.status_code, status.HTTP_200_OK)
            self.assertTrue(resp.data['success'])

            # Verify dispatch_email was called for both:
            # 1) wangssupport@gmail.com (admin notification)
            # 2) new_artisan@hills.in (applicant confirmation)
            dispatched_recipients = [call[0][0] for call in mock_dispatch.call_args_list]
            self.assertIn('wangssupport@gmail.com', dispatched_recipients)
            self.assertIn(applicant_email, dispatched_recipients)

    def test_order_lookup_security_and_authorization(self):
        """
        Verify OrderLookupView security:
        1. Anonymous guest cannot lookup an older order without email/phone verification (403).
        2. With matching customer email/phone in query, lookup succeeds (200).
        3. Authenticated owner can access their order directly.
        """
        buyer = User.objects.create_user(
            username='sec_buyer_user',
            email='buyer_sec@wangs.in',
            password='buyerpass123',
            role=User.Role.CUSTOMER
        )
        past_order = Order.objects.create(
            order_number='WNG-TEST-SEC-1',
            user=buyer,
            customer_name='Sec Test Buyer',
            customer_email='buyer_sec@wangs.in',
            customer_phone='+91 94360 11111',
            shipping_address_line1='Main Road',
            shipping_city='Kohima',
            shipping_state='Nagaland',
            shipping_postal_code='797001',
            items_subtotal=Decimal('500.00'),
            customer_platform_fee=Decimal('5.00'),
            delivery_fee=Decimal('50.00'),
            total_amount=Decimal('555.00'),
            platform_commission_total=Decimal('50.00'),
            manufacturer_payout_total=Decimal('450.00'),
            payment_status=Order.PaymentStatus.PAID
        )
        # Fast-forward created_at to simulate an order from hours ago
        Order.objects.filter(id=past_order.id).update(
            created_at=timezone.now() - datetime.timedelta(hours=2)
        )

        lookup_url = reverse('order-lookup', kwargs={'order_number': 'WNG-TEST-SEC-1'})

        # 1. Unauthenticated request without verification returns 403 Forbidden
        self.client.logout()
        unauth_resp = self.client.get(lookup_url)
        self.assertEqual(unauth_resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('verification required', unauth_resp.data['detail'].lower())

        # 2. Unauthenticated request with wrong email returns 403 Forbidden
        wrong_verify_resp = self.client.get(f"{lookup_url}?verify=wrong@wangs.in")
        self.assertEqual(wrong_verify_resp.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Unauthenticated request with matching email returns 200 OK
        correct_verify_resp = self.client.get(f"{lookup_url}?verify=buyer_sec@wangs.in")
        self.assertEqual(correct_verify_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(correct_verify_resp.data['order_number'], 'WNG-TEST-SEC-1')

        # 4. Authenticated owner directly returns 200 OK without verification parameter
        self.client.force_authenticate(user=buyer)
        owner_resp = self.client.get(lookup_url)
        self.assertEqual(owner_resp.status_code, status.HTTP_200_OK)

    def test_login_brute_force_lockout_protection(self):
        """
        Verify that 8 consecutive failed login attempts trigger a 429 rate limit lock.
        """
        self.client.logout()
        login_url = reverse('auth-login')

        for _ in range(8):
            AuditLog.objects.create(
                action='LOGIN_FAILED',
                target_model='User',
                target_id='target_user',
                details={'identifier': 'target_user@wangs.in'}
            )

        resp = self.client.post(login_url, {
            'username': 'target_user@wangs.in',
            'password': 'wrongpassword123'
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn('temporarily restricted', resp.data['detail'])

    def test_delivery_portal_lookup_and_mark_delivered(self):
        """
        Verify Delivery Portal:
        1. Courier can look up order via /api/delivery/order/<identifier>/
        2. Customer products, address, coordinates, and maps link are returned.
        3. Courier can mark parcel delivered via /mark-delivered/
        4. Active parcels queue returns active orders.
        """
        buyer = User.objects.create_user(
            username='delivery_buyer',
            email='delbuyer@wangs.in',
            password='buyerpass123',
            role=User.Role.CUSTOMER
        )
        del_order = Order.objects.create(
            order_number='WNG-TEST-DEL-1',
            user=buyer,
            customer_name='Delivery Recipient',
            customer_email='delbuyer@wangs.in',
            customer_phone='+91 94360 22222',
            shipping_address_line1='Opposite Post Office, High School Area',
            shipping_city='Kohima',
            shipping_state='Nagaland',
            shipping_postal_code='797001',
            items_subtotal=Decimal('350.00'),
            customer_platform_fee=Decimal('5.00'),
            delivery_fee=Decimal('50.00'),
            total_amount=Decimal('405.00'),
            platform_commission_total=Decimal('35.00'),
            manufacturer_payout_total=Decimal('315.00'),
            status=Order.Status.DISPATCHED,
            payment_status=Order.PaymentStatus.PAID
        )
        OrderItem.objects.create(
            order=del_order,
            product_title='Organic King Chilli Pickle',
            weight_grams=250,
            unit_price=Decimal('350.00'),
            quantity=1,
            subtotal=Decimal('350.00'),
            commission_rate=Decimal('10.00'),
            commission_amount=Decimal('35.00'),
            manufacturer_payout=Decimal('315.00'),
            fulfillment_status=OrderItem.FulfillmentStatus.DISPATCHED
        )

        # Create approved courier for authenticated testing
        courier_user = User.objects.create_user(
            username='runner_john',
            email='runner@wangs.in',
            password='Password123!',
            role=User.Role.COURIER,
            phone_number='9876543210',
            first_name='John Runner'
        )
        CourierProfile.objects.create(
            user=courier_user,
            full_name='John Runner',
            phone_number='9876543210',
            email='runner@wangs.in',
            status=CourierProfile.Status.APPROVED,
            is_active=True
        )

        # 0. Unauthenticated access blocked
        unauth_resp = self.client.get(f'/api/delivery/order/{del_order.order_number}/')
        self.assertIn(unauth_resp.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

        # Authenticate as approved courier
        self.client.force_authenticate(user=courier_user)

        # 1. Lookup
        resp = self.client.get(f'/api/delivery/order/{del_order.order_number}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['customer_name'], 'Delivery Recipient')
        self.assertEqual(resp.data['shipping_city'], 'Kohima')
        self.assertIn('coordinates', resp.data)
        self.assertIn('items', resp.data)
        self.assertEqual(len(resp.data['items']), 1)

        # 2. Mark delivered
        mark_resp = self.client.post(f'/api/delivery/order/{del_order.order_number}/mark-delivered/', {
            'notes': 'Delivered to recipient with signature.'
        }, format='json')
        self.assertEqual(mark_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(mark_resp.data['success'])

        del_order.refresh_from_db()
        self.assertEqual(del_order.status, Order.Status.DELIVERED)

        # 3. Active queue
        queue_resp = self.client.get('/api/delivery/active/')
        self.assertEqual(queue_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(any(o['order_number'] == 'WNG-TEST-DEL-1' for o in queue_resp.data))

    def test_ensure_admin_management_command_and_login(self):
        """
        Verify that ensure_admin management command creates or updates
        the administrator using environment variables and enables valid login.
        """
        from django.core.management import call_command
        import os

        old_user = os.environ.get('DJANGO_ADMIN_USERNAME')
        old_pass = os.environ.get('DJANGO_ADMIN_PASSWORD')

        try:
            os.environ['DJANGO_ADMIN_USERNAME'] = 'render_prod_admin'
            os.environ['DJANGO_ADMIN_PASSWORD'] = 'RenderSuperSecretPass2026!'

            call_command('ensure_admin')

            admin = User.objects.filter(username='render_prod_admin').first()
            self.assertIsNotNone(admin)
            self.assertEqual(admin.role, User.Role.ADMIN)
            self.assertTrue(admin.is_staff)
            self.assertTrue(admin.is_superuser)
            self.assertTrue(admin.is_active)
            self.assertFalse(admin.is_banned)
            self.assertTrue(admin.check_password('RenderSuperSecretPass2026!'))

            # Verify login endpoint accepts these credentials
            login_resp = self.client.post('/api/auth/login/', {
                'username': 'render_prod_admin',
                'password': 'RenderSuperSecretPass2026!'
            }, format='json')
            self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
            self.assertIn('token', login_resp.data)
            self.assertEqual(login_resp.data['user']['role'], 'ADMIN')
            self.assertTrue(login_resp.data['user']['is_staff'])

            # Verify incorrect password is rejected with 401
            bad_login_resp = self.client.post('/api/auth/login/', {
                'username': 'render_prod_admin',
                'password': 'WrongPassword123'
            }, format='json')
            self.assertEqual(bad_login_resp.status_code, status.HTTP_401_UNAUTHORIZED)
            self.assertEqual(bad_login_resp.data['detail'], 'Invalid credentials')

        finally:
            if old_user is not None:
                os.environ['DJANGO_ADMIN_USERNAME'] = old_user
            else:
                os.environ.pop('DJANGO_ADMIN_USERNAME', None)
            if old_pass is not None:
                os.environ['DJANGO_ADMIN_PASSWORD'] = old_pass
            else:
                os.environ.pop('DJANGO_ADMIN_PASSWORD', None)


class WangsRewardsSystemTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.comm_setting = CommissionSetting.objects.create(
            default_commission_rate=Decimal('10.00'),
            customer_platform_fee=Decimal('5.00'),
            default_delivery_fee=Decimal('50.00'),
            free_delivery_threshold=Decimal('999.00')
        )
        DeliveryRate.objects.create(
            title='Platform Default Test Rate',
            scope=DeliveryRate.Scope.ADMIN_DEFAULT,
            delivery_method=DeliveryRate.DeliveryMethod.STANDARD,
            base_rate=Decimal('0.00'),
            per_package_rate=Decimal('0.00'),
            is_active=True,
            approval_status=DeliveryRate.ApprovalStatus.APPROVED
        )
        self.reward_settings = RewardSettings.get_settings()
        self.reward_settings.is_enabled = True
        self.reward_settings.credit_value_rupees = Decimal('0.10')
        self.reward_settings.credits_per_unit = 1
        self.reward_settings.save()

        # Users
        self.customer1 = User.objects.create_user(
            username='shopper1', email='shopper1@wangs.in', password='password123',
            role=User.Role.CUSTOMER, first_name='Shopper', last_name='One'
        )
        self.customer2 = User.objects.create_user(
            username='shopper2', email='shopper2@wangs.in', password='password123',
            role=User.Role.CUSTOMER, first_name='Shopper', last_name='Two'
        )
        self.courier1 = User.objects.create_user(
            username='courier_john', email='courier_john@wangs.in', password='password123',
            role=User.Role.COURIER, first_name='John', last_name='Delivery'
        )
        CourierProfile.objects.create(
            user=self.courier1,
            full_name='John Delivery',
            phone_number='9862111111',
            email='courier_john@wangs.in',
            status=CourierProfile.Status.APPROVED,
            is_active=True
        )
        self.courier2 = User.objects.create_user(
            username='courier_dave', email='courier_dave@wangs.in', password='password123',
            role=User.Role.COURIER, first_name='Dave', last_name='Fleet'
        )
        CourierProfile.objects.create(
            user=self.courier2,
            full_name='Dave Fleet',
            phone_number='9862222222',
            email='courier_dave@wangs.in',
            status=CourierProfile.Status.APPROVED,
            is_active=True
        )
        self.admin_user = User.objects.create_user(
            username='rewards_admin', email='rewards_admin@wangs.in', password='password123',
            role=User.Role.ADMIN, is_staff=True, is_superuser=True
        )

        # Manufacturer & Products
        self.mfg_user = User.objects.create_user(
            username='artisan_mfg', email='artisan_mfg@wangs.in', password='password123',
            role=User.Role.MANUFACTURER
        )
        self.mfg = ManufacturerProfile.objects.create(
            user=self.mfg_user, business_name="Nagaland Heritage Pickles",
            slug='nagaland-heritage-pickles', location_district='Mokokchung',
            contact_email='artisan_mfg@wangs.in', contact_phone='9436099999',
            business_address='Mokokchung', postal_code='798601',
            fssai_license_number='10023064000999', status=ManufacturerProfile.Status.APPROVED
        )
        self.cat = Category.objects.create(name='Achar', slug='achar')
        self.product1 = Product.objects.create(
            manufacturer=self.mfg, category=self.cat, title="Ghost Pepper Pickle",
            slug='ghost-pepper-pickle', price=Decimal('250.00'), weight_grams=250,
            stock_quantity=100, is_active=True, status=Product.Status.APPROVED
        )
        self.product2 = Product.objects.create(
            manufacturer=self.mfg, category=self.cat, title="Bamboo Shoot Pickle",
            slug='bamboo-shoot-pickle', price=Decimal('180.00'), weight_grams=250,
            stock_quantity=100, is_active=True, status=Product.Status.APPROVED
        )

    def _create_test_order(self, customer, items_spec, assigned_courier=None):
        """Helper to create an order with specified quantities of products"""
        cart_items = []
        for p, qty in items_spec:
            cart = Cart.objects.create(user=customer)
            item = CartItem.objects.create(cart=cart, product=p, quantity=qty)
            cart_items.append(item)

        cust_name = customer.get_full_name() if customer else 'Guest Shopper'
        cust_email = customer.email if customer else 'guest@example.com'
        order = OrderService.create_order_from_cart(
            user=customer,
            customer_details={'name': cust_name, 'email': cust_email, 'phone': '9876543210'},
            shipping_details={'address_line1': 'Pantry Road', 'city': 'Dimapur', 'state': 'Nagaland', 'postal_code': '797112'},
            cart_items=cart_items,
            payment_method='RAZORPAY_TEST'
        )
        order.payment_status = Order.PaymentStatus.PAID
        order.status = Order.Status.CONFIRMED
        if assigned_courier:
            order.assigned_courier = assigned_courier
        order.save()
        return order

    def test_unique_qr_generation_per_unit(self):
        """Order with 3 units of product 1 and 2 units of product 2 must generate 5 unique OrderUnits and 5 unique QR tokens"""
        order = self._create_test_order(self.customer1, [(self.product1, 3), (self.product2, 2)])
        units = OrderUnit.objects.filter(order=order)
        self.assertEqual(units.count(), 5)

        # Check unique tokens
        tokens = [u.qr_code.token for u in units]
        self.assertEqual(len(tokens), 5)
        self.assertEqual(len(set(tokens)), 5)

        for token in tokens:
            self.assertTrue(token.startswith('WNG-QR-'))
            self.assertGreaterEqual(len(token), 20)

    def test_successful_customer_qr_scan(self):
        """Customer scans valid QR code -> delivery confirmed, 1 credit awarded, wallet updated"""
        order = self._create_test_order(self.customer1, [(self.product1, 1)])
        unit = order.units.first()
        token = unit.qr_code.token

        self.client.force_authenticate(user=self.customer1)
        resp = self.client.post('/api/rewards/scan/', {'token': token}, format='json')

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['success'])
        self.assertFalse(resp.data['already_claimed'])
        self.assertTrue(resp.data['reward_awarded'])
        self.assertEqual(resp.data['credits_awarded'], 1)
        self.assertEqual(resp.data['current_balance'], 1)
        self.assertIn("Congratulations! Your product delivery is confirmed.", resp.data['message'])
        self.assertIn("You earned 1 Wangs Credit!", resp.data['message'])

        # Verify DB state
        unit.refresh_from_db()
        self.assertTrue(unit.is_delivered)
        self.assertTrue(unit.reward_awarded)
        self.assertTrue(unit.qr_code.is_claimed)
        self.assertEqual(unit.qr_code.claimed_by, self.customer1)

        wallet = CustomerRewardWallet.objects.get(user=self.customer1)
        self.assertEqual(wallet.balance, 1)
        self.assertEqual(wallet.total_earned, 1)

        # Transaction record
        tx = RewardTransaction.objects.filter(user=self.customer1, transaction_type='EARN').first()
        self.assertIsNotNone(tx)
        self.assertEqual(tx.credits, 1)
        self.assertEqual(tx.balance_after, 1)

    def test_successful_courier_confirmation(self):
        """Courier marks unit as delivered -> awards 1 credit to customer and updates delivery source"""
        order = self._create_test_order(self.customer1, [(self.product1, 1)], assigned_courier=self.courier1)
        unit = order.units.first()

        self.client.force_authenticate(user=self.courier1)
        resp = self.client.post(f'/api/delivery/order/{order.order_number}/mark-delivered/', {
            'notes': 'Delivered to customer doorstep'
        }, format='json')

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['success'])

        unit.refresh_from_db()
        self.assertTrue(unit.is_delivered)
        self.assertTrue(unit.reward_awarded)
        self.assertEqual(unit.get_confirmation_source_display(), 'Courier Confirmation')

        wallet = CustomerRewardWallet.objects.get(user=self.customer1)
        self.assertEqual(wallet.balance, 1)

    def test_customer_and_courier_confirmation_of_same_product(self):
        """Customer scans first (awards 1 credit), then courier confirms later (records courier confirmation, 0 extra credits, displays Both Confirmed)"""
        order = self._create_test_order(self.customer1, [(self.product1, 1)], assigned_courier=self.courier1)
        unit = order.units.first()
        token = unit.qr_code.token

        # 1. Customer scans first
        self.client.force_authenticate(user=self.customer1)
        scan_resp = self.client.post('/api/rewards/scan/', {'token': token}, format='json')
        self.assertEqual(scan_resp.data['credits_awarded'], 1)

        # 2. Courier confirms afterwards
        self.client.force_authenticate(user=self.courier1)
        courier_resp = self.client.post(f'/api/delivery/order/{order.order_number}/mark-delivered/', {}, format='json')
        self.assertEqual(courier_resp.status_code, status.HTTP_200_OK)

        # 3. Wallet must still have exactly 1 credit, not 2
        wallet = CustomerRewardWallet.objects.get(user=self.customer1)
        self.assertEqual(wallet.balance, 1)

        # 4. Confirmation source must show 'Both Confirmed'
        unit.refresh_from_db()
        self.assertEqual(unit.get_confirmation_source_display(), 'Both Confirmed')
        self.assertEqual(unit.confirmations.count(), 2)

    def test_duplicate_qr_scanning(self):
        """Scanning an already claimed QR code must not award another credit and return exact warning message"""
        order = self._create_test_order(self.customer1, [(self.product1, 1)])
        unit = order.units.first()
        token = unit.qr_code.token

        self.client.force_authenticate(user=self.customer1)
        # Scan 1: awards 1 credit
        self.client.post('/api/rewards/scan/', {'token': token}, format='json')

        # Scan 2: already claimed
        resp2 = self.client.post('/api/rewards/scan/', {'token': token}, format='json')
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertTrue(resp2.data['already_claimed'])
        self.assertFalse(resp2.data['reward_awarded'])
        self.assertEqual(resp2.data['credits_awarded'], 0)
        self.assertEqual(resp2.data['message'], "This QR code has already been used. Rewards have already been claimed.")

        wallet = CustomerRewardWallet.objects.get(user=self.customer1)
        self.assertEqual(wallet.balance, 1)

    def test_unauthorized_customer_scanning(self):
        """Customer B scanning a QR code from Customer A's order must be blocked with 403 Forbidden and logged"""
        order_cust1 = self._create_test_order(self.customer1, [(self.product1, 1)])
        token = order_cust1.units.first().qr_code.token

        # Customer 2 attempts to scan Customer 1's QR
        self.client.force_authenticate(user=self.customer2)
        resp = self.client.post('/api/rewards/scan/', {'token': token}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("purchased by another customer", resp.data['detail'])

        # Check suspicious log created
        log = SuspiciousScanLog.objects.filter(user=self.customer2).first()
        self.assertIsNotNone(log)
        self.assertIn("Unauthorized scan", log.reason)

    def test_unauthorized_courier_confirmation(self):
        """Courier B cannot confirm delivery for an order assigned to Courier A without admin authorization"""
        order = self._create_test_order(self.customer1, [(self.product1, 1)], assigned_courier=self.courier1)

        # Courier 2 attempts to confirm Courier 1's assigned parcel
        self.client.force_authenticate(user=self.courier2)
        resp = self.client.post(f'/api/delivery/order/{order.order_number}/mark-delivered/', {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("assigned to another delivery agent", resp.data['detail'])

    def test_multiple_products_award_multiple_credits(self):
        """A customer purchasing 5 units earns exactly 5 credits when all 5 are confirmed delivered"""
        order = self._create_test_order(self.customer1, [(self.product1, 3), (self.product2, 2)])
        self.assertEqual(order.units.count(), 5)

        self.client.force_authenticate(user=self.customer1)
        for unit in order.units.all():
            resp = self.client.post('/api/rewards/scan/', {'token': unit.qr_code.token}, format='json')
            self.assertEqual(resp.status_code, status.HTTP_200_OK)
            self.assertEqual(resp.data['credits_awarded'], 1)

        wallet = CustomerRewardWallet.objects.get(user=self.customer1)
        self.assertEqual(wallet.balance, 5)
        self.assertEqual(wallet.total_earned, 5)

    def test_parcel_unboxing_qr_one_time_use_and_guest_claim(self):
        """Parcel QR unboxing can be claimed by customer, awards 1 credit, and cannot be reused"""
        # Create guest order with no user
        order = self._create_test_order(None, [(self.product1, 2)])
        order.customer_email = self.customer1.email
        order.save(update_fields=['customer_email'])

        self.client.force_authenticate(user=self.customer1)
        unboxing_url = f"https://wangs.in/account?unboxing={order.order_number}"

        # 1. First scan awards 1 credit
        resp1 = self.client.post('/api/rewards/scan/', {'token': unboxing_url}, format='json')
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        self.assertTrue(resp1.data['reward_awarded'])
        self.assertEqual(resp1.data['credits_awarded'], 1)
        self.assertEqual(resp1.data['current_balance'], 1)

        wallet = CustomerRewardWallet.objects.get(user=self.customer1)
        self.assertEqual(wallet.balance, 1)

        # 2. Re-scanning the same parcel QR cannot be used again
        resp2 = self.client.post('/api/rewards/scan/', {'token': unboxing_url}, format='json')
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertTrue(resp2.data['already_claimed'])
        self.assertFalse(resp2.data['reward_awarded'])
        self.assertEqual(resp2.data['credits_awarded'], 0)
        self.assertIn("already been scanned and redeemed", resp2.data['message'])

        # Balance remains 1
        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, 1)

    def test_checkout_credit_redemption(self):
        """Customer with 50 credits redeems 30 credits at checkout (10 credits = ₹1) -> ₹3 discount applied and 30 credits deducted"""
        wallet = CustomerRewardWallet.objects.create(
            user=self.customer1, balance=50, total_earned=50, total_redeemed=0
        )

        cart = Cart.objects.create(user=self.customer1)
        item = CartItem.objects.create(cart=cart, product=self.product1, quantity=1)

        order = OrderService.create_order_from_cart(
            user=self.customer1,
            customer_details={'name': 'Shopper One', 'email': self.customer1.email, 'phone': '9876543210'},
            shipping_details={'address_line1': 'Pantry Road', 'city': 'Dimapur', 'state': 'Nagaland', 'postal_code': '797112'},
            cart_items=[item],
            credits_to_redeem=30
        )

        self.assertEqual(order.credits_redeemed, 30)
        self.assertEqual(order.credit_discount_amount, Decimal('3.00'))

        # Expected total: items_subtotal (250) + platform_fee (5) + delivery (0 free) - credit_discount (3) = 252.00
        expected_total = Decimal('250.00') + Decimal('5.00') - Decimal('3.00')
        self.assertEqual(order.total_amount, expected_total)

        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, 20)
        self.assertEqual(wallet.total_redeemed, 30)

        redeem_tx = RewardTransaction.objects.filter(user=self.customer1, transaction_type='REDEEM').first()
        self.assertIsNotNone(redeem_tx)
        self.assertEqual(redeem_tx.credits, -30)

    def test_admin_manual_balance_adjustment(self):
        """Admin can manually adjust wallet balance with audit reason"""
        self.client.force_authenticate(user=self.admin_user)
        resp = self.client.post('/api/admin/rewards/adjust-balance/', {
            'username': self.customer1.username,
            'delta': 10,
            'reason': 'Customer loyalty bonus approved by management'
        }, format='json')

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['success'])
        self.assertEqual(resp.data['new_balance'], 10)

        wallet = CustomerRewardWallet.objects.get(user=self.customer1)
        self.assertEqual(wallet.balance, 10)

        tx = RewardTransaction.objects.filter(user=self.customer1, transaction_type='ADMIN_ADJUSTMENT').first()
        self.assertIsNotNone(tx)
        self.assertEqual(tx.audit_reason, 'Customer loyalty bonus approved by management')

    def test_admin_revoke_qr_code(self):
        """Admin can revoke an unused QR code, preventing future scans"""
        order = self._create_test_order(self.customer1, [(self.product1, 1)])
        unit = order.units.first()
        qr = unit.qr_code

        self.client.force_authenticate(user=self.admin_user)
        resp = self.client.post(f'/api/admin/rewards/revoke/{qr.id}/', {
            'reason': 'Packaging damaged prior to dispatch'
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['is_revoked'])

        # Customer attempts to scan revoked QR
        self.client.force_authenticate(user=self.customer1)
        scan_resp = self.client.post('/api/rewards/scan/', {'token': qr.token}, format='json')
        self.assertEqual(scan_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("revoked", scan_resp.data['detail'])

    def test_claim_reward_via_unboxing_url_and_order_number(self):
        """Customer can scan or submit shipping parcel QR link or order number to claim reward"""
        order = self._create_test_order(self.customer1, [(self.product1, 1)])
        unit = order.units.first()

        self.client.force_authenticate(user=self.customer1)

        # 1. Claim using full parcel label unboxing URL
        unboxing_url = f"https://wangs.in/account?unboxing={order.order_number}"
        resp = self.client.post('/api/rewards/scan/', {'token': unboxing_url}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['success'])
        self.assertTrue(resp.data['reward_awarded'])
        self.assertEqual(resp.data['order_number'], order.order_number)

        # 2. Scanning again returns already_claimed=True with product details
        resp2 = self.client.post('/api/rewards/scan/', {'token': order.order_number}, format='json')
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertTrue(resp2.data['already_claimed'])
        self.assertEqual(resp2.data['product_name'], self.product1.title)


class WangsCourierSystemTests(TestCase):
    def setUp(self):
        self.admin_user = User.objects.create_superuser(
            username='wangs_admin',
            email='admin@wangs.in',
            password='AdminPassword123!'
        )
        self.comm_setting = CommissionSetting.objects.create(
            default_commission_rate=Decimal('10.00'),
            customer_platform_fee=Decimal('5.00'),
            default_delivery_fee=Decimal('50.00'),
            free_delivery_threshold=Decimal('999.00')
        )
        DeliveryRate.objects.create(
            title='Platform Default Test Rate',
            scope=DeliveryRate.Scope.ADMIN_DEFAULT,
            delivery_method=DeliveryRate.DeliveryMethod.STANDARD,
            base_rate=Decimal('0.00'),
            per_package_rate=Decimal('0.00'),
            is_active=True,
            approval_status=DeliveryRate.ApprovalStatus.APPROVED
        )
        self.mfg_user = User.objects.create_user(
            username='mfg_runner',
            email='mfg@wangs.in',
            password='password123',
            role=User.Role.MANUFACTURER
        )
        self.mfg_profile = ManufacturerProfile.objects.create(
            user=self.mfg_user,
            business_name="Wangs Kitchens",
            slug='wangs-kitchens',
            status=ManufacturerProfile.Status.APPROVED
        )
        self.cat = Category.objects.create(name='Pickle', slug='pickle')
        self.product = Product.objects.create(
            manufacturer=self.mfg_profile,
            category=self.cat,
            title='Naga King Chilli Pickle',
            slug='naga-king-chilli',
            price=Decimal('250.00'),
            weight_grams=250,
            stock_quantity=50,
            status=Product.Status.APPROVED
        )
        self.customer = User.objects.create_user(
            username='cust_alex',
            email='alex@wangs.in',
            password='password123',
            role=User.Role.CUSTOMER,
            phone_number='9999911111'
        )
        CustomerProfile.objects.create(user=self.customer)
        self.client = APIClient()

    def test_courier_registration_creates_pending_account(self):
        payload = {
            'full_name': 'Temsu Jamir',
            'phone_number': '9862123456',
            'email': 'temsu@wangs.in',
            'password': 'CourierPass123!',
            'confirm_password': 'CourierPass123!',
            'courier_company': 'Wangs Express Kohima Hub',
            'vehicle_type': 'BIKE',
            'vehicle_number': 'NL-01-AB-1234',
            'service_area_city': 'Kohima',
            'address': 'High School Junction, Kohima'
        }
        resp = self.client.post('/api/courier/register/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['status'], 'PENDING')

        # Check DB
        courier_user = User.objects.get(email='temsu@wangs.in')
        self.assertEqual(courier_user.role, User.Role.COURIER)
        profile = CourierProfile.objects.get(user=courier_user)
        self.assertEqual(profile.status, CourierProfile.Status.PENDING)
        self.assertFalse(courier_user.is_approved_courier())

    def test_courier_registration_with_file_upload(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        fake_id = SimpleUploadedFile("license.jpg", b"fake_driver_license_file_content", content_type="image/jpeg")
        payload = {
            'full_name': 'Keneilhou Solo',
            'phone_number': '9862555555',
            'email': 'solo@wangs.in',
            'password': 'CourierPass123!',
            'confirm_password': 'CourierPass123!',
            'courier_company': 'Wangs Express Kohima Hub',
            'vehicle_type': 'BIKE',
            'vehicle_number': 'NL-01-AB-9876',
            'service_area_city': 'Kohima',
            'address': 'High School Junction, Kohima',
            'identity_document': fake_id
        }
        resp = self.client.post('/api/courier/register/', payload, format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['status'], 'PENDING')

        profile = CourierProfile.objects.get(email='solo@wangs.in')
        self.assertTrue(bool(profile.identity_document))

    def test_duplicate_registration_rejected(self):
        payload = {
            'full_name': 'Temsu Jamir',
            'phone_number': '9862123456',
            'email': 'temsu@wangs.in',
            'password': 'CourierPass123!',
            'confirm_password': 'CourierPass123!',
            'vehicle_type': 'BIKE',
            'vehicle_number': 'NL-01-AB-1234'
        }
        resp1 = self.client.post('/api/courier/register/', payload, format='json')
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)

        resp2 = self.client.post('/api/courier/register/', payload, format='json')
        self.assertEqual(resp2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_pending_courier_cannot_access_delivery_portal(self):
        # Register courier
        courier_user = User.objects.create_user(
            username='courier_pending',
            email='pending@wangs.in',
            password='CourierPass123!',
            role=User.Role.COURIER
        )
        CourierProfile.objects.create(
            user=courier_user,
            full_name='Pending Courier',
            phone_number='9862000001',
            email='pending@wangs.in',
            status=CourierProfile.Status.PENDING
        )

        # Login returns pending status
        login_resp = self.client.post('/api/courier/login/', {
            'username': 'pending@wangs.in',
            'password': 'CourierPass123!'
        }, format='json')
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(login_resp.data['status'], 'PENDING')

        # Accessing delivery orders while authenticated as pending courier should be 403
        self.client.force_authenticate(user=courier_user)
        del_resp = self.client.get('/api/delivery/active/')
        self.assertEqual(del_resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_approve_courier_and_delivery_flow(self):
        courier_user = User.objects.create_user(
            username='courier_flow',
            email='flow@wangs.in',
            password='CourierPass123!',
            role=User.Role.COURIER
        )
        profile = CourierProfile.objects.create(
            user=courier_user,
            full_name='Flow Runner',
            phone_number='9862000002',
            email='flow@wangs.in',
            status=CourierProfile.Status.PENDING
        )

        # Admin approves
        self.client.force_authenticate(user=self.admin_user)
        approve_resp = self.client.post(f'/api/admin/couriers/{profile.id}/approve/', {
            'admin_notes': 'Documents verified and on-boarded'
        }, format='json')
        self.assertEqual(approve_resp.status_code, status.HTTP_200_OK)

        profile.refresh_from_db()
        self.assertEqual(profile.status, CourierProfile.Status.APPROVED)
        self.assertTrue(courier_user.is_approved_courier())

        # Create dispatched order assigned to this courier
        order = Order.objects.create(
            order_number='ORD-TEST-FLOW-01',
            user=self.customer,
            customer_name='Alex Customer',
            customer_email='alex@wangs.in',
            customer_phone='9999911111',
            shipping_address_line1='Main Street',
            shipping_city='Kohima',
            shipping_state='Nagaland',
            shipping_postal_code='797001',
            items_subtotal=Decimal('250.00'),
            customer_platform_fee=Decimal('5.00'),
            delivery_fee=Decimal('50.00'),
            total_amount=Decimal('305.00'),
            platform_commission_total=Decimal('25.00'),
            manufacturer_payout_total=Decimal('225.00'),
            status=Order.Status.DISPATCHED,
            payment_status=Order.PaymentStatus.PAID,
            assigned_courier=courier_user
        )
        item = OrderItem.objects.create(
            order=order,
            product_title=self.product.title,
            weight_grams=250,
            unit_price=self.product.price,
            quantity=1,
            subtotal=self.product.price,
            commission_rate=Decimal('10.00'),
            commission_amount=Decimal('25.00'),
            manufacturer_payout=Decimal('225.00'),
            fulfillment_status=OrderItem.FulfillmentStatus.DISPATCHED
        )

        # Now courier can lookup active delivery orders
        self.client.force_authenticate(user=courier_user)
        lookup_resp = self.client.get(f'/api/delivery/order/{order.order_number}/')
        self.assertEqual(lookup_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(lookup_resp.data['order_number'], order.order_number)

        # Mark delivered
        deliver_resp = self.client.post(f'/api/delivery/order/{order.order_number}/mark-delivered/', {
            'confirmation_method': 'CAMERA_QR',
            'notes': 'Delivered to customer'
        }, format='json')
        self.assertEqual(deliver_resp.status_code, status.HTTP_200_OK)

        # Verify scan log & courier stats
        profile.refresh_from_db()
        self.assertEqual(profile.total_deliveries_completed, 1)
        self.assertIsNotNone(profile.last_delivery_at)
        log = CourierDeliveryScanLog.objects.filter(courier=courier_user, order=order).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.action, CourierDeliveryScanLog.Action.DELIVERED)

    def test_courier_assignment_enforcement(self):
        # Two approved couriers
        courier_a = User.objects.create_user(username='courier_a', email='a@wangs.in', password='pw', role=User.Role.COURIER)
        CourierProfile.objects.create(user=courier_a, full_name='Courier A', phone_number='9862000010', email='a@wangs.in', status=CourierProfile.Status.APPROVED)

        courier_b = User.objects.create_user(username='courier_b', email='b@wangs.in', password='pw', role=User.Role.COURIER)
        CourierProfile.objects.create(user=courier_b, full_name='Courier B', phone_number='9862000011', email='b@wangs.in', status=CourierProfile.Status.APPROVED)

        # Order assigned specifically to Courier A
        order = Order.objects.create(
            order_number='ORD-TEST-ASSIGN-01',
            user=self.customer,
            customer_name='Alex Customer',
            customer_email='alex@wangs.in',
            customer_phone='9999911111',
            shipping_address_line1='Main Street',
            shipping_city='Kohima',
            shipping_state='Nagaland',
            shipping_postal_code='797001',
            items_subtotal=Decimal('250.00'),
            customer_platform_fee=Decimal('5.00'),
            delivery_fee=Decimal('50.00'),
            total_amount=Decimal('305.00'),
            platform_commission_total=Decimal('25.00'),
            manufacturer_payout_total=Decimal('225.00'),
            status=Order.Status.DISPATCHED,
            payment_status=Order.PaymentStatus.PAID,
            assigned_courier=courier_a
        )

        # Courier B tries to confirm delivery
        self.client.force_authenticate(user=courier_b)
        deliver_resp = self.client.post(f'/api/delivery/order/{order.order_number}/mark-delivered/', {
            'confirmation_method': 'MANUAL_SEARCH'
        }, format='json')
        self.assertEqual(deliver_resp.status_code, status.HTTP_403_FORBIDDEN)

        # Courier A confirms delivery successfully
        self.client.force_authenticate(user=courier_a)
        deliver_resp_a = self.client.post(f'/api/delivery/order/{order.order_number}/mark-delivered/', {
            'confirmation_method': 'CAMERA_QR'
        }, format='json')
        self.assertEqual(deliver_resp_a.status_code, status.HTTP_200_OK)

    def test_admin_courier_approval_dispatches_email(self):
        from unittest.mock import patch
        courier_user = User.objects.create_user(
            username='courier_email_target',
            email='driver@wangs.in',
            password='Password123!',
            role=User.Role.COURIER
        )
        profile = CourierProfile.objects.create(
            user=courier_user,
            full_name='Email Target Driver',
            phone_number='9862000099',
            email='driver@wangs.in',
            status=CourierProfile.Status.PENDING
        )

        with patch('marketplace.views.send_courier_approval_email') as mock_send_email:
            mock_send_email.return_value = (True, {'provider': 'TEST'})
            self.client.force_authenticate(user=self.admin_user)
            resp = self.client.post(f'/api/admin/couriers/{profile.id}/approve/', {
                'admin_notes': 'Welcome to Wangs Delivery fleet'
            }, format='json')

            self.assertEqual(resp.status_code, status.HTTP_200_OK)
            self.assertTrue(mock_send_email.called)
            called_profile = mock_send_email.call_args[0][0]
            self.assertEqual(called_profile.id, profile.id)
            self.assertEqual(called_profile.email, 'driver@wangs.in')

    def test_manufacturer_receives_email_for_ordered_products(self):
        from unittest.mock import patch
        from marketplace.resend_service import send_order_notifications_to_manufacturers

        # Manufacturer A
        mfg_user_a = User.objects.create_user(username='chef_akamla', email='akamla@wangs.in', password='pw', role=User.Role.MANUFACTURER)
        mfg_a = ManufacturerProfile.objects.create(
            user=mfg_user_a, business_name='Akamla Foods', slug='akamla-foods',
            contact_email='akamla@wangs.in', contact_phone='9862111111', status=ManufacturerProfile.Status.APPROVED
        )
        prod_a = Product.objects.create(
            manufacturer=mfg_a, category=self.cat, title='Akamla King Chilli',
            slug='akamla-king-chilli', price=Decimal('200.00'), weight_grams=250, stock_quantity=50,
            status=Product.Status.APPROVED
        )

        # Manufacturer B
        mfg_user_b = User.objects.create_user(username='chef_naga', email='naga@wangs.in', password='pw', role=User.Role.MANUFACTURER)
        mfg_b = ManufacturerProfile.objects.create(
            user=mfg_user_b, business_name='Naga Heritage Kitchen', slug='naga-heritage',
            contact_email='naga@wangs.in', contact_phone='9862222222', status=ManufacturerProfile.Status.APPROVED
        )
        prod_b = Product.objects.create(
            manufacturer=mfg_b, category=self.cat, title='Smoked Pork Pickle',
            slug='smoked-pork-pickle', price=Decimal('350.00'), weight_grams=300, stock_quantity=50,
            status=Product.Status.APPROVED
        )

        # Customer adds both items to cart
        cart = Cart.objects.create(user=self.customer)
        item1 = CartItem.objects.create(cart=cart, product=prod_a, quantity=2) # 2 * 200 = 400
        item2 = CartItem.objects.create(cart=cart, product=prod_b, quantity=1) # 1 * 350 = 350

        # Create Order
        order = OrderService.create_order_from_cart(
            user=self.customer,
            customer_details={'name': 'Vituo Rutsa', 'email': 'vituo@wangs.in', 'phone': '9862333333'},
            shipping_details={'address_line1': 'Midland', 'city': 'Kohima', 'state': 'Nagaland', 'postal_code': '797001'},
            cart_items=[item1, item2],
            payment_method='RAZORPAY_TEST'
        )

        with patch('marketplace.resend_service.dispatch_email') as mock_dispatch:
            mock_dispatch.return_value = (True, {'provider': 'MOCK_RELAY'})

            # Confirm payment which dispatches order notifications
            PaymentService.verify_and_confirm_payment(
                order=order,
                payment_id='pay_test_mfg_notify',
                razorpay_order_id='order_test_mfg',
                signature='sig_test'
            )

            # Both manufacturers must receive an email (2 dispatch calls)
            self.assertEqual(mock_dispatch.call_count, 2)

            dispatched_emails = [call.args[0] for call in mock_dispatch.call_args_list]
            self.assertIn('akamla@wangs.in', dispatched_emails)
            self.assertIn('naga@wangs.in', dispatched_emails)

            # Check Manufacturer A's email content
            call_a = next(c for c in mock_dispatch.call_args_list if c.args[0] == 'akamla@wangs.in')
            subject_a, html_a = call_a.args[1], call_a.args[2]
            self.assertIn(order.order_number, subject_a)
            self.assertIn('Akamla King Chilli', html_a)
            self.assertNotIn('Smoked Pork Pickle', html_a) # Must NOT leak Manufacturer B's product
            self.assertIn('Akamla Foods', html_a)

            # Check Manufacturer B's email content
            call_b = next(c for c in mock_dispatch.call_args_list if c.args[0] == 'naga@wangs.in')
            subject_b, html_b = call_b.args[1], call_b.args[2]
            self.assertIn(order.order_number, subject_b)
            self.assertIn('Smoked Pork Pickle', html_b)
            self.assertNotIn('Akamla King Chilli', html_b) # Must NOT leak Manufacturer A's product
            self.assertIn('Naga Heritage Kitchen', html_b)

            # Idempotency: calling again must not send duplicate emails
            mock_dispatch.reset_mock()
            send_order_notifications_to_manufacturers(order)
            self.assertEqual(mock_dispatch.call_count, 0)

    @patch('marketplace.resend_service.dispatch_email')
    def test_customer_delivery_process_email_updates(self, mock_dispatch):
        """
        Verify that for every delivery process update (PACKED, DISPATCHED, DELIVERED),
        the customer receives an email notification with appropriate subject and content.
        """
        mock_dispatch.return_value = (True, {'id': 'msg_test'})

        order = Order.objects.create(
            order_number='WNG-20261111-TESTDELIV',
            user=self.customer,
            customer_name='Akamla Customer',
            customer_email='akamla_cust@wangs.in',
            customer_phone='9863119295',
            shipping_address_line1='Duncan Basti, Lane 4',
            shipping_city='Dimapur',
            shipping_state='Nagaland',
            shipping_postal_code='797112',
            items_subtotal=Decimal('300.00'),
            customer_platform_fee=Decimal('0.00'),
            delivery_fee=Decimal('0.00'),
            total_amount=Decimal('300.00'),
            platform_commission_total=Decimal('30.00'),
            manufacturer_payout_total=Decimal('270.00'),
            status=Order.Status.CONFIRMED,
            payment_status=Order.PaymentStatus.PAID
        )

        item = OrderItem.objects.create(
            order=order,
            product=self.product,
            product_title=self.product.title,
            manufacturer=self.mfg_profile,
            unit_price=Decimal('300.00'),
            quantity=1,
            weight_grams=250,
            subtotal=Decimal('300.00'),
            commission_rate=Decimal('10.00'),
            commission_amount=Decimal('30.00'),
            manufacturer_payout=Decimal('270.00'),
            fulfillment_status=OrderItem.FulfillmentStatus.PENDING
        )

        from marketplace.resend_service import send_customer_delivery_status_email

        # 1. Update to PACKED
        mock_dispatch.reset_mock()
        sent, _ = send_customer_delivery_status_email(order, status='PACKED', item=item)
        self.assertTrue(sent)
        self.assertEqual(mock_dispatch.call_count, 1)
        recipient, subject, html = mock_dispatch.call_args[0]
        self.assertEqual(recipient, 'akamla_cust@wangs.in')
        self.assertIn('Packed', subject)
        self.assertIn('Your Artisanal Order has been Packed', html)
        self.assertIn(self.product.title, html)
        self.assertIn('Akamla Customer', html)

        # 2. Update to DISPATCHED
        mock_dispatch.reset_mock()
        order.tracking_number = 'WNG-AWB-998877IN'
        order.courier_partner = 'Air Cargo Express'
        sent, _ = send_customer_delivery_status_email(
            order, status='DISPATCHED', item=item,
            tracking_number=order.tracking_number,
            courier_partner=order.courier_partner
        )
        self.assertTrue(sent)
        self.assertEqual(mock_dispatch.call_count, 1)
        recipient, subject, html = mock_dispatch.call_args[0]
        self.assertEqual(recipient, 'akamla_cust@wangs.in')
        self.assertIn('Dispatched', subject)
        self.assertIn('Your Parcel is on the Way', html)
        self.assertIn('WNG-AWB-998877IN', html)
        self.assertIn('Air Cargo Express', html)

        # 3. Update to DELIVERED
        mock_dispatch.reset_mock()
        sent, _ = send_customer_delivery_status_email(order, status='DELIVERED', item=item)
        self.assertTrue(sent)
        self.assertEqual(mock_dispatch.call_count, 1)
        recipient, subject, html = mock_dispatch.call_args[0]
        self.assertEqual(recipient, 'akamla_cust@wangs.in')
        self.assertIn('Delivered', subject)
        self.assertIn('Your Package has been Delivered', html)
        self.assertIn('Scan Your Unboxing QR Code', html)

        # 4. Integration Test: Manufacturer PATCH triggers customer email
        mock_dispatch.reset_mock()
        self.client.force_authenticate(user=self.mfg_user)
        patch_resp = self.client.patch('/api/manufacturer/orders/', {
            'order_item_id': item.id,
            'fulfillment_status': 'DISPATCHED',
            'courier_partner': 'Air Cargo Express',
            'tracking_number': 'WNG-AWB-TEST123'
        }, format='json')
        self.assertEqual(patch_resp.status_code, 200)
        self.assertEqual(mock_dispatch.call_count, 1)
        patch_recip, patch_sub, patch_html = mock_dispatch.call_args[0]
        self.assertEqual(patch_recip, 'akamla_cust@wangs.in')
        self.assertIn('Dispatched', patch_sub)
        self.assertIn('WNG-AWB-TEST123', patch_html)


class DeliveryChargeManagementTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Admin user
        self.admin = User.objects.create_user(
            username='platform_admin',
            email='admin@wangs.in',
            password='adminpassword',
            role=User.Role.ADMIN,
            is_staff=True,
            is_superuser=True
        )

        # Manufacturer A
        self.mfg_user_a = User.objects.create_user(
            username='mfg_a_user',
            email='mfg_a@wangs.in',
            password='password123',
            role=User.Role.MANUFACTURER
        )
        self.mfg_a = ManufacturerProfile.objects.create(
            user=self.mfg_user_a,
            business_name="Arenla Heritage Kitchen",
            slug='arenla-heritage-kitchen',
            location_district='Kohima, Nagaland',
            contact_email='mfg_a@wangs.in',
            contact_phone='9862000001',
            business_address='Main Town, Kohima',
            postal_code='797001',
            status=ManufacturerProfile.Status.APPROVED
        )

        # Manufacturer B
        self.mfg_user_b = User.objects.create_user(
            username='mfg_b_user',
            email='mfg_b@wangs.in',
            password='password123',
            role=User.Role.MANUFACTURER
        )
        self.mfg_b = ManufacturerProfile.objects.create(
            user=self.mfg_user_b,
            business_name="Nagaland Smokehouse Co",
            slug='nagaland-smokehouse-co',
            location_district='Dimapur, Nagaland',
            contact_email='mfg_b@wangs.in',
            contact_phone='9862000002',
            business_address='Circular Road, Dimapur',
            postal_code='797112',
            status=ManufacturerProfile.Status.APPROVED
        )

        # Category & Products
        self.category = Category.objects.create(name='Pickles', slug='pickles')
        self.product_a = Product.objects.create(
            manufacturer=self.mfg_a,
            category=self.category,
            title='King Chilli Pork Pickle',
            slug='king-chilli-pork-pickle',
            short_description='Authentic wood-smoked pork',
            description='Detailed pork pickle description',
            price=Decimal('250.00'),
            base_price=Decimal('200.00'),
            weight_grams=250,
            stock_quantity=50,
            status=Product.Status.APPROVED,
            is_active=True
        )
        self.product_b = Product.objects.create(
            manufacturer=self.mfg_b,
            category=self.category,
            title='Smoked Beef Axone Pickle',
            slug='smoked-beef-axone-pickle',
            short_description='Spicy fermented soybean pickle',
            description='Detailed beef pickle description',
            price=Decimal('280.00'),
            base_price=Decimal('220.00'),
            weight_grams=300,
            stock_quantity=50,
            status=Product.Status.APPROVED,
            is_active=True
        )

        # Customer User
        self.customer = User.objects.create_user(
            username='test_customer',
            email='customer@example.com',
            password='custpassword',
            role=User.Role.CUSTOMER
        )

        # Courier Driver
        self.courier_user = User.objects.create_user(
            username='swift_driver',
            email='driver@swiftzone.in',
            password='driverpassword',
            role=User.Role.COURIER
        )
        self.courier_profile = CourierProfile.objects.create(
            user=self.courier_user,
            full_name='Vizo Angami',
            phone_number='9876543210',
            status=CourierProfile.Status.APPROVED,
            is_active=True
        )

        # Seed initial zones and courier services
        from .delivery_service import DeliveryService
        DeliveryService.seed_swiftzone_and_partner_presets(admin_user=self.admin, activate=True)
        self.swiftzone = CourierService.objects.get(code='SWIFTZONE')
        self.zone_kohima = DeliveryZone.objects.get(code='KOHIMA_LOCAL')
        self.zone_dimapur = DeliveryZone.objects.get(code='DIMAPUR_CHUMOUKEDIMA')

    def test_admin_delivery_rate_crud_and_presets(self):
        """Admin can create, edit, lock, and delete delivery rates and presets."""
        self.client.force_authenticate(user=self.admin)

        # 1. Admin creates rate
        resp = self.client.post('/api/admin/delivery/rates/', {
            'title': 'Admin Special Kohima Flat',
            'scope': DeliveryRate.Scope.ZONE_DEFAULT,
            'courier': self.swiftzone.id,
            'zone': self.zone_kohima.id,
            'delivery_method': 'STANDARD',
            'base_rate': '75.00',
            'per_package_rate': '75.00',
            'is_locked': True,
            'is_active': True,
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        rate_id = resp.data['id']
        self.assertTrue(resp.data['is_locked'])

        # 2. Toggle lock
        toggle_resp = self.client.post(f'/api/admin/delivery/rates/{rate_id}/toggle-lock/')
        self.assertEqual(toggle_resp.status_code, 200)
        self.assertFalse(toggle_resp.data['is_locked'])

        # 3. Edit rate
        put_resp = self.client.put(f'/api/admin/delivery/rates/{rate_id}/', {
            'base_rate': '70.00'
        }, format='json')
        self.assertEqual(put_resp.status_code, 200)
        self.assertEqual(put_resp.data['base_rate'], '70.00')

        # 4. Delete rate
        del_resp = self.client.delete(f'/api/admin/delivery/rates/{rate_id}/')
        self.assertEqual(del_resp.status_code, 204)

    def test_manufacturer_rate_creation_and_ownership_enforcement(self):
        """Manufacturer can configure rates for own products/destinations, but not others."""
        # 1. Manufacturer A creates rate for own product A
        self.client.force_authenticate(user=self.mfg_user_a)
        resp = self.client.post('/api/manufacturer/delivery/rates/', {
            'title': 'Arenla Pork Special Dimapur',
            'product': self.product_a.id,
            'zone': self.zone_dimapur.id,
            'delivery_method': 'STANDARD',
            'base_rate': '95.00',
            'per_package_rate': '95.00',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['manufacturer'], self.mfg_a.id)
        self.assertFalse(resp.data['is_locked'])
        rate_id = resp.data['id']

        # 2. Manufacturer A tries to create rate for Manufacturer B's product -> 404/Forbidden
        fail_resp = self.client.post('/api/manufacturer/delivery/rates/', {
            'title': 'Hacked Rate for Other Seller',
            'product': self.product_b.id,
            'zone': self.zone_dimapur.id,
            'base_rate': '10.00',
        }, format='json')
        self.assertEqual(fail_resp.status_code, 404)

        # 3. Manufacturer B tries to edit Manufacturer A's rate -> 404/Forbidden
        self.client.force_authenticate(user=self.mfg_user_b)
        tamper_resp = self.client.put(f'/api/manufacturer/delivery/rates/{rate_id}/', {
            'base_rate': '20.00'
        }, format='json')
        self.assertEqual(tamper_resp.status_code, 404)

    def test_admin_locked_rates_cannot_be_overridden_or_deleted_by_manufacturer(self):
        """When an admin locks a rate, the manufacturer cannot edit or delete it."""
        # Admin creates locked rate for Manufacturer A's product
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post('/api/admin/delivery/rates/', {
            'title': 'Admin Enforced Price Floor for Pork',
            'scope': DeliveryRate.Scope.PRODUCT_SPECIFIC,
            'product': self.product_a.id,
            'manufacturer': self.mfg_a.id,
            'delivery_method': 'STANDARD',
            'base_rate': '120.00',
            'per_package_rate': '120.00',
            'is_locked': True,
            'is_active': True,
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        locked_rate_id = resp.data['id']

        # Manufacturer A attempts to update the locked rate
        self.client.force_authenticate(user=self.mfg_user_a)
        edit_resp = self.client.put(f'/api/manufacturer/delivery/rates/{locked_rate_id}/', {
            'base_rate': '50.00'
        }, format='json')
        self.assertEqual(edit_resp.status_code, 403)
        self.assertIn('locked by Wangs Platform Admin', edit_resp.data['detail'])

        # Manufacturer A attempts to delete the locked rate
        del_resp = self.client.delete(f'/api/manufacturer/delivery/rates/{locked_rate_id}/')
        self.assertEqual(del_resp.status_code, 403)
        self.assertIn('locked by Wangs Platform Admin', del_resp.data['detail'])

    def test_five_tier_delivery_rate_priority(self):
        """
        Verify the exact priority hierarchy:
        1. Admin-locked product rate
        2. Manufacturer product rate
        3. Admin-locked manufacturer zone rate
        4. Manufacturer zone rate
        5. Admin default rate
        """
        from .delivery_service import DeliveryCalculator

        # Clear existing seeded rates to test the 5-tier isolation cleanly
        DeliveryRate.objects.all().delete()

        # Create all 5 tiers for Product A in Kohima Zone
        # Tier 5: Admin Default
        tier5 = DeliveryRate.objects.create(
            title='Tier 5 Admin Default',
            scope=DeliveryRate.Scope.ADMIN_DEFAULT,
            base_rate=Decimal('50.00'),
            is_locked=False,
            is_active=True
        )

        # Check resolution without higher tiers -> Tier 5
        rate = DeliveryCalculator.find_applicable_rate_for_item(self.product_a, zone=self.zone_kohima)
        self.assertEqual(rate.id, tier5.id)

        # Tier 4: Manufacturer Destination Rate
        tier4 = DeliveryRate.objects.create(
            title='Tier 4 Mfg Zone Rate',
            scope=DeliveryRate.Scope.MANUFACTURER_ZONE,
            manufacturer=self.mfg_a,
            zone=self.zone_kohima,
            base_rate=Decimal('60.00'),
            is_locked=False,
            is_active=True
        )
        rate = DeliveryCalculator.find_applicable_rate_for_item(self.product_a, zone=self.zone_kohima)
        self.assertEqual(rate.id, tier4.id)

        # Tier 3: Admin-Locked Manufacturer / Zone Rate
        tier3 = DeliveryRate.objects.create(
            title='Tier 3 Admin Locked Zone Rate',
            scope=DeliveryRate.Scope.MANUFACTURER_ZONE,
            manufacturer=self.mfg_a,
            zone=self.zone_kohima,
            base_rate=Decimal('70.00'),
            is_locked=True,
            is_active=True
        )
        rate = DeliveryCalculator.find_applicable_rate_for_item(self.product_a, zone=self.zone_kohima)
        self.assertEqual(rate.id, tier3.id)

        # Tier 2: Manufacturer Product-Specific Rate
        tier2 = DeliveryRate.objects.create(
            title='Tier 2 Mfg Product Rate',
            scope=DeliveryRate.Scope.PRODUCT_SPECIFIC,
            product=self.product_a,
            manufacturer=self.mfg_a,
            base_rate=Decimal('80.00'),
            is_locked=False,
            is_active=True
        )
        rate = DeliveryCalculator.find_applicable_rate_for_item(self.product_a, zone=self.zone_kohima)
        self.assertEqual(rate.id, tier2.id)

        # Tier 1: Admin-Locked Product-Specific Rate
        tier1 = DeliveryRate.objects.create(
            title='Tier 1 Admin Locked Product Rate',
            scope=DeliveryRate.Scope.PRODUCT_SPECIFIC,
            product=self.product_a,
            base_rate=Decimal('90.00'),
            is_locked=True,
            is_active=True
        )
        rate = DeliveryCalculator.find_applicable_rate_for_item(self.product_a, zone=self.zone_kohima)
        self.assertEqual(rate.id, tier1.id)

    def test_weight_surcharge_calculation_kohima_dimapur(self):
        """
        SwiftZone Local rule:
        First 1 kg included. ₹6 for every additional 100 g or part thereof.
        """
        from .delivery_service import DeliveryCalculator

        # Create rate: Base ₹80, included 1000g, ₹6 per 100g
        rate = DeliveryRate.objects.create(
            title='Kohima Standard',
            scope=DeliveryRate.Scope.ZONE_DEFAULT,
            courier=self.swiftzone,
            zone=self.zone_kohima,
            delivery_method=DeliveryRate.DeliveryMethod.STANDARD,
            base_rate=Decimal('80.00'),
            per_package_rate=Decimal('80.00'),
            included_weight_grams=1000,
            additional_weight_rate=Decimal('6.00'),
            additional_weight_step_grams=100,
            is_active=True
        )

        # 1. Weight 900g (within 1kg) -> Surcharge ₹0
        self.assertEqual(rate.calculate_weight_surcharge(900), Decimal('0.00'))

        # 2. Weight 1000g -> Surcharge ₹0
        self.assertEqual(rate.calculate_weight_surcharge(1000), Decimal('0.00'))

        # 3. Weight 1250g -> Extra 250g. Part thereof = 3 steps (100g, 100g, 50g) = 3 * ₹6 = ₹18.00
        self.assertEqual(rate.calculate_weight_surcharge(1250), Decimal('18.00'))

        # 4. Weight 1500g -> Extra 500g = 5 steps * ₹6 = ₹30.00
        self.assertEqual(rate.calculate_weight_surcharge(1500), Decimal('30.00'))

    def test_multi_manufacturer_order_separate_packaging(self):
        """
        Orders containing multiple manufacturers must calculate packaging separately
        for each fulfillment group, bundle items appropriately, and display combined total.
        """
        self.client.force_authenticate(user=self.customer)

        # Add Product A (Mfg A) and Product B (Mfg B) to Cart
        cart = Cart.objects.create(user=self.customer)
        CartItem.objects.create(cart=cart, product=self.product_a, quantity=2) # 2x250g = 500g
        CartItem.objects.create(cart=cart, product=self.product_b, quantity=1) # 1x300g = 300g

        # Quote to Kohima (797001)
        resp = self.client.post('/api/checkout/shipping-quote/', {
            'postal_code': '797001',
            'city': 'Kohima'
        }, format='json')

        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data['is_deliverable'])
        # Must have 2 fulfillment breakdowns (one for each manufacturer)
        breakdown = resp.data['fulfillment_breakdown']
        self.assertEqual(len(breakdown), 2)

        mfg_names = [b['manufacturer_name'] for b in breakdown]
        self.assertIn(self.mfg_a.business_name, mfg_names)
        self.assertIn(self.mfg_b.business_name, mfg_names)

        # Total packages = 1 box for Mfg A + 1 box for Mfg B = 2 boxes
        self.assertEqual(resp.data['total_packages'], 2)

    def test_unsupported_destination_shows_error_and_blocks_checkout(self):
        """If destination PIN has no deliverable rates, display informative error and reject order."""
        self.client.force_authenticate(user=self.customer)
        cart = Cart.objects.create(user=self.customer)
        CartItem.objects.create(cart=cart, product=self.product_a, quantity=1)

        # Deactivate all rates temporarily to simulate unserviced region
        DeliveryRate.objects.all().update(is_active=False)

        # Quote request
        quote_resp = self.client.post('/api/checkout/shipping-quote/', {
            'postal_code': '999999',
            'city': 'Unknown Remote Territory'
        }, format='json')
        self.assertEqual(quote_resp.status_code, 200)
        self.assertFalse(quote_resp.data['is_deliverable'])
        self.assertEqual(quote_resp.data['error_message'], 'Delivery not available for this location')

        # Checkout attempt must be rejected with 400
        order_resp = self.client.post('/api/checkout/create-order/', {
            'customer_name': 'Test Cust',
            'customer_email': 'cust@example.com',
            'customer_phone': '9876543210',
            'shipping_address_line1': 'Unserviced Remote Village',
            'shipping_city': 'Unknown Remote Territory',
            'shipping_state': 'Remote',
            'shipping_postal_code': '999999',
            'payment_method': 'COD'
        }, format='json')

        self.assertEqual(order_resp.status_code, 400)
        self.assertIn('Delivery not available for this location', order_resp.data['detail'])

    def test_historical_shipping_snapshot_preserved_on_order(self):
        """Historical shipping charges and rate snapshots remain immutable when rates are updated later."""
        self.client.force_authenticate(user=self.customer)
        cart = Cart.objects.create(user=self.customer)
        CartItem.objects.create(cart=cart, product=self.product_a, quantity=1)

        # Ensure active rate exists
        rate = DeliveryRate.objects.filter(
            zone=self.zone_kohima,
            delivery_method=DeliveryRate.DeliveryMethod.STANDARD,
            is_active=True
        ).first()
        if not rate:
            rate = DeliveryRate.objects.create(
                title='Kohima Standard Initial',
                scope=DeliveryRate.Scope.ZONE_DEFAULT,
                zone=self.zone_kohima,
                courier=self.swiftzone,
                delivery_method=DeliveryRate.DeliveryMethod.STANDARD,
                base_rate=Decimal('80.00'),
                per_package_rate=Decimal('80.00'),
                is_active=True
            )

        # Place order
        order_resp = self.client.post('/api/checkout/create-order/', {
            'customer_name': 'Snapshot Customer',
            'customer_email': 'snap@example.com',
            'customer_phone': '9876500000',
            'shipping_address_line1': 'Lower Chandmari, Kohima',
            'shipping_city': 'Kohima',
            'shipping_state': 'Nagaland',
            'shipping_postal_code': '797001',
            'payment_method': 'COD'
        }, format='json')

        self.assertEqual(order_resp.status_code, 201)
        order_num = order_resp.data['order']['order_number']
        order = Order.objects.get(order_number=order_num)
        original_fee = order.delivery_fee

        # Later, rate is updated or modified
        rate.base_rate = Decimal('250.00')
        rate.version += 1
        rate.save()

        # Reload order from database: snapshot fields must remain intact
        order.refresh_from_db()
        self.assertEqual(order.delivery_fee, original_fee)
        self.assertEqual(order.shipping_package_count, 1)
        self.assertTrue('fulfillment_breakdown' in order.shipping_breakdown)

    def test_courier_portal_order_lookup_displays_shipping_details(self):
        """Courier driver can look up order and see delivery details without breaking QR scanning."""
        # Create an order
        order = Order.objects.create(
            order_number='WNG-20261112-COURIERTEST',
            customer_name='Imti Ao',
            customer_email='imti@example.com',
            customer_phone='9436011111',
            shipping_address_line1='Duncan Bosti, Dimapur',
            shipping_city='Dimapur',
            shipping_state='Nagaland',
            shipping_postal_code='797112',
            items_subtotal=Decimal('250.00'),
            customer_platform_fee=Decimal('5.00'),
            delivery_fee=Decimal('110.00'),
            total_amount=Decimal('365.00'),
            platform_commission_total=Decimal('25.00'),
            manufacturer_payout_total=Decimal('225.00'),
            courier_partner='SwiftZone Express',
            shipping_delivery_method='Standard Delivery (1-2 business days)',
            shipping_estimated_delivery='1–2 Business Days',
            shipping_package_count=1,
            status=Order.Status.PROCESSING
        )

        self.client.force_authenticate(user=self.courier_user)
        lookup_resp = self.client.get(f'/api/delivery/order/{order.order_number}/')
        self.assertEqual(lookup_resp.status_code, 200)
        self.assertEqual(lookup_resp.data['order_number'], order.order_number)
        self.assertEqual(lookup_resp.data['courier_partner'], 'SwiftZone Express')
        self.assertEqual(lookup_resp.data['shipping_package_count'], 1)
        self.assertEqual(lookup_resp.data['shipping_delivery_method'], 'Standard Delivery (1-2 business days)')


class CashfreeIntegrationTests(TestCase):
    """
    Tests for Cashfree payment gateway integration:
    - Service URL and signature verification
    - Order creation with Cashfree intent
    - Payment verification and webhook handling
    """
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='cashfree_customer',
            email='shopper@wangs.in',
            password='Password123!',
            first_name='Mhashe',
            phone_number='9876543210'
        )
        self.mfg_user = User.objects.create_user(
            username='cashfree_mfg',
            email='mfg@wangs.in',
            password='Password123!',
            first_name='Arenla',
            role=User.Role.MANUFACTURER
        )
        self.mfg = ManufacturerProfile.objects.create(
            user=self.mfg_user,
            business_name='Heritage Foods Nagaland',
            slug='heritage-foods-nagaland',
            location_district='Kohima',
            contact_email='mfg@wangs.in',
            contact_phone='9436012345',
            business_address='Midland, Kohima',
            postal_code='797001',
            fssai_license_number='10023064000199',
            status=ManufacturerProfile.Status.APPROVED
        )
        self.category = Category.objects.create(name='Preserves & Pickles', slug='preserves-pickles')
        self.product = Product.objects.create(
            manufacturer=self.mfg,
            category=self.category,
            title='Traditional Smoked Pork Pickle',
            slug='traditional-smoked-pork-pickle',
            price=Decimal('350.00'),
            weight_grams=250,
            stock_quantity=25,
            is_active=True
        )

    def test_cashfree_service_base_url_and_helpers(self):
        from .cashfree_service import CashfreeService
        self.assertEqual(CashfreeService.get_base_url('PROD'), 'https://api.cashfree.com/pg')
        self.assertEqual(CashfreeService.get_base_url('TEST'), 'https://sandbox.cashfree.com/pg')

    def test_cashfree_order_creation_and_verification(self):
        from .services import PaymentService
        order = Order.objects.create(
            order_number='WNG-CF-TEST-001',
            user=self.user,
            customer_name='Mhashe Kire',
            customer_email='shopper@wangs.in',
            customer_phone='9876543210',
            shipping_address_line1='Officers Hill',
            shipping_city='Kohima',
            shipping_state='Nagaland',
            shipping_postal_code='797001',
            items_subtotal=Decimal('350.00'),
            customer_platform_fee=Decimal('5.00'),
            delivery_fee=Decimal('0.00'),
            total_amount=Decimal('355.00'),
            platform_commission_total=Decimal('35.00'),
            manufacturer_payout_total=Decimal('315.00'),
            payment_method='CASHFREE',
            status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.PENDING
        )

        # Payment intent generated
        intent = PaymentService.create_cashfree_order(order)
        self.assertIn('payment_session_id', intent)
        self.assertIn('cf_order_id', intent)

        # Payment verification endpoint
        resp = self.client.post('/api/payments/verify/', {
            'order_number': order.order_number,
            'cf_order_id': intent['cf_order_id'],
            'cf_payment_id': 'cf_pay_test_12345',
        }, format='json')
        self.assertEqual(resp.status_code, 200)

        order.refresh_from_db()
        self.assertEqual(order.payment_status, Order.PaymentStatus.PAID)
        self.assertEqual(order.status, Order.Status.CONFIRMED)

    def test_cashfree_webhook_success_handling(self):
        order = Order.objects.create(
            order_number='WNG-CF-TEST-002',
            user=self.user,
            customer_name='Mhashe Kire',
            customer_email='shopper@wangs.in',
            customer_phone='9876543210',
            shipping_address_line1='Officers Hill',
            shipping_city='Kohima',
            shipping_state='Nagaland',
            shipping_postal_code='797001',
            items_subtotal=Decimal('350.00'),
            customer_platform_fee=Decimal('5.00'),
            delivery_fee=Decimal('0.00'),
            total_amount=Decimal('355.00'),
            platform_commission_total=Decimal('35.00'),
            manufacturer_payout_total=Decimal('315.00'),
            payment_method='CASHFREE',
            status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.PENDING
        )

        webhook_payload = {
            'type': 'PAYMENT_SUCCESS_WEBHOOK',
            'data': {
                'order': {
                    'order_id': order.order_number,
                    'order_amount': 355.00,
                    'order_currency': 'INR'
                },
                'payment': {
                    'cf_payment_id': 98765432,
                    'payment_status': 'SUCCESS',
                    'payment_amount': 355.00
                }
            }
        }

        resp = self.client.post('/api/payments/cashfree-webhook/', webhook_payload, format='json')
        self.assertEqual(resp.status_code, 200)

        order.refresh_from_db()
        self.assertEqual(order.payment_status, Order.PaymentStatus.PAID)
        self.assertEqual(order.status, Order.Status.CONFIRMED)

    def test_cashfree_easy_split_vendor_and_order_split(self):
        from .cashfree_service import CashfreeService
        from .services import PaymentService

        # 1. Sync manufacturer as vendor
        self.mfg.bank_account_holder = 'Arenla Ao'
        self.mfg.bank_account_number = '1234567890'
        self.mfg.bank_ifsc_code = 'SBIN0000123'
        self.mfg.save()

        sync_res = CashfreeService.sync_manufacturer_vendor(self.mfg)
        self.assertTrue(sync_res['success'])
        self.mfg.refresh_from_db()
        self.assertTrue(self.mfg.cashfree_vendor_id.startswith('mfg_'))
        self.assertEqual(self.mfg.cashfree_vendor_status, 'ACTIVE')

        # 2. Create order with OrderItem linked to this manufacturer
        order = Order.objects.create(
            order_number='WNG-CF-SPLIT-001',
            user=self.user,
            customer_name='Mhashe Kire',
            customer_email='shopper@wangs.in',
            customer_phone='9876543210',
            shipping_address_line1='Officers Hill',
            shipping_city='Kohima',
            shipping_state='Nagaland',
            shipping_postal_code='797001',
            items_subtotal=Decimal('350.00'),
            customer_platform_fee=Decimal('5.00'),
            delivery_fee=Decimal('0.00'),
            total_amount=Decimal('355.00'),
            platform_commission_total=Decimal('35.00'),
            manufacturer_payout_total=Decimal('315.00'),
            payment_method='CASHFREE',
            status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.PENDING
        )

        OrderItem.objects.create(
            order=order,
            product=self.product,
            manufacturer=self.mfg,
            product_title=self.product.title,
            weight_grams=250,
            unit_price=Decimal('350.00'),
            quantity=1,
            subtotal=Decimal('350.00'),
            commission_rate=Decimal('10.00'),
            commission_amount=Decimal('35.00'),
            manufacturer_payout=Decimal('315.00')
        )

        # 3. Create Cashfree order with Easy Split
        intent = PaymentService.create_cashfree_order(order)
        self.assertIn('order_splits', intent)
        self.assertEqual(len(intent['order_splits']), 1)
        self.assertEqual(intent['order_splits'][0]['vendor_id'], self.mfg.cashfree_vendor_id)
        self.assertEqual(intent['order_splits'][0]['amount'], 315.00)

        order.refresh_from_db()
        self.assertIn('order_splits', order.cashfree_split_data)
        self.assertEqual(order.cashfree_split_data['order_splits'][0]['amount'], 315.00)



