from fastapi import APIRouter
import json
import logging
import os

logger = logging.getLogger(__name__)
router = APIRouter(tags=["App Config"])


@router.get("/app/config")
def get_app_config():
    """Remote switches for app features, so a risky change can be turned off without a new build.
    Set FEATURE_FLAGS to JSON, e.g. {"chatVoice": false}; unknown or missing flags use the app's defaults."""
    try:
        flags = json.loads(os.getenv("FEATURE_FLAGS") or "{}")
    except ValueError:
        logger.error("FEATURE_FLAGS is not valid JSON; ignoring it")
        flags = {}
    return {"flags": {k: bool(v) for k, v in flags.items()} if isinstance(flags, dict) else {}}
