from django.contrib import admin
from .models import (
    User, CustomerProfile, Address, ManufacturerProfile, ComplianceDocument,
    CourierProfile, CourierDeliveryScanLog,
    Category, Product, ProductImage, ProductReview, CommissionSetting, CommissionChangeLog,
    Cart, CartItem, Order, OrderItem, PaymentTransaction, Refund,
    ManufacturerSettlement, Coupon, AuditLog, EmailOTP
)

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'role', 'can_sell', 'is_banned', 'is_staff', 'is_active')
    list_editable = ('can_sell', 'is_banned')
    list_filter = ('role', 'can_sell', 'is_banned', 'is_staff', 'is_active')
    search_fields = ('username', 'email', 'phone_number')
    actions = ['grant_seller_authorization']

    @admin.action(description="Grant seller authorization & send approval email with portal link")
    def grant_seller_authorization(self, request, queryset):
        count = 0
        from .resend_service import send_seller_approval_email
        for u in queryset:
            u.can_sell = True
            u.save(update_fields=['can_sell'])
            try:
                send_seller_approval_email(user=u, request=request)
                count += 1
            except Exception:
                pass
        self.message_user(request, f"Seller authorization granted and email dispatched to {count} user(s).")

    def save_model(self, request, obj, form, change):
        was_can_sell = False
        if change:
            old_obj = User.objects.filter(pk=obj.pk).values('can_sell').first()
            was_can_sell = old_obj.get('can_sell') if old_obj else False
        super().save_model(request, obj, form, change)
        if obj.can_sell and (not change or not was_can_sell):
            try:
                from .resend_service import send_seller_approval_email
                send_seller_approval_email(user=obj, request=request)
            except Exception:
                pass

@admin.register(ManufacturerProfile)
class ManufacturerProfileAdmin(admin.ModelAdmin):
    list_display = ('business_name', 'is_featured', 'brand_badge', 'fssai_license_number', 'location_district', 'status', 'is_verified_producer')
    list_editable = ('is_featured', 'status', 'is_verified_producer')
    list_filter = ('is_featured', 'status', 'is_verified_producer', 'location_district')
    search_fields = ('business_name', 'fssai_license_number', 'contact_email', 'contact_phone')
    actions = ['approve_seller_profiles']

    @admin.action(description="Approve selected seller profiles & send notification email")
    def approve_seller_profiles(self, request, queryset):
        count = 0
        from .resend_service import send_seller_approval_email
        for profile in queryset:
            profile.status = ManufacturerProfile.Status.APPROVED
            profile.is_verified_producer = True
            profile.save(update_fields=['status', 'is_verified_producer'])
            if profile.user and not profile.user.can_sell:
                profile.user.can_sell = True
                profile.user.save(update_fields=['can_sell'])
            try:
                send_seller_approval_email(manufacturer_profile=profile, request=request)
                count += 1
            except Exception:
                pass
        self.message_user(request, f"{count} seller profile(s) approved and notification email dispatched.")

    def save_model(self, request, obj, form, change):
        was_approved = False
        if change:
            old_obj = ManufacturerProfile.objects.filter(pk=obj.pk).values('status').first()
            was_approved = (old_obj.get('status') == ManufacturerProfile.Status.APPROVED) if old_obj else False
        super().save_model(request, obj, form, change)
        if obj.status == ManufacturerProfile.Status.APPROVED and not was_approved:
            try:
                from .resend_service import send_seller_approval_email
                send_seller_approval_email(manufacturer_profile=obj, request=request)
            except Exception:
                pass

@admin.register(EmailOTP)
class EmailOTPAdmin(admin.ModelAdmin):
    list_display = ('email', 'otp_code', 'purpose', 'is_used', 'created_at', 'expires_at')
    list_filter = ('purpose', 'is_used', 'created_at')
    search_fields = ('email', 'otp_code')

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('title', 'manufacturer', 'category', 'price', 'weight_grams', 'spice_level', 'status', 'stock_quantity')
    list_filter = ('status', 'spice_level', 'dietary_type', 'is_featured', 'is_bestseller')
    search_fields = ('title', 'description', 'ingredients')
    prepopulated_fields = {'slug': ('title',)}

@admin.register(ProductReview)
class ProductReviewAdmin(admin.ModelAdmin):
    list_display = ('product', 'author_name', 'rating', 'title', 'is_verified_buyer', 'created_at')
    list_filter = ('rating', 'is_verified_buyer', 'created_at')
    search_fields = ('author_name', 'title', 'comment', 'product__title')

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('order_number', 'customer_name', 'total_amount', 'status', 'payment_status', 'created_at')
    list_filter = ('status', 'payment_status', 'created_at')
    search_fields = ('order_number', 'customer_name', 'customer_email', 'customer_phone')

admin.site.register(Category)
admin.site.register(Address)
admin.site.register(CommissionSetting)
admin.site.register(Coupon)
admin.site.register(PaymentTransaction)
admin.site.register(ManufacturerSettlement)
admin.site.register(AuditLog)


@admin.register(CourierProfile)
class CourierProfileAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'phone_number', 'vehicle_type', 'courier_company', 'status', 'is_active', 'total_deliveries_completed', 'created_at')
    list_filter = ('status', 'vehicle_type', 'is_active')
    search_fields = ('full_name', 'phone_number', 'email', 'vehicle_number', 'courier_company')
    actions = ['approve_couriers_and_send_email', 'reject_couriers_and_send_email']

    @admin.action(description="Approve selected courier(s) & dispatch approval email")
    def approve_couriers_and_send_email(self, request, queryset):
        from .resend_service import send_courier_approval_email
        count = 0
        for courier in queryset:
            courier.status = CourierProfile.Status.APPROVED
            courier.is_active = True
            courier.rejection_reason = ''
            courier.suspension_reason = ''
            courier.save()
            courier.user.is_active = True
            courier.user.save(update_fields=['is_active'])
            try:
                send_courier_approval_email(courier, request=request)
            except Exception:
                pass
            count += 1
        self.message_user(request, f"{count} courier(s) approved and notification email dispatched.")

    @admin.action(description="Reject selected courier(s) & dispatch notification email")
    def reject_couriers_and_send_email(self, request, queryset):
        from .resend_service import send_courier_rejection_email
        count = 0
        for courier in queryset:
            courier.status = CourierProfile.Status.REJECTED
            courier.save()
            try:
                send_courier_rejection_email(courier, reason='Declined by administration', request=request)
            except Exception:
                pass
            count += 1
        self.message_user(request, f"{count} courier(s) rejected and notification email dispatched.")


@admin.register(CourierDeliveryScanLog)
class CourierDeliveryScanLogAdmin(admin.ModelAdmin):
    list_display = ('courier', 'order', 'action', 'confirmation_method', 'created_at')
    list_filter = ('action', 'confirmation_method', 'created_at')
    search_fields = ('courier__username', 'courier__email', 'order__order_number')

