import logging
from datetime import datetime, timedelta, date
import calendar
from typing import Any
from database import get_db
from whatsapp_service import send_whatsapp_template

logger = logging.getLogger(__name__)

async def run_daily_nudges(target_rule: str = "all"):
    logger.info(f"Starting Dynamic Nudge Engine. Target: {target_rule}")
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("SET time_zone = '+05:30'")
        now = datetime.utcnow() + timedelta(hours=5, minutes=30)
        today = now.date()
        
        cursor.execute("SELECT * FROM nudge_settings WHERE is_active = TRUE ORDER BY hours_min DESC")
        active_rules = cursor.fetchall()
        
        is_sunday = today.weekday() == 6
        is_month_end = today.day == calendar.monthrange(today.year, today.month)[1]

        cursor.execute("SELECT id, mobile FROM users WHERE is_verified = TRUE AND mobile IS NOT NULL")
        users = cursor.fetchall()

        for user in users:
            user_id, mobile = int(user['id']), str(user['mobile'])
                
            cursor.execute("SELECT MAX(date) as last_active FROM transactions WHERE user_id = %s", (user_id,))
            last_tx = cursor.fetchone()
            if not last_tx or not last_tx.get('last_active'): continue
                
            last_val = last_tx['last_active']
            if isinstance(last_val, datetime): last_active = last_val
            elif isinstance(last_val, str): last_active = datetime.strptime(last_val.split('.')[0], '%Y-%m-%d %H:%M:%S')
            else: continue
                
            hours_inactive = (now - last_active).total_seconds() / 3600.0
            if hours_inactive > 200 or hours_inactive <= 0: continue

            cursor.execute("SELECT SUM(amount) as total FROM transactions WHERE user_id = %s AND type = 'expense' AND MONTH(date) = MONTH(CURDATE())", (user_id,))
            m_total_row = cursor.fetchone()
            month_total = float(m_total_row['total']) if m_total_row and m_total_row.get('total') is not None else 0.0

            cursor.execute("SELECT COUNT(*) as count FROM automated_messages WHERE user_id = %s AND DATE(sent_at) = CURDATE()", (user_id,))
            daily_limit_reached = cursor.fetchone().get('count', 0) >= 1
                
            cursor.execute("SELECT COUNT(*) as count FROM automated_messages WHERE user_id = %s AND sent_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)", (user_id,))
            weekly_limit_reached = cursor.fetchone().get('count', 0) >= 3

            template_to_send, trigger_reason, variables = None, "", [f"{month_total:g}"]

            for rule in active_rules:
                if target_rule != "all" and target_rule != rule['rule_name']: continue

                if rule['rule_type'] == 'monthly' and is_month_end and now.hour == 22:
                    template_to_send, trigger_reason = rule['template_name'], rule['rule_name']
                    variables = [f"{month_total:g}", f"{(month_total / today.day if today.day > 0 else 0):.0f}"]
                    break
                elif rule['rule_type'] == 'weekly' and is_sunday and now.hour == 19:
                    template_to_send, trigger_reason = rule['template_name'], rule['rule_name']
                    cursor.execute("SELECT c.name, SUM(t.amount) as total FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.user_id = %s AND t.type = 'expense' AND t.date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY c.name ORDER BY total DESC LIMIT 1", (user_id,))
                    top_cat = cursor.fetchone()
                    variables = [f"{month_total:g}", str(top_cat.get('name', 'Various')) if isinstance(top_cat, dict) else "Various", f"{(float(top_cat['total']) if isinstance(top_cat, dict) and top_cat.get('total') is not None else 0.0):g}"]
                    break
                
                elif rule['rule_type'] == 'inactivity' and rule['hours_min'] <= hours_inactive < rule['hours_max']:
                    if not rule['bypass_limits'] and (daily_limit_reached or weekly_limit_reached): continue
                    
                    template_to_send, trigger_reason = rule['template_name'], rule['rule_name']
                    break

            # 3. Fire
            if template_to_send:
                cursor.execute("SELECT COUNT(*) as count FROM automated_messages WHERE user_id = %s AND template_name = %s AND DATE(sent_at) = CURDATE()", (user_id, template_to_send))
                if cursor.fetchone().get('count', 0) == 0:
                    try:
                        await send_whatsapp_template(mobile, template_to_send, variables)
                        cursor.execute("INSERT INTO automated_messages (user_id, template_name, trigger_reason, sent_at) VALUES (%s, %s, %s, UTC_TIMESTAMP())", (user_id, template_to_send, trigger_reason))
                        conn.commit()
                        logger.info(f"Fired {template_to_send} to User {user_id}")
                    except Exception as e:
                        logger.error(f"Failed to send {template_to_send} to User {user_id}: {e}")
                        conn.rollback()

    except Exception as e: logger.error(f"Nudge Engine Error: {e}")
    finally:
        cursor.execute("SET time_zone = '+00:00'") 
        conn.close()
        logger.info("Nudge Engine Evaluation Complete.")