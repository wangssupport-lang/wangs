import zoneinfo
from datetime import time
from django.utils import timezone
from .models import (
    ManufacturerProfile,
    Product,
    DeliveryZone,
    DeliveryRate,
    CourierService,
    CommissionSetting,
)
from .delivery_service import DeliveryCalculator, DeliveryService, KOHIMA_TZ


class SameDayService:
    """
    Server-side eligibility engine for Wangs 'Get It Today' same-day shopping.
    All location, seller, stock, operating-day, cutoff-time, and delivery-zone checks
    are evaluated on the backend in Asia/Kolkata (Kohima) time.
    """

    @staticmethod
    def ensure_delivery_presets():
        if not DeliveryZone.objects.filter(is_active=True).exists():
            try:
                DeliveryService.seed_swiftzone_and_partner_presets(activate=True)
            except Exception:
                pass

    @staticmethod
    def normalize_list(values):
        if not values:
            return []
        if isinstance(values, str):
            values = [v.strip() for v in values.split(',')]
        cleaned = []
        seen = set()
        for v in values:
            s = str(v or '').strip()
            if s and s.lower() not in seen:
                seen.add(s.lower())
                cleaned.append(s)
        return cleaned

    @classmethod
    def match_location(cls, postal_code='', town='', district='', state=''):
        cls.ensure_delivery_presets()
        postal_code = (postal_code or '').strip()
        town = (town or '').strip()
        district = (district or '').strip()
        state = (state or '').strip()

        city_query = town or district
        zone = DeliveryCalculator.match_zone_for_location(
            postal_code=postal_code,
            city=city_query,
            state=state,
        )
        if not zone and town and district and town.lower() != district.lower():
            zone = DeliveryCalculator.match_zone_for_location(
                postal_code=postal_code,
                city=district,
                state=state,
            )

        return {
            'postal_code': postal_code,
            'town': town,
            'district': district,
            'state': state,
            'zone': zone,
        }

    @classmethod
    def seller_has_dispatch_location(cls, seller):
        return bool(
            (seller.same_day_dispatch_town or '').strip()
            or (seller.same_day_dispatch_district or '').strip()
            or (seller.location_district or '').strip()
            or (seller.postal_code or '').strip()
        )

    @classmethod
    def seller_covers_location(cls, seller, postal_code='', town='', district=''):
        """
        Verify explicit seller same-day coverage (PIN code or town/district list).
        Never assumes same-day eligibility solely because customer & seller share a district.
        """
        postal_code = (postal_code or '').strip()
        town_l = (town or '').strip().lower()
        district_l = (district or '').strip().lower()

        covered_pins = [str(p).strip() for p in (seller.same_day_covered_pincodes or []) if str(p).strip()]
        covered_towns = [str(t).strip().lower() for t in (seller.same_day_covered_towns or []) if str(t).strip()]

        if postal_code and covered_pins:
            for pin in covered_pins:
                if postal_code == pin:
                    return True

        if covered_towns:
            if town_l:
                for t in covered_towns:
                    if t == town_l:
                        return True
            elif not postal_code and district_l:
                for t in covered_towns:
                    if t == district_l:
                        return True

        return False

    @classmethod
    def is_seller_local_by_registration(cls, seller, postal_code='', town='', district=''):
        """
        Check if a seller's registered business/dispatch location is in the customer's area
        (used to distinguish 'No local sellers' from 'Delivery unavailable' / 'No eligible products').
        """
        postal_code = (postal_code or '').strip()
        town_l = (town or '').strip().lower()
        district_l = (district or '').strip().lower()

        if postal_code and (seller.postal_code or '').strip() == postal_code:
            return True

        seller_locs = " ".join([
            (seller.same_day_dispatch_town or ''),
            (seller.same_day_dispatch_district or ''),
            (seller.location_district or ''),
        ]).lower()

        if town_l and town_l in seller_locs:
            return True
        if district_l and district_l in seller_locs:
            return True
        return cls.seller_covers_location(seller, postal_code=postal_code, town=town, district=district)

    @classmethod
    def get_platform_cutoff_time(cls):
        """
        Returns the admin-configurable platform-wide Get It Today cutoff time in IST (default 6:00 PM).
        """
        try:
            setting = CommissionSetting.get_current()
            if setting and getattr(setting, 'same_day_cutoff_time', None):
                return setting.same_day_cutoff_time
        except Exception:
            pass
        return time(18, 0)

    @classmethod
    def get_effective_cutoff_time(cls, seller=None, rate=None, platform_cutoff=None):
        """
        Returns the strictest applicable cutoff time among the admin platform cutoff,
        seller cutoff, and courier rate cutoff.
        """
        cutoffs = [platform_cutoff or cls.get_platform_cutoff_time()]
        if seller and getattr(seller, 'same_day_cutoff_time', None):
            cutoffs.append(seller.same_day_cutoff_time)
        if rate and getattr(rate, 'same_day_cutoff_time', None):
            cutoffs.append(rate.same_day_cutoff_time)
        return min(cutoffs)

    @classmethod
    def check_seller_schedule(cls, seller, now_dt=None, platform_cutoff=None):
        """
        Evaluate seller's operating days and daily cutoff time in Asia/Kolkata.
        Returns (is_open_now: bool, reason: str, cutoff_str: str | None)
        """
        now_ist = (now_dt or timezone.now()).astimezone(KOHIMA_TZ)
        weekday = now_ist.weekday()  # 0=Mon .. 6=Sun
        cutoff = cls.get_effective_cutoff_time(seller=seller, platform_cutoff=platform_cutoff)

        op_days = seller.same_day_operating_days
        if isinstance(op_days, list) and len(op_days) > 0:
            normalized_days = [int(d) for d in op_days if str(d).isdigit()]
            if normalized_days and weekday not in normalized_days:
                return False, 'Seller is not operating for same-day orders today.', cls.format_cutoff(cutoff)

        if cutoff and now_ist.time() > cutoff:
            return False, f"Daily same-day order cutoff ({cls.format_cutoff(cutoff)}) has passed.", cls.format_cutoff(cutoff)

        return True, '', cls.format_cutoff(cutoff)

    @staticmethod
    def format_cutoff(cutoff_time):
        if not cutoff_time:
            return None
        return cutoff_time.strftime('%I:%M %p').lstrip('0')

    @classmethod
    def get_platform_same_day_rate(cls, product, zone):
        """
        Verify platform delivery support: active DeliveryZone + active SAME_DAY DeliveryRate + active CourierService.
        Returns DeliveryRate or None.
        """
        if not zone or not zone.is_active:
            return None

        rate = DeliveryCalculator.find_applicable_rate_for_item(
            product,
            zone=zone,
            requested_method=DeliveryRate.DeliveryMethod.SAME_DAY,
        )
        if not rate or rate.delivery_method != DeliveryRate.DeliveryMethod.SAME_DAY:
            return None
        if rate.courier and not rate.courier.is_active:
            return None
        if not CourierService.objects.filter(is_active=True).exists():
            return None
        return rate

    @classmethod
    def check_product_same_day_eligibility(
        cls,
        product,
        postal_code='',
        town='',
        district='',
        state='',
        now_dt=None,
        precomputed_loc=None,
        precomputed_platform_cutoff=None,
        precomputed_rate_fn=None,
    ):
        """
        Evaluate all 7 mandatory conditions for a single product & location.
        Returns dict: { eligible: bool, reason: str, rate: DeliveryRate | None, estimated_window: str | None }
        """
        seller = product.manufacturer
        if not seller or seller.status != ManufacturerProfile.Status.APPROVED:
            return {'eligible': False, 'reason': 'Seller is not approved.', 'rate': None, 'estimated_window': None}

        if not cls.seller_has_dispatch_location(seller):
            return {'eligible': False, 'reason': 'Seller dispatch location is not configured.', 'rate': None, 'estimated_window': None}

        if not product.is_available_for_sale():
            return {'eligible': False, 'reason': f"'{product.title}' is currently out of stock or unavailable.", 'rate': None, 'estimated_window': None}

        if not seller.same_day_enabled:
            return {'eligible': False, 'reason': f"'{seller.business_name}' has not enabled same-day fulfilment.", 'rate': None, 'estimated_window': None}

        if seller.same_day_paused:
            return {'eligible': False, 'reason': f"'{seller.business_name}' has temporarily paused same-day orders.", 'rate': None, 'estimated_window': None}

        if not product.same_day_eligible:
            return {'eligible': False, 'reason': f"'{product.title}' is not enabled for same-day delivery.", 'rate': None, 'estimated_window': None}

        if not cls.seller_covers_location(seller, postal_code=postal_code, town=town, district=district):
            return {'eligible': False, 'reason': f"'{seller.business_name}' does not cover this location for same-day delivery.", 'rate': None, 'estimated_window': None}

        is_open, schedule_reason, _ = cls.check_seller_schedule(
            seller, now_dt=now_dt, platform_cutoff=precomputed_platform_cutoff
        )
        if not is_open:
            return {'eligible': False, 'reason': schedule_reason, 'rate': None, 'estimated_window': None}

        loc = precomputed_loc or cls.match_location(postal_code=postal_code, town=town, district=district, state=state)
        zone = loc['zone']
        if not zone:
            return {'eligible': False, 'reason': 'Platform same-day delivery is not supported in this area.', 'rate': None, 'estimated_window': None}

        rate = precomputed_rate_fn(product, zone) if precomputed_rate_fn else cls.get_platform_same_day_rate(product, zone)
        if not rate:
            return {'eligible': False, 'reason': 'No active same-day courier service is available for this zone.', 'rate': None, 'estimated_window': None}

        now_ist = (now_dt or timezone.now()).astimezone(KOHIMA_TZ)
        if rate.same_day_cutoff_time and now_ist.time() > rate.same_day_cutoff_time:
            return {
                'eligible': False,
                'reason': f"Courier same-day cutoff ({cls.format_cutoff(rate.same_day_cutoff_time)}) has passed.",
                'rate': rate,
                'estimated_window': None,
            }

        est_window = (rate.estimated_delivery_note or '').strip() or None
        return {
            'eligible': True,
            'reason': '',
            'rate': rate,
            'estimated_window': est_window,
        }

    @classmethod
    def get_available_for_location(cls, postal_code='', town='', district='', state='', now_dt=None):
        """
        Determine customer-facing state ('LOCATION_REQUIRED', 'NO_LOCAL_SELLERS',
        'DELIVERY_UNAVAILABLE', 'NO_ELIGIBLE_PRODUCTS', 'PRODUCTS_AVAILABLE')
        and return matching sellers + eligible products.
        """
        postal_code = (postal_code or '').strip()
        town = (town or '').strip()
        district = (district or '').strip()
        state = (state or '').strip()

        if not postal_code and not town and not district:
            return {
                'status_code': 'LOCATION_REQUIRED',
                'message': 'Please select or detect your delivery location to see products available for same-day delivery.',
                'location': {'postal_code': '', 'town': '', 'district': '', 'state': '', 'zone': None},
                'local_sellers': [],
                'products': [],
            }

        loc = cls.match_location(postal_code=postal_code, town=town, district=district, state=state)
        zone = loc['zone']

        approved_sellers = list(
            ManufacturerProfile.objects.filter(status=ManufacturerProfile.Status.APPROVED).order_by('business_name')
        )
        local_sellers = [
            s for s in approved_sellers
            if cls.is_seller_local_by_registration(s, postal_code=postal_code, town=town, district=district)
        ]

        if not local_sellers:
            return {
                'status_code': 'NO_LOCAL_SELLERS',
                'message': "Sorry, we don't have sellers serving your area for same-day delivery yet.",
                'location': cls._serialize_location(loc),
                'local_sellers': [],
                'products': [],
            }

        # Preload active SAME_DAY rates and platform cutoff once to avoid per-product N+1 queries
        platform_cutoff = cls.get_platform_cutoff_time()
        same_day_rates = list(
            DeliveryRate.objects.filter(
                is_active=True,
                approval_status=DeliveryRate.ApprovalStatus.APPROVED,
                delivery_method=DeliveryRate.DeliveryMethod.SAME_DAY,
            ).select_related('courier', 'zone', 'product', 'manufacturer')
        )
        has_active_courier = bool(zone and zone.is_active and CourierService.objects.filter(is_active=True).exists())
        has_zone_same_day_rate = False
        if has_active_courier:
            has_zone_same_day_rate = any(
                (r.zone_id == zone.id) or (r.scope == DeliveryRate.Scope.PRODUCT_SPECIFIC)
                for r in same_day_rates
            )

        if not zone or not has_zone_same_day_rate:
            return {
                'status_code': 'DELIVERY_UNAVAILABLE',
                'message': 'Same-day delivery is currently unavailable in your selected area.',
                'location': cls._serialize_location(loc),
                'local_sellers': [cls._serialize_public_seller(s, now_dt=now_dt) for s in local_sellers],
                'products': [],
            }

        def resolve_same_day_rate_fast(prod, target_zone):
            if not target_zone or not target_zone.is_active:
                return None
            # Priority 1: Product-specific rate for this zone or global product-specific
            for r in same_day_rates:
                if r.scope == DeliveryRate.Scope.PRODUCT_SPECIFIC and r.product_id == prod.id:
                    if r.zone_id in (None, target_zone.id) and (not r.courier or r.courier.is_active):
                        return r
            # Priority 2: Manufacturer-specific rate for this zone
            for r in same_day_rates:
                if r.scope == DeliveryRate.Scope.MANUFACTURER_ZONE and r.manufacturer_id == prod.manufacturer_id:
                    if r.zone_id in (None, target_zone.id) and (not r.courier or r.courier.is_active):
                        return r
            # Priority 3: Zone default same-day rate
            for r in same_day_rates:
                if r.scope == DeliveryRate.Scope.ZONE_DEFAULT and r.zone_id == target_zone.id:
                    if not r.courier or r.courier.is_active:
                        return r
            return None

        # Evaluate products of all approved sellers
        candidate_products = (
            Product.objects.filter(
                manufacturer__in=approved_sellers,
                status=Product.Status.APPROVED,
                is_active=True,
                stock_quantity__gt=0,
                same_day_eligible=True,
            )
            .select_related('manufacturer', 'category')
            .prefetch_related('reviews')
        )

        eligible_entries = []
        for product in candidate_products:
            check = cls.check_product_same_day_eligibility(
                product,
                postal_code=postal_code,
                town=town,
                district=district,
                state=state,
                now_dt=now_dt,
                precomputed_loc=loc,
                precomputed_platform_cutoff=platform_cutoff,
                precomputed_rate_fn=resolve_same_day_rate_fast,
            )
            if check['eligible']:
                eligible_entries.append((product, check))

        if not eligible_entries:
            serialized_sellers = [cls._serialize_public_seller(s, now_dt=now_dt) for s in local_sellers]
            cutoff_notes = [
                s.get('status_note')
                for s in serialized_sellers
                if s.get('same_day_enabled') and not s.get('same_day_paused') and s.get('status_note')
            ]
            msg = (
                f"{cutoff_notes[0]} Same-day delivery resumes on the next operating window."
                if cutoff_notes
                else 'No products are currently available for same-day delivery in your location.'
            )
            return {
                'status_code': 'NO_ELIGIBLE_PRODUCTS',
                'message': msg,
                'location': cls._serialize_location(loc),
                'local_sellers': serialized_sellers,
                'products': [],
            }

        return {
            'status_code': 'PRODUCTS_AVAILABLE',
            'message': f'{len(eligible_entries)} product(s) available for same-day delivery.',
            'location': cls._serialize_location(loc),
            'local_sellers': [cls._serialize_public_seller(s, now_dt=now_dt) for s in local_sellers],
            'products': eligible_entries,
        }

    @classmethod
    def validate_cart_same_day(cls, cart_items, shipping_details, now_dt=None):
        """
        Validate every cart item and seller group independently for same-day checkout.
        Raises ValueError with clear, user-facing reason if any product or seller fails.
        """
        postal_code = (shipping_details.get('postal_code') or '').strip()
        town = (shipping_details.get('city') or '').strip()
        district = (shipping_details.get('district') or town).strip()
        state = (shipping_details.get('state') or '').strip()

        if not postal_code and not town:
            raise ValueError('Delivery address with town/city and PIN code is required for same-day delivery.')

        seller_groups = {}
        for item in cart_items:
            mfg_id = item.product.manufacturer_id
            seller_groups.setdefault(mfg_id, []).append(item)

        errors = []
        for _, items in seller_groups.items():
            for item in items:
                product = item.product
                if product.stock_quantity < item.quantity:
                    errors.append(
                        f"'{product.title}' only has {product.stock_quantity} unit(s) in stock."
                    )
                    continue
                check = cls.check_product_same_day_eligibility(
                    product,
                    postal_code=postal_code,
                    town=town,
                    district=district,
                    state=state,
                    now_dt=now_dt,
                )
                if not check['eligible']:
                    errors.append(f"{product.title}: {check['reason']}")

        if errors:
            raise ValueError(
                'Same-day delivery is not available for one or more items in your cart: ' + ' '.join(errors)
            )

    @classmethod
    def get_supported_platform_coverage(cls):
        """
        Returns platform-supported DeliveryZones that have active SAME_DAY delivery rates,
        so sellers cannot claim unsupported coverage in their dashboard.
        """
        cls.ensure_delivery_presets()
        same_day_zone_ids = set(
            DeliveryRate.objects.filter(
                is_active=True,
                approval_status=DeliveryRate.ApprovalStatus.APPROVED,
                delivery_method=DeliveryRate.DeliveryMethod.SAME_DAY,
                zone__isnull=False,
            ).values_list('zone_id', flat=True)
        )
        zones = DeliveryZone.objects.filter(id__in=same_day_zone_ids, is_active=True).order_by('display_order', 'name')
        supported_towns = []
        supported_pincodes = []
        zone_list = []
        for z in zones:
            cities = [str(c).strip() for c in (z.cities or []) if str(c).strip()]
            pins = [str(p).strip() for p in (z.postal_codes or []) if str(p).strip()]
            supported_towns.extend(cities)
            supported_pincodes.extend(pins)
            zone_list.append({
                'id': z.id,
                'code': z.code,
                'name': z.name,
                'state': z.state,
                'cities': cities,
                'postal_codes': pins,
            })
        return {
            'zones': zone_list,
            'supported_towns': cls.normalize_list(supported_towns),
            'supported_pincodes': cls.normalize_list(supported_pincodes),
        }

    @classmethod
    def _serialize_location(cls, loc):
        z = loc.get('zone')
        return {
            'postal_code': loc.get('postal_code', ''),
            'town': loc.get('town', ''),
            'district': loc.get('district', ''),
            'state': loc.get('state', ''),
            'zone': {
                'id': z.id,
                'code': z.code,
                'name': z.name,
                'state': z.state,
            } if z else None,
        }

    @classmethod
    def _serialize_public_seller(cls, seller, now_dt=None):
        is_open, reason, cutoff_str = cls.check_seller_schedule(seller, now_dt=now_dt)
        return {
            'id': seller.id,
            'business_name': seller.business_name,
            'slug': seller.slug,
            'dispatch_location': seller.same_day_dispatch_town or seller.same_day_dispatch_district or seller.location_district,
            'same_day_enabled': seller.same_day_enabled,
            'same_day_paused': seller.same_day_paused,
            'cutoff_time': cutoff_str,
            'operating_now': is_open and not seller.same_day_paused and seller.same_day_enabled,
            'status_note': reason if not is_open else ('Temporarily paused' if seller.same_day_paused else ''),
        }
