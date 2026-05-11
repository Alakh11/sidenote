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
from whatsapp_handlers.split_parser import parse_and_compute_split, SplitError
import asyncio

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
                    JOIN group_members gm ON g.id = gm.group_id
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
                
                msg = f"🎉 {g_type.title()} Group *'{g_name}'* created!\n\nShare this code with your members:\n👉 *join {code}*\n\n_(Code expires in 30 minutes. Max members: {max_m})_"
                await send_whatsapp_text(phone, msg)
            except Exception as e:
                conn.rollback()
                print(f"Create Group Error: {e}")
                traceback.print_exc()
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
                traceback.print_exc()
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

    # 4. SETTLE COMMAND: @group settle @username
    match_settle = re.match(r'^@(\w+)\s+settle\s+@(\w+)$', text_lower)
    if match_settle:
        group_alias = match_settle.group(1)
        target_name = match_settle.group(2)
        
        async with db_semaphore:
            conn = get_db()
            std_cursor = conn.cursor()
            user_id = get_user_id(std_cursor, phone)
            std_cursor.close()
            if not user_id: return True

            cursor = conn.cursor(dictionary=True)
            try:
                # Get Group & Members
                cursor.execute("""
                    SELECT g.id, g.name, u.name as my_name FROM expense_groups g
                    JOIN group_members gm ON g.id = gm.group_id
                    JOIN users u ON u.id = gm.user_id
                    WHERE gm.user_id = %s AND g.status = 'active' AND LOWER(g.name) LIKE %s LIMIT 1
                """, (user_id, f"%{group_alias}%"))
                group = cursor.fetchone()
                if not group:
                    await send_whatsapp_text(phone, f"❌ You are not in an active group matching '{group_alias}'.")
                    return True

                cursor.execute("""
                    SELECT u.id, u.name, u.nickname, u.mobile FROM group_members gm 
                    JOIN users u ON u.id = gm.user_id WHERE gm.group_id = %s
                """, (group['id'],))
                members = cursor.fetchall()
                
                target_user = next((m for m in members if m['name'].lower().split()[0] == target_name or m.get('nickname', '').lower() == target_name), None)
                if not target_user:
                    await send_whatsapp_text(phone, f"❌ @{target_name} is not in this group.")
                    return True

                cursor.execute("SELECT amount, logged_by, split_details FROM group_transactions WHERE group_id = %s", (group['id'],))
                txns = cursor.fetchall()
                
                my_balance = 0.0
                target_balance = 0.0
                
                for tx in txns:
                    amount = float(tx['amount'])
                    payer = tx['logged_by']
                    details = json.loads(tx['split_details']) if tx['split_details'] else {}
                    
                    if not details: # Fallback for old equal splits
                        share = amount / len(members)
                        details = {str(m['id']): share for m in members}
                        
                    if payer == target_user['id']:
                        my_debt = float(details.get(str(user_id), 0))
                        my_balance -= my_debt
                        
                    elif payer == user_id:
                        target_debt = float(details.get(str(target_user['id']), 0))
                        target_balance -= target_debt

                amount_i_owe = abs(my_balance) if my_balance < 0 else 0
                
                if amount_i_owe < 0.01:
                    await send_whatsapp_text(phone, f"✅ You are already settled up with {target_user['name'].split()[0]}.")
                    return True

                settle_details = {str(target_user['id']): amount_i_owe}
                cursor.execute("""
                    INSERT INTO group_transactions (group_id, amount, description, logged_by, split_type, split_details)
                    VALUES (%s, %s, 'Settlement', %s, 'settlement', %s)
                """, (group['id'], amount_i_owe, user_id, json.dumps(settle_details)))
                conn.commit()
                
                await send_whatsapp_text(phone, f"✅ Marked as settled with @{target_name}. Total cleared: ₹{amount_i_owe:g}")
                
                if target_user['mobile']:
                    await send_whatsapp_text(target_user['mobile'], f"💸 @{group['my_name'].split()[0]} marked ₹{amount_i_owe:g} as settled in *{group['name']}*.")

            except Exception as e:
                conn.rollback()
                print(f"Settlement Error: {e}")
                traceback.print_exc()
                await send_whatsapp_text(phone, "⚠️ Failed to settle transaction.")
            finally:
                cursor.close()
                conn.close()
        return True

    # 5. LOG TRANSACTION (@alias 500 coffee 60% @alakh)
    match_log = re.match(r'^@(\w+)\s+(\d+(?:\.\d+)?)\s+(.+)$', text, re.IGNORECASE)
    if match_log and not match_settle:
        group_alias = match_log.group(1).lower()
        amount = float(match_log.group(2))
        if amount <= 0:
            await send_whatsapp_text(phone, "❌ The amount needs to be more than 0. Try: @group_name 500 food ✅")
            return True
            
        remaining_text = match_log.group(3).strip()
        
        async with db_semaphore:
            conn = get_db()
            std_cursor = conn.cursor()
            user_id = get_user_id(std_cursor, phone)
            std_cursor.close()
            
            if not user_id: return True

            cursor = conn.cursor(dictionary=True)
            try:
                cursor.execute("""
                    SELECT g.id, g.name, u.name as my_name FROM expense_groups g
                    JOIN group_members gm ON g.id = gm.group_id
                    JOIN users u ON u.id = gm.user_id
                    WHERE gm.user_id = %s AND g.status = 'active' AND LOWER(g.name) LIKE %s LIMIT 1
                """, (user_id, f"%{group_alias}%"))
                group = cursor.fetchone()

                if not group:
                    await send_whatsapp_text(phone, f"❌ You are not in an active group matching '{group_alias}'.")
                    return True

                cursor.execute("""
                    SELECT u.id, u.name, u.nickname, u.mobile 
                    FROM group_members gm JOIN users u ON u.id = gm.user_id 
                    WHERE gm.group_id = %s
                """, (group['id'],))
                members = cursor.fetchall()
                
                # Use Parser Engine
                try:
                    desc, split_type, shares = parse_and_compute_split(amount, remaining_text, members, user_id)
                except SplitError as e:
                    await send_whatsapp_text(phone, f"❌ {str(e)}")
                    return True
                
                details_json = json.dumps(shares)
                cursor.execute("""
                    INSERT INTO group_transactions (group_id, amount, description, logged_by, split_type, split_details)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (group['id'], amount, desc, user_id, split_type, details_json))
                
                conn.commit()
                
                # Notify sender
                await send_whatsapp_text(phone, f"✅ Logged to *{group['name']}*:\n*{desc}* — ₹{amount:g} ({split_type.capitalize()} split)")
                
                # Notify members who owe money
                payer_name = group['my_name'].split()[0]
                for uid_str, share_amt in shares.items():
                    uid = int(uid_str)
                    if uid != user_id and share_amt > 0:
                        target = next((m for m in members if m['id'] == uid), None)
                        if target and target['mobile']:
                            notif = f"🔔 *{payer_name}* split ₹{amount:g} for *{desc}* in *{group['name']}*.\n\nYour share: ₹{share_amt:g}\n👉 Reply `@{group['name'].split()[0].lower()} settle @{payer_name.lower()}` to mark as paid."
                            asyncio.create_task(send_whatsapp_text(target['mobile'], notif))
                            
            except Exception as e:
                conn.rollback()
                print(f"Log Group Txn Error: {e}")
                traceback.print_exc()
                await send_whatsapp_text(phone, "⚠️ Failed to log group transaction.")
            finally:
                cursor.close()
                conn.close()
        return True

    # 6. EXECUTE DELETE
    match_rm = re.search(r'group\s+rm\s+(\d+)', text_lower)
    if match_rm:
        tx_id = int(match_rm.group(1))
        print(f"Executing Deletion: Attempting to remove Tx ID {tx_id} for user {phone}")
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
                    WHERE gt.id = %s AND gt.logged_by = %s
                """, (tx_id, user_id))
                txn = cursor.fetchone()

                if not txn:
                    print(f"Deletion Failed: Tx {tx_id} not found or permission denied.")
                    await send_whatsapp_text(phone, "❌ Transaction not found or you don't have permission to delete it.")
                    return True

                cursor.execute("DELETE FROM group_transactions WHERE id = %s", (tx_id,))
                conn.commit()
                
                if cursor.rowcount > 0:
                    desc_text = txn['description'] or "Transaction"
                    await send_whatsapp_text(phone, f"🗑️ Successfully deleted: *{desc_text}* (₹{txn['amount']:g}) from *{txn['group_name']}*")
                else:
                    await send_whatsapp_text(phone, "⚠️ Error: Could not verify deletion from database.")
            except Exception as e:
                conn.rollback()
                print(f"Group RM Error: {e}")
                traceback.print_exc()
                await send_whatsapp_text(phone, "⚠️ Failed to delete transaction.")
            finally:
                cursor.close()
                conn.close()
        return True

    # 7. ALL OTHER COMMANDS (Total, Search, History, Pagination)
    match_alias_cmd = re.search(r'group\s+@(\w+)\s+(.+)', text_lower)
    if match_alias_cmd:
        group_alias = match_alias_cmd.group(1).lower()
        
        cmd_text = re.sub(r'\s+', ' ', match_alias_cmd.group(2).strip())
        parts = cmd_text.split()
        base_cmd = parts[0]

        # A) Total Command
        if base_cmd == "total":
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

        # B) Search/Find Command
        if base_cmd in ["search", "find"]:
            query = " ".join(parts[1:])
            await handle_group_search_command(phone, group_alias, query)
            return True

        # C) Timeframes & History
        if base_cmd == "history":
            if len(parts) > 1 and parts[1] == "all":
                cmd_to_pass = "history all"
                page = int(parts[2]) if len(parts) > 2 and parts[2].isdigit() else 1
            else:
                cmd_to_pass = "history"
                page = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 1
            await process_group_query(phone, group_alias, cmd_to_pass, page)
            return True

        # D) Other Queries (Undo, Today, Yesterday, Week, Month)
        if base_cmd in ["undo", "today", "yesterday", "week", "month"]:
            page = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 1
            await process_group_query(phone, group_alias, base_cmd, page)
            return True
        
        await send_whatsapp_text(phone, f"❌ Unknown command for @{group_alias}. Try: history, total, or undo.")
        return True

    return False


