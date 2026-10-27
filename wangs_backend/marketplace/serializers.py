from rest_framework import serializers
from decimal import Decimal, ROUND_HALF_UP
from django.contrib.auth import authenticate
from django.utils.text import slugify
import uuid
from django.db import transaction
from django.db.models import Sum, Q
from .models import (
    User, CustomerProfile, Address, ManufacturerProfile, ComplianceDocument,
    Category, Product, ProductImage, ProductReview, CommissionSetting, CommissionChangeLog,
    Cart, CartItem, Order, OrderItem, PaymentTransaction, Refund,
    ManufacturerSettlement, Coupon, AuditLog
)


class UserSerializer(serializers.ModelSerializer):
    is_authorized_to_sell = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'phone_number', 'is_staff', 'can_sell', 'is_authorized_to_sell',
            'is_active', 'is_banned', 'ban_reason', 'banned_at'
        ]
        read_only_fields = ['id', 'role', 'is_staff', 'can_sell', 'is_authorized_to_sell', 'is_active', 'is_banned', 'ban_reason', 'banned_at']

    def get_is_authorized_to_sell(self, obj):
        return obj.is_authorized_to_sell()


class AdminUserSerializer(serializers.ModelSerializer):
    is_authorized_to_sell = serializers.SerializerMethodField()
    orders_count = serializers.SerializerMethodField()
    total_spent = serializers.SerializerMethodField()
    manufacturer_business_name = serializers.SerializerMethodField()
    manufacturer_status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'phone_number', 'is_staff', 'can_sell', 'is_authorized_to_sell',
            'is_active', 'is_banned', 'ban_reason', 'banned_at',
            'date_joined', 'last_login', 'orders_count', 'total_spent',
            'manufacturer_business_name', 'manufacturer_status'
        ]
        read_only_fields = ['id', 'is_staff', 'is_authorized_to_sell', 'date_joined', 'last_login']

    def get_is_authorized_to_sell(self, obj):
        return obj.is_authorized_to_sell()

    def get_orders_count(self, obj):
        q = Q(user=obj)
        if obj.email:
            q |= Q(customer_email__iexact=obj.email)
        return Order.objects.filter(q).distinct().count()

    def get_total_spent(self, obj):
        q = Q(user=obj)
        if obj.email:
            q |= Q(customer_email__iexact=obj.email)
        spent = Order.objects.filter(
            q,
            payment_status=Order.PaymentStatus.PAID
        ).distinct().aggregate(sum=Sum('total_amount'))['sum'] or Decimal('0.00')
        return str(spent)

    def get_manufacturer_business_name(self, obj):
        mfg = getattr(obj, 'manufacturer_profile', None)
        return mfg.business_name if mfg else None

    def get_manufacturer_status(self, obj):
        mfg = getattr(obj, 'manufacturer_profile', None)
        return mfg.status if mfg else None


class RegisterSerializer(serializers.ModelSerializer):
    username = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=6)
    role = serializers.ChoiceField(choices=User.Role.choices, default=User.Role.CUSTOMER)
    address_line1 = serializers.CharField(required=False, allow_blank=True, write_only=True)
    address_line2 = serializers.CharField(required=False, allow_blank=True, write_only=True)
    city = serializers.CharField(required=False, allow_blank=True, write_only=True)
    state = serializers.CharField(required=False, allow_blank=True, write_only=True)
    postal_code = serializers.RegexField(
        regex=r'^\d{6}$', required=False, allow_blank=True, write_only=True
    )

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'password', 'first_name', 'last_name',
            'phone_number', 'role', 'address_line1', 'address_line2', 'city',
            'state', 'postal_code',
        ]

    def validate_email(self, value):
        email = (value or '').strip().lower()
        if not email:
            raise serializers.ValidationError('Email address is required.')
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError('An account is already created with this email. Please sign in or use "Forgot Password".')
        return email

    def validate(self, attrs):
        attrs = super().validate(attrs)
        address_fields = ('address_line1', 'city', 'state', 'postal_code')
        address_started = any(attrs.get(field) for field in address_fields)
        if address_started:
            missing_fields = [field for field in address_fields if not attrs.get(field)]
            if not attrs.get('first_name'):
                missing_fields.append('first_name')
            if missing_fields:
                raise serializers.ValidationError({
                    field: 'This field is required when adding a delivery address.'
                    for field in missing_fields
                })
            if not attrs.get('phone_number'):
                raise serializers.ValidationError({
                    'phone_number': 'A phone number is required for a delivery address.'
                })
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        password = validated_data.pop('password')
        address_line1 = validated_data.pop('address_line1', '')
        address_line2 = validated_data.pop('address_line2', '')
        city = validated_data.pop('city', '')
        state = validated_data.pop('state', '')
        postal_code = validated_data.pop('postal_code', '')
        if not validated_data.get('username'):
            validated_data['username'] = f"customer_{uuid.uuid4().hex}"
        role = validated_data.get('role', User.Role.CUSTOMER)
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()
        if role == User.Role.CUSTOMER:
            CustomerProfile.objects.create(user=user)
            if address_line1:
                Address.objects.create(
                    user=user,
                    full_name=f"{user.first_name} {user.last_name}".strip(),
                    phone=user.phone_number,
                    address_line1=address_line1,
                    address_line2=address_line2,
                    city=city,
                    state=state,
                    postal_code=postal_code,
                    is_default=True,
                )
        return user


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = '__all__'
        read_only_fields = ['user', 'created_at']


class CustomerProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    addresses = AddressSerializer(source='user.addresses', many=True, read_only=True)

    class Meta:
        model = CustomerProfile
        fields = ['id', 'user', 'newsletter_subscribed', 'addresses', 'created_at']


class ComplianceDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplianceDocument
        fields = '__all__'
        read_only_fields = ['uploaded_at', 'is_verified', 'verification_notes']


class ManufacturerProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    documents = ComplianceDocumentSerializer(many=True, read_only=True)
    products_count = serializers.SerializerMethodField()
    active_products_count = serializers.SerializerMethodField()
    total_items_sold = serializers.SerializerMethodField()
    total_sales_revenue = serializers.SerializerMethodField()

    class Meta:
        model = ManufacturerProfile
        fields = [
            'id', 'user', 'business_name', 'slug', 'brand_story', 'location_district',
            'contact_email', 'contact_phone', 'business_address', 'postal_code',
            'fssai_license_number', 'gst_number', 'compliance_notes',
            'bank_account_holder', 'bank_account_number', 'bank_ifsc_code', 'bank_name',
            'status', 'commission_rate_override', 'is_verified_producer',
            'is_featured', 'display_priority', 'tagline', 'brand_badge', 'hero_banner', 'logo_image',
            'admin_review_notes', 'documents', 'products_count', 'active_products_count',
            'total_items_sold', 'total_sales_revenue', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'slug', 'status', 'commission_rate_override', 'is_verified_producer', 'created_at']

    def validate_fssai_license_number(self, value):
        if value:
            cleaned = str(value).strip()
            if not cleaned.isdigit() or len(cleaned) != 14:
                raise serializers.ValidationError('FSSAI license number must be a valid 14-digit numeric code.')
            return cleaned
        raise serializers.ValidationError('FSSAI license number is mandatory for all sellers.')

    def get_products_count(self, obj):
        return obj.products.count()

    def get_active_products_count(self, obj):
        return obj.products.filter(is_active=True, status=Product.Status.APPROVED).count()

    def get_total_items_sold(self, obj):
        paid_items = OrderItem.objects.filter(
            manufacturer=obj,
            order__payment_status=Order.PaymentStatus.PAID
        ).aggregate(sum=Sum('quantity'))['sum']
        if paid_items is not None and paid_items > 0:
            return paid_items
        all_items = OrderItem.objects.filter(manufacturer=obj).aggregate(sum=Sum('quantity'))['sum']
        return all_items or 0

    def get_total_sales_revenue(self, obj):
        paid_rev = OrderItem.objects.filter(
            manufacturer=obj,
            order__payment_status=Order.PaymentStatus.PAID
        ).aggregate(sum=Sum('subtotal'))['sum']
        if paid_rev is not None and paid_rev > 0:
            return str(paid_rev)
        all_rev = OrderItem.objects.filter(manufacturer=obj).aggregate(sum=Sum('subtotal'))['sum']
        return str(all_rev or Decimal('0.00'))


