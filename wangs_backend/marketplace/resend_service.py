import os
import logging
import requests
from django.conf import settings

from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger('marketplace.resend')

RESEND_API_URL = "https://api.resend.com/emails"


def send_smtp_email(to_email: str, subject: str, html_content: str):
    """
    Sends an email using standard Django SMTP (e.g. Gmail SMTP smtp.gmail.com:587).
    """
    to_email = (to_email or '').strip().lower()
    if not to_email:
        return False, {"error": "No recipient email address provided."}

    host_user = (os.getenv('EMAIL_HOST_USER') or getattr(settings, 'EMAIL_HOST_USER', '')).strip()
    host_pass = (os.getenv('EMAIL_HOST_PASSWORD') or getattr(settings, 'EMAIL_HOST_PASSWORD', '')).replace(' ', '').strip()
    if not host_user or not host_pass:
        return False, {"error": "SMTP credentials (EMAIL_HOST_USER / EMAIL_HOST_PASSWORD) not configured."}

    try:
        from django.core.mail import get_connection, EmailMultiAlternatives
        connection = get_connection(
            backend='django.core.mail.backends.smtp.EmailBackend',
            host=getattr(settings, 'EMAIL_HOST', 'smtp.gmail.com'),
            port=getattr(settings, 'EMAIL_PORT', 587),
            username=host_user,
            password=host_pass,
            use_tls=getattr(settings, 'EMAIL_USE_TLS', True),
            timeout=10
        )
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', host_user) or host_user
        msg = EmailMultiAlternatives(
            subject=subject,
            body="Your Wangs communication is inside this email. Please view in an HTML-capable email client.",
            from_email=from_email,
            to=[to_email],
            reply_to=[host_user],
            connection=connection
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)
        logger.info("Email successfully dispatched via SMTP to %s", to_email)
        print(f"[WANGS SMTP DISPATCH SUCCESS] Delivered to: {to_email} | Subject: {subject}")
        return True, {"provider": "SMTP", "to": to_email}
    except Exception as exc:
        logger.error("SMTP email delivery failed to %s: %s", to_email, exc)
        print(f"[WANGS SMTP DISPATCH ERROR] Failed to deliver to {to_email}: {exc}")
        return False, {"provider": "SMTP", "error": str(exc)}


def send_resend_email(to_email: str, subject: str, html_content: str):
    """
    Sends an email using the Resend API with the configured RESEND_API_KEY.
    """
    to_email = (to_email or '').strip().lower()
    if not to_email:
        return False, {"error": "No recipient email address provided."}

    api_key = (os.getenv('RESEND_API_KEY') or getattr(settings, 'RESEND_API_KEY', '')).strip()
    from_email = (os.getenv('RESEND_FROM_EMAIL') or getattr(settings, 'RESEND_FROM_EMAIL', 'onboarding@resend.dev')).strip()

    if not api_key:
        return False, {"error": "RESEND_API_KEY not configured."}

    # Resend testing domain (onboarding@resend.dev) is restricted by Resend to only send to the account owner (wangssupport@gmail.com).
    # Sending to external recipient with onboarding@resend.dev causes a 403 validation error from Resend.
    if 'resend.dev' in from_email and to_email != 'wangssupport@gmail.com':
        logger.warning(
            "Resend test domain (%s) cannot deliver to external recipient %s. Use SMTP or verify custom domain on Resend.",
            from_email, to_email
        )
        return False, {
            "provider": "RESEND",
            "error": f"Resend {from_email} only allows sending to account owner. Cannot deliver to external user {to_email}."
        }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "from": from_email,
        "to": [to_email],
        "subject": subject,
        "html": html_content,
    }

    try:
        response = requests.post(
            RESEND_API_URL,
            headers=headers,
            json=payload,
            timeout=4
        )
        if response.status_code in (200, 201):
            data = response.json()
            logger.info("Resend email sent successfully to %s: %s", to_email, data)
            print(f"[WANGS RESEND DISPATCH SUCCESS] Delivered to: {to_email} | Subject: {subject}")
            return True, data
        else:
            logger.warning(
                "Resend API returned status %s for %s: %s",
                response.status_code, to_email, response.text
            )
            return False, {
                "provider": "RESEND",
                "status_code": response.status_code,
                "message": response.text
            }
    except Exception as exc:
        logger.warning("Resend network call failed: %s", exc)
        return False, {"provider": "RESEND", "error": str(exc)}


def dispatch_email(to_email: str, subject: str, html_content: str):
    """
    Dispatches email using available live provider:
    1. Checks if SMTP credentials (e.g. Gmail) are present.
    2. Otherwise attempts Resend API.
    """
    to_email = (to_email or '').strip().lower()
    if not to_email:
        return False, {"error": "No recipient email address provided."}

    try:
        from dotenv import load_dotenv
        load_dotenv(settings.BASE_DIR / '.env', override=True)
        load_dotenv(settings.BASE_DIR.parent / '.env', override=True)
    except Exception:
        pass

    # Try SMTP first if credentials are present (capable of delivering to ANY valid Gmail / external address)
    smtp_user = os.getenv('EMAIL_HOST_USER') or getattr(settings, 'EMAIL_HOST_USER', '')
    smtp_pass = os.getenv('EMAIL_HOST_PASSWORD') or getattr(settings, 'EMAIL_HOST_PASSWORD', '')
    if smtp_user and smtp_pass:
        sent, info = send_smtp_email(to_email, subject, html_content)
        if sent:
            return True, info

    # Try Resend if configured
    resend_key = os.getenv('RESEND_API_KEY') or getattr(settings, 'RESEND_API_KEY', '')
    if resend_key:
        sent, info = send_resend_email(to_email, subject, html_content)
        if sent:
            return True, info
        return False, info

    return False, {"error": "Email credentials missing in .env (EMAIL_HOST_USER & EMAIL_HOST_PASSWORD or RESEND_API_KEY)."}


