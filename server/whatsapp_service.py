import httpx
import os
import logging
from dotenv import load_dotenv

load_dotenv()

# Config
WA_PHONE_ID = os.getenv("WA_PHONE_ID")
WA_TOKEN = os.getenv("WA_TOKEN")
WA_URL = f"https://graph.facebook.com/v18.0/{WA_PHONE_ID}/messages"

logger = logging.getLogger("uvicorn")

async def send_hello_world():
    """
    Sends a test 'hello_world' template message to the allowed test number.
    """
    headers = {
        "Authorization": f"Bearer {WA_TOKEN}",
        "Content-Type": "application/json",
    }

    # Payload for the standard test template
    payload = {
        "messaging_product": "whatsapp",
        "to": "919580813770",  # Your verified test number
        "type": "template",
        "template": {
            "name": "hello_world",
            "language": {
                "code": "en_US"
            }
        }
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(WA_URL, json=payload, headers=headers)
            response.raise_for_status()
            logger.info(f"WhatsApp Sent: {response.json()}")
            return {"status": "success", "data": response.json()}
        except httpx.HTTPStatusError as e:
            logger.error(f"WhatsApp Error: {e.response.text}")
            return {"status": "error", "detail": e.response.text}