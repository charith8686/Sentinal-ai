"""
Advisory Risk Scorer (Machine Learning for IBM z/OS Simulation)
Calculates statistical anomaly context from SMF/RACF/CICS event features.
Advisory only: does NOT make compliance determinations; deterministic rules decide.
"""

from typing import Dict, Any

def score_event_advisory_anomaly(event_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes an advisory anomaly score [0.0 - 1.0] and risk context based on:
    - User role vs resource type (SMF type 80/82 / RACF event profile)
    - Off-hours time signature
    - Volume indicators (e.g. export record count)
    - Sensitive data flag
    """
    score = 0.05
    factors = []

    # 1. User privilege vs Resource
    user = str(event_data.get("user_id", "")).upper()
    resource = str(event_data.get("resource", "")).upper()
    event_type = str(event_data.get("event_type", "")).upper()
    sensitive_data = bool(event_data.get("sensitive_data", False))
    authorized = event_data.get("authorized")
    details = str(event_data.get("activity_details", "")).lower()

    if authorized is False:
        score += 0.45
        factors.append("Explicit unauthorized access flag")
    elif authorized is None:
        score += 0.25
        factors.append("Indeterminate authorization context")

    if sensitive_data:
        score += 0.20
        factors.append("Sensitive data target flagged")

    if "5000 records" in details or "bulk" in details or event_type == "DATA_EXPORT":
        score += 0.25
        factors.append("High volume batch transfer pattern")

    if event_type in ["LOGIN_FAILURE", "PERMISSION_CHANGE", "DATA_DELETE"]:
        score += 0.20
        factors.append(f"High sensitivity event type ({event_type})")

    if "unusual hour" in details or "off_hours" in event_type.lower():
        score += 0.20
        factors.append("Temporal anomaly: access during off-shift window")

    if "ai" in details or "external" in details or event_type == "AI_DATA_SEND":
        score += 0.30
        factors.append("External AI egress vector detected")

    # Clamp to 0.0 - 0.99
    score = min(0.99, max(0.02, round(score, 2)))

    return {
        "advisory_score": score,
        "advisory_tier": "HIGH" if score >= 0.7 else ("ELEVATED" if score >= 0.4 else "BASELINE"),
        "model_target": "MLz (Machine Learning for z/OS) - Tabular XGBoost Emulation",
        "advisory_factors": factors,
        "note": "ADVISORY ONLY: Deterministic rules make the binding compliance decision."
    }
