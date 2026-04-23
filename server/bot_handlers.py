import re, traceback, asyncio, time, calendar, random
from typing import Any, Optional
from database import get_db
from datetime import datetime, timedelta, date
from whatsapp_service import send_whatsapp_template, send_whatsapp_text, send_whatsapp_interactive_buttons, get_whatsapp_media_url, download_whatsapp_media
from ai_service import extract_receipt_data, extract_voice_data
from constants import *

db_semaphore = asyncio.Semaphore(20)

processed_message_ids: dict[str, float] = {}

def is_duplicate(message_id: Optional[str]) -> bool:
    if not message_id: 
        return False
    
    current_time = time.time()
    
    keys_to_delete = [k for k, timestamp in processed_message_ids.items() if current_time - timestamp > 60.0]
    for k in keys_to_delete:
        del processed_message_ids[k]
        
    if message_id in processed_message_ids:
        print(f"⚠️ Dropped Duplicate Message: {message_id}")
        return True
        
    processed_message_ids[message_id] = current_time
    return False

def extract_transaction_details(text: str):
    """Smartly extracts the amount and item from a conversational string."""
    text = text.lower().strip()
    
    text = re.sub(r'(?<=\d)\s+(?=\d)', '', text)
    text = re.sub(r'(?<=\d),(?=\d)', '', text)
    
    currency_match = re.search(r'(?:rs\.?|₹|rupees|inr|rupee|paise|paisa|taka)\s*(\d+(?:\.\d+)?)', text) or \
                     re.search(r'(\d+(?:\.\d+)?)\s*(?:rs\.?|₹|rupees|inr|rupee|paise|paisa|taka)', text)
                     
    if currency_match:
        amount_str = currency_match.group(1)
    else:
        numbers = re.findall(r'\d+(?:\.\d+)?', text)
        if not numbers:
            return None, text
        amount_str = max(numbers, key=float)
        
    amount = float(amount_str)
    
    item = text.replace(amount_str, "", 1)
    item = re.sub(r'\b(rs\.?|rupees|inr|rupee|paise|paisa|taka)\b', '', item)
    item = item.replace('₹', '')
    item = re.sub(r'\s{2,}', ' ', item).strip("- =:, ")
    item = re.sub(r'^(for|on|a|an|the|spent on)\s+', '', item).strip()
    item = re.sub(r'\s+(for|on)$', '', item).strip()
    
    return amount, item

def get_user_id(cursor: Any, phone: str) -> int | None:
    """Fetches the user_id associated with the mobile number."""
    cursor.execute("SELECT id FROM users WHERE mobile = %s", (phone,))
    user_row = cursor.fetchone()
    if user_row:
        return int(tuple(user_row)[0])
    return None

async def ensure_user_exists(phone: str, sender_name: str = "WhatsApp User") -> bool:
    """Checks if user exists. If not, creates them. If they exist with the default name, updates it."""
    conn = None
    cursor = None
    is_new = False
    
    async with db_semaphore:
        try:
            conn = get_db()
            cursor = conn.cursor()
            
            cursor.execute("SELECT id, name FROM users WHERE mobile = %s", (phone,))
            existing_user = cursor.fetchone()
            
            if existing_user:
                user_id = existing_user[0]
                current_name = existing_user[1]
                
                if current_name == 'WhatsApp User' and sender_name != 'WhatsApp User':
                    cursor.execute("UPDATE users SET name = %s WHERE id = %s", (sender_name, user_id))
                    conn.commit()
                    print(f"🔄 Upgraded legacy user {phone} to real name: {sender_name}")
                    
                return False
                
            cursor.execute("INSERT INTO users (mobile, name, is_verified) VALUES (%s, %s, TRUE)", (phone, sender_name))
            conn.commit()
            is_new = True
            
        except Exception as e:
            print(f"Error ensuring user exists: {e}")
            return False
        finally:
            if cursor: 
                try: cursor.close()
                except: pass
            if conn: 
                try: conn.close()
                except: pass
            
    if is_new:
        await send_whatsapp_template(phone, TEMPLATE_WELCOME, [])
        # welcome_link_msg = (
        #     "🌐 *Finish setting up your account!*\n\n"
        #     "To view your charts and secure your data:\n"
        #     "🔗 https://www.sidenote.in/login\n\n"
        #     "Click *Sign Up* and use this mobile number to link your accounts.\n\n"
        #     "(Or type 'menu' anytime to see your options)"
        # )
        # await send_whatsapp_text(phone, welcome_link_msg)
        return True
    return False

