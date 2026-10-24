import sys
from unittest.mock import MagicMock

import pytest

for name in ("firebase_admin", "firebase_admin.messaging", "bot_handlers", "whatsapp_service"):
    sys.modules.setdefault(name, MagicMock())

from push_service import mask_amounts  # noqa: E402
import routers.app_chat as app_chat  # noqa: E402


@pytest.mark.parametrize("text,masked", [
    ("Ravi split ₹1,200 for Dinner. Your share: ₹600", "Ravi split ₹••• for Dinner. Your share: ₹•••"),
    ("Budget alert: Rs. 4500 spent", "Budget alert: ₹••• spent"),
    ("Room 204 booked", "Room 204 booked"),
])
def test_hidden_amounts_in_notification_previews(text, masked):
    assert mask_amounts(text) == masked


GROUP = {"id": 1, "name": "Goa Trip"}


@pytest.mark.parametrize("typed,command", [
    ("@goa settle @Alakh", "@goa settle @alakh"),
    ("@goatrip settle @Alakh", "@goa settle @alakh"),
    ("group @goa week", "group @goa week"),
    ("500 dinner @ravi", "@goa 500 dinner @ravi"),
    ("rm 12", "group rm 12"),
    ("new code", "new code goa"),
    ("hello", None),
])
def test_group_thread_commands(typed, command):
    assert app_chat._to_group_command(app_chat._strip_group_prefix(typed, GROUP), "goa") == command


def test_group_thread_replies_drop_the_group_prefix():
    reply = "👉 Reply `@goa settle @ravi` to mark as paid. Try: @group_name 500 food. Next: group @goa history 2"
    assert app_chat._clean_group_reply(reply) == "👉 Reply `settle @ravi` to mark as paid. Try: 500 food. Next: history 2"


def test_alias_is_unique_among_the_users_groups(monkeypatch):
    groups = [{"id": 1, "name": "Chaturvedi House"}, {"id": 2, "name": "Chaturvedi Trip"}]
    monkeypatch.setattr(app_chat, "_user_groups", lambda _uid: groups)
    assert app_chat._group_alias(9, groups[0]) == "house"
    assert app_chat._group_alias(9, groups[1]) == "trip"
