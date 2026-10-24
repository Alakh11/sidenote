import hashlib
import json
import random
from typing import Any, Optional
from fastapi import HTTPException
from fastapi.encoders import jsonable_encoder

KEY_TTL_HOURS = 48


def _key_hash(user_id: int, endpoint: str, key: str) -> str:
    return hashlib.sha256(f"{user_id}:{endpoint}:{key}".encode()).hexdigest()


def claim_idempotency_key(cursor, user_id: int, endpoint: str, key: Optional[str]) -> Optional[Any]:
    """Returns the earlier response if this key was already used, otherwise None (go ahead)"""
    if not key:
        return None
    if len(key) > 128:
        raise HTTPException(status_code=400, detail="Idempotency-Key is too long.")
    if random.random() < 0.01:
        cursor.execute("DELETE FROM idempotency_keys WHERE created_at < NOW() - INTERVAL %s HOUR", (KEY_TTL_HOURS,))
    key_hash = _key_hash(user_id, endpoint, key)
    cursor.execute(
        "INSERT IGNORE INTO idempotency_keys (key_hash, user_id, endpoint) VALUES (%s, %s, %s)",
        (key_hash, user_id, endpoint),
    )
    if cursor.rowcount == 1:
        return None
    cursor.execute("SELECT response FROM idempotency_keys WHERE key_hash = %s", (key_hash,))
    row = cursor.fetchone()
    response = row["response"] if isinstance(row, dict) else (row[0] if row else None)
    if response is None:
        raise HTTPException(status_code=409, detail="This request is already being processed.")
    return json.loads(response) if isinstance(response, (str, bytes, bytearray)) else response


def save_idempotent_response(cursor, user_id: int, endpoint: str, key: Optional[str], response: Any) -> Any:
    if key:
        cursor.execute(
            "UPDATE idempotency_keys SET response = %s WHERE key_hash = %s",
            (json.dumps(jsonable_encoder(response)), _key_hash(user_id, endpoint, key)),
        )
    return response
