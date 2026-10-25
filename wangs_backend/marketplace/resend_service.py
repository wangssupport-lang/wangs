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
    host_user = getattr(settings, 'EMAIL_HOST_USER', '')
    host_pass = getattr(settings, 'EMAIL_HOST_PASSWORD', '')
    if not host_user or not host_pass:
        return False, {"error": "SMTP credentials (EMAIL_HOST_USER / EMAIL_HOST_PASSWORD) not configured."}

    try:
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', host_user) or host_user
        msg = EmailMultiAlternatives(
            subject=subject,
            body="Your Wangs verification code is inside this email. Please view in an HTML-capable email client.",
            from_email=from_email,
            to=[to_email]
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)
        logger.info("Email successfully dispatched via SMTP to %s", to_email)
        return True, {"provider": "SMTP", "to": to_email}
    except Exception as exc:
        logger.error("SMTP email delivery failed to %s: %s", to_email, exc)
        return False, {"provider": "SMTP", "error": str(exc)}


def send_resend_email(to_email: str, subject: str, html_content: str):
    """
    Sends an email using the Resend API with the configured RESEND_API_KEY.
    """
    api_key = getattr(settings, 'RESEND_API_KEY', '')
    from_email = getattr(settings, 'RESEND_FROM_EMAIL', 'onboarding@resend.dev')

    if not api_key:
        return False, {"error": "RESEND_API_KEY not configured."}

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
    # Try SMTP first if credentials are present
    if getattr(settings, 'EMAIL_HOST_USER', '') and getattr(settings, 'EMAIL_HOST_PASSWORD', ''):
        sent, info = send_smtp_email(to_email, subject, html_content)
        if sent:
            return True, info

    # Try Resend if configured
    if getattr(settings, 'RESEND_API_KEY', ''):
        sent, info = send_resend_email(to_email, subject, html_content)
        if sent:
            return True, info
        return False, info

    return False, {"error": "No email delivery provider configured (configure EMAIL_HOST_USER & EMAIL_HOST_PASSWORD or RESEND_API_KEY)."}


def send_otp_email(to_email: str, otp_code: str, purpose: str = 'LOGIN'):
    """
    Renders an artisanal branded Wangs email and dispatches the OTP via Resend.
    """
    purpose_titles = {
        'LOGIN': 'Sign In to Your Wangs Account',
        'REGISTER': 'Complete Your Wangs Registration',
        'SELLER': 'Verify Your Wangs Producer Account',
    }
    title = purpose_titles.get(purpose, 'Your Wangs Verification Code')
    subject = f"Your Wangs OTP: {otp_code} — {title}"

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
                    Hello! Use the one-time verification code below to verify your email address on Wangs. This code will expire in <strong>10 minutes</strong>.
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
