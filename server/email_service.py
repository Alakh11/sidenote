"""Outgoing email through the SideNote mailbox (Zoho Mail SMTP). Used for login codes so people can
still sign in when a WhatsApp message is blocked by Meta.

Env:
  SMTP_USER      mailbox to send from, e.g. support@sidenote.in
  SMTP_PASSWORD  a Zoho *app-specific* password (Zoho Mail → Settings → Security → App passwords)
  SMTP_HOST      default smtp.zoho.in (India data centre); use smtp.zoho.com for .com accounts
  SMTP_PORT      default 465 (SSL)
"""
import asyncio
import html as html_lib
import logging
import os
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr, make_msgid

logger = logging.getLogger(__name__)


def email_configured() -> bool:
    return bool(os.getenv("SMTP_USER") and os.getenv("SMTP_PASSWORD"))


def _send(to: str, subject: str, text: str, html: str) -> bool:
    user = os.getenv("SMTP_USER", "")
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = formataddr(("SideNote", user))
    msg["To"] = to
    msg["Message-ID"] = make_msgid(domain=user.split("@")[-1] or None)
    msg.set_content(text)
    msg.add_alternative(html, subtype="html")
    host = os.getenv("SMTP_HOST", "smtp.zoho.in")
    port = int(os.getenv("SMTP_PORT", "465"))
    try:
        if port == 465:
            with smtplib.SMTP_SSL(host, port, context=ssl.create_default_context(), timeout=15) as smtp:
                smtp.login(user, os.getenv("SMTP_PASSWORD", ""))
                smtp.send_message(msg)
        else:
            with smtplib.SMTP(host, port, timeout=15) as smtp:
                smtp.starttls(context=ssl.create_default_context())
                smtp.login(user, os.getenv("SMTP_PASSWORD", ""))
                smtp.send_message(msg)
        return True
    except Exception as e:
        logger.error(f"Email to {to} failed: {e}")
        return False


async def send_email(to: str, subject: str, text: str, html: str) -> bool:
    if not email_configured():
        logger.warning("Email skipped: SMTP_USER / SMTP_PASSWORD not set")
        return False
    return await asyncio.to_thread(_send, to, subject, text, html)


async def send_otp_email(to: str, name: str, code: str) -> bool:
    first = ((name or "").split() or ["there"])[0]
    safe_first = html_lib.escape(first)
    text = f"Hi {first},\n\nYour SideNote verification code is {code}. It's valid for 10 minutes.\n\nIf you didn't ask for this, you can ignore this email.\n\n— SideNote"
    html = f"""\
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:440px;margin:0 auto;padding:24px;color:#1a1a1a">
  <div style="font-size:22px;font-weight:800">Side<span style="color:#25D366">Note</span></div>
  <p style="font-size:15px;margin:24px 0 8px">Hi {safe_first},</p>
  <p style="font-size:15px;margin:0 0 16px">Your verification code is:</p>
  <div style="font-size:34px;font-weight:800;letter-spacing:8px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:14px;padding:16px;text-align:center">{code}</div>
  <p style="font-size:13px;color:#555;margin:16px 0 0">Valid for 10 minutes. If you didn't ask for this, you can ignore this email.</p>
</div>"""
    return await send_email(to, f"{code} is your SideNote code", text, html)
