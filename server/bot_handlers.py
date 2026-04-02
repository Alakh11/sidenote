import re
from typing import Any
from database import get_db
from datetime import datetime
from whatsapp_service import send_whatsapp_template, send_whatsapp_text, send_whatsapp_interactive_buttons
from constants import *

def get_identifier(cursor: Any, phone: str) -> str:
    cursor.execute("SELECT email FROM users WHERE mobile = %s", (phone,))
    user_row = cursor.fetchone()
    u_row = tuple(user_row) if user_row else ()
    return str(u_row[0]) if u_row and u_row[0] else phone

async def process_whatsapp_text(phone: str, text: str):
    """Routes incoming text messages based on commands or numbers."""
    text = text.strip().lower()
    
    if text == CMD_MENU:
        await handle_menu_request(phone)
    elif text == CMD_UNDO:
        await handle_undo_request(phone)
    elif text == CMD_SUMMARY:
        await handle_summary_request(phone)
    elif text == CMD_WEEK:
        await handle_weekly_request(phone)
    elif text == CMD_MONTH:
        await handle_monthly_request(phone)
    elif text.startswith(CMD_SET_BUDGET):
        await handle_budget_set(phone, text)
    else:
        match = re.search(r'\d+(?:\.\d+)?', text)
        if match and not text.replace(" ", "").replace(".", "").replace("+", "").isdigit():
            await handle_transaction_entry(phone, text, match)
        else:
            await handle_fallback(phone)

async def process_whatsapp_interactive(phone: str, button_id: str):
    """Routes button clicks from the user."""
    if button_id == "cmd_summary":
        await handle_summary_request(phone)
    elif button_id == "cmd_week":
        await handle_weekly_request(phone)
    elif button_id == "cmd_month":
        await handle_monthly_request(phone)
    elif button_id.startswith("del_"):
        tx_id = int(button_id.split("_")[1])
        await handle_undo_action(phone, tx_id)

async def handle_budget_set(phone: str, text: str):
    """Saves the monthly budget limit for the user."""
    match = re.search(r'\d+(?:\.\d+)?', text)
    if not match:
        await send_whatsapp_text(phone, "❌ Please provide an amount. Example: *budget 20000*")
        return

    new_budget = float(match.group(0))
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        identifier = get_identifier(cursor, phone)
        
        cursor.execute("UPDATE users SET monthly_budget = %s WHERE email = %s OR mobile = %s", (new_budget, identifier, phone))
        conn.commit()
        
        await send_whatsapp_text(phone, f"✅ Budget Set! Your monthly limit is now *₹{new_budget:g}*.\n\nSideNote will now notify you as you approach this limit.")
    except Exception as e:
        print(f"Budget Set Error: {e}")
    finally:
        if conn: conn.close()

