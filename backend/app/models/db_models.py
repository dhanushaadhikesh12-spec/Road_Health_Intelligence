"""
db_models.py — SQLAlchemy ORM models.

Two core entities:
  CanonicalDefect  — one persistent record per physical road defect
  Observation      — one evidence capture; many per CanonicalDefect

Observations are immutable once created.
Defect location, priority, and status are auto-derived.
"""
import json
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CanonicalDefect(Base):
    __tablename__ = "canonical_defects"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    defect_type: Mapped[str] = mapped_column(String(20), nullable=False)

    # Centroid — auto-computed as mean of observations
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="CANDIDATE")

    # Priority
    priority_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    priority_breakdown_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    priority_computed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Timestamps
    first_detected: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    last_updated: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    # Repair fields
    before_image_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    after_image_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    verification_status: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    assigned_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    repair_started: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    repair_completed: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    observations: Mapped[list["Observation"]] = relationship(
        "Observation", back_populates="defect", order_by="Observation.timestamp"
    )

    @property
    def priority_breakdown(self) -> Optional[dict]:
        if self.priority_breakdown_json:
            return json.loads(self.priority_breakdown_json)
        return None

    @priority_breakdown.setter
    def priority_breakdown(self, value: Optional[dict]):
        self.priority_breakdown_json = json.dumps(value) if value else None

    @property
    def observation_count(self) -> int:
        return len(self.observations)


class Observation(Base):
    __tablename__ = "observations"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    defect_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("canonical_defects.id"), nullable=False, index=True
    )

    # Image
    image_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # AI / classification
    defect_type: Mapped[str] = mapped_column(String(20), nullable=False)
    severity: Mapped[str] = mapped_column(String(10), nullable=False)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    classification_source: Mapped[str] = mapped_column(String(10), nullable=False, default="MODEL")

    # Location
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    accuracy_meters: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    location_source: Mapped[str] = mapped_column(String(10), nullable=False, default="DEVICE")

    # Duplicate analysis result
    duplicate_decision: Mapped[str] = mapped_column(String(10), nullable=False, default="DISTINCT")
    duplicate_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    duplicate_distance_meters: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Motion / sensor
    motion_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Description from reporter
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Reporter
    reporter_id: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)

    # Timestamps
    timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    defect: Mapped["CanonicalDefect"] = relationship("CanonicalDefect", back_populates="observations")


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="CITIZEN")  # CITIZEN or ADMIN
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
