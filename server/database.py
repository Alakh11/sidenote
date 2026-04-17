# server/database.py
import mysql.connector
from mysql.connector import pooling
import os
from dotenv import load_dotenv
import logging

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

db_config = {
    "host": os.getenv("DB_HOST"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "port": int(os.getenv("DB_PORT", 3306)),
    "database": os.getenv("DB_NAME"),
    "ssl_verify_cert": False,
    "ssl_verify_identity": False,
    "ssl_ca": "/etc/ssl/certs/ca-certificates.crt",
    "ssl_disabled": False
}

try:
    connection_pool = mysql.connector.pooling.MySQLConnectionPool(
        pool_name="sidenote_pool",
        pool_size=20,
        pool_reset_session=True,
        **db_config
    )
    logger.info("Database connection pool created successfully.")
except Exception as e:
    logger.error(f"Failed to create database connection pool: {e}")
    raise e

def get_db():
    try:
        return connection_pool.get_connection()
    except Exception as e:
        logger.error(f"DB Pool Exhaustion Error: {e}")
        raise e