def send_otp_email(to_email: str, otp_code: str, purpose: str = 'LOGIN'):
    """
    Renders an artisanal branded Wangs email and dispatches the OTP via Resend.
    """
    purpose_titles = {
        'LOGIN': 'Sign In to Your Wangs Account',
        'REGISTER': 'Complete Your Wangs Registration',
        'RESET_PASSWORD': 'Reset Your Wangs Account Password',
        'SELLER': 'Verify Your Wangs Producer Account',
        'SELLER_REQUEST': 'Verify Your Seller Authorization Request',
    }
    title = purpose_titles.get(purpose, 'Your Wangs Verification Code')
    subject = f"Your Wangs OTP: {otp_code} — {title}"

    if purpose == 'RESET_PASSWORD':
        intro_text = "Hello! Use the one-time verification code below to reset your Wangs account password. This code will expire in <strong>10 minutes</strong>. If you did not request a password reset, please secure your account immediately."
    else:
        intro_text = "Hello! Use the one-time verification code below to verify your email address on Wangs. This code will expire in <strong>10 minutes</strong>."

    # Rich artisanal HTML email template matching the website's forest green & warm cream aesthetic
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>{title}</title>
    </head>
    <body style="margin:0;padding:0;background-color:#faf8f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1917;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf8f5;padding:32px 16px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#ffffff;border-radius:18px;border:1px solid #e7e3dc;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.06);">
              <!-- Header Bar -->
              <tr>
                <td style="background-color:#0e3820;padding:28px 32px;text-align:center;">
                  <h1 style="margin:0;color:#f5f2eb;font-size:26px;font-family:Georgia,serif;letter-spacing:1px;font-weight:700;">
                    WANGS
                  </h1>
                  <p style="margin:4px 0 0;color:#c7d6cc;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">
                    Authentic Food & Artisanal Pickle Marketplace · wangs.in
                  </p>
                </td>
              </tr>

              <!-- Body Content -->
              <tr>
                <td style="padding:36px 32px 24px;">
                  <h2 style="margin:0 0 12px;color:#1c1917;font-size:20px;font-family:Georgia,serif;font-weight:700;">
                    {title}
                  </h2>
                  <p style="margin:0 0 24px;color:#57534e;font-size:14px;line-height:1.6;">
                    {intro_text}
                  </p>

                  <!-- Stylized OTP Display Box -->
                  <div style="background:#f4f1ea;border:2px dashed #0e3820;border-radius:12px;padding:20px;text-align:center;margin-bottom:28px;">
                    <div style="font-size:11px;color:#0e3820;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-bottom:6px;">
                      Your Verification Code
                    </div>
                    <div style="font-family:'Courier New',Courier,monospace;font-size:38px;font-weight:800;letter-spacing:10px;color:#0e3820;padding:4px 0;">
                      {otp_code}
                    </div>
                    <div style="font-size:11px;color:#78716c;margin-top:6px;">
                      Valid for 10 minutes · Do not share this with anyone
                    </div>
                  </div>

                  <!-- Security Tip -->
                  <div style="background:#fdf6e7;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:6px;margin-bottom:24px;">
                    <p style="margin:0;color:#92400e;font-size:12px;line-height:1.5;">
                      <strong>Security Notice:</strong> Wangs will never call or ask for your password or OTP. If you did not request this email, please ignore it.
                    </p>
                  </div>

                  <p style="margin:0;color:#78716c;font-size:12px;line-height:1.5;">
                    Small-batch slow cured meats, King Chilli, and authentic ferments direct from verified artisan producers.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#f5f2eb;padding:18px 32px;border-top:1px solid #e7e3dc;text-align:center;">
                  <p style="margin:0;color:#78716c;font-size:11px;">
                    © {settings.DEBUG and '2026' or '2026'} Wangs Marketplace · <a href="https://wangs.in" style="color:#0e3820;text-decoration:none;font-weight:600;">wangs.in</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    print(f"\n==========================================")
    print(f"[WANGS EMAIL OTP DISPATCH]")
    print(f"Recipient: {to_email}")
    print(f"Purpose:   {purpose}")
    print(f"OTP Code:  {otp_code}")
    print(f"==========================================\n")

    return dispatch_email(to_email, subject, html_content)


def get_site_url(request=None) -> str:
    """
    Resolves the frontend public site URL (default: https://wangs.in or settings.FRONTEND_URL).
    In local development, intelligently maps port 8000 to port 3000.
    """
    env_url = (os.getenv('FRONTEND_URL') or getattr(settings, 'FRONTEND_URL', '')).strip()
    if env_url:
        return env_url.rstrip('/')

    if request:
        try:
            host = request.get_host()
            if 'localhost' in host or '127.0.0.1' in host:
                scheme = 'https' if request.is_secure() else 'http'
                if ':8000' in host:
                    return f"{scheme}://{host.replace(':8000', ':3000')}"
                return f"{scheme}://{host}"
        except Exception:
            pass

    return 'https://wangs.in'


