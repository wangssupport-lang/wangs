import uuid
from decimal import Decimal
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator


class User(AbstractUser):
    class Role(models.TextChoices):
        CUSTOMER = 'CUSTOMER', 'Customer'
        MANUFACTURER = 'MANUFACTURER', 'Manufacturer'
        ADMIN = 'ADMIN', 'Admin'

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    is_phone_verified = models.BooleanField(default=False)

    def is_manufacturer(self):
        return self.role == self.Role.MANUFACTURER

    def is_platform_admin(self):
        return self.role == self.Role.ADMIN or self.is_superuser


class CustomerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='customer_profile')
    newsletter_subscribed = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Customer: {self.user.username}"


class Address(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses')
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20)
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True, default='')
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=10)
    landmark = models.CharField(max_length=150, blank=True, default='')
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.full_name} - {self.postal_code}"


class ManufacturerProfile(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending Approval'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        SUSPENDED = 'SUSPENDED', 'Suspended'

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='manufacturer_profile')
    business_name = models.CharField(max_length=200, unique=True)
    slug = models.SlugField(max_length=220, unique=True)
    brand_story = models.TextField(blank=True, default='')
    location_district = models.CharField(max_length=100, default='Kohima, Nagaland')
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=20)
    business_address = models.TextField()
    postal_code = models.CharField(max_length=10)
    
    # Compliance & Food Licensing
    fssai_license_number = models.CharField(max_length=50, blank=True, default='')
    gst_number = models.CharField(max_length=50, blank=True, default='')
    compliance_notes = models.TextField(blank=True, default='')

    # Banking for settlement
    bank_account_holder = models.CharField(max_length=150, blank=True, default='')
    bank_account_number = models.CharField(max_length=50, blank=True, default='')
    bank_ifsc_code = models.CharField(max_length=20, blank=True, default='')
    bank_name = models.CharField(max_length=100, blank=True, default='')

    # Admin approval & commission override
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    commission_rate_override = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))],
        help_text="Custom commission rate (%) for this seller. If empty, uses platform default."
    )
    is_verified_producer = models.BooleanField(default=False)
    admin_review_notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.business_name} ({self.get_status_display()})"


class ComplianceDocument(models.Model):
    class DocType(models.TextChoices):
        FSSAI = 'FSSAI_LICENSE', 'FSSAI License'
        GST = 'GST_CERTIFICATE', 'GST Registration'
        ID_PROOF = 'ID_PROOF', 'Identity Proof'
        OTHER = 'OTHER', 'Other Certification'

    manufacturer = models.ForeignKey(ManufacturerProfile, on_delete=models.CASCADE, related_name='documents')
    doc_type = models.CharField(max_length=30, choices=DocType.choices, default=DocType.FSSAI)
    title = models.CharField(max_length=150)
    document_number = models.CharField(max_length=100, blank=True, default='')
    file_url = models.CharField(max_length=500, blank=True, default='')
    is_verified = models.BooleanField(default=False)
    verification_notes = models.TextField(blank=True, default='')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.manufacturer.business_name} - {self.title}"


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)
    description = models.TextField(blank=True, default='')
    image_url = models.CharField(max_length=500, blank=True, default='')
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['display_order', 'name']

    def __str__(self):
        return self.name


class Product(models.Model):
    class SpiceLevel(models.TextChoices):
        MILD = 'MILD', 'Mild'
        MEDIUM = 'MEDIUM', 'Medium'
        HOT = 'HOT', 'Hot'
        FIERY_KING_CHILLI = 'FIERY_KING_CHILLI', 'Fiery King Chilli (Raja Mircha)'

    class DietaryType(models.TextChoices):
        VEG = 'VEG', 'Vegetarian'
        NON_VEG = 'NON_VEG', 'Non-Vegetarian (Authentic Meat Pickles)'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending Admin Approval'
        APPROVED = 'APPROVED', 'Approved & Active'
        REJECTED = 'REJECTED', 'Rejected'

    manufacturer = models.ForeignKey(ManufacturerProfile, on_delete=models.CASCADE, related_name='products')
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='products')
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=240, unique=True)
    short_description = models.CharField(max_length=300)
    description = models.TextField()
    
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('1.00'))])
    mrp = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    weight_grams = models.PositiveIntegerField(help_text="Net weight in grams (e.g. 200, 250, 400)")
    
    spice_level = models.CharField(max_length=25, choices=SpiceLevel.choices, default=SpiceLevel.HOT)
    dietary_type = models.CharField(max_length=15, choices=DietaryType.choices, default=DietaryType.NON_VEG)
    
    ingredients = models.TextField(help_text="Detailed ingredients list (e.g. Smoked Pork, King Chilli, Axone/Fermented Soybean, Bamboo Shoot, Mustard Oil, Salt)")
    allergens = models.CharField(max_length=255, blank=True, default='May contain traces of mustard or fermented soybeans (Axone)')
    storage_instructions = models.TextField(default="Store in a cool, dry place. Keep submerged in oil. Use a dry spoon only.")
    shelf_life = models.CharField(max_length=100, default="9 months from manufacturing")
    
    stock_quantity = models.PositiveIntegerField(default=10)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    is_bestseller = models.BooleanField(default=False)
    primary_image_url = models.CharField(max_length=500, blank=True, default='')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_featured', '-is_bestseller', '-created_at']

    def is_in_stock(self):
        return self.stock_quantity > 0

    def is_available_for_sale(self):
        return (
            self.is_active and
            self.status == self.Status.APPROVED and
            self.stock_quantity > 0 and
            self.manufacturer.status == ManufacturerProfile.Status.APPROVED
        )

    def __str__(self):
        return f"{self.title} ({self.weight_grams}g) - ₹{self.price}"


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image_url = models.CharField(max_length=500)
    alt_text = models.CharField(max_length=200, blank=True, default='')
    is_primary = models.BooleanField(default=False)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['display_order']

    def __str__(self):
        return f"Image for {self.product.title}"


