import time
import httpx
import logging
from datetime import datetime, date, timedelta
from fastapi import Request
from database import get_db

logger = logging.getLogger(__name__)

IP_GEO_CACHE = {}
IP_CACHE_TTL = 86400
ALLOWED_COUNTRIES_CACHE = {"codes": set(), "updated_at": 0}
ALLOWED_DB_CACHE_TTL = 300

def calculate_interest(principal, rate, period, start_date_str):
    if not rate or rate == 0:
        return 0.0
    
    start_date = datetime.strptime(str(start_date_str), "%Y-%m-%d").date()
    today = (datetime.utcnow() + timedelta(hours=5, minutes=30)).date()
    days_passed = (today - start_date).days
    
    if days_passed <= 0:
        return 0.0

    interest = 0.0
    if period == 'Daily':
        interest = (principal * rate * days_passed) / 100
    elif period == 'Monthly':
        months = days_passed / 30.44
        interest = (principal * rate * months) / 100
    elif period == 'Yearly':
        years = days_passed / 365.25
        interest = (principal * rate * years) / 100
        
    return round(interest, 2)

def create_default_categories(user_id: int, cursor):
    defaults = [
        ("Salary", "#10B981", "income", "💰"),
        ("Freelance", "#3B82F6", "income", "💻"),
        ("Capital Gains", "#8b5cf6", "income", "📈"),
        ("Food & Dining", "#EF4444", "expense", "🍽"),
        ("Shopping", "#EC4899", "expense", "🛍️"),
        ("Bills & Utilities", "#6366F1", "expense", "💡"),
        ("Entertainment", "#8B5CF6", "expense", "🎬"),
        ("Health & Wellness", "#10B981", "expense", "🧘"),
        ("Education", "#3B82F6", "expense", "📚"),
        ("Finance", "#6366f1", "expense", "💰"),
        ("Groceries", "#6366f1", "expense", "🛒"),
        ("Travel & Transport", "#F97316", "expense", "✈️"),
        ("Rent & Housing", "#09D2EC", "expense", "🏠"),
    ]
    
    query = "INSERT INTO categories (user_id, name, color, type, icon, is_default) VALUES (%s, %s, %s, %s, %s, TRUE)"
    data = [(user_id, d[0], d[1], d[2], d[3]) for d in defaults]
    cursor.executemany(query, data)
    
def get_date_filter_sql(cursor, user_id: int, view_by: str, table_alias="t", date_column="date"):
    cursor.execute("SELECT month_start_date FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    
    start_date = 1
    if type(user) is dict:
         start_date = user.get('month_start_date', 1)
    elif type(user) is tuple:
         start_date = user[0]

    offset = int(start_date) - 1
    
    adjusted_db_date = f"DATE_SUB({table_alias}.{date_column}, INTERVAL {offset} DAY)"
    adjusted_now = f"DATE_SUB(NOW(), INTERVAL {offset} DAY)"
    
    if view_by == "day":
        return f"DATE({table_alias}.{date_column}) = CURDATE()"
    elif view_by == "week":
        return f"YEARWEEK({adjusted_db_date}, 1) = YEARWEEK({adjusted_now}, 1)"
    elif view_by == "year":
        return f"YEAR({adjusted_db_date}) = YEAR({adjusted_now})"
    else: 
        return f"DATE_FORMAT({adjusted_db_date}, '%Y-%m') = DATE_FORMAT({adjusted_now}, '%Y-%m')"
    
def is_country_allowed(mobile: str, cursor) -> bool:
    clean_mobile = mobile.lstrip('+')
    
    cursor.execute("SELECT country_code FROM allowed_countries WHERE status = 1")
    allowed_codes = [row['country_code'] for row in cursor.fetchall()]
    
    for code in allowed_codes:
        if clean_mobile.startswith(code):
            return True
            
    return False

def get_client_ip(request: Request) -> str:
    x_forwarded_for = request.headers.get("X-Forwarded-For")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"

def get_allowed_countries_from_db() -> set:
    now = time.time()
    if now - ALLOWED_COUNTRIES_CACHE["updated_at"] < ALLOWED_DB_CACHE_TTL and ALLOWED_COUNTRIES_CACHE["codes"]:
        return ALLOWED_COUNTRIES_CACHE["codes"]

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT country_code, country_name FROM allowed_countries WHERE status = 1")
        rows = cursor.fetchall()
        
        allowed_set = set()
        for row in rows:
            allowed_set.add(row['country_code'].lstrip('+'))
            allowed_set.add(row['country_name'].strip().lower())

        ALLOWED_COUNTRIES_CACHE["codes"] = allowed_set
        ALLOWED_COUNTRIES_CACHE["updated_at"] = now
        return allowed_set
    except Exception as e:
        logger.error(f"Failed to load allowed countries from DB: {e}")
        return ALLOWED_COUNTRIES_CACHE["codes"] or {"91", "india"}
    finally:
        conn.close()

async def fetch_geoip_data(ip: str) -> dict:
    if ip in ["127.0.0.1", "::1", "localhost"] or ip.startswith(("192.168.", "10.", "172.16.")):
        return {"country_name": "india", "calling_code": "91"}

    now = time.time()
    if ip in IP_GEO_CACHE:
        cached_data, cached_time = IP_GEO_CACHE[ip]
        if now - cached_time < IP_CACHE_TTL:
            return cached_data

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(f"https://ipwho.is/{ip}")
            data = response.json()
            
            if data.get("success"):
                result = {
                    "country_name": str(data.get("country", "")).strip().lower(),
                    "calling_code": str(data.get("calling_code", "")).lstrip("+")
                }
                IP_GEO_CACHE[ip] = (result, now)
                return result
    except Exception as e:
        logger.error(f"GeoIP API request failed for IP {ip}: {e}")
    return None