def send_seller_approval_email(user=None, manufacturer_profile=None, request=None, site_url: str = None):
    """
    Renders an artisanal branded approval email and dispatches it to the seller.
    Includes direct web links to the Seller Portal (/manufacturer), public storefront (/products),
    and a clear 4-step onboarding guide for verified producers.
    """
    recipient_email = ''
    business_name = ''
    brand_slug = ''

    if manufacturer_profile:
        user = user or manufacturer_profile.user
        recipient_email = (manufacturer_profile.contact_email or (user.email if user else '')).strip()
        business_name = manufacturer_profile.business_name or (user.username if user else 'Producer Partner')
        brand_slug = manufacturer_profile.slug
    elif user:
        mfg = getattr(user, 'manufacturer_profile', None)
        recipient_email = ((mfg.contact_email if mfg else '') or user.email).strip()
        business_name = (mfg.business_name if mfg else '') or user.get_full_name() or user.username or 'Producer Partner'
        brand_slug = mfg.slug if mfg else ''

    if not recipient_email:
        logger.warning("send_seller_approval_email aborted: No recipient email found for user %s", user)
        return False, {"error": "No recipient email address found."}

    base_url = (site_url or get_site_url(request)).rstrip('/')
    seller_portal_url = f"{base_url}/manufacturer"
    storefront_url = f"{base_url}/products"
    brand_catalog_url = f"{base_url}/products?brand={brand_slug}" if brand_slug else f"{base_url}/brands"
    support_email = "wangssupport@gmail.com"

    subject = f"Your Seller Account Has Been Approved — Wangs Artisanal Marketplace"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Seller Account Approved</title>
    </head>
    <body style="margin:0;padding:0;background-color:#faf8f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1917;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf8f5;padding:32px 16px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:18px;border:1px solid #e7e3dc;overflow:hidden;box-shadow:0 12px 35px rgba(0,0,0,0.06);">
              
              <!-- Header Bar -->
              <tr>
                <td style="background-color:#0e3820;padding:32px 32px 28px;text-align:center;">
                  <div style="display:inline-block;padding:6px 14px;background:rgba(255,255,255,0.12);border-radius:20px;margin-bottom:12px;">
                    <span style="color:#d1fae5;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">
                      ✓ Verified Seller Account
                    </span>
                  </div>
                  <h1 style="margin:0;color:#f5f2eb;font-size:28px;font-family:Georgia,serif;letter-spacing:1.5px;font-weight:700;">
                    WANGS
                  </h1>
                  <p style="margin:6px 0 0;color:#c7d6cc;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">
                    Authentic Food & Artisanal Marketplace · wangs.in
                  </p>
                </td>
              </tr>

              <!-- Announcement Banner -->
              <tr>
                <td style="padding:36px 32px 28px;">
                  <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:18px 20px;margin-bottom:24px;text-align:center;">
                    <span style="font-size:26px;">🎉</span>
                    <h2 style="margin:8px 0 4px;color:#065f46;font-size:21px;font-family:Georgia,serif;font-weight:700;">
                      Congratulations, {business_name}!
                    </h2>
                    <p style="margin:0;color:#047857;font-size:13px;font-weight:600;">
                      Your seller account has been officially reviewed and approved.
                    </p>
                  </div>

                  <p style="margin:0 0 16px;color:#44403c;font-size:15px;line-height:1.6;">
                    We are delighted to welcome you to the Wangs Artisanal Marketplace. Your seller authorization is now live. You have complete access to the <strong>Wangs Seller Portal</strong> to list your slow-cured delicacies, manage real-time inventory, print packing slips, and fulfill verified customer orders across India.
                  </p>

                  <!-- Primary Action CTA Button -->
                  <div style="text-align:center;margin:32px 0 28px;">
                    <a href="{seller_portal_url}" target="_blank" style="display:inline-block;background-color:#0e3820;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:16px 38px;border-radius:12px;letter-spacing:0.5px;box-shadow:0 4px 14px rgba(14,56,32,0.35);">
                      Open Seller Portal →
                    </a>
                    <div style="margin-top:12px;font-size:12px;color:#78716c;">
                      Direct Web Link: <a href="{seller_portal_url}" target="_blank" style="color:#0e3820;font-weight:600;text-decoration:underline;">{seller_portal_url}</a>
                    </div>
                  </div>

                  <!-- Verified Account Links Summary -->
                  <div style="background:#fbfaf8;border:1px solid #e7e3dc;border-radius:14px;padding:20px;margin-bottom:28px;">
                    <h3 style="margin:0 0 14px;color:#1c1917;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">
                      Your Account Details & Web Links
                    </h3>
                    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#57534e;">
                      <tr>
                        <td style="padding:7px 0;width:38%;color:#78716c;">Business / Brand:</td>
                        <td style="padding:7px 0;font-weight:600;color:#1c1917;">{business_name}</td>
                      </tr>
                      <tr>
                        <td style="padding:7px 0;color:#78716c;">Registered Email:</td>
                        <td style="padding:7px 0;font-weight:600;color:#1c1917;">{recipient_email}</td>
                      </tr>
                      <tr>
                        <td style="padding:7px 0;color:#78716c;">Seller Portal:</td>
                        <td style="padding:7px 0;"><a href="{seller_portal_url}" target="_blank" style="color:#0e3820;font-weight:600;text-decoration:none;">{seller_portal_url}</a></td>
                      </tr>
                      <tr>
                        <td style="padding:7px 0;color:#78716c;">Marketplace Store:</td>
                        <td style="padding:7px 0;"><a href="{storefront_url}" target="_blank" style="color:#0e3820;font-weight:600;text-decoration:none;">{storefront_url}</a></td>
                      </tr>
                      <tr>
                        <td style="padding:7px 0;color:#78716c;">Brand Showcase:</td>
                        <td style="padding:7px 0;"><a href="{brand_catalog_url}" target="_blank" style="color:#0e3820;font-weight:600;text-decoration:none;">{brand_catalog_url}</a></td>
                      </tr>
                    </table>
                  </div>

                  <!-- Step-by-Step Onboarding Guide -->
                  <h3 style="margin:0 0 14px;color:#1c1917;font-size:14px;font-weight:700;letter-spacing:0.5px;">
                    Getting Started in 4 Simple Steps:
                  </h3>
                  <div style="padding-left:0;margin-bottom:28px;">
                    <div style="margin-bottom:14px;padding-left:14px;border-left:3px solid #0e3820;">
                      <strong style="color:#1c1917;font-size:13px;">1. Sign in with Instant OTP</strong>
                      <p style="margin:3px 0 0;color:#57534e;font-size:12px;line-height:1.5;">
                        Navigate to <a href="{seller_portal_url}" target="_blank" style="color:#0e3820;font-weight:600;">{seller_portal_url}</a> and enter your registered email. A 6-digit one-time passcode is sent instantly to log in securely without needing passwords.
                      </p>
                    </div>
                    <div style="margin-bottom:14px;padding-left:14px;border-left:3px solid #0e3820;">
                      <strong style="color:#1c1917;font-size:13px;">2. List Your Artisanal Products</strong>
                      <p style="margin:3px 0 0;color:#57534e;font-size:12px;line-height:1.5;">
                        Upload high-resolution jar and packaging photography. Specify ingredients, net grams, spice level, and verify your FSSAI license compliance.
                      </p>
                    </div>
                    <div style="margin-bottom:14px;padding-left:14px;border-left:3px solid #0e3820;">
                      <strong style="color:#1c1917;font-size:13px;">3. Complimentary Pan-India Air Logistics</strong>
                      <p style="margin:3px 0 0;color:#57534e;font-size:12px;line-height:1.5;">
                        Pack confirmed customer orders in protective leak-proof packaging. Wangs manages 100% complimentary Pan-India air express logistics with live air waybill tracking.
                      </p>
                    </div>
                    <div style="padding-left:14px;border-left:3px solid #0e3820;">
                      <strong style="color:#1c1917;font-size:13px;">4. Automated Bank Settlement</strong>
                      <p style="margin:3px 0 0;color:#57534e;font-size:12px;line-height:1.5;">
                        Link your verified bank account in the seller portal to receive prompt, transparent payouts for completed customer orders.
                      </p>
                    </div>
                  </div>

                  <!-- Manufacturer-Governed Refund Notice -->
                  <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:6px;margin-bottom:24px;">
                    <p style="margin:0;color:#92400e;font-size:12px;line-height:1.5;">
                      <strong>Seller Protection Policy:</strong> On Wangs, food items are strictly non-returnable. Refunds are fully dependent on manufacturer approval and only entertained for genuine, verified issues.
                    </p>
                  </div>

                  <!-- Producer Support Desk -->
                  <div style="background:#f4f1ea;border-radius:10px;padding:16px;text-align:center;">
                    <p style="margin:0;color:#44403c;font-size:13px;">
                      Questions or onboarding assistance? Contact our dedicated team anytime at <a href="mailto:{support_email}" style="color:#0e3820;font-weight:700;text-decoration:none;">{support_email}</a>.
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#f5f2eb;padding:22px 32px;border-top:1px solid #e7e3dc;text-align:center;">
                  <p style="margin:0 0 6px;color:#78716c;font-size:12px;font-weight:600;">
                    Wangs Artisanal Marketplace
                  </p>
                  <p style="margin:0;color:#a8a29e;font-size:11px;">
                    Connecting authentic regional producers directly to food lovers across India · <a href="{base_url}" target="_blank" style="color:#0e3820;text-decoration:none;font-weight:600;">wangs.in</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    print(f"\n==========================================")
    print(f"[WANGS SELLER APPROVAL EMAIL DISPATCH]")
    print(f"Recipient:      {recipient_email}")
    print(f"Business:       {business_name}")
    print(f"Seller Portal:  {seller_portal_url}")
    print(f"Storefront:     {storefront_url}")
    print(f"==========================================\n")

    return dispatch_email(recipient_email, subject, html_content)


