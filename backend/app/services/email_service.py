import os
import json
import urllib.request
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formatdate, make_msgid
from app.config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SENDER_EMAIL


def send_otp_email(to_email: str, otp_code: str) -> bool:
    """
    Sends a professional OTP email.
    If RESEND_API_KEY is present, uses Resend HTTP API (works on Render free tier).
    Otherwise, falls back to SMTP (blocked on Render free tier).
    """
    resend_api_key = os.getenv("RESEND_API_KEY")

    if not resend_api_key and (not SMTP_PASSWORD or SMTP_PASSWORD.strip() == ""):
        print(f"WARNING: Neither RESEND_API_KEY nor SMTP_PASSWORD is set. OTP NOT sent.")
        return False

    # ── Plain text version ──
    plain_text = f"""
VistaarWater — Verification Code

Your one-time verification code is: {otp_code}

This code is valid for 10 minutes.
Do not share this code with anyone.

If you did not request this code, please ignore this email.

— VistaarWater Team
    """.strip()

    # ── HTML version ──
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VistaarWater Verification Code</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f7fa;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fa;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="500" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#00b894,#00cec9);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:1px;">VistaarWater</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Custom Branded Water Bottle Platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 30px;">
              <p style="margin:0 0 12px;font-size:16px;color:#333;">Hello,</p>
              <p style="margin:0 0 28px;font-size:15px;color:#555;line-height:1.6;">
                We received a request to verify your email address for your VistaarWater account.
                Use the code below to complete the process:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:24px 0;">
                    <div style="display:inline-block;background:#f0fdf9;border:2px dashed #00b894;border-radius:12px;padding:20px 48px;">
                      <span style="font-size:42px;font-weight:800;letter-spacing:10px;color:#00b894;font-family:'Courier New',monospace;">{otp_code}</span>
                    </div>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-size:14px;color:#888;text-align:center;">
                ⏱ This code expires in <strong>10 minutes</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    # ── Strategy 1: Resend HTTP API (Bypasses Render SMTP Block) ──
    if resend_api_key:
        try:
            payload = {
                "from": f"VistaarWater <{SENDER_EMAIL}>",
                "to": [to_email],
                "subject": f"{otp_code} is your VistaarWater verification code",
                "html": html_content,
                "text": plain_text
            }
            req = urllib.request.Request(
                "https://api.resend.com/emails",
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {resend_api_key}",
                    "Content-Type": "application/json"
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=15) as response:
                if response.status in (200, 201):
                    print(f"[Email] OTP sent via Resend HTTP API to {to_email}")
                    return True
        except urllib.error.HTTPError as http_err:
            error_body = http_err.read().decode('utf-8', errors='ignore')
            print(f"[Email] Resend API failed with HTTP {http_err.code}: {error_body}. Falling back to SMTP...")
        except Exception as e:
            print(f"[Email] Resend API failed: {e}. Falling back to SMTP...")


    # ── Strategy 2: Traditional SMTP (Fallback, likely blocked on Free Tier) ──
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"{otp_code} is your VistaarWater verification code"
    msg["From"] = f"VistaarWater <{SENDER_EMAIL}>"
    msg["To"] = to_email
    msg["Reply-To"] = SENDER_EMAIL
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain="vistaarwater.com")
    msg["X-Mailer"] = "VistaarWater Mailer"
    msg["MIME-Version"] = "1.0"

    msg.attach(MIMEText(plain_text, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    # -- Strategy 1: SSL on port 465 (most reliable on cloud hosts like Render) --
    try:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(SMTP_HOST, 465, context=context, timeout=15) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SENDER_EMAIL, to_email, msg.as_string())
        print(f"[Email] OTP sent via SSL/465 to {to_email}")
        return True
    except ssl.SSLCertVerificationError:
        # Local dev on Windows may have missing root certs — try without verification
        try:
            context = ssl._create_unverified_context()
            with smtplib.SMTP_SSL(SMTP_HOST, 465, context=context, timeout=15) as server:
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(SENDER_EMAIL, to_email, msg.as_string())
            print(f"[Email] OTP sent via SSL/465 (unverified) to {to_email}")
            return True
        except Exception as e2:
            print(f"[Email] SSL/465 (unverified) also failed: {e2}. Trying STARTTLS/587...")
    except Exception as ssl_err:
        print(f"[Email] SSL/465 failed: {ssl_err}. Trying STARTTLS/587...")

    # -- Strategy 2: STARTTLS on port 587 (fallback) --
    try:
        with smtplib.SMTP(SMTP_HOST, 587, timeout=15) as server:
            server.ehlo()
            server.starttls(context=ssl.create_default_context())
            server.ehlo()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SENDER_EMAIL, to_email, msg.as_string())
        print(f"[Email] OTP sent via STARTTLS/587 to {to_email}")
        return True
    except Exception as tls_err:
        print(f"[Email] Both methods failed. STARTTLS error: {tls_err}")
        return False
