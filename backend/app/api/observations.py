"""
observations.py — POST /observations, GET /observations, GET /observations/{id}
"""
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user, get_optional_user
from app.database import get_db
from app.models.db_models import CanonicalDefect, Observation, User
from app.schemas.schemas import ObservationOut, ObservationResponse
from app.services.observation_service import create_observation

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/observations", tags=["observations"])

MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB


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


@router.post("", response_model=ObservationResponse, status_code=201)
async def create_observation_endpoint(
    image: Optional[UploadFile] = File(None),
    latitude: float = Form(...),
    longitude: float = Form(...),
    accuracy_meters: Optional[float] = Form(None),
    location_source: str = Form("DEVICE"),
    timestamp: Optional[int] = Form(None),
    description: Optional[str] = Form(None),
    reporter_id: Optional[str] = Form(None),
    motion_score: Optional[float] = Form(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Submit a citizen observation. Runs AI analysis, duplicate detection, priority calculation."""
    # Validate coordinates
    if not (-90 <= latitude <= 90):
        raise HTTPException(status_code=400, detail="latitude must be between -90 and 90")
    if not (-180 <= longitude <= 180):
        raise HTTPException(status_code=400, detail="longitude must be between -180 and 180")

    # Read image
    image_bytes: Optional[bytes] = None
    if image:
        content_type = image.content_type or ""
        if content_type and not content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail=f"Unsupported content type: {content_type}")
        image_bytes = await image.read()
        if len(image_bytes) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=400, detail="Image too large (max 10 MB)")

    timestamp_ms = timestamp or int(datetime.utcnow().timestamp() * 1000)

    # Use authenticated user ID if logged in
    effective_reporter_id = current_user.id if current_user else (reporter_id or "anonymous_citizen")

    try:
        result = create_observation(
            db=db,
            image_bytes=image_bytes,
            latitude=latitude,
            longitude=longitude,
            accuracy_meters=accuracy_meters,
            location_source=location_source,
            timestamp_ms=timestamp_ms,
            description=description,
            reporter_id=effective_reporter_id,
            motion_score=motion_score,
        )
        return ObservationResponse(**result)
    except Exception as e:
        logger.exception(f"Error creating observation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=list[ObservationOut])
def list_observations(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    observations = (
        db.query(Observation)
        .order_by(Observation.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )
    return [_obs_to_out(o) for o in observations]


@router.get("/my", response_model=list[ObservationOut])
def my_observations(
    reporter_id: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get observations for the authenticated citizen.
    If authenticated, returns strictly this user's submitted reports.
    """
    q = db.query(Observation).order_by(Observation.created_at.desc())
    if current_user:
        q = q.filter(Observation.reporter_id == current_user.id)
    elif reporter_id:
        q = q.filter(Observation.reporter_id == reporter_id)

    return [_obs_to_out(o) for o in q.limit(limit).all()]


@router.get("/{obs_id}", response_model=ObservationOut)
def get_observation(obs_id: str, db: Session = Depends(get_db)):
    obs = db.query(Observation).filter(Observation.id == obs_id).first()
    if not obs:
        raise HTTPException(status_code=404, detail=f"Observation {obs_id} not found")
    return _obs_to_out(obs)
