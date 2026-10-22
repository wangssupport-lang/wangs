from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, LoginView, CurrentUserView, AddressViewSet,
    CategoryViewSet, ProductViewSet, check_pincode_serviceability,
    CartView, CheckoutQuoteView, CreateOrderView, VerifyPaymentView,
    OrderLookupView, CustomerOrdersView,
    ManufacturerRegisterView, ManufacturerProfileView, ManufacturerProductViewSet,
    ManufacturerOrdersView, ManufacturerFinancialsView,
    AdminMetricsView, AdminManufacturerViewSet, AdminProductViewSet,
    AdminOrderViewSet, AdminCommissionView, AdminSettlementsView, AdminAuditLogsView
)

router = DefaultRouter()
router.register(r'addresses', AddressViewSet, basename='address')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'manufacturer/products', ManufacturerProductViewSet, basename='manufacturer-product')
router.register(r'admin/manufacturers', AdminManufacturerViewSet, basename='admin-manufacturer')
router.register(r'admin/products', AdminProductViewSet, basename='admin-product')
router.register(r'admin/orders', AdminOrderViewSet, basename='admin-order')

urlpatterns = [
    # Auth
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/me/', CurrentUserView.as_view(), name='auth-me'),
    
    # Storefront & Utility
    path('pincode/check/', check_pincode_serviceability, name='pincode-check'),
    
    # Cart & Checkout
    path('cart/', CartView.as_view(), name='cart'),
    path('checkout/quote/', CheckoutQuoteView.as_view(), name='checkout-quote'),
    path('checkout/create-order/', CreateOrderView.as_view(), name='create-order'),
    path('payments/verify/', VerifyPaymentView.as_view(), name='payment-verify'),
    path('orders/lookup/<str:order_number>/', OrderLookupView.as_view(), name='order-lookup'),
    path('orders/my-orders/', CustomerOrdersView.as_view(), name='customer-orders'),
    
    # Manufacturer Portal
    path('manufacturer/register/', ManufacturerRegisterView.as_view(), name='mfg-register'),
    path('manufacturer/profile/', ManufacturerProfileView.as_view(), name='mfg-profile'),
    path('manufacturer/orders/', ManufacturerOrdersView.as_view(), name='mfg-orders'),
    path('manufacturer/financials/', ManufacturerFinancialsView.as_view(), name='mfg-financials'),
    
    # Admin Portal
    path('admin/metrics/', AdminMetricsView.as_view(), name='admin-metrics'),
    path('admin/commission/', AdminCommissionView.as_view(), name='admin-commission'),
    path('admin/settlements/', AdminSettlementsView.as_view(), name='admin-settlements'),
    path('admin/audit-logs/', AdminAuditLogsView.as_view(), name='admin-audit-logs'),

    # Router endpoints
    path('', include(router.urls)),
]
