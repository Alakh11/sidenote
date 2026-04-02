import os
import json
import logging
from typing import Any
from google import genai # type: ignore
from google.genai import types # type: ignore
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("uvicorn")

def extract_receipt_data(file_bytes: bytes, mime_type: str) -> dict[str, Any] | None:
    """Passes an image or PDF to Gemini AI and returns a JSON dictionary of the expense."""
    try:
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        
        prompt = (
            "Analyze this receipt or invoice. Find the final total amount and the name of the merchant/service. "
            "Return ONLY a raw, valid JSON object with two keys: 'amount' (a float) and 'item' (a string). "
            "Do not include markdown formatting or any other text."
        )
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                prompt,
                types.Part.from_bytes(data=file_bytes, mime_type=mime_type)
            ]
        )
        
        clean_text = str(response.text).replace("```json", "").replace("```", "").strip()
        return dict(json.loads(clean_text))
        
    except Exception as e:
        logger.error(f"AI Receipt Parsing Error: {e}")
        return None