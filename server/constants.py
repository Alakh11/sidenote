DASHBOARD_URL = "https://www.sidenote.in/login"

# ==========================================
# INTERACTIVE / PULL TEMPLATES (Triggered by user actions)
# ==========================================
TEMPLATE_WELCOME = "account_activation_v1"
TEMPLATE_ENTRY_RECORDED = "entry_recorded_v1"
TEMPLATE_OVERVIEW = "sidenote_overview_v1_1"
TEMPLATE_WEEKLY = "weekly_overview_v1_1"
TEMPLATE_MONTHLY = "monthly_overview_v1"

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
INCOME_KEYWORDS = [
    '+', 'income', 'salary', 'received', 'profit', 'bonus', 'credit', 
    'reward', 'sold', 'cashback', 'refund', 'freelance'
]

# Fuzzy Category Map: Maps official DB Category Names to trigger words.
CATEGORY_MAP = {
    'Food & Dining': [
        'food', 'lunch', 'dinner', 'breakfast', 'snacks', 'restaurant', 'cafe', 
        'coffee', 'chai', 'tea', 'swiggy', 'zomato', 'pizza', 'burger', 'momos', 
        'bakery', 'sandwich', 'biryani', 'noodles', 'pasta', 'soup', 'salad'
    ],
    'Groceries': [
    'blinkit', 'zepto', 'instamart', 'milk', 'vegetables', 'grocery',
    'ration', 'fruits', 'supermarket', 'mart', 'grocer', 'shop', 'market',
    'store', 'bazar', 'bazaar',
    'Amazon Pantry', 'BigBasket', 'Grofers', 'Nature Basket', 'Spencers',
    'More', 'Easyday', 'Reliance Fresh', 'D-Mart', 'Foodhall', 'HyperCity',
    'Vishal Mega Mart', 'Spar', 'Star Bazaar', 'Metro Cash & Carry', '24Seven',
    'AaramShop', 'Gully', 'ZopNow', 'Supermart', 'Farmizen', 'Natures Supermarket',
    'Amazon Now', 'JioMart', 'Paytm Mall', 'ShopClues', 'Licious', 'FreshToHome',
    'Meatigo', 'Udaan', 'Flipkart Minute', 'Dunzo', 'Zomato Market',
    'Swiggy Instamart'
    ],
    'Travel & Transport': [
        'uber', 'ola', 'rapido', 'indrive', 'auto', 'cab', 'taxi', 'metro', 
        'bus', 'train', 'flight', 'petrol', 'diesel', 'fuel', 'toll', 'parking'
    ],
    'Shopping': [
        'amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'clothes', 'shoes', 
        'electronics', 'shopping', 'mall', 'store', 'apparel'
    ],
    'Bills & Utilities': [
        'electricity', 'water', 'gas', 'internet', 'wifi', 'recharge', 
        'mobile', 'phone', 'bill', 'dth', 'maintenance', 'subscription'
    ],
    'Entertainment': [
        'movie', 'cinema', 'netflix', 'amazon prime', 'spotify', 'games', 
        'concert', 'club', 'party', 'event', 'hulu', 'hotstar', 'ott', 'fun'
    ],
    'Health & Wellness': [
        'pharmacy', 'medicine', 'doctor', 'hospital', 'clinic', 'gym', 
        'fitness', 'salon', 'haircut', 'medical', 'therapy', 'yoga'
    ],
    'Finance': [
        'investment', 'stocks', 'mutual fund', 'emi', 'loan', 'insurance', 
        'tax', 'bank fee'
    ],
    'Rent & Housing': [
        'rent', 'brokerage', 'deposit', 'furniture', 'home decor'
    ],
    'Education': [
        'course', 'books', 'tuition', 'school fee', 'college fee', 'stationery'
    ]
}