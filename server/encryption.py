import os
import base64
import logging
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend

logger = logging.getLogger(__name__)

RAW_KEY = os.getenv("API_ENCRYPTION_KEY")

ENCRYPTION_KEY = RAW_KEY.encode('utf-8')[:32].ljust(32, b'0')

def encrypt_payload(data: str) -> str:
    """Encrypts a JSON string into a Base64 encoded AES-256 ciphertext."""
    iv = os.urandom(16)
    cipher = Cipher(algorithms.AES(ENCRYPTION_KEY), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    
    padder = padding.PKCS7(128).padder()
    padded_data = padder.update(data.encode('utf-8')) + padder.finalize()
    
    ciphertext = encryptor.update(padded_data) + encryptor.finalize()
    return base64.b64encode(iv + ciphertext).decode('utf-8')

def decrypt_payload(encrypted_b64: str) -> str:
    raw_data = base64.b64decode(encrypted_b64)
    if len(raw_data) < 16:
        raise ValueError("Invalid payload: payload is too short to contain IV.")

    iv = raw_data[:16]
    ciphertext = raw_data[16:]
    
    cipher = Cipher(algorithms.AES(ENCRYPTION_KEY), modes.CBC(iv), backend=default_backend())
    decryptor = cipher.decryptor()
    
    padded_data = decryptor.update(ciphertext) + decryptor.finalize()
    unpadder = padding.PKCS7(128).unpadder()
    data = unpadder.update(padded_data) + unpadder.finalize()
    
    return data.decode('utf-8')