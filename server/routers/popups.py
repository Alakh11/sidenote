from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from typing import Any, Optional
from datetime import datetime
from database import get_db
from security import get_current_user, require_admin
import json
import logging
import re

logger = logging.getLogger(__name__)

# In-app popups (wishes, offers, announcements) composed in the admin panel and shown in the app
admin_router = APIRouter(tags=["Admin Popups"])
router = APIRouter(tags=["Popups"])

HEX_COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")
ALIGNMENTS = {"left", "center", "right"}
MEDIA_TYPES = {"none", "image", "document"}


class PopupStyle(BaseModel):
    title_color: str = "#111111"
    body_color: str = "#4B5563"
    background_color: str = "#FFFFFF"
    accent_color: str = "#25D366"
    title_size: int = Field(default=24, ge=14, le=40)
    body_size: int = Field(default=15, ge=11, le=24)
    align: str = "center"
    title_bold: bool = True
    title_italic: bool = False
    body_bold: bool = False
    body_italic: bool = False
    body_underline: bool = False

    @field_validator("title_color", "body_color", "background_color", "accent_color")
    @classmethod
    def check_color(cls, v: str) -> str:
        if not HEX_COLOR.match(v):
            raise ValueError("colours must look like #RRGGBB")
        return v.upper()

    @field_validator("align")
    @classmethod
    def check_align(cls, v: str) -> str:
        if v not in ALIGNMENTS:
            raise ValueError("align must be left, center or right")
        return v


def _https(v: Optional[str]) -> Optional[str]:
    if v is None or not v.strip():
        return None
    v = v.strip()
    if not v.startswith("https://") or len(v) > 1024:
        raise ValueError("links must start with https:// (max 1024 characters)")
    return v


class PopupPayload(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    body: Optional[str] = Field(default=None, max_length=2000)
    style: PopupStyle = PopupStyle()
    media_type: str = "none"
    media_url: Optional[str] = None
    media_name: Optional[str] = Field(default=None, max_length=200)
    cta_label: Optional[str] = Field(default=None, max_length=60)
    cta_url: Optional[str] = None
    user_ids: list[int] = []  # empty = everyone
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    show_once: bool = True
    is_active: bool = True

    @field_validator("media_type")
    @classmethod
    def check_media_type(cls, v: str) -> str:
        if v not in MEDIA_TYPES:
            raise ValueError("media_type must be none, image or document")
        return v

    @field_validator("media_url", "cta_url")
    @classmethod
    def check_links(cls, v: Optional[str]) -> Optional[str]:
        return _https(v)


def _validate(p: PopupPayload):
    if p.media_type != "none" and not p.media_url:
        raise HTTPException(status_code=400, detail="Add the image or document, or choose no media.")
    if bool(p.cta_label) != bool(p.cta_url):
        raise HTTPException(status_code=400, detail="A button needs both a label and a link.")
    if p.starts_at and p.ends_at and p.ends_at <= p.starts_at:
        raise HTTPException(status_code=400, detail="The end time must be after the start time.")


def _row_values(p: PopupPayload):
    return (
        p.title.strip(), (p.body or "").strip() or None, json.dumps(p.style.model_dump()),
        p.media_type, p.media_url if p.media_type != "none" else None, p.media_name,
        p.cta_label, p.cta_url, json.dumps(p.user_ids) if p.user_ids else None,
        p.starts_at, p.ends_at, p.show_once, p.is_active,
    )


def _serialize(row: dict) -> dict:
    def as_json(v):
        if isinstance(v, (bytes, bytearray)):
            v = v.decode()
        return json.loads(v) if isinstance(v, str) else v
    return {
        "id": row["id"],
        "title": row["title"],
        "body": row["body"] or "",
        "style": {**PopupStyle().model_dump(), **(as_json(row["style"]) or {})},
        "media_type": row["media_type"],
        "media_url": row["media_url"],
        "media_name": row["media_name"],
        "cta_label": row["cta_label"],
        "cta_url": row["cta_url"],
        "user_ids": as_json(row["audience"]) or [],
        "starts_at": row["starts_at"].isoformat() if row["starts_at"] else None,
        "ends_at": row["ends_at"].isoformat() if row["ends_at"] else None,
        "show_once": bool(row["show_once"]),
        "is_active": bool(row["is_active"]),
    }


# ---------------- Admin ----------------

@admin_router.get("/popups")
def list_popups(admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT p.*, COUNT(v.user_id) AS views, COALESCE(SUM(v.clicked), 0) AS clicks
            FROM app_popups p LEFT JOIN popup_views v ON v.popup_id = p.id
            GROUP BY p.id ORDER BY p.created_at DESC LIMIT 100
        """)
        return [{**_serialize(r), "views": int(r["views"]), "clicks": int(r["clicks"])} for r in cursor.fetchall()]
    finally:
        conn.close()


@admin_router.post("/popups")
def create_popup(p: PopupPayload, admin_id: int = Depends(require_admin)):
    _validate(p)
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO app_popups (title, body, style, media_type, media_url, media_name, cta_label, cta_url,
                                    audience, starts_at, ends_at, show_once, is_active, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (*_row_values(p), admin_id))
        conn.commit()
        return {"id": cursor.lastrowid}
    finally:
        conn.close()


@admin_router.put("/popups/{popup_id}")
def update_popup(popup_id: int, p: PopupPayload, admin_id: int = Depends(require_admin)):
    _validate(p)
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE app_popups SET title = %s, body = %s, style = %s, media_type = %s, media_url = %s, media_name = %s,
                cta_label = %s, cta_url = %s, audience = %s, starts_at = %s, ends_at = %s, show_once = %s, is_active = %s
            WHERE id = %s
        """, (*_row_values(p), popup_id))
        conn.commit()
        if cursor.rowcount == 0:
            cursor.execute("SELECT id FROM app_popups WHERE id = %s", (popup_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Popup not found.")
        return {"id": popup_id}
    finally:
        conn.close()


@admin_router.delete("/popups/{popup_id}")
def delete_popup(popup_id: int, admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM app_popups WHERE id = %s", (popup_id,))
        conn.commit()
        return {"status": "success"}
    finally:
        conn.close()


# ---------------- App ----------------

@router.get("/popups/active")
def next_popup(user_id: int = Depends(get_current_user)):
    """The newest live popup for this user that they haven't already seen (if it's show-once)"""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT p.* FROM app_popups p
            LEFT JOIN popup_views v ON v.popup_id = p.id AND v.user_id = %s
            WHERE p.is_active = 1
              AND (p.starts_at IS NULL OR p.starts_at <= NOW())
              AND (p.ends_at IS NULL OR p.ends_at > NOW())
              AND (p.audience IS NULL OR JSON_CONTAINS(p.audience, CAST(%s AS JSON)))
              AND (p.show_once = 0 OR v.user_id IS NULL)
            ORDER BY p.created_at DESC
            LIMIT 1
        """, (user_id, str(user_id)))
        row: Any = cursor.fetchone()
        return {"popup": _serialize(row) if row else None}
    finally:
        conn.close()


class SeenRequest(BaseModel):
    clicked: bool = False


@router.post("/popups/{popup_id}/seen")
def mark_popup_seen(popup_id: int, req: SeenRequest, user_id: int = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO popup_views (popup_id, user_id, clicked) VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE seen_at = CURRENT_TIMESTAMP, clicked = GREATEST(clicked, VALUES(clicked))
        """, (popup_id, user_id, req.clicked))
        conn.commit()
        return {"status": "success"}
    finally:
        conn.close()
