DASHBOARD_URL = "https://sidenote.hex8.in/login"

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
# BOT COMMAND KEYWORDS
# ==========================================
CMD_MENU = "menu"
CMD_UNDO = "undo"
CMD_SUMMARY = "summary"
CMD_WEEK = "week"
CMD_MONTH = "month"

# ==========================================
# BUDGET SETTINGS
# ==========================================
CMD_SET_BUDGET = "budget"
BUDGET_THRESHOLD_WARNING = 0.80

# ==========================================
# TRANSACTION LOGIC KEYWORDS
# ==========================================
# If any of these words are in the text, it is marked as Income
INCOME_KEYWORDS = ['+', 'income', 'salary', 'received', 'profit', 'bonus']

# Fuzzy Category Map: Maps official DB Category Names to trigger words.
CATEGORY_MAP = {
    "Food & Dining": ["chai", "coffee", "tea", "swiggy", "zomato", "restaurant", "lunch", "dinner", "breakfast", "cafe", "pizza", "burger", "food"],
    "Transportation": ["uber", "ola", "auto", "petrol", "diesel", "cab", "taxi", "train", "flight", "bus", "metro", "toll", "parking"],
    "Groceries": ["blinkit", "zepto", "instamart", "milk", "vegetables", "grocery", "ration", "fruits", "supermarket"],
    "Shopping": ["amazon", "flipkart", "myntra", "clothes", "shoes", "mall", "shopping", "apparel"],
    "Bills & Utilities": ["electricity", "water", "gas", "wifi", "internet", "recharge", "phone", "mobile", "bill", "subscription", "netflix", "spotify"],
    "Health & Fitness": ["gym", "medicine", "doctor", "pharmacy", "hospital", "clinic", "health", "workout"],
    "Entertainment": ["movie", "cinema", "concert", "game", "party", "club", "event"],
}