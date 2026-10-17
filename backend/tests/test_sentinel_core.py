import os
import pytest
from app.database.db import init_db, get_connection
from app.config import settings
from app.services.policy_service import create_policy_service, check_policy_clarity, get_all_policies
from app.services.rule_service import (
    get_all_rules, get_active_rules, process_rule_approval, update_rule_conditions
)
from app.services.event_service import import_sample_csv, get_all_events, ingest_and_evaluate_event
from app.services.audit_service import (
    get_audit_ledger, verify_ledger_integrity, simulate_tamper, restore_ledger_integrity
)
from app.engine.deterministic_engine import evaluate_event_against_rules
from app.engine.hash_chain import verify_chain, GENESIS_HASH

@pytest.fixture(autouse=True)
def setup_test_db():
    # Use a separate test database
    settings.database_path = "test_sentinel.db"
    if os.path.exists("test_sentinel.db"):
        try:
            os.remove("test_sentinel.db")
        except PermissionError:
            pass
    init_db()
    yield

def test_clarity_check_ambiguous_policy():
    """Requirement 3: Ambiguous policies cannot be automatically activated."""
    vague_text = "Handle data appropriately"
    clarity = check_policy_clarity(vague_text)
    assert clarity["is_ambiguous"] is True
    assert len(clarity["clarification_questions"]) > 0

    res = create_policy_service(
        title="Vague Data Policy",
        industry="Banking",
        text=vague_text
    )
    assert res["policy"]["status"] == "NEEDS_REVIEW"
    assert res["proposed_rule"] is None

def test_policy_to_rule_generation():
    """Requirement 1 & 2: Policy submitted, rule proposed, linked to source clause."""
    policy_text = "Personal customer data must not be sent to unapproved external AI services."
    res = create_policy_service(
        title="Prohibit External AI Leaks",
        industry="Banking",
        text=policy_text
    )
    assert res["policy"]["status"] == "ACTIVE"
    assert res["proposed_rule"] is not None
    rule = res["proposed_rule"]
    assert rule["status"] == "PENDING_APPROVAL"
    assert rule["source_clause_id"] == "ENT-AI-SEC-01"
    assert rule["classification"] == "PRIVACY_VIOLATION"

def test_human_approval_enforcement():
    """Requirement 4 & 5: Reviewer approves rule. Unapproved rules cannot be used by enforcement engine."""
    policy_text = "Personal customer data must not be sent to unapproved external AI services."
    res = create_policy_service("AI Policy", "Banking", policy_text)
    rule = res["proposed_rule"]
    rule_id = rule["rule_id"]

    # Verify rule is not active yet
    active_rules = get_active_rules()
    active_ids = [r["rule_id"] for r in active_rules]
    assert rule_id not in active_ids

    # An unauthorized event should NOT match an unapproved rule
    event_payload = {
        "event_id": "TEST-EVT-01",
        "user_id": "EMP_TEST",
        "event_type": "AI_DATA_SEND",
        "resource": "CUSTOMER_DB",
        "activity_details": "Sending to unapproved AI service",
        "sensitive_data": True,
        "authorized": False
    }
    eval_unapproved = evaluate_event_against_rules(event_payload, active_rules)
    assert eval_unapproved["matched_rule_id"] != rule_id

    # Now Human approves rule
    approval_res = process_rule_approval(rule_id, "APPROVE", "Signed off by RACF SECADMIN", "SECADMIN_01")
    assert approval_res["status"] == "ACTIVE"

    # Now rule is ACTIVE and properly matches
    active_rules = get_active_rules()
    eval_approved = evaluate_event_against_rules(event_payload, active_rules)
    assert eval_approved["matched_rule_id"] == rule_id
    assert eval_approved["classification"] == "PRIVACY_VIOLATION"

def test_csv_import_and_ground_truth_verification():
    """Requirement 8 & 9: Import CSV, preserve expected classifications, compare outcomes."""
    import_res = import_sample_csv()
    assert import_res["status"] == "success"
    assert import_res["imported_count"] == 15

    events = get_all_events()
    assert len(events) == 15

    # Check E001 (Normal login)
    e001 = next(e for e in events if e["event_id"] == "E001")
    assert e001["expected_classification"] == "NORMAL"
    assert e001["expected_action"] == "ALLOW"

    # Check E003 (Unauthorized sensitive access)
    e003 = next(e for e in events if e["event_id"] == "E003")
    assert e003["expected_classification"] == "PRIVACY_VIOLATION"
    assert e003["expected_action"] == "BLOCK_OR_ALERT"

def test_sha256_hash_chain_and_tamper_detection():
    """Requirement 10, 11 & 12: Proof card created, SHA-256 chain verifies, tamper detected."""
    # Ingest an event to generate a proof card
    event_payload = {
        "event_id": "TEST-AUDIT-01",
        "user_id": "EMP_AUDIT",
        "event_type": "READ_RECORD",
        "resource": "CUSTOMER_DB",
        "activity_details": "Unauthorized database inspection",
        "sensitive_data": True,
        "authorized": False
    }
    ingest_res = ingest_and_evaluate_event(event_payload)
    assert ingest_res["proof_id"] is not None

    # Verify integrity of intact chain
    verification = verify_ledger_integrity()
    assert verification["is_valid"] is True
    assert verification["total_records"] >= 1

    # Tamper with the record
    tamper_res = simulate_tamper(ingest_res["proof_id"])
    assert tamper_res["status"] == "tampered"

    # Re-verify should FAIL and catch the exact proof ID
    compromised_verification = verify_ledger_integrity()
    assert compromised_verification["is_valid"] is False
    assert compromised_verification["first_corrupted_id"] == ingest_res["proof_id"]

    # Restore ledger
    restore_res = restore_ledger_integrity()
    assert restore_res["status"] == "restored"
    clean_verification = verify_ledger_integrity()
    assert clean_verification["is_valid"] is True

def test_degraded_mode_resilience():
    """Requirement 13: Deterministic detection continues while AI is unavailable."""
    # Simulate turning AI offline
    settings.ai_service_online = False

    # Submit event and verify deterministic engine evaluates without errors
    event_payload = {
        "event_id": "TEST-DEGRADED-01",
        "user_id": "EMP_DEGRADED",
        "event_type": "LOGIN",
        "resource": "IBM_Z_MAINFRAME",
        "activity_details": "Standard user login",
        "sensitive_data": False,
        "authorized": True
    }
    result = ingest_and_evaluate_event(event_payload)
    assert result["classification"] == "NORMAL"
    assert result["recommended_action"] == "ALLOW"
    assert result["proof_id"] is not None

    # Restore AI online
    settings.ai_service_online = True
