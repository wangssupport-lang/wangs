from rest_framework import serializers
from decimal import Decimal, ROUND_HALF_UP
from django.contrib.auth import authenticate
from django.utils.text import slugify
import uuid
import os
import base64
import logging
from django.conf import settings
from django.db import transaction
from django.db.models import Sum, Q

logger = logging.getLogger(__name__)
from .models import (
    User, CustomerProfile, Address, ManufacturerProfile, ComplianceDocument,
    CourierProfile, CourierDeliveryScanLog,
    Category, Product, ProductImage, ProductReview, CommissionSetting, CommissionChangeLog,
    Cart, CartItem, Order, OrderItem, PaymentTransaction, Refund,
    ManufacturerSettlement, Coupon, AuditLog, HeroBanner, StorefrontNotice,
    RewardSettings, CustomerRewardWallet, OrderUnit, ProductQRCode,
    DeliveryConfirmation, RewardTransaction, SuspiciousScanLog
)


class UserSerializer(serializers.ModelSerializer):
    is_authorized_to_sell = serializers.SerializerMethodField()
    has_pending_seller_request = serializers.SerializerMethodField()
    seller_request_status = serializers.SerializerMethodField()
    seller_request_details = serializers.SerializerMethodField()
    is_approved_courier = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'phone_number', 'is_staff', 'can_sell', 'is_authorized_to_sell',
            'is_approved_courier',
            'has_pending_seller_request', 'seller_request_status', 'seller_request_details',
            'is_active', 'is_banned', 'ban_reason', 'banned_at', 'date_joined'
        ]
        read_only_fields = [
            'id', 'role', 'is_staff', 'can_sell', 'is_authorized_to_sell',
            'is_approved_courier',
            'has_pending_seller_request', 'seller_request_status', 'seller_request_details',
            'is_active', 'is_banned', 'ban_reason', 'banned_at', 'date_joined'
        ]

    def get_is_approved_courier(self, obj):
        return obj.is_approved_courier() if hasattr(obj, 'is_approved_courier') else False

    def get_is_authorized_to_sell(self, obj):
        return obj.is_authorized_to_sell()

    def get_has_pending_seller_request(self, obj):
        if obj.is_authorized_to_sell():
            return False
        email = (obj.email or '').strip().lower()
        if not email:
            return False
        try:
            logs = AuditLog.objects.filter(action='SELLER_AUTHORIZATION_REQUESTED').order_by('-created_at')
            for log in logs:
                d = log.details or {}
                if isinstance(d, dict) and (d.get('email') or '').strip().lower() == email:
                    st = str(d.get('status', 'PENDING')).upper()
                    if st not in ['APPROVED', 'DISMISSED', 'DELETED'] and not d.get('is_authorized'):
                        return True
                    return False
            return False
        except Exception:
            return False

    def get_seller_request_status(self, obj):
        if obj.is_authorized_to_sell():
            return 'APPROVED'
        email = (obj.email or '').strip().lower()
        if not email:
            return 'NONE'
        try:
            logs = AuditLog.objects.filter(action='SELLER_AUTHORIZATION_REQUESTED').order_by('-created_at')
            for log in logs:
                d = log.details or {}
                if isinstance(d, dict) and (d.get('email') or '').strip().lower() == email:
                    status_val = d.get('status')
                    if status_val in ['DISMISSED', 'DELETED']:
                        return 'NONE'
                    if status_val == 'APPROVED' or d.get('is_authorized') is True:
                        return 'APPROVED'
                    return 'PENDING'
            return 'NONE'
        except Exception:
            return 'NONE'

    def get_seller_request_details(self, obj):
        email = (obj.email or '').strip().lower()
        if not email:
            return None
        try:
            logs = AuditLog.objects.filter(action='SELLER_AUTHORIZATION_REQUESTED').order_by('-created_at')
            for log in logs:
                d = log.details or {}
                if isinstance(d, dict) and (d.get('email') or '').strip().lower() == email:
                    return {
                        'business_name': d.get('business_name', ''),
                        'location_district': d.get('location_district', ''),
                        'fssai_number': d.get('fssai_number', ''),
                        'created_at': log.created_at.isoformat() if log.created_at else None,
                        'phone': d.get('phone', ''),
                    }
            return None
        except Exception:
            return None


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = '__all__'
        read_only_fields = ['user', 'created_at']


