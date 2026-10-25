from django.http import JsonResponse
from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import CommissionSetting


class MaintenanceModeMiddleware:
    """
    Enforces strict Maintenance Mode across all public endpoints.
    When active:
    - Blocks all normal users and guest visitors from retrieving products, categories,
      brands, cart data, or placing orders (returns HTTP 503 Service Unavailable).
    - Ensures NO products or sensitive store data are exposed to unauthenticated users.
    - Whitelists:
      - /api/platform-settings/ (required for storefront status checks)
      - /api/auth/login/, /api/auth/me/, /api/auth/send-otp/, /api/auth/verify-otp/ (admin sign-in)
      - /api/maintenance/notify/ (subscribe for restock alerts)
      - /api/admin/ (admin management endpoints)
      - /admin/ (Django admin)
      - Static & media assets
    - Allows authenticated platform administrators (role == ADMIN or is_staff) to bypass.
    """
    def __init__(self, get_response):
        self.get_response = get_response
        self.jwt_authenticator = JWTAuthentication()

    def __call__(self, request):
        path = request.path

        # Whitelisted URLs that must remain functional during maintenance
        exempt_prefixes = [
            '/static/',
            '/media/',
            '/admin/',
            '/api/platform-settings/',
            '/api/auth/login/',
            '/api/auth/me/',
            '/api/auth/send-otp/',
            '/api/auth/verify-otp/',
            '/api/maintenance/notify/',
            '/api/admin/',
        ]

        if any(path.startswith(prefix) for prefix in exempt_prefixes):
            return self.get_response(request)

        # Check if maintenance mode is active
        try:
            current = CommissionSetting.get_current()
            is_maintenance = current.is_maintenance_mode
            message = current.maintenance_message
        except Exception:
            is_maintenance = False
            message = "Website is currently under maintenance."

        if not is_maintenance:
            return self.get_response(request)

        # Check if user is authenticated admin (via session or JWT header)
        is_admin = False
        if request.user and request.user.is_authenticated:
            if getattr(request.user, 'role', '') == 'ADMIN' or request.user.is_staff or request.user.is_superuser:
                is_admin = True

        if not is_admin and 'HTTP_AUTHORIZATION' in request.META:
            try:
                auth_res = self.jwt_authenticator.authenticate(request)
                if auth_res:
                    user, token = auth_res
                    if getattr(user, 'role', '') == 'ADMIN' or user.is_staff or user.is_superuser:
                        is_admin = True
            except Exception:
                pass

        if is_admin:
            return self.get_response(request)

        # Block all public operations with 503 Service Unavailable
        return JsonResponse({
            'maintenance': True,
            'detail': 'Website is currently under scheduled maintenance. We will be right back.',
            'message': message,
        }, status=503)
