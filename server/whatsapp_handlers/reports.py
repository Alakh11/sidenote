import calendar
from datetime import datetime, timedelta
from database import get_db
from whatsapp_service import send_whatsapp_text, send_whatsapp_template, send_whatsapp_interactive_buttons
from constants import TEMPLATE_OVERVIEW, TEMPLATE_WEEKLY
from whatsapp_handlers.bot_utils import get_user_id, db_semaphore

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
            
            cal = calendar.monthcalendar(year, month)
            day_to_week_idx = {}
            current_week_idx = 4
            
            for week_idx, week_days in enumerate(cal):
                for day in week_days:
                    if day != 0:
                        clamped_idx = min(week_idx, 4) 
                        day_to_week_idx[day] = clamped_idx
                        if not is_end_of_month and day == current_day:
                            current_week_idx = clamped_idx
            
            cursor.execute("""
                SELECT DAY(date), SUM(amount) 
                FROM transactions 
                WHERE user_id = %s AND type = 'expense' AND MONTH(date) = %s AND YEAR(date) = %s 
                GROUP BY DAY(date)
            """, (user_id, month, year))
            
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
        variables = [f"{month_total:g}", f"{weeks[0]:g}", f"{weeks[1]:g}", f"{weeks[2]:g}", f"{weeks[3]:g}", f"{weeks[4]:g}", f"{avg_daily:.0f}"]
        await send_whatsapp_template(phone, template_name, variables)
        return

    avg_daily = month_total / current_day if current_day > 0 else 0.0
    lines = [
        "*Here is your monthly overview in SideNote.*", "",
        f"The total for this month is *₹{month_total:g}*.", ""
    ]
    for i in range(current_week_idx + 1):
        lines.append(f"Week {i + 1} total is ₹{weeks[i]:g}.")
    lines.append("")
    lines.append(f"The average per day is ₹{avg_daily:.0f}.")
    lines.append("")
    lines.append("This reflects your notes up to today.")
    await send_whatsapp_text(phone, "\n".join(lines))

async def handle_today_request(phone: str):
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
        amt = float(str(t[0]))
        note = str(t[1]).capitalize()
        t_type = str(t[2])
        if t_type == 'expense':
            total_spent += amt
            details.append(f"₹{amt:g} - {note}")
        else:
            total_income += amt
            details.append(f"₹{amt:g} - {note}")
            
    details.append("\n" + "━" * 15)
    if total_spent > 0: details.append(f"💸 *Total Spent: ₹{total_spent:g}*")
    if total_income > 0: details.append(f"💰 *Total Income: ₹{total_income:g}*")
    await send_whatsapp_text(phone, "\n".join(details))

async def handle_menu_request(phone: str):
    buttons = [
        {"id": "cmd_summary", "title": "Summary"},
        {"id": "cmd_today", "title": "Today"},
        {"id": "cmd_more", "title": "More Options"}
    ]
    await send_whatsapp_interactive_buttons(phone, "*Main Menu*\nChoose an option below:", buttons)

async def handle_more_request(phone: str):
    buttons = [
        {"id": "cmd_week", "title": "This Week"},
        {"id": "cmd_month", "title": "This Month"},
        {"id": "cmd_help", "title": "Help"}
    ]
    await send_whatsapp_interactive_buttons(phone, "*More Options*\nChoose an option below:", buttons)

async def handle_dashboard_request(phone: str):
    msg = (
        "🚀 *Coming Soon!*\n\n"
        "Advanced charts and features are currently under construction. "
        "For now, you can get all your insights and summaries right here in WhatsApp by typing *menu*!"
    )
    await send_whatsapp_text(phone, msg)