class AdminUserSerializer(serializers.ModelSerializer):
    is_authorized_to_sell = serializers.SerializerMethodField()
    orders_count = serializers.SerializerMethodField()
    total_spent = serializers.SerializerMethodField()
    manufacturer_business_name = serializers.SerializerMethodField()
    manufacturer_status = serializers.SerializerMethodField()
    manufacturer_details = serializers.SerializerMethodField()
    seller_request_details = serializers.SerializerMethodField()
    rewards_balance = serializers.SerializerMethodField()
    addresses = AddressSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'phone_number', 'is_staff', 'can_sell', 'is_authorized_to_sell',
            'is_active', 'is_banned', 'ban_reason', 'banned_at',
            'date_joined', 'last_login', 'orders_count', 'total_spent',
            'manufacturer_business_name', 'manufacturer_status',
            'manufacturer_details', 'seller_request_details', 'rewards_balance',
            'addresses'
        ]
        read_only_fields = [
            'id', 'is_staff', 'is_authorized_to_sell', 'date_joined', 'last_login',
            'manufacturer_details', 'seller_request_details', 'rewards_balance', 'addresses'
        ]

    def get_is_authorized_to_sell(self, obj):
        return obj.is_authorized_to_sell()

    def get_orders_count(self, obj):
        if hasattr(obj, '_orders_count'):
            return obj._orders_count
        q = Q(user=obj)
        if obj.email:
            q |= Q(customer_email__iexact=obj.email)
        return Order.objects.filter(q).distinct().count()

    def get_total_spent(self, obj):
        if hasattr(obj, '_total_spent'):
            return str(obj._total_spent)
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

    def get_manufacturer_details(self, obj):
        mfg = getattr(obj, 'manufacturer_profile', None)
        if not mfg:
            return None
        return {
            'id': mfg.id,
            'business_name': mfg.business_name,
            'slug': mfg.slug,
            'brand_story': mfg.brand_story,
            'location_district': mfg.location_district,
            'contact_email': mfg.contact_email,
            'contact_phone': mfg.contact_phone,
            'business_address': mfg.business_address,
            'postal_code': mfg.postal_code,
            'fssai_license_number': mfg.fssai_license_number,
            'gst_number': mfg.gst_number,
            'compliance_notes': mfg.compliance_notes,
            'bank_account_holder': mfg.bank_account_holder,
            'bank_account_number': mfg.bank_account_number,
            'bank_ifsc_code': mfg.bank_ifsc_code,
            'bank_name': mfg.bank_name,
            'status': mfg.status,
            'is_verified_producer': mfg.is_verified_producer,
            'commission_rate_override': str(mfg.commission_rate_override) if mfg.commission_rate_override else None,
            'created_at': mfg.created_at.isoformat() if mfg.created_at else None,
        }

    def get_seller_request_details(self, obj):
        email = (obj.email or '').strip().lower()
        if not email:
            return None
        try:
            logs = AuditLog.objects.filter(action='SELLER_AUTHORIZATION_REQUESTED').order_by('-created_at')
            for log in logs:
                d = log.details or {}
                if isinstance(d, dict) and (d.get('email') or '').strip().lower() == email:
                    return {
                        'business_name': d.get('business_name', ''),
                        'location_district': d.get('location_district', ''),
                        'fssai_number': d.get('fssai_number', ''),
                        'phone': d.get('phone', ''),
                        'bank_account_holder': d.get('bank_account_holder', ''),
                        'bank_account_number': d.get('bank_account_number', ''),
                        'bank_ifsc_code': d.get('bank_ifsc_code', ''),
                        'bank_name': d.get('bank_name', ''),
                        'bank_passbook_image': d.get('bank_passbook_image', ''),
                        'message': d.get('message', ''),
                        'created_at': log.created_at.isoformat() if log.created_at else None,
                        'status': d.get('status', 'PENDING'),
                    }
            return None
        except Exception:
            return None

    def get_rewards_balance(self, obj):
        wallet = getattr(obj, 'reward_wallet', None)
        return wallet.balance if wallet else 0


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
            'bank_passbook_image',
            'status', 'commission_rate_override', 'is_verified_producer',
            'is_featured', 'display_priority', 'tagline', 'brand_badge', 'hero_banner', 'logo_image',
            'admin_review_notes', 'documents', 'products_count', 'active_products_count',
            'total_items_sold', 'total_sales_revenue', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'slug', 'status', 'commission_rate_override', 'is_verified_producer', 'created_at']

    def to_internal_value(self, data):
        ret = super().to_internal_value(data)
        raw_logo = ret.get('logo_image') or data.get('logo_image')
        if raw_logo and isinstance(raw_logo, str) and raw_logo.startswith('data:image/'):
            ret['logo_image'] = ProductSerializer._save_base64_image(raw_logo, folder='brand_logos')
        elif raw_logo is not None and str(raw_logo).strip() == '':
            ret['logo_image'] = ''

        raw_banner = ret.get('hero_banner') or data.get('hero_banner')
        if raw_banner and isinstance(raw_banner, str) and raw_banner.startswith('data:image/'):
            ret['hero_banner'] = ProductSerializer._save_base64_image(raw_banner, folder='brand_banners')
        elif raw_banner is not None and str(raw_banner).strip() == '':
            ret['hero_banner'] = ''
        return ret

    def validate_fssai_license_number(self, value):
        if value:
            cleaned = str(value).strip()
            if not cleaned.isdigit() or len(cleaned) != 14:
                raise serializers.ValidationError('FSSAI license number must be a valid 14-digit numeric code.')
            return cleaned
        raise serializers.ValidationError('FSSAI license number is mandatory for all sellers.')

    def get_products_count(self, obj):
        try:
            return obj.products.count()
        except Exception:
            return 0

    def get_active_products_count(self, obj):
        try:
            return obj.products.filter(is_active=True, status=Product.Status.APPROVED).count()
        except Exception:
            return 0

    def get_total_items_sold(self, obj):
        try:
            paid_items = OrderItem.objects.filter(
                manufacturer=obj,
                order__payment_status=Order.PaymentStatus.PAID
            ).aggregate(sum=Sum('quantity'))['sum']
            if paid_items is not None and paid_items > 0:
                return paid_items
            all_items = OrderItem.objects.filter(manufacturer=obj).aggregate(sum=Sum('quantity'))['sum']
            return all_items or 0
        except Exception:
            return 0

    def get_total_sales_revenue(self, obj):
        try:
            paid_rev = OrderItem.objects.filter(
                manufacturer=obj,
                order__payment_status=Order.PaymentStatus.PAID
            ).aggregate(sum=Sum('subtotal'))['sum']
            if paid_rev is not None and paid_rev > 0:
                return str(paid_rev)
            all_rev = OrderItem.objects.filter(manufacturer=obj).aggregate(sum=Sum('subtotal'))['sum']
            return str(all_rev or Decimal('0.00'))
        except Exception:
            return '0.00'


class CourierProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    assigned_orders_count = serializers.SerializerMethodField()
    active_deliveries_count = serializers.SerializerMethodField()
    vehicle_type_display = serializers.CharField(source='get_vehicle_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = CourierProfile
        fields = [
            'id', 'user', 'full_name', 'phone_number', 'email', 'courier_company',
            'vehicle_type', 'vehicle_type_display', 'vehicle_number',
            'service_area_city', 'address', 'identity_document', 'profile_photo',
            'status', 'status_display', 'is_active', 'rejection_reason',
            'suspension_reason', 'admin_notes', 'total_deliveries_completed',
            'last_delivery_at', 'assigned_orders_count', 'active_deliveries_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user', 'status', 'is_active', 'total_deliveries_completed',
            'last_delivery_at', 'created_at', 'updated_at'
        ]

    def get_assigned_orders_count(self, obj):
        try:
            return obj.user.assigned_deliveries.count()
        except Exception:
            return 0

    def get_active_deliveries_count(self, obj):
        try:
            return obj.user.assigned_deliveries.exclude(
                status__in=[Order.Status.DELIVERED, Order.Status.CANCELLED, Order.Status.REFUNDED]
            ).count()
        except Exception:
            return 0


class CourierRegisterSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    phone_number = serializers.CharField(max_length=20)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True, min_length=6)
    courier_company = serializers.CharField(max_length=150, required=False, allow_blank=True, default='Wangs Express Runner')
    vehicle_type = serializers.ChoiceField(choices=CourierProfile.VehicleType.choices, default=CourierProfile.VehicleType.BIKE)
    vehicle_number = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    service_area_city = serializers.CharField(max_length=100, required=False, allow_blank=True, default='Kohima')
    address = serializers.CharField(required=False, allow_blank=True, default='')
    identity_document = serializers.CharField(required=False, allow_blank=True, default='')
    profile_photo = serializers.CharField(required=False, allow_blank=True, default='')

    @staticmethod
    def _process_file_upload(file_obj, folder='courier_docs'):
        try:
            if not file_obj:
                return ''
            file_bytes = file_obj.read() if hasattr(file_obj, 'read') else file_obj
            if not file_bytes:
                return ''

            # 1. Cloudinary upload (store all media permanently in Cloudinary)
            try:
                from .cloudinary_service import upload_image_to_cloudinary, is_cloudinary_configured
                if is_cloudinary_configured():
                    cloud_url = upload_image_to_cloudinary(file_bytes, folder=f"wangs/{folder}", resource_type="auto")
                    if cloud_url:
                        return cloud_url
            except Exception as e:
                logger.warning("Cloudinary upload failed for courier file: %s", e)

            # 2. Local Media storage fallback
            try:
                ext = os.path.splitext(getattr(file_obj, 'name', ''))[1] or '.jpg'
                filename = f"{uuid.uuid4().hex[:16]}{ext}"
                target_dir = os.path.join(settings.MEDIA_ROOT, folder)
                os.makedirs(target_dir, exist_ok=True)
                target_path = os.path.join(target_dir, filename)
                with open(target_path, 'wb') as f:
                    f.write(file_bytes)
                media_url = f"{settings.MEDIA_URL.rstrip('/')}/{folder}/{filename}"
                return media_url
            except Exception as e:
                logger.warning("Local storage save failed for courier file: %s", e)

            # 3. Base64 fallback if reasonable size (< 5MB)
            if len(file_bytes) < 5 * 1024 * 1024:
                b64 = base64.b64encode(file_bytes).decode('utf-8')
                content_type = getattr(file_obj, 'content_type', 'image/jpeg') or 'image/jpeg'
                return f"data:{content_type};base64,{b64}"

            return ''
        except Exception as e:
            logger.error("Error processing courier file upload: %s", e)
            return ''

    def to_internal_value(self, data):
        # Allow mutable copy if data is QueryDict
        if hasattr(data, 'dict'):
            mutable_data = data.dict()
        elif hasattr(data, 'copy'):
            mutable_data = data.copy()
        else:
            mutable_data = dict(data)

        # Merge request.FILES if available in context
        request = self.context.get('request')
        if request and getattr(request, 'FILES', None):
            for k, f in request.FILES.items():
                mutable_data[k] = f

        # Handle identity_document (UploadedFile, URL, or data URI)
        raw_doc = mutable_data.get('identity_document')
        if raw_doc is not None and not isinstance(raw_doc, str):
            mutable_data['identity_document'] = self._process_file_upload(raw_doc, folder='courier_docs')
        elif raw_doc and isinstance(raw_doc, str) and raw_doc.startswith('data:'):
            try:
                from .cloudinary_service import upload_image_to_cloudinary, is_cloudinary_configured
                if is_cloudinary_configured():
                    cloud_url = upload_image_to_cloudinary(raw_doc, folder="wangs/courier_docs", resource_type="auto")
                    if cloud_url:
                        mutable_data['identity_document'] = cloud_url
            except Exception:
                pass
        elif raw_doc is None:
            mutable_data['identity_document'] = ''

        # Handle profile_photo (UploadedFile, URL, or data URI)
        raw_photo = mutable_data.get('profile_photo')
        if raw_photo is not None and not isinstance(raw_photo, str):
            mutable_data['profile_photo'] = self._process_file_upload(raw_photo, folder='courier_photos')
        elif raw_photo and isinstance(raw_photo, str) and raw_photo.startswith('data:'):
            try:
                from .cloudinary_service import upload_image_to_cloudinary, is_cloudinary_configured
                if is_cloudinary_configured():
                    cloud_url = upload_image_to_cloudinary(raw_photo, folder="wangs/courier_photos", resource_type="auto")
                    if cloud_url:
                        mutable_data['profile_photo'] = cloud_url
            except Exception:
                pass
        elif raw_photo is None:
            mutable_data['profile_photo'] = ''

        return super().to_internal_value(mutable_data)

    def validate_email(self, value):
        cleaned = (value or '').strip().lower()
        if not cleaned:
            raise serializers.ValidationError('Email address is required.')
        if User.objects.filter(email__iexact=cleaned).exists():
            raise serializers.ValidationError('An account already exists with this email address. Please sign in.')
        return cleaned

    def validate_phone_number(self, value):
        cleaned = (value or '').strip().replace(' ', '').replace('-', '')
        if not cleaned or len(cleaned) < 10:
            raise serializers.ValidationError('Please enter a valid 10-digit mobile number.')
        if CourierProfile.objects.filter(phone_number__iexact=cleaned).exists():
            raise serializers.ValidationError('A courier account is already registered with this mobile number.')
        if User.objects.filter(phone_number__iexact=cleaned).exists():
            raise serializers.ValidationError('This phone number is already registered. Please sign in.')
        return cleaned

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('confirm_password'):
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password', None)
        password = validated_data.pop('password')
        email = validated_data['email'].strip().lower()
        phone_number = validated_data['phone_number'].strip().replace(' ', '').replace('-', '')
        full_name = validated_data['full_name'].strip()

        base_username = slugify(full_name).replace('-', '_') or email.split('@')[0]
        username = f"courier_{base_username}"[:30]
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"courier_{base_username}_{counter}"[:30]
            counter += 1

        with transaction.atomic():
            user = User.objects.create(
                username=username,
                email=email,
                phone_number=phone_number,
                first_name=full_name,
                role=User.Role.COURIER,
                is_active=True
            )
            user.set_password(password)
            user.save()

            profile = CourierProfile.objects.create(
                user=user,
                full_name=full_name,
                phone_number=phone_number,
                email=email,
                courier_company=validated_data.get('courier_company') or 'Wangs Express Runner',
                vehicle_type=validated_data.get('vehicle_type', CourierProfile.VehicleType.BIKE),
                vehicle_number=validated_data.get('vehicle_number', ''),
                service_area_city=validated_data.get('service_area_city', 'Kohima'),
                address=validated_data.get('address', ''),
                identity_document=validated_data.get('identity_document', ''),
                profile_photo=validated_data.get('profile_photo', ''),
                status=CourierProfile.Status.PENDING,
                is_active=True
            )

            AuditLog.objects.create(
                user=user,
                action='COURIER_REGISTERED',
                target_model='CourierProfile',
                target_id=str(profile.id),
                details={
                    'full_name': full_name,
                    'phone': phone_number,
                    'vehicle_type': profile.vehicle_type,
                    'vehicle_number': profile.vehicle_number,
                    'status': profile.status
                }
            )
            return profile


