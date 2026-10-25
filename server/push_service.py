import logging
from concurrent.futures import ThreadPoolExecutor
import re
from typing import Optional
import firebase_admin
from firebase_admin import messaging
from database import get_db

logger = logging.getLogger(__name__)

DEAD_TOKEN_ERRORS = (messaging.UnregisteredError, messaging.SenderIdMismatchError)


def device_tokens(user_id: int) -> list[str]:
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT fcm_token FROM user_devices WHERE user_id = %s", (user_id,))
        return [row[0] for row in cursor.fetchall()]
    finally:
        conn.close()


AMOUNT_PATTERN = re.compile(r"(₹|rs\.?\s?|inr\s?)\s?\d[\d,]*(?:\.\d+)?", re.IGNORECASE)


def hides_amounts(user_id: int) -> bool:
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT notif_hide_amounts FROM users WHERE id = %s", (user_id,))
        row = cursor.fetchone()
        return bool(row and row[0])
    finally:
        conn.close()


def mask_amounts(text: str) -> str:
    # For users who chose to hide amounts in notification previews
    return AMOUNT_PATTERN.sub("₹•••", text) if text else text


def plain_text(text: str) -> str:
    # WhatsApp markup (*bold*, _italic_, ~strike~, `code`) reads badly in a system notification
    return re.sub(r"[*_~`]", "", text).strip()


def send_push(user_id: int, title: str, body: str, data: Optional[dict] = None) -> int:
    """Sends a push to every device of the user; returns how many were delivered"""
    if not firebase_admin._apps:
        logger.warning("Push skipped: Firebase is not initialized")
        return 0
    tokens = device_tokens(user_id)
    if not tokens:
        return 0
    if hides_amounts(user_id):
        title, body = mask_amounts(title), mask_amounts(body)
    payload = {k: str(v) for k, v in (data or {}).items() if v is not None}
    messages = [
        messaging.Message(
            token=token,
            notification=messaging.Notification(title=title, body=plain_text(body)[:400]),
            data=payload,
            android=messaging.AndroidConfig(priority="high", notification=messaging.AndroidNotification(channel_id="sidenote_general")),
        )
        for token in tokens
    ]
    try:
        responses = messaging.send_each(messages).responses
    except Exception as e:
        logger.error(f"Push send failed for user {user_id}: {e}")
        return 0

    dead = [tokens[i] for i, r in enumerate(responses) if not r.success and isinstance(r.exception, DEAD_TOKEN_ERRORS)]
    if dead:
        conn = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute(f"DELETE FROM user_devices WHERE fcm_token IN ({','.join(['%s'] * len(dead))})", tuple(dead))
            conn.commit()
        finally:
            conn.close()
    return sum(1 for r in responses if r.success)

_push_pool = ThreadPoolExecutor(max_workers=4, thread_name_prefix="push")


def _run_safely(fn, *args) -> None:
    try:
        fn(*args)
    except Exception as e:
        logger.error(f"Background push failed: {e}")


def push_later(fn, *args) -> None:
    """Runs fn(*args) (usually a push send) without making the request wait for it"""
    _push_pool.submit(_run_safely, fn, *args)
