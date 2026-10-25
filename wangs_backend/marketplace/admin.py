from django.contrib import admin
from .models import (
    User, CustomerProfile, Address, ManufacturerProfile, ComplianceDocument,
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

@admin.register(ManufacturerProfile)
class ManufacturerProfileAdmin(admin.ModelAdmin):
    list_display = ('business_name', 'is_featured', 'brand_badge', 'fssai_license_number', 'location_district', 'status', 'is_verified_producer')
    list_editable = ('is_featured', 'status', 'is_verified_producer')
    list_filter = ('is_featured', 'status', 'is_verified_producer', 'location_district')
    search_fields = ('business_name', 'fssai_license_number', 'contact_email', 'contact_phone')

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

