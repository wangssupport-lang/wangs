import os
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.conf import settings

class PDFCanvas:
    """
    Lightweight, dependency-free PDF 1.4 canvas engine for generating
    publication-grade vector PDF documents.
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
        # Clean unicode characters to standard ASCII for standard Type 1 fonts
        cleaned = (
            str(text)
            .replace('•', '-')
            .replace('·', '|')
            .replace('–', '-')
            .replace('—', '-')
            .replace('’', "'")
            .replace('‘', "'")
            .replace('“', '"')
            .replace('”', '"')
        )
        return cleaned.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')

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
        f1_id = 3 # Helvetica
        f2_id = 4 # Helvetica-Bold
        f3_id = 5 # Helvetica-Oblique

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

        # Build output and xref table
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


def draw_page_chrome(canvas, page_num, total_pages=3):
    # Top brand bar: Wangs Forest Green
    canvas.set_fill_color(0.086, 0.220, 0.173) # #16382c
    canvas.rect(0, 818, 595.28, 24, fill=True, stroke=False)
    
    # Gold accent line
    canvas.set_fill_color(0.851, 0.467, 0.024) # #d97706
    canvas.rect(0, 815, 595.28, 3, fill=True, stroke=False)

    # Top small running header
    canvas.text(45, 825, 'F2', 8.5, "WANGS ARTISAN MARKETPLACE · OFFICIAL SELLER POLICY HANDBOOK", 1.0, 1.0, 1.0)
    canvas.text(430, 825, 'F1', 8.5, "DOCUMENT REF: WNG-SELLER-2026-V2", 0.9, 0.85, 0.7)

    # Bottom footer line
    canvas.set_stroke_color(0.85, 0.85, 0.85)
    canvas.set_line_width(0.75)
    canvas.line(45, 42, 550, 42)

    # Bottom footer text
    canvas.text(45, 30, 'F1', 8, "Official Wangs Platform Guidelines · Strictly Confidential · Support: wangssupport@gmail.com", 0.4, 0.4, 0.4)
    canvas.text(485, 30, 'F2', 8, f"Page {page_num} of {total_pages}", 0.1, 0.1, 0.1)


def generate_seller_rules_pdf():
    canvas = PDFCanvas()

    # ==========================================
    # PAGE 1: TITLE & BRAND BUNDLE OPERATING RULE
    # ==========================================
    draw_page_chrome(canvas, 1, 3)

    # Header Card
    canvas.set_fill_color(0.97, 0.965, 0.95)
    canvas.set_stroke_color(0.85, 0.80, 0.75)
    canvas.set_line_width(1)
    canvas.rect(45, 715, 505, 85, fill=True, stroke=True)

    canvas.text(60, 775, 'F2', 17, "Artisan Seller Policy & Compliance Handbook", 0.086, 0.220, 0.173)
    canvas.text(60, 757, 'F1', 10.5, "Standard Operating Procedures, Multi-Jar Bundles, Packaging & Regulatory SLAs", 0.35, 0.35, 0.35)
    canvas.text(60, 730, 'F2', 8.5, "APPLICABLE TO: All Verified Regional Food Producers & Handcrafted Pickle Brands", 0.851, 0.467, 0.024)
    canvas.text(370, 730, 'F1', 8.5, "Effective Date: October 2026 | Platform Edition", 0.4, 0.4, 0.4)

    y = 690

    # Section 1: Executive Mission
    canvas.text(45, y, 'F2', 12, "1. Marketplace Mission & Seller Partnership Principles", 0.086, 0.220, 0.173)
    canvas.line(45, y - 4, 550, y - 4)
    y -= 18

    p1 = (
        "Wangs is an authentic regional culinary marketplace dedicated to preserving indigenous recipe "
        "heritage and empowering regional pickle producers. As an approved artisan seller on Wangs, you "
        "operate a digital storefront connecting directly to consumers across India. All sellers agree to "
        "adhere strictly to our food safety, packaging integrity, and customer discount rules detailed herein."
    )
    y = canvas.paragraph(45, y, p1, 'F1', 9.5, 13.5, 505, 0.2, 0.2, 0.2)
    y -= 12

    # Section 2: BRAND BUNDLE POLICY (KEY USER RULE)
    canvas.text(45, y, 'F2', 12, "2. Flexible Brand Bundle Program (2 to 4 Items · Flat 10% Discount Rule)", 0.086, 0.220, 0.173)
    canvas.line(45, y - 4, 550, y - 4)
    y -= 16

    # Callout Box for the 10% Bundle Rule
    box_h = 135
    canvas.set_fill_color(0.99, 0.97, 0.92) # Soft amber tint
    canvas.set_stroke_color(0.92, 0.75, 0.40) # Amber border
    canvas.set_line_width(1.2)
    canvas.rect(45, y - box_h, 505, box_h, fill=True, stroke=True)

    by = y - 18
    canvas.text(60, by, 'F2', 11, "MANDATORY STOREFRONT RULE: 2-4 ITEMS PER BUNDLE (10% SAVINGS)", 0.60, 0.10, 0.10)
    by -= 16

    rule_bullets = [
        ("Same Brand Only:", "Bundles are formed exclusively from items belonging to your brand catalog. Cross-brand mixing is not permitted in brand bundles."),
        ("Flexible 2 to 4 Jars Limit:", "Customers have full flexibility to cut (remove) or add recipes from your brand. The bundle size is strictly bounded between a minimum of 2 jars and a maximum of 4 jars."),
        ("Flat 10% Bundle Discount:", "When a customer selects between 2 and 4 items from your brand, an automated 10% discount is applied across the combined subtotal at checkout."),
        ("Catalog Depth Requirement:", "Sellers are strongly advised to keep at least 2 to 4 complementary recipes active in stock so customers can enjoy full bundle customization."),
        ("Packaging Incentive:", "All 2-4 jar bundles automatically qualify for priority cushioned packaging and subsidized nationwide express air cargo dispatch.")
    ]

    for title, desc in rule_bullets:
        canvas.text(65, by, 'F2', 9, "• " + title, 0.1, 0.1, 0.1)
        w_title = len("• " + title) * 5.2
        canvas.text(65 + w_title + 4, by, 'F1', 9, desc, 0.25, 0.25, 0.25)
        by -= 14

    y -= (box_h + 16)

    # Bundle Economics Example Table
    canvas.text(45, y, 'F2', 10, "Brand Bundle Customer Economics Matrix (Example Breakdown):", 0.086, 0.220, 0.173)
    y -= 12

    # Table Header
    canvas.set_fill_color(0.086, 0.220, 0.173)
    canvas.rect(45, y - 16, 505, 18, fill=True, stroke=False)
    canvas.text(55, y - 12, 'F2', 8.5, "Bundle Configuration", 1, 1, 1)
    canvas.text(175, y - 12, 'F2', 8.5, "Eligible Selection", 1, 1, 1)
    canvas.text(285, y - 12, 'F2', 8.5, "Customer Discount", 1, 1, 1)
    canvas.text(395, y - 12, 'F2', 8.5, "Producer Benefit", 1, 1, 1)
    y -= 18

    # Table Rows
    rows = [
        ("Duo Bundle (2 Jars)", "Any 2 recipes from same brand", "Flat 10% OFF Subtotal", "Doubles average order volume"),
        ("Tasting Trio (3 Jars)", "Any 3 recipes from same brand", "Flat 10% OFF Subtotal", "Triples recipe discovery"),
        ("Family Pack (4 Jars - Max)", "Any 4 recipes from same brand", "Flat 10% OFF Subtotal", "Maximum basket size & repeat loyalty"),
        ("Single Jar (1 Jar)", "Individual jar purchase", "0% (Full Margin)", "Standard retail margin baseline")
    ]

    for idx, (col1, col2, col3, col4) in enumerate(rows):
        bg = (0.97, 0.97, 0.97) if idx % 2 == 0 else (1.0, 1.0, 1.0)
        canvas.set_fill_color(*bg)
        canvas.rect(45, y - 14, 505, 16, fill=True, stroke=False)
        canvas.text(55, y - 10, 'F2' if idx == 0 or idx == 1 or idx == 2 else 'F1', 8, col1, 0.1, 0.1, 0.1)
        canvas.text(175, y - 10, 'F1', 8, col2, 0.2, 0.2, 0.2)
        canvas.text(285, y - 10, 'F2', 8, col3, 0.6, 0.1, 0.1 if "10%" in col3 else 0.2)
        canvas.text(395, y - 10, 'F1', 8, col4, 0.1, 0.35, 0.15)
        y -= 16

    y -= 10
    canvas.text(45, y, 'F3', 8, "* Note: Bundle discount is restricted strictly to 2-4 items. Single jars do not qualify for bundle discount.", 0.45, 0.45, 0.45)

    # ==========================================
    # PAGE 2: COMPLIANCE, QUALITY & PACKAGING
    # ==========================================
    canvas.new_page()
    draw_page_chrome(canvas, 2, 3)

    y = 790

    # Section 3: Recipe Authenticity
    canvas.text(45, y, 'F2', 12, "3. Recipe Authenticity & Product Listing Standards", 0.086, 0.220, 0.173)
    canvas.line(45, y - 4, 550, y - 4)
    y -= 18

    p3 = (
        "Every batch listed on Wangs must celebrate authentic culinary traditions. Sellers must maintain "
        "full ingredient traceability, natural cold-pressed oils, and traditional fermentation methods. "
        "Synthetic chemical preservatives (such as sodium benzoate in excess of permissible limits) and "
        "artificial food dyes are strictly prohibited. Product listings must accurately reflect ingredients, "
        "spice levels, and dietary attributes (e.g. Vegetarian, Non-Vegetarian pork/chicken/beef/bamboo shoot)."
    )
    y = canvas.paragraph(45, y, p3, 'F1', 9.5, 13.5, 505, 0.2, 0.2, 0.2)
    y -= 14

    # Section 4: FSSAI Food Licensing Compliance
    canvas.text(45, y, 'F2', 12, "4. Mandatory FSSAI Food Safety Registration & Licensing", 0.086, 0.220, 0.173)
    canvas.line(45, y - 4, 550, y - 4)
    y -= 18

    p4_1 = (
        "In strict compliance with the Food Safety and Standards Authority of India (FSSAI) Act, all active "
        "sellers on Wangs must possess a verified 14-digit FSSAI License or Registration Number. Sellers are "
        "required to:"
    )
    y = canvas.paragraph(45, y, p4_1, 'F1', 9.5, 13.5, 505, 0.2, 0.2, 0.2)
    y -= 8

    fssai_points = [
        "Maintain active, unexpired FSSAI registration throughout the listing lifecycle.",
        "Print the official 14-digit FSSAI registration number and logo prominently on every product jar label.",
        "Provide clear batch numbers, manufacturing dates, and Best-Before dates (minimum 6 months shelf life).",
        "Disclose mandatory allergen advisories (mustard seeds, crustacean prawn, soy, or fish extracts)."
    ]
    for pt in fssai_points:
        canvas.text(55, y, 'F2', 9, "•", 0.086, 0.220, 0.173)
        canvas.text(68, y, 'F1', 9, pt, 0.2, 0.2, 0.2)
        y -= 14
    y -= 10

    # Section 5: Glass Packaging & Air Cargo Dispatch Guidelines
    canvas.text(45, y, 'F2', 12, "5. Insulated Glass Packaging & Shock-Proof Logistics SLAs", 0.086, 0.220, 0.173)
    canvas.line(45, y - 4, 550, y - 4)
    y -= 18

    p5 = (
        "Because Wangs ships handcrafted glass pickle jars nationwide via express air cargo, package integrity "
        "is critical to eliminate transit breakage and oil leakage. Sellers must adhere to the following dispatch standards:"
    )
    y = canvas.paragraph(45, y, p5, 'F1', 9.5, 13.5, 505, 0.2, 0.2, 0.2)
    y -= 10

    # Packaging Specifications Card
    canvas.set_fill_color(0.96, 0.98, 0.96)
    canvas.set_stroke_color(0.70, 0.85, 0.70)
    canvas.set_line_width(1)
    canvas.rect(45, y - 110, 505, 110, fill=True, stroke=True)

    py = y - 16
    canvas.text(60, py, 'F2', 10, "GLASS JAR PACKAGING & DISPATCH REQUIREMENTS", 0.086, 0.220, 0.173)
    py -= 16

    pack_specs = [
        ("Induction / Foil Sealing:", "Every glass jar must feature an airtight induction foil seal or shrink-wrapped neck cap to prevent oil seepage under cargo air pressure changes."),
        ("Multi-Layer Cushioning:", "Wrap individual jars in minimum 3 layers of 10mm bubble wrap or honeycomb paper cushioning prior to boxing."),
        ("Multi-Jar Divider Cartons:", "Bundles of 2 to 4 jars must utilize corrugated divider inserts separating each jar by at least 15mm of cushioned barrier."),
        ("Fulfillment SLA (24-48 Hours):", "Orders must be packaged, labeled with Wangs cargo slips, and ready for courier pickup within 24-48 business hours of order placement.")
    ]

    for title, desc in pack_specs:
        canvas.text(65, py, 'F2', 8.5, "• " + title, 0.1, 0.1, 0.1)
        w_title = len("• " + title) * 5.0
        canvas.text(65 + w_title + 4, py, 'F1', 8.5, desc, 0.25, 0.25, 0.25)
        py -= 14

    y -= 124

    # ==========================================
    # PAGE 3: COMMERCIAL TERMS, SETTLEMENTS & SUPPORT
    # ==========================================
    canvas.new_page()
    draw_page_chrome(canvas, 3, 3)

    y = 790

    # Section 6: Commercial Structure & Commission
    canvas.text(45, y, 'F2', 12, "6. Platform Commercials, Commission & Net Payouts", 0.086, 0.220, 0.173)
    canvas.line(45, y - 4, 550, y - 4)
    y -= 18

    p6 = (
        "Wangs maintains a transparent, predictable fee structure designed to protect regional producer margins. "
        "There are no listing fees or upfront store maintenance charges."
    )
    y = canvas.paragraph(45, y, p6, 'F1', 9.5, 13.5, 505, 0.2, 0.2, 0.2)
    y -= 8

    comm_points = [
        ("Platform Commission:", "A standard 10% commission is calculated automatically on retail line items at order snapshot."),
        ("Base Price Guarantee:", "The seller's listed base product price payout is protected and accounted for in the producer settlement ledger."),
        ("Customer Discounts:", "The 10% Brand Bundle discount is shared under the platform promotional structure, incentivizing 2x to 4x basket unit volume."),
        ("Logistics Integration:", "Nationwide delivery logistics, customer transit tracking, and SMS/Email order notifications are managed centrally by Wangs.")
    ]
    for title, desc in comm_points:
        canvas.text(55, y, 'F2', 9, "• " + title, 0.086, 0.220, 0.173)
        w_title = len("• " + title) * 5.2
        canvas.text(55 + w_title + 4, y, 'F1', 9, desc, 0.2, 0.2, 0.2)
        y -= 14
    y -= 10

    # Section 7: Weekly Bank Settlements
    canvas.text(45, y, 'F2', 12, "7. Weekly Bank Settlements & Payout Schedules", 0.086, 0.220, 0.173)
    canvas.line(45, y - 4, 550, y - 4)
    y -= 18

    p7 = (
        "Producer earnings are settled weekly via Automated Clearing House (NEFT/RTGS) bank transfer directly "
        "to your verified business bank account. Settlements include all orders successfully fulfilled during "
        "the previous settlement cycle. Sellers can monitor accrued balances, commission deductions, and download "
        "tax invoices in the Seller Portal at any time."
    )
    y = canvas.paragraph(45, y, p7, 'F1', 9.5, 13.5, 505, 0.2, 0.2, 0.2)
    y -= 14

    # Section 8: Quality Audits & Seal Protection
    canvas.text(45, y, 'F2', 12, "8. Quality Audits, Breakage & Customer Return Policies", 0.086, 0.220, 0.173)
    canvas.line(45, y - 4, 550, y - 4)
    y -= 18

    p8 = (
        "Due to the perishable and artisanal nature of food products, Wangs enforces a strict no-return policy "
        "for customer preference. However, in cases of transit leakage verified via photographic evidence within "
        "24 hours of delivery, the platform initiates replacement or refund. Sellers with transit breakage rates "
        "exceeding 2% are required to undergo packaging re-certification."
    )
    y = canvas.paragraph(45, y, p8, 'F1', 9.5, 13.5, 505, 0.2, 0.2, 0.2)
    y -= 16

    # Section 9: Official Seller Support & Signoff Box
    canvas.set_fill_color(0.97, 0.965, 0.95)
    canvas.set_stroke_color(0.85, 0.80, 0.75)
    canvas.set_line_width(1)
    canvas.rect(45, y - 110, 505, 110, fill=True, stroke=True)

    sy = y - 18
    canvas.text(60, sy, 'F2', 10.5, "OFFICIAL SELLER SUPPORT & PLATFORM ASSISTANCE", 0.086, 0.220, 0.173)
    sy -= 16

    support_items = [
        ("Seller Care Email:", "wangssupport@gmail.com (Dedicated Priority Seller Desk)"),
        ("Seller Operations Portal:", "https://wangs.in/manufacturer (Catalog, Bundles & Payouts)"),
        ("Dispatch Hours:", "Monday through Saturday · 09:00 AM to 06:00 PM IST")
    ]

    for title, desc in support_items:
        canvas.text(65, sy, 'F2', 8.5, title, 0.1, 0.1, 0.1)
        w_title = len(title) * 5.0
        canvas.text(65 + w_title + 6, sy, 'F1', 8.5, desc, 0.25, 0.25, 0.25)
        sy -= 14

    sy -= 4
    canvas.text(65, sy, 'F2', 8, "VERIFICATION & ENDORSEMENT: Wangs Food Safety & Artisan Merchant Operations Directorate", 0.851, 0.467, 0.024)

    return canvas.render()


class Command(BaseCommand):
    help = 'Generates the official Wangs Artisan Seller Operating & Brand Bundle Rules PDF handbook'

    def handle(self, *args, **options):
        self.stdout.write('Generating Wangs Artisan Seller Rules PDF...')
        pdf_bytes = generate_seller_rules_pdf()

        # Destination 1: Frontend public documents directory (served directly by Vite)
        frontend_dir = os.path.join(settings.BASE_DIR, '..', 'wangs_frontend', 'public', 'documents')
        os.makedirs(frontend_dir, exist_ok=True)
        frontend_pdf_path = os.path.join(frontend_dir, 'wangs_seller_rules.pdf')
        with open(frontend_pdf_path, 'wb') as f:
            f.write(pdf_bytes)

        # Destination 2: Backend media documents directory
        media_doc_dir = os.path.join(settings.MEDIA_ROOT, 'documents')
        os.makedirs(media_doc_dir, exist_ok=True)
        backend_pdf_path = os.path.join(media_doc_dir, 'wangs_seller_rules.pdf')
        with open(backend_pdf_path, 'wb') as f:
            f.write(pdf_bytes)

        self.stdout.write(self.style.SUCCESS(
            f'Successfully generated Seller Rules PDF ({len(pdf_bytes)} bytes):\n'
            f' - Frontend Public: {frontend_pdf_path}\n'
            f' - Backend Media:    {backend_pdf_path}'
        ))