class CommissionSetting(models.Model):
    default_commission_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('10.00'),
        help_text="Default manufacturer commission rate (e.g. 10.00 for 10%)"
    )
    customer_platform_fee = models.DecimalField(
        max_digits=6, decimal_places=2, default=Decimal('5.00'),
        help_text="Customer platform fee in INR (e.g. ₹5.00)"
    )
    default_delivery_fee = models.DecimalField(
        max_digits=6, decimal_places=2, default=Decimal('50.00'),
        help_text="Flat delivery fee in INR (e.g. ₹50.00)"
    )
    free_delivery_threshold = models.DecimalField(
        max_digits=8, decimal_places=2, default=Decimal('999.00'),
        help_text="Cart subtotal above which delivery is free"
    )
    effective_from = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    @classmethod
    def get_current(cls):
        current = cls.objects.filter(is_active=True).order_by('-effective_from').first()
        if not current:
            current = cls.objects.create(
                default_commission_rate=Decimal('10.00'),
                customer_platform_fee=Decimal('5.00'),
                default_delivery_fee=Decimal('50.00'),
                free_delivery_threshold=Decimal('999.00')
            )
        return current

    def __str__(self):
        return f"Commission: {self.default_commission_rate}% | Platform Fee: ₹{self.customer_platform_fee} | Delivery: ₹{self.default_delivery_fee}"


class CommissionChangeLog(models.Model):
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    previous_rate = models.DecimalField(max_digits=5, decimal_places=2)
    new_rate = models.DecimalField(max_digits=5, decimal_places=2)
    previous_platform_fee = models.DecimalField(max_digits=6, decimal_places=2)
    new_platform_fee = models.DecimalField(max_digits=6, decimal_places=2)
    previous_delivery_fee = models.DecimalField(max_digits=6, decimal_places=2)
    new_delivery_fee = models.DecimalField(max_digits=6, decimal_places=2)
    reason = models.CharField(max_length=255)
    effective_from = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Commission Change: {self.previous_rate}% -> {self.new_rate}% at {self.created_at}"


class Cart(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='carts')
    session_key = models.CharField(max_length=64, blank=True, null=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def get_items_subtotal(self):
        return sum(item.product.price * item.quantity for item in self.items.all())

    def __str__(self):
        return f"Cart ({self.user.username if self.user else self.session_key})"


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('cart', 'product')

    def get_line_total(self):
        return self.product.price * self.quantity

    def __str__(self):
        return f"{self.quantity}x {self.product.title}"


class Coupon(models.Model):
    class DiscountType(models.TextChoices):
        PERCENTAGE = 'PERCENTAGE', 'Percentage Discount'
        FLAT = 'FLAT', 'Flat Amount Discount'

    code = models.CharField(max_length=30, unique=True)
    discount_type = models.CharField(max_length=15, choices=DiscountType.choices, default=DiscountType.PERCENTAGE)
    value = models.DecimalField(max_digits=6, decimal_places=2)
    min_spend = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal('0.00'))
    max_discount_cap = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    valid_until = models.DateTimeField(null=True, blank=True)

    def calculate_discount(self, subtotal):
        if subtotal < self.min_spend or not self.is_active:
            return Decimal('0.00')
        if self.discount_type == self.DiscountType.PERCENTAGE:
            disc = (subtotal * self.value) / Decimal('100.00')
            if self.max_discount_cap and disc > self.max_discount_cap:
                disc = self.max_discount_cap
            return round(disc, 2)
        else:
            return min(self.value, subtotal)


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        CONFIRMED = 'CONFIRMED', 'Confirmed'
        PROCESSING = 'PROCESSING', 'Processing'
        DISPATCHED = 'DISPATCHED', 'Dispatched'
        DELIVERED = 'DELIVERED', 'Delivered'
        CANCELLED = 'CANCELLED', 'Cancelled'
        REFUNDED = 'REFUNDED', 'Refunded'

    class PaymentStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending Payment'
        PAID = 'PAID', 'Payment Received'
        FAILED = 'FAILED', 'Payment Failed'
        REFUNDED = 'REFUNDED', 'Refunded'

    order_number = models.CharField(max_length=32, unique=True, db_index=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    
    # Customer contact details snapshot
    customer_name = models.CharField(max_length=150)
    customer_email = models.EmailField()
    customer_phone = models.CharField(max_length=20)
    
    # Shipping Address snapshot
    shipping_address_line1 = models.CharField(max_length=255)
    shipping_address_line2 = models.CharField(max_length=255, blank=True, default='')
    shipping_city = models.CharField(max_length=100)
    shipping_state = models.CharField(max_length=100)
    shipping_postal_code = models.CharField(max_length=10)
    
    # Financial breakdown (Snapshotted immutably)
    items_subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    customer_platform_fee = models.DecimalField(max_digits=8, decimal_places=2)
    delivery_fee = models.DecimalField(max_digits=8, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal('0.00'))
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Platform accounting aggregates
    platform_commission_total = models.DecimalField(max_digits=10, decimal_places=2)
    manufacturer_payout_total = models.DecimalField(max_digits=10, decimal_places=2)
    
    coupon_code = models.CharField(max_length=30, blank=True, default='')

    # Statuses
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)
    payment_method = models.CharField(max_length=30, default='RAZORPAY_TEST')

    dispatch_notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Order #{self.order_number} (₹{self.total_amount})"


