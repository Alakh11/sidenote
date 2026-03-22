from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import re
from typing import Any
from database import get_db
from security import pwd_context
from utils import create_default_categories
import logging
import os
from routers import auth, transactions, features, analytics, admin
from whatsapp_service import send_whatsapp_template
from fastapi import Query, HTTPException, Response, Request, BackgroundTasks
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from cron_insights import send_weekly_proactive_insights
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS Setup
origins = [
    "http://localhost:5173",
    "https://alakh-finance.onrender.com",
    "https://alakh11.github.io"
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

# --- Database Initialization on Startup ---
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
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

        # --- ADMIN ACCOUNT AUTO-CREATION ---
        admin_email = "alakhchaturvedi2002@gmail.com"
        cursor.execute("SELECT * FROM users WHERE email = %s", (admin_email,))
        existing_user: Any = cursor.fetchone()
        
        if not existing_user:
            hashed_pw = pwd_context.hash("Admin@2002")
            cursor.execute("""
                INSERT INTO users (name, email, password_hash, is_verified, mobile) 
                VALUES (%s, %s, %s, TRUE, %s)
            """, ("Alakh Admin", admin_email, hashed_pw, "0000000000"))
            
            # Create defaults for admin too
            create_default_categories(admin_email, cursor)
            logger.info(f"✅ Admin Account Created: {admin_email}")
            conn.commit()
        else:
            # Optional: Ensure admin is verified if they exist
            if not existing_user[6]: # index 6 is is_verified based on select *
                 cursor.execute("UPDATE users SET is_verified = TRUE WHERE email = %s", (admin_email,))
                 conn.commit()

        conn.close()
        logger.info("Database and Tables initialized successfully")
    except Exception as e:
        logger.error(f"Init DB Error: {e}")
        
VERIFY_TOKEN = "whatsapp_webhook_sidenote"

@app.on_event("startup")
def start_scheduler():
    scheduler = AsyncIOScheduler()
    # Runs every Sunday at 6:00 PM
    scheduler.add_job(send_weekly_proactive_insights, 'cron', day_of_week='sun', hour=18, minute=0)
    scheduler.start()
    
@app.get("/webhook")
async def verify_webhook(
    mode: str = Query(None, alias="hub.mode"),
    token: str = Query(None, alias="hub.verify_token"),
    challenge: str = Query(None, alias="hub.challenge")
):
    """
    Meta Webhook Verification Endpoint
    """
    if mode == "subscribe" and token == VERIFY_TOKEN:
        return Response(content=challenge, media_type="text/plain")
    
    raise HTTPException(status_code=403, detail="Forbidden")

@app.post("/webhook")
async def receive_whatsapp_message(request: Request, background_tasks: BackgroundTasks):
    """
    Catch incoming WhatsApp messages (Text, Images, etc.)
    """
    body = await request.json()
    
    try:
        entry = body.get('entry', [])[0]
        changes = entry.get('changes', [])[0]
        value = changes.get('value', {})
        
        if 'messages' in value:
            message = value['messages'][0]
            sender_phone = message['from']
            
            # 1. Handle Text Messages
            if message['type'] == 'text':
                text_body = message['text']['body']
                print(f"📩 Received text from {sender_phone}: {text_body}")
                
                background_tasks.add_task(process_whatsapp_message, sender_phone, text_body)
                
            # 2. Handle Image Messages (Bills)
            elif message['type'] == 'image':
                media_id = message['image']['id']
                print(f"📸 Received an image (Media ID: {media_id}) from {sender_phone}")

    except Exception as e:
        print(f"⚠️ Error parsing webhook: {e}")

    return {"status": "ok"}


async def process_whatsapp_message(phone: str, text: str):
    """
    Classifies the message and routes it to the correct handler.
    """
    text = text.strip().lower()
    
    # 1. Check for explicit commands
    if text == "summary":
        await handle_summary_request(phone)
    elif text == "week":
        await handle_weekly_request(phone)
    elif text == "month":
        await handle_monthly_request(phone)
    else:
        # 2. Check if it's an expense entry (contains a number)
        match = re.search(r'\d+(?:\.\d+)?', text)
        
        # Make sure it's not JUST a number (e.g., "250" is invalid, "250 chai" is valid)
        if match and not text.replace(" ", "").replace(".", "").isdigit():
            await handle_expense_entry(phone, text, match)
        else:
            # Fallback for "hi", "hello", or invalid formats
            await handle_fallback(phone)


async def handle_expense_entry(phone: str, text: str, match):
    amount = float(match.group(0))
    item = text.replace(match.group(0), "").strip()

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        # 1. First-time user check
        cursor.execute("SELECT email FROM users WHERE mobile = %s", (phone,))
        user: Any = cursor.fetchone()
        
        if not user:
            cursor.execute("INSERT INTO users (mobile, is_verified) VALUES (%s, TRUE)", (phone,))
            conn.commit()
            identifier = phone
            await send_whatsapp_template(phone, "sidenote_welcome_v1", [])
        else:
            identifier = user['email'] if user['email'] else phone

        search_term = f"%{item}%"
        cursor.execute("""
            SELECT id FROM categories 
            WHERE (user_email = %s OR user_email IS NULL) 
              AND type = 'expense' 
              AND name LIKE %s 
            LIMIT 1
        """, (identifier, search_term))
        cat_row: Any = cursor.fetchone()
        
        if not cat_row:
            cursor.execute("""
                SELECT id FROM categories 
                WHERE (user_email = %s OR user_email IS NULL) 
                  AND type = 'expense' 
                LIMIT 1
            """, (identifier,))
            cat_row = cursor.fetchone()
            
        category_id = cat_row['id'] if cat_row else 1 # Final failsafe

        # 3. Save the Expense to Database using the correct category_id
        cursor.execute("""
            INSERT INTO transactions (user_email, amount, type, note, date, category_id, payment_mode) 
            VALUES (%s, %s, 'expense', %s, NOW(), %s, 'Cash')
        """, (identifier, amount, item, category_id))
        conn.commit()

        # 4. Calculate Today's Total
        cursor.execute("""
            SELECT SUM(amount) as total FROM transactions 
            WHERE user_email = %s AND type = 'expense' AND DATE(date) = CURDATE()
        """, (identifier,))
        today_row: Any = cursor.fetchone()
        today_total = today_row['total'] if today_row and today_row['total'] else 0

        # 5. Send the 'Entry Recorded' Template
        await send_whatsapp_template(
            phone, 
            "entry_recorded_v1", 
            [str(amount), item, str(today_total)]
        )
        print(f"✅ Saved Transaction: {item} | ₹{amount} | Cat ID: {category_id}")
        
    except Exception as e:
        print(f"Database Error in WhatsApp parser: {e}")
    finally:
        conn.close()
        
async def handle_summary_request(phone: str):
    """
    Retrieves totals and sends the summary template.
    """
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT email FROM users WHERE mobile = %s", (phone,))
        user: Any = cursor.fetchone()
        if not user: return
        
        identifier = user['email'] if user['email'] else phone
        
        # Get Today's Total
        cursor.execute("SELECT SUM(amount) as total FROM transactions WHERE user_email=%s AND type='expense' AND DATE(date)=CURDATE()", (identifier,))
        today_row: Any = cursor.fetchone()
        today_total = today_row['total'] if today_row and today_row['total'] else 0
        
        # Get Week Total
        cursor.execute("SELECT SUM(amount) as total FROM transactions WHERE user_email=%s AND type='expense' AND YEARWEEK(date, 1)=YEARWEEK(CURDATE(), 1)", (identifier,))
        week_row: Any = cursor.fetchone()
        week_total = week_row['total'] if week_row and week_row['total'] else 0
        
        # Get Month Total
        cursor.execute("SELECT SUM(amount) as total FROM transactions WHERE user_email=%s AND type='expense' AND MONTH(date)=MONTH(CURDATE())", (identifier,))
        month_row: Any = cursor.fetchone()
        month_total = month_row['total'] if month_row and month_row['total'] else 0
        
        # Send Summary Template
        await send_whatsapp_template(
            phone, 
            "sidenote_overview_v1", 
            [str(today_total), str(week_total), str(month_total), "Misc", "N/A"]
        )
    finally:
        conn.close()

async def handle_weekly_request(phone: str):
    """
    Retrieves daily breakdown for the current week and sends the weekly template.
    """
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT email FROM users WHERE mobile = %s", (phone,))
        user: Any = cursor.fetchone()
        if not user: return
        
        identifier = user['email'] if user['email'] else phone
        
        # WEEKDAY() returns 0 for Monday, 1 for Tuesday ... 6 for Sunday
        cursor.execute("""
            SELECT WEEKDAY(date) as wd, SUM(amount) as total 
            FROM transactions 
            WHERE user_email = %s 
              AND type = 'expense' 
              AND YEARWEEK(date, 1) = YEARWEEK(CURDATE(), 1)
            GROUP BY wd
        """, (identifier,))
        daily_data: list[Any] = cursor.fetchall()
        
        # Initialize an array for [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
        days = [0.0] * 7 
        for row in daily_data:
            days[row['wd']] = float(row['total'])
            
        week_total = sum(days)
        
        # Format variables: [Total, Mon, Tue, Wed, Thu, Fri, Sat, Sun]
        variables = [f"{week_total:g}"] + [f"{d:g}" for d in days]
        
        await send_whatsapp_template(phone, "weekly_overview_v1", variables)
        print(f"✅ Sent Weekly Overview to {phone}")
    except Exception as e:
        print(f"Weekly Report Error: {e}")
    finally:
        conn.close()

async def handle_monthly_request(phone: str):
    """
    Retrieves weekly breakdown for the current month and sends the monthly template.
    """
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT email FROM users WHERE mobile = %s", (phone,))
        user: Any = cursor.fetchone()
        if not user: return
        
        identifier = user['email'] if user['email'] else phone
        
        # Group expenses by the exact day of the month
        cursor.execute("""
            SELECT DAY(date) as d, SUM(amount) as total 
            FROM transactions 
            WHERE user_email = %s 
              AND type = 'expense' 
              AND MONTH(date) = MONTH(CURDATE()) 
              AND YEAR(date) = YEAR(CURDATE())
            GROUP BY d
        """, (identifier,))
        month_data: list[Any] = cursor.fetchall()
        
        weeks = [0.0, 0.0, 0.0, 0.0] # [Week 1, Week 2, Week 3, Week 4+]
        month_total = 0.0
        
        for row in month_data:
            day = int(row['d'])
            amt = float(row['total'])
            month_total += amt
            
            # Group into roughly 7-day buckets
            if day <= 7: weeks[0] += amt
            elif day <= 14: weeks[1] += amt
            elif day <= 21: weeks[2] += amt
            else: weeks[3] += amt
            
        # Calculate daily average based on the current day of the month
        current_day = datetime.now().day
        avg_daily = month_total / current_day if current_day > 0 else 0
        
        # Format variables: [Total, W1, W2, W3, W4, Avg]
        variables = [f"{month_total:g}"] + [f"{w:g}" for w in weeks] + [f"{avg_daily:.0f}"]
        
        await send_whatsapp_template(phone, "monthly_overview_v1", variables)
        print(f"✅ Sent Monthly Overview to {phone}")
    except Exception as e:
        print(f"Monthly Report Error: {e}")
    finally:
        conn.close()

async def handle_fallback(phone: str):
    print(f"⚠️ Unrecognized input from {phone}. Sending help menu.")
    await send_whatsapp_template(phone, "sidenote_welcome_v1", [])


if __name__ == "__main__":
    import uvicorn
    # Render provides PORT, default to 10000 for local dev
    port = int(os.environ.get("PORT", 10000))
    # Host MUST be 0.0.0.0 for external access
    uvicorn.run(app, host="0.0.0.0", port=port)