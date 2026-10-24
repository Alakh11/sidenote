from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Any
from database import get_db
from security import require_admin
from push_service import mask_amounts
import firebase_admin
from firebase_admin import credentials, messaging
import logging
import json
import os
import uuid

logger = logging.getLogger(__name__)
router = APIRouter()

try:
    if not firebase_admin._apps:
        firebase_creds_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
        if firebase_creds_json:
            creds_dict = json.loads(firebase_creds_json)
            cred = credentials.Certificate(creds_dict)
            firebase_admin.initialize_app(cred)
        else:
            logger.warning("FIREBASE_CREDENTIALS_JSON is missing from .env")
except Exception as e:
    logger.error(f"Firebase initialization failed: {e}")


# Each sound is its own Android channel (Android 8+ fixes the sound per channel), created by the app
# in MainApplication.kt; "sound" is the res/raw file name used on older Android and iOS
SOUNDS = {
    "default": {"channel": "sidenote_general", "file": "default"},
    "chime": {"channel": "sidenote_chime", "file": "sidenote_chime"},
    "coin": {"channel": "sidenote_coin", "file": "sidenote_coin"},
    "pop": {"channel": "sidenote_pop", "file": "sidenote_pop"},
    "dust": {"channel": "sidenote_dust", "file": "sidenote_dust"},
    "tritone": {"channel": "sidenote_tritone", "file": "sidenote_tritone"},
    "silent": {"channel": "sidenote_silent", "file": None},
}
NOTIFICATION_TYPES = {"general", "alert", "reminder", "offer", "update"}

# FCM accepts at most 500 messages per send_each call
FCM_BATCH_SIZE = 500
# Errors meaning the token will never work again, so the device row can be dropped
DEAD_TOKEN_ERRORS = (messaging.UnregisteredError, messaging.SenderIdMismatchError)

# Uploaded images: FCM downloads them on the phone, so keep them small and in formats Android renders
MEDIA_TYPES = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "application/pdf": "pdf"}
MAX_MEDIA_BYTES = 1024 * 1024
MAX_DOCUMENT_BYTES = 5 * 1024 * 1024


def _https_url(value: Optional[str], field: str) -> Optional[str]:
    if value is None or not value.strip():
        return None
    value = value.strip()
    if not value.startswith("https://") or len(value) > 1024:
        raise ValueError(f"{field} must be an https:// link (max 1024 characters)")
    return value


class SendNotificationRequest(BaseModel):
    user_ids: list[int] = []
    title: str = Field(min_length=1, max_length=120)
    body: str = Field(min_length=1, max_length=1000)
    type: str = "general"
    sound: str = "default"
    image_url: Optional[str] = None  # large picture shown in the push and the in-app inbox
    icon_url: Optional[str] = None   # small logo shown next to the notification in the inbox

    @field_validator("type")
    @classmethod
    def check_type(cls, v: str) -> str:
        if v not in NOTIFICATION_TYPES:
            raise ValueError(f"type must be one of {sorted(NOTIFICATION_TYPES)}")
        return v

    @field_validator("sound")
    @classmethod
    def check_sound(cls, v: str) -> str:
        if v not in SOUNDS:
            raise ValueError(f"sound must be one of {sorted(SOUNDS)}")
        return v

    @field_validator("image_url")
    @classmethod
    def check_image(cls, v: Optional[str]) -> Optional[str]:
        return _https_url(v, "image_url")

    @field_validator("icon_url")
    @classmethod
    def check_icon(cls, v: Optional[str]) -> Optional[str]:
        return _https_url(v, "icon_url")


def _build_message(token: str, req: SendNotificationRequest, notification_id: int, hide_amounts: bool = False) -> messaging.Message:
    sound = SOUNDS[req.sound]
    # Data values must be strings; the app reads these to open and render the inbox entry
    data = {"notification_id": str(notification_id), "type": req.type, "screen": "Notifications"}
    if req.image_url:
        data["image_url"] = req.image_url
    if req.icon_url:
        data["icon_url"] = req.icon_url

    return messaging.Message(
        token=token,
        # Users who hide amounts see ₹••• in the preview; the inbox keeps the full text
        notification=messaging.Notification(
            title=mask_amounts(req.title) if hide_amounts else req.title,
            body=mask_amounts(req.body) if hide_amounts else req.body,
            image=req.image_url,
        ),
        data=data,
        android=messaging.AndroidConfig(
            priority="high",
            notification=messaging.AndroidNotification(
                channel_id=sound["channel"],
                sound=sound["file"],
                default_sound=req.sound == "default",
            ),
        ),
        apns=messaging.APNSConfig(
            payload=messaging.APNSPayload(aps=messaging.Aps(
                sound=None if sound["file"] is None else ("default" if req.sound == "default" else f"{sound['file']}.wav"),
                mutable_content=bool(req.image_url),
            )),
            fcm_options=messaging.APNSFCMOptions(image=req.image_url) if req.image_url else None,
        ),
    )


