import math
import zoneinfo
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, time
from django.db import transaction
from django.utils import timezone
from .models import (
    CourierService, DeliveryZone, DeliveryRate, ShippingPromotion,
    CommissionSetting, ManufacturerProfile, Product, User
)

KOHIMA_TZ = zoneinfo.ZoneInfo("Asia/Kolkata")

def quantize_amount(val):
    if not isinstance(val, Decimal):
        val = Decimal(str(val or '0.00'))
    return val.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


class DeliveryService:
    @staticmethod
    def seed_swiftzone_and_partner_presets(admin_user=None, activate=False):
        """
        Seeds SwiftZone, BlueDart, India Post, and Bus/Sumo delivery zones and preset rates
        as editable database records. Reference rates supplied by the business.
        Admin can review, customize, and activate them.
        """
        # 1. Courier Services
        swiftzone, _ = CourierService.objects.get_or_create(
            code='SWIFTZONE',
            defaults={
                'name': 'SwiftZone Express',
                'description': 'Local Nagaland hyper-express courier network based in Kohima.',
                'pickup_origin': 'Kohima',
                'pickup_charge': Decimal('0.00'),
                'is_active': True,
                'display_order': 1,
            }
        )
        bluedart, _ = CourierService.objects.get_or_create(
            code='BLUEDART',
            defaults={
                'name': 'BlueDart Express Logistics',
                'description': 'Pan-India air express and regional door-to-door network.',
                'pickup_origin': 'Kohima',
                'pickup_charge': Decimal('0.00'),
                'tracking_url_template': 'https://www.bluedart.com/tracking?handler=tnt&action=custrecord&awb={awb}',
                'is_active': True,
                'display_order': 2,
            }
        )
        bus_sumo, _ = CourierService.objects.get_or_create(
            code='BUS_SUMO',
            defaults={
                'name': 'Bus / Sumo Regional Dispatch',
                'description': 'Direct station-to-station delivery via Nagaland regional shared taxi & bus routes.',
                'pickup_origin': 'Kohima',
                'pickup_charge': Decimal('0.00'),
                'is_active': True,
                'display_order': 3,
            }
        )
        indiapost, _ = CourierService.objects.get_or_create(
            code='INDIAPOST',
            defaults={
                'name': 'India Post Speed Post & Air Cargo',
                'description': 'National postal service with free doorstep pickup from artisan kitchens.',
                'pickup_origin': 'Kohima',
                'pickup_charge': Decimal('0.00'),
                'tracking_url_template': 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx?consignmentNo={awb}',
                'is_active': True,
                'display_order': 4,
            }
        )

        # 2. Delivery Zones
        zones_data = [
            {
                'code': 'KOHIMA_LOCAL',
                'name': 'Kohima Local',
                'description': 'Kohima municipal area, town centers, and immediate colonies.',
                'state': 'Nagaland',
                'cities': ['kohima'],
                'postal_codes': ['797001', '797002', '797003', '797004', '797005'],
                'display_order': 1,
            },
            {
                'code': 'DIMAPUR_CHUMOUKEDIMA',
                'name': 'Dimapur & Chümoukedima',
                'description': 'Dimapur commercial hub, Chümoukedima township, and NH-29 corridor.',
                'state': 'Nagaland',
                'cities': ['dimapur', 'chümoukedima', 'chumoukedima', 'chumukedima'],
                'postal_codes': ['797112', '797113', '797115', '797103'],
                'display_order': 2,
            },
            {
                'code': 'MEDZIPHEMA',
                'name': 'Medziphema',
                'description': 'Medziphema town, campus, and Ghaspani areas.',
                'state': 'Nagaland',
                'cities': ['medziphema', 'ghaspani', 'gaspani'],
                'postal_codes': ['797106'],
                'display_order': 3,
            },
            {
                'code': 'ZUBZA_MERIEMA_JOTSOMA',
                'name': 'Zubza, Meriema and Jotsoma',
                'description': 'Outlying Kohima district settlements along Western NH and university corridor.',
                'state': 'Nagaland',
                'cities': ['zubza', 'meriema', 'jotsoma', 'sechü-zubza', 'sechu zubza', 'sechu-zubza'],
                'postal_codes': ['797002', '797004', '797115'],
                'display_order': 4,
            },
            {
                'code': 'ZAKHAMA',
                'name': 'Zakhama',
                'description': 'Southern Angami region, Zakhama military station, Jakhama, and Viswema corridor.',
                'state': 'Nagaland',
                'cities': ['zakhama', 'jakhama', 'viswema'],
                'postal_codes': ['797005', '797119'],
                'display_order': 5,
            },
            {
                'code': 'NORTH_EAST',
                'name': 'North East Region',
                'description': 'Assam, Meghalaya, Manipur, Mizoram, Tripura, Arunachal Pradesh, and Sikkim.',
                'state': 'North East',
                'cities': ['guwahati', 'shillong', 'imphal', 'itanagar', 'aizawl', 'agartala', 'gangtok', 'jorhat', 'silchar', 'tezpur', 'dibrugarh'],
                'postal_codes': ['78', '79'],
                'display_order': 6,
            },
            {
                'code': 'REST_OF_INDIA',
                'name': 'Rest of India',
                'description': 'All major metro cities and interstate destinations outside North East.',
                'state': 'All India',
                'cities': [],
                'postal_codes': ['1', '2', '3', '4', '5', '6', '7', '8'],
                'display_order': 7,
            },
        ]

        created_zones = {}
        for zd in zones_data:
            zone, _ = DeliveryZone.objects.update_or_create(
                code=zd['code'],
                defaults=zd
            )
            created_zones[zd['code']] = zone

        # 3. Delivery Rates Presets (Editable)
        # Note: activate defaults to False as business requires admin review before activation
        presets = [
            # 1. Kohima: Same-day delivery ₹80 per package. First 1kg included, ₹6 per 100g over 1kg.
            {
                'title': 'SwiftZone Kohima Same-Day Priority',
                'scope': DeliveryRate.Scope.ZONE_DEFAULT,
                'courier': swiftzone,
                'zone': created_zones['KOHIMA_LOCAL'],
                'delivery_method': DeliveryRate.DeliveryMethod.SAME_DAY,
                'base_rate': Decimal('80.00'),
                'per_package_rate': Decimal('80.00'),
                'included_weight_grams': 1000,
                'additional_weight_rate': Decimal('6.00'),
                'additional_weight_step_grams': 100,
                'max_items_per_package': 4,
                'max_weight_per_package_grams': 1500,
                'estimated_delivery_days_min': 0,
                'estimated_delivery_days_max': 0,
                'estimated_delivery_note': 'Same-Day Evening Delivery in Kohima',
                'is_locked': False,
                'is_active': activate,
            },
            # 2. Dimapur & Chümoukedima: Standard delivery ₹110 per package (1-2 days). Weight: 1kg included, ₹6/100g extra.
            {
                'title': 'SwiftZone Dimapur & Chümoukedima Standard',
                'scope': DeliveryRate.Scope.ZONE_DEFAULT,
                'courier': swiftzone,
                'zone': created_zones['DIMAPUR_CHUMOUKEDIMA'],
                'delivery_method': DeliveryRate.DeliveryMethod.STANDARD,
                'base_rate': Decimal('110.00'),
                'per_package_rate': Decimal('110.00'),
                'included_weight_grams': 1000,
                'additional_weight_rate': Decimal('6.00'),
                'additional_weight_step_grams': 100,
                'max_items_per_package': 4,
                'max_weight_per_package_grams': 1500,
                'estimated_delivery_days_min': 1,
                'estimated_delivery_days_max': 2,
                'estimated_delivery_note': '1–2 Business Days',
                'is_locked': False,
                'is_active': activate,
            },
            # 3. Dimapur & Chümoukedima: Same-day pickup and delivery ₹200 per package, cutoff 12:30 PM.
            {
                'title': 'SwiftZone Dimapur & Chümoukedima Same-Day',
                'scope': DeliveryRate.Scope.ZONE_DEFAULT,
                'courier': swiftzone,
                'zone': created_zones['DIMAPUR_CHUMOUKEDIMA'],
                'delivery_method': DeliveryRate.DeliveryMethod.SAME_DAY,
                'base_rate': Decimal('200.00'),
                'per_package_rate': Decimal('200.00'),
                'included_weight_grams': 1000,
                'additional_weight_rate': Decimal('6.00'),
                'additional_weight_step_grams': 100,
                'max_items_per_package': 4,
                'max_weight_per_package_grams': 1500,
                'same_day_cutoff_time': time(12, 30),
                'estimated_delivery_days_min': 0,
                'estimated_delivery_days_max': 0,
                'estimated_delivery_note': 'Same-Day Dispatch (Order before 12:30 PM)',
                'is_locked': False,
                'is_active': activate,
            },
            # 4. Medziphema: ₹150 per package (1-2 days). Weight: 1kg included, ₹6/100g extra.
            {
                'title': 'SwiftZone Medziphema Standard',
                'scope': DeliveryRate.Scope.ZONE_DEFAULT,
                'courier': swiftzone,
                'zone': created_zones['MEDZIPHEMA'],
                'delivery_method': DeliveryRate.DeliveryMethod.STANDARD,
                'base_rate': Decimal('150.00'),
                'per_package_rate': Decimal('150.00'),
                'included_weight_grams': 1000,
                'additional_weight_rate': Decimal('6.00'),
                'additional_weight_step_grams': 100,
                'max_items_per_package': 4,
                'max_weight_per_package_grams': 1500,
                'estimated_delivery_days_min': 1,
                'estimated_delivery_days_max': 2,
                'estimated_delivery_note': '1–2 Business Days',
                'is_locked': False,
                'is_active': activate,
            },
            # 5. Zubza, Meriema and Jotsoma: ₹150 per package. Single package scheduled Mon/Wed/Fri; multiple packages any day.
            {
                'title': 'SwiftZone Zubza, Meriema & Jotsoma Route',
                'scope': DeliveryRate.Scope.ZONE_DEFAULT,
                'courier': swiftzone,
                'zone': created_zones['ZUBZA_MERIEMA_JOTSOMA'],
                'delivery_method': DeliveryRate.DeliveryMethod.STANDARD,
                'base_rate': Decimal('150.00'),
                'per_package_rate': Decimal('150.00'),
                'included_weight_grams': 1000,
                'additional_weight_rate': Decimal('6.00'),
                'additional_weight_step_grams': 100,
                'max_items_per_package': 4,
                'max_weight_per_package_grams': 1500,
                'scheduled_days_of_week': ['MON', 'WED', 'FRI'],
                'min_packages_for_anyday': 2,
                'estimated_delivery_days_min': 1,
                'estimated_delivery_days_max': 3,
                'estimated_delivery_note': 'Scheduled Route (Mon, Wed, Fri for 1 package; Any day for 2+ packages)',
                'is_locked': False,
                'is_active': activate,
            },
            # 6. Zakhama: ₹170 per package. Single package scheduled Tue/Thu/Sat; multiple packages any day.
            {
                'title': 'SwiftZone Zakhama Regional Route',
                'scope': DeliveryRate.Scope.ZONE_DEFAULT,
                'courier': swiftzone,
                'zone': created_zones['ZAKHAMA'],
                'delivery_method': DeliveryRate.DeliveryMethod.STANDARD,
                'base_rate': Decimal('170.00'),
                'per_package_rate': Decimal('170.00'),
                'included_weight_grams': 1000,
                'additional_weight_rate': Decimal('6.00'),
                'additional_weight_step_grams': 100,
                'max_items_per_package': 4,
                'max_weight_per_package_grams': 1500,
                'scheduled_days_of_week': ['TUE', 'THU', 'SAT'],
                'min_packages_for_anyday': 2,
                'estimated_delivery_days_min': 1,
                'estimated_delivery_days_max': 3,
                'estimated_delivery_note': 'Scheduled Route (Tue, Thu, Sat for 1 package; Any day for 2+ packages)',
                'is_locked': False,
                'is_active': activate,
            },
            # 7. Bus / Sumo: Base charge ₹85
            {
                'title': 'Bus / Sumo Regional Station Counter Dispatch',
                'scope': DeliveryRate.Scope.ZONE_DEFAULT,
                'courier': bus_sumo,
                'zone': created_zones['KOHIMA_LOCAL'],
                'delivery_method': DeliveryRate.DeliveryMethod.BUS_SUMO,
                'base_rate': Decimal('85.00'),
                'per_package_rate': Decimal('85.00'),
                'included_weight_grams': 2000,
                'additional_weight_rate': Decimal('10.00'),
                'additional_weight_step_grams': 500,
                'max_items_per_package': 8,
                'max_weight_per_package_grams': 5000,
                'estimated_delivery_days_min': 1,
                'estimated_delivery_days_max': 1,
                'estimated_delivery_note': 'Pickup at destination town counter / Bus stand',
                'is_locked': False,
                'is_active': activate,
            },
            # 8. BlueDart North East: below 500g ₹115; 1kg ₹200.
            {
                'title': 'BlueDart North East Air Express (Up to 500g)',
                'scope': DeliveryRate.Scope.ZONE_DEFAULT,
                'courier': bluedart,
                'zone': created_zones['NORTH_EAST'],
                'delivery_method': DeliveryRate.DeliveryMethod.EXPRESS,
                'base_rate': Decimal('115.00'),
                'per_package_rate': Decimal('115.00'),
                'included_weight_grams': 500,
                'additional_weight_rate': Decimal('0.00'),
                'additional_weight_step_grams': 100,
                'max_items_per_package': 2,
                'max_weight_per_package_grams': 500,
                'estimated_delivery_days_min': 2,
                'estimated_delivery_days_max': 4,
                'estimated_delivery_note': '2–4 Business Days via BlueDart Air',
                'is_locked': False,
                'is_active': activate,
            },
            {
                'title': 'BlueDart North East Air Express (Up to 1kg)',
                'scope': DeliveryRate.Scope.ZONE_DEFAULT,
                'courier': bluedart,
                'zone': created_zones['NORTH_EAST'],
                'delivery_method': DeliveryRate.DeliveryMethod.STANDARD,
                'base_rate': Decimal('200.00'),
                'per_package_rate': Decimal('200.00'),
                'included_weight_grams': 1000,
                'additional_weight_rate': Decimal('0.00'),
                'additional_weight_step_grams': 100,
                'max_items_per_package': 4,
                'max_weight_per_package_grams': 1000,
                'estimated_delivery_days_min': 2,
                'estimated_delivery_days_max': 4,
                'estimated_delivery_note': '2–4 Business Days via BlueDart Air',
                'is_locked': False,
                'is_active': activate,
            },
            # 9. BlueDart Rest of India: below 500g ₹115; 1kg ₹210.
            {
                'title': 'BlueDart Rest of India Air Express (Up to 500g)',
                'scope': DeliveryRate.Scope.ZONE_DEFAULT,
                'courier': bluedart,
                'zone': created_zones['REST_OF_INDIA'],
                'delivery_method': DeliveryRate.DeliveryMethod.EXPRESS,
                'base_rate': Decimal('115.00'),
                'per_package_rate': Decimal('115.00'),
                'included_weight_grams': 500,
                'additional_weight_rate': Decimal('0.00'),
                'additional_weight_step_grams': 100,
                'max_items_per_package': 2,
                'max_weight_per_package_grams': 500,
                'estimated_delivery_days_min': 3,
                'estimated_delivery_days_max': 5,
                'estimated_delivery_note': '3–5 Business Days via BlueDart Air',
                'is_locked': False,
                'is_active': activate,
            },
            {
                'title': 'BlueDart Rest of India Air Express (Up to 1kg)',
                'scope': DeliveryRate.Scope.ZONE_DEFAULT,
                'courier': bluedart,
                'zone': created_zones['REST_OF_INDIA'],
                'delivery_method': DeliveryRate.DeliveryMethod.STANDARD,
                'base_rate': Decimal('210.00'),
                'per_package_rate': Decimal('210.00'),
                'included_weight_grams': 1000,
                'additional_weight_rate': Decimal('0.00'),
                'additional_weight_step_grams': 100,
                'max_items_per_package': 4,
                'max_weight_per_package_grams': 1000,
                'estimated_delivery_days_min': 3,
                'estimated_delivery_days_max': 5,
                'estimated_delivery_note': '3–5 Business Days via BlueDart Air',
                'is_locked': False,
                'is_active': activate,
            },
            # 10. India Post: Free pickup, shipping charges configured separately
            {
                'title': 'India Post Air Parcel (Standard National)',
                'scope': DeliveryRate.Scope.ZONE_DEFAULT,
                'courier': indiapost,
                'zone': created_zones['REST_OF_INDIA'],
                'delivery_method': DeliveryRate.DeliveryMethod.STANDARD,
                'base_rate': Decimal('90.00'),
                'per_package_rate': Decimal('90.00'),
                'included_weight_grams': 1000,
                'additional_weight_rate': Decimal('15.00'),
                'additional_weight_step_grams': 500,
                'max_items_per_package': 4,
                'max_weight_per_package_grams': 2000,
                'estimated_delivery_days_min': 4,
                'estimated_delivery_days_max': 7,
                'estimated_delivery_note': 'Free pickup from kitchen · 4–7 Days Nationwide',
                'is_locked': False,
                'is_active': activate,
            },
            # 11. Platform Default Fallback Rate
            {
                'title': 'Wangs Platform Standard Delivery Default',
                'scope': DeliveryRate.Scope.ADMIN_DEFAULT,
                'courier': swiftzone,
                'zone': None,
                'delivery_method': DeliveryRate.DeliveryMethod.STANDARD,
                'base_rate': Decimal('80.00'),
                'per_package_rate': Decimal('80.00'),
                'included_weight_grams': 1000,
                'additional_weight_rate': Decimal('6.00'),
                'additional_weight_step_grams': 100,
                'max_items_per_package': 4,
                'max_weight_per_package_grams': 1500,
                'estimated_delivery_days_min': 1,
                'estimated_delivery_days_max': 3,
                'estimated_delivery_note': 'Standard Marketplace Express',
                'is_locked': False,
                'is_active': True,  # Platform default is active to ensure reliable fallback
            }
        ]

        created_rates = []
        for p in presets:
            rate = DeliveryRate.objects.filter(
                title=p['title'],
                scope=p['scope'],
                zone=p.get('zone'),
                manufacturer=None,
                product=None
            ).first()

            if not rate:
                rate = DeliveryRate.objects.create(
                    created_by=admin_user,
                    approval_status=DeliveryRate.ApprovalStatus.APPROVED,
                    **p
                )
            else:
                # Update defaults if not yet reviewed/customized
                for k, v in p.items():
                    setattr(rate, k, v)
                rate.save()
            created_rates.append(rate)

        return {
            'couriers': 4,
            'zones': len(created_zones),
            'rates': len(created_rates),
        }


