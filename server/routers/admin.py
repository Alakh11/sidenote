from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Request
from typing import Any, Optional, List
from database import get_db
from security import require_admin, pwd_context
from schemas import UserRegister, AdminUpdateUser
import logging
from pydantic import BaseModel
from datetime import datetime, timedelta
from whatsapp_service import send_whatsapp_template, send_whatsapp_text
from cron_nudges import run_daily_nudges

router = APIRouter(prefix="/admin", tags=["Admin Panel"])
logger = logging.getLogger(__name__)

class SpecificNudgeRequest(BaseModel):
    nudge_type: str
    
@router.get("/users")
def get_all_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    sort_by: str = Query("created_at"),
    sort_order: str = Query("DESC"),
    admin_id: int = Depends(require_admin)
):
    valid_sort_columns = ["id", "name", "email", "mobile", "created_at"]
    if sort_by not in valid_sort_columns:
        sort_by = "created_at"
    sort_order = "ASC" if sort_order.upper() == "ASC" else "DESC"

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT role FROM users WHERE id = %s", (admin_id,))
        requester: Any = cursor.fetchone()
        req_role = requester.get('role', 'user') if isinstance(requester, dict) else 'user'

        where_clauses = ["1=1"]
        params: list[Any] = []

        if req_role != 'superadmin':
            where_clauses.append("role != 'superadmin'")

        if search:
            search_term = f"%{search}%"
            where_clauses.append("(name LIKE %s OR email LIKE %s OR mobile LIKE %s OR CAST(id AS CHAR) LIKE %s)")
            params.extend([search_term, search_term, search_term, search_term])

        if start_date:
            where_clauses.append("DATE(CONVERT_TZ(created_at, '+00:00', '+05:30')) >= %s")
            params.append(start_date)
        if end_date:
            where_clauses.append("DATE(CONVERT_TZ(created_at, '+00:00', '+05:30')) <= %s")
            params.append(end_date)

        where_str = " AND ".join(where_clauses)

        count_query = f"SELECT COUNT(*) as count FROM users WHERE {where_str}"
        cursor.execute(count_query, params)
        count_row: Any = cursor.fetchone()
        total_items = int(count_row['count']) if isinstance(count_row, dict) and count_row.get('count') else 0

        data_query = f"""
            SELECT id, name, email, mobile, is_verified, created_at, profile_pic, role 
            FROM users 
            WHERE {where_str}
            ORDER BY {sort_by} {sort_order}, id {sort_order} 
            LIMIT %s OFFSET %s
        """
        data_params = params + [limit, (page - 1) * limit]
        cursor.execute(data_query, data_params)
        users: list[Any] = cursor.fetchall()
        
        cursor.execute("SELECT COUNT(*) as count FROM transactions")
        tx_row: Any = cursor.fetchone()
        total_tx = int(tx_row['count']) if isinstance(tx_row, dict) and tx_row.get('count') else 0
        
        return {
            "data": users, 
            "total": total_items,
            "page": page,
            "limit": limit,
            "total_pages": (total_items + limit - 1) // limit if limit else 1,
            "stats": {
                "total_users": total_items, 
                "total_transactions": total_tx
            }
        }
    except Exception as e:
        logger.error(f"Admin Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/users")
