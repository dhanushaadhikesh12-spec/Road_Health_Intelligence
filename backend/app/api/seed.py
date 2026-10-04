"""
seed.py — Seed demo data for hackathon presentation and quick testing.
Populates realistic Bangalore / urban defect clusters, duplicate observations,
and varying priority levels.
"""
from datetime import datetime, timedelta
import random
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.db_models import CanonicalDefect, Observation
from app.services.priority_service import calculate_priority

router = APIRouter(prefix="/seed", tags=["seed"])

DEMO_DEFECTS = [
    {
        "id": "RD-KORAMANGALA-1",
        "defect_type": "POTHOLE",
        "latitude": 12.9352,
        "longitude": 77.6245,
        "status": "CORROBORATED",
        "observations": [
            {
                "id": "OB-KOR-1",
                "severity": "HIGH",
                "confidence": 0.94,
                "classification_source": "MODEL",
                "latitude": 12.93521,
                "longitude": 77.62449,
                "accuracy_meters": 4.1,
                "description": "Deep pothole near 80ft road junction. Water collected inside.",
                "reporter_id": "citizen_412",
                "duplicate_decision": "DISTINCT",
                "hours_ago": 48,
            },
            {
                "id": "OB-KOR-2",
                "severity": "HIGH",
                "confidence": 0.91,
                "classification_source": "MODEL",
                "latitude": 12.93519,
                "longitude": 77.62452,
                "accuracy_meters": 3.8,
                "description": "Scraped my car underside, dangerous at night.",
                "reporter_id": "citizen_890",
                "duplicate_decision": "MERGE",
                "duplicate_score": 0.92,
                "duplicate_distance_meters": 3.5,
                "hours_ago": 12,
            },
            {
                "id": "OB-KOR-3",
                "severity": "SEVERE",
                "confidence": 0.88,
                "classification_source": "MODEL",
                "latitude": 12.93520,
                "longitude": 77.62451,
                "accuracy_meters": 5.0,
                "description": "Causing heavy traffic bottleneck during peak hours.",
                "reporter_id": "citizen_112",
                "duplicate_decision": "MERGE",
                "duplicate_score": 0.95,
                "duplicate_distance_meters": 1.8,
                "hours_ago": 2,
            },
        ],
    },
    {
        "id": "RD-INDIRANAGAR-2",
        "defect_type": "CRACK",
        "latitude": 12.9784,
        "longitude": 77.6408,
        "status": "VERIFIED",
        "verification_status": "CONFIRMED",
        "observations": [
            {
                "id": "OB-IND-1",
                "severity": "MEDIUM",
                "confidence": 0.82,
                "classification_source": "MODEL",
                "latitude": 12.97839,
                "longitude": 77.64082,
                "accuracy_meters": 6.2,
                "description": "Long longitudinal alligator cracking along bus lane.",
                "reporter_id": "citizen_505",
                "duplicate_decision": "DISTINCT",
                "hours_ago": 72,
            },
            {
                "id": "OB-IND-2",
                "severity": "HIGH",
                "confidence": 0.86,
                "classification_source": "MODEL",
                "latitude": 12.97841,
                "longitude": 77.64079,
                "accuracy_meters": 4.5,
                "description": "Spreading fast after yesterday's rain.",
                "reporter_id": "citizen_921",
                "duplicate_decision": "MERGE",
                "duplicate_score": 0.89,
                "duplicate_distance_meters": 4.2,
                "hours_ago": 24,
            },
        ],
    },
    {
        "id": "RD-WHITEFIELD-3",
        "defect_type": "RUTTING",
        "latitude": 12.9698,
        "longitude": 77.7500,
        "status": "SCHEDULED",
        "observations": [
            {
                "id": "OB-WHI-1",
                "severity": "HIGH",
                "confidence": 0.79,
                "classification_source": "MODEL",
                "latitude": 12.9698,
                "longitude": 77.7500,
                "accuracy_meters": 8.0,
                "description": "Deep depression from heavy truck wheel ruts.",
                "reporter_id": "citizen_303",
                "duplicate_decision": "DISTINCT",
                "hours_ago": 120,
            }
        ],
    },
    {
        "id": "RD-HSR-4",
        "defect_type": "POTHOLE",
        "latitude": 12.9121,
        "longitude": 77.6446,
        "status": "REPAIRED",
        "observations": [
            {
                "id": "OB-HSR-1",
                "severity": "MEDIUM",
                "confidence": 0.90,
                "classification_source": "MODEL",
                "latitude": 12.9121,
                "longitude": 77.6446,
                "accuracy_meters": 5.0,
                "description": "Pothole in Sector 2 service road.",
                "reporter_id": "citizen_101",
                "duplicate_decision": "DISTINCT",
                "hours_ago": 240,
            }
        ],
    },
    {
        "id": "RD-MG-ROAD-5",
        "defect_type": "SURFACE_WEAR",
        "latitude": 12.9738,
        "longitude": 77.6119,
        "status": "CANDIDATE",
        "observations": [
            {
                "id": "OB-MG-1",
                "severity": "LOW",
                "confidence": 0.75,
                "classification_source": "MODEL",
                "latitude": 12.9738,
                "longitude": 77.6119,
                "accuracy_meters": 7.5,
                "description": "Bitumen surface stripping near metro pillar.",
                "reporter_id": "citizen_777",
                "duplicate_decision": "DISTINCT",
                "hours_ago": 6,
            }
        ],
    },
]