def send_seller_new_review_notification(review):
    """
    Sends an artisanal email notification to the seller whenever a customer posts a review.
    """
    product = review.product
    if not product or not product.manufacturer:
        return False, {"error": "Product has no associated seller profile"}

    mfg = product.manufacturer
    recipient_email = (mfg.contact_email or (mfg.user.email if mfg.user else '')).strip()
    if not recipient_email:
        return False, {"error": f"No contact email found for brand {mfg.business_name}"}

    business_name = mfg.business_name or 'Artisan Brand'
    product_title = product.title
    rating = int(review.rating or 5)
    author_name = review.author_name or 'Artisanal Food Lover'
    review_title = review.title or 'Exceptional Flavor'
    review_comment = review.comment or ''

    # Star visual
    stars_str = '★' * rating + '☆' * (5 - rating)

    base_url = (os.getenv('FRONTEND_URL') or getattr(settings, 'FRONTEND_URL', 'https://wangs.in')).rstrip('/')
    product_url = f"{base_url}/product/{product.slug}"
    seller_portal_url = f"{base_url}/manufacturer"
    support_email = "wangssupport@gmail.com"

    subject = f"New {rating}-Star Review on '{product_title}' from {author_name} - Wangs"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>{subject}</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f6f4ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1917;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f4ee;padding:36px 12px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.06);border:1px solid #e7e3dc;">
              <!-- Header Bar -->
              <tr>
                <td style="background-color:#0e3820;padding:32px 36px;text-align:center;">
                  <div style="display:inline-block;background:#f59e0b;color:#0e3820;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;padding:4px 12px;border-radius:20px;margin-bottom:12px;">
                    New Customer Review
                  </div>
                  <h1 style="color:#ffffff;font-size:24px;font-family:Georgia,serif;font-weight:700;margin:0 0 6px;">
                    Wangs Marketplace
                  </h1>
                  <p style="color:#a7c4b0;font-size:13px;margin:0;">
                    Storefront Review Notification for {business_name}
                  </p>
                </td>
              </tr>

              <!-- Main Content -->
              <tr>
                <td style="padding:36px;">
                  <p style="font-size:15px;line-height:1.6;margin:0 0 16px;color:#292524;">
                    Hello <strong>{business_name}</strong>,
                  </p>
                  <p style="font-size:14px;line-height:1.6;margin:0 0 24px;color:#57534e;">
                    A customer has just posted a new review on your product listing <strong>{product_title}</strong> on Wangs:
                  </p>

                  <!-- Review Card -->
                  <div style="background:#faf8f5;border:1px solid #e7dfd4;border-radius:14px;padding:22px;margin-bottom:26px;">
                    <div style="margin-bottom:12px;">
                      <span style="font-size:20px;color:#f59e0b;letter-spacing:2px;display:inline-block;">{stars_str}</span>
                      <span style="font-size:13px;font-weight:700;color:#1c1917;margin-left:8px;">({rating} out of 5 stars)</span>
                    </div>

                    <h3 style="margin:0 0 8px;color:#1c1917;font-size:15px;font-weight:700;">
                      "{review_title}"
                    </h3>
                    <p style="margin:0 0 16px;color:#44403c;font-size:13px;line-height:1.6;font-style:italic;">
                      "{review_comment}"
                    </p>

                    <div style="border-top:1px solid #e7e3dc;padding-top:12px;font-size:12px;color:#78716c;">
                      <div>Reviewed by: <strong style="color:#1c1917;">{author_name}</strong> (Verified Customer)</div>
                      <div style="margin-top:4px;">Product: <strong style="color:#0e3820;">{product_title}</strong></div>
                    </div>
                  </div>

                  <!-- Action Buttons -->
                  <div style="text-align:center;margin-bottom:28px;">
                    <a href="{product_url}" target="_blank" style="display:inline-block;background:#0e3820;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 24px;border-radius:10px;margin:4px;box-shadow:0 3px 8px rgba(14,56,32,0.25);">
                      View Product & Reviews
                    </a>
                    <a href="{seller_portal_url}" target="_blank" style="display:inline-block;background:#ffffff;color:#0e3820;border:1.5px solid #0e3820;text-decoration:none;font-weight:700;font-size:13px;padding:11px 22px;border-radius:10px;margin:4px;">
                      Open Seller Portal
                    </a>
                  </div>

                  <!-- Tips for Producer Success -->
                  <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:6px;margin-bottom:20px;">
                    <p style="margin:0;color:#92400e;font-size:12px;line-height:1.5;">
                      <strong>Seller Tip:</strong> Positive customer reviews drive higher sales conversions and eligibility for Wangs Brand Spotlight features. Keep up the high standard of authentic recipe crafting!
                    </p>
                  </div>

                  <!-- Support Desk -->
                  <div style="background:#f4f1ea;border-radius:10px;padding:14px;text-align:center;">
                    <p style="margin:0;color:#57534e;font-size:12px;">
                      Questions about customer reviews? Contact the seller support desk at <a href="mailto:{support_email}" style="color:#0e3820;font-weight:700;text-decoration:none;">{support_email}</a>.
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#f5f2eb;padding:20px 32px;border-top:1px solid #e7e3dc;text-align:center;">
                  <p style="margin:0 0 4px;color:#78716c;font-size:12px;font-weight:600;">
                    Wangs Artisanal Marketplace
                  </p>
                  <p style="margin:0;color:#a8a29e;font-size:11px;">
                    Connecting authentic regional producers directly to food lovers across India | <a href="{base_url}" target="_blank" style="color:#0e3820;text-decoration:none;font-weight:600;">wangs.in</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    print(f"\n==========================================")
    print(f"[WANGS SELLER REVIEW EMAIL DISPATCH]")
    print(f"Recipient:      {recipient_email}")
    print(f"Business:       {business_name}")
    print(f"Product:        {product_title}")
    print(f"Rating:         {rating}/5")
    print(f"Reviewer:       {author_name}")
    print(f"Review Title:   {review_title}")
    print(f"==========================================\n")

    return dispatch_email(recipient_email, subject, html_content)


