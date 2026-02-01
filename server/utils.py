from datetime import datetime, date

def calculate_interest(principal, rate, period, start_date_str):
    if not rate or rate == 0:
        return 0.0
    
    start_date = datetime.strptime(str(start_date_str), "%Y-%m-%d").date()
    today = date.today()
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

def create_default_categories(email: str, cursor):
    defaults = [
        # Income
        ("Salary", "#10B981", "income", "💰"),
        ("Freelance", "#3B82F6", "income", "💻"),
        ("Investments", "#8B5CF6", "income", "📈"),
        # Expenses
        ("Food & Dining", "#EF4444", "expense", "🍔"),
        ("Transportation", "#F59E0B", "expense", "🚗"),
        ("Shopping", "#EC4899", "expense", "🛍️"),
        ("Utilities", "#6366F1", "expense", "💡"),
        ("Entertainment", "#8B5CF6", "expense", "🎬"),
        ("Health", "#10B981", "expense", "💊"),
        ("Education", "#3B82F6", "expense", "🎓"),
        ("Travel", "#F97316", "expense", "✈️"),
        ("Rent/Housing", "#6366F1", "expense", "🏠"),
    ]
    
    query = "INSERT INTO categories (user_email, name, color, type, icon, is_default) VALUES (%s, %s, %s, %s, %s, TRUE)"
    data = [(email, d[0], d[1], d[2], d[3]) for d in defaults]
    cursor.executemany(query, data)
