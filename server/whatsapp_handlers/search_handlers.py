import io
import re
import matplotlib
matplotlib.use('Agg') 
import matplotlib.pyplot as plt
from datetime import datetime
from database import get_db

from whatsapp_service import send_whatsapp_text, upload_whatsapp_media, send_whatsapp_interactive_buttons, send_whatsapp_media

def create_expense_pie_chart(data: list[dict], month_name: str) -> bytes:
    """Generates a crisp, high-res donut chart showing all categories with vibrant colors."""
    
    plot_data = sorted(data, key=lambda x: float(x['total']), reverse=True)
    
    labels = [str(row['category']).capitalize() if row.get('category') else 'Other' for row in plot_data]
    sizes = [float(row['total']) for row in plot_data]
    
    fig, ax = plt.subplots(figsize=(8, 5), subplot_kw=dict(aspect="equal"))
    
    base_colors = [
        '#FF3B30', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#00CC96', '#FF6384', '#845EC2', '#F9F871',
        '#D65DB1', '#FF9671', '#FFC75F'
    ]
    colors = [base_colors[i % len(base_colors)] for i in range(len(labels))]
    
    wedges, texts, autotexts = ax.pie(
        sizes, 
        autopct='%1.1f%%', 
        startangle=140, 
        colors=colors,
        pctdistance=0.75,
        textprops=dict(color="w", weight="bold", fontsize=10),
        wedgeprops=dict(width=0.5, edgecolor='w', linewidth=2)
    )
    
    ax.legend(
        wedges, labels, 
        title="Categories", 
        loc="center left", 
        bbox_to_anchor=(1, 0, 0.5, 1),
        fontsize=11,
        title_fontsize=13
    )
    
    ax.set_title(f"Expense Breakdown - {month_name.capitalize()}", fontweight="bold", fontsize=16, pad=20)
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', transparent=False, facecolor='white', dpi=300)
    buf.seek(0)
    plt.close(fig)
    
    return buf.read()


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
        
        icon = "💰" if t_type == 'income' else ""
        sign = "+" if t_type == 'income' else "-"
        
        details.append(f"{icon}{date_str} • {note}: {sign}₹{amt:g}")
        
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
        await send_whatsapp_text(phone, "Please tell me what to search for!\n\nExamples:\n- `search yesterday`\n- `search food`\n- `search monday`\n- `search between 15-20`")
        return

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    try:
        user_id = get_user_id(cursor, phone)
        if not user_id: return

        # 1. TODAY
        if "today" in query:
            cursor.execute("""
                SELECT amount, note, type, date FROM transactions 
                WHERE user_id = %s AND DATE(date) = CURDATE()
                ORDER BY id DESC
            """, (user_id,))
            transactions = cursor.fetchall()
            await send_whatsapp_text(phone, format_transaction_list(transactions, "Today's Activity"))
            return

        # 2. YESTERDAY
        if "yesterday" in query:
            cursor.execute("""
                SELECT amount, note, type, date FROM transactions 
                WHERE user_id = %s AND DATE(date) = CURDATE() - INTERVAL 1 DAY
                ORDER BY id DESC
            """, (user_id,))
            transactions = cursor.fetchall()
            await send_whatsapp_text(phone, format_transaction_list(transactions, "Yesterday's Activity"))
            return

        months = {
            'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
            'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
        }

        # 3. SPECIFIC MONTH & DAY
        month_names_pattern = "|".join(months.keys())
        month_day_match = re.search(rf'\b({month_names_pattern})\s+(\d{{1,2}})\b|\b(\d{{1,2}})\s+({month_names_pattern})\b', query)
        
        if month_day_match:
            if month_day_match.group(1):
                m_name = month_day_match.group(1)
                day_num = int(month_day_match.group(2))
            else:
                day_num = int(month_day_match.group(3))
                m_name = month_day_match.group(4)
                
            month_num = months[m_name]
            
            cursor.execute("""
                SELECT amount, note, type, date FROM transactions 
                WHERE user_id = %s AND MONTH(date) = %s AND YEAR(date) = YEAR(CURDATE()) AND DAY(date) = %s
                ORDER BY id DESC
            """, (user_id, month_num, day_num))
            transactions = cursor.fetchall()
            await send_whatsapp_text(phone, format_transaction_list(transactions, f"Transactions on {m_name.capitalize()} {day_num}"))
            return

        if query.isdigit() and 1 <= int(query) <= 31:
            day_num = int(query)
            cursor.execute("""
                SELECT amount, note, type, date FROM transactions 
                WHERE user_id = %s AND MONTH(date) = MONTH(CURDATE()) 
                AND YEAR(date) = YEAR(CURDATE()) AND DAY(date) = %s
                ORDER BY id DESC
            """, (user_id, day_num))
            transactions = cursor.fetchall()
            await send_whatsapp_text(phone, format_transaction_list(transactions, f"Transactions on the {day_num}th"))
            return
            
        weekdays = {'monday':0, 'tuesday':1, 'wednesday':2, 'thursday':3, 'friday':4, 'saturday':5, 'sunday':6}
        if query in weekdays:
            cursor.execute("""
                SELECT amount, note, type, date FROM transactions 
                WHERE user_id = %s AND WEEKDAY(date) = %s AND date >= CURDATE() - INTERVAL 7 DAY
                ORDER BY date DESC
            """, (user_id, weekdays[query]))
            transactions = cursor.fetchall()
            await send_whatsapp_text(phone, format_transaction_list(transactions, f"Recent Activity on {query.capitalize()}"))
            return

        # 6. MONTH OVERVIEW (e.g., "may" or "may data")
        for month_name, month_num in months.items():
            if month_name in query.split():
                # Check if user appended "data" or "chart"
                wants_graph = "data" in query.split() or "chart" in query.split()
                
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
                
                # --- GRAPHIC FLOW ---
                if wants_graph:
                    cursor.execute("""
                        SELECT c.name as category, SUM(t.amount) as total
                        FROM transactions t
                        LEFT JOIN categories c ON t.category_id = c.id
                        WHERE t.user_id = %s AND MONTH(t.date) = %s AND YEAR(t.date) = YEAR(CURDATE()) AND t.type = 'expense'
                        GROUP BY c.id, c.name
                        ORDER BY total DESC
                    """, (user_id, month_num))
                    cat_data = cursor.fetchall()
                    
                    if not cat_data:
                        await send_whatsapp_text(phone, f"I couldn't find any expenses in {month_name.capitalize()} to build a chart.")
                        return
                    
                    chart_bytes = create_expense_pie_chart(cat_data, month_name)
                    media_id = await upload_whatsapp_media(chart_bytes, "image/png", f"{month_name}_analysis.png")
                    
                    top_cat = cat_data[0] 
                    top_cat_name = str(top_cat['category']).capitalize() if top_cat.get('category') else 'Other'
                    
                    caption = f"*Full Analysis for {month_name.capitalize()}*\n\n"
                    caption += f"Total Expense: ₹{exp:g}\n"
                    caption += f"Total Income: ₹{inc:g}\n\n"
                    
                    caption += "*Category Breakdown:*\n"
                    for cat in cat_data:
                        c_name = str(cat['category']).capitalize() if cat.get('category') else 'Other'
                        c_total = float(cat['total'])
                        caption += f"• {c_name}: ₹{c_total:g}\n"
                        
                    caption += f"\n*Highest Spend:* {top_cat_name} (₹{float(top_cat['total']):g})"
                    
                    if media_id:
                        await send_whatsapp_media(phone, media_type="image", media_id=media_id, caption=caption)
                    else:
                        await send_whatsapp_text(phone, caption + "\n\n_(Could not generate the chart image at this time)_")
                    return
                
                # --- STANDARD TEXT FLOW ---
                else:
                    msg = f"*Overview for {month_name.capitalize()}*\n\n"
                    msg += f"Total Expense: ₹{exp:g}\n"
                    msg += f"Total Income: ₹{inc:g}"
                    await send_whatsapp_text(phone, msg)
                    return

        # 7. RANGE DATE
        date_match = re.search(r'between (\d{1,2})\s*(?:and|-|to)\s*(\d{1,2})', query)
        if date_match:
            start_day, end_day = int(date_match.group(1)), int(date_match.group(2))
            await handle_range_pagination(phone, user_id, start_day, end_day, offset=0)
            return

        # 8. AMOUNT RANGE
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

        # 9. CATEGORY MATCH
        cursor.execute("""
            SELECT id, name FROM categories 
            WHERE user_id = %s AND LOWER(name) LIKE %s LIMIT 1
        """, (user_id, f"%{query}%"))
        cat_row = cursor.fetchone()
        
        if cat_row:
            cat_id = cat_row['id']
            cat_name = cat_row['name']
            await handle_category_pagination(phone, user_id, cat_id, cat_name, offset=0)
            return
        
        # 10. TEXT  SEARCH
        cursor.execute("""
            SELECT amount, note, type, date 
            FROM transactions 
            WHERE user_id = %s AND note LIKE %s
            ORDER BY date DESC LIMIT 15
        """, (user_id, f"%{query}%"))
        
        transactions = cursor.fetchall()
        
        if transactions:
            await send_whatsapp_text(phone, format_transaction_list(transactions, f"Search results for '{query.capitalize()}'"))
        else:
            await send_whatsapp_text(phone, f"❌ I couldn't find anything matching '{query}'. Try searching for a specific date, amount, or item name.")

    except Exception as e:
        print(f"Search Error: {e}")
        await send_whatsapp_text(phone, "⚠️ Sorry, something went wrong while searching.")
    finally:
        conn.close()

