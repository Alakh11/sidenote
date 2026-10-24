import asyncio
import sys
from unittest.mock import AsyncMock, MagicMock

import pytest

for name in ("firebase_admin", "firebase_admin.messaging", "bot_handlers", "whatsapp_service", "database",
             "whatsapp_handlers.search_handlers", "whatsapp_handlers.groups_search", "whatsapp_handlers.bot_utils"):
    sys.modules.setdefault(name, MagicMock())

import routers.groups as groups  # noqa: E402
from fastapi import HTTPException  # noqa: E402


def fake_db(mobile="919999999999"):
    rows = iter([{"name": "Ravi Kumar", "mobile": mobile}, {"name": "Asha"}, {"name": "Goa Trip"}, (1,)])
    cursor = MagicMock()
    cursor.fetchone.side_effect = lambda: next(rows)
    conn = MagicMock()
    conn.cursor.return_value = cursor
    return lambda: conn


def remind(monkeypatch, channel="app", tokens=(), sent=0, mobile="919999999999", wa_result=None):
    monkeypatch.setattr(groups, "get_db", fake_db(mobile))
    monkeypatch.setattr(groups, "device_tokens", lambda uid: list(tokens))
    monkeypatch.setattr(groups, "send_push", lambda *a, **k: sent)
    wa = AsyncMock(return_value=wa_result or {"status": "success"})
    monkeypatch.setattr(groups, "send_whatsapp_text", wa)
    payload = groups.RemindPayload(target_user_id=2, amount=250, from_user_id=1, channel=channel)
    return asyncio.run(groups.send_settlement_reminder(7, payload)), wa


def test_app_user_gets_a_push(monkeypatch):
    result, wa = remind(monkeypatch, tokens=["t"], sent=1)
    assert result["channel"] == "app" and not wa.called


@pytest.mark.parametrize("tokens,sent", [((), 0), (("stale",), 0)])
def test_unreachable_on_app_offers_other_ways(monkeypatch, tokens, sent):
    with pytest.raises(HTTPException) as err:
        remind(monkeypatch, tokens=tokens, sent=sent)
    assert err.value.status_code == 409
    assert err.value.detail["code"] == "not_on_app" and err.value.detail["can_whatsapp"] is True


def test_whatsapp_only_when_the_sender_chooses_it(monkeypatch):
    result, wa = remind(monkeypatch, channel="whatsapp")
    assert result["channel"] == "whatsapp" and wa.await_args.args[0] == "919999999999"


def test_whatsapp_needs_a_number(monkeypatch):
    with pytest.raises(HTTPException) as err:
        remind(monkeypatch, channel="whatsapp", mobile=None)
    assert err.value.status_code == 400
