from datetime import datetime, date, timedelta

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