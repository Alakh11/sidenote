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
import secrets
import logging

logger = logging.getLogger(__name__)

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "fallback_super_secret_key_for_local_dev")
ALGORITHM = "HS256"
META_APP_SECRET = os.getenv("META_APP_SECRET")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def create_access_token(data: dict):
    to_encode = data.copy()
    to_encode.update({"exp": datetime.utcnow() + timedelta(hours=24)})
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
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
        user: Any = cursor.fetchone()
        
        if not user or user.get('role') not in ['admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Access Forbidden: Admins Only")
            
        return user_id
    finally:
        if conn:
            try:
                conn.close()
            except Exception as e:
                logger.error(f"Error closing connection in require_admin: {e}")
        
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


# --- Refresh tokens -----------------------------------------------------------------------------
# Access tokens stay short-lived (24h). Apps also get a long-lived refresh token, stored only as a
# SHA-256 hash and rotated on every use; presenting an already-rotated token revokes the user's
# whole token family, since it means a copy leaked.
REFRESH_TOKEN_DAYS = 60


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def issue_refresh_token(user_id: int) -> str:
    raw = secrets.token_urlsafe(48)
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (%s, %s, %s)",
            (user_id, _hash_token(raw), datetime.utcnow() + timedelta(days=REFRESH_TOKEN_DAYS)),
        )
        conn.commit()
    finally:
        conn.close()
    return raw


def rotate_refresh_token(raw: str) -> tuple[dict, str]:
    """Swaps a valid refresh token for a new one; returns (user, new refresh token)"""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, user_id, expires_at, revoked_at FROM refresh_tokens WHERE token_hash = %s FOR UPDATE",
            (_hash_token(raw),),
        )
        row: Any = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")
        if row["revoked_at"] is not None:
            cursor.execute("UPDATE refresh_tokens SET revoked_at = UTC_TIMESTAMP() WHERE user_id = %s AND revoked_at IS NULL", (row["user_id"],))
            conn.commit()
            raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")
        if row["expires_at"] < datetime.utcnow():
            raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")

        cursor.execute("SELECT id, name FROM users WHERE id = %s", (row["user_id"],))
        user: Any = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")

        new_raw = secrets.token_urlsafe(48)
        cursor.execute("UPDATE refresh_tokens SET revoked_at = UTC_TIMESTAMP() WHERE id = %s", (row["id"],))
        cursor.execute(
            "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (%s, %s, %s)",
            (row["user_id"], _hash_token(new_raw), datetime.utcnow() + timedelta(days=REFRESH_TOKEN_DAYS)),
        )
        conn.commit()
        return user, new_raw
    except HTTPException:
        conn.rollback()
        raise
    finally:
        conn.close()


def revoke_refresh_token(raw: str) -> None:
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE refresh_tokens SET revoked_at = UTC_TIMESTAMP() WHERE token_hash = %s AND revoked_at IS NULL", (_hash_token(raw),))
        conn.commit()
    finally:
        conn.close()

