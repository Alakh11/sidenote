from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import get_db
from security import pwd_context
from utils import create_default_categories
import logging
import os
from routers import auth, transactions, features, analytics, admin

# Setup
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

@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "message": "API is running"}

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
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE,
                mobile VARCHAR(20) UNIQUE,
                password_hash VARCHAR(255),
                profile_pic TEXT,
                is_verified BOOLEAN DEFAULT FALSE,
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
        existing_user = cursor.fetchone()
        
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

if __name__ == "__main__":
    import uvicorn
    # Render provides PORT, default to 10000 for local dev
    port = int(os.environ.get("PORT", 10000))
    # Host MUST be 0.0.0.0 for external access
    uvicorn.run(app, host="0.0.0.0", port=port)