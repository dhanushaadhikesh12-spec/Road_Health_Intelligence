"""
ai_service.py — Road defect AI analysis.

Strategy:
  1. Try YOLO if model weights are configured and ultralytics is installed.
  2. Fall back to rule-based image analysis using Pillow (always available).

The rule-based fallback is NOT fake — it performs real image analysis
(brightness, colour distribution, edge density) to estimate defect
likelihood. It is clearly labelled 'RULE_BASED' so the confidence is
not presented as deep-learning accuracy.

Classification source returned:
  'MODEL'      — YOLO or another trained detector ran successfully
  'RULE_BASED' — Pillow-based heuristic analysis
  'UNAVAILABLE'— Image could not be read (corrupted / wrong format)
"""
import io
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

# ── Supported classes ─────────────────────────────────────────────────────────
DEFECT_TYPES = ["POTHOLE", "CRACK", "SURFACE_WEAR", "RUTTING", "OTHER"]
SEVERITY_LEVELS = ["LOW", "MEDIUM", "HIGH", "SEVERE"]


# ── YOLO loader (optional) ────────────────────────────────────────────────────

_yolo_model = None
_yolo_tried = False


def _load_yolo(model_path: str):
    global _yolo_model, _yolo_tried
    if _yolo_tried:
        return _yolo_model
    _yolo_tried = True
    if not model_path or not os.path.exists(model_path):
        logger.info("AI model path not configured or not found — using rule-based analysis")
        return None
    try:
        from ultralytics import YOLO  # type: ignore
        _yolo_model = YOLO(model_path)
        logger.info(f"YOLO model loaded from {model_path}")
        return _yolo_model
    except ImportError:
        logger.warning("ultralytics not installed — using rule-based analysis")
        return None
    except Exception as e:
        logger.error(f"Failed to load YOLO model: {e}")
        return None


# ── YOLO inference ────────────────────────────────────────────────────────────

def _analyze_with_yolo(model, image_bytes: bytes) -> dict:
    """Run YOLO inference on image bytes. Returns standardised result dict."""
    try:
        import tempfile, pathlib
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp.write(image_bytes)
            tmp_path = tmp.name

        results = model(tmp_path, verbose=False)
        os.unlink(tmp_path)

        if not results or len(results) == 0:
            return _unavailable("YOLO returned empty results")

        result = results[0]
        boxes = result.boxes

        if boxes is None or len(boxes) == 0:
            return {
                "source": "MODEL",
                "is_defect": False,
                "defect_type": None,
                "severity": None,
                "confidence": None,
                "message": "No defects detected by AI model",
            }

        # Pick highest-confidence detection
        confidences = boxes.conf.tolist()
        classes = boxes.cls.tolist()
        best_idx = confidences.index(max(confidences))
        best_conf = confidences[best_idx]
        best_cls = int(classes[best_idx])

        # Map class index to our defect types
        names = result.names  # dict {int: str}
        raw_class = names.get(best_cls, "OTHER").upper()

        # Normalise class name to our taxonomy
        defect_type = _map_class(raw_class)
        severity = _confidence_to_severity(best_conf)

        return {
            "source": "MODEL",
            "is_defect": True,
            "defect_type": defect_type,
            "severity": severity,
            "confidence": round(best_conf, 4),
            "message": f"AI model detected {defect_type} with {best_conf:.0%} confidence",
        }
    except Exception as e:
        logger.error(f"YOLO inference error: {e}")
        return _unavailable(f"Model inference failed: {str(e)[:100]}")


def _map_class(raw: str) -> str:
    """Map arbitrary class names to our taxonomy."""
    raw = raw.upper()
    mapping = {
        "POTHOLE": "POTHOLE",
        "CRACK": "CRACK",
        "ALLIGATOR": "CRACK",
        "LONGITUDINAL": "CRACK",
        "TRANSVERSE": "CRACK",
        "RUTTING": "RUTTING",
        "RUT": "RUTTING",
        "WEARING": "SURFACE_WEAR",
        "SURFACE": "SURFACE_WEAR",
        "WEAR": "SURFACE_WEAR",
    }
    for key, value in mapping.items():
        if key in raw:
            return value
    return "OTHER"