async def handle_dynamic_replies(phone: str, incoming_text: str):
    incoming_text = incoming_text.lower().strip()
    conn = None
    cursor = None
    
    async with db_semaphore:
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT reply_text, trigger_keywords, buttons_json FROM auto_replies WHERE is_active = TRUE")
            mappings = cursor.fetchall()
            
            for row in mappings:
                keywords = [k.strip() for k in row['trigger_keywords'].split(',')]
                
                if any(k == incoming_text or f" {k} " in f" {incoming_text} " for k in keywords):
                    reply_body = row['reply_text']
                    buttons = None
                    
                    if row['buttons_json']:
                        import json
                        try: buttons = json.loads(row['buttons_json'])
                        except: pass
                    
                    if buttons:
                        await send_whatsapp_interactive_buttons(phone, reply_body, buttons)
                    else:
                        await send_whatsapp_text(phone, reply_body)
                    return True
        except Exception as e:
            print(f"Dynamic Reply Error: {e}")
        finally:
            if conn: conn.close()
            
    return False

async def process_whatsapp_text(phone: str, text: str, message_id: Optional[str] = None, sender_name: str = "WhatsApp User"):
    if is_duplicate(message_id): return
    
    is_new = await ensure_user_exists(phone, sender_name)
    
    text = text.strip().lower()
    
    if is_new and text in ['hi', 'hello', 'hey', 'start', 'begin', 'good morning', 'good evening', 'good afternoon', 'good night', 'good day', 'morning', 'evening', 'afternoon', 'night', 'day']:
        return
        
    if text == CMD_MENU: await handle_menu_request(phone)
    elif text == CMD_UNDO: await handle_undo_request(phone)
    elif text == CMD_SUMMARY: await handle_summary_request(phone)
    elif text == CMD_WEEK: await handle_weekly_request(phone)
    elif text == CMD_MONTH: await handle_monthly_request(phone)
    elif text == CMD_TODAY: await handle_today_request(phone)
    elif text == CMD_MORE: await handle_more_request(phone)
    elif text == CMD_HELP: 
        await send_whatsapp_text(phone, "💡 *Tips:*\n- Type `100 food` to add an expense.\n- Type `undo` to delete a mistake.\n- Send a photo of a receipt!\n- Send a Voice Note!")
    elif await handle_dynamic_replies(phone, text):
        return
    elif text.startswith(CMD_SET_BUDGET): await handle_budget_set(phone, text)
    else:
        if '\n' in text:
            lines = text.split('\n')
            added_count = 0
            total_expense = 0.0
            total_income = 0.0
            failed_lines = []
            
            for line in lines:
                if not line.strip(): continue
                
                amount, item = extract_transaction_details(line)
                
                if amount is not None:
                    is_saved = await handle_transaction_entry(phone, amount, item, silent=True, sender_name=sender_name)
                    
                    if is_saved:
                        if any(keyword in item.lower() for keyword in INCOME_KEYWORDS):
                            total_income += amount
                        else:
                            total_expense += amount
                        added_count += 1
                    else:
                        failed_lines.append(line)
                else:
                    failed_lines.append(line)
                    
            if added_count > 0 or failed_lines:
                summary_msg = ""
                if added_count > 0:
                    summary_msg += f"✅ Saved {added_count} entries!"
                    if total_expense > 0:
                        summary_msg += f"\n💸 Total Expense: ₹{total_expense:g}"
                    if total_income > 0:
                        summary_msg += f"\n💰 Total Income: ₹{total_income:g}"
                
                if failed_lines:
                    summary_msg += "\n\n❌ *Failed to log these lines:* \n" + "\n".join([f"- {fl}" for fl in failed_lines]) + "\n\n_(Make sure they contain a valid number!)_"
                    
                await send_whatsapp_text(phone, summary_msg.strip())
            else:
                await handle_fallback(phone, text)
                
        else:
            amount, item = extract_transaction_details(text)
            if amount is not None:
                await handle_transaction_entry(phone, amount, item, sender_name=sender_name)
            else:
                await handle_fallback(phone, text)

