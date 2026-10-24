import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from routers.popups import PopupPayload, PopupStyle, _serialize, _validate


def test_style_accepts_hex_colours_and_known_alignments():
    style = PopupStyle(title_color="#ff0000", align="left")
    assert style.title_color == "#FF0000"
    with pytest.raises(ValidationError):
        PopupStyle(title_color="red")
    with pytest.raises(ValidationError):
        PopupStyle(align="justify")


def test_links_must_be_https():
    with pytest.raises(ValidationError):
        PopupPayload(title="Hi", cta_label="Open", cta_url="http://example.com")


@pytest.mark.parametrize("payload", [
    {"title": "Hi", "media_type": "image"},  # image without a file
    {"title": "Hi", "cta_label": "Open"},  # button without a link
    {"title": "Hi", "starts_at": "2026-10-25T10:00", "ends_at": "2026-10-25T09:00"},
])
def test_incomplete_popups_are_refused(payload):
    with pytest.raises(HTTPException):
        _validate(PopupPayload(**payload))


def test_serialized_style_fills_defaults():
    row = {"id": 1, "title": "Diwali", "body": None, "style": '{"title_color": "#FF9900"}', "media_type": "none",
           "media_url": None, "media_name": None, "cta_label": None, "cta_url": None, "audience": "[7]",
           "starts_at": None, "ends_at": None, "show_once": 1, "is_active": 1}
    out = _serialize(row)
    assert out["style"]["title_color"] == "#FF9900" and out["style"]["align"] == "center"
    assert out["user_ids"] == [7]
