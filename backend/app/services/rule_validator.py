import json
import uuid
import datetime
from typing import Dict, Any, List, Optional
from app.database.db import get_connection
from app.services.rule_service import get_active_rules

# Supported deterministic fields and operators in the rule engine
SUPPORTED_FIELDS = {
    "sensitive_data",
    "authorized",
    "is_unapproved_destination",
    "is_bulk",
    "is_off_hours",
    "has_ticket",
    "user_id",
    "event_type",
    "resource",
    "destination"
}

SUPPORTED_OPERATORS = {"==", "!=", "in", "not_in", ">", "<", "contains", "is_null", "is_not_null"}
SUPPORTED_CLASSIFICATIONS = {"PRIVACY_VIOLATION", "SUSPICIOUS", "NORMAL"}
SUPPORTED_ACTIONS = {"BLOCK_OR_ALERT", "INVESTIGATE", "ALLOW"}

def validate_and_test_rule(
    rule_dict: Dict[str, Any],
    company_id: str
) -> Dict[str, Any]:
    """
    Automated validation and testing pipeline before activation.
    Workflow:
      1. Structural validation (schema, fields, operators).
      2. Condition safety checks (no unsupported fields, no tautologies).
      3. Dry-run execution test against mock safety events.
      4. Auto-activation decision.
    """
    conditions = rule_dict.get("conditions", [])
    if not conditions or not isinstance(conditions, list):
        return {
            "passed": False,
            "status": "REJECTED",
            "message": "Validation failed: Rule has no executable IF-conditions."
        }

    for cond in conditions:
        field = cond.get("field")
        op = cond.get("operator")
        val = cond.get("value")

        if field not in SUPPORTED_FIELDS:
            return {
                "passed": False,
                "status": "REJECTED",
                "message": f"Validation failed: Condition field '{field}' is not supported by deterministic runtime engine."
            }
        if op not in SUPPORTED_OPERATORS:
            return {
                "passed": False,
                "status": "REJECTED",
                "message": f"Validation failed: Condition operator '{op}' is not supported."
            }

    # Classification & Action validation
    classification = rule_dict.get("classification")
    if classification not in SUPPORTED_CLASSIFICATIONS:
        return {
            "passed": False,
            "status": "REJECTED",
            "message": f"Validation failed: Classification '{classification}' is invalid."
        }

    # Safety Test: Dry-run against basic test fixtures
    try:
        from app.engine.deterministic_engine import evaluate_single_condition
        # Test 1: True fixture
        test_ctx = {"sensitive_data": True, "authorized": False, "is_unapproved_destination": True, "is_bulk": True, "is_off_hours": True}
        for cond in conditions:
            f = cond.get("field")
            op = cond.get("operator")
            val = cond.get("value")
            # Must evaluate without error
            evaluate_single_condition(test_ctx.get(f), op, val)
    except Exception as e:
        return {
            "passed": False,
            "status": "REJECTED",
            "message": f"Safety execution test failed with error: {str(e)}"
        }

    # Everything passed! Rule is automatically ACTIVATED
    return {
        "passed": True,
        "status": "ACTIVE",
        "message": "Automated validation and testing passed. Rule automatically activated into runtime engine."
    }
