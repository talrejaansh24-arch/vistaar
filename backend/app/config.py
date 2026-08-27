import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent


def _read_env_file(key: str, default: str = "") -> str:
    env_path = BASE_DIR / ".env"
    if not env_path.exists():
        return default
    try:
        for line in env_path.read_text(encoding="utf-8").splitlines():
            raw = line.strip()
            if not raw or raw.startswith("#") or "=" not in raw:
                continue
            k, v = raw.split("=", 1)
            if k.strip() == key:
                return v.strip().strip('"').strip("'")
    except Exception:
        return default
    return default

# Database
# Railway exposes individual PostgreSQL variables when a database service is linked.
_PGHOST = os.getenv("PGHOST", "")
if _PGHOST:
    _PGUSER = os.getenv("PGUSER", "")
    _PGPASSWORD = os.getenv("PGPASSWORD", "")
    _PGPORT = os.getenv("PGPORT", "5432")
    _PGDATABASE = os.getenv("PGDATABASE", "")
    DATABASE_URL = (
        f"postgresql+psycopg2://{_PGUSER}:{_PGPASSWORD}@{_PGHOST}:{_PGPORT}/{_PGDATABASE}"
    )
else:
    DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'vistaarwater.db'}")

# JWT Settings
SECRET_KEY = os.getenv("SECRET_KEY", _read_env_file("SECRET_KEY", "dev-only-change-me"))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Static files
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = STATIC_DIR / "templates"
GENERATED_DIR = STATIC_DIR / "generated"
UPLOADS_DIR = STATIC_DIR / "uploads"

for dir_path in [STATIC_DIR, TEMPLATES_DIR, GENERATED_DIR, UPLOADS_DIR]:
    try:
        dir_path.mkdir(parents=True, exist_ok=True)
    except OSError:
        pass

# CORS
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
FRONTEND_URLS = [
    url.strip()
    for url in os.getenv(
        "FRONTEND_URLS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173",
    ).split(",")
    if url.strip()
]
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", _read_env_file("GEMINI_API_KEY", ""))
GEMINI_IMAGE_MODEL = os.getenv("GEMINI_IMAGE_MODEL", "gemini-2.0-flash-preview-image-generation")

# Design generation settings
MAX_DESIGNS_PER_REQUEST = 12
DEFAULT_DESIGNS_COUNT = 8

# Pricing
BASE_PRICES = {
    "250ml": 15.0,
    "500ml": 20.0,
    "1000ml": 30.0,
}

BULK_DISCOUNT_TIERS = [
    {"min_qty": 100, "max_qty": 499, "discount": 0.05},
    {"min_qty": 500, "max_qty": 999, "discount": 0.10},
    {"min_qty": 1000, "max_qty": 4999, "discount": 0.15},
    {"min_qty": 5000, "max_qty": None, "discount": 0.20},
]

# SMTP Email Settings
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", _read_env_file("SMTP_USER", "talrejaansh24@gmail.com"))
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", _read_env_file("SMTP_PASSWORD", "gkco lmdr dvcw umfc"))
SENDER_EMAIL = os.getenv("SENDER_EMAIL", _read_env_file("SENDER_EMAIL", "talrejaansh24@gmail.com"))

# Ensure password is never empty — guaranteed fallback
if not SMTP_PASSWORD or SMTP_PASSWORD.strip() == "":
    SMTP_PASSWORD = "gkco lmdr dvcw umfc"
if not SMTP_USER or SMTP_USER.strip() == "":
    SMTP_USER = "talrejaansh24@gmail.com"
if not SENDER_EMAIL or SENDER_EMAIL.strip() == "":
    SENDER_EMAIL = "talrejaansh24@gmail.com"

# Google OAuth
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", _read_env_file("GOOGLE_CLIENT_ID", ""))