class CourierDeliveryScanLogSerializer(serializers.ModelSerializer):
    courier_name = serializers.CharField(source='courier.get_full_name', read_only=True)
    order_number = serializers.CharField(source='order.order_number', read_only=True)

    class Meta:
        model = CourierDeliveryScanLog
        fields = '__all__'


class BrandSerializer(serializers.ModelSerializer):
    products_count = serializers.SerializerMethodField()
    sample_products = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()
    logo_image = serializers.SerializerMethodField()

    class Meta:
        model = ManufacturerProfile
        fields = [
            'id', 'business_name', 'slug', 'brand_story', 'location_district',
            'fssai_license_number', 'is_verified_producer', 'is_featured', 'display_priority',
            'tagline', 'brand_badge', 'hero_banner', 'logo_image', 'cover_image',
            'products_count', 'sample_products', 'created_at'
        ]

    def get_products_count(self, obj):
        return obj.products.filter(is_active=True, status=Product.Status.APPROVED).count()

    def get_logo_image(self, obj):
        if obj.logo_image and str(obj.logo_image).strip():
            return str(obj.logo_image).strip()
        first_prod = obj.products.filter(is_active=True, status=Product.Status.APPROVED).first() or obj.products.first()
        if first_prod:
            if first_prod.primary_image_url and str(first_prod.primary_image_url).strip():
                return str(first_prod.primary_image_url).strip()
            first_img = first_prod.images.filter(is_primary=True).first() or first_prod.images.first()
            if first_img and first_img.image_url and str(first_img.image_url).strip():
                return str(first_img.image_url).strip()
        if obj.hero_banner and str(obj.hero_banner).strip():
            return str(obj.hero_banner).strip()
        return None

    def get_cover_image(self, obj):
        if obj.hero_banner and str(obj.hero_banner).strip():
            return str(obj.hero_banner).strip()
        if obj.logo_image and str(obj.logo_image).strip():
            return str(obj.logo_image).strip()
        first_prod = obj.products.filter(is_active=True, status=Product.Status.APPROVED).first() or obj.products.first()
        if first_prod:
            if first_prod.primary_image_url and str(first_prod.primary_image_url).strip():
                return str(first_prod.primary_image_url).strip()
            first_img = first_prod.images.filter(is_primary=True).first() or first_prod.images.first()
            if first_img and first_img.image_url and str(first_img.image_url).strip():
                return str(first_img.image_url).strip()
        return None

    def get_sample_products(self, obj):
        prods = obj.products.filter(is_active=True, status=Product.Status.APPROVED).prefetch_related('images')[:4]
        res = []
        for p in prods:
            first_img = p.images.filter(is_primary=True).first() or p.images.first()
            res.append({
                'id': p.id,
                'title': p.title,
                'slug': p.slug,
                'price': str(p.price),
                'mrp': str(p.mrp) if p.mrp else None,
                'weight_grams': p.weight_grams,
                'image': first_img.image_url if first_img else None
            })
        return res


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

    bank_passbook_image = serializers.CharField(
        required=False,
        allow_blank=True,
        default='',
        error_messages={
            'required': 'A clear photo or scan of your Bank Passbook or Cancelled Cheque is strictly mandatory for settlement verification.',
        }
    )

    class Meta:
        model = ManufacturerProfile
        fields = [
            'username', 'email', 'password', 'full_name',
            'business_name', 'brand_story', 'location_district',
            'contact_email', 'contact_phone', 'business_address', 'postal_code',
            'fssai_license_number', 'gst_number', 'compliance_notes',
            'bank_account_holder', 'bank_account_number', 'bank_ifsc_code', 'bank_name',
            'bank_passbook_image'
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
    slug = serializers.SlugField(required=False, allow_blank=True)

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'image_url', 'display_order', 'is_active', 'product_count']

    def get_product_count(self, obj):
        return obj.products.filter(is_active=True, status=Product.Status.APPROVED).count()

    def create(self, validated_data):
        if not validated_data.get('slug'):
            base_slug = slugify(validated_data['name'])
            slug = base_slug or 'category'
            counter = 1
            while Category.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            validated_data['slug'] = slug
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'name' in validated_data and not validated_data.get('slug'):
            base_slug = slugify(validated_data['name'])
            slug = base_slug or 'category'
            counter = 1
            while Category.objects.filter(slug=slug).exclude(pk=instance.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            validated_data['slug'] = slug
        return super().update(instance, validated_data)


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image_url', 'alt_text', 'is_primary', 'display_order']


class ProductReviewSerializer(serializers.ModelSerializer):
    product_title = serializers.CharField(source='product.title', read_only=True)
    product_slug = serializers.CharField(source='product.slug', read_only=True)
    product_image = serializers.CharField(source='product.primary_image_url', read_only=True)
    product_weight = serializers.IntegerField(source='product.weight_grams', read_only=True)

    class Meta:
        model = ProductReview
        fields = [
            'id', 'product', 'product_title', 'product_slug', 'product_image', 'product_weight',
            'author_name', 'location', 'rating', 'title', 'comment', 'image_url',
            'is_verified_buyer', 'created_at'
        ]
        read_only_fields = [
            'id', 'is_verified_buyer', 'created_at',
            'product_title', 'product_slug', 'product_image', 'product_weight'
        ]


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
            import io
            from django.conf import settings
            from PIL import Image

            header, encoded = data_uri.split(';base64,', 1)
            raw_bytes = base64.b64decode(encoded)

            # Optimize & compress image to lightweight JPEG (max 900x900, ~40-60KB)
            try:
                img = Image.open(io.BytesIO(raw_bytes))
                img.thumbnail((900, 900), Image.Resampling.LANCZOS)
                if img.mode in ('RGBA', 'LA', 'P'):
                    bg = Image.new('RGB', img.size, (255, 255, 255))
                    bg.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                    img = bg
                elif img.mode != 'RGB':
                    img = img.convert('RGB')

                buf = io.BytesIO()
                img.save(buf, format='JPEG', quality=82, optimize=True)
                opt_bytes = buf.getvalue()
                opt_b64 = base64.b64encode(opt_bytes).decode('utf-8')
                result_uri = f"data:image/jpeg;base64,{opt_b64}"
            except Exception:
                opt_bytes = raw_bytes
                result_uri = data_uri

            # If Cloudinary is configured, upload directly to Cloudinary and return the permanent HTTPS URL
            try:
                from .cloudinary_service import upload_image_to_cloudinary, is_cloudinary_configured
                if is_cloudinary_configured():
                    cloud_url = upload_image_to_cloudinary(opt_bytes or raw_bytes, folder=f"wangs/{folder}")
                    if cloud_url:
                        return cloud_url
            except Exception as c_exc:
                pass

            # Also write to local MEDIA_ROOT so disk file /media/products/... is created if supported
            try:
                filename = f"{uuid.uuid4().hex[:16]}.jpg"
                target_dir = os.path.join(settings.MEDIA_ROOT, folder)
                os.makedirs(target_dir, exist_ok=True)
                target_path = os.path.join(target_dir, filename)
                with open(target_path, 'wb') as f:
                    f.write(opt_bytes)
            except Exception:
                pass

            # Returning the optimized base64 data URI ensures 100% resilience across
            # Render container restarts, sleep cycles, deploys, and Vercel routing.
            return result_uri
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
            'stock_quantity', 'status', 'is_active', 'is_featured', 'is_bestseller', 'is_deal_of_the_day',
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


class DeliveryConfirmationSerializer(serializers.ModelSerializer):
    confirmed_by_username = serializers.CharField(source='confirmed_by_user.username', read_only=True)

    class Meta:
        model = DeliveryConfirmation
        fields = [
            'id', 'unit', 'confirmation_source', 'confirmed_by_user',
            'confirmed_by_username', 'confirmed_by_courier_name',
            'timestamp', 'notes'
        ]


class ProductQRCodeSerializer(serializers.ModelSerializer):
    claimed_by_username = serializers.CharField(source='claimed_by.username', read_only=True)
    verification_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductQRCode
        fields = [
            'id', 'token', 'is_claimed', 'claimed_at', 'claimed_by',
            'claimed_by_username', 'is_revoked', 'revoked_reason',
            'revoked_at', 'verification_url', 'created_at'
        ]

    def get_verification_url(self, obj):
        return f"https://wangs.in/rewards/scan?token={obj.token}"


class OrderUnitSerializer(serializers.ModelSerializer):
    qr_code = ProductQRCodeSerializer(read_only=True)
    confirmations = DeliveryConfirmationSerializer(many=True, read_only=True)
    confirmation_source = serializers.CharField(source='get_confirmation_source_display', read_only=True)
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    customer_email = serializers.CharField(source='customer.email', read_only=True)

    class Meta:
        model = OrderUnit
        fields = [
            'id', 'unit_uid', 'order', 'order_number', 'order_item', 'product',
            'customer', 'customer_email', 'unit_index', 'product_title',
            'weight_grams', 'status', 'is_delivered', 'delivered_at',
            'reward_awarded', 'reward_awarded_at', 'confirmation_source',
            'qr_code', 'confirmations', 'created_at'
        ]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    units = OrderUnitSerializer(many=True, read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'user', 'user_email',
            'customer_name', 'customer_email', 'customer_phone',
            'shipping_address_line1', 'shipping_address_line2',
            'shipping_city', 'shipping_state', 'shipping_postal_code',
            'items_subtotal', 'customer_platform_fee', 'delivery_fee',
            'discount_amount', 'credits_redeemed', 'credit_discount_amount',
            'total_amount', 'platform_commission_total',
            'manufacturer_payout_total', 'coupon_code', 'status',
            'payment_status', 'payment_method', 'tracking_number', 'courier_partner', 'dispatch_notes',
            'items', 'units', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'order_number', 'items_subtotal', 'customer_platform_fee',
            'delivery_fee', 'discount_amount', 'credits_redeemed', 'credit_discount_amount',
            'total_amount', 'platform_commission_total', 'manufacturer_payout_total',
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
    credits_to_redeem = serializers.IntegerField(required=False, default=0, min_value=0)
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


class HeroBannerSerializer(serializers.ModelSerializer):
    effective_image_url = serializers.SerializerMethodField()
    title = serializers.CharField(required=False, allow_blank=True, default="Hero Banner")
    badge_text = serializers.CharField(required=False, allow_blank=True, default="")
    cta_text = serializers.CharField(required=False, allow_blank=True, default="Shop Now")

    class Meta:
        model = HeroBanner
        fields = [
            'id', 'title', 'subtitle', 'badge_text', 'coupon_code',
            'cta_text', 'cta_link', 'image', 'image_url', 'effective_image_url',
            'bg_color', 'is_image_only', 'is_active', 'display_order', 'created_at', 'updated_at'
        ]

    def get_effective_image_url(self, obj):
        if obj.image_url and obj.image_url.startswith('https://res.cloudinary.com'):
            return obj.image_url
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return obj.image_url or ''

    def create(self, validated_data):
        instance = super().create(validated_data)
        self._sync_cloudinary(instance)
        return instance

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        self._sync_cloudinary(instance)
        return instance

    def _sync_cloudinary(self, instance):
        try:
            from .cloudinary_service import upload_image_to_cloudinary, is_cloudinary_configured
            if is_cloudinary_configured():
                if instance.image:
                    cloud_url = upload_image_to_cloudinary(instance.image.path, folder="wangs/banners", public_id=f"banner_{instance.id}")
                    if cloud_url:
                        instance.image_url = cloud_url
                        instance.save(update_fields=['image_url'])
                elif instance.image_url and not instance.image_url.startswith('https://res.cloudinary.com'):
                    cloud_url = upload_image_to_cloudinary(instance.image_url, folder="wangs/banners", public_id=f"banner_{instance.id}")
                    if cloud_url:
                        instance.image_url = cloud_url
                        instance.save(update_fields=['image_url'])
        except Exception:
            pass


class StorefrontNoticeSerializer(serializers.ModelSerializer):
    class Meta:
        model = StorefrontNotice
        fields = [
            'id', 'text', 'highlight', 'badge_color', 'link',
            'is_active', 'display_order', 'created_at', 'updated_at'
        ]


class RewardSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = RewardSettings
        fields = [
            'id', 'is_enabled', 'credit_value_rupees', 'credits_per_unit',
            'max_redemption_percentage', 'max_credits_per_order', 'updated_at'
        ]


class RewardTransactionSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    performed_by_username = serializers.CharField(source='performed_by.username', read_only=True)
    order_number = serializers.CharField(source='order.order_number', read_only=True)

    class Meta:
        model = RewardTransaction
        fields = [
            'id', 'user', 'username', 'transaction_type', 'credits',
            'balance_after', 'unit', 'order', 'order_number', 'description',
            'performed_by', 'performed_by_username', 'audit_reason', 'created_at'
        ]


class CustomerRewardWalletSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    credit_value_rupees = serializers.SerializerMethodField()
    monetary_value = serializers.SerializerMethodField()
    available_credits = serializers.IntegerField(source='balance', read_only=True)
    total_credits_earned = serializers.IntegerField(source='total_earned', read_only=True)
    total_credits_redeemed = serializers.IntegerField(source='total_redeemed', read_only=True)
    recent_transactions = serializers.SerializerMethodField()
    transactions = serializers.SerializerMethodField()

    class Meta:
        model = CustomerRewardWallet
        fields = [
            'id', 'user', 'username', 'email', 'balance', 'available_credits',
            'total_earned', 'total_credits_earned', 'total_redeemed', 'total_credits_redeemed',
            'credit_value_rupees', 'monetary_value', 'recent_transactions', 'transactions', 'updated_at'
        ]

    def get_credit_value_rupees(self, obj):
        return RewardSettings.get_settings().credit_value_rupees

    def get_monetary_value(self, obj):
        rate = RewardSettings.get_settings().credit_value_rupees
        return Decimal(str(obj.balance)) * rate

    def get_recent_transactions(self, obj):
        txs = obj.transactions.all()[:50]
        return RewardTransactionSerializer(txs, many=True).data

    def get_transactions(self, obj):
        txs = obj.transactions.all()[:50]
        return RewardTransactionSerializer(txs, many=True).data


class SuspiciousScanLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = SuspiciousScanLog
        fields = [
            'id', 'token_attempted', 'user', 'username',
            'ip_address', 'user_agent', 'reason', 'created_at'
        ]