async def handle_range_pagination(phone: str, user_id: int, start_day: int, end_day: int, offset: int):
    """Fetches 10 transactions for a date range, checks if there are more, and sends Next button."""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT amount, note, type, date 
            FROM transactions 
            WHERE user_id = %s AND MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE())
            AND DAY(date) BETWEEN %s AND %s
            ORDER BY date DESC LIMIT 11 OFFSET %s
        """, (user_id, start_day, end_day, offset))
        
        results = cursor.fetchall()
        
        has_next = len(results) > 10
        transactions_to_show = results[:10]
        
        msg = format_transaction_list(transactions_to_show, f"Transactions: {start_day} to {end_day} of this month")
        
        if has_next:
            next_offset = offset + 10
            buttons = [
                {"id": f"srch_rng_{start_day}_{end_day}_{next_offset}", "title": "Next 10 Entries ➡️"}
            ]
            await send_whatsapp_interactive_buttons(phone, msg, buttons)
        else:
            await send_whatsapp_text(phone, msg + "\n\n_(End of results)_")
            
    finally:
        conn.close()

async def handle_category_pagination(phone: str, user_id: int, cat_id: int, cat_name: str, offset: int):
    """Legacy pagination handler (Kept in case users click old buttons in their chat history)."""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT amount, note, type, date 
            FROM transactions 
            WHERE user_id = %s AND category_id = %s
            ORDER BY date DESC LIMIT 6 OFFSET %s
        """, (user_id, cat_id, offset))
        
        results = cursor.fetchall()
        has_next = len(results) > 5
        
        msg = format_transaction_list(results[:5], f"Category: {cat_name}")
        
        if has_next:
            buttons = [{"id": f"srch_cat_{cat_id}_{offset + 5}", "title": "Next 5 Entries ➡️"}]
            await send_whatsapp_interactive_buttons(phone, msg, buttons)
        else:
            await send_whatsapp_text(phone, msg + "\n\n_(End of results)_")
            
    finally:
        conn.close()

async def handle_search_interactive(phone: str, button_id: str):
    """Catches the 'Next Entries' button clicks from WhatsApp."""
    parts = button_id.split('_')
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        user_id = get_user_id(cursor, phone)
        if not user_id: return
        
        if len(parts) == 5 and parts[0] == "srch" and parts[1] == "rng":
            start_day = int(parts[2])
            end_day = int(parts[3])
            offset = int(parts[4])
            await handle_range_pagination(phone, user_id, start_day, end_day, offset)
            
        elif len(parts) == 4 and parts[0] == "srch" and parts[1] == "cat":
            cat_id = int(parts[2])
            offset = int(parts[3])
            
            cursor.execute("SELECT name FROM categories WHERE id = %s", (cat_id,))
            cat_row = cursor.fetchone()
            cat_name = cat_row['name'] if cat_row else "Category"
            
            await handle_category_pagination(phone, user_id, cat_id, cat_name, offset)
            
    finally:
        conn.close()