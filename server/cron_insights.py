from database import get_db
import logging
from whatsapp_service import send_whatsapp_template
import asyncio
from typing import Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def send_weekly_proactive_insights():
    """
    Calculates weekly spend and top category for each WhatsApp user,
    then sends them a proactive insight template.
    """
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Find all active WhatsApp users
        cursor.execute("SELECT mobile, email FROM users WHERE mobile IS NOT NULL")
        users = cursor.fetchall()
        
        for user in users:
            identifier = user[1] if user[1] else user[0]
            
            # 1. Calculate their total expense for the current week
            cursor.execute("""
                SELECT SUM(amount) FROM transactions 
                WHERE user_email = %s 
                  AND type = 'expense' 
                  AND YEARWEEK(date, 1) = YEARWEEK(CURDATE(), 1)
            """, (identifier,))
            
            week_total_row = cursor.fetchone()
            week_total = float(week_total_row[0]) if week_total_row and week_total_row[0] else 0.0
            
            if week_total > 0:
                # 2. Find their highest spending category for this week
                cursor.execute("""
                    SELECT c.name, SUM(t.amount) as category_total
                    FROM transactions t
                    LEFT JOIN categories c ON t.category_id = c.id
                    WHERE t.user_email = %s 
                      AND t.type = 'expense' 
                      AND YEARWEEK(t.date, 1) = YEARWEEK(CURDATE(), 1)
                    GROUP BY c.name
                    ORDER BY category_total DESC
                    LIMIT 1
                """, (identifier,))
                
                top_cat_row = cursor.fetchone()
                
                top_category = str(top_cat_row[0]) if top_cat_row and top_cat_row[0] else "Miscellaneous"
                top_amount = float(top_cat_row[1]) if top_cat_row and top_cat_row[1] else 0.0
                
                # 3. Send the proactive insight template
                await send_whatsapp_template(
                    to_number=str(user[0]), 
                    template_name="weekly_insight_v1_1", 
                    variables=[f"{week_total:g}", top_category, f"{top_amount:g}"] 
                )
                logger.info(f"Insight sent to {user[0]}: {top_category} (₹{top_amount:g})")
                
    except Exception as e:
        logger.error(f"Error sending proactive insights: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    asyncio.run(send_weekly_proactive_insights())