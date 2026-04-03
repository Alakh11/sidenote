import os
import json
import logging
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("uvicorn")

def extract_receipt_data(file_bytes: bytes, mime_type: str) -> dict | None:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.error("AI Error: GEMINI_API_KEY is missing.")
        return None

    try:
        client = genai.Client(
            api_key=api_key, 
            http_options={'api_version': 'v1beta'}
        )
        
        prompt = (
            "Analyze this receipt/invoice. Extract 'amount' (float) and 'item' (string). "
            "Return ONLY raw JSON: {\"amount\": 0.0, \"item\": \"name\"}. "
            "No markdown, no backticks, no extra text."
        )
        
        response = client.models.generate_content(
            model='gemini-1.5-flash', 
            contents=[
                prompt,
                types.Part.from_bytes(data=file_bytes, mime_type=mime_type)
            ]
        )
        
        if not response or not response.text:
            logger.error("AI Error: Response text is empty.")
            return None

        clean_text = response.text.strip()
        
        if "```" in clean_text:
            clean_text = clean_text.split("```")[1]
            if clean_text.startswith("json"):
                clean_text = clean_text[4:].strip()
        
        clean_text = clean_text.replace("json", "").strip()
            
        return json.loads(clean_text)
        
    except Exception as e:
        logger.error(f"AI Receipt Parsing Error: {e}")
        return None