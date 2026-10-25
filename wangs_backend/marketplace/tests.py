import datetime
from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from .models import (
    User, CustomerProfile, ManufacturerProfile, Category, Product,
    CommissionSetting, Cart, CartItem, Order, OrderItem, PaymentTransaction, Coupon,
    EmailOTP, MaintenanceSubscriber
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

        # 3. Verified submission succeeds
        ok_resp = self.client.post(url, req_data, format='json')
        self.assertEqual(ok_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(ok_resp.data['success'])

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
