from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Any, Optional
from database import get_db
from security import require_admin, pwd_context
from schemas import UserRegister, AdminUpdateUser
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

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
            search_term = f"%{search.lower()}%"
            where_clauses.append("(LOWER(name) LIKE %s OR LOWER(email) LIKE %s OR mobile LIKE %s OR CAST(id AS CHAR) LIKE %s)")
            params.extend([search_term, search_term, search_term, search_term])

        if start_date:
            where_clauses.append("DATE(created_at) >= %s")
            params.append(start_date)
        if end_date:
            where_clauses.append("DATE(created_at) <= %s")
            params.append(end_date)

        where_str = " AND ".join(where_clauses)

        count_query = f"SELECT COUNT(*) as count FROM users WHERE {where_str}"
        cursor.execute(count_query, params)
        count_row: Any = cursor.fetchone()
        total_items = int(count_row['count']) if isinstance(count_row, dict) and count_row.get('count') else 0

        data_query = f"""
            SELECT id, name, email, mobile, is_verified, created_at, profile_pic, role, account_status 
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