async def process_whatsapp_image(phone: str, media_id: str, mime_type: str, message_id: Optional[str] = None, sender_name: str = "WhatsApp User"):
    if is_duplicate(message_id): return
    
    await ensure_user_exists(phone, sender_name)
    await send_whatsapp_text(phone, "⏳ Reading your receipt ...")
    
    media_url = await get_whatsapp_media_url(media_id)
    if not media_url: return
    
    image_bytes = await download_whatsapp_media(media_url)
    if not image_bytes: return
    
    receipt_data = extract_receipt_data(image_bytes, mime_type)
    
    if receipt_data and 'amount' in receipt_data and 'item' in receipt_data:
        amount = float(receipt_data['amount'])
        item = str(receipt_data['item'])
        
        print(f"🤖 AI Successfully Extracted: ₹{amount} for {item}")
        
        await handle_transaction_entry(phone, amount, item, sender_name=sender_name)
    else:
        await send_whatsapp_text(phone, "❌ Sorry, I couldn't clearly read that receipt.")

async def process_whatsapp_interactive(phone: str, button_id: str, message_id: Optional[str] = None, sender_name: str = "WhatsApp User"):
    if is_duplicate(message_id): return
    
    await ensure_user_exists(phone, sender_name)
    if await handle_dynamic_replies(phone, button_id):
        return
    if button_id == "cmd_summary": await handle_summary_request(phone)
    elif button_id == "cmd_today": await handle_today_request(phone)
    elif button_id == "cmd_more": await handle_more_request(phone)
    elif button_id == "cmd_dashboard": await handle_dashboard_request(phone)
    elif button_id == "cmd_month": await handle_monthly_request(phone)
    elif button_id == "cmd_week": await handle_weekly_request(phone)
    elif button_id == "cmd_help": 
        await send_whatsapp_text(phone, "💡 *Tips:*\n- Type `100 food` to add an expense.\n- Type `undo` to delete a mistake.\n- Send a photo of a receipt!")
    elif button_id.startswith("del_"):
        tx_id = int(button_id.split("_")[1])
        await handle_undo_action(phone, tx_id)
      
async def handle_budget_set(phone: str, text: str):
    match = re.search(r'\d+(?:\.\d+)?', text)
    if not match:
        await send_whatsapp_text(phone, "❌ Please provide an amount. Example: *budget 20000*")
        return

    new_budget = float(match.group(0))
    conn = None
    cursor = None
    
    async with db_semaphore:
        try:
            conn = get_db()
            cursor = conn.cursor()
            
            cursor.execute("UPDATE users SET monthly_budget = %s WHERE mobile = %s", (new_budget, phone))
            conn.commit()
        except Exception as e:
            print(f"Budget Set Error: {e}")
            return
        finally:
            if cursor: 
                try: cursor.close()
                except: pass
            if conn: 
                try: conn.close()
                except: pass
            
    await send_whatsapp_text(phone, f"✅ Budget Set! Your monthly limit is now *₹{new_budget:g}*.\n\nSideNote will now notify you as you approach this limit.\n\n_(To change it, just send a new budget. To remove it, type *budget 0*)_")
    
async def send_delayed_message(phone: str, msg: str, delay: int = 3):
    await asyncio.sleep(delay)
    await send_whatsapp_text(phone, msg)

