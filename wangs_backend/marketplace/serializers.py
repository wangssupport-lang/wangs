from rest_framework import serializers
from decimal import Decimal
from django.contrib.auth import authenticate
from django.utils.text import slugify
from .models import (
    User, CustomerProfile, Address, ManufacturerProfile, ComplianceDocument,
    Category, Product, ProductImage, CommissionSetting, CommissionChangeLog,
    Cart, CartItem, Order, OrderItem, PaymentTransaction, Refund,
    ManufacturerSettlement, Coupon, AuditLog
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'phone_number']
        read_only_fields = ['id', 'role']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    role = serializers.ChoiceField(choices=User.Role.choices, default=User.Role.CUSTOMER)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name', 'phone_number', 'role']

    def create(self, validated_data):
        password = validated_data.pop('password')
        role = validated_data.get('role', User.Role.CUSTOMER)
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()
        if role == User.Role.CUSTOMER:
            CustomerProfile.objects.create(user=user)
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

    class Meta:
        model = ManufacturerProfile
        fields = [
            'id', 'user', 'business_name', 'slug', 'brand_story', 'location_district',
            'contact_email', 'contact_phone', 'business_address', 'postal_code',
            'fssai_license_number', 'gst_number', 'compliance_notes',
            'bank_account_holder', 'bank_account_number', 'bank_ifsc_code', 'bank_name',
            'status', 'commission_rate_override', 'is_verified_producer',
            'admin_review_notes', 'documents', 'products_count', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'slug', 'status', 'commission_rate_override', 'is_verified_producer', 'created_at']

    def get_products_count(self, obj):
        return obj.products.count()


class ManufacturerApplicationSerializer(serializers.ModelSerializer):
    username = serializers.CharField(write_only=True)
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True, min_length=6)
    full_name = serializers.CharField(write_only=True)

    class Meta:
        model = ManufacturerProfile
        fields = [
            'username', 'email', 'password', 'full_name',
            'business_name', 'brand_story', 'location_district',
            'contact_email', 'contact_phone', 'business_address', 'postal_code',
            'fssai_license_number', 'gst_number', 'compliance_notes',
            'bank_account_holder', 'bank_account_number', 'bank_ifsc_code', 'bank_name'
        ]

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


class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True
    )
    manufacturer = serializers.SerializerMethodField()
    images = ProductImageSerializer(many=True, read_only=True)
    is_in_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'title', 'slug', 'short_description', 'description',
            'price', 'mrp', 'weight_grams', 'spice_level', 'dietary_type',
            'ingredients', 'allergens', 'storage_instructions', 'shelf_life',
            'stock_quantity', 'status', 'is_active', 'is_featured', 'is_bestseller',
            'primary_image_url', 'category', 'category_id', 'manufacturer',
            'images', 'is_in_stock', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']

    def get_manufacturer(self, obj):
        return {
            'id': obj.manufacturer.id,
            'business_name': obj.manufacturer.business_name,
            'slug': obj.manufacturer.slug,
            'location_district': obj.manufacturer.location_district,
            'is_verified_producer': obj.manufacturer.is_verified_producer,
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
            'payment_status', 'payment_method', 'dispatch_notes',
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
