from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Any, Optional
from pydantic import BaseModel
from database import get_db
from security import require_admin
from datetime import datetime, timedelta
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class AdminReply(BaseModel):
    reply: str

@router.get("/feedback")
def get_all_feedback(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    sort_by: str = Query("created_at"),
    sort_order: str = Query("DESC"),
    admin_id: int = Depends(require_admin)
):
    valid_sort = ["created_at", "status", "type", "rating"]
    if sort_by not in valid_sort: 
        sort_by = "created_at"
    sort_order = "ASC" if sort_order.upper() == "ASC" else "DESC"

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        where_clauses = ["1=1"]
        params: list[Any] = []

        if search:
            search_term = f"%{search}%"
            where_clauses.append("(f.subject LIKE %s OR f.message LIKE %s OR u.name LIKE %s OR u.email LIKE %s)")
            params.extend([search_term, search_term, search_term, search_term])
        
        if start_date:
            where_clauses.append("DATE(f.created_at) >= %s")
            params.append(start_date)
        if end_date:
            where_clauses.append("DATE(f.created_at) <= %s")
            params.append(end_date)

        where_str = " AND ".join(where_clauses)
        
        join_clause = "LEFT JOIN users u ON f.user_id = u.id OR f.user_email = u.email OR f.user_email = u.mobile"

        cursor.execute(f"SELECT COUNT(*) as count FROM feedback f {join_clause} WHERE {where_str}", params)
        count_row: Any = cursor.fetchone()
        total_items = int(count_row['count']) if isinstance(count_row, dict) and count_row.get('count') else 0

        query = f"""
            SELECT f.*, u.name as user_name, u.profile_pic 
            FROM feedback f 
            {join_clause}
            WHERE {where_str}
            ORDER BY f.{sort_by} {sort_order}
            LIMIT %s OFFSET %s
        """
        cursor.execute(query, params + [limit, (page - 1) * limit])
        feedback_data: list[Any] = cursor.fetchall()

        return {
            "data": feedback_data,
            "total": total_items,
            "page": page,
            "total_pages": (total_items + limit - 1) // limit if limit else 1
        }
    except Exception as e:
        logger.error(f"Admin Feedback Fetch Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/feedback/{ticket_id}/reply")
def reply_to_feedback(ticket_id: int, data: AdminReply, admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        ist_now = (datetime.utcnow() + timedelta(hours=5, minutes=30)).strftime('%Y-%m-%d %H:%M:%S')
        formatted_reply = f"--- Admin Reply ({ist_now}) ---\n{data.reply}\n\n"
        
        cursor.execute("""
            UPDATE feedback 
            SET admin_reply = CONCAT(COALESCE(admin_reply, ''), %s), status = 'resolved', replied_at = NOW() 
            WHERE id = %s
        """, (formatted_reply, ticket_id))
        conn.commit()
        return {"message": "Reply sent successfully."}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/feedback/{ticket_id}")
def delete_feedback(ticket_id: int, admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM feedback WHERE id = %s", (ticket_id,))
        conn.commit()
        return {"message": "Ticket deleted successfully."}
    except Exception as e:
        conn.rollback()
        logger.error(f"Admin Feedback Delete Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete ticket")
    finally:
        conn.close()