class BrandSerializer(serializers.ModelSerializer):
    products_count = serializers.SerializerMethodField()
    sample_products = serializers.SerializerMethodField()

    class Meta:
        model = ManufacturerProfile
        fields = [
            'id', 'business_name', 'slug', 'brand_story', 'location_district',
            'fssai_license_number', 'is_verified_producer', 'is_featured', 'display_priority',
            'tagline', 'brand_badge', 'hero_banner', 'logo_image',
            'products_count', 'sample_products', 'created_at'
        ]

    def get_products_count(self, obj):
        return obj.products.filter(is_active=True, status=Product.Status.APPROVED).count()

    def get_sample_products(self, obj):
        prods = obj.products.filter(is_active=True, status=Product.Status.APPROVED)[:4]
        return [
            {
                'id': p.id,
                'title': p.title,
                'slug': p.slug,
                'price': str(p.price),
                'mrp': str(p.mrp) if p.mrp else None,
                'weight_grams': p.weight_grams,
                'image': p.primary_image.image_url if hasattr(p, 'primary_image') and p.primary_image else None
            }
            for p in prods
        ]


class ManufacturerApplicationSerializer(serializers.ModelSerializer):
    username = serializers.CharField(write_only=True)
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True, min_length=6)
    full_name = serializers.CharField(write_only=True)
    fssai_license_number = serializers.CharField(
        required=True,
        min_length=14,
        max_length=14,
        error_messages={
            'required': 'FSSAI License Number is mandatory to create a seller account.',
            'blank': 'FSSAI License Number is mandatory to create a seller account.',
            'min_length': 'FSSAI License Number must be a valid 14-digit numeric code.',
            'max_length': 'FSSAI License Number must be a valid 14-digit numeric code.',
        }
    )

    class Meta:
        model = ManufacturerProfile
        fields = [
            'username', 'email', 'password', 'full_name',
            'business_name', 'brand_story', 'location_district',
            'contact_email', 'contact_phone', 'business_address', 'postal_code',
            'fssai_license_number', 'gst_number', 'compliance_notes',
            'bank_account_holder', 'bank_account_number', 'bank_ifsc_code', 'bank_name'
        ]

    def validate_fssai_license_number(self, value):
        cleaned = str(value).strip()
        if not cleaned:
            raise serializers.ValidationError('FSSAI License Number is mandatory to create a seller account.')
        if not cleaned.isdigit() or len(cleaned) != 14:
            raise serializers.ValidationError('FSSAI License Number must be a valid 14-digit numeric code.')
        return cleaned

    def create(self, validated_data):
        username = validated_data.pop('username')
        email = validated_data.pop('email')
        password = validated_data.pop('password')
        full_name = validated_data.pop('full_name')

        first_name, *last_name = full_name.split(' ', 1)
        last_name = last_name[0] if last_name else ''

        user = User.objects.create(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            role=User.Role.MANUFACTURER,
            phone_number=validated_data.get('contact_phone', '')
        )
        user.set_password(password)
        user.save()

        slug = slugify(validated_data['business_name'])
        count = 1
        original_slug = slug
        while ManufacturerProfile.objects.filter(slug=slug).exists():
            slug = f"{original_slug}-{count}"
            count += 1

        profile = ManufacturerProfile.objects.create(
            user=user,
            slug=slug,
            status=ManufacturerProfile.Status.PENDING,
            **validated_data
        )
        return profile


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'image_url', 'display_order', 'is_active', 'product_count']

    def get_product_count(self, obj):
        return obj.products.filter(is_active=True, status=Product.Status.APPROVED).count()


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image_url', 'alt_text', 'is_primary', 'display_order']


class ProductReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductReview
        fields = ['id', 'product', 'author_name', 'rating', 'title', 'comment', 'image_url', 'is_verified_buyer', 'created_at']
        read_only_fields = ['id', 'is_verified_buyer', 'created_at']


