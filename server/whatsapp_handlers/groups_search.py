from datetime import datetime
from database import get_db
from whatsapp_service import send_whatsapp_text
from whatsapp_handlers.bot_utils import get_user_id, db_semaphore

async def handle_group_search_command(phone: str, group_alias: str, query: str) -> bool:
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

            search_term = f"%{query.lower()}%"
            cursor.execute("""
                SELECT gt.id, gt.amount, gt.description, DATE(gt.logged_at) as date, 
                       u.name as logged_by_name, gt.logged_by as paid_by_user_id
                FROM group_transactions gt
                JOIN users u ON u.id = gt.logged_by
                WHERE gt.group_id = %s AND LOWER(gt.description) LIKE %s
                ORDER BY gt.logged_at DESC LIMIT 15
            """, (group['id'], search_term))
            
            rows = cursor.fetchall()
            
            if not rows:
                await send_whatsapp_text(phone, f"📭 No transactions found matching '{query}' in *{group['name']}*.")
                return True

            total_amount = sum(float(r['amount']) for r in rows)
            
            msg_lines = [f"🔍 *Search Results for '{query}'*"]
            msg_lines.append(f"Group: {group['name']}\n")
            
            for r in rows:
                msg_lines.append(f"• ₹{float(r['amount']):g} - {r['description']}")
                msg_lines.append(f"  _(by {r['logged_by_name']} on {r['date'].strftime('%b %d')})_")
                
                if r['paid_by_user_id'] == user_id and r['date'] == datetime.now().date():
                    msg_lines.append(f"  👉 To delete: *group rm {r['id']}*")
            
            msg_lines.append(f"\n*Total Found:* ₹{total_amount:g}")
            
            await send_whatsapp_text(phone, "\n".join(msg_lines))
            
        except Exception as e:
            print(f"Group Search Error: {e}")
            await send_whatsapp_text(phone, "⚠️ Failed to search group transactions.")
        finally:
            cursor.close()
            conn.close()
    return True