def send_admin_new_seller_registration_email(applicant_data: dict):
    """
    Notifies wangssupport@gmail.com whenever a new seller requests authorization or submits an onboarding application.
    """
    recipient_email = "wangssupport@gmail.com"
    business_name = applicant_data.get('business_name', 'Artisan Seller Applicant')
    applicant_email = applicant_data.get('email', '')
    phone = applicant_data.get('phone', 'Not provided')
    location_district = applicant_data.get('location_district', 'Not provided')
    fssai_number = applicant_data.get('fssai_number', 'Not provided')
    message = applicant_data.get('message', 'None provided')
    app_type = applicant_data.get('type', 'Seller Authorization Request')

    base_url = (os.getenv('FRONTEND_URL') or getattr(settings, 'FRONTEND_URL', 'https://wangs.in')).rstrip('/')
    admin_space_url = f"{base_url}/wangadminspace"

    subject = f"New Seller Registration Request: {business_name} ({applicant_email}) - Wangs"

    msg_row = f"""
    <tr>
      <td style="padding:6px 0;color:#78716c;font-weight:600;vertical-align:top;">Applicant Message:</td>
      <td style="padding:6px 0;color:#1c1917;font-style:italic;">"{message}"</td>
    </tr>
    """ if message and message != 'None provided' else ""

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>{subject}</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f6f4ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1917;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f4ee;padding:36px 12px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.06);border:1px solid #e7e3dc;">
              <!-- Header Bar -->
              <tr>
                <td style="background-color:#0e3820;padding:32px 36px;text-align:center;">
                  <div style="display:inline-block;background:#f59e0b;color:#0e3820;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;padding:4px 12px;border-radius:20px;margin-bottom:12px;">
                    Admin Alert - New Seller Request
                  </div>
                  <h1 style="color:#ffffff;font-size:24px;font-family:Georgia,serif;font-weight:700;margin:0 0 6px;">
                    Wangs Marketplace Admin
                  </h1>
                  <p style="color:#a7c4b0;font-size:13px;margin:0;">
                    New Artisan Producer Account Onboarding
                  </p>
                </td>
              </tr>

              <!-- Main Content -->
              <tr>
                <td style="padding:36px;">
                  <p style="font-size:15px;line-height:1.6;margin:0 0 16px;color:#292524;">
                    Hello <strong>Wangs Administrator</strong>,
                  </p>
                  <p style="font-size:14px;line-height:1.6;margin:0 0 24px;color:#57534e;">
                    A new artisan pickle brand has registered and requested authorization to sell on Wangs:
                  </p>

                  <!-- Application Details Box -->
                  <div style="background:#faf8f5;border:1px solid #e7dfd4;border-radius:14px;padding:22px;margin-bottom:26px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#44403c;line-height:1.8;">
                      <tr>
                        <td width="38%" style="padding:6px 0;color:#78716c;font-weight:600;">Brand / Producer:</td>
                        <td width="62%" style="padding:6px 0;font-weight:700;color:#0e3820;font-size:14px;">{business_name}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#78716c;font-weight:600;">Applicant Email:</td>
                        <td style="padding:6px 0;font-weight:700;color:#1c1917;"><a href="mailto:{applicant_email}" style="color:#0e3820;text-decoration:none;">{applicant_email}</a></td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#78716c;font-weight:600;">Phone / WhatsApp:</td>
                        <td style="padding:6px 0;font-weight:600;color:#1c1917;">{phone}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#78716c;font-weight:600;">Location District:</td>
                        <td style="padding:6px 0;color:#1c1917;">{location_district}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#78716c;font-weight:600;">FSSAI Registration #:</td>
                        <td style="padding:6px 0;font-family:monospace;font-weight:700;color:#0e3820;">{fssai_number or 'Pending submission'}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#78716c;font-weight:600;">Registration Mode:</td>
                        <td style="padding:6px 0;color:#1c1917;">{app_type}</td>
                      </tr>
                      {msg_row}
                    </table>
                  </div>

                  <!-- Action Buttons -->
                  <div style="text-align:center;margin-bottom:28px;">
                    <a href="{admin_space_url}" target="_blank" style="display:inline-block;background:#0e3820;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 28px;border-radius:10px;box-shadow:0 3px 8px rgba(14,56,32,0.25);">
                      Review & Approve in Admin Space
                    </a>
                  </div>

                  <!-- Note on Auto-Approval -->
                  <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:6px;margin-bottom:20px;">
                    <p style="margin:0;color:#92400e;font-size:12px;line-height:1.5;">
                      <strong>Next Step:</strong> Approving this seller in the Wangs Admin Space will automatically dispatch their welcome credentials and enable their dedicated Seller Login Space.
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#f5f2eb;padding:20px 32px;border-top:1px solid #e7e3dc;text-align:center;">
                  <p style="margin:0 0 4px;color:#78716c;font-size:12px;font-weight:600;">
                    Wangs Artisanal Marketplace
                  </p>
                  <p style="margin:0;color:#a8a29e;font-size:11px;">
                    Automated Administrative Alert | <a href="{base_url}" target="_blank" style="color:#0e3820;text-decoration:none;font-weight:600;">wangs.in</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    print(f"\n==========================================")
    print(f"[WANGS ADMIN NOTIFICATION DISPATCH]")
    print(f"Recipient:      {recipient_email}")
    print(f"Applicant:      {applicant_email}")
    print(f"Business:       {business_name}")
    print(f"Admin Space:    {admin_space_url}")
    print(f"==========================================\n")

    return dispatch_email(recipient_email, subject, html_content)


