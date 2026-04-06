import os
import logging
from posthog import Posthog

logger = logging.getLogger(__name__)

# Initialize PostHog once here
posthog_client = Posthog(
    os.getenv("POSTHOG_API_KEY", "your_key"), 
    host='https://app.posthog.com'
)

def track_event(user_id: int | str, event: str, properties: dict = None): # type: ignore
    """Safely tracks events so API failures don't crash the app."""
    if not properties:
        properties = {}
    try:
        # We convert user_id to string because PostHog expects string IDs
        posthog_client.capture(
            distinct_id=str(user_id), 
            event=event, 
            properties=properties
        )
    except Exception as e:
        logger.error(f"PostHog Tracking Error: {e}")

def link_web_and_whatsapp(phone: str, user_id: int):
    """Stitches the hashed phone number to the Web DB User ID"""
    try:
        import hashlib
        hashed_phone = hashlib.sha256(phone.encode()).hexdigest()
        posthog_client.alias(
            previous_id=hashed_phone,
            distinct_id=str(user_id)
        )
    except Exception as e:
        logger.error(f"PostHog Alias Error: {e}")