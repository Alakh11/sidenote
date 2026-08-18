from datetime import datetime, timedelta
from fastapi import FastAPI, APIRouter, Depends, Query, HTTPException, Response, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import logging, json, os, hmac, hashlib, threading, time
from database import get_db
from routers import auth, transactions, features, analytics, admin, groups, help
from bot_handlers import process_whatsapp_text, process_whatsapp_interactive, process_whatsapp_image, process_whatsapp_audio
from security import get_current_user, verify_meta_signature
from whatsapp_service import send_whatsapp_template, send_policy_consent_prompt, send_whatsapp_text
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from cron_nudges import run_daily_nudges
from pydantic import BaseModel
from typing import Optional
from starlette.background import BackgroundTask
from zoneinfo import ZoneInfo
from utils import is_country_allowed, get_client_ip, fetch_geoip_data, get_allowed_countries_from_db 
from db_init import initialize_database

blocked_notified_cache = {}
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
ist_timezone = ZoneInfo('Asia/Kolkata')

ENVIRONMENT = os.getenv("ENVIRONMENT")
APP_VERSION = os.getenv("APP_VERSION")
app = FastAPI(
    title="SideNote API",
    description="WhatsApp-first financial ledger system",
    version="1.0.0",
    docs_url=None if ENVIRONMENT == "production" else "/docs",
    redoc_url=None if ENVIRONMENT == "production" else "/redoc",
    openapi_url=None if ENVIRONMENT == "production" else "/openapi.json"
)

VERIFY_TOKEN = os.getenv("WA_WEBHOOK_VERIFY_TOKEN")
META_APP_SECRET = os.getenv("META_APP_SECRET", "").strip()

# CORS Setup
origins = [
    "http://localhost:5173",
    "https://sidenote.in",
    "https://www.sidenote.in"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Include Routers ---
app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(features.router)
app.include_router(analytics.router)
app.include_router(admin.router)
app.include_router(groups.router)
app.include_router(help.router)

@app.api_route("/", tags=["Health"], methods=["GET", "HEAD"])
def health_check():
    return {"status": "ok", "message": "API is running"}

@app.on_event("startup")
def startup_db_init():
    logger.info("Application starting up. Checking database schema...")
    initialize_database()

def get_next_cron_run_time():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        now_ist = datetime.utcnow() + timedelta(hours=5, minutes=30)
        cursor.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'last_cron_run'")
        result = cursor.fetchone()
        
        if result and result.get('setting_value'):
            last_run_str = result['setting_value']
            last_run = datetime.strptime(last_run_str, '%Y-%m-%d %H:%M:%S')
            intended_next_run = last_run + timedelta(minutes=15)
            
            if intended_next_run <= now_ist:
                logger.info(f"Engine missed its schedule. Catching up now.")
                return now_ist + timedelta(seconds=10)
            
            logger.info(f"Engine schedule restored. Next run: {intended_next_run}")
            return intended_next_run
            
        return now_ist + timedelta(seconds=10)
    except Exception as e:
        logger.error(f"Failed to read cron state: {e}")
        return datetime.utcnow() + timedelta(hours=5, minutes=30, seconds=10)
    finally:
        conn.close()

@app.on_event("startup")
def start_scheduler():
    scheduler = AsyncIOScheduler(timezone=ist_timezone)
    next_run = get_next_cron_run_time()
    scheduler.add_job(run_daily_nudges, 'interval', minutes=15, id='nudge_engine', next_run_time=next_run, replace_existing=True)
    scheduler.start()
    app.state.scheduler = scheduler


async def process_incoming_message(message: dict, sender_phone: str, message_id: Optional[str], sender_name: str):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    try:
        if not is_country_allowed(sender_phone, cursor):
            print(f"🚫 Geo-Blocked: Message from unauthorized country code ({sender_phone})")
            
            current_time = time.time()
            last_notified_time = blocked_notified_cache.get(sender_phone, 0)
            if current_time - last_notified_time > 86400:
                block_msg = (
                    "⚠️ *Service Unavailable*\n\n"
                    f"Hi {sender_name}, thank you for your interest! "
                    "Unfortunately, SideNote is currently not available in your region. "
                    "We hope to expand to your country soon! 🌍"
                )
                await send_whatsapp_text(sender_phone, block_msg)
                
                blocked_notified_cache[sender_phone] = current_time
                print(f"📤 Sent rejection notice to {sender_phone}")
            else:
                print(f"🤫 Silently dropping repeated message from {sender_phone} to save API costs.")
                
            return
        cursor.execute("SELECT id, has_consented FROM users WHERE mobile = %s", (sender_phone,))
        user = cursor.fetchone()
        
        if user:
            if not user.get('has_consented'):
                is_interactive = message.get("type") == "interactive"
                
                if is_interactive:
                    button_id = message["interactive"]["button_reply"]["id"]
                    
                    if button_id == "accept_tnc":
                        cursor.execute("UPDATE users SET has_consented = TRUE WHERE id = %s", (user['id'],))
                        conn.commit()
                        await send_whatsapp_text(
                            sender_phone, 
                            "✅ *Thank you!* You have successfully accepted the updated Terms and Privacy Policy.\n\nYou can now continue logging your expenses!"
                        )
                        return
                        
                    elif button_id == "decline_tnc":
                        await send_whatsapp_text(
                            sender_phone, 
                            "⚠️ You must accept the updated Terms and Privacy Policy to continue using SideNote."
                        )
                        await send_policy_consent_prompt(sender_phone)
                        return
                
                await send_policy_consent_prompt(sender_phone)
                return

        if message['type'] == 'text':
            text_body = message['text']['body']
            print(f"📩 Text from {sender_name} ({sender_phone}): {text_body}")
            await process_whatsapp_text(sender_phone, text_body, message_id, sender_name)
            
        elif message['type'] == 'interactive':
            button_id = message['interactive']['button_reply']['id']
            print(f"👆 Button clicked by {sender_name} ({sender_phone}): {button_id}")
            await process_whatsapp_interactive(sender_phone, button_id, message_id, sender_name)
            
        elif message['type'] in ['image', 'document']:
            media_type = message['type'] 
            media_id = str(message[media_type]['id'])
            mime_type = str(message[media_type]['mime_type'])
            print(f"📄 {media_type.capitalize()} received from {sender_name} ({sender_phone}). Processing ...")
            await process_whatsapp_image(sender_phone, media_id, mime_type, message_id, sender_name)
        
        elif message['type'] == 'audio':
            media_id = str(message['audio']['id'])
            print(f"🎙️ Voice note received from {sender_name} ({sender_phone}).")
            await process_whatsapp_audio(sender_phone, media_id, message_id, sender_name)

    except Exception as e:
        logger.error(f"Error in Master Message Router: {e}")
    finally:
        conn.close()

def log_webhook_event(payload_str: str):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO whatsapp_webhook_events (event_type, payload, processing_status) VALUES (%s, %s, %s)",
            ('webhook_received', payload_str, 'processed')
        )
        conn.commit()
    except Exception as e:
        logger.error(f"Failed to log webhook: {e}")
    finally:
        conn.close()

