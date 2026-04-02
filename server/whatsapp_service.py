import httpx
import os
import logging
from typing import Any
from dotenv import load_dotenv

load_dotenv()

WA_PHONE_ID = os.getenv("WA_PHONE_ID")
WA_TOKEN = os.getenv("WA_TOKEN")
WA_URL = f"https://graph.facebook.com/v23.0/{WA_PHONE_ID}/messages"

logger = logging.getLogger("uvicorn")

async def send_whatsapp_template(to_number: str, template_name: str, variables: list[str]):
    headers = {"Authorization": f"Bearer {WA_TOKEN}", "Content-Type": "application/json"}
    parameters = [{"type": "text", "text": str(var)} for var in variables]
    template_data: dict[str, Any] = {"name": template_name, "language": {"code": "en_US"}}
    
    if parameters:
        template_data["components"] = [{"type": "body", "parameters": parameters}]

    payload = {
        "messaging_product": "whatsapp",
        "to": to_number,
        "type": "template",
        "template": template_data
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

async def send_whatsapp_text(to_number: str, text_message: str):
    headers = {"Authorization": f"Bearer {WA_TOKEN}", "Content-Type": "application/json"}
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to_number,
        "type": "text",
        "text": {"body": text_message}
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(WA_URL, json=payload, headers=headers)
            response.raise_for_status()
            return {"status": "success"}
        except httpx.HTTPStatusError as e:
            logger.error(f"WhatsApp Text Error: {e.response.text}")
            return {"status": "error"}

async def send_whatsapp_interactive_buttons(to_number: str, body_text: str, buttons: list[dict[str, str]]):
    """Sends a message with up to 3 clickable buttons."""
    headers = {"Authorization": f"Bearer {WA_TOKEN}", "Content-Type": "application/json"}
    
    action_buttons = [
        {
            "type": "reply",
            "reply": {"id": btn["id"], "title": btn["title"]}
        } for btn in buttons
    ]

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to_number,
        "type": "interactive",
        "interactive": {
            "type": "button",
            "body": {"text": body_text},
            "action": {"buttons": action_buttons}
        }
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(WA_URL, json=payload, headers=headers)
            response.raise_for_status()
            logger.info(f"Standard text sent to {to_number}")
            return {"status": "success"}
        except httpx.HTTPStatusError as e:
            logger.error(f"WhatsApp Button Error: {e.response.text}")
            return {"status": "error"}