class OrderItem(models.Model):
    class FulfillmentStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PACKED = 'PACKED', 'Packed'
        DISPATCHED = 'DISPATCHED', 'Dispatched'
        DELIVERED = 'DELIVERED', 'Delivered'
        CANCELLED = 'CANCELLED', 'Cancelled'

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='order_items')
    manufacturer = models.ForeignKey(ManufacturerProfile, on_delete=models.PROTECT, related_name='order_items')
    
    # Snapshots to preserve integrity
    product_title = models.CharField(max_length=200)
    weight_grams = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Commission rules applied snapshot
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2)
    commission_amount = models.DecimalField(max_digits=10, decimal_places=2)
    manufacturer_payout = models.DecimalField(max_digits=10, decimal_places=2)
    
    fulfillment_status = models.CharField(max_length=20, choices=FulfillmentStatus.choices, default=FulfillmentStatus.PENDING)
    
    def __str__(self):
        return f"{self.quantity}x {self.product_title} in #{self.order.order_number}"


class PaymentTransaction(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        SUCCESS = 'SUCCESS', 'Success'
        FAILED = 'FAILED', 'Failed'
        REFUNDED = 'REFUNDED', 'Refunded'

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='payments')
    provider = models.CharField(max_length=50, default='RAZORPAY_TEST')
    payment_order_id = models.CharField(max_length=100, blank=True, default='')
    transaction_id = models.CharField(max_length=100, blank=True, default='', db_index=True)
    signature = models.CharField(max_length=255, blank=True, default='')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='INR')
    idempotency_key = models.CharField(max_length=100, unique=True)
    raw_payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Payment {self.transaction_id} for Order #{self.order.order_number} ({self.status})"


class Refund(models.Model):
    class Status(models.TextChoices):
        REQUESTED = 'REQUESTED', 'Requested'
        APPROVED = 'APPROVED', 'Approved'
        PROCESSED = 'PROCESSED', 'Processed'
        REJECTED = 'REJECTED', 'Rejected'

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='refunds')
    order_item = models.ForeignKey(OrderItem, on_delete=models.SET_NULL, null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.REQUESTED)
    refund_transaction_id = models.CharField(max_length=100, blank=True, default='')
    admin_notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Refund ₹{self.amount} on #{self.order.order_number} ({self.status})"


class ManufacturerSettlement(models.Model):
    class Status(models.TextChoices):
        UNSETTLED = 'UNSETTLED', 'Unsettled Accrual'
        READY_FOR_SETTLEMENT = 'READY_FOR_SETTLEMENT', 'Ready for Payout Batch'
        PROCESSED = 'PROCESSED', 'Settled / Paid'
        ON_HOLD = 'ON_HOLD', 'On Hold (Compliance Review)'

    settlement_reference = models.CharField(max_length=40, unique=True)
    manufacturer = models.ForeignKey(ManufacturerProfile, on_delete=models.CASCADE, related_name='settlements')
    period_start = models.DateField()
    period_end = models.DateField()
    
    total_sales = models.DecimalField(max_digits=12, decimal_places=2)
    total_commission = models.DecimalField(max_digits=12, decimal_places=2)
    net_payable = models.DecimalField(max_digits=12, decimal_places=2)
    
    status = models.CharField(max_length=25, choices=Status.choices, default=Status.UNSETTLED)
    payout_notes = models.TextField(blank=True, default="Marketplace settlement batch - awaiting provider escrow payout release.")
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Settlement {self.settlement_reference} - {self.manufacturer.business_name} (₹{self.net_payable})"


class AuditLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=100)
    target_model = models.CharField(max_length=100)
    target_id = models.CharField(max_length=100)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.CharField(max_length=50, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.created_at.strftime('%Y-%m-%d %H:%M:%S')} - {self.action} by {self.user}"