class DeliveryCalculator:
    """
    Computes precise, multi-package delivery charges using the required 5-tier priority:
    1. Admin-locked product-specific rate (scope=PRODUCT_SPECIFIC, is_locked=True)
    2. Manufacturer product-specific rate (scope=PRODUCT_SPECIFIC, is_locked=False, manufacturer=mfg)
    3. Admin-locked manufacturer or zone rate (scope in (MANUFACTURER_ZONE, ZONE_DEFAULT), is_locked=True)
    4. Manufacturer destination or zone rate (scope=MANUFACTURER_ZONE, manufacturer=mfg)
    5. Admin default rate (scope=ADMIN_DEFAULT or ZONE_DEFAULT)
    """

    @classmethod
    def match_zone_for_location(cls, postal_code=None, city=None, state=None):
        """Finds matching active delivery zone for given postal code and city."""
        postal_code = (postal_code or '').strip()
        city = (city or '').strip().lower()
        state = (state or '').strip().lower()

        active_zones = DeliveryZone.objects.filter(is_active=True).order_by('display_order')
        for zone in active_zones:
            if zone.matches_location(postal_code=postal_code, city=city, state=state):
                return zone
        return None

    @classmethod
    def find_applicable_rate_for_item(cls, product, zone=None, requested_method=None):
        """
        Finds the single highest-priority applicable DeliveryRate for a specific Product.
        Returns: DeliveryRate or None
        """
        mfg = product.manufacturer

        base_qs = DeliveryRate.objects.filter(
            is_active=True,
            approval_status=DeliveryRate.ApprovalStatus.APPROVED
        )
        if requested_method:
            base_qs = base_qs.filter(delivery_method=requested_method)

        # 1. Admin-locked product-specific rate
        r1 = base_qs.filter(
            scope=DeliveryRate.Scope.PRODUCT_SPECIFIC,
            product=product,
            is_locked=True
        ).order_by('-version', '-updated_at').first()
        if r1:
            return r1

        # 2. Manufacturer product-specific rate
        r2 = base_qs.filter(
            scope=DeliveryRate.Scope.PRODUCT_SPECIFIC,
            product=product,
            manufacturer=mfg,
            is_locked=False
        ).order_by('-version', '-updated_at').first()
        if r2:
            return r2

        # 3. Admin-locked manufacturer or zone rate
        if zone:
            r3_mfg = base_qs.filter(
                scope=DeliveryRate.Scope.MANUFACTURER_ZONE,
                manufacturer=mfg,
                zone=zone,
                is_locked=True
            ).order_by('-version', '-updated_at').first()
            if r3_mfg:
                return r3_mfg

            r3_zone = base_qs.filter(
                scope=DeliveryRate.Scope.ZONE_DEFAULT,
                zone=zone,
                is_locked=True
            ).order_by('-version', '-updated_at').first()
            if r3_zone:
                return r3_zone

        # 4. Manufacturer destination or zone rate
        if zone:
            r4 = base_qs.filter(
                scope=DeliveryRate.Scope.MANUFACTURER_ZONE,
                manufacturer=mfg,
                zone=zone,
                is_locked=False
            ).order_by('-version', '-updated_at').first()
            if r4:
                return r4

        # 5. Admin default rate (zone default or platform default)
        if zone:
            r5_zone = base_qs.filter(
                scope=DeliveryRate.Scope.ZONE_DEFAULT,
                zone=zone
            ).order_by('-version', '-updated_at').first()
            if r5_zone:
                return r5_zone

        r5_default = base_qs.filter(
            scope=DeliveryRate.Scope.ADMIN_DEFAULT
        ).order_by('-version', '-updated_at').first()

        return r5_default

    @classmethod
    def check_same_day_cutoff_valid(cls, rate):
        """
        Validates if order is placed before same-day cutoff time in Kohima local timezone.
        """
        if not rate or rate.delivery_method != DeliveryRate.DeliveryMethod.SAME_DAY:
            return True
        if not rate.same_day_cutoff_time:
            return True

        now_in_kohima = timezone.now().astimezone(KOHIMA_TZ)
        current_time = now_in_kohima.time()
        return current_time <= rate.same_day_cutoff_time

    @classmethod
    def calculate_delivery_quote(cls, cart_items, postal_code, city, state='', requested_method=None):
        """
        Comprehensive quote calculation:
        1. Identifies matched delivery zone.
        2. Groups items by manufacturer.
        3. For each manufacturer:
           - Resolves rate using 5-tier priority rules.
           - Calculates packaging bundling (items can legitimately share package box up to max capacity).
           - Computes base rate, per-package charges, weight surcharges, free shipping threshold.
        4. Calculates total delivery charge and estimated delivery window.
        5. If any manufacturer group has no available rate, returns is_deliverable=False.
        """
        postal_code = (postal_code or '').strip()
        city = (city or '').strip()
        state = (state or '').strip()

        matched_zone = cls.match_zone_for_location(postal_code=postal_code, city=city, state=state)

        # Group items by manufacturer
        manufacturer_groups = {}
        for item in cart_items:
            mfg_id = item.product.manufacturer_id
            if mfg_id not in manufacturer_groups:
                manufacturer_groups[mfg_id] = {
                    'manufacturer': item.product.manufacturer,
                    'items': [],
                    'total_items_count': 0,
                    'total_weight_grams': 0,
                    'subtotal': Decimal('0.00'),
                }
            qty = item.quantity
            w = (item.product.weight_grams or 250) * qty
            sub = quantize_amount(item.product.price * qty)

            manufacturer_groups[mfg_id]['items'].append(item)
            manufacturer_groups[mfg_id]['total_items_count'] += qty
            manufacturer_groups[mfg_id]['total_weight_grams'] += w
            manufacturer_groups[mfg_id]['subtotal'] += sub

        fulfillment_breakdown = []
        total_delivery_fee = Decimal('0.00')
        total_packages = 0
        all_deliverable = True
        missing_locations = []
        available_methods_set = set()
        estimated_windows = []

        now_in_kohima = timezone.now().astimezone(KOHIMA_TZ)
        current_weekday = now_in_kohima.strftime('%a').upper()[:3]  # e.g. MON, TUE

        for mfg_id, group in manufacturer_groups.items():
            mfg = group['manufacturer']
            items = group['items']
            total_items = group['total_items_count']
            total_weight = group['total_weight_grams']
            group_subtotal = group['subtotal']

            # Pick highest-priority rate for this group's primary products
            applicable_rate = None
            for it in items:
                r = cls.find_applicable_rate_for_item(it.product, zone=matched_zone, requested_method=requested_method)
                if r:
                    applicable_rate = r
                    break

            if not applicable_rate:
                # Fallback to general zone or platform default
                if matched_zone:
                    applicable_rate = DeliveryRate.objects.filter(
                        is_active=True,
                        approval_status=DeliveryRate.ApprovalStatus.APPROVED,
                        zone=matched_zone
                    ).first()
                if not applicable_rate:
                    applicable_rate = DeliveryRate.objects.filter(
                        is_active=True,
                        approval_status=DeliveryRate.ApprovalStatus.APPROVED,
                        scope=DeliveryRate.Scope.ADMIN_DEFAULT
                    ).first()

            if not applicable_rate:
                all_deliverable = False
                missing_locations.append(f"{mfg.business_name} does not deliver to {city or postal_code}")
                continue

            # Check same-day cutoff
            is_same_day = applicable_rate.delivery_method == DeliveryRate.DeliveryMethod.SAME_DAY
            same_day_available = True
            if is_same_day:
                if not cls.check_same_day_cutoff_valid(applicable_rate):
                    same_day_available = False

            # Package calculation: Items from same manufacturer share boxes
            max_items_pkg = max(1, applicable_rate.max_items_per_package)
            max_weight_pkg = max(500, applicable_rate.max_weight_per_package_grams)

            pkg_by_items = math.ceil(total_items / max_items_pkg)
            pkg_by_weight = math.ceil(total_weight / max_weight_pkg)
            packages_count = max(1, pkg_by_items, pkg_by_weight)

            # Scheduled day route verification (e.g. Zubza/Zakhama)
            scheduled_days = applicable_rate.scheduled_days_of_week or []
            min_for_anyday = applicable_rate.min_packages_for_anyday or 2
            is_scheduled_only = False
            schedule_note = ''
            if scheduled_days and packages_count < min_for_anyday:
                is_scheduled_only = True
                days_label = ", ".join(scheduled_days)
                schedule_note = f"Single package dispatch scheduled on {days_label}."
                if current_weekday not in scheduled_days:
                    schedule_note += f" (Next dispatch will occur on the next scheduled run)"

            # Cost calculation
            # Free delivery evaluation:
            is_free = False
            if applicable_rate.is_free_delivery:
                is_free = True
            elif applicable_rate.min_order_amount_for_free_delivery is not None and group_subtotal >= applicable_rate.min_order_amount_for_free_delivery:
                is_free = True

            base_fee = Decimal('0.00')
            additional_pkg_fee = Decimal('0.00')
            weight_surcharge = Decimal('0.00')

            if not is_free:
                base_fee = quantize_amount(applicable_rate.base_rate)
                if packages_count > 1:
                    per_pkg = applicable_rate.per_package_rate or applicable_rate.base_rate
                    additional_pkg_fee = quantize_amount(Decimal(str(packages_count - 1)) * per_pkg)

                # Weight surcharge: calculated per package or total weight over (packages * included_weight)
                total_included_weight = applicable_rate.included_weight_grams * packages_count
                if total_weight > total_included_weight and applicable_rate.additional_weight_rate > Decimal('0.00'):
                    extra_grams = total_weight - total_included_weight
                    step = max(1, applicable_rate.additional_weight_step_grams)
                    num_steps = math.ceil(extra_grams / step)
                    weight_surcharge = quantize_amount(Decimal(str(num_steps)) * applicable_rate.additional_weight_rate)

            group_delivery_fee = quantize_amount(base_fee + additional_pkg_fee + weight_surcharge)
            total_delivery_fee += group_delivery_fee
            total_packages += packages_count
            available_methods_set.add(applicable_rate.delivery_method)

            # Estimated delivery string
            est_note = applicable_rate.estimated_delivery_note
            if not est_note:
                if is_same_day:
                    est_note = "Today by 7:00 PM" if same_day_available else "Tomorrow (Cutoff Passed)"
                else:
                    min_d = applicable_rate.estimated_delivery_days_min or 1
                    max_d = applicable_rate.estimated_delivery_days_max or 2
                    est_note = f"{min_d}–{max_d} Business Days"

            estimated_windows.append(est_note)

            fulfillment_breakdown.append({
                'manufacturer_id': mfg.id,
                'manufacturer_name': mfg.business_name,
                'origin_city': getattr(mfg, 'location_district', 'Kohima, Nagaland'),
                'rate_id': applicable_rate.id,
                'rate_title': applicable_rate.title,
                'rate_version': applicable_rate.version,
                'courier_name': applicable_rate.courier.name if applicable_rate.courier else 'SwiftZone Express',
                'delivery_method': applicable_rate.delivery_method,
                'delivery_method_display': applicable_rate.get_delivery_method_display(),
                'is_admin_locked': applicable_rate.is_locked,
                'packages_count': packages_count,
                'total_weight_grams': total_weight,
                'items_count': total_items,
                'base_rate': str(base_fee),
                'additional_package_fee': str(additional_pkg_fee),
                'weight_surcharge': str(weight_surcharge),
                'group_delivery_fee': str(group_delivery_fee),
                'is_free_delivery': is_free,
                'same_day_available': same_day_available,
                'is_scheduled_only': is_scheduled_only,
                'schedule_note': schedule_note,
                'estimated_delivery': est_note,
            })

        if not all_deliverable:
            return {
                'is_deliverable': False,
                'error_message': 'Delivery not available for this location',
                'details': missing_locations,
                'total_delivery_fee': '0.00',
                'total_packages': 0,
                'fulfillment_breakdown': [],
                'matched_zone': matched_zone.name if matched_zone else None,
            }

        # Check platform promotions (e.g. Free shipping above min spend)
        cart_subtotal = sum(g['subtotal'] for g in manufacturer_groups.values())
        promo = ShippingPromotion.objects.filter(
            is_active=True,
            promo_type=ShippingPromotion.PromoType.FREE_SHIPPING,
            min_spend__lte=cart_subtotal
        ).first()

        applied_promo = None
        if promo:
            total_delivery_fee = Decimal('0.00')
            applied_promo = {
                'name': promo.name,
                'discount_value': 'FREE',
            }

        primary_est = estimated_windows[0] if estimated_windows else "1–2 Business Days"

        return {
            'is_deliverable': True,
            'matched_zone': {
                'id': matched_zone.id if matched_zone else None,
                'name': matched_zone.name if matched_zone else 'Standard Zone',
                'code': matched_zone.code if matched_zone else 'STANDARD',
            } if matched_zone else None,
            'total_delivery_fee': str(quantize_amount(total_delivery_fee)),
            'total_packages': total_packages,
            'applied_promotion': applied_promo,
            'available_methods': list(available_methods_set),
            'estimated_delivery': primary_est,
            'fulfillment_breakdown': fulfillment_breakdown,
        }