async def process_group_query(phone: str, group_alias: str, cmd: str, page: int = 1):
    print(f"Executing Process Query: Alias={group_alias}, Cmd={cmd}, Page={page}")
    is_all = "all" in cmd
    limit = 50 if is_all else 10
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
                
                btns = []
                for t in txns:
                    desc_text = (t['description'] or '')[:10]
                    title = f"❌ {float(t['amount']):g} {desc_text}"
                    btns.append({"id": f"group rm {t['id']}", "title": title[:20]}) 
                    
                await send_whatsapp_interactive_buttons(phone, f"Which entry in *{group['name']}* do you want to delete?", btns)
                return

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
                ORDER BY gt.logged_at DESC LIMIT {limit} OFFSET {offset}
            """, (group['id'],))
            rows = cursor.fetchall()

            if not rows:
                msg = "🏁 No more transactions to show." if page > 1 else f"📭 No transactions found."
                await send_whatsapp_text(phone, msg)
                return

            page_total = sum(float(r['amount']) for r in rows)

            title = f"Recent expanses in {group['name']}"
            if is_all: title = f"Full history in {group['name']}"

            msg_lines = [f"📜 *{title}* (Page {page})"]
            for r in rows:
                desc = r['description'] or ""
                msg_lines.append(f"• {r['logged_at'].strftime('%d %b')}: ₹{float(r['amount']):g} {desc} ({r['logged_by_name']})")
            
            msg_lines.append(f"\n*Total:* ₹{page_total:g}")

            cursor.execute(f"SELECT COUNT(*) as total_count FROM group_transactions gt WHERE gt.group_id = %s {date_filter}", (group['id'],))
            total_records = cursor.fetchone()['total_count']

            if total_records > (offset + limit):
                btn_cmd = f"group @{group_alias} {cmd} {page + 1}"
                await send_whatsapp_interactive_buttons(phone, "\n".join(msg_lines), [{"id": btn_cmd, "title": "Show More"}])
            else:
                await send_whatsapp_text(phone, "\n".join(msg_lines))

        except Exception as e:
            print(f"Group Query Error: {e}")
            traceback.print_exc()
            await send_whatsapp_text(phone, "⚠️ Failed to fetch group data.")
        finally:
            cursor.close()
            conn.close()