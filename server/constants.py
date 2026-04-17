DASHBOARD_URL = "https://www.sidenote.in/login"

# ==========================================
# META WHATSAPP TEMPLATE NAMES
# ==========================================
TEMPLATE_WELCOME = "sidenote_welcome_v1"
TEMPLATE_ENTRY_RECORDED = "entry_recorded_v1"
TEMPLATE_OVERVIEW = "sidenote_overview_v1_1"
TEMPLATE_WEEKLY = "weekly_overview_v1_1"
TEMPLATE_MONTHLY = "monthly_overview_v1"
TEMPLATE_INSIGHT = "weekly_insight_v1_1"
TEMPLATE_UNVERIFIED = "sidenote_verify_v1"

# ==========================================
# AUTOMATED NUDGE TEMPLATES
# ==========================================
TEMPLATE_HABIT = "habit_nudge_v1"
TEMPLATE_DAILY_NUDGE = "daily_nudge_v1"
TEMPLATE_STREAK_NUDGE = "streak_nudge_v1"
TEMPLATE_WEEKLY_NUDGE = "weekly_nudge_v1"
TEMPLATE_SOFT_NUDGE = "soft_nudge_v1"
TEMPLATE_REACTIVATION = "reactivation_v1"
TEMPLATE_INSIGHT_REACTIVATION = "insight_reactivation_v1"

# ==========================================
# BOT COMMAND KEYWORDS
# ==========================================
CMD_MENU = "menu"
CMD_UNDO = "undo"
CMD_SUMMARY = "summary"
CMD_WEEK = "week"
CMD_MONTH = "month"
CMD_TODAY = "today"
CMD_HELP = "help"
CMD_MORE = "more"

# ==========================================
# BUDGET SETTINGS
# ==========================================
CMD_SET_BUDGET = "budget"
BUDGET_THRESHOLD_WARNING = 0.80

# ==========================================
# TRANSACTION LOGIC KEYWORDS
# ==========================================
# If any of these words are in the text, it is marked as Income
INCOME_KEYWORDS = ['+', 'income', 'salary', 'received', 'profit', 'bonus', 'credit', 'reward']

# Fuzzy Category Map: Maps official DB Category Names to trigger words.
CATEGORY_MAP = {
    "Food & Dining": ["chai", "coffee", "tea", "swiggy", "zomato", "restaurant", "lunch", "dinner", "breakfast", "cafe", "pizza", "burger", "food", "meal", "snack", "dessert", "ice cream", "bakery", "sandwich", "biryani", "noodles", "pasta", "soup", "salad", "barbecue", "bbq", "steak", "seafood", "sushi", "taco", "burrito", "wrap"],
    "Transportation": ["uber", "ola", "rapido", "indrive", "drive", "auto", "petrol", "diesel", "cab", "taxi", "train", "flight", "bus", "metro", "toll", "parking", "fuel"],
    "Groceries": ["blinkit", "zepto", "instamart", "milk", "vegetables", "grocery", "ration", "fruits", "supermarket", "mart"],
    "Shopping": ["amazon", "flipkart", "myntra", "clothes", "shoes", "mall", "shopping", "apparel", "ajio", "meesho"],
    "Bills & Utilities": ["electricity", "water", "gas", "wifi", "internet", "recharge", "phone", "mobile", "bill", "subscription", "rent", "maintenance"],
    "Health & Fitness": ["gym", "medicine", "doctor", "pharmacy", "hospital", "clinic", "health", "workout", "medical", "therapy", "yoga", "supplements"],
    "Entertainment": ["movie", "cinema", "concert", "game", "party", "club", "event", "entertainment", "netflix", "spotify", "amazon prime", "hulu", "disney plus", "hotstar", "prime video", "hbo", "mx player", "fun", "leisure", "ott"]
}