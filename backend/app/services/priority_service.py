"""
priority_service.py — Deterministic priority calculation.

Mirrors the TypeScript frontend priorityService for consistency.
Same inputs → same output, always.
"""
import math
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

# ── Configuration (mirrors TypeScript PRIORITY_WEIGHTS / PRIORITY_CONFIG) ──────

PRIORITY_WEIGHTS = {
    "severity": 0.35,
    "confidence": 0.15,
    "observation_support": 0.20,
    "recency": 0.15,
    "road_context": 0.15,
}

SEVERITY_VALUE = {
    "LOW": 0.25,
    "MEDIUM": 0.50,
    "HIGH": 0.75,
    "SEVERE": 1.00,
}

UNKNOWN_CONFIDENCE = 0.50
SUPPORT_SATURATION = 5          # observations at which support saturates
RECENCY_HALF_LIFE_DAYS = 14.0
DEFAULT_ROAD_CONTEXT = 0.50     # neutral until road-class data is connected
DAY_MS = 24 * 60 * 60 * 1000


def _clamp01(n: float) -> float:
    return max(0.0, min(1.0, n))


def _round1(n: float) -> float:
    return round(n * 10) / 10


@dataclass
class PriorityFactor:
    value: float
    weight: float
    points: float
    note: str

    def to_dict(self) -> dict:
        return {
            "value": self.value,
            "weight": self.weight,
            "points": self.points,
            "note": self.note,
        }


@dataclass
class PriorityResult:
    score: int
    breakdown: dict

    @property
    def tier(self) -> str:
        if self.score >= 75:
            return "Critical"
        if self.score >= 55:
            return "High"
        if self.score >= 35:
            return "Medium"
        return "Low"


def _factor(value: float, weight: float, note: str) -> PriorityFactor:
    v = _clamp01(value)
    return PriorityFactor(
        value=_round1(v * 100) / 100,
        weight=weight,
        points=_round1(v * weight * 100),
        note=note,
    )


def calculate_priority(
    observations: list[dict],  # list of dicts with keys: severity, confidence, timestamp
    road_context: Optional[float] = None,
    now_ms: Optional[int] = None,
) -> PriorityResult:
    """
    Pure deterministic priority.
    observations: each dict must have 'severity' (str), 'confidence' (float|None), 'timestamp' (datetime|int ms).
    """
    if not observations:
        raise ValueError("calculate_priority requires at least one observation")

    now_ms = now_ms or int(datetime.utcnow().timestamp() * 1000)
    w = PRIORITY_WEIGHTS

    # Worst severity
    worst_sev = max(observations, key=lambda o: SEVERITY_VALUE.get(o["severity"], 0))["severity"]

    # Max confidence
    confidences = [o["confidence"] for o in observations if o.get("confidence") is not None]
    confidence_value = max(confidences) if confidences else UNKNOWN_CONFIDENCE

    # Observation support
    n = len(observations)

    # Recency — use latest timestamp
    def to_ms(ts):
        if isinstance(ts, datetime):
            return int(ts.timestamp() * 1000)
        return int(ts)

    latest_ms = max(to_ms(o["timestamp"]) for o in observations)
    age_days = max(0.0, (now_ms - latest_ms) / DAY_MS)
    recency_value = math.pow(0.5, age_days / RECENCY_HALF_LIFE_DAYS)

    has_road_context = road_context is not None
    effective_road_context = road_context if has_road_context else DEFAULT_ROAD_CONTEXT

    breakdown = {
        "severity": _factor(
            SEVERITY_VALUE.get(worst_sev, 0.5),
            w["severity"],
            f"Worst observed severity: {worst_sev}",
        ).to_dict(),
        "confidence": _factor(
            confidence_value,
            w["confidence"],
            (
                f"Highest AI confidence of {len(confidences)} observation(s)"
                if confidences
                else "No AI confidence yet — neutral default"
            ),
        ).to_dict(),
        "observation_support": _factor(
            n / SUPPORT_SATURATION,
            w["observation_support"],
            f"{n} observation(s); saturates at {SUPPORT_SATURATION}",
        ).to_dict(),
        "recency": _factor(
            recency_value,
            w["recency"],
            f"Last seen {age_days:.1f} day(s) ago; half-life {RECENCY_HALF_LIFE_DAYS} days",
        ).to_dict(),
        "road_context": _factor(
            effective_road_context,
            w["road_context"],
            "Road context provided" if has_road_context else "No road-class data yet — neutral default",
        ).to_dict(),
    }

    raw = sum(f["value"] * f["weight"] for f in breakdown.values())
    score = round(_clamp01(raw) * 100)

    return PriorityResult(score=score, breakdown=breakdown)
