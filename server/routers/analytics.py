from fastapi import APIRouter, HTTPException, Query
from typing import Any
from database import get_db
import logging
from utils import get_date_filter_sql
from fastapi import Query
from tracking import track_event

router = APIRouter(tags=["Analytics & Dashboard"])
logger = logging.getLogger(__name__)

@router.get("/dashboard/{user_id}")
def get_dashboard(user_id: int, view_by: str = Query("month")):
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        
        date_filter = get_date_filter_sql(cursor, user_id, view_by, "transactions", "date")
        
        # 1. Filter Totals
        cursor.execute(f"SELECT type, SUM(amount) as total FROM transactions WHERE user_id = %s AND {date_filter} GROUP BY type", (user_id,))
        totals: list[Any] = cursor.fetchall()
        
        # 2. Filter Recent Transactions
        date_filter_t = date_filter.replace('transactions.date', 't.date')
        cursor.execute(f"""
            SELECT t.id, t.amount, t.type, t.date, t.note, t.payment_mode, c.name as category
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = %s AND {date_filter_t}
            ORDER BY t.date DESC LIMIT 5
        """, (user_id,))
        recent: list[Any] = cursor.fetchall()
        
        conn.close()
        track_event(user_id, 'dashboard_viewed', {'view_by': view_by, 'source': 'web'})
        return {"totals": totals, "recent": recent}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/analytics/{user_id}")
def get_analytics(user_id: int, view_by: str = Query("month")):
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        
        date_filter = get_date_filter_sql(cursor, user_id, view_by, "t", "date")
        
        
        cursor.execute(f"""
            SELECT c.name, SUM(t.amount) as value 
            FROM transactions t
            JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = %s AND t.type = 'expense' AND {date_filter}
            GROUP BY c.name
        """, (user_id,))
        pie_data: list[Any] = cursor.fetchall()
        
        cursor.execute("SELECT month_start_date FROM users WHERE id = %s", (user_id,))
        user: Any = cursor.fetchone()
        offset = (int(user['month_start_date']) - 1) if user and user.get('month_start_date') else 0
        adjusted_date = f"DATE_SUB(date, INTERVAL {offset} DAY)"
        
        
        cursor.execute(f"""
            SELECT DATE_FORMAT(DATE_ADD({adjusted_date}, INTERVAL {offset} DAY), '%b') as name, 
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
            FROM transactions WHERE user_id = %s 
            GROUP BY YEAR({adjusted_date}), MONTH({adjusted_date}), name
            ORDER BY YEAR({adjusted_date}), MONTH({adjusted_date}) LIMIT 6
        """, (user_id,))
        bar_data: list[Any] = cursor.fetchall()
        
        conn.close()
        return {"pie": pie_data, "bar": bar_data}
    except Exception as e:
        logger.error(f"Analytics Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/recurring/{user_id}")
def get_recurring(user_id: int):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    query = """
        SELECT 
            rt.*, 
            c.name as category,
            c.icon as category_icon,
            (
                SELECT MAX(t.date)
                FROM transactions t
                WHERE t.user_id = rt.user_id 
                AND t.note = rt.note
                AND t.id != rt.id 
            ) as last_paid
        FROM transactions rt
        LEFT JOIN categories c ON rt.category_id = c.id
        WHERE rt.user_id = %s AND rt.is_recurring = TRUE
    """
    cursor.execute(query, (user_id,))
    data: list[Any] = cursor.fetchall()
    conn.close()
    return data

@router.delete("/recurring/stop/{id}")
def stop_recurring(id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE transactions SET is_recurring = FALSE WHERE id = %s", (id,))
    conn.commit()
    conn.close()
    return {"message": "Recurring stopped"}

@router.get("/income/daily/{user_id}")
def get_daily_income(user_id: int):
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT date, SUM(amount) as total FROM transactions WHERE user_id = %s AND type = 'income' GROUP BY date ORDER BY date DESC LIMIT 30", (user_id,))
        data: list[Any] = cursor.fetchall()
        conn.close()
        return data
    except Exception as e:
        logger.error(f"Daily Income Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/income/monthly/{user_id}")
def get_monthly_income(user_id: int):
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT DATE_FORMAT(MIN(date), '%Y-%m') as month_year, DATE_FORMAT(MIN(date), '%M %Y') as display_name, SUM(amount) as total
            FROM transactions WHERE user_id = %s AND type = 'income'
            GROUP BY YEAR(date), MONTH(date) ORDER BY YEAR(date) DESC, MONTH(date) DESC LIMIT 12
        """, (user_id,))
        data: list[Any] = cursor.fetchall()
        conn.close()
        return data
    except Exception as e:
        logger.error(f"Monthly Income Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/category-monthly/{user_id}")
def get_category_monthly_analytics(user_id: int):
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT DATE_FORMAT(MIN(t.date), '%b %Y') as month, c.name as category, SUM(t.amount) as total
            FROM transactions t JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = %s AND t.type = 'expense'
            GROUP BY YEAR(t.date), MONTH(t.date), c.name ORDER BY YEAR(t.date), MONTH(t.date)
        """, (user_id,))
        data: list[Any] = cursor.fetchall()
        conn.close()
        return data
    except Exception as e:
        logger.error(f"Category Monthly Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/predict/{user_id}")
