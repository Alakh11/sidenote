import re, time, asyncio
from typing import Any, Optional
from database import get_db
from whatsapp_service import send_whatsapp_text, send_whatsapp_template, send_policy_consent_prompt
from constants import TEMPLATE_WELCOME

# Global Semaphore to prevent DB connection exhaustion
db_semaphore = asyncio.Semaphore(20)

# Memory caches
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
    """Smartly extracts the amount, item, and payment mode from a conversational string."""
    text_lower = text.lower().strip()
    is_explicit_income = bool(re.search(r'^\s*\+\s*(?:rs\.?|₹|rupees|inr|rupee|paise|paisa|taka)?\s*\d+', text_lower))
    
    payment_mode = "UPI"
    mode_mappings = [('upi', 'UPI'), ('card', 'Card'), ('net banking', 'Net Banking'), ('cash', 'Cash')]
    
    for mode, formatted_mode in mode_mappings:
        if re.search(r'\b' + mode + r'\b', text_lower):
            payment_mode = formatted_mode
            text_lower = re.sub(r'\b' + mode + r'\b', '', text_lower, count=1)
            break
    
    text_clean = re.sub(r'(?<=\d)\s+(?=\d)', '', text_lower)
    text_clean = re.sub(r'(?<=\d),(?=\d)', '', text_clean)
    
    currency_match = re.search(r'(?:rs\.?|₹|rupees|inr|rupee|paise|paisa|taka)\s*(\d+(?:\.\d+)?)', text_clean) or \
                     re.search(r'(\d+(?:\.\d+)?)\s*(?:rs\.?|₹|rupees|inr|rupee|paise|paisa|taka)', text_clean)
                     
    if currency_match:
        amount_str = currency_match.group(1)
    else:
        temp_text = text_clean
        months_regex = r'(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*'
        temp_text = re.sub(r'\b\d{1,2}[-/]\d{1,2}(?:[-/]\d{2,4})?\b', '', temp_text)
        temp_text = re.sub(rf'\b\d{{1,2}}(?:st|nd|rd|th)?\s+{months_regex}\s*(?:\d{{2,4}})?\b', '', temp_text, flags=re.IGNORECASE)
        temp_text = re.sub(rf'\b{months_regex}\s+\d{{1,2}}(?:st|nd|rd|th)?\s*(?:\d{{2,4}})?\b', '', temp_text, flags=re.IGNORECASE)
        temp_text = re.sub(r'\b20[2-3]\d\b', '', temp_text)
        
        numbers = re.findall(r'\d+(?:\.\d+)?', temp_text)
        
        if not numbers:
            numbers = re.findall(r'\d+(?:\.\d+)?', text_clean)
            if not numbers:
                return None, text_clean, False, payment_mode
        amount_str = numbers[0]
        
    amount = float(amount_str)
    
    item = text_clean.replace(amount_str, "", 1)
    item = re.sub(r'\b(rs\.?|rupees|inr|rupee|paise|paisa|taka)\b', '', item)
    item = item.replace('₹', '')
    item = item.strip("- =:, +")
    
    item = re.sub(r'\s{2,}', ' ', item)
    item = re.sub(r'^(for|on|a|an|the|spent on)\s+', '', item).strip()
    item = re.sub(r'\s+(for|on)$', '', item).strip()
    item = item.strip("- =:, +")
    
    return amount, item, is_explicit_income, payment_mode

def get_user_id(cursor: Any, phone: str) -> int | None:
    cursor.execute("SELECT id FROM users WHERE mobile = %s", (phone,))
    user_row = cursor.fetchone()
    if user_row:
        return int(tuple(user_row)[0])
    return None

async def ensure_user_exists(phone: str, sender_name: str = "WhatsApp User") -> bool:
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
        await send_policy_consent_prompt(phone)
        return True
        
    return False

def log_bot_command(phone: str, command: str):
    conn = get_db()
    cursor = conn.cursor()
    try:
        user_id = get_user_id(cursor, phone)
        if user_id:
            cursor.execute("INSERT INTO bot_command_logs (user_id, command) VALUES (%s, %s)", (user_id, command))
            conn.commit()
    except Exception as e:
        pass
    finally:
        conn.close()

async def send_delayed_message(phone: str, msg: str, delay: int = 10):
    await asyncio.sleep(delay)
    await send_whatsapp_text(phone, msg)
    
def match_category_from_text(cursor: Any, user_id: int, description: str, tx_type: str = 'expense') -> int:
    cursor.execute("SELECT name, keywords, icon, color FROM global_categories WHERE type = %s", (tx_type,))
    global_cats = cursor.fetchall()
    
    target_name = "Misc Expenses" if tx_type == "expense" else "Misc Income"
    cat_icon = "🧾" if tx_type == "expense" else "💵"
    cat_color = "#94A3B8" if tx_type == "expense" else "#10B981"
    
    desc_lower = description.lower()
    
    if global_cats:
        for gc in global_cats:
            gc_name = str(gc[0] if isinstance(gc, tuple) else gc['name'])
            gc_keys = str(gc[1] if isinstance(gc, tuple) else gc['keywords'] or "")
            gc_ico = str(gc[2] if isinstance(gc, tuple) else gc['icon'])
            gc_col = str(gc[3] if isinstance(gc, tuple) else gc['color'])
            
            aliases = [gc_name.lower()]
            if "&" in gc_name: aliases.extend([a.strip().lower() for a in gc_name.split("&")])
            if gc_keys and gc_keys.lower() != 'none': 
                aliases.extend([k.strip().lower() for k in gc_keys.split(',')])
                
            if any(re.search(rf'\b{re.escape(alias)}\b', desc_lower) for alias in aliases):
                target_name = gc_name
                cat_icon = gc_ico
                cat_color = gc_col
                break

    cursor.execute("""
        SELECT id FROM categories 
        WHERE (user_id = %s OR user_id IS NULL) AND name = %s AND type = %s 
        ORDER BY user_id DESC LIMIT 1
    """, (user_id, target_name, tx_type))
    cat_row = cursor.fetchone()
    
    if cat_row:
        return int(cat_row[0] if isinstance(cat_row, tuple) else cat_row['id'])
    else:
        cursor.execute("""
            INSERT INTO categories (user_id, name, type, icon, color, is_default) 
            VALUES (%s, %s, %s, %s, %s, TRUE)
        """, (user_id, target_name, tx_type, cat_icon, cat_color))
        return cursor.lastrowid