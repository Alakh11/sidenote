import logging
from datetime import datetime, timedelta
import calendar
from typing import Any
from database import get_db
from whatsapp_service import send_whatsapp_template

logger = logging.getLogger(__name__)

async def run_daily_nudges():
    """Evaluates all users and sends the appropriate automated nudge based on rules."""
    logger.info("Starting Daily Nudge Evaluation...")
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Ensure we are operating on IST
        cursor.execute("SET time_zone = '+05:30'")
        
        # Get IST current time
        now = datetime.utcnow() + timedelta(hours=5, minutes=30)
        today = now.date()
        
        # Check if today is Sunday (6) or the Last Day of the Month
        is_sunday = today.weekday() == 6
        last_day_of_month = calendar.monthrange(today.year, today.month)[1]
        is_month_end = today.day == last_day_of_month

        # Fetch all verified users with a mobile number
        cursor.execute("SELECT id, mobile FROM users WHERE is_verified = TRUE AND mobile IS NOT NULL")
        users: list[Any] = cursor.fetchall()

        for user in users:
            # Type safety check
            if not isinstance(user, dict):
                continue

            user_id = int(user.get('id', 0))
            mobile = str(user.get('mobile', ''))
            
            if not user_id or not mobile:
                continue
            
            # --- 1. CHECK LIMITS ---
            # Max 1 per day
            # cursor.execute("SELECT COUNT(*) as count FROM automated_messages WHERE user_id = %s AND DATE(sent_at) = CURDATE()", (user_id,))
            # count_today_row: Any = cursor.fetchone()
            # if count_today_row and count_today_row.get('count', 0) >= 1:
            #     continue
                
            # # Max 3 per week
            # cursor.execute("SELECT COUNT(*) as count FROM automated_messages WHERE user_id = %s AND sent_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)", (user_id,))
            # count_week_row: Any = cursor.fetchone()
            # if count_week_row and count_week_row.get('count', 0) >= 3:
            #     continue

            # --- 2. CHECK INACTIVITY ---
            cursor.execute("SELECT MAX(date) as last_active FROM transactions WHERE user_id = %s", (user_id,))
            last_tx: Any = cursor.fetchone()
            
            # If they have never logged anything, skip them
            if not last_tx or not last_tx.get('last_active'):
                continue
                
            # Safely extract the date object to satisfy Pylance
            last_active_val = last_tx['last_active']
            if hasattr(last_active_val, 'date'):
                last_active_date = last_active_val.date()
            elif isinstance(last_active_val, str):
                last_active_date = datetime.strptime(last_active_val.split(' ')[0], '%Y-%m-%d').date()
            else:
                continue
                
            days_inactive = (today - last_active_date).days

            # Rule: Stop after 10 days of inactivity. (And don't send if active today)
            if days_inactive > 10 or days_inactive <= 0:
                continue

            # --- 3. FETCH REQUIRED VARIABLES ---
            # Monthly Total
            cursor.execute("SELECT SUM(amount) as total FROM transactions WHERE user_id = %s AND type = 'expense' AND MONTH(date) = MONTH(CURDATE())", (user_id,))
            m_total_row: Any = cursor.fetchone()
            month_total = float(m_total_row['total']) if m_total_row and m_total_row.get('total') is not None else 0.0
            
            # --- 4. DETERMINE TEMPLATE ---
            template_name = None
            variables: list[str] = []
            trigger_reason = ""

            # PRIORITY 1: Monthly Insight (End of month)
            if is_month_end:
                current_day = today.day
                avg_per_day = month_total / current_day if current_day > 0 else 0.0
                template_name = "monthly_insight_v1"
                variables = [f"{month_total:g}", f"{avg_per_day:.0f}"]
                trigger_reason = "monthly_insight"
                
            # PRIORITY 2: Weekly Insight (Sundays, but only if they were active this week)
            elif is_sunday and days_inactive < 7:
                cursor.execute("""
                    SELECT SUM(amount) as total FROM transactions 
                    WHERE user_id = %s AND type = 'expense' AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                """, (user_id,))
                w_total_row: Any = cursor.fetchone()
                week_total = float(w_total_row['total']) if w_total_row and w_total_row.get('total') is not None else 0.0

                cursor.execute("""
                    SELECT c.name, SUM(t.amount) as total 
                    FROM transactions t JOIN categories c ON t.category_id = c.id
                    WHERE t.user_id = %s AND t.type = 'expense' AND t.date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                    GROUP BY c.name ORDER BY total DESC LIMIT 1
                """, (user_id,))
                top_cat_row: Any = cursor.fetchone()
                
                top_category = str(top_cat_row.get('name', 'Various')) if isinstance(top_cat_row, dict) else "Various"
                top_amount = float(top_cat_row['total']) if isinstance(top_cat_row, dict) and top_cat_row.get('total') is not None else 0.0

                template_name = "weekly_insight_v1"
                variables = [f"{week_total:g}", top_category, f"{top_amount:g}"]
                trigger_reason = "weekly_insight"

            # PRIORITY 3: Strict Inactivity Rules
            elif days_inactive == 7:
                template_name = "weekly_nudge_v1"
                trigger_reason = "7_days_inactive"
            elif days_inactive == 1:
                template_name = "daily_nudge_v1"
                variables = [f"{month_total:g}"] # last_total
                trigger_reason = "24h_inactive"
            elif days_inactive == 2:
                template_name = "soft_nudge_v1"
                trigger_reason = "48h_inactive"
            elif days_inactive == 3:
                template_name = "streak_nudge_v1"
                trigger_reason = "72h_inactive"
            elif days_inactive == 4:
                template_name = "reactivation_v1"
                trigger_reason = "3_to_5_days_inactive"
            elif days_inactive == 6:
                template_name = "insight_reactivation_v1"
                variables = [f"{month_total:g}"] # last_total
                trigger_reason = "5_to_7_days_inactive"

            # --- 5. SEND AND LOG ---
            if template_name:
                try:
                    await send_whatsapp_template(mobile, template_name, variables)
                    
                    # Log to database for Admin Panel tracking
                    cursor.execute(
                        "INSERT INTO automated_messages (user_id, template_name, trigger_reason, sent_at) VALUES (%s, %s, %s, UTC_TIMESTAMP())",
                        (user_id, template_name, trigger_reason)
                    )
                    conn.commit()
                    logger.info(f"Fired {template_name} to User {user_id}")
                except Exception as e:
                    logger.error(f"Failed to send {template_name} to User {user_id}: {e}")
                    conn.rollback()

    except Exception as e:
        logger.error(f"Daily Nudge Cron Error: {e}")
    finally:
        cursor.execute("SET time_zone = '+00:00'") 
        conn.close()
        logger.info("Daily Nudge Evaluation Complete.")