def process_message_status(status_dict: dict):
    conn = get_db()
    cursor = conn.cursor()
    try:
        wamid = status_dict.get('id')
        status = status_dict.get('status')
        ts_int = int(status_dict.get('timestamp', time.time()))
        timestamp = datetime.fromtimestamp(ts_int)
        phone = status_dict.get('recipient_id')
        
        err_code = None
        err_msg = None
        
        if status == 'failed' and 'errors' in status_dict:
            err = status_dict['errors'][0]
            err_code = err.get('code')
            err_msg = f"{err.get('title', '')} - {err.get('error_data', {}).get('details', '')}"

        cursor.execute("""
            INSERT INTO whatsapp_messages (whatsapp_message_id, phone_number, direction, status, timestamp, error_code, error_message)
            VALUES (%s, %s, 'outbound', %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE 
                status = VALUES(status), 
                timestamp = VALUES(timestamp),
                error_code = VALUES(error_code),
                error_message = VALUES(error_message),
                updated_at = CURRENT_TIMESTAMP
        """, (wamid, phone, status, timestamp, err_code, err_msg))
        
        cursor.execute("""
            INSERT INTO whatsapp_message_events (whatsapp_message_id, status, timestamp, raw_event)
            VALUES (%s, %s, %s, %s)
        """, (wamid, status, timestamp, json.dumps(status_dict)))
        
        conn.commit()
    except Exception as e:
        logger.error(f"Status Processing Error: {e}")
    finally:
        conn.close()
            
@app.get("/webhook")
async def verify_webhook(
    mode: str = Query(None, alias="hub.mode"),
    token: str = Query(None, alias="hub.verify_token"),
    challenge: str = Query(None, alias="hub.challenge")
):
    if mode == "subscribe" and token == VERIFY_TOKEN:
        return Response(content=challenge, media_type="text/plain")
    raise HTTPException(status_code=403, detail="Forbidden")


