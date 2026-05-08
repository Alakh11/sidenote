import re
import string
import random
import traceback
from datetime import datetime, timedelta
from database import get_db
from whatsapp_service import send_whatsapp_text
from whatsapp_handlers.bot_utils import get_user_id, db_semaphore
import json
from whatsapp_handlers.groups_search import handle_group_search_command

def generate_invite_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

async def handle_group_commands(phone: str, text: str) -> bool:
    """Returns True if it handled a group command, False otherwise."""
    text_lower = text.lower().strip()
    
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
                await send_whatsapp_text(phone, "⚠️ Failed to delete transaction.")
            finally:
                cursor.close()
                conn.close()
        return True


    match_query = re.match(r'^group\s+@(\w+)\s+(undo|history|today|yesterday|week|month)$', text_lower)
    if match_query:
        group_alias = match_query.group(1).lower()
        cmd = match_query.group(2).lower()
        
        async with db_semaphore:
            conn = get_db()
            std_cursor = conn.cursor()
            user_id = get_user_id(std_cursor, phone)
            std_cursor.close()
            
            if not user_id: return True

            cursor = conn.cursor(dictionary=True)
            try:
                # Verify Group
                cursor.execute("""
                    SELECT g.id, g.name FROM expense_groups g
                    JOIN group_members gm ON g.id = gm.group_id
                    WHERE gm.user_id = %s AND g.status = 'active' AND LOWER(g.name) LIKE %s LIMIT 1
                """, (user_id, f"%{group_alias}%"))
                group = cursor.fetchone()

                if not group:
                    await send_whatsapp_text(phone, f"❌ You are not in an active group matching '{group_alias}'.")
                    return True

                if cmd == "undo":
                    cursor.execute("""
                        SELECT id, amount, description
                        FROM group_transactions
                        WHERE group_id = %s AND logged_by = %s AND DATE(logged_at) = CURDATE()
                        ORDER BY logged_at DESC LIMIT 2
                    """, (group['id'], user_id))
                    txns = cursor.fetchall()
                    
                    if not txns:
                        await send_whatsapp_text(phone, f"❌ You haven't logged any transactions to *{group['name']}* today to undo.")
                        return True
                        
                    msg_lines = [f"↩️ *Undo in {group['name']}*"]
                    msg_lines.append("Copy and send the command below to delete an entry:\n")
                    for t in txns:
                        msg_lines.append(f"👉 *group rm {t['id']}*")
                        msg_lines.append(f"     (₹{t['amount']:g} for {t['description']})\n")
                        
                    await send_whatsapp_text(phone, "\n".join(msg_lines))
                    return True

                else:
                    date_filter = ""
                    if cmd == "today":
                        date_filter = "AND DATE(gt.logged_at) = CURDATE()"
                        title = f"Today's expenses in {group['name']}"
                    elif cmd == "yesterday":
                        date_filter = "AND DATE(gt.logged_at) = CURDATE() - INTERVAL 1 DAY"
                        title = f"Yesterday's expenses in {group['name']}"
                    elif cmd == "week":
                        date_filter = "AND gt.logged_at >= CURDATE() - INTERVAL 7 DAY"
                        title = f"Last 7 days in {group['name']}"
                    elif cmd == "month":
                        date_filter = "AND MONTH(gt.logged_at) = MONTH(CURDATE()) AND YEAR(gt.logged_at) = YEAR(CURDATE())"
                        title = f"This month's expenses in {group['name']}"
                    else: # "history" defaults to recent
                        title = f"Recent expenses in {group['name']}"

                    query = f"""
                        SELECT gt.amount, gt.description, u.name as logged_by_name, gt.logged_at
                        FROM group_transactions gt
                        JOIN users u ON u.id = gt.logged_by
                        WHERE gt.group_id = %s {date_filter}
                        ORDER BY gt.logged_at DESC LIMIT 20
                    """
                    cursor.execute(query, (group['id'],))
                    rows = cursor.fetchall()

                    if not rows:
                        await send_whatsapp_text(phone, f"📭 No transactions found for {cmd} in *{group['name']}*.")
                        return True

                    total = sum(float(r['amount']) for r in rows)
                    msg_lines = [f"📜 *{title}*"]
                    for r in rows:
                        msg_lines.append(f"• ₹{float(r['amount']):g} {r['description']} (by {r['logged_by_name']})")
                    msg_lines.append(f"\n*Total:* ₹{total:g}")

                    await send_whatsapp_text(phone, "\n".join(msg_lines))
                    return True

            except Exception as e:
                print(f"Group Query Error: {e}")
                await send_whatsapp_text(phone, "⚠️ Failed to fetch group data.")
            finally:
                cursor.close()
                conn.close()
        return True
    
    match_search = re.match(r'^group\s+@(\w+)\s+(?:search|find)\s+(.+)$', text_lower)
    if match_search:
        group_alias = match_search.group(1).lower()
        query = match_search.group(2).strip()
        
        await handle_group_search_command(phone, group_alias, query)
        return True

    return False