def get_prediction(user_id: int):
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        
        # Fetch last 3 months of expenses
        cursor.execute("""
            SELECT 
                DATE_FORMAT(date, '%Y-%m') as month, 
                SUM(amount) as total
            FROM transactions 
            WHERE user_id = %s AND type = 'expense' 
            AND date >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
            GROUP BY month ORDER BY month DESC
        """, (user_id,))
        data: list[Any] = cursor.fetchall()
        
        if not data:
            return {"predicted_spend": 0}

        # Weighted Average Logic (Recent months matter more)
        weights = [0.5, 0.3, 0.2] # 50% last month, 30% month before, 20% 3rd month
        prediction = 0
        total_weight = 0
        
        for i, record in enumerate(data):
            if i < len(weights):
                prediction += float(record['total']) * weights[i]
                total_weight += weights[i]
        
        final_prediction = prediction / total_weight if total_weight > 0 else 0
        
        conn.close()
        track_event(user_id, 'prediction_viewed', {'predicted_amount': final_prediction, 'source': 'web'})
        return {"predicted_spend": round(final_prediction, 2)}
    except Exception as e:
        logger.error(f"Prediction Error: {e}")
        return {"predicted_spend": 0}

# 2. SMART INSIGHTS
@router.get("/insights/{user_id}")
def get_insights(user_id: int):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("SELECT currency FROM users WHERE id = %s", (user_id,))
    user: Any = cursor.fetchone()
    currency = user['currency'] if user and user.get('currency') else '₹'
    
    # Compare This Month vs Last Month
    cursor.execute("""
        SELECT 
            DATE_FORMAT(date, '%Y-%m') as month,
            SUM(amount) as total
        FROM transactions 
        WHERE user_id = %s AND type = 'expense'
        AND date >= DATE_SUB(NOW(), INTERVAL 2 MONTH)
        GROUP BY month ORDER BY month DESC
    """, (user_id,))
    totals: list[Any] = cursor.fetchall()
    
    insights = []
    
    # 1. Spending Spike Insight
    if len(totals) >= 2:
        this_month = float(totals[0]['total'])
        last_month = float(totals[1]['total'])
        if this_month > last_month * 1.10: 
            diff = int(((this_month - last_month) / last_month) * 100)
            insights.append({
                "type": "warning", 
                "text": f"You spent {diff}% more this month than last month.",
                "value": f"+{diff}%"
            })
        elif this_month < last_month * 0.9:
            diff = int(((last_month - this_month) / last_month) * 100)
            insights.append({
                "type": "success", 
                "text": f"Great job! Spending is down {diff}% compared to last month.",
                "value": f"-{diff}%"
            })

    # 2. Top Category Alert
    cursor.execute("""
        SELECT c.name, SUM(t.amount) as total
        FROM transactions t JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = %s AND t.type = 'expense' 
        AND MONTH(t.date) = MONTH(CURRENT_DATE())
        GROUP BY c.name ORDER BY total DESC LIMIT 1
    """, (user_id,))
    top_cat: Any = cursor.fetchone()
    
    if top_cat:
        insights.append({
            "type": "info",
            "text": f"'{top_cat['name']}' is your highest spending category this month.",
            "value": f"{currency}{float(top_cat['total']):,.0f}"
        })
        
    conn.close()
    return insights

@router.get("/trends/{user_id}")
def get_dynamic_trends(
    user_id: int, 
    view_by: str = Query("month", description="Options: day, week, month, year")
):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        # 1. Get user preferences
        cursor.execute("SELECT month_start_date FROM users WHERE id = %s", (user_id,))
        user: Any = cursor.fetchone()
        
        start_date_offset = 0
        if user and user.get('month_start_date'):
            start_date_offset = int(user['month_start_date']) - 1

        # 2. Shift dates backward by the offset so the 5th becomes the 1st
        adjusted_date = f"DATE_SUB(t.date, INTERVAL {start_date_offset} DAY)"
        
        if view_by == "day":
            group_sql = f"DATE({adjusted_date})"
            label_sql = f"DATE_FORMAT(DATE_ADD({adjusted_date}, INTERVAL {start_date_offset} DAY), '%b %d')"
            limit = 14
        elif view_by == "week":
            group_sql = f"YEARWEEK({adjusted_date}, 1)"
            label_sql = f"CONCAT('Week ', WEEK({adjusted_date}, 1))"
            limit = 8
        elif view_by == "year":
            group_sql = f"YEAR({adjusted_date})"
            label_sql = f"CAST(YEAR({adjusted_date}) AS CHAR)"
            limit = 5
        else: # month
            group_sql = f"DATE_FORMAT({adjusted_date}, '%Y-%m')"
            label_sql = f"DATE_FORMAT(DATE_ADD({adjusted_date}, INTERVAL {start_date_offset} DAY), '%b %Y')"
            limit = 6

        query = f"""
            SELECT 
                {label_sql} as period_label,
                {group_sql} as sort_key,
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
            FROM transactions t
            WHERE t.user_id = %s
            GROUP BY {group_sql}, {label_sql}
            ORDER BY sort_key DESC
            LIMIT %s
        """
        
        cursor.execute(query, (user_id, limit))
        data: list[Any] = cursor.fetchall()
        
        # Reverse to show chronological order
        return list(reversed(data))
        
    except Exception as e:
        logger.error(f"Trends Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()