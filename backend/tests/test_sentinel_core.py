import os
import asyncio
import pytest
from app.database.db import init_db, get_connection
from app.config import settings
from app.services.auth_service import register_company, login_company, get_company_by_token
from app.services.policy_service import create_policy_service, check_policy_clarity, get_all_policies, delete_policy_service
from app.services.rule_service import get_all_rules, get_active_rules
from app.services.event_service import import_sample_csv, get_all_events, ingest_and_evaluate_event
from app.services.audit_service import (
    get_audit_ledger, verify_ledger_integrity, simulate_tamper, restore_ledger_integrity
)
from app.services.alert_service import get_alerts, update_alert_investigation
from app.engine.deterministic_engine import evaluate_event_against_rules

@pytest.fixture(autouse=True)
def setup_test_db():
    settings.database_path = "test_sentinel.db"
    init_db()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM companies;")
    cursor.execute("DELETE FROM company_sessions;")
    cursor.execute("DELETE FROM policies;")
    cursor.execute("DELETE FROM rules;")
    cursor.execute("DELETE FROM events;")
    cursor.execute("DELETE FROM alerts;")
    cursor.execute("DELETE FROM audit_ledger;")
    conn.commit()
    conn.close()
    yield

def test_company_registration_and_login():
    """Verify company registration, password hashing, and authentication token generation."""
    reg = register_company("Acme Bank", "security@acme.com", "Password123!", "Banking")
    assert reg["company_id"].startswith("CMP-")
    assert reg["token"] is not None

    # Login with valid credentials
    log = login_company("security@acme.com", "Password123!")
    assert log["company_id"] == reg["company_id"]
    assert log["token"] is not None

    # Session token retrieval
    comp = get_company_by_token(log["token"])
    assert comp is not None
    assert comp["email"] == "security@acme.com"

    # Invalid password must fail
    with pytest.raises(ValueError):
        login_company("security@acme.com", "WrongPassword")

def test_fresh_company_starts_with_zero_records():
    """Requirement 3: Every newly registered company must start with 0 policies, rules, events, alerts, audit records."""
    comp = register_company("Clean Corp", "admin@cleancorp.com", "SecretPass123", "Retail")
    cid = comp["company_id"]

    assert len(get_all_policies(cid)) == 0
    assert len(get_all_rules(cid)) == 0
    assert len(get_all_events(cid)) == 0
    assert len(get_alerts(cid)) == 0
    assert len(get_audit_ledger(cid)) == 0
    
    audit_check = verify_ledger_integrity(cid)
    assert audit_check["is_valid"] is True
    assert audit_check["total_records"] == 0

def test_policy_creation_ai_analysis_and_auto_activation():
    """Requirement 5 & 7: Policy submitted, AI analyzes, rule validated, and automatically activated into engine."""
    comp = register_company("FinTech Ltd", "compliance@fintech.com", "SecurePwd!", "Banking")
    cid = comp["company_id"]

    policy_text = "Personal customer data must not be sent to unapproved external AI services."
    res = asyncio.run(create_policy_service(
        title="Prohibit External AI Leaks",
        industry="Banking",
        text=policy_text,
        company_id=cid
    ))

    assert res["policy"]["status"] == "ACTIVE"
    assert res["proposed_rule"] is not None
    rule = res["proposed_rule"]
    
    # Rule must be automatically ACTIVE (no human compliance officer sign-off)
    assert rule["status"] == "ACTIVE"
    assert rule["validation_status"] == "VALIDATED"
    assert rule["classification"] == "PRIVACY_VIOLATION"

    # Verify rule is in database and active
    active = get_active_rules(cid)
    assert len(active) == 1
    assert active[0]["rule_id"] == rule["rule_id"]

def test_ambiguous_policy_rejected_from_activation():
    """Requirement 7: Ambiguous or subjective policies are NOT activated."""
    comp = register_company("Bank Alpha", "sec@alpha.com", "Pass123!", "Banking")
    cid = comp["company_id"]

    vague_text = "Handle data appropriately and ensure safety."
    res = asyncio.run(create_policy_service(
        title="Vague Policy",
        industry="Banking",
        text=vague_text,
        company_id=cid
    ))

    assert res["policy"]["status"] == "NEEDS_REVIEW"
    assert res["proposed_rule"] is None
    # Zero active rules should exist
    assert len(get_active_rules(cid)) == 0

def test_multi_company_tenant_isolation():
    """Requirement 1 & 4: Company A cannot see or access Company B policies, rules, alerts, or audit records."""
    comp_a = register_company("Company A", "admin@a.com", "PassA123!", "Banking")
    comp_b = register_company("Company B", "admin@b.com", "PassB123!", "Healthcare")

    # Add policy to Company A
    asyncio.run(create_policy_service("Policy A Only", "Banking", "Personal customer data must not be sent to external AI.", comp_a["company_id"]))

    # Verify Company A has 1 policy and 1 rule
    assert len(get_all_policies(comp_a["company_id"])) == 1
    assert len(get_all_rules(comp_a["company_id"])) == 1

    # Verify Company B has 0 policies and 0 rules (isolated!)
    assert len(get_all_policies(comp_b["company_id"])) == 0
    assert len(get_all_rules(comp_b["company_id"])) == 0

def test_event_evaluation_alert_generation_and_proof_chain():
    """Requirement 8 & 9: Ingest event, match active rule, generate alert, and seal SHA-256 proof card."""
    comp = register_company("Secure Corp", "ciso@securecorp.com", "MasterPass!", "Banking")
    cid = comp["company_id"]

    # Add active rule via policy
    asyncio.run(create_policy_service("AI Guard", "Banking", "Personal customer data must not be sent to unapproved external AI.", cid))

    # Ingest violating event
    event_payload = {
        "event_id": "EVT-VIOLATION-01",
        "user_id": "EMP_101",
        "event_type": "AI_DATA_SEND",
        "resource": "CUSTOMER_DB",
        "activity_details": "Customer records transmitted to unapproved external AI service.",
        "sensitive_data": True,
        "authorized": False,
        "destination": "api.external.com"
    }

    eval_result = ingest_and_evaluate_event(event_payload, cid)
    assert eval_result["classification"] == "PRIVACY_VIOLATION"
    assert eval_result["recommended_action"] == "BLOCK_OR_ALERT"
    assert eval_result["proof_id"] is not None

    # Alert must be created
    alerts = get_alerts(cid)
    assert len(alerts) == 1
    assert alerts[0]["severity"] == "CRITICAL"

    # Ledger must contain 1 block and be cryptographically verified
    ledger = get_audit_ledger(cid)
    assert len(ledger) == 1
    assert ledger[0]["proof_id"] == eval_result["proof_id"]

    verification = verify_ledger_integrity(cid)
    assert verification["is_valid"] is True
    assert verification["total_records"] == 1

    # Tamper test
    tamper_res = simulate_tamper(cid, eval_result["proof_id"])
    assert tamper_res["status"] == "tampered"
    comp_verification = verify_ledger_integrity(cid)
    assert comp_verification["is_valid"] is False

    # Restore ledger
    restore_res = restore_ledger_integrity(cid)
    assert restore_res["status"] == "restored"
    clean_verification = verify_ledger_integrity(cid)
    assert clean_verification["is_valid"] is True
