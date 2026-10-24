from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field
from typing import Optional, Any
from database import get_db
from security import get_current_user
from whatsapp_service import (
    begin_app_chat, end_app_chat, send_whatsapp_text, send_whatsapp_text_direct, send_policy_consent_prompt,
    get_whatsapp_media_url, download_whatsapp_media,
)
from bot_handlers import process_whatsapp_text, process_whatsapp_interactive
from push_service import device_tokens, send_push
from whatsapp_handlers.split_parser import amount_first
import asyncio
import json
import logging
import re
import uuid

logger = logging.getLogger(__name__)
router = APIRouter(tags=["App Chat"])

# get_db() sets the session to IST, so TIMESTAMP columns come back as naive IST datetimes
IST_OFFSET = "+05:30"
NOT_LINKED = "Link your mobile number in Profile to use the SideNote assistant."

# Group threads: plain commands typed in a group's chat are rewritten into the bot's group syntax
GROUP_QUERY_COMMANDS = {"total", "search", "find", "history", "undo", "today", "yesterday", "week", "month", "chart", "data", "analytics"}
GROUP_HELP = (
    "👥 *Group chat commands*\n"
    "Everything here is for *{name}* only.\n\n"
    "• `500 dinner` or `dinner 500` — split ₹500 equally\n"
    "• `500 dinner @ravi @neha` — split with only them\n"
    "• `900 cab 60% @ravi` — custom share\n"
    "• `600 movie exclude:me` — you paid, others share\n"
    "• `settle @ravi` — mark what you owe as paid\n"
    "• `total` — total group spend\n"
    "• `today` · `yesterday` · `week` · `month`\n"
    "• `history` — recent entries (`history 2` for more)\n"
    "• `search taxi` — find entries\n"
    "• `chart` — spending chart\n"
    "• `undo` — remove your last group entry today\n"
    "• `rm 12` — delete entry #12\n"
    "• `new code` — a fresh invite code"
)


class ChatMessageRequest(BaseModel):
    text: Optional[str] = Field(default=None, max_length=1000)
    button_id: Optional[str] = Field(default=None, max_length=200)
    button_title: Optional[str] = Field(default=None, max_length=100)
    group_id: Optional[int] = None


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
        "group_id": row.get("group_id"),
        "sender": row["sender"],
        "kind": row["kind"],
        "body": row["body"] or "",
        "payload": payload,
        "created_at": row["created_at"].isoformat() + IST_OFFSET if row["created_at"] else None,
    }


def _insert_message(user_id: int, group_id: Optional[int], sender: str, kind: str, body: str, payload: Optional[dict]) -> int:
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO app_chat_messages (user_id, group_id, sender, kind, body, payload) VALUES (%s, %s, %s, %s, %s, %s)",
            (user_id, group_id, sender, kind, body, json.dumps(payload) if payload else None),
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


def _user_groups(user_id: int) -> list[dict]:
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT g.id, g.name, g.type, g.status FROM expense_groups g
            JOIN group_members gm ON g.id = gm.group_id
            WHERE gm.user_id = %s ORDER BY g.name
        """, (user_id,))
        return cursor.fetchall()
    finally:
        conn.close()


def _group_for(user_id: int, group_id: Optional[int]) -> Optional[dict]:
    if group_id is None:
        return None
    group = next((g for g in _user_groups(user_id) if g["id"] == group_id), None)
    if not group:
        raise HTTPException(status_code=403, detail="You are not a member of this group.")
    return group


def _group_alias(user_id: int, group: dict) -> Optional[str]:
    """The bot finds groups with LIKE '%alias%' over the user's groups, so pick a word of this
    group's name that matches no other group of theirs"""
    names = [g["name"].lower() for g in _user_groups(user_id) if g["id"] != group["id"]]
    words = sorted(set(re.findall(r"\w+", group["name"].lower())), key=len, reverse=True)
    return next((w for w in words if not any(w in other for other in names)), None)


