import logging, os, asyncio
from datetime import datetime, timedelta, date
import calendar
from typing import Any
from database import get_db
from whatsapp_service import send_whatsapp_template
from bot_handlers import handle_monthly_request

if not os.path.exists('logs'):
    os.makedirs('logs')

def custom_ist_time(*args):
    utc_dt = datetime.utcnow()
    ist_dt = utc_dt + timedelta(hours=5, minutes=30)
    return ist_dt.timetuple()

logging.Formatter.converter = custom_ist_time

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

if not logger.handlers:
    file_handler = logging.FileHandler('logs/nudge_engine.log')
    file_handler.setLevel(logging.INFO)
    
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    file_handler.setFormatter(formatter)
    
    logger.addHandler(file_handler)
    
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

async def run_daily_nudges(target_rule: str = "all"):
    logger.info(f"Starting Bulk-Optimized Nudge Engine. Target: {target_rule}")
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    try:
        now = datetime.utcnow() + timedelta(hours=5, minutes=30)
        today = now.date()
        current_day_name = calendar.day_name[today.weekday()]
        current_day_num = today.day
        last_day_of_month = calendar.monthrange(today.year, today.month)[1]
        
        cursor.execute("SELECT * FROM nudge_settings WHERE is_active = TRUE ORDER BY hours_min DESC")
        active_rules = cursor.fetchall()

        cursor.execute("SELECT id, name, mobile, created_at FROM users WHERE is_verified = TRUE AND mobile IS NOT NULL")
        users = cursor.fetchall()


        cursor.execute("""
            SELECT 
                user_id,
                MAX(date) as last_active,
                SUM(CASE WHEN type = 'expense' AND MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE()) THEN amount ELSE 0 END) as month_total,
                SUM(CASE WHEN type = 'expense' AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN amount ELSE 0 END) as week_total,
                SUM(CASE WHEN type = 'expense' AND DATE(date) = CURDATE() THEN amount ELSE 0 END) as today_total
            FROM transactions
            GROUP BY user_id
        """)
        tx_stats_raw = cursor.fetchall()
        tx_map = {row['user_id']: row for row in tx_stats_raw}

        cursor.execute("""
            SELECT user_id, template_name, sent_at 
            FROM automated_messages 
            WHERE sent_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        """)
        msg_history_raw = cursor.fetchall()
        
        msg_map = {}
        for msg in msg_history_raw:
            uid = msg['user_id']
            if uid not in msg_map:
                msg_map[uid] = {'daily_count': 0, 'weekly_count': 0, 'sent_today': set()}
            
            msg_map[uid]['weekly_count'] += 1
            if msg['sent_at'].date() == today:
                msg_map[uid]['daily_count'] += 1
                msg_map[uid]['sent_today'].add(msg['template_name'])


        for user in users:
            await asyncio.sleep(0.001)
            
            user_id, mobile = int(user['id']), str(user['mobile'])
            
            user_tx = tx_map.get(user_id, {})
            user_msgs = msg_map.get(user_id, {'daily_count': 0, 'weekly_count': 0, 'sent_today': set()})
                
            last_val = user_tx.get('last_active') or user.get('created_at')
            has_transactions = bool(user_tx.get('last_active'))
                
            if not last_val: continue
                
            if isinstance(last_val, datetime): last_active = last_val
            elif isinstance(last_val, date): last_active = datetime.combine(last_val, datetime.min.time())
            elif isinstance(last_val, str):
                try: last_active = datetime.strptime(last_val, '%Y-%m-%d %H:%M:%S')
                except ValueError: last_active = datetime.strptime(last_val.split('.')[0], '%Y-%m-%d %H:%M:%S')
            else: continue
                
            hours_inactive = (now - last_active).total_seconds() / 3600.0

            daily_limit_reached = user_msgs['daily_count'] >= 1
            weekly_limit_reached = user_msgs['weekly_count'] >= 3
            month_total = float(user_tx.get('month_total') or 0.0)

            template_to_send, trigger_reason, dynamic_vars_string = None, "", ""

            for rule in active_rules:
                if target_rule != "all" and target_rule != rule['rule_name']: continue
                
                template_name = rule['template_name']
                
                # Check memory if already sent today
                if template_name in user_msgs['sent_today']:
                    continue
                
                var_req = rule.get('variables_required') or ""
                rule_type = rule.get('rule_type', 'inactivity')
                
                try:
                    time_str = str(rule.get('schedule_time', '10:00'))
                    target_hour = int(time_str.split(':')[0])
                    target_minute = int(time_str.split(':')[1]) if ':' in time_str else 0
                except:
                    target_hour, target_minute = 10, 0

                target_mins = (target_hour * 60) + target_minute
                now_mins = (now.hour * 60) + now.minute
                
                time_diff = now_mins - target_mins
                if time_diff < 0: time_diff += 24 * 60 
                is_time_match = 0 <= time_diff < 30

                if rule_type == 'monthly':
                    try: target_day = int(rule.get('schedule_day', last_day_of_month))
                    except: target_day = last_day_of_month
                    is_target_day = (current_day_num == target_day) or (target_day >= last_day_of_month and current_day_num == last_day_of_month)
                    
                    if is_target_day and is_time_match:
                        try:
                            await handle_monthly_request(mobile, is_end_of_month=True, template_name=template_name)
                            cursor.execute("INSERT INTO automated_messages (user_id, template_name, trigger_reason, sent_at) VALUES (%s, %s, %s, NOW())", (user_id, template_name, rule['rule_name']))
                            conn.commit()
                            logger.info(f"Fired {template_name} (Monthly) to User {user_id}")
                        except Exception as e:
                            logger.error(f"Failed to send {template_name} to User {user_id}: {e}")
                            conn.rollback()
                        break
                        
                elif rule_type == 'weekly':
                    if current_day_name == rule.get('schedule_day', 'Monday') and is_time_match:
                        template_to_send, trigger_reason, dynamic_vars_string = template_name, rule['rule_name'], var_req
                        break
                
                elif rule_type == 'daily':
                    if is_time_match:
                        template_to_send, trigger_reason, dynamic_vars_string = template_name, rule['rule_name'], var_req
                        break
                
                if hours_inactive > 200 or hours_inactive <= 0: continue

                if rule_type == 'onboarding' and not has_transactions:
                    if rule['hours_min'] <= hours_inactive < rule['hours_max']:
                        if not rule['bypass_limits'] and (daily_limit_reached or weekly_limit_reached): continue
                        template_to_send, trigger_reason, dynamic_vars_string = template_name, rule['rule_name'], var_req
                        break

                elif rule_type == 'inactivity':
                    if rule['hours_min'] <= hours_inactive < rule['hours_max']:
                        if not rule['bypass_limits'] and (daily_limit_reached or weekly_limit_reached): continue
                        template_to_send, trigger_reason, dynamic_vars_string = template_name, rule['rule_name'], var_req
                        break

            # Execute sending logic if a rule matched
            if template_to_send:
                variables_payload = []
                raw_vars = dynamic_vars_string.replace('[', '').replace(']', '').strip()
                
                if raw_vars:
                    var_keys = [v.strip() for v in raw_vars.split(',') if v.strip()]
                    for v_key in var_keys:
                        if v_key == 'user_name': variables_payload.append(str(user.get('name', '')))
                        elif v_key == 'month_total': variables_payload.append(f"{month_total:g}")
                        elif v_key == 'avg_per_day': variables_payload.append(f"{(month_total / today.day if today.day > 0 else 0):.0f}")
                        
                        elif v_key == 'week_total': variables_payload.append(f"{(float(user_tx.get('week_total') or 0.0)):g}")
                        elif v_key == 'today_total': variables_payload.append(f"{(float(user_tx.get('today_total') or 0.0)):g}")
                        
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
                            
                try:
                    await send_whatsapp_template(mobile, template_to_send, variables_payload)
                    cursor.execute("INSERT INTO automated_messages (user_id, template_name, trigger_reason, sent_at) VALUES (%s, %s, %s, NOW())", (user_id, template_to_send, trigger_reason))
                    conn.commit()
                    logger.info(f"Fired {template_to_send} to User {user_id}")
                except Exception as e:
                    logger.error(f"Failed to send {template_to_send} to User {user_id}: {e}")
                    conn.rollback()

    except Exception as e: logger.error(f"Nudge Engine Error: {e}")
    finally:
        conn.close()
        logger.info("Nudge Engine Evaluation Complete.")