@router.post("/notifications/media")
async def upload_notification_media(request: Request, file: UploadFile = File(...), admin_id: int = Depends(require_admin)):
    """Stores an image (push picture/logo, popup image) or a PDF (popup document) and returns a
    public https URL for it"""
    mime = (file.content_type or "").lower()
    if mime not in MEDIA_TYPES:
        raise HTTPException(status_code=400, detail="Upload a PNG, JPG or WEBP image, or a PDF document.")
    limit = MAX_DOCUMENT_BYTES if mime == "application/pdf" else MAX_MEDIA_BYTES
    data = await file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(status_code=400, detail="PDFs must be 5 MB or smaller." if mime == "application/pdf" else "Image must be 1 MB or smaller.")
    if not data:
        raise HTTPException(status_code=400, detail="The file is empty.")

    media_id = uuid.uuid4().hex
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO notification_media (id, mime_type, data, uploaded_by) VALUES (%s, %s, %s, %s)",
            (media_id, mime, data, admin_id),
        )
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Notification Media Upload Error: {e}")
        raise HTTPException(status_code=500, detail="Could not save the image.")
    finally:
        conn.close()

    # Phones fetch this URL directly, so it must be the public https address of this API.
    # Set PUBLIC_API_URL when the server sits behind a proxy that hides it.
    base = os.getenv("PUBLIC_API_URL") or str(request.base_url)
    if request.headers.get("x-forwarded-proto") == "https" and base.startswith("http://"):
        base = "https://" + base[len("http://"):]
    url = f"{base.rstrip('/')}/notifications/media/{media_id}.{MEDIA_TYPES[mime]}"
    return {"url": url, "https": url.startswith("https://")}


@router.post("/notifications/send")
def admin_send_notification(req: SendNotificationRequest, admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    try:
        if not req.user_ids:
            cursor.execute("""
                SELECT d.user_id, d.fcm_token, u.notif_hide_amounts AS hide_amounts
                FROM user_devices d JOIN users u ON u.id = d.user_id
            """)
        else:
            format_strings = ','.join(['%s'] * len(req.user_ids))
            cursor.execute(f"""
                SELECT d.user_id, d.fcm_token, u.notif_hide_amounts AS hide_amounts
                FROM user_devices d JOIN users u ON u.id = d.user_id
                WHERE d.user_id IN ({format_strings})
            """, tuple(req.user_ids))
            
        devices = cursor.fetchall()
        if not devices:
            raise HTTPException(status_code=400, detail="No registered devices found for target users.")

        # One inbox row per user, created first so its id can ride along in the push and the
        # app can call PUT /notifications/{id}/read when it is opened
        notification_ids = {}
        for uid in {d['user_id'] for d in devices}:
            cursor.execute("""
                INSERT INTO notifications (user_id, title, body, type, image_url, icon_url, sound)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (uid, req.title, req.body, req.type, req.image_url, req.icon_url, req.sound))
            notification_ids[uid] = cursor.lastrowid

        messages = [_build_message(d['fcm_token'], req, notification_ids[d['user_id']], bool(d['hide_amounts'])) for d in devices]

        # send_multicast was removed in firebase-admin 7; send_each takes individual messages
        responses = []
        for i in range(0, len(messages), FCM_BATCH_SIZE):
            responses.extend(messaging.send_each(messages[i:i + FCM_BATCH_SIZE]).responses)

        delivered_users = set()
        dead_tokens = []
        for device, res in zip(devices, responses):
            if res.success:
                delivered_users.add(device['user_id'])
            elif isinstance(res.exception, DEAD_TOKEN_ERRORS):
                dead_tokens.append(device['fcm_token'])

        # Keep inbox rows only for users who got at least one push, so stats stay accurate
        undelivered = [nid for uid, nid in notification_ids.items() if uid not in delivered_users]
        if undelivered:
            cursor.execute(f"DELETE FROM notifications WHERE id IN ({','.join(['%s'] * len(undelivered))})", tuple(undelivered))
        if dead_tokens:
            cursor.execute(f"DELETE FROM user_devices WHERE fcm_token IN ({','.join(['%s'] * len(dead_tokens))})", tuple(dead_tokens))
        conn.commit()

        success_count = sum(1 for r in responses if r.success)
        return {
            "success_count": success_count,
            "failure_count": len(responses) - success_count,
            "removed_tokens": len(dead_tokens),
        }
    except Exception as e:
        conn.rollback()
        logger.error(f"Send Push Error: {e}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/notifications/stats")
def get_notification_stats(admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT 
                title, 
                body, 
                type,
                sound,
                image_url,
                icon_url,
                MAX(sent_at) as last_sent,
                COUNT(*) as total_sent,
                SUM(CASE WHEN is_read = TRUE THEN 1 ELSE 0 END) as total_read
            FROM notifications
            GROUP BY title, body, type, sound, image_url, icon_url
            ORDER BY last_sent DESC
            LIMIT 50
        """)
        return cursor.fetchall()
    except Exception as e:
        logger.error(f"Notification Stats Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