async def handle_transaction_entry(phone: str, amount: float, item: str, silent: bool = False, sender_name: str = "WhatsApp User") -> bool:

    clean_item = item.replace('\n', ', ').replace('\r', '')
    clean_item = re.sub(r'\s{2,}', ' ', clean_item)
    clean_item = clean_item.strip("- =:, ")
    clean_item = clean_item[:240] 
    
    item_lower = clean_item.lower()
    is_income = any(keyword in item_lower for keyword in INCOME_KEYWORDS)
    tx_type = 'income' if is_income else 'expense'

    conn = None
    cursor = None
    today_total = 0.0
    budget_note = ""
    success = False
    dynamic_hints = []

    async with db_semaphore:
        try:
            conn = get_db()
            cursor = conn.cursor()
            
            # User Check
            cursor.execute("SELECT id, monthly_budget FROM users WHERE mobile = %s", (phone,))
            user_data = cursor.fetchone()
            u_data = tuple(user_data) if user_data else ()
            
            if not u_data:
                cursor.execute("INSERT INTO users (mobile, name, is_verified) VALUES (%s, %s, TRUE)", (phone, sender_name))
                conn.commit()
                user_id = cursor.lastrowid
                budget_limit = 0.0
            else:
                user_id = int(str(u_data[0]))
                budget_limit = float(str(u_data[1])) if u_data[1] else 0.0

            cursor.execute("SELECT trigger_keywords FROM auto_replies WHERE is_active = TRUE")
            ar_rows = cursor.fetchall()
            if ar_rows:
                for ar in ar_rows:
                    try:
                        kws_str = str(ar[0]) if isinstance(ar, (tuple, list)) else str(ar.get('trigger_keywords', ''))
                        first_kw = kws_str.split(',')[0].strip()
                        if first_kw:
                            dynamic_hints.append(f'Type "{first_kw}" to see a custom reply.')
                    except: pass
            
            cursor.execute("SELECT name, keywords, icon, color FROM global_categories WHERE type = %s", (tx_type,))
            global_cats = cursor.fetchall()
            
            target_category_name = "Others"
            cat_icon = "📝"
            cat_color = "#94A3B8" if tx_type == "expense" else "#10B981"
            
            if global_cats:
                for gc in global_cats:
                    if isinstance(gc, tuple):
                        gc_name, gc_keys, gc_icon, gc_color = str(gc[0]), str(gc[1]), str(gc[2]), str(gc[3])
                    else:
                        gc_name, gc_keys, gc_icon, gc_color = gc['name'], gc['keywords'], gc['icon'], gc['color']
                    
                    if not gc_keys or gc_keys.lower() == 'none': continue
                        
                    kws = [k.strip().lower() for k in gc_keys.split(',')]
                    if any(kw in item_lower for kw in kws):
                        target_category_name = gc_name
                        cat_icon = gc_icon or "📝"
                        cat_color = gc_color or ("#6366F1" if tx_type == "expense" else "#10B981")
                        break
            
            cursor.execute("""
                SELECT id FROM categories 
                WHERE user_id = %s AND name = %s AND type = %s 
                LIMIT 1
            """, (user_id, target_category_name, tx_type))
            
            cat_row = cursor.fetchone()
            
            if cat_row:
                category_id = int(cat_row[0] if isinstance(cat_row, (tuple, list)) else cat_row['id'])
            else:
                cursor.execute("""
                    INSERT INTO categories (user_id, name, type, icon, color, is_default) 
                    VALUES (%s, %s, %s, %s, %s, TRUE)
                """, (user_id, target_category_name, tx_type, cat_icon, cat_color))
                conn.commit()
                category_id = cursor.lastrowid
            
            cursor.execute("""
                INSERT INTO transactions (user_id, amount, type, note, date, category_id, payment_mode) 
                VALUES (%s, %s, %s, %s, NOW(), %s, 'Cash')
            """, (user_id, amount, tx_type, clean_item, category_id))
            conn.commit()
            
            # Budget Check Logic
            if tx_type == 'expense' and budget_limit > 0:
                cursor.execute("SELECT SUM(amount) FROM transactions WHERE user_id = %s AND type = 'expense' AND MONTH(date) = MONTH(CURDATE())", (user_id,))
                month_row = tuple(cursor.fetchone() or (0,))
                month_total = float(str(month_row[0])) if month_row[0] else 0.0
                
                remaining = budget_limit - month_total
                percent_used = (month_total / budget_limit)
                
                if percent_used >= 1.0: 
                    budget_note = f"🚨 *OVER BUDGET!* You exceeded your ₹{budget_limit:g} limit by ₹{abs(remaining):g}."
                elif percent_used >= BUDGET_THRESHOLD_WARNING: 
                    budget_note = f"⚠️ *Budget Warning:* You used {percent_used:.0%} of your budget. ₹{remaining:g} left."
                else: 
                    budget_note = f"💰 Budget: ₹{remaining:g} remaining."
                
            if not silent and not is_income:
                cursor.execute("SELECT SUM(amount) FROM transactions WHERE user_id = %s AND type = 'expense' AND DATE(date) = CURDATE()", (user_id,))
                today_row = tuple(cursor.fetchone() or (0,))
                today_total = float(str(today_row[0])) if today_row[0] else 0.0

            success = True
                
        except Exception as e: 
            print(f"Transaction DB Error: {repr(e)}")
            traceback.print_exc()
        finally:
            if cursor: 
                try: cursor.close()
                except: pass
            if conn:
                try: conn.close()
                except: pass

    if success and not silent:
        live_hints = [
            'Type "today" to see today\'s total.',
            'Type "week" to see this week\'s spending.',
            'Type "month" to see this month\'s total.',
            'Type "summary" for a full breakdown.'
        ]
        
        live_hints.extend(dynamic_hints)
        random_hint = random.choice(live_hints)

        if is_income:
            await send_whatsapp_text(phone, f"✅ Income noted!\n₹{amount:g} for '{clean_item}' added.\n\n💡 {random_hint}")
        else:
            await send_whatsapp_template(phone, TEMPLATE_ENTRY_RECORDED, [str(amount), clean_item, f"{today_total:g}"])
            
            follow_up_msg = ""
            if budget_note: 
                follow_up_msg += f"{budget_note}\n\n"
            follow_up_msg += f"💡 {random_hint}"
            
            asyncio.create_task(send_delayed_message(phone, follow_up_msg.strip(), delay=3))
                
    elif not success and not silent:
        await send_whatsapp_text(phone, "❌ *Oops! Something went wrong.* I couldn't save that transaction. Please try again.")

    return success

