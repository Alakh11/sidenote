from fastapi import APIRouter, Depends, HTTPException
from typing import Any, Optional
from pydantic import BaseModel
from database import get_db
from security import require_admin
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class AutoReplyPayload(BaseModel):
    trigger_keywords: str
    reply_text: str
    buttons_json: Optional[str] = None
    is_active: bool = True

class GlobalCategoryPayload(BaseModel):
    name: str
    type: str = "expense"
    icon: str = "📝"
    color: str = "#6366F1"
    keywords: str

@router.get("/auto-replies")
def get_auto_replies(admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM auto_replies ORDER BY id DESC")
        return cursor.fetchall()
    finally:
        conn.close()

@router.post("/auto-replies")
def create_auto_reply(payload: AutoReplyPayload, admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO auto_replies (trigger_keywords, reply_text, buttons_json, is_active)
            VALUES (%s, %s, %s, %s)
        """, (payload.trigger_keywords.lower(), payload.reply_text, payload.buttons_json, payload.is_active))
        conn.commit()
        return {"message": "Auto-reply created"}
    finally:
        conn.close()

@router.delete("/auto-replies/{reply_id}")
def delete_auto_reply(reply_id: int, admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM auto_replies WHERE id = %s", (reply_id,))
        conn.commit()
        return {"message": "Deleted"}
    finally:
        conn.close()

@router.put("/auto-replies/{reply_id}")
def update_auto_reply(reply_id: int, payload: AutoReplyPayload, admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE auto_replies 
            SET trigger_keywords=%s, reply_text=%s, buttons_json=%s, is_active=%s 
            WHERE id=%s
        """, (payload.trigger_keywords.lower(), payload.reply_text, payload.buttons_json, payload.is_active, reply_id))
        conn.commit()
        return {"message": "Auto-reply updated"}
    finally:
        conn.close()

@router.get("/global-categories")
def get_global_categories(admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM global_categories ORDER BY type ASC, name ASC")
        return cursor.fetchall()
    finally:
        conn.close()

@router.post("/global-categories")
def create_global_category(payload: GlobalCategoryPayload, admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO global_categories (name, type, icon, color, keywords)
            VALUES (%s, %s, %s, %s, %s)
        """, (payload.name, payload.type, payload.icon, payload.color, payload.keywords.lower()))
        conn.commit()
        return {"message": "Category created"}
    finally:
        conn.close()

@router.put("/global-categories/{cat_id}")
def update_global_category(cat_id: int, payload: GlobalCategoryPayload, admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE global_categories 
            SET name=%s, type=%s, icon=%s, color=%s, keywords=%s 
            WHERE id=%s
        """, (payload.name, payload.type, payload.icon, payload.color, payload.keywords.lower(), cat_id))
        conn.commit()
        return {"message": "Category updated"}
    finally:
        conn.close()

@router.delete("/global-categories/{cat_id}")
def delete_global_category(cat_id: int, admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM global_categories WHERE id = %s", (cat_id,))
        conn.commit()
        return {"message": "Category deleted"}
    finally:
        conn.close()
        
@router.get("/engagement/commands")
def get_command_analytics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    admin_id: int = Depends(require_admin)
):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        where_clauses = ["1=1"]
        params = []

        if start_date:
            where_clauses.append("DATE(l.created_at) >= %s")
            params.append(start_date)
        else:
            where_clauses.append("l.created_at >= NOW() - INTERVAL 30 DAY")
            
        if end_date:
            where_clauses.append("DATE(l.created_at) <= %s")
            params.append(end_date)
            
        if search:
            search_term = f"%{search}%"
            where_clauses.append("(u.name LIKE %s OR u.mobile LIKE %s)")
            params.extend([search_term, search_term])
            
        where_str = " AND ".join(where_clauses)

        cursor.execute(f"""
            SELECT l.command, COUNT(*) as usage_count 
            FROM bot_command_logs l
            JOIN users u ON l.user_id = u.id
            WHERE {where_str}
            GROUP BY l.command 
            ORDER BY usage_count DESC 
            LIMIT 10
        """, params)
        top_commands = cursor.fetchall()
        
        total_uses = sum(row['usage_count'] for row in top_commands) if top_commands else 1
        for cmd in top_commands:
            cmd['percentage'] = round((cmd['usage_count'] / total_uses) * 100)

        cursor.execute(f"""
            SELECT DATE(l.created_at) as date, COUNT(*) as daily_count 
            FROM bot_command_logs l
            JOIN users u ON l.user_id = u.id
            WHERE {where_str}
            GROUP BY DATE(l.created_at)
            ORDER BY date ASC
            LIMIT 30
        """, params)
        daily_usage = cursor.fetchall()
        for day in daily_usage:
            day['date'] = day['date'].strftime('%b %d') if hasattr(day['date'], 'strftime') else str(day['date'])

        cursor.execute(f"""
            WITH UserCmdCounts AS (
                SELECT u.id as user_id, u.name, u.mobile, u.profile_pic, l.command, COUNT(l.id) as cmd_count
                FROM bot_command_logs l
                JOIN users u ON l.user_id = u.id
                WHERE {where_str}
                GROUP BY u.id, u.name, u.mobile, u.profile_pic, l.command
            )
            SELECT user_id as id, name, mobile, profile_pic, 
                   SUM(cmd_count) as total_commands,
                   GROUP_CONCAT(CONCAT(command, ':', cmd_count) SEPARATOR ', ') as used_commands
            FROM UserCmdCounts
            GROUP BY user_id, name, mobile, profile_pic
            ORDER BY total_commands DESC
            LIMIT 50
        """, params)
        user_data = cursor.fetchall()
        
        max_user_cmd = max((row['total_commands'] for row in user_data), default=1)
        for u in user_data:
            u['percentage'] = round((u['total_commands'] / max_user_cmd) * 100)

        return {
            "top_commands": top_commands,
            "daily_usage": daily_usage,
            "user_data": user_data
        }
    except Exception as e:
        logger.error(f"Command Analytics Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch command analytics")
    finally:
        conn.close()