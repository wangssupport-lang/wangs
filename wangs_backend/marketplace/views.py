import uuid
import random
import datetime
from decimal import Decimal
from django.conf import settings
from django.db import transaction
from django.db.models import Q, Sum, Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.text import slugify

from rest_framework import status, views, viewsets, permissions, generics
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    User, CustomerProfile, Address, ManufacturerProfile, ComplianceDocument,
    Category, Product, ProductImage, ProductReview, CommissionSetting, CommissionChangeLog,
    Cart, CartItem, Order, OrderItem, PaymentTransaction, Refund,
    ManufacturerSettlement, Coupon, AuditLog, EmailOTP, MaintenanceSubscriber
)
from .serializers import (
    UserSerializer, AdminUserSerializer, RegisterSerializer, AddressSerializer, CustomerProfileSerializer,
    ComplianceDocumentSerializer, ManufacturerProfileSerializer, ManufacturerApplicationSerializer,
    CategorySerializer, ProductSerializer, ProductReviewSerializer, CartSerializer, CartItemSerializer,
    OrderSerializer, OrderCreateSerializer, PaymentVerifySerializer,
    CommissionSettingSerializer, CommissionUpdateSerializer,
    ManufacturerSettlementSerializer, RefundSerializer, AuditLogSerializer,
    BrandSerializer
)
from .permissions import IsAdminUserRole, IsManufacturerUser, IsApprovedManufacturer
from .services import FinancialCalculator, OrderService, PaymentService, SettlementService
from .resend_service import send_otp_email


# -------------------------------------------------------------
# AUTH & USER ACCOUNTS
# -------------------------------------------------------------

class RegisterView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'token': str(refresh.access_token),
                'refresh': str(refresh),
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username_or_email = request.data.get('username', '').strip()
        password = request.data.get('password', '')

        user = User.objects.filter(Q(username__iexact=username_or_email) | Q(email__iexact=username_or_email)).first()
        if user and user.check_password(password):
            if getattr(user, 'is_banned', False) or not user.is_active:
                reason = getattr(user, 'ban_reason', None) or 'Platform policy or compliance violation.'
                return Response({
                    'detail': f'This account has been suspended by administration. Reason: {reason} Contact wangssupport@gmail.com for assistance.'
                }, status=status.HTTP_403_FORBIDDEN)

            refresh = RefreshToken.for_user(user)
            mfg_profile = None
            if hasattr(user, 'manufacturer_profile'):
                mfg_profile = ManufacturerProfileSerializer(user.manufacturer_profile).data

            return Response({
                'user': UserSerializer(user).data,
                'manufacturer_profile': mfg_profile,
                'token': str(refresh.access_token),
                'refresh': str(refresh),
            })
        return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


class CurrentUserView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        mfg_profile = None
        if hasattr(user, 'manufacturer_profile'):
            mfg_profile = ManufacturerProfileSerializer(user.manufacturer_profile).data
        return Response({
            'user': UserSerializer(user).data,
            'manufacturer_profile': mfg_profile
        })


class SendEmailOTPView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        purpose = request.data.get('purpose', 'LOGIN').strip().upper()
        if not email or '@' not in email:
            return Response({'detail': 'Please provide a valid email address.'}, status=status.HTTP_400_BAD_REQUEST)

        # Generate secure 6-digit numeric OTP code
        otp_code = f"{random.randint(100000, 999999)}"
        expires_at = timezone.now() + datetime.timedelta(minutes=10)

        # Invalidate older unused OTPs for this email & purpose
        EmailOTP.objects.filter(email=email, purpose=purpose, is_used=False).update(is_used=True)

        EmailOTP.objects.create(
            email=email,
            otp_code=otp_code,
            purpose=purpose,
            expires_at=expires_at
        )

        sent_live, resend_info = send_otp_email(email, otp_code, purpose)

        return Response({
            'success': True,
            'delivered_via_email': sent_live,
            'message': f'A 6-digit verification code has been dispatched to {email}. Please check your inbox or spam folder.' if sent_live else f'Email credentials not configured in .env. Please add EMAIL_HOST_USER and EMAIL_HOST_PASSWORD to wangs_backend/.env to receive emails in your Gmail.',
            'warning': None if sent_live else f'Cannot dispatch to {email}: {resend_info.get("error", "Email credentials missing in .env")}. Add EMAIL_HOST_USER and EMAIL_HOST_PASSWORD to wangs_backend/.env.',
            'expires_in_minutes': 10,
        }, status=status.HTTP_200_OK)


class VerifyEmailOTPView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = str(request.data.get('email') or '').strip().lower()
        otp_code = str(request.data.get('otp_code') or '').strip()
        purpose = str(request.data.get('purpose') or 'LOGIN').strip().upper()

        if not email or not otp_code:
            return Response({'detail': 'Email and 6-digit OTP code are required.'}, status=status.HTTP_400_BAD_REQUEST)

        otp_record = EmailOTP.objects.filter(
            email=email,
            otp_code=otp_code,
            is_used=False
        ).order_by('-created_at').first()

        if not otp_record or not otp_record.is_valid():
            return Response({'detail': 'Invalid or expired OTP code. Please request a new code.'}, status=status.HTTP_400_BAD_REQUEST)

        # Mark OTP as consumed
        otp_record.is_used = True
        otp_record.save(update_fields=['is_used'])

        # If logging in, authenticate or create customer user
        if purpose == 'LOGIN':
            user = User.objects.filter(email__iexact=email).first()
            if user:
                if getattr(user, 'is_banned', False) or not user.is_active:
                    reason = getattr(user, 'ban_reason', None) or 'Platform policy or compliance violation.'
                    return Response({
                        'detail': f'This account has been suspended by administration. Reason: {reason} Contact wangssupport@gmail.com for assistance.'
                    }, status=status.HTTP_403_FORBIDDEN)
            else:
                base_username = slugify(email.split('@')[0]) or 'user'
                username = base_username
                c = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}_{c}"
                    c += 1
                user = User.objects.create(
                    username=username,
                    email=email,
                    role=User.Role.CUSTOMER,
                    first_name=base_username.capitalize(),
                )
                user.set_unusable_password()
                user.save()
                CustomerProfile.objects.get_or_create(user=user)

            refresh = RefreshToken.for_user(user)
            mfg_profile = None
            if hasattr(user, 'manufacturer_profile'):
                mfg_profile = ManufacturerProfileSerializer(user.manufacturer_profile).data

            return Response({
                'verified': True,
                'user': UserSerializer(user).data,
                'manufacturer_profile': mfg_profile,
                'token': str(refresh.access_token),
                'refresh': str(refresh),
                'message': f'Welcome back, {user.first_name or user.username}!'
            }, status=status.HTTP_200_OK)

        return Response({
            'verified': True,
            'email': email,
            'purpose': purpose,
            'message': 'Email address verified successfully.'
        }, status=status.HTTP_200_OK)


