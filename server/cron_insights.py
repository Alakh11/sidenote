from database import get_db
import logging
from whatsapp_service import send_whatsapp_template
import asyncio

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
        cursor.execute("SELECT id, mobile FROM users WHERE mobile IS NOT NULL")
        users = cursor.fetchall()
        
        for user_row in users:
            user = tuple(user_row) if user_row else ()
            if not user: 
                continue
            
            user_id = int(str(user[0]))
            mobile = str(user[1])
            
            cursor.execute("""
                SELECT SUM(amount) FROM transactions 
                WHERE user_id = %s 
                  AND type = 'expense' 
                  AND YEARWEEK(date, 1) = YEARWEEK(CURDATE(), 1)
            """, (user_id,))
            
            week_row = cursor.fetchone()
            w_row = tuple(week_row) if week_row else ()
            
            week_total = float(str(w_row[0])) if w_row and w_row[0] else 0.0
            
            if week_total > 0:
                # 2. Find their highest spending category for this week
                cursor.execute("""
                    SELECT c.name, SUM(t.amount) as category_total
                    FROM transactions t
                    LEFT JOIN categories c ON t.category_id = c.id
                    WHERE t.user_id = %s 
                      AND t.type = 'expense' 
                      AND YEARWEEK(t.date, 1) = YEARWEEK(CURDATE(), 1)
                    GROUP BY c.name
                    ORDER BY category_total DESC
                    LIMIT 1
                """, (user_id,))
                
                cat_row = cursor.fetchone()
                c_row = tuple(cat_row) if cat_row else ()
                
                top_category = str(c_row[0]) if c_row and c_row[0] else "Miscellaneous"
                
                top_amount = float(str(c_row[1])) if c_row and c_row[1] else 0.0
                
                await send_whatsapp_template(
                    to_number=mobile, 
                    template_name="weekly_insight_v1_1", 
                    variables=[f"{week_total:g}", top_category, f"{top_amount:g}"] 
                )
                logger.info(f"Insight sent to {mobile}: {top_category} (₹{top_amount:g})")
                
    except Exception as e:
        logger.error(f"Error sending proactive insights: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    asyncio.run(send_weekly_proactive_insights())