def _confidence_to_severity(conf: float) -> str:
    if conf >= 0.85:
        return "SEVERE"
    if conf >= 0.65:
        return "HIGH"
    if conf >= 0.45:
        return "MEDIUM"
    return "LOW"


# ── Rule-based fallback using Pillow ─────────────────────────────────────────

def _analyze_with_rules(image_bytes: bytes) -> dict:
    """
    Heuristic road defect analysis using Pillow.

    Examines:
    - Average image darkness (road defects tend to be darker patches)
    - Colour variance (high variance suggests texture/damage)
    - Edge density proxy (mode/saturation patterns)

    This is a prototype heuristic labelled RULE_BASED.
    It does NOT claim the accuracy of a trained model.
    """
    try:
        from PIL import Image, ImageFilter
        import io as _io

        img = Image.open(_io.BytesIO(image_bytes)).convert("L")  # greyscale
        img = img.resize((224, 224))

        pixels = list(img.getdata())
        n = len(pixels)

        mean_brightness = sum(pixels) / n
        variance = sum((p - mean_brightness) ** 2 for p in pixels) / n
        std_dev = variance ** 0.5

        # Edge detection proxy
        edges = img.filter(ImageFilter.FIND_EDGES)
        edge_pixels = list(edges.getdata())
        edge_mean = sum(edge_pixels) / len(edge_pixels)

        # Heuristic scoring
        # Low brightness + high variance + high edges → likely damaged road surface
        darkness_score = max(0, (128 - mean_brightness) / 128)  # 0–1
        variance_score = min(1, std_dev / 60)                    # 0–1, saturates at std=60
        edge_score = min(1, edge_mean / 40)                      # 0–1

        # Weighted combination
        defect_score = 0.35 * darkness_score + 0.40 * variance_score + 0.25 * edge_score

        if defect_score < 0.25:
            return {
                "source": "RULE_BASED",
                "is_defect": False,
                "defect_type": None,
                "severity": None,
                "confidence": round(defect_score, 3),
                "message": "Heuristic analysis: road surface appears acceptable",
            }

        # Classify defect type from characteristics
        if edge_score > 0.6 and variance_score > 0.5:
            defect_type = "CRACK"
        elif darkness_score > 0.5:
            defect_type = "POTHOLE"
        elif variance_score > 0.4:
            defect_type = "SURFACE_WEAR"
        else:
            defect_type = "OTHER"

        # Severity from defect score
        if defect_score >= 0.70:
            severity = "SEVERE"
        elif defect_score >= 0.55:
            severity = "HIGH"
        elif defect_score >= 0.40:
            severity = "MEDIUM"
        else:
            severity = "LOW"

        return {
            "source": "RULE_BASED",
            "is_defect": True,
            "defect_type": defect_type,
            "severity": severity,
            "confidence": round(defect_score, 3),
            "message": (
                f"Heuristic analysis: {defect_type} pattern detected "
                f"(darkness={darkness_score:.2f}, variance={variance_score:.2f}, edge={edge_score:.2f}). "
                f"Source: RULE_BASED — not a trained neural network."
            ),
        }

    except Exception as e:
        logger.error(f"Rule-based analysis error: {e}")
        return _unavailable(f"Image analysis failed: {str(e)[:100]}")


def _unavailable(message: str) -> dict:
    return {
        "source": "UNAVAILABLE",
        "is_defect": None,
        "defect_type": None,
        "severity": None,
        "confidence": None,
        "message": message,
    }


# ── Public interface ──────────────────────────────────────────────────────────

def analyze_image(image_bytes: bytes, model_path: str = "") -> dict:
    """
    Analyse road image and return detection result.

    Returns dict with keys:
      source, is_defect, defect_type, severity, confidence, message
    """
    if not image_bytes:
        return _unavailable("Empty image data")

    # Try YOLO first if configured
    model = _load_yolo(model_path)
    if model is not None:
        return _analyze_with_yolo(model, image_bytes)

    # Fall back to rule-based
    return _analyze_with_rules(image_bytes)