async def handle_transaction_entry(phone: str, text: str, match: Any):
    amount = float(match.group(0))
    item = str(text.replace(match.group(0), "").replace("+", "").strip())
    item_lower = item.lower()
    
    is_income = any(keyword in item_lower for keyword in INCOME_KEYWORDS)
    tx_type = 'income' if is_income else 'expense'

    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SET time_zone = '+05:30'")
        
        # User Check
        cursor.execute("SELECT email, monthly_budget FROM users WHERE mobile = %s", (phone,))
        user_data = cursor.fetchone()
        u_data = tuple(user_data) if user_data else ()
        
        if not u_data:
            cursor.execute("INSERT INTO users (mobile, name, is_verified) VALUES (%s, 'WhatsApp User', TRUE)", (phone,))
            conn.commit()
            await send_whatsapp_template(phone, TEMPLATE_WELCOME, [])
            identifier, budget_limit = phone, 0.0
        else:
            identifier = str(u_data[0]) if u_data[0] else phone
            budget_limit = float(str(u_data[1])) if u_data[1] else 0.0
        
        category_id = None
        target_category_name = None
        for cat_name, keywords in CATEGORY_MAP.items():
            if any(kw in item_lower for kw in keywords):
                target_category_name = cat_name
                break
                
        if target_category_name:
            cursor.execute("SELECT id FROM categories WHERE (user_email = %s OR user_email IS NULL) AND type = %s AND name = %s LIMIT 1", (identifier, tx_type, target_category_name))
            cat_row = cursor.fetchone()
            if cat_row: category_id = int(str(tuple(cat_row)[0]))

        if not category_id:
            cursor.execute("SELECT id FROM categories WHERE (user_email = %s OR user_email IS NULL) AND type = %s LIMIT 1", (identifier, tx_type))
            cat_row = cursor.fetchone()
            category_id = int(str(tuple(cat_row or (1,))[0]))

        # Save Entry
        cursor.execute("INSERT INTO transactions (user_email, amount, type, note, date, category_id, payment_mode) VALUES (%s, %s, %s, %s, NOW(), %s, 'Cash')", (identifier, amount, tx_type, item, category_id))
        conn.commit()

        budget_note = ""
        if tx_type == 'expense' and budget_limit > 0:
            cursor.execute("SELECT SUM(amount) FROM transactions WHERE user_email = %s AND type = 'expense' AND MONTH(date) = MONTH(CURDATE())", (identifier,))
            month_row = tuple(cursor.fetchone() or (0,))
            month_total = float(str(month_row[0])) if month_row[0] else 0.0
            
            remaining = budget_limit - month_total
            percent_used = (month_total / budget_limit)
            
            if percent_used >= 1.0:
                budget_note = f"\n\n🚨 *OVER BUDGET!* You have exceeded your ₹{budget_limit:g} limit by ₹{abs(remaining):g}."
            elif percent_used >= BUDGET_THRESHOLD_WARNING:
                budget_note = f"\n\n⚠️ *Budget Warning:* You have used {percent_used:.0%} of your monthly budget. ₹{remaining:g} left."
            else:
                budget_note = f"\n\n💰 Budget: ₹{remaining:g} remaining for the month."

        # Reply
        if is_income:
            await send_whatsapp_text(phone, f"✅ Income noted!\n₹{amount:g} for '{item}' added.")
        else:
            cursor.execute("SELECT SUM(amount) FROM transactions WHERE user_email = %s AND type = 'expense' AND DATE(date) = CURDATE()", (identifier,))
            today_row = tuple(cursor.fetchone() or (0,))
            today_total = float(str(today_row[0])) if today_row[0] else 0.0
            
            await send_whatsapp_template(phone, TEMPLATE_ENTRY_RECORDED, [str(amount), item, f"{today_total:g}"])
            if budget_note:
                await send_whatsapp_text(phone, budget_note)
            
    except Exception as e:
        print(f"Transaction DB Error: {e}")
    finally:
        if conn: conn.close()

async def handle_undo_request(phone: str):
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        identifier = get_identifier(cursor, phone)
        
        cursor.execute("SELECT id, amount, note FROM transactions WHERE user_email = %s ORDER BY date DESC LIMIT 2", (identifier,))
        rows = cursor.fetchall()
        
        if not rows:
            await send_whatsapp_text(phone, "You don't have any recent entries to undo.")
            return

        buttons = []
        for row in rows:
            r = tuple(row)
            title = f"❌ {float(str(r[1])):g} {str(r[2])}"[:20]
            buttons.append({"id": f"del_{str(r[0])}", "title": title})
            
        await send_whatsapp_interactive_buttons(phone, "Which recent entry do you want to delete?", buttons)
    except Exception as e:
        print(f"Undo Error: {e}")
    finally:
        if conn: conn.close()

async def handle_undo_action(phone: str, tx_id: int):
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        identifier = get_identifier(cursor, phone)
        
        cursor.execute("DELETE FROM transactions WHERE id = %s AND user_email = %s", (tx_id, identifier))
        conn.commit()
        
        if cursor.rowcount > 0:
            await send_whatsapp_text(phone, "🗑️ Entry deleted successfully!")
        else:
            await send_whatsapp_text(phone, "⚠️ Could not delete. It may have already been removed.")
    except Exception as e:
        print(f"Undo Action Error: {e}")
    finally:
        if conn: conn.close()

async def handle_menu_request(phone: str):
    buttons = [
        {"id": "cmd_summary", "title": "📊 Summary"},
        {"id": "cmd_week", "title": "📅 Week"},
        {"id": "cmd_month", "title": "🗓️ Month"}
    ]
    await send_whatsapp_interactive_buttons(phone, "What would you like to see?", buttons)

