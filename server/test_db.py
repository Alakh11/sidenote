# server/test_db.py
from database import get_db_connection

conn = get_db_connection()

if conn and conn.is_connected():
    print("✅ SUCCESS: Connected to TiDB!")
    conn.close()
else:
    print("❌ FAILED: Could not connect.")