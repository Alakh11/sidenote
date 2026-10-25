import sys
from unittest.mock import MagicMock

import pytest

for name in ("firebase_admin", "firebase_admin.messaging", "database"):
    sys.modules.setdefault(name, MagicMock())

import routers.features as features  # noqa: E402
from fastapi import HTTPException  # noqa: E402


def call(monkeypatch, fn, row, **kwargs):
    cursor = MagicMock()
    cursor.fetchone.side_effect = [row, {"name": "Asha Rao"}]
    conn = MagicMock()
    conn.cursor.return_value = cursor
    monkeypatch.setattr(features, "get_db", lambda: conn)
    background = MagicMock()
    return fn(background=background, **kwargs), cursor, background


def test_owner_can_link_a_loan_to_the_lender_who_is_notified(monkeypatch):
    result, cursor, background = call(monkeypatch, features.link_loan_lender, {"id": 3, "name": "Car", "user_id": 1},
                                      loan_id=3, payload=features.LinkPersonPayload(user_id=2), user_id=1)
    assert result == {"lender_user_id": 2}
    assert any("UPDATE loans SET lender_user_id" in str(c) for c in cursor.execute.call_args_list)
    assert background.add_task.called


@pytest.mark.parametrize("fn,kw", [
    (features.link_loan_lender, {"loan_id": 3}),
    (features.link_borrower, {"borrower_id": 3}),
])
def test_only_the_owner_can_link(monkeypatch, fn, kw):
    with pytest.raises(HTTPException) as err:
        call(monkeypatch, fn, {"id": 3, "name": "x", "user_id": 99}, payload=features.LinkPersonPayload(user_id=2), user_id=1, **kw)
    assert err.value.status_code == 404


def test_unlinking_sends_no_notification(monkeypatch):
    _, _, background = call(monkeypatch, features.link_borrower, {"id": 3, "name": "Ravi", "user_id": 1},
                            borrower_id=3, payload=features.LinkPersonPayload(user_id=None), user_id=1)
    assert not background.add_task.called
