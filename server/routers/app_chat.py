from fastapi import APIRouter, Depends, HTTPException, Query, Response, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import Optional, Any
from database import get_db
from security import get_current_user
from whatsapp_service import (
    begin_app_chat, end_app_chat, send_whatsapp_text, send_policy_consent_prompt,
    get_whatsapp_media_url, download_whatsapp_media,
)
from bot_handlers import process_whatsapp_text, process_whatsapp_interactive, process_receipt_bytes
import json
import logging
import uuid

logger = logging.getLogger(__name__)
router = APIRouter(tags=["App Chat"])

# get_db() sets the session to IST, so TIMESTAMP columns come back as naive IST datetimes
IST_OFFSET = "+05:30"
RECEIPT_TYPES = {"image/png", "image/jpeg", "image/webp", "image/heic"}
MAX_RECEIPT_BYTES = 5 * 1024 * 1024
NOT_LINKED = "Link your mobile number in Profile to chat with SideNote."


class ChatMessageRequest(BaseModel):
    text: Optional[str] = Field(default=None, max_length=1000)
    button_id: Optional[str] = Field(default=None, max_length=200)
    button_title: Optional[str] = Field(default=None, max_length=100)


def _serialize(row: dict) -> dict:
    payload = row.get("payload")
    if isinstance(payload, (bytes, bytearray)):
        payload = payload.decode()
    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except ValueError:
            payload = None
    return {
        "id": row["id"],
        "sender": row["sender"],
        "kind": row["kind"],
        "body": row["body"] or "",
        "payload": payload,
        "created_at": row["created_at"].isoformat() + IST_OFFSET if row["created_at"] else None,
    }


def _insert_message(user_id: int, sender: str, kind: str, body: str, payload: Optional[dict]) -> int:
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO app_chat_messages (user_id, sender, kind, body, payload) VALUES (%s, %s, %s, %s, %s)",
            (user_id, sender, kind, body, json.dumps(payload) if payload else None),
        )
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()


def _store_media(user_id: int, data: bytes, mime_type: str) -> str:
    media_id = uuid.uuid4().hex
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO app_chat_media (id, user_id, mime_type, data) VALUES (%s, %s, %s, %s)",
            (media_id, user_id, mime_type, data),
        )
        conn.commit()
    finally:
        conn.close()
    return f"/chat/media/{media_id}"


def _load_user(user_id: int) -> dict:
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, name, mobile, has_consented FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
    finally:
        conn.close()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _messages_since(user_id: int, first_id: int) -> list[dict]:
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT * FROM app_chat_messages WHERE user_id = %s AND id >= %s ORDER BY id ASC",
            (user_id, first_id),
        )
        return [_serialize(r) for r in cursor.fetchall()]
    finally:
        conn.close()


async def _run_bot(user: dict, run) -> None:
    """Runs a WhatsApp bot handler with its replies to this user saved as chat messages"""
    user_id = user["id"]

    async def sink(kind: str, body: str, payload: Optional[dict]) -> None:
        if kind == "media":
            payload = payload or {}
            url = payload.get("media_link")
            if not url and payload.get("media_id"):
                # WhatsApp media ids only work with the Meta token, so copy the file into the chat
                media_url = await get_whatsapp_media_url(payload["media_id"])
                data = await download_whatsapp_media(media_url) if media_url else None
                url = _store_media(user_id, data, "image/jpeg") if data else None
            if url and payload.get("media_type") == "image":
                _insert_message(user_id, "bot", "image", body, {"url": url})
            else:
                _insert_message(user_id, "bot", "text", body or "📎 Attachment", None)
            return
        _insert_message(user_id, "bot", kind, body, payload)

    token = begin_app_chat(user["mobile"], sink)
    try:
        await run()
    except Exception as e:
        logger.error(f"App chat bot error for user {user_id}: {e}")
        await sink("text", "⚠️ Something went wrong on our side. Please try again.", None)
    finally:
        end_app_chat(token)


async def _consent_gate(user: dict, button_id: Optional[str]) -> bool:
    """Same rule as the WhatsApp webhook: the updated terms must be accepted before the bot answers.
    Returns True when the message was handled here."""
    if user.get("has_consented"):
        return False
    phone = user["mobile"]
    if button_id == "accept_tnc":
        conn = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute("UPDATE users SET has_consented = TRUE WHERE id = %s", (user["id"],))
            conn.commit()
        finally:
            conn.close()
        await send_whatsapp_text(phone, "✅ *Thank you!* You have successfully accepted the updated Terms and Privacy Policy.\n\nYou can now continue logging your expenses!")
        return True
    if button_id == "decline_tnc":
        await send_whatsapp_text(phone, "⚠️ You must accept the updated Terms and Privacy Policy to continue using SideNote.")
    await send_policy_consent_prompt(phone)
    return True


