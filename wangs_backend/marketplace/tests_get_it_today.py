from datetime import datetime, time
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from .models import (
    ManufacturerProfile, Category, Product, DeliveryZone,
    DeliveryRate, CourierService, Cart, CartItem
)
from .same_day_service import SameDayService, KOHIMA_TZ

User = get_user_model()


class GetItTodayTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.category = Category.objects.create(name='Pickles', slug='pickles', is_active=True)
        self.courier = CourierService.objects.create(
            code='SWIFTZONE', name='SwiftZone Express', is_active=True
        )
        self.kohima_zone = DeliveryZone.objects.create(
            name='Kohima Local',
            code='KOHIMA_LOCAL',
            state='Nagaland',
            cities=['kohima'],
            postal_codes=['797001', '797002'],
            is_active=True,
        )
        self.same_day_rate = DeliveryRate.objects.create(
            title='Kohima Same-Day',
            scope=DeliveryRate.Scope.ZONE_DEFAULT,
            courier=self.courier,
            zone=self.kohima_zone,
            delivery_method=DeliveryRate.DeliveryMethod.SAME_DAY,
            is_active=True,
            approval_status=DeliveryRate.ApprovalStatus.APPROVED,
            base_rate=Decimal('50.00'),
            per_package_rate=Decimal('50.00'),
            estimated_delivery_note='Same-Day Evening Delivery in Kohima',
        )

        self.seller1_user = User.objects.create_user(username='seller1', email='s1@wangs.in', password='pw', role='MANUFACTURER')
        self.seller1 = ManufacturerProfile.objects.create(
            user=self.seller1_user,
            business_name='Kohima Kitchen',
            slug='kohima-kitchen',
            location_district='Kohima, Nagaland',
            contact_email='s1@wangs.in',
            contact_phone='9876543210',
            business_address='Kohima',
            postal_code='797001',
            status=ManufacturerProfile.Status.APPROVED,
            same_day_enabled=True,
            same_day_paused=False,
            same_day_dispatch_town='Kohima',
            same_day_dispatch_district='Kohima',
            same_day_dispatch_state='Nagaland',
            same_day_operating_days=[0, 1, 2, 3, 4, 5, 6],
            same_day_cutoff_time=time(17, 0),
            same_day_covered_towns=['kohima'],
            same_day_covered_pincodes=['797001'],
        )

        self.prod1 = Product.objects.create(
            manufacturer=self.seller1,
            category=self.category,
            title='King Chilli Pickle',
            slug='king-chilli-pickle',
            short_description='Hot',
            description='Authentic Naga pickle',
            price=Decimal('250.00'),
            weight_grams=250,
            ingredients='King Chilli, Oil',
            stock_quantity=5,
            status=Product.Status.APPROVED,
            is_active=True,
            same_day_eligible=True,
        )

    def test_detect_location_and_manual_selection(self):
        resp = self.client.post('/api/get-it-today/detect-location/', {
            'postal_code': '797001',
            'town': 'Kohima',
            'state': 'Nagaland',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data['platform_same_day_supported'])
        self.assertEqual(resp.data['location']['zone']['code'], 'KOHIMA_LOCAL')

        res_get = self.client.get('/api/get-it-today/', {'postal_code': '797001', 'town': 'Kohima'})
        self.assertEqual(res_get.status_code, 200)
        self.assertIn(res_get.data['status_code'], ('PRODUCTS_AVAILABLE', 'NO_ELIGIBLE_PRODUCTS'))

    def test_district_alone_does_not_grant_same_day(self):
        # Customer in different town/PIN of same district ('Jotsoma', 797002) not in seller1's covered list
        check = SameDayService.check_product_same_day_eligibility(
            self.prod1,
            postal_code='797002',
            town='Jotsoma',
            district='Kohima',
            state='Nagaland',
            now_dt=datetime(2026, 11, 26, 10, 0, tzinfo=KOHIMA_TZ),
        )
        self.assertFalse(check['eligible'])

    def test_eligible_within_cutoff_and_stock(self):
        check = SameDayService.check_product_same_day_eligibility(
            self.prod1,
            postal_code='797001',
            town='Kohima',
            district='Kohima',
            state='Nagaland',
            now_dt=datetime(2026, 11, 26, 11, 0, tzinfo=KOHIMA_TZ),
        )
        self.assertTrue(check['eligible'])
        self.assertEqual(check['estimated_window'], 'Same-Day Evening Delivery in Kohima')

    def test_cutoff_time_rejection(self):
        check = SameDayService.check_product_same_day_eligibility(
            self.prod1,
            postal_code='797001',
            town='Kohima',
            district='Kohima',
            state='Nagaland',
            now_dt=datetime(2026, 11, 26, 18, 0, tzinfo=KOHIMA_TZ),
        )
        self.assertFalse(check['eligible'])
        self.assertIn('cutoff', check['reason'].lower())

    def test_out_of_stock_and_paused_states(self):
        self.prod1.stock_quantity = 0
        self.prod1.save()
        res = SameDayService.get_available_for_location(
            postal_code='797001', town='Kohima', district='Kohima', state='Nagaland',
            now_dt=datetime(2026, 11, 26, 11, 0, tzinfo=KOHIMA_TZ),
        )
        self.assertEqual(res['status_code'], 'NO_ELIGIBLE_PRODUCTS')

        self.prod1.stock_quantity = 5
        self.prod1.save()
        self.seller1.same_day_paused = True
        self.seller1.save()
        res_paused = SameDayService.get_available_for_location(
            postal_code='797001', town='Kohima', district='Kohima', state='Nagaland',
            now_dt=datetime(2026, 11, 26, 11, 0, tzinfo=KOHIMA_TZ),
        )
        self.assertEqual(res_paused['status_code'], 'NO_ELIGIBLE_PRODUCTS')

    def test_no_local_sellers_and_delivery_unavailable(self):
        res_none = SameDayService.get_available_for_location(
            postal_code='560001', town='Bengaluru', district='Bengaluru', state='Karnataka',
            now_dt=datetime(2026, 11, 26, 11, 0, tzinfo=KOHIMA_TZ),
        )
        self.assertEqual(res_none['status_code'], 'NO_LOCAL_SELLERS')

        # Local seller exists in Mokokchung, but platform DeliveryZone has no same-day rate there
        s2_user = User.objects.create_user(username='s2', email='s2@wangs.in', password='pw', role='MANUFACTURER')
        ManufacturerProfile.objects.create(
            user=s2_user,
            business_name='Mokokchung Kitchen',
            slug='mokokchung-kitchen',
            location_district='Mokokchung, Nagaland',
            contact_email='s2@wangs.in',
            contact_phone='9876543211',
            business_address='Mokokchung',
            postal_code='798601',
            status=ManufacturerProfile.Status.APPROVED,
        )
        res_unavail = SameDayService.get_available_for_location(
            postal_code='798601', town='Mokokchung', district='Mokokchung', state='Nagaland',
            now_dt=datetime(2026, 11, 26, 11, 0, tzinfo=KOHIMA_TZ),
        )
        self.assertEqual(res_unavail['status_code'], 'DELIVERY_UNAVAILABLE')

    def test_seller_cannot_claim_unsupported_coverage(self):
        self.client.force_authenticate(user=self.seller1_user)
        resp = self.client.patch('/api/manufacturer/same-day-settings/', {
            'same_day_covered_pincodes': ['999999'],
        }, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('Unsupported', resp.data['detail'])

    def test_multi_seller_cart_checkout_validation(self):
        s2_user = User.objects.create_user(username='s3', email='s3@wangs.in', password='pw', role='MANUFACTURER')
        seller2 = ManufacturerProfile.objects.create(
            user=s2_user,
            business_name='Dimapur Kitchen',
            slug='dimapur-kitchen',
            location_district='Dimapur, Nagaland',
            contact_email='s3@wangs.in',
            contact_phone='9876543212',
            business_address='Dimapur',
            postal_code='797112',
            status=ManufacturerProfile.Status.APPROVED,
            same_day_enabled=False,
        )
        prod2 = Product.objects.create(
            manufacturer=seller2,
            category=self.category,
            title='Dimapur Bamboo Pickle',
            slug='dimapur-bamboo-pickle',
            short_description='Bamboo',
            description='Bamboo shoot pickle',
            price=Decimal('220.00'),
            weight_grams=250,
            ingredients='Bamboo, Chilli',
            stock_quantity=5,
            status=Product.Status.APPROVED,
            is_active=True,
            same_day_eligible=False,
        )
        cust = User.objects.create_user(username='cust', email='cust@wangs.in', password='pw')
        cart = Cart.objects.create(user=cust)
        CartItem.objects.create(cart=cart, product=self.prod1, quantity=1)
        CartItem.objects.create(cart=cart, product=prod2, quantity=1)
        items = list(cart.items.select_related('product', 'product__manufacturer'))

        with self.assertRaises(ValueError) as ctx:
            SameDayService.validate_cart_same_day(
                items,
                {'postal_code': '797001', 'city': 'Kohima', 'district': 'Kohima', 'state': 'Nagaland'},
                now_dt=datetime(2026, 11, 26, 11, 0, tzinfo=KOHIMA_TZ),
            )
        self.assertIn('Dimapur Bamboo Pickle', str(ctx.exception))

    def test_admin_configurable_same_day_cutoff_time_6pm(self):
        # Seller allows until 20:00, so platform default 18:00 (6:00 PM) is the active cap
        self.seller1.same_day_cutoff_time = time(20, 0)
        self.seller1.save(update_fields=['same_day_cutoff_time'])

        before_6pm = SameDayService.check_product_same_day_eligibility(
            self.prod1,
            postal_code='797001',
            town='Kohima',
            district='Kohima',
            state='Nagaland',
            now_dt=datetime(2026, 11, 26, 17, 55, tzinfo=KOHIMA_TZ),
        )
        self.assertTrue(before_6pm['eligible'])

        after_6pm = SameDayService.check_product_same_day_eligibility(
            self.prod1,
            postal_code='797001',
            town='Kohima',
            district='Kohima',
            state='Nagaland',
            now_dt=datetime(2026, 11, 26, 18, 5, tzinfo=KOHIMA_TZ),
        )
        self.assertFalse(after_6pm['eligible'])
        self.assertIn('6:00 PM', after_6pm['reason'])

        # Admin updates Get It Today cutoff to 19:30 (7:30 PM) via admin endpoint
        admin = User.objects.create_user(username='admin_sameday', email='adminsd@wangs.in', password='pw', role=User.Role.ADMIN)
        self.client.force_authenticate(user=admin)
        upd = self.client.post('/api/admin/commission/', {
            'default_commission_rate': '10.00',
            'customer_platform_fee': '3.00',
            'default_delivery_fee': '50.00',
            'free_delivery_threshold': '999.00',
            'same_day_cutoff_time': '19:30',
            'reason': 'Extend Get It Today cutoff to 7:30 PM',
        }, format='json')
        self.assertEqual(upd.status_code, 200, upd.data)

        # Now 18:05 is eligible, and /api/get-it-today/ reports platform_cutoff_time = 7:30 PM
        after_update = SameDayService.check_product_same_day_eligibility(
            self.prod1,
            postal_code='797001',
            town='Kohima',
            district='Kohima',
            state='Nagaland',
            now_dt=datetime(2026, 11, 26, 18, 5, tzinfo=KOHIMA_TZ),
        )
        self.assertTrue(after_update['eligible'])

        pub = self.client.get('/api/get-it-today/?postal_code=797001&town=Kohima&district=Kohima&state=Nagaland')
        self.assertEqual(pub.status_code, 200)
        self.assertEqual(pub.data['platform_cutoff_time'], '7:30 PM')
