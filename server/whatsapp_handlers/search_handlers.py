import re
from datetime import datetime
from database import get_db
from whatsapp_service import send_whatsapp_text, send_whatsapp_interactive_buttons

def get_user_id(cursor, phone: str) -> int | None:
    cursor.execute("SELECT id FROM users WHERE mobile = %s", (phone,))
    row = cursor.fetchone()
    return int(row['id']) if row else None

def format_transaction_list(transactions, title):
    if not transactions:
        return f"🔍 *{title}*\nNo transactions found."
    
    details = [f"🔍 *{title}*\n"]
    total = 0.0
    
    for t in transactions:
        amt = float(t['amount'])
        note = str(t['note']).capitalize()
        t_type = t['type']
        date_str = t['date'].strftime('%b %d') if isinstance(t['date'], datetime) else t['date']
        
        icon = "💰" if t_type == 'income' else "💸"
        sign = "+" if t_type == 'income' else "-"
        
        details.append(f"{icon} {date_str} • {note}: {sign}₹{amt:g}")
        
        if t_type == 'expense':
            total += amt
            
    if total > 0:
        details.append("\n" + "━" * 15)
        details.append(f"📉 *Total Expense in search: ₹{total:g}*")
        
    return "\n".join(details)

async def handle_search_command(phone: str, text: str):
    """Parses the user's search query and routes to the correct database fetch."""
    query = text.lower().replace("search", "").replace("find", "").strip()
    
    if not query:
        await send_whatsapp_text(phone, "Please tell me what to search for!\n\nExamples:\n- `search yesterday`\n- `search food`\n- `search august`\n- `search between 12-15`\n- `search amount 500-1000`\n- `search name is uber`")
        return

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    try:
        user_id = get_user_id(cursor, phone)
        if not user_id: return

        # 1. YESTERDAY
        if "yesterday" in query:
            cursor.execute("""
                SELECT amount, note, type, date FROM transactions 
                WHERE user_id = %s AND DATE(date) = CURDATE() - INTERVAL 1 DAY
                ORDER BY id DESC
            """, (user_id,))
            transactions = cursor.fetchall()
            await send_whatsapp_text(phone, format_transaction_list(transactions, "Yesterday's Activity"))
            return

        # 2. MONTH OVERVIEW (e.g., "August")
        months = {
            'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
            'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
        }
        for month_name, month_num in months.items():
            if month_name in query:
                cursor.execute("""
                    SELECT 
                        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as total_exp,
                        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as total_inc
                    FROM transactions 
                    WHERE user_id = %s AND MONTH(date) = %s AND YEAR(date) = YEAR(CURDATE())
                """, (user_id, month_num))
                totals = cursor.fetchone()
                
                exp = float(totals['total_exp'] or 0)
                inc = float(totals['total_inc'] or 0)
                
                msg = f"📊 *Overview for {month_name.capitalize()}*\n\n"
                msg += f" Total Expense: ₹{exp:g}\n"
                msg += f"💰 Total Income: ₹{inc:g}\n\n"
                msg += "Type `summary` for your current month charts."
                await send_whatsapp_text(phone, msg)
                return

        # 3. DATE RANGE (e.g., "between 12-15")
        date_match = re.search(r'between (\d{1,2})\s*(?:and|-|to)\s*(\d{1,2})', query)
        if date_match:
            start_day, end_day = int(date_match.group(1)), int(date_match.group(2))
            cursor.execute("""
                SELECT amount, note, type, date FROM transactions 
                WHERE user_id = %s AND MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE())
                AND DAY(date) BETWEEN %s AND %s
                ORDER BY date DESC
            """, (user_id, start_day, end_day))
            transactions = cursor.fetchall()
            await send_whatsapp_text(phone, format_transaction_list(transactions, f"Transactions: {start_day} to {end_day} of this month"))
            return

        # 4. AMOUNT RANGE (e.g., "amount 500-1000")
        amount_match = re.search(r'(?:amount|range).*?(\d+).*?(?:and|-|to).*?(\d+)', query)
        if amount_match:
            min_amt, max_amt = float(amount_match.group(1)), float(amount_match.group(2))
            cursor.execute("""
                SELECT amount, note, type, date FROM transactions 
                WHERE user_id = %s AND amount BETWEEN %s AND %s
                ORDER BY date DESC LIMIT 15
            """, (user_id, min_amt, max_amt))
            transactions = cursor.fetchall()
            await send_whatsapp_text(phone, format_transaction_list(transactions, f"Transactions between ₹{min_amt:g} & ₹{max_amt:g}"))
            return

        # 5. ITEM NAME (e.g., "name is zepto")
        name_match = re.search(r'(?:name is|item|for) (.+)', query)
        if name_match:
            item_name = name_match.group(1).strip()
            cursor.execute("""
                SELECT amount, note, type, date FROM transactions 
                WHERE user_id = %s AND note LIKE %s
                ORDER BY date DESC LIMIT 15
            """, (user_id, f"%{item_name}%"))
            transactions = cursor.fetchall()
            await send_whatsapp_text(phone, format_transaction_list(transactions, f"Search results for '{item_name}'"))
            return

        # 6. CATEGORY NAME WITH PAGINATION (Fallback)
        # If no explicit commands matched, assume they typed a category like "search food"
        cursor.execute("""
            SELECT id FROM categories WHERE user_id = %s AND name LIKE %s LIMIT 1
        """, (user_id, f"%{query}%"))
        cat_row = cursor.fetchone()
        
        if cat_row:
            cat_id = cat_row['id']
            await handle_category_pagination(phone, user_id, cat_id, query.capitalize(), offset=0)
            return

        await send_whatsapp_text(phone, f"❌ I couldn't find anything matching '{query}'. Try searching for a specific date, amount, or item name.")

    except Exception as e:
        print(f"Search Error: {e}")
        await send_whatsapp_text(phone, "⚠️ Sorry, something went wrong while searching.")
    finally:
        conn.close()