async def handle_fallback(phone: str):
    fallback_message = f"Hey! Just send what you want to note.\n\nExamples:\n*200 chai* (Expense)\n*+5000 salary* (Income)\n\nType *{CMD_MENU}* for options or *{CMD_UNDO}* to delete a mistake."
    await send_whatsapp_text(phone, fallback_message)

async def handle_summary_request(phone: str):
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SET time_zone = '+05:30'")
        identifier = get_identifier(cursor, phone)
        
        cursor.execute("SELECT SUM(amount) FROM transactions WHERE user_email=%s AND type='expense' AND DATE(date)=CURDATE()", (identifier,))
        t_row = tuple(cursor.fetchone() or ())
        today_total = float(str(t_row[0])) if t_row and t_row[0] else 0.0
        
        cursor.execute("SELECT SUM(amount) FROM transactions WHERE user_email=%s AND type='expense' AND YEARWEEK(date, 1)=YEARWEEK(CURDATE(), 1)", (identifier,))
        w_row = tuple(cursor.fetchone() or ())
        week_total = float(str(w_row[0])) if w_row and w_row[0] else 0.0
        
        cursor.execute("SELECT SUM(amount) FROM transactions WHERE user_email=%s AND type='expense' AND MONTH(date)=MONTH(CURDATE())", (identifier,))
        m_row = tuple(cursor.fetchone() or ())
        month_total = float(str(m_row[0])) if m_row and m_row[0] else 0.0

        cursor.execute("SELECT note, amount FROM transactions WHERE user_email=%s AND type='expense' AND MONTH(date)=MONTH(CURDATE()) ORDER BY amount DESC LIMIT 1", (identifier,))
        h_row = tuple(cursor.fetchone() or ())
        highest_item = str(h_row[0]) if h_row and h_row[0] else "None"
        highest_amount = float(str(h_row[1])) if h_row else 0.0
        
        await send_whatsapp_template(phone, TEMPLATE_OVERVIEW, [f"{today_total:g}", f"{week_total:g}", f"{month_total:g}", highest_item, f"{highest_amount:g}"])
    finally:
        if conn: conn.close()

async def handle_weekly_request(phone: str):
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SET time_zone = '+05:30'")
        identifier = get_identifier(cursor, phone)
        
        cursor.execute("SELECT WEEKDAY(date), SUM(amount) FROM transactions WHERE user_email = %s AND type = 'expense' AND YEARWEEK(date, 1) = YEARWEEK(CURDATE(), 1) GROUP BY WEEKDAY(date)", (identifier,))
        days = [0.0] * 7 
        for row in cursor.fetchall():
            r = tuple(row)
            days[int(str(r[0]))] = float(str(r[1]))
            
        week_total = sum(days)
        variables = [f"{week_total:g}"] + [f"{d:g}" for d in days]
        
        await send_whatsapp_template(phone, TEMPLATE_WEEKLY, variables)
    finally:
        if conn: conn.close()

async def handle_monthly_request(phone: str):
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SET time_zone = '+05:30'")
        identifier = get_identifier(cursor, phone)
        
        cursor.execute("SELECT DAY(date), SUM(amount) FROM transactions WHERE user_email = %s AND type = 'expense' AND MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE()) GROUP BY DAY(date)", (identifier,))
        weeks, month_total = [0.0, 0.0, 0.0, 0.0], 0.0
        
        for row in cursor.fetchall():
            r = tuple(row)
            day, amt = int(str(r[0])), float(str(r[1]))
            month_total += amt
            if day <= 7: weeks[0] += amt
            elif day <= 14: weeks[1] += amt
            elif day <= 21: weeks[2] += amt
            else: weeks[3] += amt
            
        current_day = datetime.now().day
        avg_daily = month_total / current_day if current_day > 0 else 0.0
        variables = [f"{month_total:g}"] + [f"{w:g}" for w in weeks] + [f"{avg_daily:.0f}"]
        
        await send_whatsapp_template(phone, TEMPLATE_MONTHLY, variables)
    finally:
        if conn: conn.close()