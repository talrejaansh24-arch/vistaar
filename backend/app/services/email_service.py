import os
import json
import urllib.request
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formatdate, make_msgid
from app.config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SENDER_EMAIL
from typing import Tuple

def send_email_base(to_email: str, subject: str, plain_text: str, html_content: str) -> Tuple[bool, str]:
    """
    Sends an email using either Resend API or SMTP as fallback.
    Common core function for all email dispatches.
    """
    resend_api_key = os.getenv("RESEND_API_KEY")

    if not resend_api_key and (not SMTP_PASSWORD or SMTP_PASSWORD.strip() == ""):
        print(f"WARNING: Neither RESEND_API_KEY nor SMTP_PASSWORD is set. Email NOT sent.")
        return False, "Server email configuration is missing (no API key or SMTP password)."

    # ── Strategy 1: Resend HTTP API (Bypasses Render SMTP Block) ──
    resend_err = ""
    if resend_api_key:
        # Resend rejects @gmail.com senders. Use their testing address as fallback.
        resend_from = SENDER_EMAIL
        if "@gmail.com" in SENDER_EMAIL.lower():
            resend_from = "onboarding@resend.dev"
            print(f"[Email] SENDER_EMAIL is Gmail, using Resend testing sender: {resend_from}")
        try:
            payload = {
                "from": f"VistaarWater <{resend_from}>",
                "to": [to_email],
                "subject": subject,
                "html": html_content,
                "text": plain_text
            }
            req = urllib.request.Request(
                "https://api.resend.com/emails",
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {resend_api_key}",
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=15) as response:
                if response.status in (200, 201):
                    print(f"[Email] Sent via Resend HTTP API to {to_email}")
                    return True, ""
        except urllib.error.HTTPError as http_err:
            error_body = http_err.read().decode('utf-8', errors='ignore')
            resend_err = f"Resend API HTTP {http_err.code}: {error_body}"
            print(f"[Email] {resend_err}. Falling back to SMTP...")
        except Exception as e:
            resend_err = f"Resend API error: {e}"
            print(f"[Email] {resend_err}. Falling back to SMTP...")

    # ── Strategy 2: Traditional SMTP (Fallback, likely blocked on Free Tier) ──
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"VistaarWater <{SENDER_EMAIL}>"
    msg["To"] = to_email
    msg["Reply-To"] = SENDER_EMAIL
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain="vistaarwater.com")
    msg["X-Mailer"] = "VistaarWater Mailer"
    msg["MIME-Version"] = "1.0"

    msg.attach(MIMEText(plain_text, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    smtp_err = ""
    # -- SSL on port 465 (most reliable on cloud hosts like Render) --
    try:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(SMTP_HOST, 465, context=context, timeout=15) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SENDER_EMAIL, to_email, msg.as_string())
        print(f"[Email] Sent via SSL/465 to {to_email}")
        return True, ""
    except ssl.SSLCertVerificationError:
        try:
            context = ssl._create_unverified_context()
            with smtplib.SMTP_SSL(SMTP_HOST, 465, context=context, timeout=15) as server:
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(SENDER_EMAIL, to_email, msg.as_string())
            print(f"[Email] Sent via SSL/465 (unverified) to {to_email}")
            return True, ""
        except Exception as e2:
            smtp_err = str(e2)
            print(f"[Email] SSL/465 (unverified) also failed: {e2}. Trying STARTTLS/587...")
    except Exception as ssl_err:
        smtp_err = str(ssl_err)
        print(f"[Email] SSL/465 failed: {ssl_err}. Trying STARTTLS/587...")

    # -- STARTTLS on port 587 (fallback) --
    try:
        with smtplib.SMTP(SMTP_HOST, 587, timeout=15) as server:
            server.ehlo()
            server.starttls(context=ssl.create_default_context())
            server.ehlo()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SENDER_EMAIL, to_email, msg.as_string())
        print(f"[Email] Sent via STARTTLS/587 to {to_email}")
        return True, ""
    except Exception as tls_err:
        smtp_err = str(tls_err)
        print(f"[Email] Both methods failed. STARTTLS error: {tls_err}")
        
        # Construct final error message
        final_err = "Email sending failed."
        if resend_err:
            final_err += f" {resend_err}."
        if "Network is unreachable" in smtp_err or "101" in smtp_err:
            final_err += " SMTP is blocked by Render Free Tier firewall."
        return False, final_err


def send_otp_email(to_email: str, otp_code: str) -> Tuple[bool, str]:
    """Sends a verification OTP code to the user."""
    plain_text = f"VistaarWater — Verification Code\n\nYour one-time verification code is: {otp_code}\n\nThis code is valid for 10 minutes.\nDo not share this code."
    
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>VistaarWater Verification Code</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f7fa;font-family:Arial,sans-serif;">
  <table width="100%" style="background-color:#f4f7fa;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="500" style="background:#ffffff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#00b894,#00cec9);padding:32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;">VistaarWater</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Custom Branded Water Bottle Platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 12px;font-size:16px;">Hello,</p>
              <p style="margin:0 0 28px;font-size:15px;color:#555;line-height:1.6;">
                Use the verification code below to access your VistaarWater account:
              </p>
              <div style="text-align:center;background:#f0fdf9;border:2px dashed #00b894;border-radius:12px;padding:20px;margin-bottom:20px;">
                <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#00b894;">{otp_code}</span>
              </div>
              <p style="font-size:13px;color:#888;text-align:center;">⏱ Valid for 10 minutes</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
    
    return send_email_base(to_email, f"{otp_code} is your VistaarWater verification code", plain_text, html_content)


