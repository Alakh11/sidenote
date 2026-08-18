import csv
import io
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, File, UploadFile, Query
from typing import Any, Optional
from pydantic import BaseModel
from database import get_db
from security import require_admin
from whatsapp_service import send_whatsapp_template, send_whatsapp_text, send_whatsapp_media, upload_whatsapp_media
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class BroadcastPayload(BaseModel):
    message_type: str = "template"
    template_name: Optional[str] = None
    variables: list[str] = []
    message_text: Optional[str] = None
    media_link: Optional[str] = None
    media_id: Optional[str] = None
    caption: Optional[str] = None
    filename: Optional[str] = None
    target_user_ids: list[int] = []
    audience: str = "all"
    
@router.post("/broadcast/upload-media")
async def upload_media_for_broadcast(
    file: UploadFile = File(...), 
    admin_id: int = Depends(require_admin)
):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT role FROM users WHERE id = %s", (admin_id,))
        admin_data: Any = cursor.fetchone()
        if not isinstance(admin_data, dict) or admin_data.get('role') not in ['admin', 'superadmin']:
             raise HTTPException(status_code=403, detail="Permission denied.")

        file_bytes = await file.read()
        mime_type = file.content_type or "application/octet-stream"
        filename = file.filename or "uploaded_file"
        
        media_id = await upload_whatsapp_media(file_bytes, mime_type, filename)
        
        if not media_id:
            raise HTTPException(status_code=500, detail="Failed to upload media to WhatsApp servers.")
            
        return {"media_id": media_id, "message": "File uploaded successfully"}
    finally:
        conn.close()

@router.post("/broadcast/parse-mis")
async def parse_mis_file(
    file: UploadFile = File(...),
    admin_id: int = Depends(require_admin)
):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        content = await file.read()
        text = content.decode('utf-8-sig')
        reader = csv.reader(io.StringIO(text))
        
        search_terms = []
        for row in reader:
            for cell in row:
                val = cell.strip()
                if val:
                    search_terms.append(val)
        
        if not search_terms:
            raise HTTPException(status_code=400, detail="Empty file or no valid data found.")
        
        # Deduplicate and categorize terms to prevent DB type errors
        unique_terms = list(set(search_terms))[:5000] # Limit to prevent payload overflow
        ids = []
        mobiles = []
        emails = []

        for term in unique_terms:
            if term.isdigit():
                ids.append(term)
                if len(term) >= 10:
                    mobiles.append(term)
                    mobiles.append('+' + term)
            elif '@' in term:
                emails.append(term)
            else:
                clean_phone = ''.join(filter(lambda x: x.isdigit() or x == '+', term))
                if len(clean_phone) >= 10:
                    mobiles.append(clean_phone)

        where_clauses = []
        params = []

        if ids:
            where_clauses.append(f"id IN ({','.join(['%s']*len(ids))})")
            params.extend(ids)
        if mobiles:
            where_clauses.append(f"mobile IN ({','.join(['%s']*len(mobiles))})")
            params.extend(mobiles)
        if emails:
            where_clauses.append(f"email IN ({','.join(['%s']*len(emails))})")
            params.extend(emails)

        if not where_clauses:
             return {"users": [], "message": "No valid search identifiers (ID, Email, Mobile) found in the file."}

        query = f"SELECT id, name, mobile, email FROM users WHERE {' OR '.join(where_clauses)}"
        cursor.execute(query, params)
        users = cursor.fetchall()
        
        return {"users": users, "message": f"Found {len(users)} matching users from MIS."}
        
    except Exception as e:
        logger.error(f"MIS Parse Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse MIS file. Please ensure it is a valid CSV.")
    finally:
        conn.close()

