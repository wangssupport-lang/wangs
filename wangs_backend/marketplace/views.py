import uuid
from decimal import Decimal
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
    Category, Product, ProductImage, CommissionSetting, CommissionChangeLog,
    Cart, CartItem, Order, OrderItem, PaymentTransaction, Refund,
    ManufacturerSettlement, Coupon, AuditLog
)
from .serializers import (
    UserSerializer, RegisterSerializer, AddressSerializer, CustomerProfileSerializer,
    ComplianceDocumentSerializer, ManufacturerProfileSerializer, ManufacturerApplicationSerializer,
    CategorySerializer, ProductSerializer, CartSerializer, CartItemSerializer,
    OrderSerializer, OrderCreateSerializer, PaymentVerifySerializer,
    CommissionSettingSerializer, CommissionUpdateSerializer,
    ManufacturerSettlementSerializer, RefundSerializer, AuditLogSerializer
)
from .permissions import IsAdminUserRole, IsManufacturerUser, IsApprovedManufacturer
from .services import FinancialCalculator, OrderService, PaymentService, SettlementService


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


class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        if serializer.validated_data.get('is_default', False):
            Address.objects.filter(user=self.request.user).update(is_default=False)
        serializer.save(user=self.request.user)


# -------------------------------------------------------------
# PUBLIC CATALOG & STOREFRONT
# -------------------------------------------------------------

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.filter(is_active=True).order_by('display_order', 'name')
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None
    lookup_field = 'slug'


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

    state = "Nagaland" if pincode.startswith('797') or pincode.startswith('798') else "All India"
    est_days = "2-3 business days" if state == "Nagaland" else "4-6 business days"
    return Response({
        'valid': True,
        'pincode': pincode,
        'serviceable': True,
        'region': state,
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
        serializer = ManufacturerApplicationSerializer(data=request.data)
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

    def perform_create(self, serializer):
        profile = get_object_or_404(ManufacturerProfile, user=self.request.user)
        title = serializer.validated_data['title']
        slug = slugify(title)
        count = 1
        original_slug = slug
        while Product.objects.filter(slug=slug).exists():
            slug = f"{original_slug}-{count}"
            count += 1

        serializer.save(
            manufacturer=profile,
            slug=slug,
            status=Product.Status.PENDING
        )

    def perform_update(self, serializer):
        product = self.get_object()
        serializer.save(status=Product.Status.PENDING if not self.request.user.is_platform_admin() else product.status)


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
                'shipping_city': item.order.shipping_city,
                'shipping_state': item.order.shipping_state,
                'product_title': item.product_title,
                'quantity': item.quantity,
                'unit_price': str(item.unit_price),
                'subtotal': str(item.subtotal),
                'commission_rate': str(item.commission_rate),
                'commission_amount': str(item.commission_amount),
                'manufacturer_payout': str(item.manufacturer_payout),
                'fulfillment_status': item.fulfillment_status,
                'order_payment_status': item.order.payment_status,
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
        gmv = paid_orders.aggregate(sum=Sum('total_amount'))['sum'] or Decimal('0.00')
        platform_commission = paid_orders.aggregate(sum=Sum('platform_commission_total'))['sum'] or Decimal('0.00')
        customer_platform_fees = paid_orders.aggregate(sum=Sum('customer_platform_fee'))['sum'] or Decimal('0.00')
        delivery_collections = paid_orders.aggregate(sum=Sum('delivery_fee'))['sum'] or Decimal('0.00')

        active_manufacturers = ManufacturerProfile.objects.filter(status=ManufacturerProfile.Status.APPROVED).count()
        pending_sellers = ManufacturerProfile.objects.filter(status=ManufacturerProfile.Status.PENDING).count()
        pending_products = Product.objects.filter(status=Product.Status.PENDING).count()
        pending_refunds = Refund.objects.filter(status=Refund.Status.REQUESTED).count()

        return Response({
            'gmv': str(gmv),
            'total_orders': total_orders,
            'platform_commission_revenue': str(platform_commission),
            'customer_platform_fee_revenue': str(customer_platform_fees),
            'delivery_fee_collected': str(delivery_collections),
            'total_platform_revenue': str(platform_commission + customer_platform_fees),
            'active_manufacturers': active_manufacturers,
            'pending_seller_applications': pending_sellers,
            'pending_products_review': pending_products,
            'pending_refunds': pending_refunds,
        })


class AdminManufacturerViewSet(viewsets.ModelViewSet):
    queryset = ManufacturerProfile.objects.all().order_by('-created_at')
    serializer_class = ManufacturerProfileSerializer
    permission_classes = [IsAdminUserRole]

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


class AdminProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by('-created_at')
    serializer_class = ProductSerializer
    permission_classes = [IsAdminUserRole]

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


class AdminOrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all().order_by('-created_at')
    serializer_class = OrderSerializer
    permission_classes = [IsAdminUserRole]

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
