from fastapi import APIRouter, Depends, HTTPException
from typing import Any
from database import get_db
from security import require_admin, pwd_context
from schemas import UserRegister, AdminUpdateUser
import logging
from pydantic import BaseModel
from datetime import datetime, timedelta

router = APIRouter(prefix="/admin", tags=["Admin Panel"])
logger = logging.getLogger(__name__)

@router.get("/users")
def get_all_users(admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT role FROM users WHERE id = %s", (admin_id,))
        requester: Any = cursor.fetchone()
        req_role = requester['role'] if requester else 'user'

        if req_role == 'superadmin':
            cursor.execute("""
                SELECT id, name, email, mobile, is_verified, created_at, profile_pic, role 
                FROM users 
                ORDER BY created_at DESC
            """)
        else:
            cursor.execute("""
                SELECT id, name, email, mobile, is_verified, created_at, profile_pic, role 
                FROM users 
                WHERE role != 'superadmin'
                ORDER BY created_at DESC
            """)
            
        users: list[Any] = cursor.fetchall()
        
        cursor.execute("SELECT COUNT(*) as count FROM users")
        user_row: Any = cursor.fetchone()
        total_users = user_row['count'] if user_row else 0
        
        cursor.execute("SELECT COUNT(*) as count FROM transactions")
        tx_row: Any = cursor.fetchone()
        total_tx = tx_row['count'] if tx_row else 0
        
        conn.close()
        return {"users": users, "stats": {"total_users": total_users, "total_transactions": total_tx}}
    except Exception as e:
        logger.error(f"Admin Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/users")
def admin_create_user(user: UserRegister, admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT role FROM users WHERE id = %s", (admin_id,))
        requester: Any = cursor.fetchone()
        requester_role = requester['role'] if requester else 'user'

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
        requester_role = requester['role'] if requester else 'user'

        if target:
            if user_id == admin_id:
                 raise HTTPException(status_code=400, detail="Cannot delete your own account.")
            if target['role'] in ['admin', 'superadmin'] and requester_role != 'superadmin':
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

        # 1. Transactions
        cursor.execute("SELECT * FROM transactions WHERE user_id = %s ORDER BY date DESC", (user_id,))
        transactions: list[Any] = cursor.fetchall()

        # 2. Goals
        cursor.execute("SELECT * FROM goals WHERE user_id = %s", (user_id,))
        goals: list[Any] = cursor.fetchall()

        # 3. Categories
        cursor.execute("SELECT * FROM categories WHERE user_id = %s", (user_id,))
        categories: list[Any] = cursor.fetchall()

        # 4. Loans (Liabilities)
        cursor.execute("SELECT * FROM loans WHERE user_id = %s", (user_id,))
        loans: list[Any] = cursor.fetchall()

        # 5. Borrowers
        cursor.execute("SELECT * FROM borrowers WHERE user_id = %s", (user_id,))
        borrowers: list[Any] = cursor.fetchall()
        
        # 6. Debts/Lent Records
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
def get_system_metrics(admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT method, endpoint, COUNT(*) as total_calls, ROUND(AVG(response_time_ms), 2) as avg_time_ms
            FROM api_metrics 
            WHERE created_at >= NOW() - INTERVAL 24 HOUR AND status_code = 200
            GROUP BY method, endpoint 
            ORDER BY avg_time_ms DESC LIMIT 10
        """)
        slowest = cursor.fetchall()

        # 2. Most Used Endpoints
        cursor.execute("""
            SELECT method, endpoint, COUNT(*) as total_calls, ROUND(AVG(response_time_ms), 2) as avg_time_ms
            FROM api_metrics 
            WHERE created_at >= NOW() - INTERVAL 24 HOUR
            GROUP BY method, endpoint 
            ORDER BY total_calls DESC LIMIT 10
        """)
        most_used = cursor.fetchall()

        # 3. Errors
        cursor.execute("""
            SELECT method, endpoint, status_code, COUNT(*) as error_count
            FROM api_metrics 
            WHERE created_at >= NOW() - INTERVAL 24 HOUR AND status_code >= 400
            GROUP BY method, endpoint, status_code 
            ORDER BY error_count DESC LIMIT 10
        """)
        errors = cursor.fetchall()

        # 4. System Health Pulse
        cursor.execute("""
            SELECT 
                COUNT(*) as total_requests_24h,
                ROUND(AVG(response_time_ms), 2) as global_avg_ms
            FROM api_metrics 
            WHERE created_at >= NOW() - INTERVAL 24 HOUR
        """)
        pulse_raw = cursor.fetchone()
        
        pulse: dict[str, Any] = pulse_raw or {"total_requests_24h": 0, "global_avg_ms": 0} # type: ignore

        return {
            "slowest": slowest, 
            "most_used": most_used, 
            "errors": errors,
            "pulse": {
                "total_requests": pulse.get("total_requests_24h") or 0,
                "average_time": pulse.get("global_avg_ms") or 0
            }
        }
    except Exception as e:
        logger.error(f"Metrics Error: {e}")
        return {"slowest": [], "most_used": [], "errors": [], "pulse": {"total_requests": 0, "average_time": 0}}
    finally:
        conn.close()
        
@router.get("/feedback")
def get_all_feedback(admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT f.*, u.name as user_name, u.profile_pic 
            FROM feedback f 
            LEFT JOIN users u ON f.user_id = u.id
            ORDER BY f.created_at DESC
        """)
        return cursor.fetchall()
    except Exception as e:
        logger.error(f"Admin Feedback Fetch Error: {e}")
        cursor.execute("""
            SELECT f.*, u.name as user_name, u.profile_pic 
            FROM feedback f 
            LEFT JOIN users u ON f.user_email = u.email OR f.user_email = u.mobile
            ORDER BY f.created_at DESC
        """)
        return cursor.fetchall()
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
        
        cursor.execute("""
            UPDATE feedback 
            SET admin_reply = %s, status = 'resolved', replied_at = %s 
            WHERE id = %s
        """, (data.reply, ist_now, ticket_id))
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