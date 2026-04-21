import logging
from datetime import datetime, timedelta, date
import calendar
from typing import Any
from database import get_db
from whatsapp_service import send_whatsapp_template
from constants import (
    TEMPLATE_HABIT, TEMPLATE_DAILY_NUDGE, TEMPLATE_STREAK_NUDGE, 
    TEMPLATE_WEEKLY_NUDGE, TEMPLATE_SOFT_NUDGE, TEMPLATE_REACTIVATION, 
    TEMPLATE_INSIGHT_REACTIVATION, TEMPLATE_INSIGHT, TEMPLATE_MONTHLY
)

logger = logging.getLogger(__name__)

async def run_daily_nudges(target_rule: str = "all"):
    """Evaluates all users and sends automated nudges based on DB rules and hour targets."""
    logger.info(f"Starting Nudge Engine. Target Rule: {target_rule}")
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("SET time_zone = '+05:30'")
        now = datetime.utcnow() + timedelta(hours=5, minutes=30)
        today = now.date()
        
        cursor.execute("SELECT rule_name, is_active FROM nudge_settings")
        active_rules = {row['rule_name']: bool(row['is_active']) for row in cursor.fetchall()}

        def is_rule_allowed(rule_name: str) -> bool:
            if target_rule != "all" and target_rule != rule_name:
                return False
            return active_rules.get(rule_name, True)

        is_sunday = today.weekday() == 6
        last_day_of_month = calendar.monthrange(today.year, today.month)[1]
        is_month_end = today.day == last_day_of_month

        cursor.execute("SELECT id, mobile FROM users WHERE is_verified = TRUE AND mobile IS NOT NULL")
        users: list[Any] = cursor.fetchall()

        for user in users:
            if not isinstance(user, dict): continue

            user_id = int(user.get('id', 0))
            mobile = str(user.get('mobile', ''))
            if not user_id or not mobile: continue
                
            cursor.execute("SELECT MAX(date) as last_active FROM transactions WHERE user_id = %s", (user_id,))
            last_tx: Any = cursor.fetchone()
            if not last_tx or not last_tx.get('last_active'): continue
                
            last_active_val = last_tx['last_active']
            if isinstance(last_active_val, datetime): last_active = last_active_val
            elif isinstance(last_active_val, date): last_active = datetime.combine(last_active_val, datetime.min.time())
            elif isinstance(last_active_val, str):
                try: last_active = datetime.strptime(last_active_val, '%Y-%m-%d %H:%M:%S')
                except ValueError: last_active = datetime.strptime(last_active_val.split('.')[0], '%Y-%m-%d %H:%M:%S')
            else: continue
                
            hours_inactive = (now - last_active).total_seconds() / 3600.0
            if hours_inactive > 200 or hours_inactive <= 0: continue

            cursor.execute("""
                SELECT COUNT(*) as count FROM automated_messages 
                WHERE user_id = %s AND DATE(sent_at) = CURDATE() AND template_name != %s
            """, (user_id, TEMPLATE_HABIT))
            daily_limit_reached = cursor.fetchone().get('count', 0) >= 1
                
            cursor.execute("""
                SELECT COUNT(*) as count FROM automated_messages 
                WHERE user_id = %s AND sent_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND template_name != %s
            """, (user_id, TEMPLATE_HABIT))
            weekly_limit_reached = cursor.fetchone().get('count', 0) >= 3

            template_to_send = None
            variables: list[str] = []
            trigger_reason = ""

            # --- 3. SCHEDULED INSIGHTS ---
            if is_month_end and now.hour == 22 and is_rule_allowed("monthly_insight"):
                cursor.execute("SELECT COUNT(*) as count FROM automated_messages WHERE user_id = %s AND template_name = %s AND DATE(sent_at) = CURDATE()", (user_id, TEMPLATE_MONTHLY))
                if cursor.fetchone().get('count', 0) == 0:
                    template_to_send = TEMPLATE_MONTHLY
                    trigger_reason = "monthly_insight"
                    cursor.execute("SELECT SUM(amount) as total FROM transactions WHERE user_id = %s AND type = 'expense' AND MONTH(date) = MONTH(CURDATE())", (user_id,))
                    m_total_row: Any = cursor.fetchone()
                    month_total = float(m_total_row['total']) if m_total_row and m_total_row.get('total') is not None else 0.0
                    variables = [f"{month_total:g}", f"{(month_total / today.day if today.day > 0 else 0):.0f}"]
                    
            elif is_sunday and now.hour == 19 and is_rule_allowed("weekly_insight"):
                cursor.execute("SELECT COUNT(*) as count FROM automated_messages WHERE user_id = %s AND template_name = %s AND DATE(sent_at) = CURDATE()", (user_id, TEMPLATE_INSIGHT))
                if cursor.fetchone().get('count', 0) == 0:
                    template_to_send = TEMPLATE_INSIGHT
                    trigger_reason = "weekly_insight"
                    cursor.execute("SELECT SUM(amount) as total FROM transactions WHERE user_id = %s AND type = 'expense' AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)", (user_id,))
                    w_total_row: Any = cursor.fetchone()
                    week_total = float(w_total_row['total']) if w_total_row and w_total_row.get('total') is not None else 0.0
                    cursor.execute("SELECT c.name, SUM(t.amount) as total FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.user_id = %s AND t.type = 'expense' AND t.date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY c.name ORDER BY total DESC LIMIT 1", (user_id,))
                    top_cat_row: Any = cursor.fetchone()
                    variables = [f"{week_total:g}", str(top_cat_row.get('name', 'Various')) if isinstance(top_cat_row, dict) else "Various", f"{(float(top_cat_row['total']) if isinstance(top_cat_row, dict) and top_cat_row.get('total') is not None else 0.0):g}"]

            # --- 4. THE HABIT NUDGE ---
            if not template_to_send and 12.0 <= hours_inactive < 12.5 and is_rule_allowed("12h_inactive"):
                cursor.execute("SELECT COUNT(*) as count FROM automated_messages WHERE user_id = %s AND template_name = %s AND sent_at >= %s", (user_id, TEMPLATE_HABIT, last_active))
                if cursor.fetchone().get('count', 0) == 0:
                    template_to_send = TEMPLATE_HABIT
                    trigger_reason = "12h_inactive"

            # --- 5. STRICT HOUR-BASED INACTIVITY NUDGES ---
            if not template_to_send and not daily_limit_reached and not weekly_limit_reached:
                cursor.execute("SELECT SUM(amount) as total FROM transactions WHERE user_id = %s AND type = 'expense' AND MONTH(date) = MONTH(CURDATE())", (user_id,))
                m_total_row = cursor.fetchone()
                month_total = float(m_total_row['total']) if m_total_row and m_total_row.get('total') is not None else 0.0

                if 168 <= hours_inactive < 192 and is_rule_allowed("7_days_inactive"):
                    template_to_send, trigger_reason = TEMPLATE_WEEKLY_NUDGE, "7_days_inactive"
                elif 120 <= hours_inactive < 144 and is_rule_allowed("5_days_inactive"):
                    template_to_send, trigger_reason, variables = TEMPLATE_INSIGHT_REACTIVATION, "5_days_inactive", [f"{month_total:g}"]
                elif 96 <= hours_inactive < 120 and is_rule_allowed("4_days_inactive"):
                    template_to_send, trigger_reason = TEMPLATE_REACTIVATION, "4_days_inactive"
                elif 72 <= hours_inactive < 96 and is_rule_allowed("3_days_inactive"):
                    template_to_send, trigger_reason = TEMPLATE_STREAK_NUDGE, "3_days_inactive"
                elif 48 <= hours_inactive < 72 and is_rule_allowed("2_days_inactive"):
                    template_to_send, trigger_reason = TEMPLATE_SOFT_NUDGE, "2_days_inactive"
                elif 23.5 <= hours_inactive < 48 and is_rule_allowed("24h_inactive"):
                    template_to_send, trigger_reason, variables = TEMPLATE_DAILY_NUDGE, "24h_inactive", [f"{month_total:g}"]

            # --- 6. SEND AND LOG ---
            if template_to_send:
                cursor.execute("SELECT COUNT(*) as count FROM automated_messages WHERE user_id = %s AND template_name = %s AND DATE(sent_at) = CURDATE()", (user_id, template_to_send))
                if cursor.fetchone().get('count', 0) == 0 or template_to_send == TEMPLATE_HABIT:
                    try:
                        await send_whatsapp_template(mobile, template_to_send, variables)
                        cursor.execute(
                            "INSERT INTO automated_messages (user_id, template_name, trigger_reason, sent_at) VALUES (%s, %s, %s, UTC_TIMESTAMP())",
                            (user_id, template_to_send, trigger_reason)
                        )
                        conn.commit()
                        logger.info(f"Fired {template_to_send} to User {user_id}")
                    except Exception as e:
                        logger.error(f"Failed to send {template_to_send} to User {user_id}: {e}")
                        conn.rollback()

    except Exception as e:
        logger.error(f"Nudge Engine Error: {e}")
    finally:
        cursor.execute("SET time_zone = '+00:00'") 
        conn.close()
        logger.info("Nudge Engine Evaluation Complete.")