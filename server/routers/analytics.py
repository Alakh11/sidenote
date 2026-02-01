from fastapi import APIRouter, HTTPException
from database import get_db
import logging

router = APIRouter(tags=["Analytics & Dashboard"])
logger = logging.getLogger(__name__)

@router.get("/dashboard/{email}")
def get_dashboard(email: str):
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT type, SUM(amount) as total FROM transactions WHERE user_email = %s GROUP BY type", (email,))
        totals = cursor.fetchall()
        
        cursor.execute("""
            SELECT t.id, t.amount, t.type, t.date, t.note, t.payment_mode, c.name as category
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.user_email = %s 
            ORDER BY t.date DESC LIMIT 5
        """, (email,))
        recent = cursor.fetchall()
        conn.close()
        return {"totals": totals, "recent": recent}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/{email}")
def get_analytics(email: str):
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT c.name, SUM(t.amount) as value 
            FROM transactions t
            JOIN categories c ON t.category_id = c.id
            WHERE t.user_email = %s AND t.type = 'expense'
            GROUP BY c.name
        """, (email,))
        pie_data = cursor.fetchall()
        
        cursor.execute("""
            SELECT DATE_FORMAT(date, '%b') as name, 
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
            FROM transactions WHERE user_email = %s 
            GROUP BY YEAR(date), MONTH(date), DATE_FORMAT(date, '%b')
            ORDER BY YEAR(date), MONTH(date) LIMIT 6
        """, (email,))
        bar_data = cursor.fetchall()
        conn.close()
        return {"pie": pie_data, "bar": bar_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/recurring/{email}")
def get_recurring(email: str):
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
                WHERE t.user_email = rt.user_email 
                AND t.note = rt.note
                AND t.id != rt.id 
            ) as last_paid
        FROM transactions rt
        LEFT JOIN categories c ON rt.category_id = c.id
        WHERE rt.user_email = %s AND rt.is_recurring = TRUE
    """
    cursor.execute(query, (email,))
    data = cursor.fetchall()
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

@router.get("/income/daily/{email}")
def get_daily_income(email: str):
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT date, SUM(amount) as total FROM transactions WHERE user_email = %s AND type = 'income' GROUP BY date ORDER BY date DESC LIMIT 30", (email,))
        data = cursor.fetchall()
        conn.close()
        return data
    except Exception as e:
        logger.error(f"Daily Income Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/income/monthly/{email}")
def get_monthly_income(email: str):
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT DATE_FORMAT(MIN(date), '%Y-%m') as month_year, DATE_FORMAT(MIN(date), '%M %Y') as display_name, SUM(amount) as total
            FROM transactions WHERE user_email = %s AND type = 'income'
            GROUP BY YEAR(date), MONTH(date) ORDER BY YEAR(date) DESC, MONTH(date) DESC LIMIT 12
        """, (email,))
        data = cursor.fetchall()
        conn.close()
        return data
    except Exception as e:
        logger.error(f"Monthly Income Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/category-monthly/{email}")
def get_category_monthly_analytics(email: str):
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT DATE_FORMAT(MIN(t.date), '%b %Y') as month, c.name as category, SUM(t.amount) as total
            FROM transactions t JOIN categories c ON t.category_id = c.id
            WHERE t.user_email = %s AND t.type = 'expense'
            GROUP BY YEAR(t.date), MONTH(t.date), c.name ORDER BY YEAR(t.date), MONTH(t.date)
        """, (email,))
        data = cursor.fetchall()
        conn.close()
        return data
    except Exception as e:
        logger.error(f"Category Monthly Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/predict/{email}")
def get_prediction(email: str):
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        
        # Fetch last 3 months of expenses
        cursor.execute("""
            SELECT 
                DATE_FORMAT(date, '%Y-%m') as month, 
                SUM(amount) as total
            FROM transactions 
            WHERE user_email = %s AND type = 'expense' 
            AND date >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
            GROUP BY month ORDER BY month DESC
        """, (email,))
        data = cursor.fetchall()
        
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
        return {"predicted_spend": round(final_prediction, 2)}
    except Exception as e:
        logger.error(f"Prediction Error: {e}")
        return {"predicted_spend": 0}

# 2. SMART INSIGHTS
@router.get("/insights/{email}")
def get_insights(email: str):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    # Compare This Month vs Last Month
    cursor.execute("""
        SELECT 
            DATE_FORMAT(date, '%Y-%m') as month,
            SUM(amount) as total
        FROM transactions 
        WHERE user_email = %s AND type = 'expense'
        AND date >= DATE_SUB(NOW(), INTERVAL 2 MONTH)
        GROUP BY month ORDER BY month DESC
    """, (email,))
    totals = cursor.fetchall()
    
    insights = []
    
    # 1. Spending Spike Insight
    if len(totals) >= 2:
        this_month = float(totals[0]['total'])
        last_month = float(totals[1]['total'])
        if this_month > last_month * 1.10: # 10% increase
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
        WHERE t.user_email = %s AND t.type = 'expense' 
        AND MONTH(t.date) = MONTH(CURRENT_DATE())
        GROUP BY c.name ORDER BY total DESC LIMIT 1
    """, (email,))
    top_cat = cursor.fetchone()
    
    if top_cat:
        insights.append({
            "type": "info",
            "text": f"'{top_cat['name']}' is your highest spending category this month.",
            "value": f"₹{float(top_cat['total']):,.0f}"
        })
        
    conn.close()
    return insights
