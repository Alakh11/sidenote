from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from database import get_db
from security import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["User Notifications"])

IST_OFFSET = "+05:30"

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
            ON DUPLICATE KEY UPDATE
                user_id = VALUES(user_id),
                device_type = VALUES(device_type),
                updated_at = CURRENT_TIMESTAMP
        """, (user_id, req.fcm_token, req.device_type))
        conn.commit()
        return {"status": "success", "message": "Token registered"}
    except Exception as e:
        conn.rollback()
        logger.error(f"Token Reg Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/notifications")
def list_notifications(
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user_id: int = Depends(get_current_user),
):
    """The signed-in user's inbox, newest first, plus the unread count for the bell badge"""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT id, title, body, is_read, sent_at, read_at
            FROM notifications
            WHERE user_id = %s
            ORDER BY sent_at DESC, id DESC
            LIMIT %s OFFSET %s
        """, (user_id, limit, offset))
        rows = cursor.fetchall()

        cursor.execute("SELECT COUNT(*) AS unread FROM notifications WHERE user_id = %s AND is_read = FALSE", (user_id,))
        unread = cursor.fetchone()["unread"]

        items = [{
            "id": r["id"],
            "title": r["title"],
            "body": r["body"],
            "is_read": bool(r["is_read"]),
            "sent_at": r["sent_at"].isoformat() + IST_OFFSET if r["sent_at"] else None,
            "read_at": r["read_at"].isoformat() + IST_OFFSET if r["read_at"] else None,
        } for r in rows]
        return {"items": items, "unread_count": int(unread), "has_more": len(rows) == limit}
    except Exception as e:
        logger.error(f"List Notifications Error: {e}")
        raise HTTPException(status_code=500, detail="Could not load notifications")
    finally:
        conn.close()

@router.put("/notifications/read-all")
def mark_all_notifications_read(user_id: int = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE notifications
            SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
            WHERE user_id = %s AND is_read = FALSE
        """, (user_id,))
        conn.commit()
        return {"status": "success", "updated": cursor.rowcount}
    except Exception as e:
        conn.rollback()
        logger.error(f"Mark All Read Error: {e}")
        raise HTTPException(status_code=500, detail="Could not update notifications")
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
