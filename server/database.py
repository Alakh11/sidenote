# server/database.py
import mysql.connector
import os
from dotenv import load_dotenv
import logging

load_dotenv()
logger = logging.getLogger(__name__)

def get_db():
    try:
        return mysql.connector.connect(
            host=os.getenv("DB_HOST"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            port=os.getenv("DB_PORT"),
            database=os.getenv("DB_NAME"),
            ssl_verify_cert=False,
            ssl_verify_identity=False,
            ssl_ca="/etc/ssl/certs/ca-certificates.crt",
            ssl_disabled=False
        )
    except Exception as e:
        logger.error(f"DB Error: {e}")
        raise e