@router.get("/broadcast/reports")
def get_whatsapp_delivery_reports(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: str = Query("failed"),
    admin_id: int = Depends(require_admin)
):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status IN ('sent', 'delivered', 'read') THEN 1 ELSE 0 END) as total_sent,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as total_failed
            FROM whatsapp_messages
            WHERE direction = 'outbound'
        """)
        stats = cursor.fetchone() or {"total": 0, "total_sent": 0, "total_failed": 0}

        where_clause = "WHERE w.direction = 'outbound'"
        if status_filter == "failed":
            where_clause += " AND (w.status = 'failed' OR w.error_code IS NOT NULL)"

        cursor.execute(f"SELECT COUNT(*) as count FROM whatsapp_messages w {where_clause}")
        count_row = cursor.fetchone()
        total_items = count_row['count'] if count_row else 0

        data_query = f"""
            SELECT w.id, w.whatsapp_message_id, w.phone_number, w.status, w.error_code, 
                   w.error_message, w.timestamp, w.message_type, u.name
            FROM whatsapp_messages w
            LEFT JOIN users u ON w.phone_number = u.mobile
            {where_clause}
            ORDER BY w.timestamp DESC
            LIMIT %s OFFSET %s
        """
        cursor.execute(data_query, (limit, (page - 1) * limit))
        messages = cursor.fetchall()
        
        return {
            "stats": stats, 
            "messages": messages,
            "total": total_items,
            "page": page,
            "limit": limit,
            "total_pages": (total_items + limit - 1) // limit if limit else 1
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/broadcast/reports/clear-errors")
def clear_whatsapp_errors(admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE whatsapp_messages SET error_message = NULL, error_code = NULL, status = 'cleared' WHERE status = 'failed'")
        conn.commit()
        return {"message": "Error log cleared successfully."}
    finally:
        conn.close()

@router.post("/broadcast")
async def broadcast_whatsapp_message(
    payload: BroadcastPayload, 
    background_tasks: BackgroundTasks,
    admin_id: int = Depends(require_admin)
):
    if payload.message_type == "template" and not payload.template_name:
        raise HTTPException(status_code=400, detail="Template name is required.")
    if payload.message_type == "text" and not payload.message_text:
        raise HTTPException(status_code=400, detail="Message text is required.")
    if payload.message_type in ["image", "video", "audio", "document"] and not (payload.media_link or payload.media_id):
        raise HTTPException(status_code=400, detail="A media link or media ID is required for media broadcasts.")

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT role FROM users WHERE id = %s", (admin_id,))
        admin_data: Any = cursor.fetchone()
        
        if not isinstance(admin_data, dict) or admin_data.get('role') not in ['admin', 'superadmin']:
             raise HTTPException(status_code=403, detail="You do not have permission to send broadcasts.")

        query = "SELECT DISTINCT u.mobile FROM users u "
        params: list[Any] = []
        
        if payload.audience == "active_24h":
            query += "WHERE u.is_verified = TRUE AND u.has_consented = TRUE AND u.mobile IS NOT NULL "
            query += "AND EXISTS ("
            query += "    SELECT 1 FROM whatsapp_messages w "
            query += "    WHERE w.phone_number = u.mobile AND w.direction = 'inbound' AND w.timestamp >= NOW() - INTERVAL 24 HOUR"
            query += ") "
        else:
            query += "WHERE u.is_verified = TRUE AND u.has_consented = TRUE AND u.mobile IS NOT NULL "
            
        if payload.target_user_ids:
            format_strings = ','.join(['%s'] * len(payload.target_user_ids))
            query += f" AND u.id IN ({format_strings})"
            params.extend(payload.target_user_ids)
            
        if payload.target_user_ids:
            format_strings = ','.join(['%s'] * len(payload.target_user_ids))
            query += f" AND u.id IN ({format_strings})"
            params.extend(payload.target_user_ids)

        cursor.execute(query, params)
        users = cursor.fetchall()
        
        if not users:
            raise HTTPException(status_code=400, detail="No active users found matching this criteria.")
        
        queued_count = 0
        for u in users:
            if isinstance(u, dict) and u.get('mobile'):
                mobile_number = str(u['mobile'])
                
                if payload.message_type == "text":
                    background_tasks.add_task(send_whatsapp_text, mobile_number, payload.message_text or "")
                elif payload.message_type == "template":
                    background_tasks.add_task(send_whatsapp_template, mobile_number, payload.template_name or "", payload.variables)
                elif payload.message_type in ["image", "video", "audio", "document"]:
                    background_tasks.add_task(
                        send_whatsapp_media, 
                        to_number=mobile_number, 
                        media_type=payload.message_type, 
                        media_link=payload.media_link, 
                        media_id=payload.media_id,
                        caption=payload.caption,
                        filename=payload.filename
                    )
                    
                queued_count += 1
                    
        return {"message": f"Broadcast successfully queued for {queued_count} users!"}
    except Exception as e:
        logger.error(f"Broadcast Error: {e}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()