def send_seller_application_received_email(to_email: str, business_name: str, applicant_data: dict = None, request=None, site_url: str = None):
    """
    Renders an artisanal branded confirmation email dispatched directly to the applicant's entered Gmail / email address
    confirming that Wangs has received their Seller Registration / Authorization Request.
    """
    to_email = (to_email or '').strip().lower()
    if not to_email:
        return False, {"error": "No recipient email provided for seller application confirmation."}

    applicant_data = applicant_data or {}
    business_name = (business_name or 'Artisan Producer Partner').strip()
    district = applicant_data.get('location_district', 'Nagaland')
    fssai = applicant_data.get('fssai_number', 'Pending verification')

    base_url = (site_url or get_site_url(request)).rstrip('/')
    support_email = "wangssupport@gmail.com"

    subject = f"Application Received: Your Wangs Seller Request for {business_name}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>{subject}</title>
    </head>
    <body style="margin:0;padding:0;background-color:#faf8f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1917;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf8f5;padding:36px 12px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.06);border:1px solid #e7e3dc;">
              <!-- Header Bar -->
              <tr>
                <td style="background-color:#0e3820;padding:32px 36px;text-align:center;">
                  <div style="display:inline-block;background:#f59e0b;color:#0e3820;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;padding:4px 12px;border-radius:20px;margin-bottom:12px;">
                    Application Received
                  </div>
                  <h1 style="color:#ffffff;font-size:24px;font-family:Georgia,serif;font-weight:700;margin:0 0 6px;">
                    WANGS
                  </h1>
                  <p style="color:#c7d6cc;font-size:12px;margin:0;letter-spacing:1px;text-transform:uppercase;">
                    Authentic Food & Artisanal Pickle Marketplace
                  </p>
                </td>
              </tr>

              <!-- Main Content -->
              <tr>
                <td style="padding:36px 32px 28px;">
                  <p style="font-size:16px;line-height:1.6;margin:0 0 16px;color:#1c1917;">
                    Hello <strong>{business_name}</strong>,
                  </p>
                  <p style="font-size:14px;line-height:1.6;margin:0 0 20px;color:#44403c;">
                    Thank you for applying to sell your authentic artisanal pickles and foods on Wangs! We have successfully received your producer onboarding request.
                  </p>

                  <!-- Application Summary Card -->
                  <div style="background:#faf8f5;border:1px solid #e7dfd4;border-radius:14px;padding:20px;margin-bottom:24px;">
                    <div style="font-size:11px;font-weight:700;color:#0e3820;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">
                      Your Application Summary
                    </div>
                    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#44403c;line-height:1.8;">
                      <tr>
                        <td width="40%" style="color:#78716c;font-weight:600;">Registered Brand:</td>
                        <td width="60%" style="font-weight:700;color:#0e3820;">{business_name}</td>
                      </tr>
                      <tr>
                        <td style="color:#78716c;font-weight:600;">Contact Email:</td>
                        <td style="font-weight:700;color:#1c1917;">{to_email}</td>
                      </tr>
                      <tr>
                        <td style="color:#78716c;font-weight:600;">Origin District:</td>
                        <td style="color:#1c1917;">{district}</td>
                      </tr>
                      <tr>
                        <td style="color:#78716c;font-weight:600;">FSSAI Registration:</td>
                        <td style="font-family:monospace;font-weight:700;color:#0e3820;">{fssai}</td>
                      </tr>
                    </table>
                  </div>

                  <!-- What Happens Next -->
                  <h3 style="margin:0 0 12px;font-size:15px;color:#0e3820;font-family:Georgia,serif;font-weight:700;">
                    What Happens Next?
                  </h3>
                  <ol style="margin:0 0 24px;padding-left:20px;font-size:13px;color:#57534e;line-height:1.7;">
                    <li style="margin-bottom:8px;"><strong>Compliance Review:</strong> Our administrative desk verifies your FSSAI food business registration and checks our authentic small-batch standard (typically within 24 hours).</li>
                    <li style="margin-bottom:8px;"><strong>Approval Notification:</strong> Once authorized, an official invitation email will be dispatched to <strong>{to_email}</strong> with your Seller Space access.</li>
                    <li><strong>Storefront Activation:</strong> You can then upload products, configure pack sizes, set retail pricing, and start receiving direct orders.</li>
                  </ol>

                  <!-- Direct Support Contact -->
                  <div style="background:#f4f1ea;border-radius:12px;padding:16px;text-align:center;margin-bottom:20px;">
                    <p style="margin:0;color:#57534e;font-size:12px;line-height:1.6;">
                      Have questions about your seller application? Reach our dedicated seller desk directly at <a href="mailto:{support_email}" style="color:#0e3820;font-weight:700;text-decoration:none;">{support_email}</a>.
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#f5f2eb;padding:18px 32px;border-top:1px solid #e7e3dc;text-align:center;">
                  <p style="margin:0 0 4px;color:#78716c;font-size:11px;font-weight:600;">
                    © 2026 Wangs Marketplace · Authentic Artisanal Pickles
                  </p>
                  <p style="margin:0;color:#a8a29e;font-size:10px;">
                    Small-batch slow cured meats, King Chilli, and authentic ferments | <a href="{base_url}" style="color:#0e3820;text-decoration:none;font-weight:600;">wangs.in</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    print(f"\n==========================================")
    print(f"[WANGS APPLICANT CONFIRMATION DISPATCH]")
    print(f"Recipient (Seller): {to_email}")
    print(f"Business:           {business_name}")
    print(f"==========================================\n")

    return dispatch_email(to_email, subject, html_content)