@app.post("/webhook")
async def receive_whatsapp_message(request: Request, background_tasks: BackgroundTasks):
    raw_body = await request.body()
    signature_header = request.headers.get("X-Hub-Signature-256")

    if not signature_header:
        print("⚠️ Webhook blocked: Missing signature header")
        raise HTTPException(status_code=401, detail="Missing signature")

    if not META_APP_SECRET:
        print("🚨 Webhook blocked: META_APP_SECRET is missing from the server environment!")
        raise HTTPException(status_code=500, detail="Server configuration error")

    expected_signature = hmac.new(
        key=META_APP_SECRET.encode(),
        msg=raw_body,
        digestmod=hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(f"sha256={expected_signature}", signature_header):
        print("❌ Webhook blocked: Signature mismatch. Check your META_APP_SECRET.")
        raise HTTPException(status_code=401, detail="Invalid signature")

    try:
        body = json.loads(raw_body)
        background_tasks.add_task(log_webhook_event, raw_body.decode('utf-8'))
        
        entry = body.get('entry', [])[0]
        changes = entry.get('changes', [])[0]
        value = changes.get('value', {})
        
        contacts = value.get('contacts', [])
        sender_name = contacts[0].get('profile', {}).get('name', 'WhatsApp User') if contacts else 'WhatsApp User'
        wa_id = contacts[0].get('wa_id') if contacts else None
        
        if 'messages' in value:
            message = value['messages'][0]
            sender_phone = message['from']
            message_id = message.get('id')
            
            if wa_id:
                background_tasks.add_task(update_user_wa_id, sender_phone, wa_id)
            
            background_tasks.add_task(process_incoming_message, message, sender_phone, message_id, sender_name)

        elif 'statuses' in value:
            for status in value['statuses']:
                background_tasks.add_task(process_message_status, status)
                
                if status.get('status') == 'failed':
                    errors = status.get('errors', [{}])[0]
                    print(f"❌ META DELIVERY FAILED [Code {errors.get('code')}]: {errors.get('title')} -> {errors.get('error_data', {}).get('details')}")
                
    except Exception as e:
        print(f"⚠️ Webhook Processing Error: {e}")

    return {"status": "ok"}

def update_user_wa_id(mobile: str, wa_id: str):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE users SET whatsapp_user_id = %s WHERE mobile = %s", (wa_id, mobile))
        conn.commit()
    except: pass
    finally: conn.close()


def log_api_metric(method: str, endpoint: str, duration_ms: float, status_code: int):
    if any(endpoint.endswith(ext) for ext in ['.php', '.env', '.json', '.yml', '.yaml', '.txt', '.git']):
        return
        
    if status_code == 404:
        return

    if endpoint == "/admin/metrics" or endpoint == "/": 
        return
        
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO api_metrics (method, endpoint, response_time_ms, status_code) VALUES (%s, %s, %s, %s)", 
            (method, endpoint, duration_ms, status_code)
        )
        conn.commit()
    except Exception as e:
        print(f"Metrics Error: {e}")
    finally:
        if conn:
            try: conn.close() 
            except: pass

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time_ms = (time.time() - start_time) * 1000
    response.headers["X-App-Version"] = APP_VERSION
    
    route = request.scope.get("route")
    endpoint_pattern = route.path if route else request.url.path
    
    response.background = BackgroundTask(
        log_api_metric,
        request.method,
        endpoint_pattern,
        process_time_ms,
        response.status_code
    )
    
    return response

class FeedbackSubmit(BaseModel):
    type: str
    rating: Optional[int] = 0
    subject: str
    message: str

@app.post("/support/feedback")
def submit_feedback(data: FeedbackSubmit, user_id: int = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO feedback (user_id, `type`, rating, subject, message, created_at) VALUES (%s, %s, %s, %s, %s, NOW())",
            (user_id, data.type, data.rating, data.subject, data.message)
        )
        conn.commit()
        return {"message": "Feedback submitted successfully"}
    except Exception as e:
        conn.rollback()
        logger.error(f"🚨 CRITICAL FEEDBACK ERROR: {e}") 
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
        
@app.get("/support/feedback/history")
def get_user_feedback_history(user_id: int = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM feedback WHERE user_id = %s ORDER BY created_at DESC", (user_id,))
        return cursor.fetchall()
    finally:
        conn.close()
        
@app.middleware("http")
async def geo_ip_block_middleware(request: Request, call_next):
    exempt_paths = ["/", "/webhook", "/docs", "/openapi.json", "/redoc"]
    if request.method == "OPTIONS" or request.url.path in exempt_paths:
        return await call_next(request)

    client_ip = get_client_ip(request)

    geo_data = await fetch_geoip_data(client_ip)

    if geo_data:
        allowed_countries = get_allowed_countries_from_db()
        country_code = geo_data.get("calling_code")
        country_name = geo_data.get("country_name")

        if country_code not in allowed_countries and country_name not in allowed_countries:
            logger.warning(f"🚫 Geo-Blocked IP {client_ip} ({country_name} / +{country_code}) on path {request.url.path}")
            origin = request.headers.get("origin", "*")
            return JSONResponse(
                status_code=403,
                content={
                    "detail": "Access Denied: SideNote is currently not available in your region/country.",
                    "ip": client_ip
                },
                headers={
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Credentials": "true",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                }
            )

    return await call_next(request)

if __name__ == "__main__":
    import uvicorn
    # Render provides PORT, default to 10000 for local dev
    port = int(os.environ.get("PORT", 10000))
    # Host MUST be 0.0.0.0 for external access
    uvicorn.run(app, host="0.0.0.0", port=port)