from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from database import get_db
from schemas import TransactionCreate, CategoryCreate, CategoryUpdate, BudgetSchema
import logging
from datetime import datetime, timedelta

router = APIRouter(tags=["Transactions & Categories"])
logger = logging.getLogger(__name__)

# ================= TRANSACTION ENDPOINTS =================

@router.post("/transactions")
def add_transaction(tx: TransactionCreate):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM categories WHERE name = %s AND user_email = %s AND type = %s", (tx.category, tx.user_email, tx.type))
        result = cursor.fetchone()
        if not result:
             cursor.execute("SELECT id FROM categories WHERE user_email = %s AND type = %s LIMIT 1", (tx.user_email, tx.type))
             result = cursor.fetchone()
        cat_id = result[0] if result else 1

        query = "INSERT INTO transactions (user_email, amount, type, category_id, payment_mode, date, note, is_recurring) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
        cursor.execute(query, (tx.user_email, tx.amount, tx.type, cat_id, tx.payment_mode, tx.date, tx.note, tx.is_recurring))
        conn.commit()
        return {"message": "Transaction Saved"}
    except Exception as e:
        logger.error(f"Error adding transaction: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/transactions/all/{email}")
def get_all_transactions(
    email: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category_id: Optional[int] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    payment_mode: Optional[str] = None,
    search: Optional[str] = None
):
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        
        query = """
            SELECT t.*, c.name as category_name, c.icon as category_icon
            FROM transactions t 
            LEFT JOIN categories c ON t.category_id = c.id 
            WHERE t.user_email = %s
        """
        params = [email]

        if start_date:
            query += " AND t.date >= %s"
            params.append(start_date)
        if end_date:
            query += " AND t.date <= %s"
            params.append(end_date)
        if category_id:
            query += " AND t.category_id = %s"
            params.append(category_id)
        if payment_mode and payment_mode != "All Modes":
            query += " AND t.payment_mode = %s"
            params.append(payment_mode)
        if min_amount is not None:
            query += " AND t.amount >= %s"
            params.append(min_amount)
        if max_amount is not None:
            query += " AND t.amount <= %s"
            params.append(max_amount)
        if search:
            search_text = f"%{search.lower()}%"
            search_amount_clean = search.replace(",", "")
            search_amount = f"%{search_amount_clean}%"
            query += """ AND (
                LOWER(t.note) LIKE %s OR 
                t.amount LIKE %s OR 
                LOWER(t.type) LIKE %s OR 
                LOWER(t.payment_mode) LIKE %s OR 
                LOWER(c.name) LIKE %s
            )"""
            
            params.extend([
                search_text,    # note
                search_amount,  # amount
                search_text,    # type
                search_text,    # payment_mode
                search_text     # category_name
            ])

        query += " ORDER BY t.date DESC"

        cursor.execute(query, params)
        transactions = cursor.fetchall()
        conn.close()
        return transactions
    except Exception as e:
        logger.error(f"Filter Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/transactions/{id}")
