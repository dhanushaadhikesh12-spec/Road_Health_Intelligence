"""
main.py — FastAPI application entry point for RoadGuard AI backend.
"""
import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import auth, defects, observations, seed
from app.api.auth import init_demo_users
from app.config import CORS_ORIGINS, DEBUG, UPLOAD_DIR
from app.database import init_db, SessionLocal
from app.api.seed import seed_demo_data

logging.basicConfig(
    level=logging.DEBUG if DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("roadguard")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure upload directory exists and init DB
    logger.info("Initializing database schema...")
    init_db()
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    # Auto-seed demo defects & demo user accounts
    try:
        db = SessionLocal()
        init_demo_users(db)
        seed_demo_data(db)
        db.close()
        logger.info("Database check & auth demo users initialized.")
    except Exception as e:
        logger.warning(f"Auto-seed check: {e}")

    yield

    logger.info("Shutting down RoadGuard AI backend...")


app = FastAPI(
    title="RoadGuard AI — Road Health Intelligence Backend",
    version="1.0.0",
    description="Automated road defect detection, geospatial deduplication, and priority scoring.",
    lifespan=lifespan,
)

# CORS configuration
origins = CORS_ORIGINS if CORS_ORIGINS else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for hackathon local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploads
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Include Routers under /api and also root for flexibility
app.include_router(auth.router, prefix="/api")
app.include_router(observations.router, prefix="/api")
app.include_router(defects.router, prefix="/api")
app.include_router(seed.router, prefix="/api")

# Also include directly at root to guarantee backward compatibility
app.include_router(auth.router)
app.include_router(observations.router)
app.include_router(defects.router)
app.include_router(seed.router)

# Aliases for citizen and dashboard endpoints matching Section 109 specs
app.add_api_route("/api/reports", observations.create_observation_endpoint, methods=["POST"], include_in_schema=False)
app.add_api_route("/reports", observations.create_observation_endpoint, methods=["POST"], include_in_schema=False)
app.add_api_route("/api/my-reports", observations.my_observations, methods=["GET"], include_in_schema=False)
app.add_api_route("/my-reports", observations.my_observations, methods=["GET"], include_in_schema=False)
app.add_api_route("/api/dashboard/stats", defects.get_dashboard_stats, methods=["GET"], include_in_schema=False)
app.add_api_route("/dashboard/stats", defects.get_dashboard_stats, methods=["GET"], include_in_schema=False)


@app.get("/", tags=["health"])
@app.get("/health", tags=["health"])
@app.get("/api/health", tags=["health"])
def health_check():
    return {
        "status": "healthy",
        "service": "RoadGuard AI Backend",
        "version": "1.0.0",
    }
