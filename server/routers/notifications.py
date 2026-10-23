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

        tokens = [d['fcm_token'] for d in devices]
        
        # Dispatch via Firebase Admin SDK
        message = messaging.MulticastMessage(
            notification=messaging.Notification(title=req.title, body=req.body),
            tokens=tokens,
        )
        response = messaging.send_multicast(message)

        sent_records = []
        for i, device in enumerate(devices):
            if response.responses[i].success:
                sent_records.append((device['user_id'], req.title, req.body))
        
        if sent_records:
            cursor.executemany("""
                INSERT INTO notifications (user_id, title, body) VALUES (%s, %s, %s)
            """, sent_records)
            conn.commit()

        return {"success_count": response.success_count, "failure_count": response.failure_count}
    except Exception as e:
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