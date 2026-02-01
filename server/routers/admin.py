from fastapi import APIRouter, Depends, HTTPException
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
        users = cursor.fetchall()
        
        # Get total stats for the dashboard
        cursor.execute("SELECT COUNT(*) as count FROM users")
        total_users = cursor.fetchone()['count']
        
        cursor.execute("SELECT COUNT(*) as count FROM transactions")
        total_tx = cursor.fetchone()['count']
        
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
        target = cursor.fetchone()
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
        target_user = cursor.fetchone()
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
            
        email = target_user['email'] or target_user['mobile'] # Identifier used in other tables

        # 1. Transactions
        cursor.execute("SELECT * FROM transactions WHERE user_email = %s ORDER BY date DESC", (email,))
        transactions = cursor.fetchall()

        # 2. Goals
        cursor.execute("SELECT * FROM goals WHERE user_email = %s", (email,))
        goals = cursor.fetchall()

        # 3. Categories
        cursor.execute("SELECT * FROM categories WHERE user_email = %s", (email,))
        categories = cursor.fetchall()

        # 4. Loans (Liabilities)
        cursor.execute("SELECT * FROM loans WHERE user_email = %s", (email,))
        loans = cursor.fetchall()

        cursor.execute("SELECT * FROM borrowers WHERE user_email = %s", (email,))
        borrowers = cursor.fetchall()
        
        cursor.execute("""
            SELECT d.*, b.name as borrower_name 
            FROM debts d JOIN borrowers b ON d.borrower_id = b.id 
            WHERE b.user_email = %s
        """, (email,))
        lent_records = cursor.fetchall()

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