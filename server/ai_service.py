import os
import json
import logging
from typing import Any
import google.generativeai as genai # type: ignore
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY")) # type: ignore
logger = logging.getLogger("uvicorn")

def extract_receipt_data(image_bytes: bytes, mime_type: str) -> dict[str, Any] | None:
    """Passes an image to Gemini AI and returns a JSON dictionary of the expense."""
    try:
        model = genai.GenerativeModel('gemini-1.5-flash') # type: ignore
        prompt = (
            "Analyze this receipt. Find the final total amount and the name of the store/merchant. "
            "Return ONLY a raw, valid JSON object with two keys: 'amount' (a float) and 'item' (a string). "
            "Do not include markdown formatting or any other text."
        )
        
        response = model.generate_content([
            prompt,
            {"mime_type": mime_type, "data": image_bytes}
        ])
        
        clean_text = str(response.text).replace("```json", "").replace("```", "").strip()
        return dict(json.loads(clean_text))
        
    except Exception as e:
        logger.error(f"AI Receipt Parsing Error: {e}")
        return None