class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True
    )
    manufacturer = serializers.SerializerMethodField()
    images = ProductImageSerializer(many=True, read_only=True)
    reviews = ProductReviewSerializer(many=True, read_only=True)
    reviews_count = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    is_in_stock = serializers.BooleanField(read_only=True)
    pricing_breakdown = serializers.SerializerMethodField()
    primary_image_url = serializers.CharField(required=False, allow_blank=True)

    def to_internal_value(self, data):
        ret = super().to_internal_value(data)
        raw_primary = ret.get('primary_image_url') or data.get('primary_image_url')
        if raw_primary and isinstance(raw_primary, str) and raw_primary.startswith('data:image/'):
            ret['primary_image_url'] = self._save_base64_image(raw_primary)
        return ret

    @staticmethod
    def _save_base64_image(data_uri, folder='products'):
        if not isinstance(data_uri, str) or not data_uri.startswith('data:image/'):
            return data_uri
        try:
            import base64
            import uuid
            import os
            from django.conf import settings
            header, encoded = data_uri.split(';base64,', 1)
            mime_type = header.replace('data:', '')
            ext_map = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg'}
            ext = ext_map.get(mime_type, 'jpg')
            filename = f"{uuid.uuid4().hex[:16]}.{ext}"
            target_dir = os.path.join(settings.MEDIA_ROOT, folder)
            os.makedirs(target_dir, exist_ok=True)
            target_path = os.path.join(target_dir, filename)
            with open(target_path, 'wb') as f:
                f.write(base64.b64decode(encoded))
            return f"/media/{folder}/{filename}"
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning("Failed to decode base64 image: %s", exc)
            return data_uri

    class Meta:
        model = Product
        fields = [
            'id', 'title', 'slug', 'short_description', 'description',
            'price', 'base_price', 'delivery_charge', 'pricing_breakdown', 'mrp',
            'weight_grams', 'spice_level', 'dietary_type',
            'contains_non_veg_substance',
            'ingredients', 'allergens', 'storage_instructions', 'shelf_life',
            'stock_quantity', 'status', 'is_active', 'is_featured', 'is_bestseller',
            'primary_image_url', 'category', 'category_id', 'manufacturer',
            'images', 'reviews', 'reviews_count', 'average_rating', 'is_in_stock',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'slug', 'pricing_breakdown', 'created_at', 'updated_at']

    def get_pricing_breakdown(self, obj):
        rate = Decimal('10.00')
        if hasattr(obj, 'manufacturer') and obj.manufacturer and obj.manufacturer.commission_rate_override is not None:
            rate = obj.manufacturer.commission_rate_override
        deliv = getattr(obj, 'delivery_charge', None) or Decimal('50.00')
        base = getattr(obj, 'base_price', None)
        if base is None:
            without_deliv = max(Decimal('0.00'), obj.price - deliv)
            base = (without_deliv / (Decimal('1.00') + rate / Decimal('100.00'))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        comm = ((base * rate) / Decimal('100.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        return {
            'seller_base_payout': str(base),
            'platform_commission': str(comm),
            'commission_rate': str(rate),
            'delivery_charge': str(deliv),
            'customer_actual_price': str(obj.price),
            'customer_delivery_fee': '0.00',
            'formula': f"₹{base} (Base) + ₹{comm} ({rate}% Comm) + ₹{deliv} (Delivery) = ₹{obj.price} (Actual Price)",
        }

    def get_reviews_count(self, obj):
        return obj.reviews.count()

    def get_average_rating(self, obj):
        revs = obj.reviews.all()
        if revs.exists():
            return round(sum(r.rating for r in revs) / revs.count(), 1)
        return None

    def validate_price(self, value):
        if value is not None and value <= Decimal('100.00'):
            raise serializers.ValidationError("Selling price must be above ₹100. All sellers are required to sell products above ₹100.")
        return value

    def validate(self, attrs):
        price = attrs.get('price')
        if price is not None and price <= Decimal('100.00'):
            raise serializers.ValidationError({'price': "Selling price must be above ₹100. All sellers are required to sell products above ₹100."})
        mrp = attrs.get('mrp')
        if mrp is not None and price is not None and mrp < price:
            raise serializers.ValidationError({'mrp': "MRP cannot be lower than the selling price."})
        return attrs

    def get_manufacturer(self, obj):
        return {
            'id': obj.manufacturer.id,
            'business_name': obj.manufacturer.business_name,
            'slug': obj.manufacturer.slug,
            'location_district': obj.manufacturer.location_district,
            'fssai_license_number': obj.manufacturer.fssai_license_number,
            'is_verified_producer': obj.manufacturer.is_verified_producer,
            'is_featured': obj.manufacturer.is_featured,
            'brand_badge': obj.manufacturer.brand_badge or 'Official Brand Store',
            'tagline': obj.manufacturer.tagline,
            'status': obj.manufacturer.status
        }


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source='product', write_only=True
    )
    line_total = serializers.DecimalField(source='get_line_total', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'product_id', 'quantity', 'line_total', 'added_at']


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    financial_summary = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ['id', 'items', 'financial_summary', 'updated_at']

    def get_financial_summary(self, obj):
        from .services import FinancialCalculator
        items = obj.items.all().select_related('product', 'product__manufacturer')
        calc = FinancialCalculator.calculate_order_financials(items)
        return {
            'items_subtotal': str(calc['items_subtotal']),
            'customer_platform_fee': str(calc['customer_platform_fee']),
            'delivery_fee': str(calc['delivery_fee']),
            'discount_amount': str(calc['discount_amount']),
            'total_amount': str(calc['total_amount']),
            'items_count': sum(i.quantity for i in items)
        }


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            'id', 'product_title', 'weight_grams', 'unit_price', 'quantity',
            'subtotal', 'commission_rate', 'commission_amount',
            'manufacturer_payout', 'fulfillment_status'
        ]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'user', 'user_email',
            'customer_name', 'customer_email', 'customer_phone',
            'shipping_address_line1', 'shipping_address_line2',
            'shipping_city', 'shipping_state', 'shipping_postal_code',
            'items_subtotal', 'customer_platform_fee', 'delivery_fee',
            'discount_amount', 'total_amount', 'platform_commission_total',
            'manufacturer_payout_total', 'coupon_code', 'status',
            'payment_status', 'payment_method', 'tracking_number', 'courier_partner', 'dispatch_notes',
            'items', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'order_number', 'items_subtotal', 'customer_platform_fee',
            'delivery_fee', 'discount_amount', 'total_amount',
            'platform_commission_total', 'manufacturer_payout_total',
            'created_at', 'updated_at'
        ]