async def handle_undo_request(phone: str):
    conn = None
    cursor = None
    buttons = []
    
    async with db_semaphore:
        try:
            conn = get_db()
            cursor = conn.cursor()
            
            user_id = get_user_id(cursor, phone)
            if not user_id:
                await send_whatsapp_text(phone, "You haven't made any entries today that can be undone.")
                return
                
            cursor.execute("SELECT id, amount, note FROM transactions WHERE user_id = %s AND DATE(date) = CURDATE() ORDER BY date DESC LIMIT 2", (user_id,))
            rows = cursor.fetchall()
            
            if not rows:
                await send_whatsapp_text(phone, "You haven't made any entries today that can be undone.")
                return

            for row in rows:
                r = tuple(row)
                title = f"❌ {float(str(r[1])):g} {str(r[2])}"[:20]
                buttons.append({"id": f"del_{str(r[0])}", "title": title})
                
        except Exception as e:
            print(f"Undo Error: {e}")
            return
        finally:
            if cursor: 
                try: cursor.close()
                except: pass
            if conn: 
                try: conn.close()
                except: pass
            
    if buttons:
        await send_whatsapp_interactive_buttons(phone, "Which recent entry do you want to delete?", buttons)

async def handle_undo_action(phone: str, tx_id: int):
    conn = None
    cursor = None
    rowcount = 0
    
    async with db_semaphore:
        try:
            conn = get_db()
            cursor = conn.cursor()
            
            user_id = get_user_id(cursor, phone)
            if not user_id: return
            
            cursor.execute("DELETE FROM transactions WHERE id = %s AND user_id = %s AND DATE(date) = CURDATE()", (tx_id, user_id))
            conn.commit()
            rowcount = cursor.rowcount
        except Exception as e:
            print(f"Undo Action Error: {e}")
            return
        finally:
            if cursor: 
                try: cursor.close()
                except: pass
            if conn: 
                try: conn.close()
                except: pass
            
    if rowcount > 0:
        await send_whatsapp_text(phone, "🗑️ Entry deleted successfully!")
    else:
        await send_whatsapp_text(phone, "⚠️ Could not delete. You can only undo transactions made today, or it may have already been removed.")

