import re
import string
import random
import traceback
from datetime import datetime, timedelta
from database import get_db
from whatsapp_service import send_whatsapp_text, send_whatsapp_interactive_buttons
from whatsapp_handlers.bot_utils import get_user_id, db_semaphore
import json
from whatsapp_handlers.groups_search import handle_group_search_command

def generate_invite_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

async def handle_group_commands(phone: str, text: str) -> bool:
    """Returns True if it handled a group command, False otherwise."""
    text_lower = text.lower().strip()
    
    # 1. CREATE GROUP
    match_create = re.match(r'create\s+(couple|family|split)\s+group(?:\s+(.+))?', text_lower, re.IGNORECASE)
    if match_create:
        g_type = match_create.group(1).lower()
        custom_name = match_create.group(2)
        
        if g_type == 'couple':
            max_m = 2
            g_name = custom_name.strip().title() if custom_name else "Couple Group"
        elif g_type == 'family':
            max_m = 20
            g_name = custom_name.strip().title() if custom_name else "Family Group"
        else:
            max_m = 20
            g_name = custom_name.strip().title() if custom_name else "Split Group"

        async with db_semaphore:
            conn = get_db()
            std_cursor = conn.cursor()
            user_id = get_user_id(std_cursor, phone)
            std_cursor.close()
            
            if not user_id: return True

            cursor = conn.cursor(dictionary=True)
            try:
                cursor.execute("""
                    SELECT g.name FROM expense_groups g
                    JOIN group_members gm ON gm.group_id = g.id
                    WHERE gm.user_id = %s AND LOWER(g.name) = %s
                """, (user_id, g_name.lower()))
                
                if cursor.fetchone():
                    await send_whatsapp_text(phone, f"❌ You are already a member of a group named '{g_name}'. Please choose a different name.")
                    return True

                code = generate_invite_code()
                expires_at = datetime.now() + timedelta(minutes=30)
                
                cursor.execute("INSERT INTO expense_groups (type, name, created_by, max_members, status) VALUES (%s, %s, %s, %s, 'pending')", (g_type, g_name, user_id, max_m))
                group_id = cursor.lastrowid
                cursor.execute("INSERT INTO group_members (group_id, user_id, role) VALUES (%s, %s, 'admin')", (group_id, user_id))
                cursor.execute("INSERT INTO invite_codes (group_id, code, created_by, expires_at) VALUES (%s, %s, %s, %s)", (group_id, code, user_id, expires_at))
                conn.commit()
                
                msg = f" {g_type.title()} Group *'{g_name}'* created!\n\nShare this code with your members:\n👉 *join {code}*\n\n_(Code expires in 30 minutes. Max members: {max_m})_"
                await send_whatsapp_text(phone, msg)
            except Exception as e:
                conn.rollback()
                print(f"Create Group Error: {e}")
                await send_whatsapp_text(phone, "⚠️ Failed to create group.")
            finally:
                cursor.close()
                conn.close()
        return True

    # 2. JOIN GROUP
    if text_lower.startswith("join "):
        code = text[5:].strip().upper()
        async with db_semaphore:
            conn = get_db()
            std_cursor = conn.cursor()
            user_id = get_user_id(std_cursor, phone)
            std_cursor.close()
            
            if not user_id: return True

            cursor = conn.cursor(dictionary=True)
            try:
                cursor.execute("""
                    SELECT ic.*, g.name, g.type, g.max_members, g.status as group_status 
                    FROM invite_codes ic
                    JOIN expense_groups g ON g.id = ic.group_id
                    WHERE ic.code = %s
                """, (code,))
                invite = cursor.fetchone()

                if not invite:
                    await send_whatsapp_text(phone, "❌ Invalid invite code.")
                    return True
                if invite['used']:
                    await send_whatsapp_text(phone, "❌ This code has already been used.")
                    return True
                if datetime.now() > invite['expires_at']:
                    await send_whatsapp_text(phone, "❌ Code expired. Ask them to create a new one.")
                    return True
                if invite['created_by'] == user_id:
                    await send_whatsapp_text(phone, "❌ You can't join your own group!")
                    return True

                cursor.execute("SELECT COUNT(*) as count FROM group_members WHERE group_id = %s", (invite['group_id'],))
                member_count = cursor.fetchone()['count']
                
                if member_count >= invite['max_members']:
                    await send_whatsapp_text(phone, f"❌ This {invite['type']} group is full (Max: {invite['max_members']}).")
                    return True

                cursor.execute("INSERT INTO group_members (group_id, user_id, role) VALUES (%s, %s, 'member')", (invite['group_id'], user_id))
                cursor.execute("UPDATE invite_codes SET used = TRUE WHERE id = %s", (invite['id'],))
                cursor.execute("UPDATE expense_groups SET status = 'active' WHERE id = %s", (invite['group_id'],))
                
                conn.commit()
                await send_whatsapp_text(phone, f"✅ You're linked! You can now log shared expenses to *{invite['name']}* using:\n*@{invite['name'].split()[0].lower()} 500 dinner*")
            except Exception as e:
                conn.rollback()
                print(f"Join Group Error: {e}")
                await send_whatsapp_text(phone, "⚠️ Failed to join group.")
            finally:
                cursor.close()
                conn.close()
        return True

    # 3. REFRESH CODE
    if text_lower.startswith("new code "):
        group_alias = text_lower[9:].strip()
        async with db_semaphore:
            conn = get_db()
            std_cursor = conn.cursor()
            user_id = get_user_id(std_cursor, phone)
            std_cursor.close()
            
            if not user_id: return True

            cursor = conn.cursor(dictionary=True)
            try:
                cursor.execute("""
                    SELECT g.id, g.name FROM expense_groups g
                    JOIN group_members gm ON g.id = gm.group_id
                    WHERE gm.user_id = %s AND LOWER(g.name) LIKE %s LIMIT 1
                """, (user_id, f"%{group_alias}%"))
                group = cursor.fetchone()

                if not group:
                    await send_whatsapp_text(phone, f"❌ You don't belong to any group matching '{group_alias}'.")
                    return True

                new_code = generate_invite_code()
                expires_at = datetime.now() + timedelta(minutes=30)

                cursor.execute("UPDATE invite_codes SET expires_at = NOW() WHERE group_id = %s", (group['id'],))
                cursor.execute("INSERT INTO invite_codes (group_id, code, created_by, expires_at) VALUES (%s, %s, %s, %s)", (group['id'], new_code, user_id, expires_at))
                conn.commit()
                
                await send_whatsapp_text(phone, f"🔄 New code generated for *{group['name']}*:\n👉 *join {new_code}*\n\n_(Expires in 30 minutes)_")
            except Exception as e:
                conn.rollback()
                print(f"Refresh Code Error: {e}")
                await send_whatsapp_text(phone, "⚠️ Failed to generate new code.")
            finally:
                cursor.close()
                conn.close()
        return True

    # 4. LOG TRANSACTION
    match_log = re.match(r'^@(\w+)\s+(\d+(?:\.\d+)?)\s+(.+)$', text, re.IGNORECASE)
    if match_log:
        group_alias = match_log.group(1).lower()
        amount = float(match_log.group(2))
        description = match_log.group(3).strip()
        
        async with db_semaphore:
            conn = get_db()
            std_cursor = conn.cursor()
            user_id = get_user_id(std_cursor, phone)
            std_cursor.close()
            
            if not user_id: return True

            cursor = conn.cursor(dictionary=True)
            try:
                cursor.execute("""
                    SELECT g.id, g.name FROM expense_groups g
                    JOIN group_members gm ON g.id = gm.group_id
                    WHERE gm.user_id = %s AND g.status = 'active' AND LOWER(g.name) LIKE %s LIMIT 1
                """, (user_id, f"%{group_alias}%"))
                group = cursor.fetchone()

                if not group:
                    await send_whatsapp_text(phone, f"❌ You are not in an active group matching '{group_alias}'.")
                    return True

                cursor.execute("""
                    INSERT INTO group_transactions (group_id, amount, description, logged_by, split_type)
                    VALUES (%s, %s, %s, %s, 'equal')
                """, (group['id'], amount, description, user_id))
                
                conn.commit()
                await send_whatsapp_text(phone, f"✅ Logged to *{group['name']}*:\n*{description.capitalize()}* — ₹{amount:g}")
            except Exception as e:
                conn.rollback()
                print(f"Log Group Txn Error: {e}")
                await send_whatsapp_text(phone, "⚠️ Failed to log group transaction.")
            finally:
                cursor.close()
                conn.close()
        return True

    # 5. EXECUTE DELETE (RM)
    match_rm = re.match(r'^group\s+rm\s+(\d+)$', text_lower)
    if match_rm:
        tx_id = int(match_rm.group(1))
        async with db_semaphore:
            conn = get_db()
            std_cursor = conn.cursor()
            user_id = get_user_id(std_cursor, phone)
            std_cursor.close()
            
            if not user_id: return True

            cursor = conn.cursor(dictionary=True)
            try:
                cursor.execute("""
                    SELECT gt.id, gt.description, gt.amount, g.name as group_name
                    FROM group_transactions gt
                    JOIN expense_groups g ON g.id = gt.group_id
                    WHERE gt.id = %s AND gt.logged_by = %s AND DATE(gt.logged_at) = CURDATE()
                """, (tx_id, user_id))
                txn = cursor.fetchone()

                if not txn:
                    await send_whatsapp_text(phone, "❌ No Transaction found.")
                    return True

                cursor.execute("DELETE FROM group_transactions WHERE id = %s", (tx_id,))
                conn.commit()
                await send_whatsapp_text(phone, f"🗑️ Successfully deleted: *{txn['description']}* (₹{txn['amount']:g}) from *{txn['group_name']}*")
            except Exception as e:
                conn.rollback()
                print(f"Group RM Error: {e}")
                await send_whatsapp_text(phone, "⚠️ Failed to delete.")
            finally:
                cursor.close()
                conn.close()
        return True

    # 6. TOTAL COMMAND
    match_total = re.match(r'^group\s+@(\w+)\s+total$', text_lower)
    if match_total:
        group_alias = match_total.group(1).lower()
        async with db_semaphore:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)
            try:
                cursor.execute("""
                    SELECT g.name, SUM(gt.amount) as total_spend
                    FROM expense_groups g
                    JOIN group_members gm ON g.id = gm.group_id
                    LEFT JOIN group_transactions gt ON g.id = gt.group_id
                    WHERE gm.user_id = (SELECT id FROM users WHERE mobile = %s) 
                    AND g.status = 'active' AND LOWER(g.name) LIKE %s
                    GROUP BY g.id
                """, (phone, f"%{group_alias}%"))
                res = cursor.fetchone()
                if not res:
                    await send_whatsapp_text(phone, f"❌ Group matching '{group_alias}' not found.")
                else:
                    await send_whatsapp_text(phone, f"💰 *Total Spends for {res['name']}*\n\nTotal: ₹{float(res['total_spend'] or 0):g}")
            finally:
                cursor.close()
                conn.close()
        return True

    # 7. SEARCH COMMAND
    match_search = re.match(r'^group\s+@(\w+)\s+(?:search|find)\s+(.+)$', text_lower)
    if match_search:
        group_alias = match_search.group(1).lower()
        query = match_search.group(2).strip()
        await handle_group_search_command(phone, group_alias, query)
        return True

    # 8. QUERIES (Undo, Today, Week, Month, History)
    match_query = re.match(r'^group\s+@(\w+)\s+(undo|history|today|yesterday|week|month|all)$', text_lower)
    if match_query:
        group_alias = match_query.group(1).lower()
        cmd = match_query.group(2).lower()
        await process_group_query(phone, group_alias, cmd, page=1)
        return True
    
    # 9. PAGINATED HISTORY
    match_history_page = re.match(r'^group\s+@(\w+)\s+history(?:\s+(all))?\s+(\d+)$', text_lower)
    if match_history_page:
        group_alias = match_history_page.group(1).lower()
        is_all = match_history_page.group(2) == "all"
        page = int(match_history_page.group(3))
        await process_group_query(phone, group_alias, "all" if is_all else "history", page)
        return True

    return False

