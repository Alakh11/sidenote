import httpx
import os
import logging
import asyncio
from typing import Any, Optional
from dotenv import load_dotenv

load_dotenv()

WA_PHONE_ID = os.getenv("WA_PHONE_ID")
WA_TOKEN = os.getenv("WA_TOKEN")
WA_URL = f"https://graph.facebook.com/v23.0/{WA_PHONE_ID}/messages"

logger = logging.getLogger("uvicorn")
limits = httpx.Limits(max_keepalive_connections=20, max_connections=50)
timeout = httpx.Timeout(10.0, read=30.0)
transport = httpx.AsyncHTTPTransport(retries=3)

http_client = httpx.AsyncClient(
    transport=transport,
    limits=limits, 
    timeout=timeout
)
outbound_semaphore = asyncio.Semaphore(10)

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

    async with outbound_semaphore:
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

    async with outbound_semaphore:
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

    async with outbound_semaphore:
        try:
            response = await http_client.post(WA_URL, json=payload, headers=headers)
            response.raise_for_status()
            logger.info(f"Interactive buttons sent to {to_number}")
            return {"status": "success"}
        except httpx.HTTPStatusError as e:
            logger.error(f"WhatsApp Button Error: {e.response.text}")
            return {"status": "error"}
        except Exception as e:
            logger.error(f"WhatsApp Button Network Error: {repr(e)}")
            return {"status": "error"}


async def send_whatsapp_media(
    to_number: str, 
    media_type: str, 
    media_link: Optional[str] = None, 
    media_id: Optional[str] = None, 
    caption: Optional[str] = None,
    filename: Optional[str] = None
):
    """
    Sends media (image, audio, video, document, sticker) to a user.
    Provide either a public 'media_link' OR a Meta-hosted 'media_id'.
    """
    if not media_link and not media_id:
        logger.error("Failed to send media: Must provide either media_link or media_id")
        return {"status": "error", "detail": "Missing media source"}

    valid_types = ["image", "audio", "video", "document", "sticker"]
    if media_type not in valid_types:
        logger.error(f"Invalid media type: {media_type}")
        return {"status": "error", "detail": f"Type must be one of {valid_types}"}

    headers = {"Authorization": f"Bearer {WA_TOKEN}", "Content-Type": "application/json"}
    
    media_object: dict[str, Any] = {}
    if media_link:
        media_object["link"] = media_link
    else:
        media_object["id"] = media_id

    if caption and media_type in ["image", "video", "document"]:
        media_object["caption"] = caption
        
    if filename and media_type == "document":
        media_object["filename"] = filename

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to_number,
        "type": media_type,
        media_type: media_object
    }

    async with outbound_semaphore:
        try:
            response = await http_client.post(WA_URL, json=payload, headers=headers)
            response.raise_for_status()
            logger.info(f"Media ({media_type}) sent to {to_number}")
            return {"status": "success"}
        except httpx.HTTPStatusError as e:
            logger.error(f"WhatsApp Media Error ({media_type}): {e.response.text}")
            return {"status": "error", "detail": e.response.text}
        except Exception as e:
            logger.error(f"WhatsApp Media Network Error ({media_type}): {repr(e)}")
            return {"status": "error", "detail": str(e)}


async def get_whatsapp_media_url(media_id: str) -> str | None:
    """Asks Meta for the secure download URL of a media file."""
    url = f"https://graph.facebook.com/v23.0/{media_id}"
    headers = {"Authorization": f"Bearer {WA_TOKEN}"}
    
    async with outbound_semaphore:
        try:
            response = await http_client.get(url, headers=headers)
            response.raise_for_status()
            return str(response.json().get("url"))
        except Exception as e:
            logger.error(f"Failed to get Media URL: {e}")
            return None


async def download_whatsapp_media(media_url: str) -> bytes | None:
    headers = {"Authorization": f"Bearer {WA_TOKEN}"}
    
    async with outbound_semaphore:
        try:
            response = await http_client.get(media_url, headers=headers)
            response.raise_for_status()
            return response.content
        except Exception as e:
            logger.error(f"Failed to download Media: {e}")
            return None