# server/test_db.py
from database import get_db

conn = get_db()

if conn and conn.is_connected():
    print("✅ SUCCESS: Connected to TiDB!")
    conn.close()
else:
    print("❌ FAILED: Could not connect.")