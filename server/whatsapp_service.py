import httpx
import os
import logging
from dotenv import load_dotenv

load_dotenv()

WA_PHONE_ID = os.getenv("WA_PHONE_ID")
WA_TOKEN = os.getenv("WA_TOKEN")
WA_URL = f"https://graph.facebook.com/v18.0/{WA_PHONE_ID}/messages"

logger = logging.getLogger("uvicorn")

async def send_whatsapp_template(to_number: str, template_name: str, variables: list[str]):
    headers = {
        "Authorization": f"Bearer {WA_TOKEN}",
        "Content-Type": "application/json",
    }

    # Format variables for Meta's API
    parameters = [{"type": "text", "text": str(var)} for var in variables]

    payload = {
        "messaging_product": "whatsapp",
        "to": to_number,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {
                "code": "en_US" 
            },
            "components": [
                {
                    "type": "body",
                    "parameters": parameters
                }
            ] if parameters else []
        }
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(WA_URL, json=payload, headers=headers)
            response.raise_for_status()
            logger.info(f"Template '{template_name}' sent to {to_number}")
            return {"status": "success"}
        except httpx.HTTPStatusError as e:
            logger.error(f"WhatsApp Template Error: {e.response.text}")
            return {"status": "error", "detail": e.response.text}