class RequestSellerAccessView(views.APIView):
    """
    Allows a customer or visitor to request admin authorization to sell on Wangs.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        business_name = request.data.get('business_name', '').strip()
        location_district = request.data.get('location_district', '').strip()
        fssai_number = request.data.get('fssai_number', '').strip()
        phone = request.data.get('phone', '').strip()
        message = request.data.get('message', '').strip()

        if not email or not business_name:
            return Response({'detail': 'Business name and contact email are required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Ensure contact email has been verified via OTP
        is_admin = bool(request.user and request.user.is_authenticated and getattr(request.user, 'role', None) == User.Role.ADMIN)
        has_verified_otp = EmailOTP.objects.filter(
            email=email,
            is_used=True,
            created_at__gte=timezone.now() - datetime.timedelta(minutes=60)
        ).exists()

        if not has_verified_otp and not is_admin:
            return Response({
                'detail': 'Email verification is mandatory. Please click "Send OTP" and enter the 6-digit verification code sent to your email.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Log request in AuditLog so admin sees it in the dashboard
        AuditLog.objects.create(
            user=request.user if request.user.is_authenticated else None,
            action='SELLER_AUTHORIZATION_REQUESTED',
            target_model='ManufacturerProfile',
            target_id=business_name,
            details={
                'email': email,
                'business_name': business_name,
                'location_district': location_district,
                'fssai_number': fssai_number,
                'phone': phone,
                'message': message,
            }
        )

        return Response({
            'success': True,
            'message': 'Your request has been submitted to the Wangs Administrator. Once reviewed and authorized, you will receive an invitation email to complete onboarding.'
        })


class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        if serializer.validated_data.get('is_default', False):
            Address.objects.filter(user=self.request.user).update(is_default=False)
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        if serializer.validated_data.get('is_default', False):
            Address.objects.filter(user=self.request.user).update(is_default=False)
        serializer.save()


# -------------------------------------------------------------
# PUBLIC CATALOG & STOREFRONT
# -------------------------------------------------------------

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.filter(is_active=True).order_by('display_order', 'name')
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None
    lookup_field = 'slug'


class BrandListView(views.APIView):
    """
    Public listing of verified artisanal brands with Amazon-style Brand Spotlight.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        featured_only = request.query_params.get('featured') == 'true'
        qs = ManufacturerProfile.objects.filter(
            status=ManufacturerProfile.Status.APPROVED
        ).order_by('-display_priority', '-is_featured', 'business_name')
        if featured_only:
            qs = qs.filter(is_featured=True)
        return Response(BrandSerializer(qs, many=True).data)


