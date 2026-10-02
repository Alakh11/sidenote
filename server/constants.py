DASHBOARD_URL = "https://www.sidenote.in/login"

# ==========================================
# INTERACTIVE / PULL TEMPLATES (Triggered by user actions)
# ==========================================
TEMPLATE_WELCOME = "account_activation_v1"
TEMPLATE_ENTRY_RECORDED = "entry_recorded_v1"
TEMPLATE_OVERVIEW = "sidenote_overview_v1_1"
TEMPLATE_WEEKLY = "weekly_overview_v1_1"
TEMPLATE_MONTHLY = "monthly_overview_v1"
TEMPLATE_DATED_ENTRY_RECORDED = "dated_entry_recorded_v1"

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
CMD_STREAK = "streak"

# ==========================================
# BUDGET SETTINGS
# ==========================================
CMD_SET_BUDGET = "set budget"
CMD_SET_NAME = "set name"
CMD_SET_NICKNAME = "set nickname"
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

# --- WhatsApp Meta API Template Names ---
TEMPLATE_ENTRY_RECORDED = "entry_recorded_v1"
TEMPLATE_DATED_ENTRY_RECORDED = "dated_entry_recorded_v1"
TEMPLATE_OVERVIEW = "sidenote_overview_v1_1"
TEMPLATE_WEEKLY = "weekly_overview_v1_1"
TEMPLATE_MONTHLY = "monthly_overview_v1"
TEMPLATE_WELCOME = "account_activation_v1"
TEMPLATE_STREAK = "daily_streak_reminder"

# --- FREE MODE TEXT REPLICAS ---
# These act as exact textual fallbacks when Meta payment/template delivery fails
FREE_MODE_FALLBACKS = {
    # Expected variables: [amount, item, today_total]
    "entry_recorded_v1": (
        "Your note has been added in SideNote.\n\n"
        "An amount of ₹{0} has been noted for \"{1}\".\n\n"
        "This is included in today's notes.\n\n"
        "Your total for today is ₹{2} in SideNote."
    ),

    # Expected variables: [amount, item, formatted_date, today_total]
    "dated_entry_recorded_v1": (
        "Your note has been added in SideNote.\n\n"
        "An amount of ₹{0} has been noted for \"{1}\".\n\n"
        "This was logged for the date: {2}.\n\n"
        "Your total for this day is ₹{3} in SideNote."
    ),

    # Expected variables: [today_total, week_total, month_total, highest_item, highest_amount]
    "sidenote_overview_v1_1": (
        "Here is your current overview in SideNote.\n\n"
        "The total for today is ₹{0}.\n\n"
        "The total for this week so far is ₹{1}.\n\n"
        "The total for this month so far is ₹{2}.\n\n"
        "The highest note is \"{3}\" with ₹{4}.\n\n"
        "Your overview updates as new notes are added."
    ),

    # Expected variables: [week_total, mon, tue, wed, thu, fri, sat, sun]
    "weekly_overview_v1_1": (
        "Here is your weekly overview in SideNote.\n\n"
        "The total for this week is ₹{0}.\n\n"
        "Monday total is ₹{1}.\n"
        "Tuesday total is ₹{2}.\n"
        "Wednesday total is ₹{3}.\n"
        "Thursday total is ₹{4}.\n"
        "Friday total is ₹{5}.\n"
        "Saturday total is ₹{6}.\n"
        "Sunday total is ₹{7}.\n\n"
        "This reflects your notes up to today."
    ),

    # Expected variables: [month_total, week1, week2, week3, week4, week5, avg]
    "monthly_overview_v1": (
        "Here is your monthly overview in SideNote.\n\n"
        "The total for this month is ₹{0}.\n\n"
        "Week 1 total is ₹{1}.\n"
        "Week 2 total is ₹{2}.\n"
        "Week 3 total is ₹{3}.\n"
        "Week 4 total is ₹{4}.\n"
        "Week 5 total is ₹{5}.\n\n"
        "The average per day is ₹{6}.\n\n"
        "This reflects your notes up to today."
    ),

    # Expected variables: [] (No variables passed)
    "account_activation_v1": (
        "SideNote Account Confirmation\n"
        "Your WhatsApp profile is now successfully linked to your ledger.\n\n"
        "The system is active and ready to process standard entries (e.g., 200 chai, 450 uber). "
        "You can request your automated overview at any time by typing the system command: summary."
    ),

    # Expected variables: [user_name, streak]
    "daily_streak_reminder": (
        "Hi {0}! 🔥 You are currently on a {1}-day tracking streak! Log any expense today to keep your momentum going. 💪"
    ),

    # Expected variables: []
    "expense_search": (
        "Hey! 👋\n\n"
        "Looking for an old note?\n\n"
        "Just search for whatever you remember:\n\n"
        "search coffee → all your coffee notes\n"
        "search august → all your August notes\n"
        "search between 1 - 5 → all your notes between the 1st and 5th of this month\n"
        "search 10 august → all your notes from 10 August\n\n"
        "No scrolling through old messages. Just search and find it.\n\n"
        "Try it out and share it with that friend who forgets everything, even after noting it. 😄"
    ),

    # Expected variables: []
    "funny_reengagement": (
        "Ap kharcha karte fast ho...\n"
        "Yaad rakhte ho slow 🐢\n"
        "Balance karo, abhi note karo.\n\n"
        "Reply STOP to unsubscribe."
    ),

    # Expected variables: []
    "initial_no_activity_update": (
        "SideNote Status:\n\n"
        "No entries have been noted yet.\n\n"
        "Your ledger is currently empty."
    ),

    # Expected variables: []
    "account_status_update": (
        "SideNote Status:\n\n"
        "No recent entries have been noted.\n\n"
        "Your previous data remains unchanged."
    ),

    # Expected variables: [today_total]
    "daily_ledger_update": (
        "SideNote Daily Update:\n\n"
        "No entries were noted today.\n\n"
        "Your current total remains ₹{0} in total."
    ),

    # Expected variables: [week_total, top_category, top_category_amount]
    "weekly_insight_util": (
        "SideNote Weekly Summary:\n\n"
        "Total recorded this week is ₹{0}.\n\n"
        "The highest category is {1} with ₹{2}.\n\n"
        "This reflects your records up to now."
    ),
    
    # Expected variables: [user_name, case_id]
    "sidenote_account_ticket_v1": (
        "SideNote Account Alert\n"
        "Hi {0}, a request to link your web dashboard has been registered in our system.\n\n"
        "Your Case ID is: {1}\n\n"
        "This request will automatically time out in 10 minutes. If you did not initiate this, no further action is needed."
    )
}