async def handle_fallback(phone: str, text: str = ""):
    if text in ['hi', 'hello', 'hey']:
        fallback_message = f"Hey there! 👋\nJust send what you want to note.\n\nExamples:\n*200 chai* \n*+5000 salary* (Income)\n\nType *{CMD_MENU}* for options."
    else:
        fallback_message = f"I didn't quite catch that.\n\nJust send what you want to note.\n\nExamples:\n*200 chai* \n*+5000 salary* (Income)\n\nType *{CMD_MENU}* for options or *{CMD_UNDO}* to delete a mistake."
        
    await send_whatsapp_text(phone, fallback_message)

async def handle_summary_request(phone: str):
    conn = None
    cursor = None
    
    async with db_semaphore:
        try:
            conn = get_db()
            cursor = conn.cursor()
            user_id = get_user_id(cursor, phone)
            
            if not user_id:
                await send_whatsapp_text(phone, "You haven't made any entries yet. Try sending `100 lunch` to start!")
                return
            
            cursor.execute("SELECT SUM(amount) FROM transactions WHERE user_id=%s AND type='expense' AND DATE(date)=CURDATE()", (user_id,))
            t_row = tuple(cursor.fetchone() or ())
            today_total = float(str(t_row[0])) if t_row and t_row[0] else 0.0
            
            cursor.execute("SELECT SUM(amount) FROM transactions WHERE user_id=%s AND type='expense' AND YEARWEEK(date, 1)=YEARWEEK(CURDATE(), 1)", (user_id,))
            w_row = tuple(cursor.fetchone() or ())
            week_total = float(str(w_row[0])) if w_row and w_row[0] else 0.0
            
            cursor.execute("SELECT SUM(amount) FROM transactions WHERE user_id=%s AND type='expense' AND MONTH(date)=MONTH(CURDATE())", (user_id,))
            m_row = tuple(cursor.fetchone() or ())
            month_total = float(str(m_row[0])) if m_row and m_row[0] else 0.0

            cursor.execute("SELECT note, amount FROM transactions WHERE user_id=%s AND type='expense' AND MONTH(date)=MONTH(CURDATE()) ORDER BY amount DESC LIMIT 1", (user_id,))
            h_row = tuple(cursor.fetchone() or ())
            highest_item = str(h_row[0]) if h_row and h_row[0] else "None"
            highest_amount = float(str(h_row[1])) if h_row else 0.0
            
        finally:
            if cursor: 
                try: cursor.close()
                except: pass
            if conn: 
                try: conn.close()
                except: pass
            
    await send_whatsapp_template(phone, TEMPLATE_OVERVIEW, [f"{today_total:g}", f"{week_total:g}", f"{month_total:g}", highest_item, f"{highest_amount:g}"])

async def handle_weekly_request(phone: str):
    conn = None
    cursor = None
    
    async with db_semaphore:
        try:
            conn = get_db()
            cursor = conn.cursor()
            user_id = get_user_id(cursor, phone)
            if not user_id: return
            
            cursor.execute("SELECT WEEKDAY(date), SUM(amount) FROM transactions WHERE user_id = %s AND type = 'expense' AND YEARWEEK(date, 1) = YEARWEEK(CURDATE(), 1) GROUP BY WEEKDAY(date)", (user_id,))
            days = [0.0] * 7 
            for row in cursor.fetchall():
                r = tuple(row)
                days[int(str(r[0]))] = float(str(r[1]))
                
        finally:
            if cursor: 
                try: cursor.close()
                except: pass
            if conn: 
                try: conn.close()
                except: pass
            
    week_total = sum(days)
    variables = [f"{week_total:g}"] + [f"{d:g}" for d in days]
    await send_whatsapp_template(phone, TEMPLATE_WEEKLY, variables)

