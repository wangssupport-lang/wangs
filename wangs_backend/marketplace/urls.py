from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, LoginView, CurrentUserView, AddressViewSet,
    SendEmailOTPView, VerifyEmailOTPView, ResetPasswordView, RequestSellerAccessView,
    BrandListView, BrandDetailView,
    CategoryViewSet, ProductViewSet, check_pincode_serviceability,
    CartView, CheckoutQuoteView, CreateOrderView, VerifyPaymentView,
    OrderLookupView, CustomerOrdersView,
    DeliveryOrderLookupView, DeliveryOrderMarkDeliveredView, DeliveryActiveOrdersView,
    ManufacturerRegisterView, ManufacturerProfileView, ManufacturerProductViewSet,
    ManufacturerOrdersView, ManufacturerFinancialsView, SellerRulesPDFView,
    AdminMetricsView, AdminManufacturerViewSet, AdminProductViewSet,
    AdminOrderViewSet, AdminCommissionView, AdminSettlementsView, AdminAuditLogsView,
    AdminUserViewSet, AdminSellerRequestView, PlatformSettingsView, AdminToggleSellerRegistrationView,
    AdminToggleMaintenanceModeView, MaintenanceNotifyView, AdminMaintenanceSubscribersView,
    AdminResearchReportView
)

router = DefaultRouter()
router.register(r'addresses', AddressViewSet, basename='address')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'manufacturer/products', ManufacturerProductViewSet, basename='manufacturer-product')
router.register(r'admin/users', AdminUserViewSet, basename='admin-user')
router.register(r'admin/manufacturers', AdminManufacturerViewSet, basename='admin-manufacturer')
router.register(r'admin/products', AdminProductViewSet, basename='admin-product')
router.register(r'admin/orders', AdminOrderViewSet, basename='admin-order')

urlpatterns = [
    # Auth & Resend Email OTP
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/me/', CurrentUserView.as_view(), name='auth-me'),
    path('auth/send-otp/', SendEmailOTPView.as_view(), name='auth-send-otp'),
    path('auth/verify-otp/', VerifyEmailOTPView.as_view(), name='auth-verify-otp'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='auth-reset-password'),
    path('auth/request-seller-access/', RequestSellerAccessView.as_view(), name='request-seller-access'),
    
    # Storefront & Brands (Amazon-style Brand Spotlight)
    path('brands/', BrandListView.as_view(), name='brands-list'),
    path('brands/<slug:slug>/', BrandDetailView.as_view(), name='brand-detail'),
    path('pincode/check/', check_pincode_serviceability, name='pincode-check'),
    
    # Cart & Checkout
    path('cart/', CartView.as_view(), name='cart'),
    path('checkout/quote/', CheckoutQuoteView.as_view(), name='checkout-quote'),
    path('checkout/create-order/', CreateOrderView.as_view(), name='create-order'),
    path('payments/verify/', VerifyPaymentView.as_view(), name='payment-verify'),
    path('orders/lookup/<str:order_number>/', OrderLookupView.as_view(), name='order-lookup'),
    path('orders/my-orders/', CustomerOrdersView.as_view(), name='customer-orders'),
    
    # Delivery Portal (Accessed directly via /delivery & QR scan)
    path('delivery/active/', DeliveryActiveOrdersView.as_view(), name='delivery-active-orders'),
    path('delivery/order/<str:identifier>/mark-delivered/', DeliveryOrderMarkDeliveredView.as_view(), name='delivery-order-delivered'),
    path('delivery/order/<path:identifier>/', DeliveryOrderLookupView.as_view(), name='delivery-order-lookup'),
    
    # Manufacturer Portal
    path('manufacturer/register/', ManufacturerRegisterView.as_view(), name='mfg-register'),
    path('manufacturer/profile/', ManufacturerProfileView.as_view(), name='mfg-profile'),
    path('manufacturer/orders/', ManufacturerOrdersView.as_view(), name='mfg-orders'),
    path('manufacturer/financials/', ManufacturerFinancialsView.as_view(), name='mfg-financials'),
    path('seller/rules-pdf/', SellerRulesPDFView.as_view(), name='seller-rules-pdf'),
    
    # Public platform configuration
    path('platform-settings/', PlatformSettingsView.as_view(), name='platform-settings'),
    path('maintenance/notify/', MaintenanceNotifyView.as_view(), name='maintenance-notify'),

    # Admin Portal
    path('admin/metrics/', AdminMetricsView.as_view(), name='admin-metrics'),
    path('admin/seller-requests/', AdminSellerRequestView.as_view(), name='admin-seller-requests'),
    path('admin/toggle-seller-registration/', AdminToggleSellerRegistrationView.as_view(), name='admin-toggle-seller-reg'),
    path('admin/toggle-maintenance-mode/', AdminToggleMaintenanceModeView.as_view(), name='admin-toggle-maintenance-mode'),
    path('admin/commission/', AdminCommissionView.as_view(), name='admin-commission'),
    path('admin/settlements/', AdminSettlementsView.as_view(), name='admin-settlements'),
    path('admin/maintenance-subscribers/', AdminMaintenanceSubscribersView.as_view(), name='admin-maintenance-subscribers'),
    path('admin/audit-logs/', AdminAuditLogsView.as_view(), name='admin-audit-logs'),
    path('admin/research-reports/', AdminResearchReportView.as_view(), name='admin-research-reports'),

    # Router endpoints
    path('', include(router.urls)),
]