async def process_group_query(phone: str, group_alias: str, cmd: str, page: int = 1):
    limit = 50 if cmd == "all" else 10
    offset = (page - 1) * limit
    
    async with db_semaphore:
        conn = get_db()
        std_cursor = conn.cursor()
        user_id = get_user_id(std_cursor, phone)
        std_cursor.close()
        if not user_id: return

        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute("""
                SELECT g.id, g.name FROM expense_groups g
                JOIN group_members gm ON g.id = gm.group_id
                WHERE gm.user_id = %s AND g.status = 'active' AND LOWER(g.name) LIKE %s LIMIT 1
            """, (user_id, f"%{group_alias}%"))
            group = cursor.fetchone()
            if not group:
                await send_whatsapp_text(phone, f"❌ You are not in a group matching '{group_alias}'.")
                return

            if cmd == "undo":
                cursor.execute("""
                    SELECT id, amount, description FROM group_transactions
                    WHERE group_id = %s AND logged_by = %s AND DATE(logged_at) = CURDATE()
                    ORDER BY logged_at DESC LIMIT 2
                """, (group['id'], user_id))
                txns = cursor.fetchall()
                if not txns:
                    await send_whatsapp_text(phone, f"❌ No group transactions logged today to undo.")
                    return
                
                btns = [{"id": f"group rm {t['id']}", "title": f"❌ {float(t['amount']):g} {t['description'][:10]}"} for t in txns]
                await send_whatsapp_interactive_buttons(phone, f"Which entry in *{group['name']}* do you want to delete?", btns)
                return

            # History / Timeframes
            date_filter = ""
            if cmd == "today": date_filter = "AND DATE(gt.logged_at) = CURDATE()"
            elif cmd == "yesterday": date_filter = "AND DATE(gt.logged_at) = CURDATE() - INTERVAL 1 DAY"
            elif cmd == "week": date_filter = "AND gt.logged_at >= CURDATE() - INTERVAL 7 DAY"
            elif cmd == "month": date_filter = "AND MONTH(gt.logged_at) = MONTH(CURDATE()) AND YEAR(gt.logged_at) = YEAR(CURDATE())"

            cursor.execute(f"""
                SELECT gt.amount, gt.description, u.name as logged_by_name, gt.logged_at
                FROM group_transactions gt
                JOIN users u ON u.id = gt.logged_by
                WHERE gt.group_id = %s {date_filter}
                ORDER BY gt.logged_at DESC LIMIT %s OFFSET %s
            """, (group['id'], limit, offset))
            rows = cursor.fetchall()

            if not rows:
                await send_whatsapp_text(phone, f"📭 No transactions found.")
                return

            total = sum(float(r['amount']) for r in rows)
            msg = [f"📜 *Recent expenses in {group['name']}*"]
            for r in rows:
                msg.append(f"• {r['logged_at'].strftime('%d %b')}: ₹{float(r['amount']):g} {r['description']} ({r['logged_by_name']})")
            msg.append(f"\n*Total:* ₹{total:g}")

            # Pagination Button
            cursor.execute("SELECT COUNT(*) as total FROM group_transactions WHERE group_id = %s", (group['id'],))
            count = cursor.fetchone()['total']
            if count > (offset + limit):
                btn_cmd = f"group @{group_alias} {'all' if cmd == 'all' else 'history'} {page + 1}"
                await send_whatsapp_interactive_buttons(phone, "\n".join(msg), [{"id": btn_cmd, "title": "Show More"}])
            else:
                await send_whatsapp_text(phone, "\n".join(msg))

        finally:
            cursor.close()
            conn.close()