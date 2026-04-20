from datetime import datetime, timedelta
from fastapi import FastAPI, APIRouter, Depends, Query, HTTPException, Response, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import logging, json, os, hmac, hashlib, threading, time
from database import get_db
from routers import auth, transactions, features, analytics, admin
from bot_handlers import process_whatsapp_text, process_whatsapp_interactive, process_whatsapp_image, process_whatsapp_audio
from security import get_current_user, verify_meta_signature
from whatsapp_service import send_whatsapp_template
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from cron_nudges import run_daily_nudges
from pydantic import BaseModel
from typing import Optional
from tracking import track_event
from starlette.background import BackgroundTask


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()
VERIFY_TOKEN = os.getenv("WA_WEBHOOK_VERIFY_TOKEN")
META_APP_SECRET = os.getenv("META_APP_SECRET", "").strip()

# CORS Setup
origins = [
    "http://localhost:5173",
    "https://www.sidenote.in"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

@app.api_route("/", tags=["Health"], methods=["GET", "HEAD"])
def health_check():
    return {"status": "ok", "message": "API is running"}

@app.get("/test-whatsapp")
async def trigger_whatsapp_test():
    return await send_whatsapp_template("919580813770", "sidenote_welcome_v1", [])

@app.on_event("startup")
def init_db():
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 1. Users Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) DEFAULT 'WhatsApp User',
                email VARCHAR(255) UNIQUE,
                mobile VARCHAR(20) UNIQUE,
                password_hash VARCHAR(255),
                profile_pic TEXT,
                role VARCHAR(50) DEFAULT 'user',
                currency VARCHAR(10) DEFAULT '₹',
                month_start_date INT DEFAULT 1,
                is_verified BOOLEAN DEFAULT FALSE,
                bot_state VARCHAR(50) DEFAULT 'NEW',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                monthly_budget DECIMAL(15, 2) DEFAULT 0
            )
        """)

        # 2. Categories Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                name VARCHAR(255) NOT NULL,
                color VARCHAR(50),
                type ENUM('income', 'expense') NOT NULL,
                icon VARCHAR(50),
                is_default BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)

        # 3. Loans Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS loans (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                name VARCHAR(255) NOT NULL,
                total_amount DECIMAL(15, 2) NOT NULL,
                interest_rate DECIMAL(5, 2) NOT NULL,
                tenure_months INT NOT NULL,
                start_date DATE NOT NULL,
                emi_amount DECIMAL(10, 2) NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        
        # 4. Goals Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS goals (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                name VARCHAR(255) NOT NULL,
                target_amount DECIMAL(15, 2) NOT NULL,
                current_amount DECIMAL(15, 2) DEFAULT 0,
                deadline DATE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)

        # 5. Transactions Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                amount DECIMAL(15, 2) NOT NULL,
                type ENUM('income', 'expense') NOT NULL,
                category_id INT,
                payment_mode VARCHAR(50),
                date DATETIME NOT NULL,
                note TEXT,
                is_recurring BOOLEAN DEFAULT FALSE,
                goal_id INT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
                FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL
            )
        """)

        # 6. Budgets Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS budgets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                category_id INT NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                UNIQUE KEY unique_budget (user_id, category_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
            )
        """)

        # 7. Borrowers Table (Debt Tracker)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS borrowers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                name VARCHAR(255) NOT NULL,
                total_lent DECIMAL(15, 2) DEFAULT 0,
                total_repaid DECIMAL(15, 2) DEFAULT 0,
                current_balance DECIMAL(15, 2) DEFAULT 0,
                last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)

        # 8. Debts Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS debts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                borrower_id INT NOT NULL,
                user_id INT,
                amount DECIMAL(15, 2) NOT NULL,
                date DATE NOT NULL,
                due_date DATE,
                reason VARCHAR(255),
                status VARCHAR(50) DEFAULT 'Pending',
                interest_rate DECIMAL(5, 2) DEFAULT 0,
                interest_period VARCHAR(20) DEFAULT 'Monthly',
                amount_repaid DECIMAL(15, 2) DEFAULT 0,
                FOREIGN KEY (borrower_id) REFERENCES borrowers(id) ON DELETE CASCADE
            )
        """)

        # 9. Repayments Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS repayments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                debt_id INT NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                date DATE NOT NULL,
                mode VARCHAR(50),
                FOREIGN KEY (debt_id) REFERENCES debts(id) ON DELETE CASCADE
            )
        """)
        
        # 10. Automated Messages (Nudge Logs)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS automated_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                template_name VARCHAR(100) NOT NULL,
                trigger_reason VARCHAR(100),
                sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)

        conn.close()
        logger.info("Database and Tables initialized successfully")
    except Exception as e:
        logger.error(f"Init DB Error: {e}")
        

@app.on_event("startup")
def start_scheduler():
    scheduler = AsyncIOScheduler()
    scheduler.add_job(run_daily_nudges, 'interval', minutes=15)
    scheduler.start()
    
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
        
        entry = body.get('entry', [])[0]
        changes = entry.get('changes', [])[0]
        value = changes.get('value', {})
        
        contacts = value.get('contacts', [])
        sender_name = contacts[0].get('profile', {}).get('name', 'WhatsApp User') if contacts else 'WhatsApp User'
        
        if 'messages' in value:
            message = value['messages'][0]
            sender_phone = message['from']
            message_id = message.get('id')
            
            if message['type'] == 'text':
                text_body = message['text']['body']
                print(f"📩 Text from {sender_name} ({sender_phone}): {text_body}")
                background_tasks.add_task(process_whatsapp_text, sender_phone, text_body, message_id, sender_name)
                
            elif message['type'] == 'interactive':
                button_id = message['interactive']['button_reply']['id']
                print(f"👆 Button clicked by {sender_name} ({sender_phone}): {button_id}")
                background_tasks.add_task(process_whatsapp_interactive, sender_phone, button_id, message_id, sender_name)
                
            elif message['type'] in ['image', 'document']:
                media_type = message['type'] 
                media_id = str(message[media_type]['id'])
                mime_type = str(message[media_type]['mime_type'])
                
                print(f"📄 {media_type.capitalize()} received from {sender_name} ({sender_phone}). Processing ...")
                background_tasks.add_task(process_whatsapp_image, sender_phone, media_id, mime_type, message_id, sender_name)
            
            elif message['type'] == 'audio':
                media_id = str(message['audio']['id'])
                print(f"🎙️ Voice note received from {sender_name} ({sender_phone}).")
                background_tasks.add_task(process_whatsapp_audio, sender_phone, media_id, message_id, sender_name)

        elif 'statuses' in value:
            status = value['statuses'][0]
            if status.get('status') == 'failed':
                errors = status.get('errors', [{}])[0]
                err_code = errors.get('code', 'Unknown')
                err_title = errors.get('title', 'Delivery Failed')
                err_details = errors.get('error_data', {}).get('details', 'No details provided by Meta.')
                
                print(f"❌ META DELIVERY FAILED [Code {err_code}]: {err_title} -> {err_details}")
                
    except Exception as e:
        print(f"⚠️ Webhook Processing Error: {e}")

    return {"status": "ok"}

def log_api_metric(method: str, endpoint: str, duration_ms: float, status_code: int):
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
        
    if not endpoint.startswith("/admin"):
        track_event('server_backend', 'api_request_made', {
            'endpoint': endpoint,
            'method': method,
            'status_code': status_code,
            'response_time_ms': duration_ms
        })

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time_ms = (time.time() - start_time) * 1000
    
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
        ist_now = (datetime.utcnow() + timedelta(hours=5, minutes=30)).strftime('%Y-%m-%d %H:%M:%S')
        
        cursor.execute(
            "INSERT INTO feedback (user_id, type, rating, subject, message, created_at) VALUES (%s, %s, %s, %s, %s, %s)",
            (user_id, data.type, data.rating, data.subject, data.message, ist_now)
        )
        conn.commit()
        return {"message": "Feedback submitted successfully"}
    except Exception as e:
        conn.rollback()
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

if __name__ == "__main__":
    import uvicorn
    # Render provides PORT, default to 10000 for local dev
    port = int(os.environ.get("PORT", 10000))
    # Host MUST be 0.0.0.0 for external access
    uvicorn.run(app, host="0.0.0.0", port=port)