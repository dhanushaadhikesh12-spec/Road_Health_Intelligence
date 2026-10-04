"""
defects.py — Endpoints for querying defects, updating status, and retrieving dashboard analytics.
"""
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, desc
from sqlalchemy.orm import Session

from app.auth.deps import require_admin
from app.database import get_db
from app.models.db_models import CanonicalDefect, Observation, User
from app.schemas.schemas import (
    DefectDetail,
    DefectListResponse,
    DefectSummary,
    ObservationOut,
    StatusUpdateRequest,
    StatusUpdateResponse,
    DashboardStats,
    VALID_STATUSES,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/defects", tags=["defects"])


def _obs_to_out(obs: Observation, base_url: str = "") -> ObservationOut:
    image_url = None
    if obs.image_path:
        filename = obs.image_path.split("/")[-1].split("\\")[-1]
        image_url = f"{base_url}/uploads/{filename}"

    return ObservationOut(
        id=obs.id,
        defect_id=obs.defect_id,
        image_url=image_url,
        defect_type=obs.defect_type,
        severity=obs.severity,
        confidence=obs.confidence,
        classification_source=obs.classification_source,
        latitude=obs.latitude,
        longitude=obs.longitude,
        accuracy_meters=obs.accuracy_meters,
        location_source=obs.location_source,
        duplicate_decision=obs.duplicate_decision,
        duplicate_score=obs.duplicate_score,
        duplicate_distance_meters=obs.duplicate_distance_meters,
        motion_score=obs.motion_score,
        description=obs.description,
        timestamp=obs.timestamp,
        created_at=obs.created_at,
    )


def _defect_to_summary(d: CanonicalDefect) -> DefectSummary:
    return DefectSummary(
        id=d.id,
        defect_type=d.defect_type,
        latitude=d.latitude,
        longitude=d.longitude,
        status=d.status,
        priority_score=d.priority_score,
        observation_count=len(d.observations),
        first_detected=d.first_detected,
        last_updated=d.last_updated,
        verification_status=d.verification_status,
    )


@router.get("/stats/summary", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """Return aggregated KPIs for the authority dashboard. (ADMIN ONLY)"""
    total_obs = db.query(func.count(Observation.id)).scalar() or 0
    unique_defects = db.query(func.count(CanonicalDefect.id)).scalar() or 0
    
    # Duplicate observations are those merged or reviewed
    merged_obs = (
        db.query(func.count(Observation.id))
        .filter(Observation.duplicate_decision.in_(["MERGE", "REVIEW"]))
        .scalar()
        or 0
    )

    # Critical defects (priority >= 75)
    critical_defects = (
        db.query(func.count(CanonicalDefect.id))
        .filter(
            CanonicalDefect.priority_score >= 75,
            CanonicalDefect.status.notin_(["REPAIRED"]),
        )
        .scalar()
        or 0
    )

    # High priority defects (50 <= priority < 75)
    high_priority = (
        db.query(func.count(CanonicalDefect.id))
        .filter(
            CanonicalDefect.priority_score >= 50,
            CanonicalDefect.priority_score < 75,
            CanonicalDefect.status.notin_(["REPAIRED"]),
        )
        .scalar()
        or 0
    )

    # Under repair
    under_repair = (
        db.query(func.count(CanonicalDefect.id))
        .filter(CanonicalDefect.status.in_(["SCHEDULED", "VERIFIED"]))
        .scalar()
        or 0
    )

    # Resolved
    resolved = (
        db.query(func.count(CanonicalDefect.id))
        .filter(CanonicalDefect.status == "REPAIRED")
        .scalar()
        or 0
    )

    # Overall Road Health Score (0-100)
    if unique_defects == 0:
        road_health_score = 100
    else:
        active_defects = (
            db.query(CanonicalDefect)
            .filter(CanonicalDefect.status.notin_(["REPAIRED"]))
            .all()
        )
        if not active_defects:
            road_health_score = 100
        else:
            avg_priority = sum(d.priority_score for d in active_defects) / len(active_defects)
            road_health_score = max(10, min(100, int(100 - (avg_priority * 0.8))))

    return DashboardStats(
        total_observations=total_obs,
        unique_defects=unique_defects,
        duplicate_observations=merged_obs,
        critical_defects=critical_defects,
        high_priority_defects=high_priority,
        under_repair=under_repair,
        resolved=resolved,
        road_health_score=road_health_score,
    )


@router.get("", response_model=DefectListResponse)
def list_defects(
    status: Optional[str] = Query(None, description="Filter by status"),
    defect_type: Optional[str] = Query(None, description="Filter by defect type"),
    min_priority: Optional[int] = Query(None, description="Filter by minimum priority"),
    sort: str = Query("priority", description="Sort order: priority, recency, observations"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """List canonical defects with filtering and sorting."""
    query = db.query(CanonicalDefect)

    if status:
        query = query.filter(CanonicalDefect.status == status.upper())
    if defect_type:
        query = query.filter(CanonicalDefect.defect_type == defect_type.upper())
    if min_priority is not None:
        query = query.filter(CanonicalDefect.priority_score >= min_priority)

    total = query.count()

    if sort == "recency":
        query = query.order_by(desc(CanonicalDefect.last_updated))
    elif sort == "observations":
        query = query.order_by(desc(CanonicalDefect.priority_score))
    else:
        query = query.order_by(desc(CanonicalDefect.priority_score), desc(CanonicalDefect.last_updated))

    defects = query.offset(offset).limit(limit).all()

    return DefectListResponse(
        defects=[_defect_to_summary(d) for d in defects],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{defect_id}", response_model=DefectDetail)
def get_defect(defect_id: str, db: Session = Depends(get_db)):
    """Fetch defect details, including full observation history and priority breakdown."""
    defect = db.query(CanonicalDefect).filter(CanonicalDefect.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail=f"Defect {defect_id} not found")

    return DefectDetail(
        id=defect.id,
        defect_type=defect.defect_type,
        latitude=defect.latitude,
        longitude=defect.longitude,
        status=defect.status,
        priority_score=defect.priority_score,
        priority_breakdown=defect.priority_breakdown,
        priority_computed_at=defect.priority_computed_at,
        observation_count=len(defect.observations),
        first_detected=defect.first_detected,
        last_updated=defect.last_updated,
        before_image_url=defect.before_image_path,
        after_image_url=defect.after_image_path,
        verification_status=defect.verification_status,
        assigned_at=defect.assigned_at,
        repair_started=defect.repair_started,
        repair_completed=defect.repair_completed,
        verified_at=defect.verified_at,
        observations=[_obs_to_out(o) for o in defect.observations],
    )


@router.patch("/{defect_id}/status", response_model=StatusUpdateResponse)
def update_defect_status(
    defect_id: str,
    body: StatusUpdateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """Transition defect status (VERIFIED, SCHEDULED, REPAIRED, RECURRED). (ADMIN ONLY)"""
    new_status = body.status.upper()
    if new_status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{new_status}'. Must be one of {sorted(VALID_STATUSES)}",
        )

    defect = db.query(CanonicalDefect).filter(CanonicalDefect.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail=f"Defect {defect_id} not found")

    now = datetime.utcnow()
    defect.status = new_status
    defect.last_updated = now

    if new_status == "VERIFIED":
        defect.verified_at = now
        defect.verification_status = "CONFIRMED"
    elif new_status == "SCHEDULED":
        defect.assigned_at = now
    elif new_status == "REPAIRED":
        defect.repair_completed = now

    db.commit()
    db.refresh(defect)

    return StatusUpdateResponse(
        id=defect.id,
        status=defect.status,
        updated_at=defect.last_updated,
    )


@router.post("/{defect_id}/verify-repair")
def verify_repair(
    defect_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """Verify that a repair has been completed successfully. (ADMIN ONLY)"""
    defect = db.query(CanonicalDefect).filter(CanonicalDefect.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail=f"Defect {defect_id} not found")

    now = datetime.utcnow()
    defect.status = "REPAIRED"
    defect.verification_status = "VERIFIED_COMPLETED"
    defect.verified_at = now
    defect.repair_completed = defect.repair_completed or now
    defect.last_updated = now

    db.commit()
    db.refresh(defect)
    return {
        "id": defect.id,
        "status": defect.status,
        "verification_status": defect.verification_status,
        "verified_at": defect.verified_at,
        "verified_by": current_admin.email,
    }


@router.post("/{defect_id}/review-detection")
def review_detection(
    defect_id: str,
    action: str = Query(..., description="Action: CONFIRM, REJECT, NEEDS_REVIEW"),
    notes: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """Review AI detection decision. (ADMIN ONLY)"""
    action_upper = action.upper()
    if action_upper not in ("CONFIRM", "REJECT", "NEEDS_REVIEW"):
        raise HTTPException(status_code=400, detail="Action must be CONFIRM, REJECT, or NEEDS_REVIEW")

    defect = db.query(CanonicalDefect).filter(CanonicalDefect.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail=f"Defect {defect_id} not found")

    now = datetime.utcnow()
    if action_upper == "CONFIRM":
        defect.verification_status = "CONFIRMED"
        defect.status = "VERIFIED"
    elif action_upper == "REJECT":
        defect.verification_status = "REJECTED_FALSE_POSITIVE"
        defect.priority_score = 0
    elif action_upper == "NEEDS_REVIEW":
        defect.verification_status = "NEEDS_MANUAL_REVIEW"

    defect.last_updated = now
    db.commit()
    db.refresh(defect)
    return {
        "id": defect.id,
        "status": defect.status,
        "verification_status": defect.verification_status,
        "reviewed_by": current_admin.email,
        "notes": notes,
    }
