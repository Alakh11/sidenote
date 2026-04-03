from fastapi import APIRouter, Depends, HTTPException
from typing import Any
from database import get_db
from security import require_admin, pwd_context
from schemas import UserRegister, AdminUpdateUser
import logging

router = APIRouter(prefix="/admin", tags=["Admin Panel"])
logger = logging.getLogger(__name__)

@router.get("/users")
def get_all_users(admin_email: str = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT id, name, email, mobile, is_verified, created_at, profile_pic 
            FROM users 
            ORDER BY created_at DESC
        """)
        users: list[Any] = cursor.fetchall()
        
        # Get total stats for the dashboard
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
def admin_create_user(user: UserRegister, admin_email: str = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        # Check existence
        field = "email" if user.contact_type == 'email' else "mobile"
        cursor.execute(f"SELECT id FROM users WHERE {field} = %s", (user.contact,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="User exists")

        hashed_pw = pwd_context.hash(user.password)
        query = f"INSERT INTO users (name, {field}, password_hash, is_verified) VALUES (%s, %s, %s, TRUE)"
        cursor.execute(query, (user.name, user.contact, hashed_pw))
        conn.commit()
        return {"message": "User created by Admin"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/users/{user_id}")
def admin_delete_user(user_id: int, admin_email: str = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        # Prevent deleting self
        cursor.execute("SELECT email FROM users WHERE id = %s", (user_id,))
        target: Any = cursor.fetchone()
        if target and target[0] == admin_email:
             raise HTTPException(status_code=400, detail="Cannot delete your own Admin account")

        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()
        return {"message": "User and all data permanently deleted"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/users/{user_id}")
def admin_update_user(user_id: int, data: AdminUpdateUser, admin_email: str = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        # Determine if updating email or mobile
        is_email = "@" in data.contact
        field = "email" if is_email else "mobile"
        
        if data.new_password:
            # Update With Password Reset
            hashed_pw = pwd_context.hash(data.new_password)
            query = f"UPDATE users SET name = %s, {field} = %s, password_hash = %s WHERE id = %s"
            cursor.execute(query, (data.name, data.contact, hashed_pw, user_id))
        else:
            # Update Profile Only
            query = f"UPDATE users SET name = %s, {field} = %s WHERE id = %s"
            cursor.execute(query, (data.name, data.contact, user_id))
            
        conn.commit()
        return {"message": "User updated successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/users/{user_id}/full-data")
def get_user_full_data(user_id: int, admin_email: str = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        target_user: Any = cursor.fetchone()
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
            
        email = target_user['email'] or target_user['mobile'] # Identifier used in other tables

        # 1. Transactions
        cursor.execute("SELECT * FROM transactions WHERE user_email = %s ORDER BY date DESC", (email,))
        transactions: list[Any] = cursor.fetchall()

        # 2. Goals
        cursor.execute("SELECT * FROM goals WHERE user_email = %s", (email,))
        goals: list[Any] = cursor.fetchall()

        # 3. Categories
        cursor.execute("SELECT * FROM categories WHERE user_email = %s", (email,))
        categories: list[Any] = cursor.fetchall()

        # 4. Loans (Liabilities)
        cursor.execute("SELECT * FROM loans WHERE user_email = %s", (email,))
        loans: list[Any] = cursor.fetchall()

        cursor.execute("SELECT * FROM borrowers WHERE user_email = %s", (email,))
        borrowers: list[Any] = cursor.fetchall()
        
        cursor.execute("""
            SELECT d.*, b.name as borrower_name 
            FROM debts d JOIN borrowers b ON d.borrower_id = b.id 
            WHERE b.user_email = %s
        """, (email,))
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
def get_system_metrics(admin_email: str = Depends(require_admin)):
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
def get_all_feedback(admin_email: str = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT f.*, u.name as user_name, u.profile_pic 
            FROM feedback f 
            LEFT JOIN users u ON f.user_email = u.email OR f.user_email = u.mobile
            ORDER BY f.created_at DESC
        """)
        return cursor.fetchall()
    finally:
        conn.close()