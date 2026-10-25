import sys
from unittest.mock import MagicMock

import pytest

for name in ("firebase_admin", "firebase_admin.messaging", "bot_handlers", "whatsapp_service", "database",
             "whatsapp_handlers.search_handlers", "whatsapp_handlers.groups_search", "whatsapp_handlers.bot_utils"):
    sys.modules.setdefault(name, MagicMock())

import routers.groups as groups  # noqa: E402
from fastapi import HTTPException  # noqa: E402


class FakeCursor:
    def __init__(self, invite, members=2):
        self.invite, self.members, self.sql = invite, members, []

    def execute(self, sql, params=()):
        self.sql.append((" ".join(sql.split()), params))
        self.last = sql

    def fetchone(self):
        if "FROM group_invites gi" in self.last:
            return self.invite
        if "COUNT(*)" in self.last:
            return {"n": self.members}
        return {"name": "Ravi Kumar"}


def respond(monkeypatch, action, invite, members=2):
    cursor = FakeCursor(invite, members)
    conn = MagicMock()
    conn.cursor.return_value = cursor
    monkeypatch.setattr(groups, "get_db", lambda: conn)
    background = MagicMock()
    return groups.respond_to_invite(9, action, background, user_id=2), cursor, background


INVITE = {"id": 9, "group_id": 5, "inviter_id": 1, "invitee_id": 2, "status": "pending", "group_name": "Goa", "max_members": 20}


def test_accepting_joins_the_group_and_tells_the_inviter(monkeypatch):
    result, cursor, background = respond(monkeypatch, "accept", dict(INVITE))
    statements = [s for s, _ in cursor.sql]
    assert any(s.startswith("INSERT IGNORE INTO group_members") for s in statements)
    assert any("status = %s" in s for s in statements) and ("accepted", 9) in [p for _, p in cursor.sql]
    assert result["group_id"] == 5 and background.add_task.called


def test_declining_does_not_join(monkeypatch):
    _, cursor, background = respond(monkeypatch, "decline", dict(INVITE))
    assert not any(s.startswith("INSERT IGNORE INTO group_members") for s, _ in cursor.sql)
    assert not background.add_task.called


def test_full_group_or_used_invite_is_refused(monkeypatch):
    with pytest.raises(HTTPException):
        respond(monkeypatch, "accept", dict(INVITE), members=20)
    with pytest.raises(HTTPException):
        respond(monkeypatch, "accept", dict(INVITE, status="accepted"))