def admin_create_user(user: UserRegister, admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT role FROM users WHERE id = %s", (admin_id,))
        requester: Any = cursor.fetchone()
        requester_role = requester.get('role', 'user') if isinstance(requester, dict) else 'user'

        target_role = getattr(user, 'role', 'user')

        if target_role in ['admin', 'superadmin'] and requester_role != 'superadmin':
            raise HTTPException(status_code=403, detail="Only Superadmins can create Admin accounts.")

        field = "email" if user.contact_type == 'email' else "mobile"
        cursor.execute(f"SELECT id FROM users WHERE {field} = %s", (user.contact,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="User exists")

        hashed_pw = pwd_context.hash(user.password)
        
        query = f"INSERT INTO users (name, {field}, password_hash, is_verified, role) VALUES (%s, %s, %s, TRUE, %s)"
        cursor.execute(query, (user.name, user.contact, hashed_pw, target_role))
        conn.commit()
        return {"message": "User created successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/users/{user_id}")
def admin_delete_user(user_id: int, admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, role FROM users WHERE id = %s", (user_id,))
        target: Any = cursor.fetchone()
        
        cursor.execute("SELECT role FROM users WHERE id = %s", (admin_id,))
        requester: Any = cursor.fetchone()
        requester_role = requester.get('role', 'user') if isinstance(requester, dict) else 'user'

        if isinstance(target, dict):
            if user_id == admin_id:
                 raise HTTPException(status_code=400, detail="Cannot delete your own account.")
            if target.get('role') in ['admin', 'superadmin'] and requester_role != 'superadmin':
                 raise HTTPException(status_code=403, detail="Only Superadmins can delete other Admin accounts.")

        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()
        return {"message": "User and all data permanently deleted"}
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/users/{user_id}")
def admin_update_user(user_id: int, data: AdminUpdateUser, admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        if data.new_password:
            hashed_pw = pwd_context.hash(data.new_password)
            query = "UPDATE users SET name = %s, email = %s, mobile = %s, role = %s, password_hash = %s WHERE id = %s"
            cursor.execute(query, (data.name, data.email, data.mobile, data.role, hashed_pw, user_id))
        else:
            query = "UPDATE users SET name = %s, email = %s, mobile = %s, role = %s WHERE id = %s"
            cursor.execute(query, (data.name, data.email, data.mobile, data.role, user_id))
            
        conn.commit()
        return {"message": "User updated successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/users/{user_id}/full-data")
def get_user_full_data(user_id: int, admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        target_user: Any = cursor.fetchone()
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")

        cursor.execute("SELECT * FROM transactions WHERE user_id = %s ORDER BY date DESC", (user_id,))
        transactions: list[Any] = cursor.fetchall()

        cursor.execute("SELECT * FROM goals WHERE user_id = %s", (user_id,))
        goals: list[Any] = cursor.fetchall()

        cursor.execute("SELECT * FROM categories WHERE user_id = %s", (user_id,))
        categories: list[Any] = cursor.fetchall()

        cursor.execute("SELECT * FROM loans WHERE user_id = %s", (user_id,))
        loans: list[Any] = cursor.fetchall()

        cursor.execute("SELECT * FROM borrowers WHERE user_id = %s", (user_id,))
        borrowers: list[Any] = cursor.fetchall()
        
        cursor.execute("""
            SELECT d.*, b.name as borrower_name 
            FROM debts d JOIN borrowers b ON d.borrower_id = b.id 
            WHERE b.user_id = %s
        """, (user_id,))
        lent_records: list[Any] = cursor.fetchall()

        return {
            "profile": target_user,
            "transactions": transactions,
            "goals": goals,
            "categories": categories,
            "loans": loans,
            "lending": {
                "borrowers": borrowers,
                "records": lent_records
            }
        }
    finally:
        conn.close()

@router.get("/metrics")
def get_system_metrics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    admin_id: int = Depends(require_admin)
):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        time_filter = "created_at >= NOW() - INTERVAL 24 HOUR"
        params: list[Any] = []
        
        if start_date and end_date:
            time_filter = "DATE(CONVERT_TZ(created_at, '+00:00', '+05:30')) >= %s AND DATE(CONVERT_TZ(created_at, '+00:00', '+05:30')) <= %s"
            params = [start_date, end_date]
        elif start_date:
            time_filter = "DATE(CONVERT_TZ(created_at, '+00:00', '+05:30')) >= %s"
            params = [start_date]

        cursor.execute(f"""
            SELECT method, endpoint, COUNT(*) as total_calls, ROUND(AVG(response_time_ms), 2) as avg_time_ms
            FROM api_metrics 
            WHERE {time_filter} AND status_code = 200
            GROUP BY method, endpoint 
            ORDER BY avg_time_ms DESC LIMIT 10
        """, params)
        slowest: list[Any] = cursor.fetchall()

        cursor.execute(f"""
            SELECT method, endpoint, COUNT(*) as total_calls, ROUND(AVG(response_time_ms), 2) as avg_time_ms
            FROM api_metrics 
            WHERE {time_filter}
            GROUP BY method, endpoint 
            ORDER BY total_calls DESC LIMIT 10
        """, params)
        most_used: list[Any] = cursor.fetchall()

        cursor.execute(f"""
            SELECT method, endpoint, status_code, COUNT(*) as error_count
            FROM api_metrics 
            WHERE {time_filter} AND status_code >= 400
            GROUP BY method, endpoint, status_code 
            ORDER BY error_count DESC LIMIT 10
        """, params)
        errors: list[Any] = cursor.fetchall()

        cursor.execute(f"""
            SELECT COUNT(*) as total_requests, ROUND(AVG(response_time_ms), 2) as global_avg_ms
            FROM api_metrics 
            WHERE {time_filter}
        """, params)
        pulse_raw: Any = cursor.fetchone()
        pulse: dict[str, Any] = pulse_raw if isinstance(pulse_raw, dict) else {"total_requests": 0, "global_avg_ms": 0}

        return {
            "slowest": slowest, 
            "most_used": most_used, 
            "errors": errors,
            "pulse": {
                "total_requests": pulse.get("total_requests") or 0, 
                "average_time": pulse.get("global_avg_ms") or 0
            }
        }
    except Exception as e:
        logger.error(f"Metrics Error: {e}")
        return {"slowest": [], "most_used": [], "errors": [], "pulse": {"total_requests": 0, "average_time": 0}}
    finally:
        conn.close()

@router.delete("/metrics")
def truncate_metrics(start_date: str, end_date: str, admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM api_metrics WHERE DATE(CONVERT_TZ(created_at, '+00:00', '+05:30')) >= %s AND DATE(CONVERT_TZ(created_at, '+00:00', '+05:30')) <= %s", (start_date, end_date))
        deleted_count = cursor.rowcount
        conn.commit()
        return {"message": f"Successfully deleted {deleted_count} records."}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

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
            where_clauses.append("DATE(CONVERT_TZ(f.created_at, '+00:00', '+05:30')) >= %s")
            params.append(start_date)
        if end_date:
            where_clauses.append("DATE(CONVERT_TZ(f.created_at, '+00:00', '+05:30')) <= %s")
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

class AdminReply(BaseModel):
    reply: str

@router.post("/feedback/{ticket_id}/reply")
def reply_to_feedback(ticket_id: int, data: AdminReply, admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        ist_now = (datetime.utcnow() + timedelta(hours=5, minutes=30)).strftime('%Y-%m-%d %H:%M:%S')
        formatted_reply = f"--- Admin Reply ({ist_now}) ---\n{data.reply}\n\n"
        
        cursor.execute("""
            UPDATE feedback 
            SET admin_reply = CONCAT(COALESCE(admin_reply, ''), %s), status = 'resolved', replied_at = %s 
            WHERE id = %s
        """, (formatted_reply, ist_now, ticket_id))
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
        
class BroadcastPayload(BaseModel):
    message_type: str = "template"
    template_name: Optional[str] = None
    variables: list[str] = []
    message_text: Optional[str] = None
    target_user_ids: list[int] = []
    audience: str = "all"

@router.post("/broadcast")
async def broadcast_whatsapp_message(
    payload: BroadcastPayload, 
    background_tasks: BackgroundTasks,
    admin_id: int = Depends(require_admin)
):
    if payload.message_type == "template" and not payload.template_name:
        raise HTTPException(status_code=400, detail="Template name is required for template broadcasts.")
    if payload.message_type == "text" and not payload.message_text:
        raise HTTPException(status_code=400, detail="Message text is required for text broadcasts.")

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT role FROM users WHERE id = %s", (admin_id,))
        admin_data: Any = cursor.fetchone()
        
        if not isinstance(admin_data, dict) or admin_data.get('role') not in ['admin', 'superadmin']:
             raise HTTPException(status_code=403, detail="You do not have permission to send broadcasts.")

        params: list[Any] = []
        
        if payload.audience == "active_24h":
            query = """
                SELECT DISTINCT u.mobile 
                FROM users u
                JOIN transactions t ON u.id = t.user_id
                WHERE u.is_verified = TRUE 
                AND u.mobile IS NOT NULL 
                AND t.date >= NOW() - INTERVAL 24 HOUR
            """
        else:
            query = "SELECT mobile FROM users WHERE is_verified = TRUE AND mobile IS NOT NULL"
            
            if payload.target_user_ids:
                format_strings = ','.join(['%s'] * len(payload.target_user_ids))
                query += f" AND id IN ({format_strings})"
                params.extend(payload.target_user_ids)

        cursor.execute(query, params)
        users = cursor.fetchall()
        
        if not users:
            raise HTTPException(status_code=400, detail="No users found matching this criteria.")
        
        queued_count = 0
        for u in users:
            if isinstance(u, dict) and u.get('mobile'):
                mobile_number = str(u['mobile'])
                
                if payload.message_type == "text":
                    background_tasks.add_task(send_whatsapp_text, mobile_number, payload.message_text or "")
                else:
                    background_tasks.add_task(send_whatsapp_template, mobile_number, payload.template_name or "", payload.variables)
                    
                queued_count += 1
                    
        return {"message": f"Broadcast successfully queued for {queued_count} users!"}
    except Exception as e:
        logger.error(f"Broadcast Error: {e}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
          
     
@router.get("/engagement/logs")
def get_nudge_logs(
    page: int = Query(1, ge=1), 
    limit: int = Query(20, ge=1), 
    sort_by: str = Query("sent_at"), 
    sort_order: str = Query("DESC"), 
    admin_id: int = Depends(require_admin)
):
    valid_sort = {
        "sent_at": "m.sent_at", 
        "user_name": "u.name", 
        "template_name": "m.template_name", 
        "trigger_reason": "m.trigger_reason"
    }
    db_sort = valid_sort.get(sort_by, "m.sent_at")
    order = "ASC" if sort_order.upper() == "ASC" else "DESC"

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        offset = (page - 1) * limit
        cursor.execute("SELECT COUNT(*) as count FROM automated_messages")
        total_records = cursor.fetchone()['count']
        
        query = f"""
            SELECT m.id, m.template_name, m.trigger_reason, m.sent_at, 
                   u.name as user_name, u.mobile
            FROM automated_messages m
            JOIN users u ON m.user_id = u.id
            ORDER BY {db_sort} {order}
            LIMIT %s OFFSET %s
        """
        cursor.execute(query, (limit, offset))
        return {"data": cursor.fetchall(), "total": total_records, "page": page, "limit": limit}
    except Exception as e:
        logger.error(f"Nudge Log Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/engagement/activity")
def get_user_activity_stats(
    page: int = Query(1, ge=1), 
    limit: int = Query(20, ge=1), 
    sort_by: str = Query("last_active_date"), 
    sort_order: str = Query("DESC"),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    admin_id: int = Depends(require_admin)
):
    valid_sort = {
        "name": "name", 
        "total_transactions": "total_transactions", 
        "active_days": "active_days", 
        "streak": "streak",
        "days_since_joining": "days_since_joining", 
        "last_active_date": "last_active_date"
    }
    db_sort = valid_sort.get(sort_by, "last_active_date")
    order = "ASC" if sort_order.upper() == "ASC" else "DESC"

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        offset = (page - 1) * limit
        
        time_filter = ""
        params: list[Any] = []
        
        if start_date:
            time_filter += " AND DATE(CONVERT_TZ(t.date, '+00:00', '+05:30')) >= %s"
            params.append(start_date)
        if end_date:
            time_filter += " AND DATE(CONVERT_TZ(t.date, '+00:00', '+05:30')) <= %s"
            params.append(end_date)
        
        count_query = f"""
            SELECT COUNT(DISTINCT u.id) as count 
            FROM users u
            JOIN transactions t ON u.id = t.user_id
            WHERE 1=1 {time_filter}
        """
        cursor.execute(count_query, params)
        total_records = cursor.fetchone()['count']
        
        query = f"""
            WITH FilteredTx AS (
                SELECT u.id as user_id, u.name, u.mobile, t.date
                FROM users u
                JOIN transactions t ON u.id = t.user_id
                WHERE 1=1 {time_filter}
            ),
            UserDates AS (
                SELECT user_id, DATE(CONVERT_TZ(date, '+00:00', '+05:30')) as tx_date
                FROM FilteredTx
                GROUP BY user_id, DATE(CONVERT_TZ(date, '+00:00', '+05:30'))
            ),
            RankedDates AS (
                SELECT user_id, tx_date,
                       DENSE_RANK() OVER(PARTITION BY user_id ORDER BY tx_date) as rnk
                FROM UserDates
            ),
            GroupedStreaks AS (
                SELECT user_id,
                       DATE_SUB(tx_date, INTERVAL rnk DAY) as grp,
                       COUNT(*) as streak_len,
                       MAX(tx_date) as max_date
                FROM RankedDates
                GROUP BY user_id, DATE_SUB(tx_date, INTERVAL rnk DAY)
            ),
            MaxStreaks AS (
                SELECT g.user_id, g.streak_len
                FROM GroupedStreaks g
                INNER JOIN (
                    SELECT user_id, MAX(tx_date) as last_date
                    FROM UserDates
                    GROUP BY user_id
                ) m ON g.user_id = m.user_id AND g.max_date = m.last_date
            )
            SELECT 
                f.user_id,
                MAX(f.name) as name,
                MAX(f.mobile) as mobile,
                COUNT(f.date) as total_transactions,
                COUNT(DISTINCT DATE(CONVERT_TZ(f.date, '+00:00', '+05:30'))) as active_days,
                CONVERT_TZ(MAX(f.date), '+00:00', '+05:30') as last_active_date,
                DATEDIFF(NOW(), MIN(f.date)) as days_since_joining,
                COALESCE(MAX(s.streak_len), 0) as streak
            FROM FilteredTx f
            LEFT JOIN MaxStreaks s ON f.user_id = s.user_id
            GROUP BY f.user_id
            ORDER BY {db_sort} {order}
            LIMIT %s OFFSET %s
        """
        
        cursor.execute(query, params + params + [limit, offset])
        return {"data": cursor.fetchall(), "total": total_records, "page": page, "limit": limit}
    except Exception as e:
        logger.error(f"Activity Stats Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/engagement/trigger-nudges")
async def trigger_automated_nudges(
    data: SpecificNudgeRequest, 
    background_tasks: BackgroundTasks, 
    admin_id: int = Depends(require_admin)
):
    """SUPERADMIN ONLY: Manually triggers the daily nudge evaluation engine."""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT role FROM users WHERE id = %s", (admin_id,))
        admin_data: Any = cursor.fetchone()
        
        if not isinstance(admin_data, dict) or admin_data.get('role') != 'superadmin':
             raise HTTPException(status_code=403, detail="Only Superadmins can trigger the nudge engine.")

        # Pass the specific nudge type over to your cron job
        background_tasks.add_task(run_daily_nudges, data.nudge_type)
        return {"message": f"Nudge engine triggered for '{data.nudge_type.replace('_', ' ').title()}'! Refresh logs in a few moments."}
    finally:
        conn.close()

@router.post("/engagement/flush-and-trigger")
async def flush_and_trigger_nudges(background_tasks: BackgroundTasks, admin_id: int = Depends(require_admin)):
    """SUPERADMIN ONLY: Deletes all previous nudge logs and triggers a fresh engine run."""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT role FROM users WHERE id = %s", (admin_id,))
        admin_data: Any = cursor.fetchone()
        
        if not isinstance(admin_data, dict) or admin_data.get('role') != 'superadmin':
             raise HTTPException(status_code=403, detail="Only Superadmins can flush logs.")

        cursor.execute("TRUNCATE TABLE automated_messages")
        conn.commit()

        background_tasks.add_task(run_daily_nudges, "all")
        return {"message": "Logs flushed and Nudge engine started fresh! Refresh in a few moments."}
    finally:
        conn.close()
        
@router.get("/engagement/cron-status")
def get_cron_status(request: Request, admin_id: int = Depends(require_admin)):
    scheduler = getattr(request.app.state, "scheduler", None)
    if not scheduler:
        return {"status": "offline", "next_run": None}
        
    job = scheduler.get_job('nudge_engine')
    if not job:
        return {"status": "not_found", "next_run": None}
        
    is_running = job.next_run_time is not None
    return {
        "status": "running" if is_running else "paused",
        "next_run": str(job.next_run_time) if job.next_run_time else "Paused"
    }
    
@router.post("/engagement/cron-toggle")
def toggle_cron_engine(request: Request, admin_id: int = Depends(require_admin)):
    scheduler = getattr(request.app.state, "scheduler", None)
    if not scheduler:
        raise HTTPException(status_code=500, detail="Scheduler not initialized")
        
    job = scheduler.get_job('nudge_engine')
    if not job:
        raise HTTPException(status_code=404, detail="Cron job not found")
        
    if job.next_run_time:
        scheduler.pause_job('nudge_engine')
        return {"message": "Engine paused successfully.", "status": "paused"}
    else:
        scheduler.resume_job('nudge_engine')
        return {"message": "Engine resumed successfully.", "status": "running"}
    
    
class ToggleRulePayload(BaseModel):
    is_active: bool

@router.get("/engagement/rules")
def get_nudge_rules(admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT ns.id, ns.rule_name, ns.is_active, ns.description,
                   COUNT(am.id) as 30d_sends
            FROM nudge_settings ns
            LEFT JOIN automated_messages am ON ns.rule_name = am.trigger_reason AND am.sent_at >= NOW() - INTERVAL 30 DAY
            GROUP BY ns.id, ns.rule_name, ns.is_active, ns.description
            ORDER BY ns.id ASC
        """)
        return cursor.fetchall()
    finally:
        conn.close()

@router.put("/engagement/rules/{rule_name}")
def toggle_nudge_rule(rule_name: str, payload: ToggleRulePayload, admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE nudge_settings SET is_active = %s WHERE rule_name = %s", (payload.is_active, rule_name))
        conn.commit()
        return {"message": f"Rule {rule_name} turned {'ON' if payload.is_active else 'OFF'}"}
    finally:
        conn.close()