def send_admin_new_product_notification(product, profile):
    """
    Notifies wangssupport@gmail.com whenever an authorized seller uploads a new product.
    Product goes live immediately without needing admin approval; admin is kept informed.
    """
    recipient_email = "wangssupport@gmail.com"
    business_name = getattr(profile, 'business_name', 'Artisan Seller')
    seller_email = getattr(getattr(profile, 'user', None), 'email', 'Unknown')
    product_title = getattr(product, 'title', 'Artisan Pickle')
    price = getattr(product, 'price', '0')
    base_price = getattr(product, 'base_price', '0')
    weight_grams = getattr(product, 'weight_grams', '250')
    stock_quantity = getattr(product, 'stock_quantity', '0')
    category_name = product.category.name if getattr(product, 'category', None) else 'Artisan Pickle'
    dietary_type = getattr(product, 'dietary_type', 'NON_VEG')
    slug = getattr(product, 'slug', '')

    base_url = (os.getenv('FRONTEND_URL') or getattr(settings, 'FRONTEND_URL', 'https://wangs.in')).rstrip('/')
    admin_space_url = f"{base_url}/wangadminspace"
    product_url = f"{base_url}/product/{slug}" if slug else base_url

    subject = f"New Product Live on Wangs: '{product_title}' by {business_name}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>{subject}</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f6f4ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1917;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f4ee;padding:36px 12px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.06);border:1px solid #e7e3dc;">
              <tr>
                <td style="background-color:#0e3820;padding:32px 36px;text-align:center;">
                  <div style="display:inline-block;background:#10b981;color:#ffffff;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;padding:4px 12px;border-radius:20px;margin-bottom:12px;">
                    Catalog Notification · Live on Storefront
                  </div>
                  <h1 style="color:#ffffff;font-size:24px;font-family:Georgia,serif;font-weight:700;margin:0 0 6px;">
                    New Product Uploaded
                  </h1>
                  <p style="color:#a7c4b0;font-size:13px;margin:0;">
                    Seller self-published a new artisan recipe batch
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:36px;">
                  <p style="font-size:15px;line-height:1.6;margin:0 0 16px;color:#292524;">
                    Hello <strong>Wangs Administrator</strong>,
                  </p>
                  <p style="font-size:14px;line-height:1.6;margin:0 0 24px;color:#57534e;">
                    An authorized seller has uploaded a new product recipe to the marketplace. It is active and available to customers immediately:
                  </p>

                  <div style="background:#faf8f5;border:1px solid #e7dfd4;border-radius:14px;padding:22px;margin-bottom:26px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#44403c;line-height:1.8;">
                      <tr>
                        <td width="38%" style="padding:6px 0;color:#78716c;font-weight:600;">Product Title:</td>
                        <td width="62%" style="padding:6px 0;font-weight:700;color:#0e3820;font-size:15px;">{product_title}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#78716c;font-weight:600;">Seller / Brand:</td>
                        <td style="padding:6px 0;font-weight:700;color:#1c1917;">{business_name} ({seller_email})</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#78716c;font-weight:600;">Category:</td>
                        <td style="padding:6px 0;font-weight:600;color:#1c1917;">{category_name} ({dietary_type})</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#78716c;font-weight:600;">Customer Price:</td>
                        <td style="padding:6px 0;font-weight:700;color:#0e3820;font-size:14px;">₹{price} (Seller Base: ₹{base_price})</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#78716c;font-weight:600;">Pack Weight & Stock:</td>
                        <td style="padding:6px 0;color:#1c1917;">{weight_grams}g · {stock_quantity} jars in stock</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#78716c;font-weight:600;">Status:</td>
                        <td style="padding:6px 0;font-weight:700;color:#047857;">Live & Active (No approval needed)</td>
                      </tr>
                    </table>
                  </div>

                  <div style="text-align:center;margin:32px 0 20px;">
                    <a href="{admin_space_url}" style="display:inline-block;background:#0e3820;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:14px 28px;border-radius:12px;margin:0 6px 10px;">
                      Open Admin Space &rarr;
                    </a>
                    {f'<a href="{product_url}" style="display:inline-block;background:#faf8f5;color:#0e3820;text-decoration:none;font-weight:700;font-size:13px;padding:14px 28px;border-radius:12px;border:1px solid #e7dfd4;margin:0 6px 10px;">View on Storefront &rarr;</a>' if slug else ''}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    print(f"\n==========================================")
    print(f"[WANGS ADMIN NEW PRODUCT DISPATCH]")
    print(f"Recipient:      {recipient_email}")
    print(f"Seller:         {business_name}")
    print(f"Product:        {product_title} (₹{price})")
    print(f"Status:         LIVE")
    print(f"Admin Space:    {admin_space_url}")
    print(f"==========================================\n")

    return dispatch_email(recipient_email, subject, html_content)
