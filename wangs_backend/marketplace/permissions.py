from rest_framework import permissions

class IsAdminUserRole(permissions.BasePermission):
    """
    Allows access only to platform administrators.
    """
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.role == 'ADMIN' or request.user.is_superuser or getattr(request.user, 'is_staff', False))
        )


class IsManufacturerUser(permissions.BasePermission):
    """
    Allows access to authenticated manufacturers.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'MANUFACTURER')


class IsApprovedManufacturer(permissions.BasePermission):
    """
    Allows access only to approved manufacturers.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.role == 'MANUFACTURER'):
            return False
        profile = getattr(request.user, 'manufacturer_profile', None)
        return bool(profile and profile.status == 'APPROVED')


class IsApprovedCourierUser(permissions.BasePermission):
    """
    Allows access only to authenticated couriers whose profile is APPROVED and active.
    Platform administrators also have permission.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role == 'ADMIN' or request.user.is_superuser or getattr(request.user, 'is_staff', False):
            return True
        if request.user.role != 'COURIER':
            return False
        if getattr(request.user, 'is_banned', False) or not request.user.is_active:
            return False
        profile = getattr(request.user, 'courier_profile', None)
        return bool(profile and profile.status == 'APPROVED' and profile.is_active)