class BrandDetailView(views.APIView):
    """
    Single brand store page with brand profile and their active products.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        brand = get_object_or_404(
            ManufacturerProfile,
            slug=slug,
            status=ManufacturerProfile.Status.APPROVED
        )
        products = Product.objects.filter(
            manufacturer=brand,
            is_active=True,
            status=Product.Status.APPROVED
        ).order_by('-is_bestseller', '-created_at')

        return Response({
            'brand': BrandSerializer(brand).data,
            'products': ProductSerializer(products, many=True).data
        })


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'slug'

    def get_queryset(self):
        qs = Product.objects.filter(
            is_active=True,
            status=Product.Status.APPROVED,
            manufacturer__status=ManufacturerProfile.Status.APPROVED
        ).select_related('category', 'manufacturer').prefetch_related('images')

        category_slug = self.request.query_params.get('category')
        if category_slug:
            qs = qs.filter(category__slug=category_slug)

        spice_level = self.request.query_params.get('spice_level')
        if spice_level:
            qs = qs.filter(spice_level=spice_level)

        dietary_type = self.request.query_params.get('dietary_type')
        if dietary_type:
            qs = qs.filter(dietary_type=dietary_type)

        brand_slug = self.request.query_params.get('brand') or self.request.query_params.get('manufacturer')
        if brand_slug:
            qs = qs.filter(
                Q(manufacturer__slug__iexact=brand_slug) |
                Q(manufacturer__business_name__icontains=brand_slug)
            )

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(ingredients__icontains=search) |
                Q(manufacturer__business_name__icontains=search)
            )

        min_price = self.request.query_params.get('min_price')
        if min_price:
            try:
                qs = qs.filter(price__gte=Decimal(min_price))
            except Exception:
                pass

        max_price = self.request.query_params.get('max_price')
        if max_price:
            try:
                qs = qs.filter(price__lte=Decimal(max_price))
            except Exception:
                pass

        in_stock_only = self.request.query_params.get('in_stock')
        if in_stock_only == 'true':
            qs = qs.filter(stock_quantity__gt=0)

        ordering = self.request.query_params.get('ordering', '-is_featured')
        if ordering == 'price_asc':
            qs = qs.order_by('price')
        elif ordering == 'price_desc':
            qs = qs.order_by('-price')
        elif ordering == 'newest':
            qs = qs.order_by('-created_at')
        elif ordering == 'popularity':
            qs = qs.order_by('-is_bestseller', '-is_featured', '-created_at')
        else:
            qs = qs.order_by('-is_featured', '-is_bestseller', '-created_at')

        return qs

    @action(detail=False, methods=['get'])
    def featured(self, request):
        featured_products = self.get_queryset().filter(is_featured=True)[:8]
        return Response(ProductSerializer(featured_products, many=True).data)

    @action(detail=False, methods=['get'])
    def bestsellers(self, request):
        bestsellers = self.get_queryset().filter(is_bestseller=True)[:8]
        return Response(ProductSerializer(bestsellers, many=True).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.AllowAny])
    def add_review(self, request, slug=None):
        product = self.get_object()
        author_name = request.data.get('author_name', '').strip() or 'Artisanal Food Lover'
        rating = int(request.data.get('rating', 5))
        comment = request.data.get('comment', '').strip()
        title = request.data.get('title', '').strip()
        image_url = request.data.get('image_url', '').strip()
        if not comment:
            return Response({'detail': 'Review comment is required.'}, status=400)

        review = ProductReview.objects.create(
            product=product,
            user=request.user if (request.user and request.user.is_authenticated) else None,
            author_name=author_name,
            rating=max(1, min(5, rating)),
            title=title or 'Exceptional Flavor',
            comment=comment,
            image_url=image_url,
            is_verified_buyer=True
        )
        return Response(ProductReviewSerializer(review).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def check_pincode_serviceability(request):
    raw_pincode = request.query_params.get('pincode', '')
    pincode = ''.join(c for c in str(raw_pincode) if c.isdigit())
    if len(pincode) != 6:
        return Response({
            'valid': False,
            'pincode': pincode,
            'serviceable': False,
            'message': 'Please enter a valid 6-digit PIN code.'
        }, status=200)

    region = "Regional Priority" if pincode.startswith('797') or pincode.startswith('798') else "Pan-India"
    est_days = "2-3 business days" if pincode.startswith('797') or pincode.startswith('798') else "4-6 business days"
    return Response({
        'valid': True,
        'pincode': pincode,
        'serviceable': True,
        'region': region,
        'estimated_delivery': est_days,
        'message': f'Standard delivery available to {pincode} ({est_days}).'
    }, status=200)


# -------------------------------------------------------------
# CART & CHECKOUT
# -------------------------------------------------------------

def get_or_create_cart(request):
    user = request.user if request.user.is_authenticated else None
    session_key = request.data.get('session_key') or request.query_params.get('session_key') or request.headers.get('X-Session-Key')

    if user:
        cart, _ = Cart.objects.get_or_create(user=user)
        if session_key:
            anon_cart = Cart.objects.filter(session_key=session_key, user=None).first()
            if anon_cart:
                for item in anon_cart.items.all():
                    existing = cart.items.filter(product=item.product).first()
                    if existing:
                        existing.quantity += item.quantity
                        existing.save()
                    else:
                        item.cart = cart
                        item.save()
                anon_cart.delete()
        return cart

    if not session_key:
        session_key = str(uuid.uuid4())

    cart, _ = Cart.objects.get_or_create(session_key=session_key, user=None)
    return cart


class CartView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        cart = get_or_create_cart(request)
        return Response(CartSerializer(cart).data)

    def post(self, request):
        cart = get_or_create_cart(request)
        product_id = request.data.get('product_id')
        quantity = int(request.data.get('quantity', 1))

        if quantity <= 0:
            return Response({'detail': 'Quantity must be positive'}, status=400)

        product = get_object_or_404(Product, id=product_id)
        if not product.is_available_for_sale():
            return Response({'detail': 'Product is not available for purchase'}, status=400)

        if product.stock_quantity < quantity:
            return Response({'detail': f'Only {product.stock_quantity} available in stock'}, status=400)

        item, created = CartItem.objects.get_or_create(cart=cart, product=product)
        if not created:
            item.quantity += quantity
        else:
            item.quantity = quantity

        if item.quantity > product.stock_quantity:
            item.quantity = product.stock_quantity

        item.save()
        return Response(CartSerializer(cart).data)

    def put(self, request):
        cart = get_or_create_cart(request)
        product_id = request.data.get('product_id')
        quantity = int(request.data.get('quantity', 1))

        product = get_object_or_404(Product, id=product_id)
        item = get_object_or_404(CartItem, cart=cart, product=product)

        if quantity <= 0:
            item.delete()
        else:
            if product.stock_quantity < quantity:
                return Response({'detail': f'Only {product.stock_quantity} units available'}, status=400)
            item.quantity = quantity
            item.save()

        return Response(CartSerializer(cart).data)

    def delete(self, request):
        cart = get_or_create_cart(request)
        product_id = request.data.get('product_id') or request.query_params.get('product_id')

        if product_id:
            CartItem.objects.filter(cart=cart, product_id=product_id).delete()
        else:
            cart.items.all().delete()

        return Response(CartSerializer(cart).data)


class CheckoutQuoteView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        cart = get_or_create_cart(request)
        coupon_code = request.data.get('coupon_code', '').strip().upper()
        coupon = None
        if coupon_code:
            coupon = Coupon.objects.filter(code=coupon_code, is_active=True).first()

        items = cart.items.all().select_related('product', 'product__manufacturer')
        if not items.exists():
            return Response({'detail': 'Cart is empty'}, status=400)

        calc = FinancialCalculator.calculate_order_financials(items, coupon=coupon)
        return Response({
            'items_subtotal': str(calc['items_subtotal']),
            'customer_platform_fee': str(calc['customer_platform_fee']),
            'delivery_fee': str(calc['delivery_fee']),
            'discount_amount': str(calc['discount_amount']),
            'total_amount': str(calc['total_amount']),
            'coupon_applied': coupon.code if coupon else None,
            'items_count': sum(i.quantity for i in items)
        })


class CreateOrderView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = OrderCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        cart = get_or_create_cart(request)
        items = cart.items.all().select_related('product', 'product__manufacturer')
        if not items.exists():
            return Response({'detail': 'Cart is empty'}, status=400)

        data = serializer.validated_data
        coupon_code = data.get('coupon_code', '').strip().upper()
        coupon = None
        if coupon_code:
            coupon = Coupon.objects.filter(code=coupon_code, is_active=True).first()

        customer_details = {
            'name': data['customer_name'],
            'email': data['customer_email'],
            'phone': data['customer_phone'],
        }
        shipping_details = {
            'address_line1': data['shipping_address_line1'],
            'address_line2': data.get('shipping_address_line2', ''),
            'city': data['shipping_city'],
            'state': data['shipping_state'],
            'postal_code': data['shipping_postal_code'],
        }

        try:
            order = OrderService.create_order_from_cart(
                user=request.user,
                customer_details=customer_details,
                shipping_details=shipping_details,
                cart_items=items,
                coupon=coupon,
                payment_method=request.data.get('payment_method', 'RAZORPAY_TEST')
            )
            cart.items.all().delete()
            payment_intent = PaymentService.create_mock_or_razorpay_order(order)

            return Response({
                'order': OrderSerializer(order).data,
                'payment_intent': payment_intent,
            }, status=201)

        except ValueError as e:
            return Response({'detail': str(e)}, status=400)
        except Exception as e:
            return Response({'detail': f'Error creating order: {str(e)}'}, status=500)


class VerifyPaymentView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PaymentVerifySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        data = serializer.validated_data
        order = get_object_or_404(Order, order_number=data['order_number'])

        if order.payment_status == Order.PaymentStatus.PAID:
            return Response({
                'detail': 'Order payment already verified.',
                'order': OrderSerializer(order).data
            })

        order, tx = PaymentService.verify_and_confirm_payment(
            order=order,
            payment_id=data.get('payment_id'),
            razorpay_order_id=data.get('razorpay_order_id'),
            signature=data.get('signature'),
            raw_data=request.data
        )

        return Response({
            'detail': 'Payment successfully verified.',
            'order': OrderSerializer(order).data,
            'transaction_id': tx.transaction_id
        })


class OrderLookupView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, order_number):
        email_or_phone = request.query_params.get('verify', '').strip()
        order = get_object_or_404(Order, order_number=order_number)

        if request.user.is_authenticated and (order.user == request.user or request.user.is_platform_admin()):
            return Response(OrderSerializer(order).data)

        if email_or_phone and (
            order.customer_email.lower() == email_or_phone.lower() or
            order.customer_phone == email_or_phone
        ):
            return Response(OrderSerializer(order).data)

        return Response(OrderSerializer(order).data)


class CustomerOrdersView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        orders = Order.objects.filter(user=request.user).order_by('-created_at')
        return Response(OrderSerializer(orders, many=True).data)


# -------------------------------------------------------------
# MANUFACTURER PORTAL
# -------------------------------------------------------------

class ManufacturerRegisterView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # Admin authorization check:
        # Check if user is authenticated: must have can_sell=True or is_staff/admin
        # Or if unauthenticated: check if email is pre-authorized by admin (User.can_sell == True)
        user = request.user if request.user.is_authenticated else None
        email = request.data.get('email', '').strip().lower()

        if not user and email:
            existing_user = User.objects.filter(email__iexact=email).first()
            if existing_user:
                user = existing_user

        if not user or not user.is_authorized_to_sell():
            return Response({
                'detail': 'Seller onboarding is restricted. You must be authorized by an administrator to register as a seller on Wangs.',
                'requires_authorization': True
            }, status=status.HTTP_403_FORBIDDEN)

        serializer = ManufacturerApplicationSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            profile = serializer.save()
            refresh = RefreshToken.for_user(profile.user)
            return Response({
                'message': 'Manufacturer application submitted successfully. An administrator will review your compliance details before approval.',
                'profile': ManufacturerProfileSerializer(profile).data,
                'token': str(refresh.access_token),
            }, status=201)
        return Response(serializer.errors, status=400)


class ManufacturerProfileView(views.APIView):
    permission_classes = [IsManufacturerUser]

    def get(self, request):
        profile = get_object_or_404(ManufacturerProfile, user=request.user)
        return Response(ManufacturerProfileSerializer(profile).data)

    def patch(self, request):
        profile = get_object_or_404(ManufacturerProfile, user=request.user)
        restricted_keys = ['status', 'commission_rate_override', 'is_verified_producer', 'admin_review_notes']
        data = {k: v for k, v in request.data.items() if k not in restricted_keys}
        serializer = ManufacturerProfileSerializer(profile, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


class ManufacturerProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [IsManufacturerUser]

    def get_queryset(self):
        profile = get_object_or_404(ManufacturerProfile, user=self.request.user)
        return Product.objects.filter(manufacturer=profile).order_by('-created_at')

    def _sync_product_images(self, product, raw_images):
        if raw_images is None:
            return
        image_urls = []
        for item in raw_images:
            if isinstance(item, str) and item.strip():
                image_urls.append(item.strip())
            elif isinstance(item, dict) and item.get('image_url'):
                image_urls.append(item['image_url'].strip())
        # Cap to 3 images as specified in requirements (1-3 images)
        image_urls = image_urls[:3]
        if image_urls:
            product.primary_image_url = image_urls[0]
            product.save(update_fields=['primary_image_url'])
            product.images.all().delete()
            for idx, url in enumerate(image_urls):
                ProductImage.objects.create(
                    product=product,
                    image_url=url,
                    is_primary=(idx == 0),
                    display_order=idx
                )

    def perform_create(self, serializer):
        profile = get_object_or_404(ManufacturerProfile, user=self.request.user)
        title = serializer.validated_data['title']
        slug = slugify(title)
        count = 1
        original_slug = slug
        while Product.objects.filter(slug=slug).exists():
            slug = f"{original_slug}-{count}"
            count += 1

        product = serializer.save(
            manufacturer=profile,
            slug=slug,
            status=Product.Status.PENDING
        )
        raw_images = self.request.data.get('images') or self.request.data.get('image_urls')
        if raw_images:
            self._sync_product_images(product, raw_images)

    def perform_update(self, serializer):
        product_obj = self.get_object()
        product = serializer.save(status=Product.Status.PENDING if not self.request.user.is_platform_admin() else product_obj.status)
        raw_images = self.request.data.get('images') or self.request.data.get('image_urls')
        if raw_images is not None:
            self._sync_product_images(product, raw_images)


class ManufacturerOrdersView(views.APIView):
    permission_classes = [IsManufacturerUser]

    def get(self, request):
        profile = get_object_or_404(ManufacturerProfile, user=request.user)
        items = OrderItem.objects.filter(manufacturer=profile).select_related('order', 'product').order_by('-order__created_at')

        results = []
        for item in items:
            results.append({
                'order_item_id': item.id,
                'order_number': item.order.order_number,
                'order_date': item.order.created_at,
                'customer_name': item.order.customer_name,
                'customer_phone': item.order.customer_phone,
                'customer_email': item.order.customer_email,
                'shipping_address_line1': item.order.shipping_address_line1,
                'shipping_address_line2': item.order.shipping_address_line2,
                'shipping_city': item.order.shipping_city,
                'shipping_state': item.order.shipping_state,
                'shipping_postal_code': item.order.shipping_postal_code,
                'courier_partner': item.order.courier_partner,
                'tracking_number': item.order.tracking_number,
                'product_title': item.product_title,
                'weight_grams': item.weight_grams or (item.product.weight_grams if item.product else 250),
                'quantity': item.quantity,
                'unit_price': str(item.unit_price),
                'subtotal': str(item.subtotal),
                'commission_rate': str(item.commission_rate),
                'commission_amount': str(item.commission_amount),
                'manufacturer_payout': str(item.manufacturer_payout),
                'fulfillment_status': item.fulfillment_status,
                'order_payment_status': item.order.payment_status,
                # Seller Dispatch Snapshot for Printing Parcel Shipping Label
                'seller_business_name': profile.business_name,
                'seller_contact_phone': profile.contact_phone,
                'seller_contact_email': profile.contact_email,
                'seller_address': profile.business_address,
                'seller_district': profile.location_district,
                'seller_pincode': profile.postal_code,
                'seller_fssai': profile.fssai_license_number,
                'seller_badge': profile.brand_badge,
            })
        return Response(results)

    def patch(self, request):
        profile = get_object_or_404(ManufacturerProfile, user=request.user)
        item_id = request.data.get('order_item_id')
        new_status = request.data.get('fulfillment_status')

        item = get_object_or_404(OrderItem, id=item_id, manufacturer=profile)
        if new_status in OrderItem.FulfillmentStatus.values:
            item.fulfillment_status = new_status
            item.save(update_fields=['fulfillment_status'])
            return Response({'detail': f'Status updated to {new_status}'})
        return Response({'detail': 'Invalid fulfillment status'}, status=400)


class ManufacturerFinancialsView(views.APIView):
    permission_classes = [IsManufacturerUser]

    def get(self, request):
        profile = get_object_or_404(ManufacturerProfile, user=request.user)
        items = OrderItem.objects.filter(manufacturer=profile, order__payment_status=Order.PaymentStatus.PAID)

        total_gross_sales = sum(item.subtotal for item in items)
        total_commissions = sum(item.commission_amount for item in items)
        net_payable = sum(item.manufacturer_payout for item in items)

        settlements = ManufacturerSettlement.objects.filter(manufacturer=profile).order_by('-created_at')

        return Response({
            'business_name': profile.business_name,
            'approval_status': profile.status,
            'effective_commission_rate': str(profile.commission_rate_override or CommissionSetting.get_current().default_commission_rate),
            'total_sales': str(total_gross_sales),
            'total_commission_deducted': str(total_commissions),
            'net_earnings': str(net_payable),
            'settlement_history': ManufacturerSettlementSerializer(settlements, many=True).data,
            'settlement_note': 'Payouts are executed through marketplace settlement batches after verification.'
        })


# -------------------------------------------------------------
# ADMIN DASHBOARD
# -------------------------------------------------------------

class AdminMetricsView(views.APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        paid_orders = Order.objects.filter(payment_status=Order.PaymentStatus.PAID)
        total_orders = Order.objects.count()
        pending_orders = Order.objects.filter(status=Order.Status.PENDING).count()
        confirmed_orders = Order.objects.filter(status=Order.Status.CONFIRMED).count()
        dispatched_orders = Order.objects.filter(status=Order.Status.DISPATCHED).count()
        delivered_orders = Order.objects.filter(status=Order.Status.DELIVERED).count()

        gmv = paid_orders.aggregate(sum=Sum('total_amount'))['sum'] or Decimal('0.00')
        platform_commission = paid_orders.aggregate(sum=Sum('platform_commission_total'))['sum'] or Decimal('0.00')
        customer_platform_fees = paid_orders.aggregate(sum=Sum('customer_platform_fee'))['sum'] or Decimal('0.00')
        delivery_collections = paid_orders.aggregate(sum=Sum('delivery_fee'))['sum'] or Decimal('0.00')

        total_users = User.objects.count()
        total_customers = User.objects.filter(role=User.Role.CUSTOMER).count()
        authorized_sellers = User.objects.filter(can_sell=True).count()
        active_manufacturers = ManufacturerProfile.objects.filter(status=ManufacturerProfile.Status.APPROVED).count()
        pending_sellers = ManufacturerProfile.objects.filter(status=ManufacturerProfile.Status.PENDING).count()
        pending_products = Product.objects.filter(status=Product.Status.PENDING).count()
        active_products = Product.objects.filter(status=Product.Status.APPROVED, is_active=True).count()
        pending_refunds = Refund.objects.filter(status=Refund.Status.REQUESTED).count()
        pending_auth_requests = AuditLog.objects.filter(action='SELLER_AUTHORIZATION_REQUESTED').count()

        # Platform All-Seller Totals
        total_products_all_sellers = Product.objects.count()
        total_items_sold_all_sellers = OrderItem.objects.filter(
            order__payment_status=Order.PaymentStatus.PAID
        ).aggregate(sum=Sum('quantity'))['sum'] or 0
        if total_items_sold_all_sellers == 0:
            total_items_sold_all_sellers = OrderItem.objects.all().aggregate(sum=Sum('quantity'))['sum'] or 0

        total_items_sales_revenue = OrderItem.objects.filter(
            order__payment_status=Order.PaymentStatus.PAID
        ).aggregate(sum=Sum('subtotal'))['sum'] or Decimal('0.00')
        if total_items_sales_revenue == Decimal('0.00'):
            total_items_sales_revenue = OrderItem.objects.all().aggregate(sum=Sum('subtotal'))['sum'] or Decimal('0.00')

        comm_setting = CommissionSetting.get_current()

        total_subscribers = MaintenanceSubscriber.objects.count()
        low_stock_products = Product.objects.filter(stock_quantity__lte=5, is_active=True).count()

        return Response({
            'gmv': str(gmv),
            'total_orders': total_orders,
            'pending_orders': pending_orders,
            'confirmed_orders': confirmed_orders,
            'dispatched_orders': dispatched_orders,
            'delivered_orders': delivered_orders,
            'platform_commission_revenue': str(platform_commission),
            'customer_platform_fee_revenue': str(customer_platform_fees),
            'delivery_fee_collected': str(delivery_collections),
            'total_platform_revenue': str(platform_commission + customer_platform_fees),
            'total_users': total_users,
            'total_customers': total_customers,
            'authorized_sellers': authorized_sellers,
            'active_manufacturers': active_manufacturers,
            'pending_seller_applications': pending_sellers,
            'pending_auth_requests': pending_auth_requests,
            'pending_products_review': pending_products,
            'active_products': active_products,
            'low_stock_products': low_stock_products,
            'total_subscribers': total_subscribers,
            'pending_refunds': pending_refunds,
            'total_products_all_sellers': total_products_all_sellers,
            'total_items_sold_all_sellers': total_items_sold_all_sellers,
            'total_items_sales_revenue': str(total_items_sales_revenue),
            'allow_seller_registration': comm_setting.allow_seller_registration,
            'is_maintenance_mode': comm_setting.is_maintenance_mode,
            'maintenance_message': comm_setting.maintenance_message,
        })


class AdminManufacturerViewSet(viewsets.ModelViewSet):
    queryset = ManufacturerProfile.objects.all().order_by('-created_at')
    serializer_class = ManufacturerProfileSerializer
    permission_classes = [IsAdminUserRole]
    pagination_class = None

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        mfg = self.get_object()
        new_status = request.data.get('status')
        notes = request.data.get('admin_review_notes', '')

        if new_status in ManufacturerProfile.Status.values:
            mfg.status = new_status
            mfg.admin_review_notes = notes
            if new_status == ManufacturerProfile.Status.APPROVED:
                mfg.is_verified_producer = True
                mfg.user.is_banned = False
                mfg.user.is_active = True
                mfg.user.ban_reason = ''
                mfg.user.banned_at = None
                mfg.user.save(update_fields=['is_banned', 'is_active', 'ban_reason', 'banned_at'])
                Product.objects.filter(manufacturer=mfg).update(is_active=True)
            elif new_status == ManufacturerProfile.Status.SUSPENDED:
                mfg.user.is_banned = True
                mfg.user.is_active = False
                mfg.user.ban_reason = notes or 'Seller profile suspended for policy/quality violations.'
                mfg.user.banned_at = timezone.now()
                mfg.user.save(update_fields=['is_banned', 'is_active', 'ban_reason', 'banned_at'])
                Product.objects.filter(manufacturer=mfg).update(is_active=False)
            mfg.save()

            AuditLog.objects.create(
                user=request.user,
                action='MANUFACTURER_STATUS_UPDATE',
                target_model='ManufacturerProfile',
                target_id=str(mfg.id),
                details={'new_status': new_status, 'notes': notes}
            )
            return Response(ManufacturerProfileSerializer(mfg).data)
        return Response({'detail': 'Invalid status value'}, status=400)

    @action(detail=True, methods=['post'])
    def toggle_featured(self, request, pk=None):
        mfg = self.get_object()
        mfg.is_featured = not mfg.is_featured
        badge = request.data.get('brand_badge')
        tagline = request.data.get('tagline')
        if badge:
            mfg.brand_badge = badge
        if tagline:
            mfg.tagline = tagline
        mfg.save()
        return Response(ManufacturerProfileSerializer(mfg).data)

    @action(detail=True, methods=['post'])
    def set_commission_override(self, request, pk=None):
        mfg = self.get_object()
        override_rate = request.data.get('commission_rate_override')

        if override_rate is None or override_rate == '':
            mfg.commission_rate_override = None
        else:
            try:
                rate = Decimal(str(override_rate))
                if rate < 0 or rate > 100:
                    return Response({'detail': 'Commission rate must be between 0 and 100%'}, status=400)
                mfg.commission_rate_override = rate
            except Exception:
                return Response({'detail': 'Invalid decimal value'}, status=400)

        mfg.save(update_fields=['commission_rate_override', 'updated_at'])

        AuditLog.objects.create(
            user=request.user,
            action='COMMISSION_OVERRIDE_SET',
            target_model='ManufacturerProfile',
            target_id=str(mfg.id),
            details={'business': mfg.business_name, 'rate': str(mfg.commission_rate_override)}
        )
        return Response(ManufacturerProfileSerializer(mfg).data)

    @action(detail=True, methods=['post'])
    def set_priority(self, request, pk=None):
        mfg = self.get_object()
        raw_priority = request.data.get('display_priority')
        try:
            priority = int(raw_priority)
            if priority < 0:
                return Response({'detail': 'Priority must be a non-negative whole number.'}, status=400)
        except (ValueError, TypeError):
            return Response({'detail': 'Invalid priority value. Please provide a whole number.'}, status=400)

        mfg.display_priority = priority
        mfg.save(update_fields=['display_priority', 'updated_at'])

        AuditLog.objects.create(
            user=request.user,
            action='MANUFACTURER_PRIORITY_UPDATE',
            target_model='ManufacturerProfile',
            target_id=str(mfg.id),
            details={'business': mfg.business_name, 'display_priority': priority}
        )
        return Response(ManufacturerProfileSerializer(mfg).data)


class AdminProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by('-created_at')
    serializer_class = ProductSerializer
    permission_classes = [IsAdminUserRole]
    pagination_class = None

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        product = self.get_object()
        new_status = request.data.get('status')
        if new_status in Product.Status.values:
            product.status = new_status
            product.save(update_fields=['status', 'updated_at'])
            return Response(ProductSerializer(product).data)
        return Response({'detail': 'Invalid status'}, status=400)

    @action(detail=True, methods=['post'])
    def toggle_featured(self, request, pk=None):
        product = self.get_object()
        product.is_featured = not product.is_featured
        product.save(update_fields=['is_featured', 'updated_at'])
        return Response({'is_featured': product.is_featured})

    @action(detail=True, methods=['post'])
    def toggle_bestseller(self, request, pk=None):
        product = self.get_object()
        product.is_bestseller = not product.is_bestseller
        product.save(update_fields=['is_bestseller', 'updated_at'])
        return Response({'is_bestseller': product.is_bestseller})

    @action(detail=True, methods=['post'])
    def update_stock_and_price(self, request, pk=None):
        product = self.get_object()
        stock = request.data.get('stock_quantity')
        price = request.data.get('price')
        mrp = request.data.get('mrp')

        update_fields = ['updated_at']
        if stock is not None:
            product.stock_quantity = int(stock)
            update_fields.append('stock_quantity')
        if price is not None:
            product.price = Decimal(str(price))
            update_fields.append('price')
        if mrp is not None:
            product.mrp = Decimal(str(mrp)) if mrp else None
            update_fields.append('mrp')

        product.save(update_fields=update_fields)
        return Response(ProductSerializer(product).data)


class AdminOrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all().order_by('-created_at')
    serializer_class = OrderSerializer
    permission_classes = [IsAdminUserRole]
    pagination_class = None

    @action(detail=True, methods=['post'])
    def update_order_status(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get('status')
        dispatch_notes = request.data.get('dispatch_notes', '')

        if new_status in Order.Status.values:
            order.status = new_status
            if dispatch_notes:
                order.dispatch_notes = dispatch_notes
            order.save()

            AuditLog.objects.create(
                user=request.user,
                action='ORDER_STATUS_CHANGED',
                target_model='Order',
                target_id=str(order.id),
                details={'order_number': order.order_number, 'new_status': new_status}
            )
            return Response(OrderSerializer(order).data)
        return Response({'detail': 'Invalid order status'}, status=400)

    @action(detail=True, methods=['post'])
    def update_dispatch_tracking(self, request, pk=None):
        order = self.get_object()
        tracking_number = request.data.get('tracking_number', '').strip()
        courier_partner = request.data.get('courier_partner', '').strip() or 'India Post Air Cargo'
        dispatch_notes = request.data.get('dispatch_notes', '').strip()
        advance_status = request.data.get('advance_status', True)

        order.tracking_number = tracking_number
        order.courier_partner = courier_partner
        if dispatch_notes:
            order.dispatch_notes = dispatch_notes
        if advance_status and order.status in (Order.Status.PENDING, Order.Status.CONFIRMED):
            order.status = Order.Status.DISPATCHED

        order.save(update_fields=['tracking_number', 'courier_partner', 'dispatch_notes', 'status', 'updated_at'])

        AuditLog.objects.create(
            user=request.user,
            action='ORDER_DISPATCH_UPDATED',
            target_model='Order',
            target_id=str(order.id),
            details={'tracking_number': tracking_number, 'courier': courier_partner, 'status': order.status}
        )
        return Response(OrderSerializer(order).data)


class AdminUserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminUserRole]
    pagination_class = None

    @action(detail=True, methods=['post'])
    def toggle_can_sell(self, request, pk=None):
        target_user = self.get_object()
        target_user.can_sell = not target_user.can_sell
        target_user.save(update_fields=['can_sell'])

        AuditLog.objects.create(
            user=request.user,
            action='SELLER_AUTHORIZATION_TOGGLED',
            target_model='User',
            target_id=str(target_user.id),
            details={'username': target_user.username, 'can_sell': target_user.can_sell}
        )
        return Response({
            'id': target_user.id,
            'username': target_user.username,
            'can_sell': target_user.can_sell,
            'message': f"Seller authorization {'granted' if target_user.can_sell else 'revoked'} for {target_user.username}."
        })

    @action(detail=True, methods=['post'])
    def update_role(self, request, pk=None):
        target_user = self.get_object()
        new_role = request.data.get('role', '').upper()
        if new_role not in [User.Role.CUSTOMER, User.Role.MANUFACTURER, User.Role.ADMIN]:
            return Response({'detail': f'Invalid role: {new_role}'}, status=400)

        old_role = target_user.role
        target_user.role = new_role
        target_user.save(update_fields=['role'])

        AuditLog.objects.create(
            user=request.user,
            action='USER_ROLE_UPDATED',
            target_model='User',
            target_id=str(target_user.id),
            details={'username': target_user.username, 'old_role': old_role, 'new_role': new_role}
        )
        return Response({
            'id': target_user.id,
            'username': target_user.username,
            'role': target_user.role,
            'message': f"Role updated from {old_role} to {new_role} for {target_user.username}."
        })

    @action(detail=True, methods=['post'])
    def toggle_ban(self, request, pk=None):
        target_user = self.get_object()
        if target_user == request.user:
            return Response({'detail': 'You cannot ban or suspend your own admin account.'}, status=400)
        if target_user.is_superuser:
            return Response({'detail': 'Superuser accounts cannot be banned.'}, status=400)

        reason = request.data.get('reason', '').strip()
        should_ban = request.data.get('is_banned')
        if should_ban is None:
            should_ban = not target_user.is_banned

        if should_ban:
            target_user.is_banned = True
            target_user.is_active = False
            target_user.ban_reason = reason or 'Account suspended for platform policy violations.'
            target_user.banned_at = timezone.now()
            target_user.save(update_fields=['is_banned', 'is_active', 'ban_reason', 'banned_at'])

            # If user has a seller profile, suspend manufacturer profile & hide all their products
            mfg = getattr(target_user, 'manufacturer_profile', None)
            if mfg:
                mfg.status = ManufacturerProfile.Status.SUSPENDED
                mfg.admin_review_notes = f"Banned by admin: {target_user.ban_reason}"
                mfg.save(update_fields=['status', 'admin_review_notes'])
                Product.objects.filter(manufacturer=mfg).update(is_active=False)

            AuditLog.objects.create(
                user=request.user,
                action='USER_BANNED',
                target_model='User',
                target_id=str(target_user.id),
                details={
                    'username': target_user.username,
                    'role': target_user.role,
                    'reason': target_user.ban_reason
                }
            )
            msg = f"Account for {target_user.username} ({target_user.role}) has been banned."
        else:
            target_user.is_banned = False
            target_user.is_active = True
            target_user.ban_reason = ''
            target_user.banned_at = None
            target_user.save(update_fields=['is_banned', 'is_active', 'ban_reason', 'banned_at'])

            # If user has a seller profile, restore to APPROVED if previously suspended
            mfg = getattr(target_user, 'manufacturer_profile', None)
            if mfg and mfg.status == ManufacturerProfile.Status.SUSPENDED:
                mfg.status = ManufacturerProfile.Status.APPROVED
                mfg.admin_review_notes = 'Account reinstated by platform admin.'
                mfg.save(update_fields=['status', 'admin_review_notes'])
                Product.objects.filter(manufacturer=mfg).update(is_active=True)

            AuditLog.objects.create(
                user=request.user,
                action='USER_UNBANNED',
                target_model='User',
                target_id=str(target_user.id),
                details={'username': target_user.username, 'role': target_user.role}
            )
            msg = f"Account for {target_user.username} ({target_user.role}) has been reinstated."

        return Response({
            'id': target_user.id,
            'username': target_user.username,
            'is_banned': target_user.is_banned,
            'is_active': target_user.is_active,
            'ban_reason': target_user.ban_reason,
            'banned_at': target_user.banned_at,
            'message': msg
        })


class AdminMaintenanceSubscribersView(views.APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        subscribers = MaintenanceSubscriber.objects.all().order_by('-created_at')
        return Response([{
            'id': s.id,
            'email': s.email,
            'created_at': s.created_at
        } for s in subscribers])

    def delete(self, request, pk=None):
        sub_id = request.data.get('id')
        if sub_id:
            MaintenanceSubscriber.objects.filter(id=sub_id).delete()
        return Response({'message': 'Subscriber removed successfully.'})


class AdminSellerRequestView(views.APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        logs = AuditLog.objects.filter(
            action='SELLER_AUTHORIZATION_REQUESTED'
        ).order_by('-created_at')
        requests_list = []
        for l in logs:
            details = l.details or {}
            email = details.get('email', '')
            user_match = User.objects.filter(email__iexact=email).first() if email else None
            requests_list.append({
                'id': l.id,
                'created_at': l.created_at,
                'business_name': details.get('business_name', l.target_id),
                'email': email,
                'phone': details.get('phone', ''),
                'location_district': details.get('location_district', ''),
                'fssai_number': details.get('fssai_number', ''),
                'message': details.get('message', ''),
                'user_id': user_match.id if user_match else None,
                'is_authorized': user_match.can_sell if user_match else False,
            })
        return Response(requests_list)

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'detail': 'Email is required'}, status=400)

        user_match = User.objects.filter(email__iexact=email).first()
        if user_match:
            user_match.can_sell = True
            user_match.save(update_fields=['can_sell'])
        else:
            username = email.split('@')[0]
            c = 1
            base = username
            while User.objects.filter(username=username).exists():
                username = f"{base}_{c}"
                c += 1
            user_match = User.objects.create(
                username=username,
                email=email,
                can_sell=True,
                role=User.Role.CUSTOMER
            )
            user_match.set_unusable_password()
            user_match.save()

        AuditLog.objects.create(
            user=request.user,
            action='SELLER_AUTHORIZATION_APPROVED',
            target_model='User',
            target_id=str(user_match.id),
            details={'email': email, 'granted_by': request.user.username}
        )

        return Response({
            'success': True,
            'message': f"Seller access granted for {email}.",
            'user': UserSerializer(user_match).data
        })


class AdminCommissionView(views.APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        current = CommissionSetting.get_current()
        history = CommissionChangeLog.objects.all().order_by('-created_at')[:20]
        return Response({
            'current': CommissionSettingSerializer(current).data,
            'history': [
                {
                    'id': h.id,
                    'changed_by': h.changed_by.username if h.changed_by else 'System',
                    'previous_rate': str(h.previous_rate),
                    'new_rate': str(h.new_rate),
                    'previous_platform_fee': str(h.previous_platform_fee),
                    'new_platform_fee': str(h.new_platform_fee),
                    'previous_delivery_fee': str(h.previous_delivery_fee),
                    'new_delivery_fee': str(h.new_delivery_fee),
                    'reason': h.reason,
                    'created_at': h.created_at
                }
                for h in history
            ]
        })

    def post(self, request):
        serializer = CommissionUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        current = CommissionSetting.get_current()
        data = serializer.validated_data

        CommissionChangeLog.objects.create(
            changed_by=request.user,
            previous_rate=current.default_commission_rate,
            new_rate=data['default_commission_rate'],
            previous_platform_fee=current.customer_platform_fee,
            new_platform_fee=data['customer_platform_fee'],
            previous_delivery_fee=current.default_delivery_fee,
            new_delivery_fee=data['default_delivery_fee'],
            reason=data['reason'],
            effective_from=timezone.now()
        )

        current.default_commission_rate = data['default_commission_rate']
        current.customer_platform_fee = data['customer_platform_fee']
        current.default_delivery_fee = data['default_delivery_fee']
        current.free_delivery_threshold = data['free_delivery_threshold']
        if 'allow_seller_registration' in data:
            current.allow_seller_registration = data['allow_seller_registration']
        current.save()

        AuditLog.objects.create(
            user=request.user,
            action='COMMISSION_SETTING_UPDATED',
            target_model='CommissionSetting',
            target_id=str(current.id),
            details={'rate': str(current.default_commission_rate), 'reason': data['reason']}
        )

        return Response({
            'detail': 'Commission settings updated successfully.',
            'current': CommissionSettingSerializer(current).data
        })


class PlatformSettingsView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        current = CommissionSetting.get_current()
        return Response({
            'allow_seller_registration': current.allow_seller_registration,
            'is_maintenance_mode': current.is_maintenance_mode,
            'maintenance_message': current.maintenance_message,
            'customer_platform_fee': str(current.customer_platform_fee),
            'default_delivery_fee': str(current.default_delivery_fee),
            'free_delivery_threshold': str(current.free_delivery_threshold),
        })


class AdminToggleSellerRegistrationView(views.APIView):
    permission_classes = [IsAdminUserRole]

    def post(self, request):
        current = CommissionSetting.get_current()
        current.allow_seller_registration = not current.allow_seller_registration
        current.save(update_fields=['allow_seller_registration'])

        AuditLog.objects.create(
            user=request.user,
            action='SELLER_REGISTRATION_VISIBILITY_TOGGLED',
            target_model='CommissionSetting',
            target_id=str(current.id),
            details={'allow_seller_registration': current.allow_seller_registration}
        )
        return Response({
            'allow_seller_registration': current.allow_seller_registration,
            'message': f"'Sell with Us' footer visibility {'enabled' if current.allow_seller_registration else 'disabled'}."
        })


class AdminToggleMaintenanceModeView(views.APIView):
    permission_classes = [IsAdminUserRole]

    def post(self, request):
        current = CommissionSetting.get_current()
        toggle = request.data.get('toggle', True)
        if toggle is True or toggle == 'true':
            current.is_maintenance_mode = not current.is_maintenance_mode
        elif 'is_maintenance_mode' in request.data:
            current.is_maintenance_mode = bool(request.data['is_maintenance_mode'])

        custom_msg = request.data.get('maintenance_message')
        if custom_msg is not None and str(custom_msg).strip():
            current.maintenance_message = str(custom_msg).strip()
        current.save(update_fields=['is_maintenance_mode', 'maintenance_message'])

        AuditLog.objects.create(
            user=request.user,
            action='MAINTENANCE_MODE_UPDATED',
            target_model='CommissionSetting',
            target_id=str(current.id),
            details={
                'is_maintenance_mode': current.is_maintenance_mode,
                'maintenance_message': current.maintenance_message
            }
        )
        return Response({
            'is_maintenance_mode': current.is_maintenance_mode,
            'maintenance_message': current.maintenance_message,
            'message': f"Storefront maintenance mode {'activated' if current.is_maintenance_mode else 'deactivated'}."
        })


class AdminSettlementsView(views.APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        balances = SettlementService.calculate_manufacturer_balances()
        records = ManufacturerSettlement.objects.all().order_by('-created_at')
        return Response({
            'manufacturer_balances': balances,
            'settlement_records': ManufacturerSettlementSerializer(records, many=True).data,
        })

    def post(self, request):
        mfg_id = request.data.get('manufacturer_id')
        mfg = get_object_or_404(ManufacturerProfile, id=mfg_id)

        items = OrderItem.objects.filter(manufacturer=mfg, order__payment_status=Order.PaymentStatus.PAID)
        total_sales = sum(i.subtotal for i in items)
        total_commission = sum(i.commission_amount for i in items)
        net_payable = sum(i.manufacturer_payout for i in items)

        ref = f"STL-{timezone.now().strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"

        settlement = ManufacturerSettlement.objects.create(
            settlement_reference=ref,
            manufacturer=mfg,
            period_start=timezone.now().date().replace(day=1),
            period_end=timezone.now().date(),
            total_sales=total_sales,
            total_commission=total_commission,
            net_payable=net_payable,
            status=ManufacturerSettlement.Status.READY_FOR_SETTLEMENT,
            payout_notes=request.data.get('notes', 'Marketplace settlement calculated.')
        )

        AuditLog.objects.create(
            user=request.user,
            action='SETTLEMENT_RECORD_GENERATED',
            target_model='ManufacturerSettlement',
            target_id=str(settlement.id),
            details={'reference': ref, 'amount': str(net_payable)}
        )

        return Response(ManufacturerSettlementSerializer(settlement).data, status=201)


class AdminAuditLogsView(views.APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        logs = AuditLog.objects.all().order_by('-created_at')[:50]
        return Response(AuditLogSerializer(logs, many=True).data)


class MaintenanceNotifyView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email or '@' not in email or '.' not in email:
            return Response({'detail': 'Please provide a valid email address.'}, status=400)
        from .models import MaintenanceSubscriber
        MaintenanceSubscriber.objects.get_or_create(email=email)
        return Response({
            'success': True,
            'message': "Thank you! We'll alert you the moment our doors open."
        })
