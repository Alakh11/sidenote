from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import os
from database import get_db
from routers import auth, transactions, features, analytics, admin
from bot_handlers import process_whatsapp_text, process_whatsapp_interactive, process_whatsapp_image
from whatsapp_service import send_whatsapp_template
from fastapi import Query, HTTPException, Response, Request, BackgroundTasks
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from cron_insights import send_weekly_proactive_insights

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()
VERIFY_TOKEN = os.getenv("WHATSAPP_WEBHOOK_VERIFY_TOKEN", "whatsapp_webhook_sidenote")

# CORS Setup
origins = [
    "http://localhost:5173",
    "https://sidenote.hex8.in"
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
    return await send_whatsapp_template("918796022992", "sidenote_welcome_v1", [])

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
                user_email VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                color VARCHAR(50),
                type ENUM('income', 'expense') NOT NULL,
                icon VARCHAR(50),
                is_default BOOLEAN DEFAULT FALSE
            )
        """)

        # 3. Loans Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS loans (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_email VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                total_amount DECIMAL(15, 2) NOT NULL,
                interest_rate DECIMAL(5, 2) NOT NULL,
                tenure_months INT NOT NULL,
                start_date DATE NOT NULL,
                emi_amount DECIMAL(10, 2) NOT NULL
            )
        """)
        
        # 4. Goals Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS goals (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_email VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                target_amount DECIMAL(15, 2) NOT NULL,
                current_amount DECIMAL(15, 2) DEFAULT 0,
                deadline DATE
            )
        """)

        # 5. Transactions Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_email VARCHAR(255) NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                type ENUM('income', 'expense') NOT NULL,
                category_id INT,
                payment_mode VARCHAR(50),
                date DATETIME NOT NULL,
                note TEXT,
                is_recurring BOOLEAN DEFAULT FALSE,
                goal_id INT,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
                FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL
            )
        """)

        # 6. Budgets Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS budgets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_email VARCHAR(255) NOT NULL,
                category_id INT NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                UNIQUE KEY unique_budget (user_email, category_id),
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
            )
        """)

        # 7. Borrowers Table (Debt Tracker)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS borrowers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_email VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                total_lent DECIMAL(15, 2) DEFAULT 0,
                total_repaid DECIMAL(15, 2) DEFAULT 0,
                current_balance DECIMAL(15, 2) DEFAULT 0,
                last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 8. Debts Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS debts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                borrower_id INT NOT NULL,
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

        conn.close()
        logger.info("Database and Tables initialized successfully")
    except Exception as e:
        logger.error(f"Init DB Error: {e}")
        

@app.on_event("startup")
def start_scheduler():
    scheduler = AsyncIOScheduler()
    scheduler.add_job(send_weekly_proactive_insights, 'cron', day_of_week='sun', hour=18, minute=0)
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
    body = await request.json()
    try:
        entry = body.get('entry', [])[0]
        changes = entry.get('changes', [])[0]
        value = changes.get('value', {})
        
        if 'messages' in value:
            message = value['messages'][0]
            sender_phone = message['from']
            
            if message['type'] == 'text':
                text_body = message['text']['body']
                print(f"📩 Text from {sender_phone}: {text_body}")
                background_tasks.add_task(process_whatsapp_text, sender_phone, text_body)
                
            elif message['type'] == 'interactive':
                button_id = message['interactive']['button_reply']['id']
                print(f"👆 Button clicked by {sender_phone}: {button_id}")
                background_tasks.add_task(process_whatsapp_interactive, sender_phone, button_id)
                
            elif message['type'] == 'image':
                media_id = str(message['image']['id'])
                mime_type = str(message['image']['mime_type'])
                print(f"📸 Image received from {sender_phone}. Processing with AI...")
                background_tasks.add_task(process_whatsapp_image, sender_phone, media_id, mime_type)
                
    except Exception as e:
        print(f"⚠️ Webhook Error: {e}")

    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    # Render provides PORT, default to 10000 for local dev
    port = int(os.environ.get("PORT", 10000))
    # Host MUST be 0.0.0.0 for external access
    uvicorn.run(app, host="0.0.0.0", port=port)
