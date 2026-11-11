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

    host_user = (os.getenv('EMAIL_HOST_USER') or getattr(settings, 'EMAIL_HOST_USER', '') or 'wangssupport@gmail.com').strip()
    host_pass = (os.getenv('EMAIL_HOST_PASSWORD') or getattr(settings, 'EMAIL_HOST_PASSWORD', '') or 'xphhqfosryvzyscc').replace(' ', '').strip()
    if not host_user or not host_pass:
        return False, {"error": "SMTP credentials (EMAIL_HOST_USER / EMAIL_HOST_PASSWORD) not configured."}

    from django.core.mail import get_connection, EmailMultiAlternatives
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', host_user) or host_user
    smtp_errors = []

    # Attempt 1: Port 587 with STARTTLS
    try:
        conn_587 = get_connection(
            backend='django.core.mail.backends.smtp.EmailBackend',
            host=getattr(settings, 'EMAIL_HOST', 'smtp.gmail.com'),
            port=587,
            username=host_user,
            password=host_pass,
            use_tls=True,
            timeout=8
        )
        msg = EmailMultiAlternatives(
            subject=subject,
            body="Your Wangs verification code is inside this email.",
            from_email=from_email,
            to=[to_email],
            reply_to=[host_user],
            connection=conn_587
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)
        logger.info("Email successfully dispatched via SMTP (587 TLS) to %s", to_email)
        print(f"[WANGS SMTP 587 SUCCESS] Delivered to: {to_email} | Subject: {subject}")
        return True, {"provider": "SMTP-587", "to": to_email}
    except Exception as exc1:
        smtp_errors.append(f"Port 587: {exc1}")

    # Attempt 2: Port 465 with direct SSL (often succeeds where 587 STARTTLS is blocked)
    try:
        conn_465 = get_connection(
            backend='django.core.mail.backends.smtp.EmailBackend',
            host=getattr(settings, 'EMAIL_HOST', 'smtp.gmail.com'),
            port=465,
            username=host_user,
            password=host_pass,
            use_ssl=True,
            use_tls=False,
            timeout=8
        )
        msg = EmailMultiAlternatives(
            subject=subject,
            body="Your Wangs verification code is inside this email.",
            from_email=from_email,
            to=[to_email],
            reply_to=[host_user],
            connection=conn_465
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)
        logger.info("Email successfully dispatched via SMTP (465 SSL) to %s", to_email)
        print(f"[WANGS SMTP 465 SUCCESS] Delivered to: {to_email} | Subject: {subject}")
        return True, {"provider": "SMTP-465", "to": to_email}
    except Exception as exc2:
        smtp_errors.append(f"Port 465: {exc2}")

    logger.error("SMTP email delivery failed to %s: %s", to_email, " | ".join(smtp_errors))
    print(f"[WANGS SMTP DISPATCH ERROR] Failed to deliver to {to_email}: {' | '.join(smtp_errors)}")
    return False, {"provider": "SMTP", "error": " | ".join(smtp_errors)}


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

    # 1. Attempt Vercel HTTPS Mail Relay (bypasses Render cloud SMTP firewall over port 443 HTTPS)
    relay_url = (os.getenv('MAIL_RELAY_URL') or 'https://wangs.in/api/mail-relay').strip()
    relay_secret = (os.getenv('MAIL_RELAY_SECRET') or 'wangs-internal-mail-secret-key-2026').strip()
    try:
        relay_resp = requests.post(
            relay_url,
            json={
                "to": to_email,
                "subject": subject,
                "html": html_content,
                "secret": relay_secret,
            },
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        if relay_resp.status_code == 200:
            resp_data = relay_resp.json()
            if resp_data.get('success'):
                logger.info("Email delivered via Vercel HTTPS Mail Relay to %s: %s", to_email, resp_data)
                print(f"[WANGS VERCEL RELAY SUCCESS] Delivered to: {to_email} | Subject: {subject}")
                return True, {"provider": "VERCEL_RELAY", "to": to_email, "messageId": resp_data.get('messageId')}
    except Exception as exc_relay:
        logger.warning("Vercel HTTPS mail relay unavailable or failed: %s", exc_relay)

    # 2. Try direct SMTP (capable of delivering to ANY valid Gmail / external address where port 587/465 is open)
    smtp_user = (os.getenv('EMAIL_HOST_USER') or getattr(settings, 'EMAIL_HOST_USER', '') or 'wangssupport@gmail.com').strip()
    smtp_pass = (os.getenv('EMAIL_HOST_PASSWORD') or getattr(settings, 'EMAIL_HOST_PASSWORD', '') or 'xphhqfosryvzyscc').replace(' ', '').strip()
    smtp_info = None
    if smtp_user and smtp_pass:
        sent, info = send_smtp_email(to_email, subject, html_content)
        if sent:
            return True, info
        smtp_info = info

    # Try Resend if configured
    resend_key = os.getenv('RESEND_API_KEY') or getattr(settings, 'RESEND_API_KEY', '')
    if resend_key:
        sent, info = send_resend_email(to_email, subject, html_content)
        if sent:
            return True, info
        combined_err = f"{smtp_info.get('error', '')} | Resend: {info.get('error', '')}" if smtp_info else info.get('error', '')
        return False, {"error": combined_err, "smtp": smtp_info, "resend": info}

    return False, {"error": smtp_info.get("error", "SMTP credentials delivery failed") if smtp_info else "Email credentials missing in .env."}


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
    bank_account_holder = applicant_data.get('bank_account_holder', '')
    bank_account_number = applicant_data.get('bank_account_number', '')
    bank_ifsc_code = applicant_data.get('bank_ifsc_code', '')
    bank_name = applicant_data.get('bank_name', '')
    message = applicant_data.get('message', 'None provided')
    app_type = applicant_data.get('type', 'Seller Authorization Request')

    base_url = (os.getenv('FRONTEND_URL') or getattr(settings, 'FRONTEND_URL', 'https://wangs.in')).rstrip('/')
    admin_space_url = f"{base_url}/wangadminspace"

    subject = f"New Seller Registration Request: {business_name} ({applicant_email}) - Wangs"

    bank_row = f"""
    <tr>
      <td style="padding:6px 0;color:#78716c;font-weight:600;">Payout Settlement Bank:</td>
      <td style="padding:6px 0;color:#1c1917;">
        <strong>{bank_name}</strong><br>
        <span style="font-family:monospace;font-size:12px;color:#0e3820;">A/C: {bank_account_number} | IFSC: {bank_ifsc_code}</span><br>
        <span style="font-size:11px;color:#57534e;">Holder: {bank_account_holder}</span>
      </td>
    </tr>
    """ if bank_account_number else ""

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
                      {bank_row}
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
    bank_name = applicant_data.get('bank_name', '')
    bank_acct = applicant_data.get('bank_account_number', '')
    bank_ifsc = applicant_data.get('bank_ifsc_code', '')
    masked_acct = f"••••{bank_acct[-4:]}" if len(bank_acct) >= 4 else bank_acct

    bank_summary_row = f"""
    <tr>
      <td style="color:#78716c;font-weight:600;">Payout Settlement Bank:</td>
      <td style="color:#1c1917;font-weight:600;">{bank_name} (<span style="font-family:monospace;">{masked_acct}</span>, IFSC: <span style="font-family:monospace;">{bank_ifsc}</span>)</td>
    </tr>
    """ if bank_acct else ""

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
                      {bank_summary_row}
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


def send_courier_approval_email(courier_profile, request=None, site_url: str = None):
    """
    Sends an approval email to the courier delivery agent with their login details and a link to /delivery.
    """
    recipient_email = (courier_profile.email or (courier_profile.user.email if courier_profile.user else '')).strip()
    if not recipient_email:
        return False, {"error": "No recipient email address."}

    full_name = courier_profile.full_name or (courier_profile.user.get_full_name() if courier_profile.user else '') or 'Delivery Partner'
    phone = courier_profile.phone_number or (courier_profile.user.phone_number if courier_profile.user else 'Registered Phone')
    base_url = (site_url or get_site_url(request)).rstrip('/')
    delivery_portal_url = f"{base_url}/delivery"

    vehicle_display = courier_profile.get_vehicle_type_display() if hasattr(courier_profile, 'get_vehicle_type_display') else courier_profile.vehicle_type
    vehicle_info = f"{vehicle_display} ({courier_profile.vehicle_number})" if courier_profile.vehicle_number else vehicle_display
    admin_notes = getattr(courier_profile, 'admin_notes', '')

    subject = "🎉 Your Wangs Express Courier Account Has Been Approved!"
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Courier Account Approved</title>
    </head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f5f3ef;padding:24px;margin:0;color:#292524;">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:20px;border:1px solid #e7dfd4;padding:36px;box-shadow:0 4px 16px rgba(0,0,0,0.04);">
        
        <!-- Header -->
        <div style="text-align:center;border-bottom:1px solid #f0ede6;padding-bottom:24px;">
          <h1 style="color:#0e3820;font-size:22px;margin:0 0 8px;letter-spacing:-0.5px;">⚡ Wangs Express Logistics</h1>
          <span style="display:inline-block;background:#dcfce7;color:#166534;font-size:12px;font-weight:700;padding:6px 14px;border-radius:999px;border:1px solid #bbf7d0;">
            ✓ Account Approved & Active
          </span>
        </div>

        <!-- Greeting & Announcement -->
        <div style="margin-top:28px;">
          <p style="font-size:16px;line-height:1.6;margin:0 0 12px;">
            Hello <strong>{full_name}</strong>,
          </p>
          <p style="font-size:14px;line-height:1.7;color:#57534e;margin:0 0 20px;">
            Congratulations! Your application to join the <strong>Wangs Express</strong> delivery fleet has been approved by the platform administration. Your account is now active and ready for parcel delivery operations.
          </p>
        </div>

        <!-- Account & Fleet Details Card -->
        <div style="background:#faf8f5;border:1px solid #e7dfd4;border-radius:14px;padding:20px;margin:24px 0;">
          <h3 style="font-size:13px;color:#0e3820;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px;">Your Approved Fleet Profile</h3>
          
          <table style="width:100%;font-size:13px;border-collapse:collapse;">
            <tr>
              <td style="padding:5px 0;color:#78716c;width:40%;">Delivery Partner:</td>
              <td style="padding:5px 0;font-weight:700;color:#1c1917;">{full_name}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;color:#78716c;">Login Mobile / Phone:</td>
              <td style="padding:5px 0;font-weight:700;color:#0e3820;font-family:monospace;">{phone}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;color:#78716c;">Registered Email:</td>
              <td style="padding:5px 0;font-weight:700;color:#1c1917;font-family:monospace;">{recipient_email}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;color:#78716c;">Assigned Vehicle:</td>
              <td style="padding:5px 0;font-weight:700;color:#1c1917;">{vehicle_info}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;color:#78716c;">Courier Company / Hub:</td>
              <td style="padding:5px 0;font-weight:700;color:#1c1917;">{courier_profile.courier_company or 'Independent'} &middot; {courier_profile.service_area_city or 'Hub'}</td>
            </tr>
            {f'<tr><td style="padding:5px 0;color:#78716c;">Admin Notes:</td><td style="padding:5px 0;color:#0e3820;font-style:italic;">{admin_notes}</td></tr>' if admin_notes else ''}
          </table>
        </div>

        <!-- How to Sign In / Next Steps -->
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:20px;margin:24px 0;">
          <h3 style="font-size:13px;color:#166534;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.5px;">🚀 Getting Started in 3 Easy Steps</h3>
          <ol style="margin:0;padding-left:20px;font-size:13px;line-height:1.8;color:#166534;">
            <li>Visit the courier delivery portal at <a href="{delivery_portal_url}" style="color:#0e3820;font-weight:700;text-decoration:underline;">wangs.in/delivery</a>.</li>
            <li>Sign in using your registered mobile number <strong>{phone}</strong> (or email <strong>{recipient_email}</strong>) and your password.</li>
            <li>Scan package QR barcodes with the camera scanner, view customer directions, and complete deliveries!</li>
          </ol>
        </div>

        <!-- Call to Action Button -->
        <div style="text-align:center;margin:32px 0 24px;">
          <a href="{delivery_portal_url}" style="display:inline-block;background:#0e3820;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 36px;border-radius:12px;box-shadow:0 2px 8px rgba(14,56,32,0.25);">
            Open Courier Delivery Portal &rarr;
          </a>
        </div>

        <p style="font-size:12px;color:#a8a29e;text-align:center;margin:28px 0 0;line-height:1.5;">
          Wangs Express Logistics &middot; Kohima, Nagaland &middot; Need help? Contact <a href="mailto:wangssupport@gmail.com" style="color:#78716c;text-decoration:underline;">wangssupport@gmail.com</a>
        </p>
      </div>
    </body>
    </html>
    """
    print(f"\n==========================================")
    print(f"[WANGS COURIER APPROVAL EMAIL DISPATCH]")
    print(f"Recipient:      {recipient_email}")
    print(f"Agent:          {full_name}")
    print(f"Portal:         {delivery_portal_url}")
    print(f"==========================================\n")
    return dispatch_email(recipient_email, subject, html_content)


def send_courier_suspension_email(courier_profile, reason='', request=None, site_url: str = None):
    """
    Sends an account suspension notice email to the courier.
    """
    recipient_email = (courier_profile.email or (courier_profile.user.email if courier_profile.user else '')).strip()
    if not recipient_email:
        return False, {"error": "No recipient email address."}

    full_name = courier_profile.full_name or 'Delivery Partner'
    subject = "Notice: Your Wangs Express Courier Account Has Been Suspended"
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family:sans-serif;background:#f5f3ef;padding:24px;color:#292524;">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e7dfd4;padding:32px;">
        <h2 style="color:#b91c1c;margin:0 0 12px;">Wangs Express Logistics &middot; Account Suspended</h2>
        <p style="font-size:15px;line-height:1.6;">Hello <strong>{full_name}</strong>,</p>
        <p style="font-size:14px;line-height:1.6;color:#57534e;">
          This is an official notice that your Wangs Express courier delivery privileges have been temporarily suspended by platform administration.
        </p>
        {f'<div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:12px;padding:16px;margin:20px 0;font-size:13px;"><strong>Reason:</strong><br>{reason}</div>' if reason else ''}
        <p style="font-size:13px;line-height:1.6;color:#57534e;">
          During suspension, you will not be able to scan package QR codes, view customer route directions, or confirm deliveries. If you have questions or want to resolve this issue, please contact <strong>wangssupport@gmail.com</strong>.
        </p>
      </div>
    </body>
    </html>
    """
    return dispatch_email(recipient_email, subject, html_content)


def send_courier_rejection_email(courier_profile, reason='', request=None, site_url: str = None):
    """
    Sends a rejection notice email to the applicant courier.
    """
    recipient_email = (courier_profile.email or (courier_profile.user.email if courier_profile.user else '')).strip()
    if not recipient_email:
        return False, {"error": "No recipient email address."}

    full_name = courier_profile.full_name or 'Delivery Partner'
    subject = "Update on Your Wangs Express Courier Application"
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family:sans-serif;background:#f5f3ef;padding:24px;color:#292524;">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e7dfd4;padding:32px;">
        <h2 style="color:#b91c1c;margin:0 0 12px;">Wangs Express Logistics</h2>
        <p style="font-size:15px;line-height:1.6;">Hello <strong>{full_name}</strong>,</p>
        <p style="font-size:14px;line-height:1.6;color:#57534e;">
          Thank you for applying to the Wangs Express courier partner program.
          After reviewing your credentials, our administration was unable to approve your application at this time.
        </p>
        {f'<div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:12px;padding:16px;margin:20px 0;font-size:13px;"><strong>Reason / Notes:</strong><br>{reason}</div>' if reason else ''}
        <p style="font-size:13px;line-height:1.6;color:#57534e;">
          If you believe this decision was made in error or wish to submit updated documentation, please email <strong>wangssupport@gmail.com</strong>.
        </p>
      </div>
    </body>
    </html>
    """
    return dispatch_email(recipient_email, subject, html_content)


def send_admin_new_courier_registration_email(applicant_data: dict):
    """
    Notifies wangssupport@gmail.com whenever a new courier registers and is pending review.
    """
    recipient_email = "wangssupport@gmail.com"
    full_name = applicant_data.get('full_name', 'New Courier Applicant')
    phone = applicant_data.get('phone', 'N/A')
    email = applicant_data.get('email', 'N/A')
    vehicle = applicant_data.get('vehicle_type', 'BIKE')
    admin_space_url = "https://wangs.in/wangsadminspace"

    subject = f"[New Courier Application] {full_name} ({phone}) - Wangs Express"
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family:sans-serif;background:#f5f3ef;padding:24px;color:#292524;">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e7dfd4;padding:32px;">
        <h2 style="color:#0e3820;margin:0 0 12px;">New Courier Registration Pending Review</h2>
        <p style="font-size:14px;color:#57534e;">A new delivery agent has registered on Wangs Express and is waiting for administrator approval.</p>
        <div style="background:#faf8f5;border:1px solid #e7dfd4;border-radius:12px;padding:16px;margin:20px 0;font-size:13px;">
          <p style="margin:4px 0;"><strong>Name:</strong> {full_name}</p>
          <p style="margin:4px 0;"><strong>Phone:</strong> {phone}</p>
          <p style="margin:4px 0;"><strong>Email:</strong> {email}</p>
          <p style="margin:4px 0;"><strong>Vehicle:</strong> {vehicle}</p>
        </div>
        <div style="text-align:center;margin:24px 0;">
          <a href="{admin_space_url}" style="display:inline-block;background:#0e3820;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:12px;">
            Open Admin Dashboard to Approve &rarr;
          </a>
        </div>
      </div>
    </body>
    </html>
    """
    return dispatch_email(recipient_email, subject, html_content)


def send_manufacturer_order_notification(order, manufacturer_profile, items_for_mfg, request=None, site_url: str = None):
    """
    Sends an email notification to a specific manufacturer detailing the particular product(s)
    ordered by a customer, along with customer shipping destination, financial earnings breakdown,
    and packaging/dispatch instructions.
    """
    recipient_email = (
        manufacturer_profile.contact_email or 
        (manufacturer_profile.user.email if manufacturer_profile.user else '')
    ).strip()
    
    if not recipient_email:
        return False, {"error": f"No contact email found for manufacturer '{manufacturer_profile.business_name}'."}

    business_name = manufacturer_profile.business_name or 'Artisan Producer'
    base_url = (site_url or get_site_url(request)).rstrip('/')
    seller_portal_url = f"{base_url}/manufacturer"
    
    # Calculate totals for THIS manufacturer's products only
    total_qty = sum(item.quantity for item in items_for_mfg)
    total_mfg_sales = sum(item.subtotal for item in items_for_mfg)
    total_mfg_payout = sum(item.manufacturer_payout for item in items_for_mfg)
    total_commission = sum(item.commission_amount for item in items_for_mfg)
    
    # Subject line
    if len(items_for_mfg) == 1:
        subject = f"🛒 New Order for '{items_for_mfg[0].product_title}' (#{order.order_number}) - Wangs"
    else:
        subject = f"🛒 New Order #{order.order_number} ({total_qty} items) for {business_name} - Wangs"

    order_date = order.created_at.strftime('%d %B %Y, %I:%M %p') if order.created_at else 'Just now'
    payment_status_display = 'Paid & Confirmed' if order.payment_status == 'PAID' else (
        'Cash on Delivery' if order.payment_method == 'COD' else order.payment_status
    )

    # Build item rows HTML
    item_rows_html = ""
    for item in items_for_mfg:
        thumb_html = ""
        try:
            if item.product:
                img = item.product.images.filter(is_primary=True).first() or item.product.images.first()
                if img and img.image_url:
                    thumb_html = f'<img src="{img.image_url}" alt="" style="width:44px;height:44px;object-fit:cover;border-radius:8px;border:1px solid #e7dfd4;margin-right:12px;display:inline-block;vertical-align:middle;" />'
        except Exception:
            pass

        item_rows_html += f"""
        <tr style="border-bottom:1px solid #f0ede6;">
          <td style="padding:14px 12px;font-size:13px;color:#1c1917;vertical-align:middle;">
            <div style="display:flex;align-items:center;">
              {thumb_html}
              <div>
                <strong style="color:#0e3820;display:block;font-size:13px;">{item.product_title}</strong>
                <span style="font-size:11px;color:#78716c;">Pack: {item.weight_grams}g &middot; ₹{item.unit_price} each</span>
              </div>
            </div>
          </td>
          <td style="padding:14px 12px;font-size:13px;text-align:center;font-weight:700;color:#1c1917;vertical-align:middle;">
            {item.quantity}
          </td>
          <td style="padding:14px 12px;font-size:13px;text-align:right;font-family:monospace;font-weight:700;color:#1c1917;vertical-align:middle;">
            ₹{item.subtotal}
          </td>
          <td style="padding:14px 12px;font-size:13px;text-align:right;font-family:monospace;font-weight:700;color:#166534;background:#f0fdf4;vertical-align:middle;">
            ₹{item.manufacturer_payout}
          </td>
        </tr>
        """

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>{subject}</title>
    </head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f5f3ef;padding:24px;margin:0;color:#292524;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:20px;border:1px solid #e7dfd4;padding:36px;box-shadow:0 4px 20px rgba(0,0,0,0.04);">
        
        <!-- Header -->
        <div style="text-align:center;border-bottom:1px solid #f0ede6;padding-bottom:24px;">
          <h1 style="color:#0e3820;font-size:22px;margin:0 0 8px;letter-spacing:-0.5px;">⚡ Wangs Artisanal Marketplace</h1>
          <span style="display:inline-block;background:#dcfce7;color:#166534;font-size:12px;font-weight:700;padding:6px 14px;border-radius:999px;border:1px solid #bbf7d0;">
            ✓ New Customer Order &middot; {payment_status_display}
          </span>
        </div>

        <!-- Greeting & Order Overview -->
        <div style="margin-top:28px;">
          <p style="font-size:16px;line-height:1.6;margin:0 0 10px;">
            Hello <strong>{business_name}</strong>,
          </p>
          <p style="font-size:14px;line-height:1.7;color:#57534e;margin:0 0 20px;">
            A customer has just placed an order for your handcrafted product(s) on Wangs! Please review your items below and begin preparing them for packaging.
          </p>
        </div>

        <!-- Order Summary Card -->
        <div style="background:#faf8f5;border:1px solid #e7dfd4;border-radius:14px;padding:18px 20px;margin:20px 0;">
          <table style="width:100%;font-size:13px;border-collapse:collapse;">
            <tr>
              <td style="padding:4px 0;color:#78716c;width:38%;">Order Number:</td>
              <td style="padding:4px 0;font-weight:700;color:#0e3820;font-family:monospace;font-size:14px;">#{order.order_number}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#78716c;">Order Placed:</td>
              <td style="padding:4px 0;font-weight:600;color:#1c1917;">{order_date}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#78716c;">Payment Method:</td>
              <td style="padding:4px 0;font-weight:600;color:#1c1917;">{order.payment_method} ({payment_status_display})</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#78716c;">Deliver To:</td>
              <td style="padding:4px 0;font-weight:600;color:#1c1917;">{order.customer_name} &middot; {order.shipping_city}, {order.shipping_state} ({order.shipping_postal_code})</td>
            </tr>
          </table>
        </div>

        <!-- Ordered Products Table (Specific to THIS manufacturer) -->
        <div style="margin:24px 0;">
          <h3 style="font-size:13px;color:#0e3820;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px;">
            Your Ordered Products ({total_qty} units)
          </h3>
          
          <table style="width:100%;border-collapse:collapse;border:1px solid #f0ede6;border-radius:12px;overflow:hidden;">
            <thead>
              <tr style="background:#f5f3ef;border-bottom:2px solid #e7dfd4;font-size:11px;text-transform:uppercase;color:#78716c;letter-spacing:0.5px;">
                <th style="padding:10px 12px;text-align:left;">Product</th>
                <th style="padding:10px 12px;text-align:center;">Qty</th>
                <th style="padding:10px 12px;text-align:right;">Subtotal</th>
                <th style="padding:10px 12px;text-align:right;background:#e8f7ec;color:#166534;">Your Payout</th>
              </tr>
            </thead>
            <tbody>
              {item_rows_html}
            </tbody>
          </table>
        </div>

        <!-- Financial Payout Breakdown -->
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:18px 20px;margin:20px 0;">
          <table style="width:100%;font-size:13px;border-collapse:collapse;">
            <tr>
              <td style="padding:4px 0;color:#166534;">Your Gross Item Sales:</td>
              <td style="padding:4px 0;text-align:right;font-family:monospace;font-weight:700;color:#166534;">₹{total_mfg_sales}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#166534;">Platform Fee & Commission:</td>
              <td style="padding:4px 0;text-align:right;font-family:monospace;color:#166534;">- ₹{total_commission}</td>
            </tr>
            <tr style="border-top:1px dashed #bbf7d0;">
              <td style="padding:8px 0 4px;font-size:14px;font-weight:800;color:#0e3820;">Your Net Producer Payout:</td>
              <td style="padding:8px 0 4px;text-align:right;font-family:monospace;font-size:16px;font-weight:900;color:#0e3820;">₹{total_mfg_payout}</td>
            </tr>
          </table>
          <p style="font-size:11px;color:#166534;margin:8px 0 0;font-style:italic;">
            Payout will be automatically settled into your registered bank account per standard settlement cycle.
          </p>
        </div>

        <!-- Packing & Fulfillment Instructions -->
        <div style="background:#faf8f5;border:1px solid #e7dfd4;border-radius:14px;padding:20px;margin:24px 0;">
          <h3 style="font-size:13px;color:#0e3820;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.5px;">📦 Next Steps to Fulfill</h3>
          <ol style="margin:0;padding-left:20px;font-size:13px;line-height:1.8;color:#57534e;">
            <li>Package the requested jar(s)/pack(s) securely with tamper-evident seal.</li>
            <li>Sign in to your <a href="{seller_portal_url}" style="color:#0e3820;font-weight:700;text-decoration:underline;">Seller Portal</a> to view and update the order status to <strong>Packed</strong>.</li>
            <li>A Wangs Express courier partner will arrive for parcel pickup and scan the delivery QR.</li>
          </ol>
        </div>

        <!-- Call to Action -->
        <div style="text-align:center;margin:32px 0 24px;">
          <a href="{seller_portal_url}" style="display:inline-block;background:#0e3820;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 36px;border-radius:12px;box-shadow:0 2px 8px rgba(14,56,32,0.25);">
            Open Seller Portal & Manage Order &rarr;
          </a>
        </div>

        <p style="font-size:12px;color:#a8a29e;text-align:center;margin:28px 0 0;line-height:1.5;">
          Wangs Artisanal Food Marketplace &middot; Kohima, Nagaland &middot; Need help? Contact <a href="mailto:wangssupport@gmail.com" style="color:#78716c;text-decoration:underline;">wangssupport@gmail.com</a>
        </p>
      </div>
    </body>
    </html>
    """

    print(f"\n==========================================")
    print(f"[WANGS MANUFACTURER ORDER EMAIL DISPATCH]")
    print(f"Recipient:      {recipient_email}")
    print(f"Manufacturer:   {business_name}")
    print(f"Order:          #{order.order_number} ({total_qty} items)")
    print(f"Gross / Payout: ₹{total_mfg_sales} / ₹{total_mfg_payout}")
    print(f"==========================================\n")

    return dispatch_email(recipient_email, subject, html_content)


def send_order_notifications_to_manufacturers(order, request=None, site_url: str = None):
    """
    Groups all items in the given order by their manufacturer,
    and dispatches an email to each manufacturer for their particular ordered product(s).
    Uses AuditLog for idempotency to avoid sending duplicate emails for the same order.
    """
    from .models import AuditLog

    # Group items by manufacturer (auto-resolving manufacturer from product if missing)
    from .models import Product
    items = order.items.select_related('manufacturer', 'manufacturer__user', 'product', 'product__manufacturer', 'product__manufacturer__user').all()
    mfg_items_map = {}
    for item in items:
        mfg = item.manufacturer
        if not mfg and item.product and getattr(item.product, 'manufacturer', None):
            mfg = item.product.manufacturer
            item.manufacturer = mfg
            item.save(update_fields=['manufacturer'])
        elif not mfg and item.product_title:
            prod_match = Product.objects.filter(title__iexact=item.product_title).select_related('manufacturer').first()
            if prod_match and prod_match.manufacturer:
                mfg = prod_match.manufacturer
                item.manufacturer = mfg
                item.save(update_fields=['manufacturer'])

        if not mfg:
            continue

        mfg_id = mfg.id
        if mfg_id not in mfg_items_map:
            mfg_items_map[mfg_id] = {
                'profile': mfg,
                'items': []
            }
        mfg_items_map[mfg_id]['items'].append(item)

    results = {}
    for mfg_id, data in mfg_items_map.items():
        profile = data['profile']
        mfg_items = data['items']

        audit_key = f"{order.order_number}_{profile.id}"
        # Prevent duplicate notifications if already sent
        if AuditLog.objects.filter(action='MANUFACTURER_ORDER_EMAIL_SENT', target_id=audit_key).exists():
            results[profile.business_name] = {'sent': True, 'skipped': 'Already sent'}
            continue

        try:
            sent, info = send_manufacturer_order_notification(
                order=order,
                manufacturer_profile=profile,
                items_for_mfg=mfg_items,
                request=request,
                site_url=site_url
            )
            results[profile.business_name] = {'sent': sent, 'info': info}

            if sent:
                AuditLog.objects.create(
                    user=profile.user,
                    action='MANUFACTURER_ORDER_EMAIL_SENT',
                    target_model='Order',
                    target_id=audit_key,
                    details={
                        'order_number': order.order_number,
                        'manufacturer_id': profile.id,
                        'business_name': profile.business_name,
                        'items_count': len(mfg_items),
                        'recipient_email': profile.contact_email or (profile.user.email if profile.user else '')
                    }
                )
        except Exception as exc:
            logger.exception("Failed to dispatch order notification to manufacturer %s: %s", profile.business_name, exc)
            results[profile.business_name] = {'sent': False, 'error': str(exc)}

    return results



def send_customer_delivery_status_email(order, status: str, item=None, tracking_number: str = None, courier_partner: str = None, request=None, site_url: str = None):
    """
    Sends an email to the customer for every update on their product delivery process:
    - PACKED: Artisan producer has prepared and sealed the product in protective wrap
    - DISPATCHED: Handed over to express air cargo with tracking/AWB details
    - DELIVERED: Parcel delivered to doorstep; prompt to scan unboxing QR code for wallet rewards
    - Other status updates (PENDING, CONFIRMED, etc.)
    """
    recipient_email = (order.customer_email or (order.user.email if order.user else '')).strip()
    if not recipient_email:
        logger.warning("No customer email available for Order #%s", getattr(order, 'order_number', 'UNKNOWN'))
        return False, {"error": "No customer email available."}

    norm_status = (status or getattr(order, 'status', '') or '').strip().upper()
    customer_name = getattr(order, 'customer_name', '') or (order.user.get_full_name() if getattr(order, 'user', None) else '') or (order.user.username if getattr(order, 'user', None) else '') or 'Valued Customer'
    base_url = (site_url or get_site_url(request)).rstrip('/')
    account_url = f"{base_url}/account"

    # Target items to display
    target_items = [item] if item else list(order.items.all())
    item_title = item.product_title if item else (target_items[0].product_title if target_items else "Pickle Selection")
    mfg_name = (item.manufacturer.business_name if (item and getattr(item, 'manufacturer', None)) else (
        target_items[0].manufacturer.business_name if (target_items and getattr(target_items[0], 'manufacturer', None)) else "Wangs Artisan Kitchen"
    ))

    # Effective tracking details
    eff_tracking = (tracking_number or getattr(order, 'tracking_number', '') or '').strip()
    eff_courier = (courier_partner or getattr(order, 'courier_partner', '') or 'Air Cargo Express').strip()

    # Dynamic status content
    if norm_status in ('PACKED', 'PROCESSING'):
        subject = f"📦 Your Order #{order.order_number} has been Packed! - Wangs"
        badge_text = "PACKED & PREPARED"
        badge_bg = "#eff6ff"
        badge_color = "#1d4ed8"
        badge_border = "#bfdbfe"
        headline = "Your Artisanal Order has been Packed!"
        subtitle = "Sealed airtight in protective wrap and awaiting courier pickup"
        lead_msg = (
            f"Great news, <strong>{customer_name}</strong>! Your order item <strong>'{item_title}'</strong> "
            f"has been prepared and safely packed by <strong>{mfg_name}</strong>. "
            f"Our air cargo logistics partner will pick up the package within 24–48 business hours for express transit."
        )

    elif norm_status == 'DISPATCHED':
        subject = f"✈️ Your Order #{order.order_number} has been Dispatched via Air Cargo! - Wangs"
        badge_text = "AIR CARGO DISPATCHED"
        badge_bg = "#f3e8ff"
        badge_color = "#6b21a8"
        badge_border = "#d8b4fe"
        headline = "Your Parcel is on the Way!"
        subtitle = f"In flight via {eff_courier} Priority Air Cargo"
        lead_msg = (
            f"Hello <strong>{customer_name}</strong>, your parcel has been handed over for air transit! "
            f"It is en route to <strong>{order.shipping_city}, {order.shipping_state} ({order.shipping_postal_code})</strong>. "
            f"Priority express air delivery is estimated in 2–4 business days."
        )

    elif norm_status == 'DELIVERED':
        subject = f"🎉 Your Order #{order.order_number} has been Delivered! Scan to Claim Rewards - Wangs"
        badge_text = "DELIVERED TO DOORSTEP"
        badge_bg = "#ecfdf5"
        badge_color = "#047857"
        badge_border = "#a7f3d0"
        headline = "Your Package has been Delivered!"
        subtitle = f"Delivered to {order.shipping_city}, {order.shipping_state}"
        lead_msg = (
            f"Hello <strong>{customer_name}</strong>, your Wangs authentic pickle order has been successfully "
            f"delivered to your doorstep! We hope you love the rich flavours, wood smoke aroma, and heritage spices."
        )

    else:
        subject = f"📋 Delivery Process Update for Order #{order.order_number} ({norm_status}) - Wangs"
        badge_text = f"STATUS: {norm_status}"
        badge_bg = "#f5f5f4"
        badge_color = "#44403c"
        badge_border = "#d6d3d1"
        headline = "Delivery Process Update"
        subtitle = f"Latest fulfillment status for Order #{order.order_number}"
        lead_msg = (
            f"Hello <strong>{customer_name}</strong>, there is an update on your order. "
            f"The current delivery status of your items is <strong>{norm_status}</strong>."
        )

    # Build items HTML table
    items_html = ""
    for it in target_items:
        items_html += f"""
        <tr style="border-bottom:1px solid #f0ede6;">
          <td style="padding:12px 10px;font-size:13px;color:#1c1917;vertical-align:middle;">
            <strong style="color:#0e3820;display:block;font-size:13px;">{it.product_title}</strong>
            <span style="font-size:11px;color:#78716c;">Pack: {it.weight_grams}g &middot; {it.quantity} {('Jar' if it.quantity == 1 else 'Jars')}</span>
          </td>
          <td style="padding:12px 10px;font-size:12px;color:#57534e;vertical-align:middle;text-align:center;">
            <span style="font-size:11px;font-weight:700;color:{badge_color};background:{badge_bg};padding:3px 8px;border-radius:6px;border:1px solid {badge_border};">
              {norm_status}
            </span>
          </td>
          <td style="padding:12px 10px;font-size:13px;text-align:right;font-family:monospace;font-weight:700;color:#1c1917;vertical-align:middle;">
            ₹{it.subtotal}
          </td>
        </tr>
        """

    # Unboxing QR reward banner if DELIVERED
    reward_box_html = ""
    if norm_status == 'DELIVERED':
        reward_box_html = f"""
        <div style="background:#fffbeb;border:2px dashed #f59e0b;border-radius:14px;padding:16px 20px;margin:22px 0;text-align:left;">
          <div style="display:flex;align-items:center;margin-bottom:8px;">
            <span style="font-size:20px;margin-right:8px;">🎁</span>
            <strong style="color:#92400e;font-size:14px;">Scan Your Unboxing QR Code to Claim Rewards!</strong>
          </div>
          <p style="margin:0;font-size:12.5px;color:#78350f;line-height:1.5;">
            Look at the bottom of the shipping label attached to your parcel box. Open your phone camera or the Wangs app and scan the <strong>Customer Unboxing QR</strong> to instantly credit cash points into your Wangs Rewards Wallet!
          </p>
          <div style="margin-top:12px;">
            <a href="{account_url}" style="background:#0e3820;color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;padding:8px 16px;border-radius:8px;display:inline-block;">
              Open Wallet & View Balance &rarr;
            </a>
          </div>
        </div>
        """

    # Tracking box if tracking exists
    tracking_box_html = ""
    if eff_tracking:
        tracking_box_html = f"""
        <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:12px;padding:14px 18px;margin:18px 0;">
          <span style="font-size:10px;font-weight:800;color:#6b21a8;text-transform:uppercase;letter-spacing:1px;display:block;">Air Cargo Tracking Details</span>
          <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:12px;align-items:center;">
            <div>
              <span style="font-size:11px;color:#78716c;">Courier Partner:</span>
              <strong style="font-size:13px;color:#1c1917;display:block;">{eff_courier}</strong>
            </div>
            <div style="margin-left:auto;">
              <span style="font-size:11px;color:#78716c;">AWB Consignment No:</span>
              <span style="font-family:monospace;font-size:13px;font-weight:800;color:#6b21a8;background:#ffffff;padding:4px 8px;border-radius:6px;border:1px solid #d8b4fe;display:inline-block;">
                {eff_tracking}
              </span>
            </div>
          </div>
        </div>
        """

    phone_display = f"<br />Phone: <span style='font-family:monospace;'>{order.customer_phone}</span>" if getattr(order, 'customer_phone', None) else ""

    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>{subject}</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f8f6f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1917;-webkit-font-smoothing:antialiased;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8f6f0;padding:24px 12px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.06);border:1px solid #e7dfd4;">
              
              <!-- Brand Header -->
              <tr>
                <td style="background:linear-gradient(135deg, #072214 0%, #0e3820 60%, #154c2e 100%);padding:28px 24px;text-align:center;border-bottom:3px solid #f59e0b;">
                  <div style="display:inline-block;background:#f59e0b;color:#072214;font-family:Georgia,serif;font-size:24px;font-weight:900;letter-spacing:4px;padding:4px 18px;border-radius:8px;margin-bottom:8px;">
                    WANGS
                  </div>
                  <p style="margin:0;color:#d1fae5;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">
                    Authentic Food Marketplace &middot; Delivery Tracking
                  </p>
                </td>
              </tr>

              <!-- Status Banner -->
              <tr>
                <td style="padding:28px 24px 16px 24px;">
                  <div style="display:inline-block;background:{badge_bg};color:{badge_color};border:1px solid {badge_border};font-size:11px;font-weight:800;letter-spacing:1px;padding:4px 12px;border-radius:999px;margin-bottom:12px;">
                    ● {badge_text}
                  </div>
                  <h1 style="margin:0 0 6px 0;font-family:Georgia,serif;font-size:22px;color:#0e3820;font-weight:800;line-height:1.3;">
                    {headline}
                  </h1>
                  <p style="margin:0 0 16px 0;color:#78716c;font-size:13px;line-height:1.4;">
                    {subtitle}
                  </p>
                  <p style="margin:0;color:#292524;font-size:13.5px;line-height:1.6;">
                    {lead_msg}
                  </p>
                </td>
              </tr>

              <!-- Tracking Box (if dispatched) -->
              <tr>
                <td style="padding:0 24px;">
                  {tracking_box_html}
                </td>
              </tr>

              <!-- Reward Box (if delivered) -->
              <tr>
                <td style="padding:0 24px;">
                  {reward_box_html}
                </td>
              </tr>

              <!-- Order Summary Section -->
              <tr>
                <td style="padding:12px 24px 20px 24px;">
                  <div style="border:1px solid #e7dfd4;border-radius:14px;overflow:hidden;background:#faf9f6;">
                    
                    <div style="padding:12px 16px;background:#f0ede6;border-bottom:1px solid #e7dfd4;display:flex;justify-content:space-between;align-items:center;">
                      <span style="font-size:11px;font-weight:800;color:#0e3820;text-transform:uppercase;letter-spacing:0.5px;">
                        Order Reference: #{order.order_number}
                      </span>
                      <span style="font-size:11px;color:#78716c;font-family:monospace;">
                        Total: ₹{order.total_amount}
                      </span>
                    </div>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                      <thead>
                        <tr style="background:#fcfbf9;border-bottom:1px solid #f0ede6;">
                          <th align="left" style="padding:10px 10px;font-size:11px;color:#78716c;font-weight:700;text-transform:uppercase;">Item</th>
                          <th align="center" style="padding:10px 10px;font-size:11px;color:#78716c;font-weight:700;text-transform:uppercase;">Status</th>
                          <th align="right" style="padding:10px 10px;font-size:11px;color:#78716c;font-weight:700;text-transform:uppercase;">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items_html}
                      </tbody>
                    </table>

                    <!-- Delivery Address Bar -->
                    <div style="padding:14px 16px;background:#ffffff;border-top:1px solid #f0ede6;font-size:12px;color:#57534e;line-height:1.5;">
                      <strong style="color:#1c1917;display:block;margin-bottom:2px;">Destination Address:</strong>
                      {order.shipping_address_line1}, {order.shipping_city}, {order.shipping_state} - {order.shipping_postal_code}
                      {phone_display}
                    </div>
                  </div>
                </td>
              </tr>

              <!-- Call to Action -->
              <tr>
                <td style="padding:10px 24px 28px 24px;text-align:center;">
                  <a href="{account_url}" style="background:#0e3820;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:12px 28px;border-radius:12px;display:inline-block;box-shadow:0 4px 12px rgba(14,56,32,0.25);">
                    View &amp; Track Order in Your Account &rarr;
                  </a>
                  <p style="margin:12px 0 0 0;font-size:11px;color:#a8a29e;">
                    Have questions? Email us at <a href="mailto:wangssupport@gmail.com" style="color:#0e3820;text-decoration:underline;">wangssupport@gmail.com</a>
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color:#f0ede6;padding:18px 24px;text-align:center;font-size:11px;color:#78716c;line-height:1.5;border-top:1px solid #e7dfd4;">
                  <p style="margin:0 0 4px 0;font-weight:600;color:#44403c;">
                    Wangs Authentic Food Marketplace
                  </p>
                  <p style="margin:0;">
                    Connecting connoisseurs nationwide to indigenous, wood-smoked, and fermented culinary traditions.
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
    print(f"[WANGS CUSTOMER DELIVERY EMAIL DISPATCH]")
    print(f"Recipient:      {recipient_email}")
    print(f"Customer Name:  {customer_name}")
    print(f"Order:          #{order.order_number}")
    print(f"Status Update:  {norm_status}")
    print(f"Subject:        {subject}")
    print(f"==========================================\n")

    sent, info = dispatch_email(recipient_email, subject, html_content)
    if sent:
        try:
            from .models import AuditLog
            AuditLog.objects.create(
                user=order.user,
                action='CUSTOMER_DELIVERY_STATUS_EMAIL_SENT',
                target_model='Order',
                target_id=f"{order.order_number}_{norm_status}",
                details={
                    'order_number': order.order_number,
                    'status': norm_status,
                    'recipient_email': recipient_email,
                    'tracking_number': eff_tracking
                }
            )
        except Exception:
            pass

    return sent, info
