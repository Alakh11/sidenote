from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from database import get_db
from security import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["User Notifications"])

class TokenRequest(BaseModel):
    fcm_token: str
    device_type: str = "mobile"

@router.post("/notifications/token")
def register_device_token(req: TokenRequest, user_id: int = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO user_devices (user_id, fcm_token, device_type) 
            VALUES (%s, %s, %s) 
            ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
        """, (user_id, req.fcm_token, req.device_type))
        conn.commit()
        return {"status": "success", "message": "Token registered"}
    except Exception as e:
        conn.rollback()
        logger.error(f"Token Reg Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, user_id: int = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE notifications 
            SET is_read = TRUE, read_at = CURRENT_TIMESTAMP 
            WHERE id = %s AND user_id = %s
        """, (notification_id, user_id))
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        conn.rollback()
        logger.error(f"Mark Read Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()