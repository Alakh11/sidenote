import re, traceback, asyncio, random
from typing import Any
from datetime import datetime, timedelta
from database import get_db
from whatsapp_service import send_whatsapp_template, send_whatsapp_text, send_whatsapp_interactive_buttons
from constants import INCOME_KEYWORDS, BUDGET_THRESHOLD_WARNING, TEMPLATE_ENTRY_RECORDED
from whatsapp_handlers.bot_utils import get_user_id, db_semaphore, send_delayed_message, log_bot_command

hint_tracker: dict[str, dict[str, Any]] = {}

async def handle_transaction_entry(phone: str, amount: float, item: str, silent: bool = False, sender_name: str = "WhatsApp User", explicit_income: bool = False, payment_mode: str = "Cash") -> bool:
    clean_item = item.replace('\n', ', ').replace('\r', '')
    clean_item = re.sub(r'\s{2,}', ' ', clean_item)
    clean_item = clean_item.strip("- =:,+")
    clean_item = clean_item[:240] 
    
    item_lower = clean_item.lower()
    is_income = explicit_income or any(keyword in item_lower for keyword in INCOME_KEYWORDS)
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
                        if first_kw: dynamic_hints.append(f'Type "{first_kw}" to see a custom reply.')
                    except: pass
            
            cursor.execute("SELECT name, keywords, icon, color FROM global_categories WHERE type = %s", (tx_type,))
            global_cats = cursor.fetchall()
            
            target_category_name = "Others"
            cat_icon = "📝"
            cat_color = "#94A3B8" if tx_type == "expense" else "#10B981"
            
            explicit_category_found = False
            words = clean_item.split(' ') if clean_item else []
            first_word = words[0].lower() if len(words) > 0 else ""
            last_word = words[-1].lower() if len(words) > 1 else ""
            
            if global_cats:
                for gc in global_cats:
                    gc_name = str(gc[0]) if isinstance(gc, tuple) else gc['name']
                    aliases = [gc_name.lower()]
                    if "&" in gc_name: aliases.extend([a.strip().lower() for a in gc_name.split("&")])
                        
                    matched_word = None
                    if first_word in aliases: matched_word = words[0]
                    elif last_word in aliases: matched_word = words[-1]
                        
                    if matched_word:
                        target_category_name = gc_name
                        cat_icon = str(gc[2]) if isinstance(gc, tuple) else gc['icon']
                        cat_color = str(gc[3]) if isinstance(gc, tuple) else gc['color']
                        explicit_category_found = True
                        
                        clean_item = re.sub(r'\b' + re.escape(matched_word) + r'\b', '', clean_item, count=1, flags=re.IGNORECASE)
                        clean_item = clean_item.strip("- =:, +").strip()
                        if not clean_item: clean_item = gc_name 
                        break
                
                if not explicit_category_found:
                    for gc in global_cats:
                        if isinstance(gc, tuple):
                            gc_name, gc_keys, gc_icon, gc_color = str(gc[0]), str(gc[1]), str(gc[2]), str(gc[3])
                        else:
                            gc_name, gc_keys, gc_icon, gc_color = gc['name'], gc['keywords'], gc['icon'], gc['color']
                        
                        aliases = [gc_name.lower()]
                        if "&" in gc_name: aliases.extend([a.strip().lower() for a in gc_name.split("&")])
                            
                        kws = aliases
                        if gc_keys and gc_keys.lower() != 'none':
                            kws.extend([k.strip().lower() for k in gc_keys.split(',')])
                            
                        if any(kw in item_lower for kw in kws):
                            target_category_name = gc_name
                            cat_icon = gc_icon or "📝"
                            cat_color = gc_color or ("#6366F1" if tx_type == "expense" else "#10B981")
                            break
            
            cursor.execute("""
                SELECT id FROM categories WHERE user_id = %s AND name = %s AND type = %s LIMIT 1
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
                VALUES (%s, %s, %s, %s, NOW(), %s, %s)
            """, (user_id, amount, tx_type, clean_item, category_id, payment_mode))
            conn.commit()
            
            if tx_type == 'expense' and budget_limit > 0:
                cursor.execute("SELECT SUM(amount) FROM transactions WHERE user_id = %s AND type = 'expense' AND MONTH(date) = MONTH(CURDATE())", (user_id,))
                month_row = tuple(cursor.fetchone() or (0,))
                month_total = float(str(month_row[0])) if month_row[0] else 0.0
                
                remaining = budget_limit - month_total
                percent_used = (month_total / budget_limit)
                
                if percent_used >= 1.0: budget_note = f"🚨 *OVER BUDGET!* You exceeded your ₹{budget_limit:g} limit by ₹{abs(remaining):g}."
                elif percent_used >= BUDGET_THRESHOLD_WARNING: budget_note = f"⚠️ *Budget Warning:* You used {percent_used:.0%} of your budget. ₹{remaining:g} left."
                else: budget_note = f"💰 Budget: ₹{remaining:g} remaining."
                
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
        ist_now = datetime.utcnow() + timedelta(hours=5, minutes=30)
        today_str = ist_now.strftime('%Y-%m-%d')
        
        user_hint = hint_tracker.get(phone, {'date': today_str, 'count': 0})
        if user_hint['date'] != today_str: user_hint = {'date': today_str, 'count': 0}
            
        include_hint = False
        random_hint = ""
        if user_hint['count'] < 2:
            user_hint['count'] += 1
            hint_tracker[phone] = user_hint
            include_hint = True
            live_hints = ['Type "today" to see today\'s total.', 'Type "week" to see this week\'s spending.', 'Type "month" to see this month\'s total.', 'Type "summary" for a full breakdown.']
            live_hints.extend(dynamic_hints)
            random_hint = random.choice(live_hints)

        if is_income:
            msg = f"✅ Income noted!\n₹{amount:g} for '{clean_item}' added."
            if include_hint: msg += f"\n\n💡 {random_hint}"
            await send_whatsapp_text(phone, msg)
        else:
            await send_whatsapp_template(phone, TEMPLATE_ENTRY_RECORDED, [str(amount), clean_item, f"{today_total:g}"])
            follow_up_msg = ""
            if budget_note: follow_up_msg += f"{budget_note}\n\n"
            if include_hint: follow_up_msg += f"💡 {random_hint}"
            follow_up_msg = follow_up_msg.strip()
            if follow_up_msg: asyncio.create_task(send_delayed_message(phone, follow_up_msg, delay=10))
                
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

            used_titles = set()
            for row in rows:
                r = tuple(row)
                base_title = f"❌ {float(str(r[1])):g} {str(r[2])}"
                title = base_title[:20]
                
                counter = 1
                while title in used_titles:
                    suffix = f" ({counter})"
                    title = base_title[:20 - len(suffix)] + suffix
                    counter += 1
                    
                used_titles.add(title)
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
                matched_keyword = next((k for k in keywords if k == incoming_text or f" {k} " in f" {incoming_text} "), None)
                
                if matched_keyword:
                    reply_body = row['reply_text']
                    buttons = None
                    if row['buttons_json']:
                        import json
                        try: buttons = json.loads(row['buttons_json'])
                        except: pass
                    
                    if buttons: await send_whatsapp_interactive_buttons(phone, reply_body, buttons)
                    else: await send_whatsapp_text(phone, reply_body)

                    log_bot_command(phone, matched_keyword)
                    return True
        except Exception as e:
            print(f"Dynamic Reply Error: {e}")
        finally:
            if conn: conn.close()
            
    return False

async def handle_fallback(phone: str, text: str = ""):
    if text in ['hi', 'hello', 'hey']:
        fallback_message = f"Hey there! 👋\nJust send what you want to note.\n\nExamples:\n*200 chai* \n*+5000 salary* (Income)\n\nType *menu* for options."
    else:
        fallback_message = f"I didn't quite catch that.\n\nJust send what you want to note.\n\nExamples:\n*200 chai* \n*+5000 salary* (Income)\n\nType *menu* for options or *undo* to delete a mistake."
        
    await send_whatsapp_text(phone, fallback_message)