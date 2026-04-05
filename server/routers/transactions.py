from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, Any
from database import get_db
from schemas import TransactionCreate, CategoryCreate, CategoryUpdate, BudgetSchema
import logging
from datetime import datetime, timedelta
from utils import get_date_filter_sql

router = APIRouter(tags=["Transactions & Categories"])
logger = logging.getLogger(__name__)

# ================= TRANSACTION ENDPOINTS =================

@router.post("/transactions")
def add_transaction(tx: TransactionCreate):
    conn = get_db()
    cursor = conn.cursor(dictionary=True, buffered=True)
    try:
        cursor.execute("SELECT id FROM categories WHERE name = %s AND user_id = %s AND type = %s", (tx.category, tx.user_id, tx.type))
        result: Any = cursor.fetchone()
        if not result:
             cursor.execute("SELECT id FROM categories WHERE user_id = %s AND type = %s LIMIT 1", (tx.user_id, tx.type))
             result = cursor.fetchone()
        cat_id = result['id'] if result else 1

        query = "INSERT INTO transactions (user_id, amount, type, category_id, payment_mode, date, note, is_recurring) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
        cursor.execute(query, (tx.user_id, tx.amount, tx.type, cat_id, tx.payment_mode, tx.date, tx.note, tx.is_recurring)) # type: ignore
        conn.commit()
        return {"message": "Transaction Saved"}
    except Exception as e:
        logger.error(f"Error adding transaction: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/transactions/all/{user_id}")