def _strip_group_prefix(text: str, group: dict) -> str:
    """WhatsApp syntax names the group ("@goa settle @ravi", "group @goa week"); in a group thread the
    group is implied, so drop a leading mention of it. Person mentions such as "@ravi 500" are kept."""
    words = re.findall(r"\w+", group["name"].lower())
    names = set(words) | {"".join(words), "group", "group_name", "groupname"}
    match = re.match(r"^\s*(?:group\s+)?@(\w+)\s+(?=\S)", text, re.IGNORECASE)
    if match and match.group(1).lower() in names:
        return text[match.end():]
    return text


def _clean_group_reply(body: str) -> str:
    """Bot replies suggest WhatsApp's "@group ..." commands; in a group thread they're typed without it"""
    body = re.sub(r"@group_name\s+", "", body)
    body = re.sub(r"`@\w+\s+(settle\s+@\w+)`", r"`\1`", body)
    body = re.sub(r"\bgroup\s+@\w+\s+", "", body)
    body = re.sub(r"Unknown command for @\w+\.", "Unknown command.", body)
    return body


def _to_group_command(text: str, alias: str) -> Optional[str]:
    lower = text.lower().strip()
    if re.match(r"^\d+(?:\.\d+)?\s+\S", lower):
        return f"@{alias} {text.strip()}"
    if re.match(r"^settle\s+@\w+$", lower):
        return f"@{alias} {lower}"
    rm = re.match(r"^(?:rm|delete|remove)\s+#?(\d+)$", lower)
    if rm:
        return f"group rm {rm.group(1)}"
    if lower in ("new code", "invite", "code", "invite code"):
        return f"new code {alias}"
    if lower.split()[0] in GROUP_QUERY_COMMANDS:
        return f"group @{alias} {lower}"
    reordered = amount_first(text.strip())
    if reordered:
        return f"@{alias} {reordered}"
    return None


def _messages_since(user_id: int, group_id: Optional[int], first_id: int) -> list[dict]:
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT * FROM app_chat_messages WHERE user_id = %s AND group_id <=> %s AND id >= %s ORDER BY id ASC",
            (user_id, group_id, first_id),
        )
        return [_serialize(r) for r in cursor.fetchall()]
    finally:
        conn.close()


def _user_by_mobile(mobile: str) -> Optional[dict]:
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, name FROM users WHERE mobile = %s", (mobile,))
        return cursor.fetchone()
    finally:
        conn.close()


async def _run_bot(user: dict, group: Optional[dict], run) -> None:
    """Runs a WhatsApp bot handler with its replies to this user saved as chat messages"""
    user_id = user["id"]
    group_id = group["id"] if group else None

    async def sink(kind: str, body: str, payload: Optional[dict]) -> None:
        if group:
            body = _clean_group_reply(body)
        if kind == "media":
            payload = payload or {}
            url = payload.get("media_link")
            if not url and payload.get("media_id"):
                # WhatsApp media ids only work with the Meta token, so copy the file into the chat
                media_url = await get_whatsapp_media_url(payload["media_id"])
                data = await download_whatsapp_media(media_url) if media_url else None
                url = _store_media(user_id, data, "image/jpeg") if data else None
            if url and payload.get("media_type") == "image":
                _insert_message(user_id, group_id, "bot", "image", body, {"url": url})
            else:
                _insert_message(user_id, group_id, "bot", "text", body or "📎 Attachment", None)
            return
        _insert_message(user_id, group_id, "bot", kind, body, payload)

    async def other_sink(to_number: str, kind: str, body: str, payload: Optional[dict]) -> None:
        # Something done in the app reaches other members in the app (chat + push) when they have
        # it installed; members who only use WhatsApp still get it there
        target = _user_by_mobile(to_number)
        if not target or not device_tokens(target["id"]):
            await send_whatsapp_text_direct(to_number, body)
            return
        if group:
            body = _clean_group_reply(body)
        _insert_message(target["id"], group_id, "bot", "buttons" if kind == "buttons" else "text", body, payload if kind == "buttons" else None)
        title = group["name"] if group else "SideNote"
        await asyncio.to_thread(send_push, target["id"], title, body, {"kind": "chat", "group_id": group_id or ""})

    token = begin_app_chat(user["mobile"], sink, other_sink)
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


