import asyncio
import sys
from unittest.mock import AsyncMock, MagicMock

import pytest

for name in ("firebase_admin", "firebase_admin.messaging", "bot_handlers", "whatsapp_service"):
    sys.modules.setdefault(name, MagicMock())

import routers.auth as auth  # noqa: E402
from fastapi import HTTPException  # noqa: E402


def run(phone_result, email_ok, email="a@b.in"):
    cursor = MagicMock()
    cursor.fetchone.return_value = None  # no recent activity: the Meta template path
    auth.send_whatsapp_template = AsyncMock(return_value=phone_result)
    auth.send_otp_email = AsyncMock(return_value=email_ok)
    return asyncio.run(auth.generate_and_send_otp(cursor, "919999999999", "Asha", email))


def test_code_goes_to_whatsapp_and_email():
    assert run({"status": "success"}, True) == ["whatsapp", "email"]
    assert auth.otp_sent_message(["whatsapp", "email"]) == "OTP sent to your email/WhatsApp!"
    # Email on file but it failed to send (or is still on its way): still name both
    assert auth.otp_sent_message(["whatsapp"], "a@b.in") == "OTP sent to your email/WhatsApp!"
    assert auth.otp_sent_message(["whatsapp"], None) == "OTP sent to your WhatsApp!"


def test_email_still_works_when_whatsapp_fails():
    assert run({"status": "error"}, True) == ["email"]


def test_no_email_on_file_means_whatsapp_only():
    assert run({"status": "success"}, False, email=None) == ["whatsapp"]


def test_nothing_delivered_is_an_error():
    with pytest.raises(HTTPException):
        run({"status": "error"}, False)


@pytest.mark.parametrize("password,ok", [
    ("Secret#123", True),
    ("secret#123", False),
    ("SECRET#123", False),
    ("Secret#abc", False),
    ("Secret1234", False),
    ("Se#1", False),
])
def test_new_password_rules(password, ok):
    assert (auth.password_problem(password) is None) == ok


def test_signup_needs_the_terms_box(monkeypatch):
    cursor = MagicMock()
    cursor.fetchone.return_value = None
    conn = MagicMock()
    conn.cursor.return_value = cursor
    monkeypatch.setattr(auth, "get_db", lambda: conn)
    monkeypatch.setattr(auth, "is_country_allowed", lambda *a: True)
    payload = auth.RegisterPayload(name="Asha", contact="919999999999", password="Secret#123", contact_type="mobile", email="a@b.in")
    with pytest.raises(HTTPException) as err:
        asyncio.run(auth.register(payload))
    assert err.value.status_code == 400 and "Terms" in err.value.detail
    assert not any("INSERT INTO users" in str(c) for c in cursor.execute.call_args_list)