def get_all_transactions(
    user_id: int,
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
            WHERE t.user_id = %s
        """
        params: list[Any] = [user_id] 

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
    cursor = conn.cursor(dictionary=True, buffered=True)
    cursor.execute("DELETE FROM transactions WHERE id = %s", (id,))
    conn.commit()
    conn.close()
    return {"message": "Deleted"}

# ================= CATEGORY ENDPOINTS =================

@router.get("/categories/{user_id}")
def get_categories(user_id: int):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM categories WHERE user_id = %s", (user_id,))
    data = cursor.fetchall()
    conn.close()
    return data

@router.post("/categories")
def add_category(cat: CategoryCreate):
    conn = get_db()
    cursor = conn.cursor(dictionary=True, buffered=True)
    try:
        cursor.execute(
            "SELECT id FROM categories WHERE user_id = %s AND name = %s AND type = %s",
            (cat.user_id, cat.name, cat.type)
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="A category with this name already exists.")

        cursor.execute(
            "INSERT INTO categories (user_id, name, color, type, icon, is_default) VALUES (%s, %s, %s, %s, %s, FALSE)", 
            (cat.user_id, cat.name, cat.color, cat.type, cat.icon)
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
    cursor = conn.cursor(dictionary=True, buffered=True)
    try:
        cursor.execute("DELETE FROM transactions WHERE category_id = %s", (id,))
        cursor.execute("DELETE FROM categories WHERE id = %s", (id,))
        conn.commit()
        return {"message": "Category deleted"}
    finally:
        conn.close()
        
@router.put("/categories/{id}")
def update_category(id: int, cat: CategoryUpdate):
    conn = get_db()
    cursor = conn.cursor(dictionary=True, buffered=True)
    try:
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
        cursor = conn.cursor(dictionary=True, buffered=True)
        cursor.execute("""
            INSERT INTO budgets (user_id, category_id, amount)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE amount = %s
        """, (budget.user_id, budget.category_id, budget.amount, budget.amount))
        conn.commit()
        conn.close()
        return {"message": "Budget saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/budgets/{user_id}")
def get_budgets_status(user_id: int, view_by: str = Query("month")):
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        
        date_filter = get_date_filter_sql(cursor, user_id, view_by, "t", "date")

        query = f"""
            SELECT 
                c.id as category_id, 
                c.name, 
                c.color,
                c.icon,
                COALESCE(b.amount, 0) as budget_limit,
                COALESCE(SUM(t.amount), 0) as spent
            FROM categories c
            LEFT JOIN budgets b ON c.id = b.category_id AND b.user_id = %s
            LEFT JOIN transactions t ON c.id = t.category_id 
                 AND t.user_id = %s 
                 AND t.type = 'expense'
                 AND {date_filter}
            WHERE (c.user_id = %s OR c.user_id IS NULL) AND c.type = 'expense'
            GROUP BY c.id, c.name, c.color, c.icon, b.amount
        """
        cursor.execute(query, (user_id, user_id, user_id))
        budgets: list[Any] = cursor.fetchall()

        for b in budgets:
            limit = float(b['budget_limit'])
            spent = float(b['spent'])
            b['percentage'] = (spent / limit * 100) if limit > 0 else 0
            b['is_over'] = spent > limit and limit > 0

        conn.close()
        return budgets
    except Exception as e:
        logger.error(f"Budget Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/budgets/history/{user_id}")
def get_budget_history(user_id: int):
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        
        # 1. Get Custom Date Offset
        cursor.execute("SELECT month_start_date FROM users WHERE id = %s", (user_id,))
        user: Any = cursor.fetchone() 
        offset = (int(user['month_start_date']) - 1) if user and user.get('month_start_date') else 0
        
        adjusted_date = f"DATE_SUB(date, INTERVAL {offset} DAY)"
        
        # 2. Fetch Raw Data using adjusted timeline
        query = f"""
            SELECT {adjusted_date} as adj_date, amount
            FROM transactions 
            WHERE user_id = %s 
              AND type = 'expense'
              AND {adjusted_date} >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            ORDER BY adj_date ASC
        """
        cursor.execute(query, (user_id,))
        transactions: list[Any] = cursor.fetchall() 
        
        # 3. Get Budget Limit
        cursor.execute("SELECT SUM(amount) as total_limit FROM budgets WHERE user_id = %s", (user_id,))
        limit_row: Any = cursor.fetchone() 
        total_limit = float(limit_row['total_limit']) if limit_row and limit_row['total_limit'] else 0
        
        conn.close()

        # 4. Process in Python using shifted dates
        history_map = {}
        today = datetime.today() - timedelta(days=offset)
        
        for i in range(5, -1, -1):
            d = today - timedelta(days=i*30)
            key = d.strftime('%Y-%m')
            name = d.strftime('%b')
            history_map[key] = {"month": name, "total_spent": 0, "budget_limit": total_limit}

        for t in transactions:
            date_obj = t['adj_date']
            if isinstance(date_obj, str):
                date_obj = datetime.strptime(date_obj.split(' ')[0], '%Y-%m-%d')
            
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
    cursor = conn.cursor(dictionary=True, buffered=True)
    try:
        cursor.execute("SELECT id FROM categories WHERE name = %s AND user_id = %s AND type = %s", (tx.category, tx.user_id, tx.type))
        result: Any = cursor.fetchone()
        if not result:
             cursor.execute("SELECT id FROM categories WHERE user_id = %s AND type = %s LIMIT 1", (tx.user_id, tx.type))
             result = cursor.fetchone()
        cat_id = result['id'] if result else 1

        query = """
            UPDATE transactions 
            SET amount = %s, type = %s, category_id = %s, 
                payment_mode = %s, date = %s, note = %s, is_recurring = %s 
            WHERE id = %s
        """
        cursor.execute(query, (tx.amount, tx.type, cat_id, tx.payment_mode, tx.date, tx.note, tx.is_recurring, id)) # type: ignore
        conn.commit()
        return {"message": "Transaction updated"}
    except Exception as e:
        logger.error(f"Update Tx Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
        
@router.get("/transactions/{user_id}")
def get_user_transactions(user_id: int, view_by: str = Query("month")):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        date_filter = get_date_filter_sql(cursor, user_id, view_by, "t", "date")
        
        query = f"""
            SELECT t.*, c.name as category_name, c.icon as category_icon 
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = %s AND {date_filter}
            ORDER BY t.date DESC
        """
        cursor.execute(query, (user_id,))
        return cursor.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()