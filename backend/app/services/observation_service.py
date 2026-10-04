"""
observation_service.py — Core business logic for creating observations.

Flow:
  1. Save uploaded image to disk
  2. Run AI analysis
  3. Search nearby existing defects for duplicate match
  4. MERGE / REVIEW / DISTINCT decision
  5. Create or update CanonicalDefect
  6. Recalculate priority
  7. Persist observation
  8. Return structured response
"""
import logging
import os
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.ai.ai_service import analyze_image
from app.config import UPLOAD_DIR, AI_MODEL_PATH, DUPLICATE_RADIUS_METERS
from app.models.db_models import CanonicalDefect, Observation
from app.services.distance import haversine_meters
from app.services.duplicate_service import analyze_duplicate
from app.services.priority_service import calculate_priority

logger = logging.getLogger(__name__)


def _save_image(image_bytes: bytes, filename: str) -> str:
    """Save image to UPLOAD_DIR and return relative path."""
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as f:
        f.write(image_bytes)
    return path


def _make_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8].upper()}"


def _derive_status(current: Optional[str], observation_count: int) -> str:
    if current and current not in ("CANDIDATE", "CORROBORATED"):
        return current
    return "CORROBORATED" if observation_count >= 2 else "CANDIDATE"


def _defect_best_accuracy(defect: CanonicalDefect) -> Optional[float]:
    values = [o.accuracy_meters for o in defect.observations if o.accuracy_meters is not None]
    return min(values) if values else None


def _recalculate_priority(defect: CanonicalDefect, db: Session, now_ms: int) -> None:
    """Recalculate and persist priority for a defect."""
    obs_data = [
        {
            "severity": o.severity,
            "confidence": o.confidence,
            "timestamp": o.timestamp,
        }
        for o in defect.observations
    ]
    result = calculate_priority(obs_data, now_ms=now_ms)
    defect.priority_score = result.score
    defect.priority_breakdown = result.breakdown
    defect.priority_computed_at = datetime.utcnow()