class OrderCreateSerializer(serializers.Serializer):
    customer_name = serializers.CharField(max_length=150)
    customer_email = serializers.EmailField()
    customer_phone = serializers.CharField(max_length=20)
    shipping_address_line1 = serializers.CharField(max_length=255)
    shipping_address_line2 = serializers.CharField(max_length=255, required=False, allow_blank=True)
    shipping_city = serializers.CharField(max_length=100)
    shipping_state = serializers.CharField(max_length=100)
    shipping_postal_code = serializers.CharField(max_length=10)
    coupon_code = serializers.CharField(max_length=30, required=False, allow_blank=True)
    session_key = serializers.CharField(max_length=64, required=False, allow_blank=True)


class PaymentVerifySerializer(serializers.Serializer):
    order_number = serializers.CharField(max_length=32)
    payment_id = serializers.CharField(max_length=100, required=False, allow_blank=True)
    razorpay_order_id = serializers.CharField(max_length=100, required=False, allow_blank=True)
    signature = serializers.CharField(max_length=255, required=False, allow_blank=True)


class CommissionSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommissionSetting
        fields = '__all__'


class CommissionUpdateSerializer(serializers.Serializer):
    default_commission_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    customer_platform_fee = serializers.DecimalField(max_digits=6, decimal_places=2)
    default_delivery_fee = serializers.DecimalField(max_digits=6, decimal_places=2)
    free_delivery_threshold = serializers.DecimalField(max_digits=8, decimal_places=2)
    allow_seller_registration = serializers.BooleanField(required=False, default=False)
    reason = serializers.CharField(max_length=255)


class ManufacturerSettlementSerializer(serializers.ModelSerializer):
    manufacturer_name = serializers.CharField(source='manufacturer.business_name', read_only=True)

    class Meta:
        model = ManufacturerSettlement
        fields = '__all__'
        read_only_fields = ['settlement_reference', 'created_at', 'updated_at']


class RefundSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source='order.order_number', read_only=True)

    class Meta:
        model = Refund
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True, default='Anonymous')

    class Meta:
        model = AuditLog
        fields = '__all__'