@router.post("")
def seed_demo_data(db: Session = Depends(get_db)):
    """Seed sample canonical defects and observations if table is empty or on demand."""
    now = datetime.utcnow()
    now_ms = int(now.timestamp() * 1000)

    # Check if already seeded
    existing_count = db.query(CanonicalDefect).count()
    if existing_count > 0:
        return {"message": f"Database already contains {existing_count} defects. Seeding skipped.", "count": existing_count}

    created = 0
    for defect_data in DEMO_DEFECTS:
        observations_data = defect_data["observations"]
        obs_timestamps = [now - timedelta(hours=o["hours_ago"]) for o in observations_data]

        defect = CanonicalDefect(
            id=defect_data["id"],
            defect_type=defect_data["defect_type"],
            latitude=defect_data["latitude"],
            longitude=defect_data["longitude"],
            status=defect_data["status"],
            verification_status=defect_data.get("verification_status"),
            first_detected=min(obs_timestamps),
            last_updated=max(obs_timestamps),
        )
        if defect_data["status"] == "REPAIRED":
            defect.repair_completed = now - timedelta(hours=12)
        elif defect_data["status"] == "SCHEDULED":
            defect.assigned_at = now - timedelta(hours=24)
        elif defect_data["status"] == "VERIFIED":
            defect.verified_at = now - timedelta(hours=48)

        db.add(defect)
        db.flush()

        for o in observations_data:
            obs = Observation(
                id=o["id"],
                defect_id=defect.id,
                defect_type=defect_data["defect_type"],
                severity=o["severity"],
                confidence=o["confidence"],
                classification_source=o["classification_source"],
                latitude=o["latitude"],
                longitude=o["longitude"],
                accuracy_meters=o["accuracy_meters"],
                location_source="DEVICE",
                duplicate_decision=o["duplicate_decision"],
                duplicate_score=o.get("duplicate_score"),
                duplicate_distance_meters=o.get("duplicate_distance_meters"),
                description=o.get("description"),
                reporter_id=o.get("reporter_id"),
                timestamp=now - timedelta(hours=o["hours_ago"]),
            )
            db.add(obs)
            db.flush()

        db.refresh(defect)

        # Calculate priority
        obs_dicts = [
            {"severity": o.severity, "confidence": o.confidence, "timestamp": o.timestamp}
            for o in defect.observations
        ]
        priority_res = calculate_priority(obs_dicts, now_ms=now_ms)
        defect.priority_score = priority_res.score
        defect.priority_breakdown = priority_res.breakdown
        defect.priority_computed_at = now

        created += 1

    db.commit()
    return {"message": f"Successfully seeded {created} demo defects and observations.", "count": created}
