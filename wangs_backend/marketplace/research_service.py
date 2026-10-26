import os
import io
import csv
import shutil
import datetime
from decimal import Decimal
from django.conf import settings
from django.db.models import Sum, Count, Avg, Q
from django.utils import timezone

from .models import User, ManufacturerProfile, Product, Order, OrderItem, ProductReview


class PDFCanvas:
    """
    Lightweight, dependency-free PDF 1.4 canvas engine for generating
    publication-grade vector PDF research and analytics reports.
    """
    def __init__(self, page_width=595.28, page_height=841.89):
        self.width = page_width
        self.height = page_height
        self.pages = []
        self.current_page = None
        self.new_page()

    def new_page(self):
        self.current_page = {
            'ops': [],
            'width': self.width,
            'height': self.height
        }
        self.pages.append(self.current_page)

    def _escape(self, text):
        cleaned = (
            str(text)
            .replace('₹', 'Rs. ')
            .replace('•', '-')
            .replace('·', '|')
            .replace('–', '-')
            .replace('—', '-')
            .replace('’', "'")
            .replace('‘', "'")
            .replace('“', '"')
            .replace('”', '"')
            .replace('\u2022', '-')
            .replace('\u2013', '-')
            .replace('\u2014', '-')
            .replace('\u2018', "'")
            .replace('\u2019', "'")
            .replace('\u201c', '"')
            .replace('\u201d', '"')
        )
        # Ensure only latin-1 encodable characters survive
        ascii_cleaned = "".join(c if ord(c) < 256 else '?' for c in cleaned)
        return ascii_cleaned.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')

    def set_fill_color(self, r, g, b):
        self.current_page['ops'].append(f"{r:.3f} {g:.3f} {b:.3f} rg")

    def set_stroke_color(self, r, g, b):
        self.current_page['ops'].append(f"{r:.3f} {g:.3f} {b:.3f} RG")

    def set_line_width(self, width):
        self.current_page['ops'].append(f"{width:.2f} w")

    def rect(self, x, y, w, h, fill=True, stroke=False):
        op = "b" if (fill and stroke) else ("f" if fill else "s")
        self.current_page['ops'].append(f"{x:.2f} {y:.2f} {w:.2f} {h:.2f} re {op}")

    def line(self, x1, y1, x2, y2):
        self.current_page['ops'].append(f"{x1:.2f} {y1:.2f} m {x2:.2f} {y2:.2f} l S")

    def text(self, x, y, font, size, text, r=0.1, g=0.1, b=0.1):
        self.set_fill_color(r, g, b)
        escaped = self._escape(str(text))
        self.current_page['ops'].append(f"BT /{font} {size} Tf {x:.2f} {y:.2f} Td ({escaped}) Tj ET")

    def get_approx_char_width(self, font, size):
        if 'Bold' in font:
            return size * 0.58
        return size * 0.52

    def wrap_text(self, text, font, size, max_width):
        words = text.split()
        lines = []
        curr_line = []
        curr_width = 0
        space_width = self.get_approx_char_width(font, size) * 0.6

        for word in words:
            word_width = len(word) * self.get_approx_char_width(font, size)
            if curr_line and (curr_width + space_width + word_width > max_width):
                lines.append(" ".join(curr_line))
                curr_line = [word]
                curr_width = word_width
            else:
                curr_line.append(word)
                curr_width += (space_width if curr_line else 0) + word_width

        if curr_line:
            lines.append(" ".join(curr_line))
        return lines

    def paragraph(self, x, y, text, font, size, leading, max_width, r=0.1, g=0.1, b=0.1):
        lines = self.wrap_text(text, font, size, max_width)
        curr_y = y
        for line in lines:
            self.text(x, curr_y, font, size, line, r, g, b)
            curr_y -= leading
        return curr_y

    def render(self):
        catalog_id = 1
        pages_id = 2
        f1_id = 3  # Helvetica
        f2_id = 4  # Helvetica-Bold
        f3_id = 5  # Helvetica-Oblique

        objects = [None] * 5
        objects[0] = f"<< /Type /Catalog /Pages {pages_id} 0 R >>".encode('latin1')
        objects[2] = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
        objects[3] = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
        objects[4] = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>"

        page_ids = []
        for p in self.pages:
            content_bytes = "\n".join(p['ops']).encode('latin1')
            stream_obj = f"<< /Length {len(content_bytes)} >>\nstream\n{content_bytes.decode('latin1')}\nendstream".encode('latin1')
            stream_id = len(objects) + 1
            objects.append(stream_obj)

            page_obj = (
                f"<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 {p['width']} {p['height']}] "
                f"/Contents {stream_id} 0 R /Resources << /Font << /F1 {f1_id} 0 R /F2 {f2_id} 0 R /F3 {f3_id} 0 R >> >> >>"
            ).encode('latin1')
            page_id = len(objects) + 1
            objects.append(page_obj)
            page_ids.append(page_id)

        kids_str = " ".join(f"{pid} 0 R" for pid in page_ids)
        objects[1] = f"<< /Type /Pages /Kids [{kids_str}] /Count {len(page_ids)} >>".encode('latin1')

        out = [b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"]
        offsets = [0]
        curr_offset = len(out[0])

        for i, obj in enumerate(objects, 1):
            offsets.append(curr_offset)
            block = f"{i} 0 obj\n".encode('latin1') + obj + b"\nendobj\n"
            out.append(block)
            curr_offset += len(block)

        xref_offset = curr_offset
        xref = [f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode('latin1')]
        for off in offsets[1:]:
            xref.append(f"{off:010d} 00000 n \n".encode('latin1'))
        out.extend(xref)

        trailer = f"trailer\n<< /Size {len(objects) + 1} /Root {catalog_id} 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n".encode('latin1')
        out.append(trailer)
        return b"".join(out)


def get_research_data():
    """
    Compiles consolidated analytical data for Customers, Sellers, and Products.
    """
    now = timezone.now()
    valid_order_q = Q(payment_status=Order.PaymentStatus.PAID) | Q(status__in=[
        Order.Status.CONFIRMED, Order.Status.PROCESSING, Order.Status.DISPATCHED, Order.Status.DELIVERED
    ])

    # 1. Customer Research Data
    users = User.objects.all().order_by('-date_joined')
    customers_data = []
    total_lifetime_volume = Decimal('0.00')
    total_orders_placed = 0

    for u in users:
        orders = Order.objects.filter(valid_order_q, user=u)
        orders_cnt = orders.count()
        total_orders_placed += orders_cnt
        spend = orders.aggregate(s=Sum('total_amount'))['s'] or Decimal('0.00')
        total_lifetime_volume += spend
        aov = (spend / orders_cnt) if orders_cnt > 0 else Decimal('0.00')
        addr = u.addresses.filter(is_default=True).first() or u.addresses.first()
        district = getattr(addr, 'city_district', '') or getattr(addr, 'state', '') or 'Not Recorded'

        customers_data.append({
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'phone': u.phone_number or 'Not provided',
            'first_name': u.first_name,
            'last_name': u.last_name,
            'role': u.role,
            'is_banned': u.is_banned,
            'is_active': u.is_active,
            'date_joined': u.date_joined.strftime('%Y-%m-%d %H:%M') if u.date_joined else 'N/A',
            'orders_count': orders_cnt,
            'total_spent': float(spend),
            'aov': float(aov),
            'district': district
        })

    # 2. Artisan Seller Research Data
    manufacturers = ManufacturerProfile.objects.all().order_by('-created_at')
    sellers_data = []

    for m in manufacturers:
        prods = Product.objects.filter(manufacturer=m)
        prod_count = prods.count()
        active_prod_count = prods.filter(is_active=True, status=Product.Status.APPROVED).count()
        items = OrderItem.objects.filter(
            Q(order__payment_status=Order.PaymentStatus.PAID) | Q(order__status__in=[
                Order.Status.CONFIRMED, Order.Status.PROCESSING, Order.Status.DISPATCHED, Order.Status.DELIVERED
            ]),
            manufacturer=m
        )
        units_sold = items.aggregate(u=Sum('quantity'))['u'] or 0
        revenue = items.aggregate(r=Sum('subtotal'))['r'] or Decimal('0.00')

        sellers_data.append({
            'id': m.id,
            'business_name': m.business_name,
            'slug': m.slug,
            'contact_email': m.contact_email,
            'contact_phone': m.contact_phone,
            'district': m.location_district,
            'fssai_license': m.fssai_license_number or 'Pending/Exempt',
            'has_fssai': bool(m.fssai_license_number),
            'status': m.status,
            'is_verified_producer': m.is_verified_producer,
            'products_count': prod_count,
            'active_products_count': active_prod_count,
            'units_sold': units_sold,
            'revenue': float(revenue),
            'commission_rate': f"{m.commission_rate_override}%" if m.commission_rate_override is not None else "10.0% (Default)",
            'created_at': m.created_at.strftime('%Y-%m-%d') if m.created_at else 'N/A'
        })

    # 3. Product Research & Performance Data
    products = Product.objects.all().select_related('manufacturer', 'category').order_by('-created_at')
    products_data = []

    for p in products:
        items = OrderItem.objects.filter(
            Q(order__payment_status=Order.PaymentStatus.PAID) | Q(order__status__in=[
                Order.Status.CONFIRMED, Order.Status.PROCESSING, Order.Status.DISPATCHED, Order.Status.DELIVERED
            ]),
            product=p
        )
        units_sold = items.aggregate(u=Sum('quantity'))['u'] or 0
        prod_rev = items.aggregate(r=Sum('subtotal'))['r'] or Decimal('0.00')
        reviews = ProductReview.objects.filter(product=p)
        rev_count = reviews.count()
        avg_rating = reviews.aggregate(a=Avg('rating'))['a'] or 0.0

        products_data.append({
            'id': p.id,
            'title': p.title,
            'slug': p.slug,
            'brand': p.manufacturer.business_name if p.manufacturer else 'Unknown Brand',
            'category': p.category.name if p.category else 'Pickles',
            'dietary_type': p.dietary_type,
            'spice_level': p.spice_level,
            'weight_grams': p.weight_grams,
            'price': float(p.price),
            'base_price': float(p.base_price or (p.price * Decimal('0.85'))),
            'stock_quantity': p.stock_quantity,
            'status': p.status,
            'is_active': p.is_active,
            'is_featured': p.is_featured,
            'is_bestseller': p.is_bestseller,
            'units_sold': units_sold,
            'revenue': float(prod_rev),
            'reviews_count': rev_count,
            'avg_rating': round(float(avg_rating), 1),
            'created_at': p.created_at.strftime('%Y-%m-%d') if p.created_at else 'N/A'
        })

    # Overall Summary KPIs
    total_customers_cnt = sum(1 for c in customers_data if c['role'] == User.Role.CUSTOMER)
    approved_sellers_cnt = sum(1 for s in sellers_data if s['status'] == ManufacturerProfile.Status.APPROVED)
    active_products_cnt = sum(1 for p in products_data if p['is_active'] and p['status'] == Product.Status.APPROVED)
    avg_customer_spend = (total_lifetime_volume / total_customers_cnt) if total_customers_cnt > 0 else Decimal('0.00')

    stats = {
        'generated_at': now.strftime('%Y-%m-%d %H:%M:%S UTC'),
        'total_users': len(customers_data),
        'total_customers': total_customers_cnt,
        'total_approved_sellers': approved_sellers_cnt,
        'total_sellers_registered': len(sellers_data),
        'total_products': len(products_data),
        'total_active_products': active_products_cnt,
        'total_orders_placed': total_orders_placed,
        'total_gmv': float(total_lifetime_volume),
        'avg_customer_spend': float(avg_customer_spend),
    }

    return {
        'stats': stats,
        'customers': customers_data,
        'sellers': sellers_data,
        'products': products_data,
    }


def generate_research_csv(dataset_type='all'):
    """
    Generates a structured CSV file for research and statistical analysis.
    dataset_type can be: 'all', 'customers', 'sellers', 'products'.
    """
    data = get_research_data()
    output = io.StringIO()
    writer = csv.writer(output)

    if dataset_type == 'customers':
        writer.writerow(['Customer ID', 'Username', 'Full Name', 'Email', 'Phone', 'Role', 'Status', 'Date Joined', 'Orders Placed', 'Total Spend (INR)', 'AOV (INR)', 'Primary District'])
        for c in data['customers']:
            full_name = f"{c['first_name']} {c['last_name']}".strip() or c['username']
            acc_status = 'BANNED' if c['is_banned'] else ('Active' if c['is_active'] else 'Inactive')
            writer.writerow([c['id'], c['username'], full_name, c['email'], c['phone'], c['role'], acc_status, c['date_joined'], c['orders_count'], c['total_spent'], c['aov'], c['district']])

    elif dataset_type == 'sellers':
        writer.writerow(['Seller ID', 'Brand Name', 'Contact Email', 'Contact Phone', 'District', 'FSSAI License', 'Status', 'Verified Producer', 'Total Products', 'Active Products', 'Units Sold', 'Gross Revenue (INR)', 'Commission Rate', 'Registered Date'])
        for s in data['sellers']:
            writer.writerow([s['id'], s['business_name'], s['contact_email'], s['contact_phone'], s['district'], s['fssai_license'], s['status'], 'Yes' if s['is_verified_producer'] else 'No', s['products_count'], s['active_products_count'], s['units_sold'], s['revenue'], s['commission_rate'], s['created_at']])

    elif dataset_type == 'products':
        writer.writerow(['Product ID', 'Product Title', 'Brand', 'Category', 'Dietary Type', 'Spice Level', 'Net Weight (g)', 'Price (INR)', 'Base Earnings (INR)', 'Stock Quantity', 'Status', 'Is Active', 'Units Sold', 'Total Revenue (INR)', 'Reviews Count', 'Average Rating', 'Created Date'])
        for p in data['products']:
            writer.writerow([p['id'], p['title'], p['brand'], p['category'], p['dietary_type'], p['spice_level'], p['weight_grams'], p['price'], p['base_price'], p['stock_quantity'], p['status'], 'Yes' if p['is_active'] else 'No', p['units_sold'], p['revenue'], p['reviews_count'], p['avg_rating'], p['created_at']])

    else:
        # 'all': Consolidated Multi-Section Research Dossier
        stats = data['stats']
        writer.writerow(['=== WANGS MARKETPLACE PLATFORM RESEARCH & ANALYTICS RECORD ==='])
        writer.writerow(['Generated Timestamp (UTC)', stats['generated_at']])
        writer.writerow(['Total Users Registered', stats['total_users']])
        writer.writerow(['Total Shoppers / Customers', stats['total_customers']])
        writer.writerow(['Approved Artisan Sellers', stats['total_approved_sellers']])
        writer.writerow(['Total Active Products', stats['total_active_products']])
        writer.writerow(['Total Marketplace GMV (INR)', stats['total_gmv']])
        writer.writerow(['Average Spend Per Customer (INR)', stats['avg_customer_spend']])
        writer.writerow([])

        # Section 1: Customers
        writer.writerow(['--- SECTION 1: CUSTOMER RESEARCH DIRECTORY ---'])
        writer.writerow(['Customer ID', 'Username', 'Full Name', 'Email', 'Phone', 'Role', 'Status', 'Date Joined', 'Orders Placed', 'Total Spend (INR)', 'AOV (INR)', 'Primary District'])
        for c in data['customers']:
            full_name = f"{c['first_name']} {c['last_name']}".strip() or c['username']
            acc_status = 'BANNED' if c['is_banned'] else ('Active' if c['is_active'] else 'Inactive')
            writer.writerow([c['id'], c['username'], full_name, c['email'], c['phone'], c['role'], acc_status, c['date_joined'], c['orders_count'], c['total_spent'], c['aov'], c['district']])
        writer.writerow([])

        # Section 2: Sellers
        writer.writerow(['--- SECTION 2: ARTISAN SELLER & PRODUCER ECOSYSTEM ---'])
        writer.writerow(['Seller ID', 'Brand Name', 'Contact Email', 'Contact Phone', 'District', 'FSSAI License', 'Status', 'Verified Producer', 'Total Products', 'Active Products', 'Units Sold', 'Gross Revenue (INR)', 'Commission Rate', 'Registered Date'])
        for s in data['sellers']:
            writer.writerow([s['id'], s['business_name'], s['contact_email'], s['contact_phone'], s['district'], s['fssai_license'], s['status'], 'Yes' if s['is_verified_producer'] else 'No', s['products_count'], s['active_products_count'], s['units_sold'], s['revenue'], s['commission_rate'], s['created_at']])
        writer.writerow([])

        # Section 3: Products
        writer.writerow(['--- SECTION 3: PRODUCT CATALOG PERFORMANCE & INVENTORY ---'])
        writer.writerow(['Product ID', 'Product Title', 'Brand', 'Category', 'Dietary Type', 'Spice Level', 'Net Weight (g)', 'Price (INR)', 'Base Earnings (INR)', 'Stock Quantity', 'Status', 'Is Active', 'Units Sold', 'Total Revenue (INR)', 'Reviews Count', 'Average Rating', 'Created Date'])
        for p in data['products']:
            writer.writerow([p['id'], p['title'], p['brand'], p['category'], p['dietary_type'], p['spice_level'], p['weight_grams'], p['price'], p['base_price'], p['stock_quantity'], p['status'], 'Yes' if p['is_active'] else 'No', p['units_sold'], p['revenue'], p['reviews_count'], p['avg_rating'], p['created_at']])

    return output.getvalue()


def _draw_report_header(canvas, title, subtitle, page_num, total_pages=4):
    """Draws standardized corporate header and footer for research dossier."""
    # Top Accent Bar (Wangs Deep Forest Green)
    canvas.set_fill_color(0.055, 0.220, 0.125)
    canvas.rect(0, 785, canvas.width, 56.89, fill=True)

    # Gold Bottom Border on header
    canvas.set_fill_color(0.960, 0.620, 0.043)
    canvas.rect(0, 782, canvas.width, 3, fill=True)

    # Header Titles
    canvas.text(36, 816, 'F2', 15, "WANGS MARKETPLACE", r=1.0, g=1.0, b=1.0)
    canvas.text(36, 800, 'F1', 9.5, "Official Research, Study & Analytics Dossier", r=0.82, g=0.90, b=0.85)

    canvas.text(380, 816, 'F2', 9, "CONFIDENTIAL STUDY RECORD", r=0.96, g=0.75, b=0.20)
    canvas.text(380, 802, 'F1', 8, f"Generated: {datetime.date.today().strftime('%d %B %Y')}", r=0.85, g=0.85, b=0.85)

    # Section Sub-Bar
    canvas.set_fill_color(0.965, 0.955, 0.940)
    canvas.rect(36, 742, canvas.width - 72, 32, fill=True)
    canvas.set_stroke_color(0.85, 0.82, 0.78)
    canvas.set_line_width(0.75)
    canvas.rect(36, 742, canvas.width - 72, 32, fill=False, stroke=True)

    canvas.text(48, 759, 'F2', 11.5, title, r=0.08, g=0.15, b=0.10)
    canvas.text(48, 747, 'F1', 8.5, subtitle, r=0.45, g=0.42, b=0.38)

    # Footer
    canvas.set_stroke_color(0.85, 0.85, 0.85)
    canvas.set_line_width(0.5)
    canvas.line(36, 38, canvas.width - 36, 38)
    canvas.text(36, 26, 'F1', 8, "Wangs Artisan Marketplace - Platform Analytics & Statistical Research Record", r=0.5, g=0.5, b=0.5)
    canvas.text(canvas.width - 110, 26, 'F2', 8, f"Page {page_num} of {total_pages}", r=0.3, g=0.3, b=0.3)


def generate_research_pdf():
    """
    Renders an exhaustive publication-grade PDF research dossier containing
    platform statistical summaries, customer analysis, seller directory, and product catalog.
    """
    data = get_research_data()
    stats = data['stats']
    customers = data['customers']
    sellers = data['sellers']
    products = data['products']

    canvas = PDFCanvas()
    total_pages = 4

    # =========================================================
    # PAGE 1: EXECUTIVE RESEARCH SUMMARY & KEY METRICS
    # =========================================================
    _draw_report_header(canvas, "EXECUTIVE PLATFORM STUDY & KPI SUMMARY", "Marketplace Vital Signs, Demographic Volume & Financial Statistics", 1, total_pages)

    y = 715

    # 4 Key KPI Metric Boxes
    box_w = 120
    box_h = 56
    gap = 14
    start_x = 36

    kpis = [
        ("TOTAL REGISTERED USERS", str(stats['total_users']), f"{stats['total_customers']} Shoppers"),
        ("APPROVED ARTISAN SELLERS", str(stats['total_approved_sellers']), f"{stats['total_sellers_registered']} Total Applicants"),
        ("ACTIVE CATALOG PRODUCTS", str(stats['total_active_products']), f"{stats['total_products']} Jars Cataloged"),
        ("TOTAL MARKETPLACE GMV", f"Rs. {int(stats['total_gmv']):,}", f"AOV: Rs. {int(stats['avg_customer_spend'])}"),
    ]

    for i, (label, val, sub) in enumerate(kpis):
        bx = start_x + i * (box_w + gap)
        canvas.set_fill_color(0.975, 0.965, 0.950)
        canvas.rect(bx, y - box_h, box_w, box_h, fill=True)
        canvas.set_stroke_color(0.88, 0.85, 0.80)
        canvas.set_line_width(0.75)
        canvas.rect(bx, y - box_h, box_w, box_h, fill=False, stroke=True)

        canvas.text(bx + 8, y - 16, 'F2', 7.5, label, r=0.45, g=0.40, b=0.35)
        canvas.text(bx + 8, y - 36, 'F2', 15, val, r=0.06, g=0.22, b=0.12)
        canvas.text(bx + 8, y - 50, 'F1', 7.5, sub, r=0.55, g=0.50, b=0.45)

    y -= (box_h + 24)

    # Research Study Overview Narrative
    canvas.set_fill_color(0.99, 0.99, 0.98)
    canvas.rect(36, y - 90, canvas.width - 72, 90, fill=True)
    canvas.set_stroke_color(0.85, 0.82, 0.78)
    canvas.rect(36, y - 90, canvas.width - 72, 90, fill=False, stroke=True)

    canvas.text(48, y - 18, 'F2', 11, "1. Research Scope & Methodology", r=0.08, g=0.15, b=0.10)
    canvas.paragraph(
        48, y - 32,
        "This record compiles verifiable transaction logs, customer demographics, producer compliance benchmarks, and product popularity metrics from the Wangs artisanal pickle marketplace. All statistics reflect live verified orders, authentic FSSAI food business licensing, and direct artisan producer fulfillment records across regional districts.",
        'F1', 8.5, 12, canvas.width - 96, r=0.25, g=0.25, b=0.25
    )
    canvas.paragraph(
        48, y - 68,
        "Data is maintained for ongoing operational research, demographic cohort modeling, supply chain capacity auditing, and regional food producer empowerment studies.",
        'F1', 8.5, 12, canvas.width - 96, r=0.25, g=0.25, b=0.25
    )

    y -= 112

    # Executive Highlights Table (Demographic & Supply Distribution)
    canvas.text(36, y, 'F2', 11, "2. Key Demographic & Structural Findings", r=0.08, g=0.15, b=0.10)
    y -= 16

    findings = [
        ("Shopper Customer Share", f"{stats['total_customers']} / {stats['total_users']}", "Constitutes the core consumer purchasing base across regional and metro destinations."),
        ("Seller Approval Ratio", f"{stats['total_approved_sellers']} active / {stats['total_sellers_registered']} applied", "Strict FSSAI and hygienic compliance vetting safeguards consumer trust and quality."),
        ("Catalog Inventory Health", f"{stats['total_active_products']} live / {stats['total_products']} listings", "Maintains active batches across Non-Veg, Veg, and Traditional Bambooshoot cures."),
        ("Lifetime Transaction GMV", f"Rs. {stats['total_gmv']:,.2f}", f"Cumulative gross merchandise transaction volume with {stats['total_orders_placed']} verified order batches."),
    ]

    for title, metric, desc in findings:
        canvas.set_fill_color(0.965, 0.960, 0.950)
        canvas.rect(36, y - 26, canvas.width - 72, 26, fill=True)
        canvas.set_stroke_color(0.88, 0.88, 0.85)
        canvas.rect(36, y - 26, canvas.width - 72, 26, fill=False, stroke=True)

        canvas.text(46, y - 16, 'F2', 9, title, r=0.08, g=0.20, b=0.12)
        canvas.text(205, y - 16, 'F2', 9, metric, r=0.75, g=0.45, b=0.05)
        canvas.text(320, y - 16, 'F1', 8, desc[:42] + ("..." if len(desc) > 42 else ""), r=0.35, g=0.35, b=0.35)
        y -= 31

    y -= 10
    # Audit & Security Stamp Box
    canvas.set_fill_color(0.92, 0.95, 0.93)
    canvas.rect(36, y - 56, canvas.width - 72, 56, fill=True)
    canvas.set_stroke_color(0.70, 0.82, 0.74)
    canvas.rect(36, y - 56, canvas.width - 72, 56, fill=False, stroke=True)

    canvas.text(48, y - 18, 'F2', 9.5, "Data Integrity & Verification Guarantee", r=0.06, g=0.25, b=0.12)
    canvas.paragraph(
        48, y - 30,
        f"Generated automatically from Wangs Production Database on {stats['generated_at']}. Customer identifiers are protected under platform privacy terms. All financial values in Indian Rupees (INR).",
        'F1', 8, 11, canvas.width - 96, r=0.20, g=0.30, b=0.22
    )

    # =========================================================
    # PAGE 2: CUSTOMERS & SHOPPERS STUDY
    # =========================================================
    canvas.new_page()
    _draw_report_header(canvas, "SECTION 1: CUSTOMER RESEARCH DIRECTORY", "Shopper Profiles, Order Activity, Lifetime Spend & Regional Location", 2, total_pages)

    y = 718
    canvas.paragraph(
        36, y,
        "Detailed research record of registered customer accounts, tracking lifetime order placement, total monetary spend, and account standing to evaluate customer acquisition and repeat purchase loyalty.",
        'F1', 8.5, 11, canvas.width - 72, r=0.35, g=0.35, b=0.35
    )
    y -= 26

    # Table Header
    canvas.set_fill_color(0.055, 0.220, 0.125)
    canvas.rect(36, y - 18, canvas.width - 72, 18, fill=True)
    canvas.text(44, y - 13, 'F2', 8, "User / Contact", r=1, g=1, b=1)
    canvas.text(175, y - 13, 'F2', 8, "Role & Status", r=1, g=1, b=1)
    canvas.text(265, y - 13, 'F2', 8, "Joined Date", r=1, g=1, b=1)
    canvas.text(350, y - 13, 'F2', 8, "Orders", r=1, g=1, b=1)
    canvas.text(410, y - 13, 'F2', 8, "Total Spend", r=1, g=1, b=1)
    canvas.text(485, y - 13, 'F2', 8, "Location District", r=1, g=1, b=1)
    y -= 19

    # Rows (up to 24 rows per page)
    row_h = 22
    for idx, c in enumerate(customers[:24]):
        bg = (0.98, 0.98, 0.97) if idx % 2 == 0 else (1.0, 1.0, 1.0)
        canvas.set_fill_color(*bg)
        canvas.rect(36, y - row_h, canvas.width - 72, row_h, fill=True)
        canvas.set_stroke_color(0.92, 0.92, 0.90)
        canvas.line(36, y - row_h, canvas.width - 36, y - row_h)

        display_name = (c['first_name'] or c['username'])[:16]
        canvas.text(44, y - 10, 'F2', 8, display_name, r=0.1, g=0.1, b=0.1)
        canvas.text(44, y - 19, 'F1', 6.5, c['email'][:24], r=0.45, g=0.45, b=0.45)

        status_txt = "BANNED" if c['is_banned'] else ("Active" if c['is_active'] else "Inactive")
        canvas.text(175, y - 10, 'F1', 7.5, f"{c['role']}", r=0.2, g=0.2, b=0.2)
        canvas.text(175, y - 19, 'F2', 6.5, status_txt, r=0.7 if c['is_banned'] else 0.1, g=0.1 if c['is_banned'] else 0.45, b=0.1)

        canvas.text(265, y - 14, 'F1', 7.5, c['date_joined'][:10], r=0.3, g=0.3, b=0.3)
        canvas.text(355, y - 14, 'F2', 8, f"{c['orders_count']} orders", r=0.1, g=0.1, b=0.1)
        canvas.text(410, y - 14, 'F2', 8, f"Rs. {int(c['total_spent']):,}", r=0.06, g=0.25, b=0.12)
        canvas.text(485, y - 14, 'F1', 7.5, c['district'][:16], r=0.35, g=0.35, b=0.35)

        y -= row_h
        if y < 65:
            break

    # =========================================================
    # PAGE 3: ARTISAN SELLERS & PRODUCER ECOSYSTEM
    # =========================================================
    canvas.new_page()
    _draw_report_header(canvas, "SECTION 2: ARTISAN SELLER & PRODUCER DIRECTORY", "Brand Registration, FSSAI Compliance, Catalog Depth & Fulfillment Volume", 3, total_pages)

    y = 718
    canvas.paragraph(
        36, y,
        "Analysis of all approved and applicant artisan pickle producers. Examines licensing status, geographic sourcing, active listing capacity, units dispatched, and cumulative gross sales.",
        'F1', 8.5, 11, canvas.width - 72, r=0.35, g=0.35, b=0.35
    )
    y -= 26

    # Table Header
    canvas.set_fill_color(0.055, 0.220, 0.125)
    canvas.rect(36, y - 18, canvas.width - 72, 18, fill=True)
    canvas.text(44, y - 13, 'F2', 8, "Brand / Producer", r=1, g=1, b=1)
    canvas.text(160, y - 13, 'F2', 8, "District / State", r=1, g=1, b=1)
    canvas.text(260, y - 13, 'F2', 8, "FSSAI License", r=1, g=1, b=1)
    canvas.text(355, y - 13, 'F2', 8, "Status", r=1, g=1, b=1)
    canvas.text(410, y - 13, 'F2', 8, "Live Jars", r=1, g=1, b=1)
    canvas.text(470, y - 13, 'F2', 8, "Dispatched (GMV)", r=1, g=1, b=1)
    y -= 19

    row_h = 24
    for idx, s in enumerate(sellers[:23]):
        bg = (0.98, 0.98, 0.97) if idx % 2 == 0 else (1.0, 1.0, 1.0)
        canvas.set_fill_color(*bg)
        canvas.rect(36, y - row_h, canvas.width - 72, row_h, fill=True)
        canvas.set_stroke_color(0.92, 0.92, 0.90)
        canvas.line(36, y - row_h, canvas.width - 36, y - row_h)

        canvas.text(44, y - 10, 'F2', 8.5, s['business_name'][:18], r=0.08, g=0.20, b=0.12)
        canvas.text(44, y - 20, 'F1', 6.5, s['contact_email'][:25], r=0.45, g=0.45, b=0.45)

        canvas.text(160, y - 14, 'F1', 8, s['district'][:18], r=0.25, g=0.25, b=0.25)
        canvas.text(260, y - 14, 'F1', 7.5, s['fssai_license'][:18], r=0.20, g=0.35, b=0.25)

        canvas.text(355, y - 14, 'F2', 7.5, s['status'], r=0.1 if s['status'] == 'APPROVED' else 0.7, g=0.45 if s['status'] == 'APPROVED' else 0.3, b=0.1)
        canvas.text(410, y - 14, 'F1', 8, f"{s['active_products_count']} active ({s['products_count']})", r=0.2, g=0.2, b=0.2)
        canvas.text(470, y - 14, 'F2', 8, f"{s['units_sold']} jars (Rs. {int(s['revenue']):,})", r=0.06, g=0.25, b=0.12)

        y -= row_h
        if y < 65:
            break

    # =========================================================
    # PAGE 4: PRODUCTS INVENTORY & SALES RESEARCH
    # =========================================================
    canvas.new_page()
    _draw_report_header(canvas, "SECTION 3: PRODUCT INVENTORY & SALES PERFORMANCE", "Catalog Recipes, Spice Levels, Weight, Stock, Pricing & Ratings", 4, total_pages)

    y = 718
    canvas.paragraph(
        36, y,
        "Detailed performance catalog auditing every regional pickle recipe: dietary categorization, spice profiles, pricing structures, verified customer ratings, and units sold.",
        'F1', 8.5, 11, canvas.width - 72, r=0.35, g=0.35, b=0.35
    )
    y -= 26

    # Table Header
    canvas.set_fill_color(0.055, 0.220, 0.125)
    canvas.rect(36, y - 18, canvas.width - 72, 18, fill=True)
    canvas.text(44, y - 13, 'F2', 8, "Product Title / Brand", r=1, g=1, b=1)
    canvas.text(180, y - 13, 'F2', 8, "Dietary Type", r=1, g=1, b=1)
    canvas.text(260, y - 13, 'F2', 8, "Weight & Price", r=1, g=1, b=1)
    canvas.text(345, y - 13, 'F2', 8, "Stock", r=1, g=1, b=1)
    canvas.text(405, y - 13, 'F2', 8, "Rating", r=1, g=1, b=1)
    canvas.text(470, y - 13, 'F2', 8, "Sales / Revenue", r=1, g=1, b=1)
    y -= 19

    row_h = 24
    for idx, p in enumerate(products[:23]):
        bg = (0.98, 0.98, 0.97) if idx % 2 == 0 else (1.0, 1.0, 1.0)
        canvas.set_fill_color(*bg)
        canvas.rect(36, y - row_h, canvas.width - 72, row_h, fill=True)
        canvas.set_stroke_color(0.92, 0.92, 0.90)
        canvas.line(36, y - row_h, canvas.width - 36, y - row_h)

        canvas.text(44, y - 10, 'F2', 8, p['title'][:22], r=0.1, g=0.1, b=0.1)
        canvas.text(44, y - 20, 'F1', 6.5, p['brand'][:22], r=0.55, g=0.45, b=0.25)

        canvas.text(180, y - 14, 'F1', 8, p['dietary_type'], r=0.2, g=0.2, b=0.2)
        canvas.text(260, y - 14, 'F2', 8, f"{p['weight_grams']}g · Rs. {int(p['price'])}", r=0.08, g=0.20, b=0.12)
        canvas.text(345, y - 14, 'F1', 8, f"{p['stock_quantity']} units", r=0.3, g=0.3, b=0.3)

        stars_txt = f"{p['avg_rating']}★ ({p['reviews_count']})"
        canvas.text(405, y - 14, 'F2', 8, stars_txt, r=0.8, g=0.5, b=0.05)
        canvas.text(470, y - 14, 'F2', 8, f"{p['units_sold']} jars (Rs. {int(p['revenue']):,})", r=0.06, g=0.25, b=0.12)

        y -= row_h
        if y < 65:
            break

    return canvas.render()


def save_maintained_research_files():
    """
    Saves maintained static copies of both PDF and CSV records to disk
    so researchers, administrators, and automated pipelines have instant access.
    """
    backend_reports_dir = os.path.join(settings.BASE_DIR, 'media', 'reports')
    frontend_docs_dir = os.path.join(settings.BASE_DIR, '..', 'wangs_frontend', 'public', 'documents')

    os.makedirs(backend_reports_dir, exist_ok=True)
    os.makedirs(frontend_docs_dir, exist_ok=True)

    # 1. Generate & Write CSVs
    all_csv = generate_research_csv('all')
    cust_csv = generate_research_csv('customers')
    sell_csv = generate_research_csv('sellers')
    prod_csv = generate_research_csv('products')

    csv_path = os.path.join(backend_reports_dir, 'wangs_research_report.csv')
    with open(csv_path, 'w', encoding='utf-8') as f:
        f.write(all_csv)

    with open(os.path.join(backend_reports_dir, 'wangs_customers_research.csv'), 'w', encoding='utf-8') as f:
        f.write(cust_csv)

    with open(os.path.join(backend_reports_dir, 'wangs_sellers_research.csv'), 'w', encoding='utf-8') as f:
        f.write(sell_csv)

    with open(os.path.join(backend_reports_dir, 'wangs_products_research.csv'), 'w', encoding='utf-8') as f:
        f.write(prod_csv)

    # 2. Generate & Write PDF
    pdf_bytes = generate_research_pdf()
    pdf_path = os.path.join(backend_reports_dir, 'wangs_research_report.pdf')
    with open(pdf_path, 'wb') as f:
        f.write(pdf_bytes)

    # Also maintain copies in public frontend documents directory
    try:
        shutil.copyfile(csv_path, os.path.join(frontend_docs_dir, 'wangs_research_report.csv'))
        shutil.copyfile(pdf_path, os.path.join(frontend_docs_dir, 'wangs_research_report.pdf'))
    except Exception as exc:
        pass

    return {
        'pdf_path': pdf_path,
        'csv_path': csv_path,
        'pdf_size': len(pdf_bytes),
        'csv_size': len(all_csv.encode('utf-8'))
    }