def send_order_notification_email(order, user, items_details) -> bool:
    """Sends dynamic order information to the admin mail list."""
    subject = f"🚨 New Order Placed: Order #{order.id}"
    
    # Construct items HTML table
    items_html = ""
    for item in items_details:
        preview_img = f'<img src="{item["preview_url"]}" width="120" style="border-radius:6px; border:1px solid #ddd;" />' if item["preview_url"] else '<em>No Design (Quick Order)</em>'
        items_html += f"""
        <tr>
          <td style="padding:12px; border-bottom:1px solid #eee;">{item["name"]} ({item["size"]})</td>
          <td style="padding:12px; border-bottom:1px solid #eee; text-align:center;">{preview_img}</td>
          <td style="padding:12px; border-bottom:1px solid #eee; text-align:center;">{item["quantity"]}</td>
          <td style="padding:12px; border-bottom:1px solid #eee; text-align:right;">₹{item["unit_price"]}</td>
          <td style="padding:12px; border-bottom:1px solid #eee; text-align:right;">₹{item["subtotal"]}</td>
        </tr>
        """
        
    html_content = f"""<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Order #{order.id}</title>
    </head>
    <body style="font-family:Arial,sans-serif; color:#333; margin:0; padding:20px; background-color:#f8f9fa;">
      <div style="max-width:650px; background:#fff; margin:0 auto; padding:30px; border-radius:12px; border:1px solid #e1e4e6;">
        <h2 style="color:#00b894; margin-top:0; border-bottom:2px solid #00b894; padding-bottom:10px;">📦 Order Placed: #{order.id}</h2>
        
        <h3>👤 Customer Information:</h3>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Business Name:</strong> {user.business_name or '—'}</p>
        <p><strong>Phone:</strong> {user.phone or '—'}</p>
        
        <h3>🚚 Shipping & Billing Details:</h3>
        <p><strong>Shipping Address:</strong> {order.shipping_address or '—'}</p>
        <p><strong>Billing Address:</strong> {order.billing_address or '—'}</p>
        <p><strong>Payment Method:</strong> {order.payment_method or '—'}</p>
        <p><strong>Order Notes:</strong> {order.notes or '—'}</p>
        
        <h3>🛒 Order Items:</h3>
        <table width="100%" style="border-collapse:collapse; margin-top:15px;">
          <thead>
            <tr style="background:#f4f7fa;">
              <th style="padding:12px; text-align:left; border-bottom:2px solid #ddd;">Product</th>
              <th style="padding:12px; text-align:center; border-bottom:2px solid #ddd;">Design Mockup</th>
              <th style="padding:12px; text-align:center; border-bottom:2px solid #ddd;">Qty</th>
              <th style="padding:12px; text-align:right; border-bottom:2px solid #ddd;">Unit Price</th>
              <th style="padding:12px; text-align:right; border-bottom:2px solid #ddd;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items_html}
            <tr style="font-weight:bold; background:#fafafa;">
              <td colspan="4" style="padding:15px 12px; text-align:right;">Total Revenue:</td>
              <td style="padding:15px 12px; text-align:right; color:#00b894; font-size:18px;">₹{order.total_price}</td>
            </tr>
          </tbody>
        </table>
        
        <p style="margin-top:30px; font-size:12px; color:#888; text-align:center; border-top:1px solid #eee; padding-top:15px;">
          VistaarWater Admin System • Dynamic Orders Dispatcher
        </p>
      </div>
    </body>
    </html>"""

    plain_text = f"New Order #{order.id} placed by {user.email}. Total Revenue: ₹{order.total_price}."
    
    success = True
    for email in ["vistaarwater@gmail.com", "shubhjain0225@gmail.com"]:
        ok, err = send_email_base(email, subject, plain_text, html_content)
        if not ok:
            success = False
    return success


def send_inquiry_notification_email(inquiry) -> bool:
    """Sends inquiry quote request details to the admin mail list."""
    subject = f"📩 New Quote Inquiry: #{inquiry.id} from {inquiry.name}"
    
    html_content = f"""<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Inquiry #{inquiry.id}</title>
    </head>
    <body style="font-family:Arial,sans-serif; color:#333; margin:0; padding:20px; background-color:#f8f9fa;">
      <div style="max-width:600px; background:#fff; margin:0 auto; padding:30px; border-radius:12px; border:1px solid #e1e4e6;">
        <h2 style="color:#3498db; margin-top:0; border-bottom:2px solid #3498db; padding-bottom:10px;">📩 New Quote Inquiry Placed</h2>
        
        <p><strong>Inquiry ID:</strong> #{inquiry.id}</p>
        <p><strong>Name:</strong> {inquiry.name}</p>
        <p><strong>Business Name:</strong> {inquiry.business_name or '—'}</p>
        <p><strong>Email:</strong> {inquiry.email}</p>
        <p><strong>Phone:</strong> {inquiry.phone or '—'}</p>
        <p><strong>Bottle Size:</strong> {inquiry.bottle_size or '—'}</p>
        <p><strong>Target Quantity:</strong> {inquiry.quantity or '—'}</p>
        <p><strong>Requirements/Message:</strong></p>
        <div style="background:#f4f7fa; padding:15px; border-radius:8px; border:1px solid #eee; margin-top:10px; font-style:italic;">
          {inquiry.requirements or 'No special requirements listed.'}
        </div>
        
        <p style="margin-top:30px; font-size:12px; color:#888; text-align:center; border-top:1px solid #eee; padding-top:15px;">
          VistaarWater Admin System • Dynamic Lead Generation
        </p>
      </div>
    </body>
    </html>"""

    plain_text = f"New inquiry #{inquiry.id} submitted by {inquiry.name} ({inquiry.email})."
    
    success = True
    for email in ["vistaarwater@gmail.com", "shubhjain0225@gmail.com"]:
        ok, err = send_email_base(email, subject, plain_text, html_content)
        if not ok:
            success = False
    return success
