import logging
from database import get_db

logger = logging.getLogger(__name__)

def initialize_database():
    logger.info("Starting database initialization...")
    conn = None
    cursor = None
    try:
        conn = get_db()
        cursor = conn.cursor()

        queries = [
            # 1. INDEPENDENT TABLES
            """
            CREATE TABLE IF NOT EXISTS users (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE,
                mobile VARCHAR(50) UNIQUE,
                password_hash VARCHAR(255),
                profile_pic TEXT,
                is_verified TINYINT(1) DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                currency VARCHAR(10) DEFAULT '₹',
                month_start_date INT DEFAULT 1,
                monthly_budget DECIMAL(15,2) DEFAULT 0,
                role ENUM('user', 'admin', 'superadmin') DEFAULT 'user',
                has_consented TINYINT(1) DEFAULT 0,
                account_status VARCHAR(20) DEFAULT 'active',
                bot_state VARCHAR(50) DEFAULT 'NEW',
                nickname VARCHAR(100),
                whatsapp_user_id VARCHAR(100)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS allowed_countries (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                country_code VARCHAR(10) NOT NULL UNIQUE,
                country_name VARCHAR(100) NOT NULL,
                status TINYINT DEFAULT 1 COMMENT '0: inactive, 1: active, 2: pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS api_metrics (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                method VARCHAR(10),
                endpoint VARCHAR(255),
                response_time_ms FLOAT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status_code INT DEFAULT 200
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS auto_replies (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                trigger_keywords TEXT NOT NULL,
                reply_text TEXT NOT NULL,
                buttons_json TEXT,
                is_active TINYINT(1) DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS global_categories (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                type ENUM('income', 'expense') DEFAULT 'expense',
                icon VARCHAR(50) DEFAULT '📝',
                color VARCHAR(50) DEFAULT '#6366F1',
                keywords TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS help_topics (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                icon_name VARCHAR(50) DEFAULT 'MessageSquare',
                status TINYINT DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS nudge_settings (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                rule_name VARCHAR(50) NOT NULL UNIQUE,
                template_name VARCHAR(100) NOT NULL,
                description TEXT,
                rule_type VARCHAR(20) DEFAULT 'inactivity',
                hours_min FLOAT DEFAULT 0,
                hours_max FLOAT DEFAULT 0,
                bypass_limits TINYINT(1) DEFAULT 0,
                is_active TINYINT(1) DEFAULT 1,
                variables_required VARCHAR(255),
                schedule_time VARCHAR(10) DEFAULT '10:00',
                schedule_day VARCHAR(20) DEFAULT 'Monday',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS otps (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                identifier VARCHAR(255) NOT NULL,
                otp_code VARCHAR(10) NOT NULL,
                expires_at DATETIME NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS system_settings (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                setting_key VARCHAR(50) NOT NULL UNIQUE,
                setting_value VARCHAR(255) NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS ui_metrics (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                metric_name VARCHAR(50),
                value FLOAT,
                path VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            
            # 2. TABLES WITH SINGLE FK DEPENDENCIES ON `users`
            """
            CREATE TABLE IF NOT EXISTS automated_messages (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                template_name VARCHAR(100) NOT NULL,
                trigger_reason VARCHAR(100),
                sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS borrowers (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                user_email VARCHAR(255),
                name VARCHAR(255) NOT NULL,
                total_lent DECIMAL(15,2) DEFAULT 0,
                total_repaid DECIMAL(15,2) DEFAULT 0,
                current_balance DECIMAL(15,2) DEFAULT 0,
                last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
                user_id INT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS bot_command_logs (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                command VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS categories (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                user_email VARCHAR(255),
                name VARCHAR(255) NOT NULL,
                color VARCHAR(50),
                type ENUM('income', 'expense') NOT NULL,
                icon VARCHAR(50),
                is_default TINYINT(1) DEFAULT 0,
                user_id INT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS expense_groups (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                type ENUM('couple', 'family', 'split') NOT NULL,
                name VARCHAR(255) NOT NULL,
                created_by INT NOT NULL,
                max_members INT NOT NULL,
                status ENUM('pending', 'active') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS feedback (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                user_email VARCHAR(255),
                type ENUM('feedback', 'review', 'issue') NOT NULL,
                rating INT DEFAULT 0,
                subject VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                status ENUM('open', 'resolved') DEFAULT 'open',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                admin_reply TEXT,
                replied_at TIMESTAMP NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS goals (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                user_email VARCHAR(255),
                name VARCHAR(255) NOT NULL,
                target_amount DECIMAL(15,2) NOT NULL,
                current_amount DECIMAL(15,2) DEFAULT 0,
                deadline DATE,
                user_id INT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS loans (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                user_email VARCHAR(255),
                name VARCHAR(255) NOT NULL,
                total_amount DECIMAL(15,2) NOT NULL,
                interest_rate DECIMAL(5,2) NOT NULL,
                tenure_months INT NOT NULL,
                start_date DATE NOT NULL,
                emi_amount DECIMAL(10,2) NOT NULL,
                user_id INT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            
            # 3. HELP CENTER DEPENDENCIES
            """
            CREATE TABLE IF NOT EXISTS help_articles (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                topic_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                status TINYINT DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (topic_id) REFERENCES help_topics(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS help_feedback (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                topic_id INT NOT NULL,
                article_id INT NOT NULL,
                user_id INT,
                ip_address VARCHAR(45),
                is_helpful TINYINT(1) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (topic_id) REFERENCES help_topics(id) ON DELETE CASCADE,
                FOREIGN KEY (article_id) REFERENCES help_articles(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,

            # 4. TABLES WITH MULTIPLE DEPENDENCIES
            """
            CREATE TABLE IF NOT EXISTS budgets (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                user_email VARCHAR(255),
                category_id INT NOT NULL,
                amount DECIMAL(15,2) NOT NULL,
                user_id INT,
                UNIQUE KEY unique_user_category (user_id, category_id),
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS debts (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                borrower_id INT NOT NULL,
                amount DECIMAL(15,2) NOT NULL,
                date DATE NOT NULL,
                due_date DATE,
                reason VARCHAR(255),
                status VARCHAR(50) DEFAULT 'Pending',
                interest_rate DECIMAL(5,2) DEFAULT 0,
                interest_period VARCHAR(20) DEFAULT 'Monthly',
                amount_repaid DECIMAL(15,2) DEFAULT 0,
                user_id INT,
                FOREIGN KEY (borrower_id) REFERENCES borrowers(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS repayments (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                debt_id INT NOT NULL,
                amount DECIMAL(15,2) NOT NULL,
                date DATE NOT NULL,
                mode VARCHAR(50),
                FOREIGN KEY (debt_id) REFERENCES debts(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS transactions (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                user_email VARCHAR(255),
                amount DECIMAL(15,2) NOT NULL,
                type ENUM('income', 'expense') NOT NULL,
                category_id INT,
                payment_mode VARCHAR(50),
                date DATETIME NOT NULL,
                note TEXT,
                is_recurring TINYINT(1) DEFAULT 0,
                goal_id INT,
                user_id INT,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
                FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS group_members (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                group_id INT NOT NULL,
                user_id INT NOT NULL,
                role ENUM('admin', 'member') DEFAULT 'member',
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_group_user (group_id, user_id),
                FOREIGN KEY (group_id) REFERENCES expense_groups(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS group_transactions (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                group_id INT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                description VARCHAR(255),
                logged_by INT NOT NULL,
                split_type ENUM('equal', 'subset', 'percentage', 'ratio') DEFAULT 'equal',
                split_data JSON,
                logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                category VARCHAR(50) DEFAULT 'general',
                payment_mode VARCHAR(50) DEFAULT 'upi',
                split_details JSON,
                FOREIGN KEY (group_id) REFERENCES expense_groups(id) ON DELETE CASCADE,
                FOREIGN KEY (logged_by) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS invite_codes (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                group_id INT NOT NULL,
                code VARCHAR(6) NOT NULL UNIQUE,
                created_by INT NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                used TINYINT(1) DEFAULT 0,
                FOREIGN KEY (group_id) REFERENCES expense_groups(id) ON DELETE CASCADE,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS message_delivery_logs (
            id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            mobile VARCHAR(50) NOT NULL,
            message_id VARCHAR(255) UNIQUE NOT NULL,
            status VARCHAR(50) DEFAULT 'sent',
            error_message TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """
            """
            CREATE TABLE IF NOT EXISTS whatsapp_messages (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                whatsapp_message_id VARCHAR(255) UNIQUE NOT NULL,
                phone_number VARCHAR(50) NOT NULL,
                direction ENUM('inbound', 'outbound') NOT NULL,
                message_type VARCHAR(50),
                message_body TEXT,
                timestamp DATETIME,
                status VARCHAR(50),
                error_code VARCHAR(50),
                error_message TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS whatsapp_message_events (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                whatsapp_message_id VARCHAR(255) NOT NULL,
                status VARCHAR(50) NOT NULL,
                timestamp DATETIME,
                raw_event TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (whatsapp_message_id) REFERENCES whatsapp_messages(whatsapp_message_id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS whatsapp_media (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                message_id VARCHAR(255),
                whatsapp_media_id VARCHAR(255) NOT NULL,
                media_type VARCHAR(50),
                mime_type VARCHAR(100),
                file_url TEXT,
                file_name VARCHAR(255),
                file_size INT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS whatsapp_webhook_events (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                event_type VARCHAR(100),
                payload TEXT,
                received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                processed_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                processing_status VARCHAR(50) DEFAULT 'pending',
                error_message TEXT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """
        ]

        logger.info(f"Executing {len(queries)} table creation queries...")
        for query in queries:
            cursor.execute(query)
            
        conn.commit()
        logger.info("Database schema successfully validated and initialized.")

    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Critical error during database initialization: {e}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    initialize_database()