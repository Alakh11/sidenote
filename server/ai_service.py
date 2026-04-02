import os
import json
import logging
from typing import Any
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("uvicorn")

def extract_receipt_data(file_bytes: bytes, mime_type: str) -> dict[str, Any] | None:
    """Passes an image or PDF to Gemini AI and returns a JSON dictionary of the expense."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.error("AI Error: GEMINI_API_KEY is missing.")
        return None

    try:
        client = genai.Client(
            api_key=api_key,
            http_options={'api_version': 'v1'}
        )
        
        prompt = (
            "Analyze this receipt or invoice. Find the final total amount and the name of the merchant/service. "
            "Return ONLY a raw, valid JSON object with two keys: 'amount' (a float) and 'item' (a string). "
            "Do not include any markdown formatting, backticks, or extra text."
        )
        
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=[
                prompt,
                types.Part.from_bytes(data=file_bytes, mime_type=mime_type)
            ]
        )
        
        if not response or not response.text:
            logger.error("AI Error: Empty response text.")
            return None

        clean_text = response.text.strip()
        if "```" in clean_text:
            clean_text = clean_text.split("```")[1]
            if clean_text.startswith("json"):
                clean_text = clean_text[4:].strip()

        return dict(json.loads(clean_text))
        
    except Exception as e:
        logger.error(f"AI Receipt Parsing Error: {e}")
        return None