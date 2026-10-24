import asyncio
import time
import html as html_lib
import logging
import os
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr, make_msgid

import httpx

logger = logging.getLogger(__name__)


SENDER = lambda: os.getenv("SMTP_USER") or os.getenv("ZOHO_FROM_ADDRESS", "")
_zoho_token: dict = {"value": None, "expires": 0.0}
_zoho_account: dict = {"id": os.getenv("ZOHO_MAIL_ACCOUNT_ID")}


def _api_configured() -> bool:
    return bool(os.getenv("ZOHO_CLIENT_ID") and os.getenv("ZOHO_CLIENT_SECRET") and os.getenv("ZOHO_REFRESH_TOKEN") and SENDER())


def _smtp_configured() -> bool:
    return bool(os.getenv("SMTP_USER") and os.getenv("SMTP_PASSWORD"))


def email_configured() -> bool:
    return _api_configured() or _smtp_configured()


async def _zoho_access_token(client: httpx.AsyncClient) -> str:
    if _zoho_token["value"] and time.time() < _zoho_token["expires"]:
        return _zoho_token["value"]
    domain = os.getenv("ZOHO_DOMAIN", "zoho.in")
    res = await client.post(f"https://accounts.{domain}/oauth/v2/token", params={
        "refresh_token": os.getenv("ZOHO_REFRESH_TOKEN"), "client_id": os.getenv("ZOHO_CLIENT_ID"),
        "client_secret": os.getenv("ZOHO_CLIENT_SECRET"), "grant_type": "refresh_token",
    })
    data = res.json()
    if "access_token" not in data:
        raise RuntimeError(f"Zoho token refresh failed: {data.get('error', res.status_code)}")
    _zoho_token.update(value=data["access_token"], expires=time.time() + int(data.get("expires_in", 3600)) - 120)
    return data["access_token"]


async def _send_api(to: str, subject: str, html: str) -> bool:
    domain = os.getenv("ZOHO_DOMAIN", "zoho.in")
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            headers = {"Authorization": f"Zoho-oauthtoken {await _zoho_access_token(client)}"}
            if not _zoho_account["id"]:
                accounts = (await client.get(f"https://mail.{domain}/api/accounts", headers=headers)).json().get("data") or []
                sender = SENDER().lower()
                match = next((a for a in accounts if sender in [str(x.get("mailId", "")).lower() for x in a.get("sendMailDetails", [])] or str(a.get("primaryEmailAddress", "")).lower() == sender), accounts[0] if accounts else None)
                if not match:
                    raise RuntimeError("No Zoho Mail account found for this token")
                _zoho_account["id"] = match["accountId"]
            res = await client.post(f"https://mail.{domain}/api/accounts/{_zoho_account['id']}/messages", headers=headers, json={
                "fromAddress": f"SideNote <{SENDER()}>", "toAddress": to, "subject": subject,
                "content": html, "mailFormat": "html", "askReceipt": "no",
            })
            if res.status_code >= 300:
                raise RuntimeError(f"Zoho Mail API {res.status_code}: {res.text[:200]}")
        return True
    except Exception as e:
        logger.error(f"Email (Zoho API) to {to} failed: {e}")
        return False


def _send_smtp(to: str, subject: str, text: str, html: str) -> bool:
    user = os.getenv("SMTP_USER", "")
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = formataddr(("SideNote", user))
    msg["To"] = to
    msg["Message-ID"] = make_msgid(domain=user.split("@")[-1] or None)
    msg.set_content(text)
    msg.add_alternative(html, subtype="html")
    host = os.getenv("SMTP_HOST", "smtp.zoho.in")
    first = int(os.getenv("SMTP_PORT", "465"))
    for port in dict.fromkeys([first, 587 if first == 465 else 465]):
        try:
            if port == 465:
                with smtplib.SMTP_SSL(host, port, context=ssl.create_default_context(), timeout=8) as smtp:
                    smtp.login(user, os.getenv("SMTP_PASSWORD", ""))
                    smtp.send_message(msg)
            else:
                with smtplib.SMTP(host, port, timeout=8) as smtp:
                    smtp.starttls(context=ssl.create_default_context())
                    smtp.login(user, os.getenv("SMTP_PASSWORD", ""))
                    smtp.send_message(msg)
            return True
        except Exception as e:
            # A timeout here usually means the host blocks outgoing SMTP (Render's free plan does)
            logger.error(f"Email (SMTP {host}:{port}) to {to} failed: {e}")
    return False


async def send_email(to: str, subject: str, text: str, html: str) -> bool:
    if not email_configured():
        logger.warning("Email skipped: set the ZOHO_* API variables (or SMTP_USER / SMTP_PASSWORD)")
        return False
    if _api_configured() and await _send_api(to, subject, html):
        return True
    if _smtp_configured():
        return await asyncio.to_thread(_send_smtp, to, subject, text, html)
    return False


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