def delete_transaction(id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM transactions WHERE id = %s", (id,))
    conn.commit()
    conn.close()
    return {"message": "Deleted"}

# ================= CATEGORY ENDPOINTS =================

@router.get("/categories/{email}")
def get_categories(email: str):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM categories WHERE user_email = %s", (email,))
    data = cursor.fetchall()
    conn.close()
    return data

@router.post("/categories")
def add_category(cat: CategoryCreate):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO categories (user_email, name, color, type, icon, is_default) VALUES (%s, %s, %s, %s, %s, FALSE)", (cat.user_email, cat.name, cat.color, cat.type, cat.icon)
        )
        conn.commit()
        return {"message": "Category created"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/categories/{id}")
def delete_category(id: int):
    conn = get_db()
    cursor = conn.cursor()
    try:
        # Cascade delete transactions in this category to avoid orphans
        cursor.execute("DELETE FROM transactions WHERE category_id = %s", (id,))
        cursor.execute("DELETE FROM categories WHERE id = %s", (id,))
        conn.commit()
        return {"message": "Category deleted"}
    finally:
        conn.close()
        
@router.put("/categories/{id}")
def update_category(id: int, cat: CategoryUpdate):
    conn = get_db()
    cursor = conn.cursor()
    try:
        # Check if exists
        cursor.execute("SELECT * FROM categories WHERE id = %s", (id,))
        if not cursor.fetchone():
             raise HTTPException(status_code=404, detail="Category not found")
             
        cursor.execute("""
            UPDATE categories 
            SET name = %s, color = %s, icon = %s, type = %s 
            WHERE id = %s
        """, (cat.name, cat.color, cat.icon, cat.type, id))
        conn.commit()
        return {"message": "Category updated"}
    except Exception as e:
        logger.error(f"Update Cat Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# ================= BUDGET ENDPOINTS =================

@router.post("/budgets")
def set_budget(budget: BudgetSchema):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO budgets (user_email, category_id, amount)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE amount = %s
        """, (budget.user_email, budget.category_id, budget.amount, budget.amount))
        conn.commit()
        conn.close()
        return {"message": "Budget saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/budgets/{email}")
def get_budgets_status(email: str):
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        query = """
            SELECT 
                c.id as category_id, 
                c.name, 
                c.color,
                c.icon,
                COALESCE(b.amount, 0) as budget_limit,
                COALESCE(SUM(t.amount), 0) as spent
            FROM categories c
            LEFT JOIN budgets b ON c.id = b.category_id AND b.user_email = %s
            LEFT JOIN transactions t ON c.id = t.category_id 
                 AND t.user_email = %s 
                 AND t.type = 'expense'
                 AND DATE_FORMAT(t.date, '%%Y-%%m') = DATE_FORMAT(NOW(), '%%Y-%%m')
            WHERE (c.user_email = %s OR c.user_email IS NULL) AND c.type = 'expense'
            GROUP BY c.id, c.name, c.color, c.icon, b.amount
        """
        cursor.execute(query, (email, email, email))
        budgets = cursor.fetchall()

        for b in budgets:
            b['percentage'] = (b['spent'] / b['budget_limit'] * 100) if b['budget_limit'] > 0 else 0
            b['is_over'] = b['spent'] > b['budget_limit'] and b['budget_limit'] > 0

        conn.close()
        return budgets
    except Exception as e:
        logger.error(f"Budget Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/budgets/history/{email}")
def get_budget_history(email: str):
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        
        # 1. Fetch Raw Data
        query = """
            SELECT date, amount
            FROM transactions 
            WHERE user_email = %s 
              AND type = 'expense'
              AND date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            ORDER BY date ASC
        """
        cursor.execute(query, (email,))
        transactions = cursor.fetchall()
        
        # 2. Get Budget Limit
        cursor.execute("SELECT SUM(amount) as total_limit FROM budgets WHERE user_email = %s", (email,))
        limit_row = cursor.fetchone()
        total_limit = float(limit_row['total_limit']) if limit_row and limit_row['total_limit'] else 0
        
        conn.close()

        # 3. Process in Python
        history_map = {}
        today = datetime.today()
        
        for i in range(5, -1, -1):
            d = today - timedelta(days=i*30)
            key = d.strftime('%Y-%m')
            name = d.strftime('%b')
            history_map[key] = {"month": name, "total_spent": 0, "budget_limit": total_limit}

        for t in transactions:
            date_obj = t['date']
            if isinstance(date_obj, str):
                date_obj = datetime.strptime(date_obj, '%Y-%m-%d')
            key = date_obj.strftime('%Y-%m')
            if key in history_map:
                history_map[key]['total_spent'] += float(t['amount'])

        final_history = sorted(history_map.values(), key=lambda x: list(history_map.keys())[list(history_map.values()).index(x)])
        return list(final_history)
    except Exception as e:
        print(f"HISTORY ERROR: {e}") 
        raise HTTPException(status_code=500, detail=str(e))
    
@router.put("/transactions/{id}")
def update_transaction(id: int, tx: TransactionCreate):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM categories WHERE name = %s AND user_email = %s AND type = %s", (tx.category, tx.user_email, tx.type))
        result = cursor.fetchone()
        if not result:
             cursor.execute("SELECT id FROM categories WHERE user_email = %s AND type = %s LIMIT 1", (tx.user_email, tx.type))
             result = cursor.fetchone()
        cat_id = result[0] if result else 1

        query = """
            UPDATE transactions 
            SET amount = %s, type = %s, category_id = %s, 
                payment_mode = %s, date = %s, note = %s, is_recurring = %s 
            WHERE id = %s
        """
        cursor.execute(query, (tx.amount, tx.type, cat_id, tx.payment_mode, tx.date, tx.note, tx.is_recurring, id))
        conn.commit()
        return {"message": "Transaction updated"}
    except Exception as e:
        logger.error(f"Update Tx Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()