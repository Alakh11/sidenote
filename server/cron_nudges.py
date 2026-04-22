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

        cursor.execute("SELECT id, name, mobile, CONVERT_TZ(created_at, '+00:00', '+05:30') as created_at FROM users WHERE is_verified = TRUE AND mobile IS NOT NULL")
        users = cursor.fetchall()

        for user in users:
            user_id, mobile = int(user['id']), str(user['mobile'])
                
            cursor.execute("SELECT MAX(date) as last_active FROM transactions WHERE user_id = %s", (user_id,))
            last_tx = cursor.fetchone()
            
            has_transactions = False
            
            if last_tx and last_tx.get('last_active'):
                last_val = last_tx['last_active']
                has_transactions = True
            else:
                last_val = user.get('created_at')
                
            if not last_val: continue
                
            if isinstance(last_val, datetime): last_active = last_val
            elif isinstance(last_val, date): last_active = datetime.combine(last_val, datetime.min.time())
            elif isinstance(last_val, str):
                try: last_active = datetime.strptime(last_val, '%Y-%m-%d %H:%M:%S')
                except ValueError: last_active = datetime.strptime(last_val.split('.')[0], '%Y-%m-%d %H:%M:%S')
            else: continue
                
            hours_inactive = (now - last_active).total_seconds() / 3600.0
            if hours_inactive > 200 or hours_inactive <= 0: continue

            cursor.execute("SELECT COUNT(*) as count FROM automated_messages WHERE user_id = %s AND DATE(CONVERT_TZ(sent_at, '+00:00', '+05:30')) = CURDATE()", (user_id,))
            daily_limit_reached = cursor.fetchone().get('count', 0) >= 1
                
            cursor.execute("SELECT COUNT(*) as count FROM automated_messages WHERE user_id = %s AND CONVERT_TZ(sent_at, '+00:00', '+05:30') >= DATE_SUB(NOW(), INTERVAL 7 DAY)", (user_id,))
            weekly_limit_reached = cursor.fetchone().get('count', 0) >= 3

            cursor.execute("SELECT SUM(amount) as total FROM transactions WHERE user_id = %s AND type = 'expense' AND MONTH(date) = MONTH(CURDATE())", (user_id,))
            m_total_row = cursor.fetchone()
            month_total = float(m_total_row['total']) if m_total_row and m_total_row.get('total') is not None else 0.0

            template_to_send, trigger_reason, dynamic_vars_string = None, "", ""

            for rule in active_rules:
                if target_rule != "all" and target_rule != rule['rule_name']: continue
                var_req = rule.get('variables_required') or ""

                if rule['rule_type'] == 'monthly' and is_month_end and now.hour == 22:
                    template_to_send, trigger_reason, dynamic_vars_string = rule['template_name'], rule['rule_name'], var_req
                    break
                    
                elif rule['rule_type'] == 'weekly' and is_sunday and now.hour == 19:
                    template_to_send, trigger_reason, dynamic_vars_string = rule['template_name'], rule['rule_name'], var_req
                    break
                
                elif rule['rule_type'] == 'onboarding' and not has_transactions:
                    if rule['hours_min'] <= hours_inactive < rule['hours_max']:
                        if not rule['bypass_limits'] and (daily_limit_reached or weekly_limit_reached): continue
                        template_to_send, trigger_reason, dynamic_vars_string = rule['template_name'], rule['rule_name'], var_req
                        break

                elif rule['rule_type'] == 'inactivity':
                    if rule['hours_min'] <= hours_inactive < rule['hours_max']:
                        if not rule['bypass_limits'] and (daily_limit_reached or weekly_limit_reached): continue
                        template_to_send, trigger_reason, dynamic_vars_string = rule['template_name'], rule['rule_name'], var_req
                        break

            if template_to_send:
                variables_payload = []
                raw_vars = dynamic_vars_string.replace('[', '').replace(']', '').strip()
                
                if raw_vars:
                    var_keys = [v.strip() for v in raw_vars.split(',') if v.strip()]
                    for v_key in var_keys:
                        if v_key == 'user_name':
                            variables_payload.append(str(user.get('name', '')))
                        elif v_key == 'month_total':
                            variables_payload.append(f"{month_total:g}")
                        elif v_key == 'avg_per_day':
                            variables_payload.append(f"{(month_total / today.day if today.day > 0 else 0):.0f}")
                        elif v_key == 'week_total':
                            cursor.execute("SELECT SUM(amount) as total FROM transactions WHERE user_id = %s AND type = 'expense' AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)", (user_id,))
                            w_total = cursor.fetchone()
                            variables_payload.append(f"{(float(w_total['total']) if w_total and w_total.get('total') is not None else 0.0):g}")
                        elif v_key == 'today_total':
                            cursor.execute("SELECT SUM(amount) as total FROM transactions WHERE user_id = %s AND type = 'expense' AND DATE(date) = CURDATE()", (user_id,))
                            t_total = cursor.fetchone()
                            variables_payload.append(f"{(float(t_total['total']) if t_total and t_total.get('total') is not None else 0.0):g}")
                        elif v_key == 'top_category':
                            cursor.execute("SELECT c.name FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.user_id = %s AND t.type = 'expense' AND t.date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY c.name ORDER BY SUM(t.amount) DESC LIMIT 1", (user_id,))
                            c_row = cursor.fetchone()
                            variables_payload.append(str(c_row['name']) if c_row else "Various")
                        elif v_key == 'top_category_amount':
                            cursor.execute("SELECT SUM(t.amount) as total FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.user_id = %s AND t.type = 'expense' AND t.date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY c.name ORDER BY total DESC LIMIT 1", (user_id,))
                            c_row = cursor.fetchone()
                            variables_payload.append(f"{(float(c_row['total']) if c_row and c_row.get('total') is not None else 0.0):g}")
                        elif v_key == 'last_category':
                            cursor.execute("SELECT c.name FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.user_id = %s ORDER BY t.date DESC LIMIT 1", (user_id,))
                            c_row = cursor.fetchone()
                            variables_payload.append(str(c_row['name']) if c_row else "Various")
                        else:
                            variables_payload.append("")
                            
                cursor.execute("SELECT COUNT(*) as count FROM automated_messages WHERE user_id = %s AND template_name = %s AND DATE(CONVERT_TZ(sent_at, '+00:00', '+05:30')) = CURDATE()", (user_id, template_to_send))
                if cursor.fetchone().get('count', 0) == 0:
                    try:
                        await send_whatsapp_template(mobile, template_to_send, variables_payload)
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