@router.get("/chat/messages")
def list_chat_messages(
    before_id: Optional[int] = Query(None, ge=1),
    limit: int = Query(40, ge=1, le=100),
    user_id: int = Depends(get_current_user),
):
    """Newest page of the conversation (oldest first within the page); pass before_id for older"""
    user = _load_user(user_id)
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        if before_id:
            cursor.execute(
                "SELECT * FROM app_chat_messages WHERE user_id = %s AND id < %s ORDER BY id DESC LIMIT %s",
                (user_id, before_id, limit),
            )
        else:
            cursor.execute("SELECT * FROM app_chat_messages WHERE user_id = %s ORDER BY id DESC LIMIT %s", (user_id, limit))
        rows = cursor.fetchall()
    finally:
        conn.close()
    return {
        "linked": bool(user.get("mobile")),
        "items": [_serialize(r) for r in reversed(rows)],
        "has_more": len(rows) == limit,
    }


@router.post("/chat/messages")
async def send_chat_message(req: ChatMessageRequest, user_id: int = Depends(get_current_user)):
    """A typed message or a tapped reply button; returns it plus the bot's replies"""
    user = _load_user(user_id)
    if not user.get("mobile"):
        raise HTTPException(status_code=409, detail=NOT_LINKED)

    text = (req.text or "").strip()
    if not text and not req.button_id:
        raise HTTPException(status_code=400, detail="Message is empty.")

    if req.button_id:
        first_id = _insert_message(user_id, "user", "text", (req.button_title or req.button_id).strip(), {"button_id": req.button_id})
    else:
        first_id = _insert_message(user_id, "user", "text", text, None)

    async def run():
        if await _consent_gate(user, req.button_id):
            return
        if req.button_id:
            await process_whatsapp_interactive(user["mobile"], req.button_id, None, user["name"])
        else:
            await process_whatsapp_text(user["mobile"], text, None, user["name"])

    await _run_bot(user, run)
    return {"items": _messages_since(user_id, first_id)}


@router.post("/chat/receipt")
async def send_chat_receipt(
    file: UploadFile = File(...),
    caption: Optional[str] = Form(None),
    user_id: int = Depends(get_current_user),
):
    """A receipt photo, read by the same AI receipt parser as WhatsApp images"""
    user = _load_user(user_id)
    if not user.get("mobile"):
        raise HTTPException(status_code=409, detail=NOT_LINKED)

    mime = (file.content_type or "").lower()
    if mime not in RECEIPT_TYPES:
        raise HTTPException(status_code=400, detail="Send a JPG, PNG, WEBP or HEIC photo.")
    data = await file.read(MAX_RECEIPT_BYTES + 1)
    if not data:
        raise HTTPException(status_code=400, detail="The photo is empty.")
    if len(data) > MAX_RECEIPT_BYTES:
        raise HTTPException(status_code=400, detail="Photo must be 5 MB or smaller.")

    clean_caption = (caption or "").strip()[:200] or None
    url = _store_media(user_id, data, mime)
    first_id = _insert_message(user_id, "user", "image", clean_caption or "", {"url": url})

    async def run():
        if await _consent_gate(user, None):
            return
        await send_whatsapp_text(user["mobile"], "⏳ Reading your receipt ...")
        await process_receipt_bytes(user["mobile"], data, mime, user["name"], clean_caption)

    await _run_bot(user, run)
    return {"items": _messages_since(user_id, first_id)}


@router.get("/chat/media/{media_id}")
def get_chat_media(media_id: str, user_id: int = Depends(get_current_user)):
    """Chat photos are private: only their owner can load them"""
    if len(media_id) != 32 or not all(ch in "0123456789abcdef" for ch in media_id):
        raise HTTPException(status_code=404, detail="Not found")
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT mime_type, data FROM app_chat_media WHERE id = %s AND user_id = %s", (media_id, user_id))
        row: Any = cursor.fetchone()
    finally:
        conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    return Response(content=bytes(row["data"]), media_type=row["mime_type"], headers={"Cache-Control": "private, max-age=86400"})


@router.delete("/chat/messages")
def clear_chat(user_id: int = Depends(get_current_user)):
    """Clears the in-app conversation (transactions it created are kept)"""
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM app_chat_messages WHERE user_id = %s", (user_id,))
        cursor.execute("DELETE FROM app_chat_media WHERE user_id = %s", (user_id,))
        conn.commit()
        return {"status": "success"}
    finally:
        conn.close()
