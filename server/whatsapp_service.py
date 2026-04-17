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
limits = httpx.Limits(max_keepalive_connections=20, max_connections=50)
timeout = httpx.Timeout(10.0, read=30.0)
http_client = httpx.AsyncClient(limits=limits, timeout=timeout)


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

    try:
        response = await http_client.post(WA_URL, json=payload, headers=headers)
        response.raise_for_status()
        logger.info(f"Template '{template_name}' sent to {to_number}")
        return {"status": "success"}
    except httpx.HTTPStatusError as e:
        logger.error(f"WhatsApp Template Error: {e.response.text}")
        return {"status": "error", "detail": e.response.text}
    except Exception as e:
        logger.error(f"WhatsApp Template Network Error: {repr(e)}")
        return {"status": "error", "detail": str(e)}


async def send_whatsapp_text(to_number: str, text_message: str):
    headers = {"Authorization": f"Bearer {WA_TOKEN}", "Content-Type": "application/json"}
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to_number,
        "type": "text",
        "text": {"body": text_message}
    }

    try:
        response = await http_client.post(WA_URL, json=payload, headers=headers)
        response.raise_for_status()
        return {"status": "success"}
    except httpx.HTTPStatusError as e:
        logger.error(f"WhatsApp Text Error: {e.response.text}")
        return {"status": "error"}
    except Exception as e:
        logger.error(f"WhatsApp Text Network Error: {repr(e)}")
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

    try:
        response = await http_client.post(WA_URL, json=payload, headers=headers)
        response.raise_for_status()
        logger.info(f"Standard text sent to {to_number}")
        return {"status": "success"}
    except httpx.HTTPStatusError as e:
        logger.error(f"WhatsApp Button Error: {e.response.text}")
        return {"status": "error"}
    except Exception as e:
        logger.error(f"WhatsApp Button Network Error: {repr(e)}")
        return {"status": "error"}


async def get_whatsapp_media_url(media_id: str) -> str | None:
    """Asks Meta for the secure download URL of a media file."""
    url = f"https://graph.facebook.com/v23.0/{media_id}"
    headers = {"Authorization": f"Bearer {WA_TOKEN}"}
    try:
        response = await http_client.get(url, headers=headers)
        response.raise_for_status()
        return str(response.json().get("url"))
    except Exception as e:
        logger.error(f"Failed to get Media URL: {e}")
        return None


async def download_whatsapp_media(media_url: str) -> bytes | None:
    headers = {"Authorization": f"Bearer {WA_TOKEN}"}
    try:
        response = await http_client.get(media_url, headers=headers)
        response.raise_for_status()
        return response.content
    except Exception as e:
        logger.error(f"Failed to download Media: {e}")
        return None