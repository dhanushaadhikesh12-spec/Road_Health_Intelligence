"""
database.py — SQLAlchemy engine and session factory.
Uses SQLite for zero-setup MVP; swap DATABASE_URL for PostgreSQL in production.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.config import DATABASE_URL

# connect_args is SQLite-specific; harmless to remove for Postgres
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency: yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables. Called once at startup."""
    import app.models.db_models  # noqa: F401 — registers models with Base
    Base.metadata.create_all(bind=engine)
