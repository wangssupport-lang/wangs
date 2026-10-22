from rest_framework import permissions

class IsAdminUserRole(permissions.BasePermission):
    """
    Allows access only to platform administrators.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.role == 'ADMIN' or request.user.is_superuser))


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
