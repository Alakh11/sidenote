from fastapi import Depends, HTTPException, status, Request, Header
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import Optional, Any
from database import get_db
import os
import hmac
import hashlib
import logging

logger = logging.getLogger(__name__)

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "fallback_super_secret_key_for_local_dev")
ALGORITHM = "HS256"
META_APP_SECRET = os.getenv("META_APP_SECRET")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def create_access_token(data: dict):
    to_encode = data.copy()
    to_encode.update({"exp": datetime.utcnow() + timedelta(days=7)})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: Optional[str] = str(payload.get("sub")) 
        if not user_id_str:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        return int(user_id_str)
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

def require_admin(user_id: int = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
        user: Any = cursor.fetchone()
        
        if not user or user.get('role') not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Access Forbidden: Admins Only")
            
        return user_id
    finally:
        conn.close()
        
async def verify_meta_signature(request: Request, x_hub_signature_256: str = Header(None)):
    """Verifies the HMAC SHA-256 signature sent by Meta to ensure the request is genuine."""
    if not META_APP_SECRET:
        logger.error("META_APP_SECRET is not set in environment variables.")
        raise HTTPException(status_code=500, detail="Server misconfiguration")

    if not x_hub_signature_256 or not x_hub_signature_256.startswith("sha256="):
        raise HTTPException(status_code=401, detail="Invalid or missing signature")

    received_signature = x_hub_signature_256.split("sha256=")[1]
    body = await request.body()

    expected_signature = hmac.new(
        key=META_APP_SECRET.encode("utf-8"),
        msg=body,
        digestmod=hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, received_signature):
        raise HTTPException(status_code=401, detail="Invalid signature")
        
    return True