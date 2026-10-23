from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Any
from database import get_db
from security import require_admin
import firebase_admin
from firebase_admin import credentials, messaging
import logging
import json
import os

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


class SendNotificationRequest(BaseModel):
    user_ids: list[int] = []
    title: str
    body: str
    screen: Optional[str] = None

FCM_BATCH_SIZE = 500
DEAD_TOKEN_ERRORS = (messaging.UnregisteredError, messaging.SenderIdMismatchError)

@router.post("/notifications/send")
def admin_send_notification(req: SendNotificationRequest, admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    try:
        if not req.user_ids:
            cursor.execute("SELECT user_id, fcm_token FROM user_devices")
        else:
            format_strings = ','.join(['%s'] * len(req.user_ids))
            cursor.execute(f"SELECT user_id, fcm_token FROM user_devices WHERE user_id IN ({format_strings})", tuple(req.user_ids))
            
        devices = cursor.fetchall()
        if not devices:
            raise HTTPException(status_code=400, detail="No registered devices found for target users.")

        notification_ids = {}
        for uid in {d['user_id'] for d in devices}:
            cursor.execute("INSERT INTO notifications (user_id, title, body) VALUES (%s, %s, %s)", (uid, req.title, req.body))
            notification_ids[uid] = cursor.lastrowid

        messages = []
        for d in devices:
            data = {"notification_id": str(notification_ids[d['user_id']])}
            if req.screen:
                data["screen"] = req.screen
            messages.append(messaging.Message(
                token=d['fcm_token'],
                notification=messaging.Notification(title=req.title, body=req.body),
                data=data,
                android=messaging.AndroidConfig(priority="high", notification=messaging.AndroidNotification(channel_id="sidenote_general")),
            ))

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
                MAX(sent_at) as last_sent,
                COUNT(*) as total_sent,
                SUM(CASE WHEN is_read = TRUE THEN 1 ELSE 0 END) as total_read
            FROM notifications
            GROUP BY title, body
            ORDER BY last_sent DESC
            LIMIT 50
        """)
        return cursor.fetchall()
    except Exception as e:
        logger.error(f"Notification Stats Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()