def create_observation(
    db: Session,
    image_bytes: Optional[bytes],
    latitude: float,
    longitude: float,
    accuracy_meters: Optional[float],
    location_source: str,
    timestamp_ms: int,
    description: Optional[str] = None,
    reporter_id: Optional[str] = None,
    motion_score: Optional[float] = None,
) -> dict:
    """
    Create a new observation, run AI analysis, handle duplicate detection,
    update or create a CanonicalDefect, recalculate priority, and persist.

    Returns a dict matching ObservationResponse schema.
    """
    now = datetime.utcnow()
    now_ms = int(now.timestamp() * 1000)

    # 1. Save image
    image_path = None
    if image_bytes:
        filename = f"{uuid.uuid4().hex}.jpg"
        image_path = _save_image(image_bytes, filename)

    # 2. AI analysis
    ai_result = analyze_image(image_bytes or b"", model_path=AI_MODEL_PATH)
    logger.info(f"AI analysis: {ai_result['source']} — defect={ai_result['defect_type']}, conf={ai_result['confidence']}")

    # 3. Determine defect type and severity
    # Use AI result if available, otherwise default to POTHOLE/HIGH for a submitted observation
    # (reporter submitting a photo implies they see a defect)
    if ai_result["is_defect"] is True and ai_result["defect_type"]:
        defect_type = ai_result["defect_type"]
        severity = ai_result["severity"] or "MEDIUM"
        confidence = ai_result["confidence"]
        classification_source = ai_result["source"]
    else:
        # AI unavailable or no defect detected — still process as reporter-classified
        defect_type = "POTHOLE"   # default; reporter chose to report
        severity = "MEDIUM"
        confidence = None
        classification_source = "REPORTER"

    # 4. Search for nearby duplicate candidates
    # Load only defects within a bounding box first (approximate), then refine with Haversine
    # For SQLite MVP, load recent active defects and filter in Python
    candidate_defects = (
        db.query(CanonicalDefect)
        .filter(CanonicalDefect.status.notin_(["REPAIRED"]))
        .all()
    )

    best_match: Optional[CanonicalDefect] = None
    best_analysis = None

    for defect in candidate_defects:
        # Quick bounding box filter (≈1 km) before expensive Haversine
        if abs(defect.latitude - latitude) > 0.01 or abs(defect.longitude - longitude) > 0.01:
            continue

        analysis = analyze_duplicate(
            obs_lat=latitude,
            obs_lon=longitude,
            obs_accuracy=accuracy_meters,
            obs_defect_type=defect_type,
            defect_lat=defect.latitude,
            defect_lon=defect.longitude,
            defect_accuracy=_defect_best_accuracy(defect),
            defect_defect_type=defect.defect_type,
        )

        if analysis.decision == "DISTINCT":
            continue

        if best_match is None or analysis.score > best_analysis.score:
            best_match = defect
            best_analysis = analysis

    # 5. Create or update CanonicalDefect
    timestamp_dt = datetime.utcfromtimestamp(timestamp_ms / 1000)
    obs_id = _make_id("OB")

    if best_match is not None and best_analysis.decision in ("MERGE", "REVIEW"):
        # Attach to existing defect
        canonical = best_match
        duplicate_decision = best_analysis.decision
        duplicate_score = best_analysis.score
        duplicate_distance_m = best_analysis.distance_meters

        # Create and attach observation first (so priority has correct obs list)
        observation = Observation(
            id=obs_id,
            defect_id=canonical.id,
            image_path=image_path,
            defect_type=defect_type,
            severity=severity,
            confidence=confidence,
            classification_source=classification_source,
            latitude=latitude,
            longitude=longitude,
            accuracy_meters=accuracy_meters,
            location_source=location_source,
            duplicate_decision=duplicate_decision,
            duplicate_score=duplicate_score,
            duplicate_distance_meters=duplicate_distance_m,
            motion_score=motion_score,
            description=description,
            reporter_id=reporter_id,
            timestamp=timestamp_dt,
        )
        db.add(observation)
        db.flush()  # get obs into session so it appears in canonical.observations

        # Refresh to include new observation
        db.refresh(canonical)

        # Recalculate centroid
        all_obs = canonical.observations
        n = len(all_obs)
        canonical.latitude = sum(o.latitude for o in all_obs) / n
        canonical.longitude = sum(o.longitude for o in all_obs) / n
        canonical.status = _derive_status(canonical.status, n)
        _recalculate_priority(canonical, db, now_ms)

        logger.info(
            f"DUPLICATE {duplicate_decision}: obs {obs_id} attached to defect {canonical.id} "
            f"(dist={duplicate_distance_m:.1f}m, score={duplicate_score:.2f})"
        )

    else:
        # Create new defect
        duplicate_decision = "DISTINCT"
        duplicate_score = None
        duplicate_distance_m = None

        canonical = CanonicalDefect(
            id=_make_id("RD"),
            defect_type=defect_type,
            latitude=latitude,
            longitude=longitude,
            status="CANDIDATE",
        )
        db.add(canonical)
        db.flush()

        observation = Observation(
            id=obs_id,
            defect_id=canonical.id,
            image_path=image_path,
            defect_type=defect_type,
            severity=severity,
            confidence=confidence,
            classification_source=classification_source,
            latitude=latitude,
            longitude=longitude,
            accuracy_meters=accuracy_meters,
            location_source=location_source,
            duplicate_decision=duplicate_decision,
            duplicate_score=duplicate_score,
            duplicate_distance_meters=duplicate_distance_m,
            motion_score=motion_score,
            description=description,
            reporter_id=reporter_id,
            timestamp=timestamp_dt,
        )
        db.add(observation)
        db.flush()

        db.refresh(canonical)
        _recalculate_priority(canonical, db, now_ms)

        logger.info(f"NEW DEFECT {canonical.id} created from obs {obs_id}")

    db.commit()
    db.refresh(canonical)
    db.refresh(observation)

    evidence_count = canonical.observation_count
    priority_result = calculate_priority(
        [{"severity": o.severity, "confidence": o.confidence, "timestamp": o.timestamp}
         for o in canonical.observations],
        now_ms=now_ms,
    )

    return {
        "observation_id": obs_id,
        "defect_id": canonical.id,
        "defect_type": defect_type,
        "severity": severity,
        "duplicate_decision": duplicate_decision,
        "duplicate_score": duplicate_score,
        "duplicate_distance_meters": duplicate_distance_m,
        "evidence_count": evidence_count,
        "priority_score": canonical.priority_score,
        "priority_tier": priority_result.tier,
        "status": canonical.status,
        "location": {"latitude": canonical.latitude, "longitude": canonical.longitude},
        "confidence": confidence,
        "message": ai_result["message"],
    }
