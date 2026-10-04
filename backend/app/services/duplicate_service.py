"""
duplicate_service.py — Duplicate analysis mirroring the TypeScript frontend logic.

Decision:
  MERGE  — confident same physical defect; attach observation to existing defect
  REVIEW — possible match; needs human confirmation
  DISTINCT — no match; create new defect record
"""
import math
from dataclasses import dataclass
from typing import Optional

from app.services.distance import haversine_meters

# ── Configuration (mirrors TypeScript DUPLICATE_CONFIG) ───────────────────────
CANDIDATE_RADIUS_METERS = 25.0          # configurable via env in future
MAX_UNCERTAINTY_INFLATION_METERS = 15.0
UNKNOWN_ACCURACY_METERS = 30.0
MAX_UNCERTAINTY_FOR_AUTO_MERGE_METERS = 20.0
MERGE_SCORE = 0.75
REVIEW_SCORE = 0.45
WEIGHTS = {"spatial": 0.55, "defect_type": 0.45}


@dataclass
class DuplicateAnalysis:
    decision: str  # 'MERGE' | 'REVIEW' | 'DISTINCT'
    score: float
    distance_meters: float
    reasons: list[str]


def _clamp01(n: float) -> float:
    return max(0.0, min(1.0, n))


def analyze_duplicate(
    obs_lat: float,
    obs_lon: float,
    obs_accuracy: Optional[float],
    obs_defect_type: str,
    defect_lat: float,
    defect_lon: float,
    defect_accuracy: Optional[float],  # best accuracy from defect's observations
    defect_defect_type: str,
) -> DuplicateAnalysis:
    reasons: list[str] = []

    distance_m = haversine_meters(obs_lat, obs_lon, defect_lat, defect_lon)
    obs_acc = obs_accuracy if obs_accuracy is not None else UNKNOWN_ACCURACY_METERS
    def_acc = defect_accuracy if defect_accuracy is not None else UNKNOWN_ACCURACY_METERS
    combined_uncertainty = math.hypot(obs_acc, def_acc)
    gate_radius = CANDIDATE_RADIUS_METERS + min(combined_uncertainty, MAX_UNCERTAINTY_INFLATION_METERS)

    reasons.append(
        f"Distance {distance_m:.1f} m; gate {gate_radius:.1f} m "
        f"(base {CANDIDATE_RADIUS_METERS} m + GPS uncertainty ±{combined_uncertainty:.1f} m)"
    )

    if distance_m > gate_radius:
        reasons.append("Outside spatial candidate gate")
        return DuplicateAnalysis(decision="DISTINCT", score=0.0, distance_meters=distance_m, reasons=reasons)

    evidence: list[tuple[float, float]] = []  # (weight, score)

    spatial_score = _clamp01(1 - distance_m / gate_radius)
    evidence.append((WEIGHTS["spatial"], spatial_score))

    type_conflict = obs_defect_type != defect_defect_type
    if type_conflict:
        reasons.append(f"Defect type differs ({obs_defect_type} vs {defect_defect_type})")
    else:
        reasons.append(f"Defect type agrees ({obs_defect_type})")
    evidence.append((WEIGHTS["defect_type"], 0.0 if type_conflict else 1.0))

    reasons.append("Visual similarity: not available")
    reasons.append("Road segment match: not available")

    total_weight = sum(w for w, _ in evidence)
    score = sum(w * s for w, s in evidence) / total_weight if total_weight > 0 else 0.0
    score = round(score * 100) / 100

    if score >= MERGE_SCORE:
        decision = "MERGE"
    elif score >= REVIEW_SCORE:
        decision = "REVIEW"
    else:
        decision = "DISTINCT"

    if decision == "MERGE" and type_conflict:
        decision = "REVIEW"
        reasons.append("Type conflict blocks automatic merge")

    if decision == "MERGE" and combined_uncertainty > MAX_UNCERTAINTY_FOR_AUTO_MERGE_METERS:
        decision = "REVIEW"
        reasons.append("GPS uncertainty too high for automatic merge")

    return DuplicateAnalysis(decision=decision, score=score, distance_meters=distance_m, reasons=reasons)
