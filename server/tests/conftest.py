import os
import sys
from pathlib import Path
from unittest.mock import MagicMock

# Tests cover pure logic; importing `database` would open a MySQL pool, so stub it out
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.modules.setdefault("database", MagicMock())

os.environ.setdefault("JWT_SECRET_KEY", "test-only-signing-key-not-for-production")
