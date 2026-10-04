"""
schemas.py — Pydantic request/response models.
Mirrors the TypeScript contract in team/contracts/api.contract.md.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ── Enumerations (match frontend api/types.ts) ─────────────────────────────────

VALID_DEFECT_TYPES = {"POTHOLE", "CRACK", "RUTTING", "SURFACE_WEAR", "OTHER"}
VALID_SEVERITIES = {"LOW", "MEDIUM", "HIGH", "SEVERE"}
VALID_STATUSES = {"CANDIDATE", "CORROBORATED", "VERIFIED", "SCHEDULED", "REPAIRED", "RECURRED"}
VALID_DUPLICATE_DECISIONS = {"MERGE", "REVIEW", "DISTINCT"}

# ── Priority ───────────────────────────────────────────────────────────────────

class PriorityFactor(BaseModel):
    value: float
    weight: float
    points: float
    note: str


class PriorityBreakdown(BaseModel):
    severity: PriorityFactor
    confidence: PriorityFactor
    observation_support: PriorityFactor
    recency: PriorityFactor
    road_context: PriorityFactor


# ── Observation ────────────────────────────────────────────────────────────────

class ObservationOut(BaseModel):
    id: str
    defect_id: str
    image_url: Optional[str]
    defect_type: str
    severity: str
    confidence: Optional[float]
    classification_source: str
    latitude: float
    longitude: float
    accuracy_meters: Optional[float]
    location_source: str
    duplicate_decision: str
    duplicate_score: Optional[float]
    duplicate_distance_meters: Optional[float]
    motion_score: Optional[float]
    description: Optional[str]
    timestamp: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Defect ─────────────────────────────────────────────────────────────────────

class DefectSummary(BaseModel):
    """Lightweight defect for list views and map markers."""
    id: str
    defect_type: str
    latitude: float
    longitude: float
    status: str
    priority_score: int
    observation_count: int
    first_detected: datetime
    last_updated: datetime
    verification_status: Optional[str]

    model_config = {"from_attributes": True}


class DefectDetail(BaseModel):
    """Full defect with observations for the detail view."""
    id: str
    defect_type: str
    latitude: float
    longitude: float
    status: str
    priority_score: int
    priority_breakdown: Optional[dict]
    priority_computed_at: Optional[datetime]
    observation_count: int
    first_detected: datetime
    last_updated: datetime
    before_image_url: Optional[str]
    after_image_url: Optional[str]
    verification_status: Optional[str]
    assigned_at: Optional[datetime]
    repair_started: Optional[datetime]
    repair_completed: Optional[datetime]
    verified_at: Optional[datetime]
    observations: list[ObservationOut]

    model_config = {"from_attributes": True}


# ── Observation submission response ───────────────────────────────────────────

class ObservationResponse(BaseModel):
    """Response from POST /observations — enough for mobile to show ResultScreen."""
    observation_id: str
    defect_id: str
    defect_type: str
    severity: str
    duplicate_decision: str
    duplicate_score: Optional[float]
    duplicate_distance_meters: Optional[float]
    evidence_count: int
    priority_score: int
    priority_tier: str
    status: str
    location: dict  # {"latitude": ..., "longitude": ...}
    confidence: Optional[float]
    message: str


# ── Status update ─────────────────────────────────────────────────────────────

class StatusUpdateRequest(BaseModel):
    status: str = Field(..., description="New defect status")


class StatusUpdateResponse(BaseModel):
    id: str
    status: str
    updated_at: datetime


# ── Dashboard stats ───────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_observations: int
    unique_defects: int
    duplicate_observations: int
    critical_defects: int
    high_priority_defects: int
    under_repair: int
    resolved: int
    road_health_score: int


# ── Defect list response ──────────────────────────────────────────────────────

class DefectListResponse(BaseModel):
    defects: list[DefectSummary]
    total: int
    limit: int
    offset: int


# ── AI analysis response ──────────────────────────────────────────────────────

class AIAnalysisResult(BaseModel):
    source: str  # 'MODEL' or 'RULE_BASED'
    is_defect: Optional[bool]
    defect_type: Optional[str]
    severity: Optional[str]
    confidence: Optional[float]
    message: str
