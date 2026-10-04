"""
config.py — Application configuration from .env
"""
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./roadguard.db")
UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
AI_MODEL_PATH: str = os.getenv("AI_MODEL_PATH", "")
DUPLICATE_RADIUS_METERS: float = float(os.getenv("DUPLICATE_RADIUS_METERS", "25"))

# Parse CORS origins
_cors_raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
CORS_ORIGINS: list[str] = [o.strip() for o in _cors_raw.split(",") if o.strip()]

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)