@router.get("/chat/threads")
def list_chat_threads(user_id: int = Depends(get_current_user)):
    """The personal thread plus one per group, each with its latest message id for unread dots"""
    user = _load_user(user_id)
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT group_id, MAX(id) AS last_id FROM app_chat_messages
            WHERE user_id = %s GROUP BY group_id
        """, (user_id,))
        last_ids = {r["group_id"]: r["last_id"] for r in cursor.fetchall()}
    finally:
        conn.close()
    threads = [{"group_id": None, "name": "Personal", "type": "personal", "status": "active", "last_id": last_ids.get(None)}]
    threads += [
        {"group_id": g["id"], "name": g["name"], "type": g["type"], "status": g["status"], "last_id": last_ids.get(g["id"])}
        for g in _user_groups(user_id)
    ]
    return {"linked": bool(user.get("mobile")), "threads": threads}


@router.get("/chat/messages")
def list_chat_messages(
    group_id: Optional[int] = Query(None, ge=1),
    before_id: Optional[int] = Query(None, ge=1),
    limit: int = Query(40, ge=1, le=100),
    user_id: int = Depends(get_current_user),
):
    """Newest page of one thread (oldest first within the page); pass before_id for older"""
    user = _load_user(user_id)
    _group_for(user_id, group_id)
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        if before_id:
            cursor.execute(
                "SELECT * FROM app_chat_messages WHERE user_id = %s AND group_id <=> %s AND id < %s ORDER BY id DESC LIMIT %s",
                (user_id, group_id, before_id, limit),
            )
        else:
            cursor.execute(
                "SELECT * FROM app_chat_messages WHERE user_id = %s AND group_id <=> %s ORDER BY id DESC LIMIT %s",
                (user_id, group_id, limit),
            )
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
    group = _group_for(user_id, req.group_id)
    group_id = group["id"] if group else None

    text = (req.text or "").strip()
    if not text and not req.button_id:
        raise HTTPException(status_code=400, detail="Message is empty.")

    if req.button_id:
        first_id = _insert_message(user_id, group_id, "user", "text", (req.button_title or req.button_id).strip(), {"button_id": req.button_id})
    else:
        first_id = _insert_message(user_id, group_id, "user", "text", text, None)

    async def run():
        if await _consent_gate(user, req.button_id):
            return
        if req.button_id:
            await process_whatsapp_interactive(user["mobile"], req.button_id, None, user["name"])
            return
        if not group:
            await process_whatsapp_text(user["mobile"], text, None, user["name"])
            return

        if text.lower() in ("help", "commands", "menu", "?"):
            await send_whatsapp_text(user["mobile"], GROUP_HELP.format(name=group["name"]))
            return
        alias = _group_alias(user_id, group)
        if not alias:
            await send_whatsapp_text(user["mobile"], f"⚠️ *{group['name']}* shares its name with another of your groups. Rename one of them to chat here.")
            return
        command = _to_group_command(_strip_group_prefix(text, group), alias)
        if not command:
            await send_whatsapp_text(user["mobile"], f"🤔 I didn't get that. In *{group['name']}* start with an amount, e.g. `500 dinner`, or type `help` for all commands.")
            return
        await process_whatsapp_text(user["mobile"], command, None, user["name"])

    await _run_bot(user, group, run)
    return {"items": _messages_since(user_id, group_id, first_id)}


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
def clear_chat(group_id: Optional[int] = Query(None, ge=1), user_id: int = Depends(get_current_user)):
    """Clears one thread of the in-app conversation (transactions it created are kept)"""
    _group_for(user_id, group_id)
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM app_chat_messages WHERE user_id = %s AND group_id <=> %s", (user_id, group_id))
        conn.commit()
        return {"status": "success"}
    finally:
        conn.close()