async def handle_monthly_request(phone: str, is_end_of_month: bool = False, template_name: str = "monthly_overview"):
    conn = None
    cursor = None
    
    async with db_semaphore:
        try:
            conn = get_db()
            cursor = conn.cursor()
            user_id = get_user_id(cursor, phone)
            if not user_id: return
            
            ist_now = datetime.utcnow() + timedelta(hours=5, minutes=30)
            year = ist_now.year
            month = ist_now.month
            current_day = ist_now.day
            
            # Use calendar to get Monday-Sunday weeks for this month
            cal = calendar.monthcalendar(year, month)
            total_calendar_weeks = len(cal)
            
            day_to_week_idx = {}
            current_week_idx = 4 # Default max index
            
            for week_idx, week_days in enumerate(cal):
                for day in week_days:
                    if day != 0:
                        # Clamp the 6th week (index 5) into Week 5 (index 4)
                        clamped_idx = min(week_idx, 4) 
                        day_to_week_idx[day] = clamped_idx
                        
                        if not is_end_of_month and day == current_day:
                            current_week_idx = clamped_idx
            
            cursor.execute("""
                SELECT DAY(date), SUM(amount) 
                FROM transactions 
                WHERE user_id = %s 
                  AND type = 'expense' 
                  AND MONTH(date) = %s 
                  AND YEAR(date) = %s 
                GROUP BY DAY(date)
            """, (user_id, month, year))
            
            # Force exactly 5 weeks to match the Meta Template parameters
            weeks = [0.0, 0.0, 0.0, 0.0, 0.0]
            month_total = 0.0
            
            for row in cursor.fetchall():
                r = tuple(row)
                day, amt = int(str(r[0])), float(str(r[1]))
                month_total += amt
                
                if day in day_to_week_idx:
                    w_idx = day_to_week_idx[day]
                    weeks[w_idx] += amt
                
        finally:
            if cursor: 
                try: cursor.close()
                except: pass
            if conn: 
                try: conn.close()
                except: pass
            
    if is_end_of_month:
        _, days_in_month = calendar.monthrange(year, month)
        avg_daily = month_total / days_in_month if days_in_month > 0 else 0.0
        
        variables = [
            f"{month_total:g}",
            f"{weeks[0]:g}",
            f"{weeks[1]:g}",
            f"{weeks[2]:g}",
            f"{weeks[3]:g}",
            f"{weeks[4]:g}",
            f"{avg_daily:.0f}"
        ]
        await send_whatsapp_template(phone, template_name, variables)
        return

    avg_daily = month_total / current_day if current_day > 0 else 0.0

    lines = [
        "*Here is your monthly overview in SideNote.*",
        "",
        f"The total for this month is *₹{month_total:g}*.",
        ""
    ]
    
    for i in range(current_week_idx + 1):
        lines.append(f"Week {i + 1} total is ₹{weeks[i]:g}.")
        
    lines.append("")
    lines.append(f"The average per day is ₹{avg_daily:.0f}.")
    lines.append("")
    lines.append("This reflects your notes up to today.")
        
    final_message = "\n".join(lines)
    await send_whatsapp_text(phone, final_message)

async def process_whatsapp_audio(phone: str, media_id: str, message_id: Optional[str] = None, sender_name: str = "WhatsApp User"):
    if is_duplicate(message_id): return
    
    await ensure_user_exists(phone, sender_name)
    await send_whatsapp_text(phone, "🎧 Listening to your voice note...")
    
    media_url = await get_whatsapp_media_url(media_id)
    if not media_url: return
    
    audio_bytes = await download_whatsapp_media(media_url)
    if not audio_bytes: return
    
    voice_data = extract_voice_data(audio_bytes, "audio/ogg")
    
    if voice_data and voice_data.get('amount', 0) > 0:
        amount = float(voice_data['amount'])
        item = str(voice_data['item'])
        print(f"🎙️ Voice Extracted: ₹{amount} for {item}")
        await handle_transaction_entry(phone, amount, item, sender_name=sender_name)
    else:
        await send_whatsapp_text(phone, "❓ I couldn't hear a specific amount or item. Could you try speaking a bit clearer?")   
    
async def handle_dashboard_request(phone: str):
    """Safety fallback for old dashboard buttons still in user's chat history."""
    msg = (
        "🚀 *Coming Soon!*\n\n"
        "Advanced charts and features are currently under construction. "
        "For now, you can get all your insights and summaries right here in WhatsApp by typing *menu*!"
    )
    await send_whatsapp_text(phone, msg)
        
