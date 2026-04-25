from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, File, UploadFile
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
            query += "JOIN transactions t ON u.id = t.user_id "
            query += "WHERE u.is_verified = TRUE AND u.mobile IS NOT NULL "
            query += "AND t.date >= NOW() - INTERVAL 24 HOUR "
        else:
            query += "WHERE u.is_verified = TRUE AND u.mobile IS NOT NULL "
            
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