async def handle_category_pagination(phone: str, user_id: int, cat_id: int, cat_name: str, offset: int):
    """Fetches 5 transactions for a category, checks if there are more, and sends Next button."""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        # Fetch 6 to see if there is a "Next" page, but we only show 5
        cursor.execute("""
            SELECT amount, note, type, date 
            FROM transactions 
            WHERE user_id = %s AND category_id = %s
            ORDER BY date DESC LIMIT 6 OFFSET %s
        """, (user_id, cat_id, offset))
        
        results = cursor.fetchall()
        
        has_next = len(results) > 5
        transactions_to_show = results[:5]
        
        msg = format_transaction_list(transactions_to_show, f"Category: {cat_name}")
        
        if has_next:
            # Button payload format: srch_cat_{cat_id}_{next_offset}
            next_offset = offset + 5
            buttons = [
                {"id": f"srch_cat_{cat_id}_{next_offset}", "title": "Next 5 Entries ➡️"}
            ]
            await send_whatsapp_interactive_buttons(phone, msg, buttons)
        else:
            await send_whatsapp_text(phone, msg + "\n\n_(End of results)_")
            
    finally:
        conn.close()

async def handle_search_interactive(phone: str, button_id: str):
    """Catches the 'Next 5 Entries' button click from WhatsApp."""
    parts = button_id.split('_')
    if len(parts) == 4 and parts[0] == "srch" and parts[1] == "cat":
        cat_id = int(parts[2])
        offset = int(parts[3])
        
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            user_id = get_user_id(cursor, phone)
            if not user_id: return
            
            # Re-fetch category name for the title
            cursor.execute("SELECT name FROM categories WHERE id = %s", (cat_id,))
            cat_row = cursor.fetchone()
            cat_name = cat_row['name'] if cat_row else "Category"
            
            await handle_category_pagination(phone, user_id, cat_id, cat_name, offset)
        finally:
            conn.close()