# async def handle_dashboard_request(phone: str):
#     """Sends the dashboard link based on verification status."""
#     conn = None
#     cursor = None
#     msg = ""
    
#     async with db_semaphore:
#         try:
#             conn = get_db()
#             cursor = conn.cursor()
            
#             cursor.execute("SELECT email FROM users WHERE mobile = %s", (phone,))
#             row = cursor.fetchone()
            
#             if row and row[0]: # type: ignore
#                 msg = (
#                     "*SideNote Web Dashboard*\n\n"
#                     "Access your full financial reports and charts here:\n"
#                     "🔗 https://www.sidenote.in/login\n\n"
#                     "Use your registered email to log in."
#                 )
#             else:
#                 msg = (
#                     "👋 *You're almost there!*\n\n"
#                     "To see your charts and secure your account, please complete your profile:\n\n"
#                     "1️⃣ Go to: https://www.sidenote.in/login\n"
#                     "2️⃣ Click *Sign Up*\n"
#                     "3️⃣ Select *Mobile* and enter your number\n\n"
#                     "Set your Name and Password, and your WhatsApp data will instantly sync to the web!"
#                 )
#         except Exception as e:
#             print(f"Dashboard Link Error: {e}")
#             return
#         finally:
#             if cursor: 
#                 try: cursor.close()
#                 except: pass
#             if conn: 
#                 try: conn.close()
#                 except: pass
            
#     if msg:
#         await send_whatsapp_text(phone, msg)
        
async def handle_today_request(phone: str):
    """Fetches and sends a list of all transactions made today."""
    conn = None
    cursor = None
    transactions = []
    
    async with db_semaphore:
        try:
            conn = get_db()
            cursor = conn.cursor()
            
            user_id = get_user_id(cursor, phone)
            if not user_id:
                await send_whatsapp_text(phone, "✨ *No transactions today!* Your wallet is happy.")
                return
            
            cursor.execute("""
                SELECT amount, note, type 
                FROM transactions 
                WHERE user_id = %s AND DATE(date) = CURDATE()
                ORDER BY id DESC
            """, (user_id,))
            
            transactions = cursor.fetchall()
        except Exception as e:
            print(f"Today Request Error: {e}")
            await send_whatsapp_text(phone, "⚠️ Sorry, I couldn't fetch today's data.")
            return
        finally:
            if cursor: 
                try: cursor.close()
                except: pass
            if conn: 
                try: conn.close()
                except: pass
            
    if not transactions:
        await send_whatsapp_text(phone, "✨ *No transactions today!* Your wallet is happy.")
        return
        
    total_spent = 0.0
    total_income = 0.0
    details = ["*Today's Activity:*\n"]
    
    for t in transactions:
        amt = float(str(t[0])) # type: ignore
        note = str(t[1]).capitalize() # type: ignore
        t_type = str(t[2]) # type: ignore
        
        if t_type == 'expense':
            total_spent += amt
            details.append(f"₹{amt:g} - {note}")
        else:
            total_income += amt
            details.append(f"₹{amt:g} - {note}")
            
    details.append("\n" + "━" * 15)
    if total_spent > 0:
        details.append(f"💸 *Total Spent: ₹{total_spent:g}*")
    if total_income > 0:
        details.append(f"💰 *Total Income: ₹{total_income:g}*")
    
    await send_whatsapp_text(phone, "\n".join(details))
        
async def handle_menu_request(phone: str):
    buttons = [
        {"id": "cmd_summary", "title": "Summary"},
        {"id": "cmd_today", "title": "Today"},
        {"id": "cmd_more", "title": "More Options"}
    ]
    await send_whatsapp_interactive_buttons(phone, "*Main Menu*\nChoose an option below:", buttons)

async def handle_more_request(phone: str):
    """Second Menu (Triggered by typing 'more' or clicking 'More Options')"""
    buttons = [
        # {"id": "cmd_dashboard", "title": "Web Dashboard"},
        {"id": "cmd_week", "title": "This Week"},
        {"id": "cmd_month", "title": "This Month"},
        {"id": "cmd_help", "title": "Help"}
    ]
    await send_whatsapp_interactive_buttons(phone, "*More Options*\nChoose an option below:", buttons)
