import re
from database import get_db
from whatsapp_service import send_whatsapp_text
from whatsapp_handlers.bot_utils import get_user_id, db_semaphore
import string, random

def generate_invite_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

async def handle_group_commands(phone: str, text: str) -> bool:
    text_lower = text.lower()
    
    # 1. Create Group
    if text_lower.startswith("create group "):
        group_name = text[13:].strip()
        if not group_name: return True
        
        async with db_semaphore:
            conn = get_db()
            cursor = conn.cursor()
            try:
                user_id = get_user_id(cursor, phone)
                code = generate_invite_code()
                
                cursor.execute("INSERT INTO expense_groups (name, invite_code) VALUES (%s, %s)", (group_name, code))
                group_id = cursor.lastrowid
                cursor.execute("INSERT INTO group_members (group_id, user_id) VALUES (%s, %s)", (group_id, user_id))
                conn.commit()
                
                msg = f"🎉 Group *{group_name}* created!\n\nTell your friends to send this message to the bot to join:\n👉 *join {code}*"
                await send_whatsapp_text(phone, msg)
            finally:
                cursor.close()
                conn.close()
        return True

    # 2. Join Group
    if text_lower.startswith("join "):
        code = text[5:].strip().upper()
        async with db_semaphore:
            conn = get_db()
            
            std_cursor = conn.cursor()
            user_id = get_user_id(std_cursor, phone)
            std_cursor.close()

            cursor = conn.cursor(dictionary=True)
            try:
                cursor.execute("SELECT id, name FROM expense_groups WHERE invite_code = %s", (code,))
                group = cursor.fetchone()
                
                if group:
                    cursor.execute("INSERT IGNORE INTO group_members (group_id, user_id) VALUES (%s, %s)", (group['id'], user_id))
                    conn.commit()
                    await send_whatsapp_text(phone, f"✅ You successfully joined *{group['name']}*!")
                else:
                    await send_whatsapp_text(phone, "❌ Invalid invite code.")
            finally:
                cursor.close()
                conn.close()
        return True

    # 3. Log Group Transaction
    if text.startswith("@"):
        match = re.match(r'@(\w+)\s+(\d+(?:\.\d+)?)\s+(.+)', text)
        if match:
            group_alias = match.group(1).lower()
            amount = float(match.group(2))
            item = match.group(3).strip()
            
            async with db_semaphore:
                conn = get_db()
                
                std_cursor = conn.cursor()
                user_id = get_user_id(std_cursor, phone)
                std_cursor.close()

                cursor = conn.cursor(dictionary=True)
                try:
                    cursor.execute("""
                        SELECT g.id, g.name FROM expense_groups g
                        JOIN group_members gm ON g.id = gm.group_id
                        WHERE gm.user_id = %s AND LOWER(g.name) LIKE %s LIMIT 1
                    """, (user_id, f"%{group_alias}%"))
                    
                    group = cursor.fetchone()
                    if group:
                        cursor.execute("INSERT INTO group_transactions (group_id, paid_by_user_id, amount, description) VALUES (%s, %s, %s, %s)", 
                                       (group['id'], user_id, amount, item))
                        conn.commit()
                        await send_whatsapp_text(phone, f"✅ Added ₹{amount:g} for '{item}' to *{group['name']}*.\nThis is split equally among all members.")
                    else:
                        await send_whatsapp_text(phone, f"❌ You don't belong to any group matching '{group_alias}'.")
                finally:
                    cursor.close()
                    conn.close()
            return True

    return False