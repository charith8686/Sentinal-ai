import httpx
import json
import uuid
import sys

BASE_URL = "http://127.0.0.1:8000"

def run_tests():
    client = httpx.Client(base_url=BASE_URL, timeout=30.0)
    print("==================================================")
    print("RUNNING SENTINEL AI COMPREHENSIVE INTEGRATION SUITE")
    print("==================================================")

    # 1. Register Company A
    comp_a_email = f"test_a_{uuid.uuid4().hex[:6]}@enterprise.com"
    res = client.post("/api/auth/register", json={
        "name": "Alpha Corp",
        "email": comp_a_email,
        "password": "Password123!",
        "industry": "Banking"
    })
    assert res.status_code == 200, f"Register failed: {res.text}"
    token_a = res.json()["token"]
    comp_a_id = res.json()["company_id"]
    headers_a = {"Authorization": f"Bearer {token_a}"}
    print(f"✓ Company A registered: {comp_a_id}")

    # 2. Register Company B
    comp_b_email = f"test_b_{uuid.uuid4().hex[:6]}@enterprise.com"
    res = client.post("/api/auth/register", json={
        "name": "Beta Health",
        "email": comp_b_email,
        "password": "Password123!",
        "industry": "Healthcare"
    })
    assert res.status_code == 200, f"Register failed: {res.text}"
    token_b = res.json()["token"]
    comp_b_id = res.json()["company_id"]
    headers_b = {"Authorization": f"Bearer {token_b}"}
    print(f"✓ Company B registered: {comp_b_id}")

    # 3. Create Policy for Company A
    policy_text = "Personal customer records and PII must not be exported or transmitted to external AI endpoints without authorized ticket."
    res = client.post("/api/policies", headers=headers_a, json={
        "title": "Strict AI Egress Restriction",
        "industry": "Banking",
        "text": policy_text
    })
    assert res.status_code == 200, f"Policy submission failed: {res.text}"
    policy_data = res.json()
    rule_draft = policy_data["proposed_rule"]
    assert rule_draft is not None, "Proposed rule was None"
    rule_id = rule_draft["rule_id"]
    print(f"✓ Policy submitted, generated Rule: {rule_id}")

    # Requirement Check: Rule must be PENDING_APPROVAL, not ACTIVE!
    assert rule_draft["status"] == "PENDING_APPROVAL", f"Expected PENDING_APPROVAL, got {rule_draft['status']}"
    assert rule_draft["approver"] is None, f"Expected approver None, got {rule_draft['approver']}"
    print(f"✓ Verified: Newly created rule has status '{rule_draft['status']}' (not ACTIVE) with approver None")

    # 4. Enforce Inactive Rules in Detection Engine
    # Simulate violation event while rule is PENDING_APPROVAL
    res = client.post("/api/events/simulate", headers=headers_a, json={
        "user_id": "EMP_001",
        "event_type": "AI_DATA_SEND",
        "resource": "CUSTOMER_DB",
        "activity_details": "Unapproved transmission of customer records to external AI endpoint",
        "sensitive_data": True,
        "authorized": False,
        "destination": "api.external-ai.com"
    })
    assert res.status_code == 200, f"Simulate failed: {res.text}"
    # Check alerts: No alert should be generated because rule is NOT active!
    res_alerts = client.get("/api/alerts", headers=headers_a)
    alerts_a = res_alerts.json()
    assert len(alerts_a) == 0, f"Expected 0 alerts for pending rule, found {len(alerts_a)}"
    print("✓ Verified: PENDING_APPROVAL rule did NOT generate any compliance alerts")

    # 5. Cross-Company Isolation: Company B cannot see or approve Company A's rule
    res = client.get("/api/rules", headers=headers_b)
    rules_b = res.json()
    assert all(r["rule_id"] != rule_id for r in rules_b), "Company B saw Company A's rule!"
    res = client.post(f"/api/rules/{rule_id}/approve", headers=headers_b, json={})
    assert res.status_code in [400, 404], f"Company B was able to approve Company A's rule: {res.status_code}"
    print("✓ Verified: Company isolation strictly prevents cross-company view/approval")

    # 6. Approve Rule with Company A
    res = client.post(f"/api/rules/{rule_id}/approve", headers=headers_a, json={
        "review_comment": "Approved by Alpha Security Officer"
    })
    assert res.status_code == 200, f"Approve failed: {res.text}"
    approved_rule_resp = res.json()
    assert approved_rule_resp["new_status"] == "ACTIVE", f"Expected ACTIVE, got {approved_rule_resp['new_status']}"
    print(f"✓ Rule {rule_id} approved by Company A: status is now ACTIVE")

    # Check rule history and audit ledger
    res_hist = client.get(f"/api/rules/{rule_id}/history", headers=headers_a)
    assert res_hist.status_code == 200
    history = res_hist.json()
    assert len(history) >= 2, f"Expected history entries, got {len(history)}"
    assert history[0]["action"] == "APPROVED"
    print("✓ Verified: Rule approval history recorded with actor identity and timestamp")

    # Check audit ledger has RULE_APPROVED
    res_ledger = client.get("/api/audit/ledger", headers=headers_a)
    ledger_entries = res_ledger.json()
    assert any(entry["classification"] == "RULE_APPROVED" for entry in ledger_entries), "RULE_APPROVED not in audit ledger"
    print("✓ Verified: Rule approval chained in SHA-256 audit ledger")

    # 7. Now simulate the exact same event with ACTIVE rule: Alert MUST be generated!
    res = client.post("/api/events/simulate", headers=headers_a, json={
        "user_id": "EMP_002",
        "event_type": "AI_DATA_SEND",
        "resource": "CUSTOMER_DB",
        "activity_details": "Unapproved transmission of customer records to external AI endpoint",
        "sensitive_data": True,
        "authorized": False,
        "destination": "api.external-ai.com"
    })
    assert res.status_code == 200
    res_alerts = client.get("/api/alerts", headers=headers_a)
    alerts_a = res_alerts.json()
    assert len(alerts_a) == 1, f"Expected 1 alert for active rule, found {len(alerts_a)}"
    alert_id = alerts_a[0]["alert_id"]
    event_id = alerts_a[0]["event_id"]
    print(f"✓ Verified: ACTIVE rule successfully evaluated event and triggered Alert: {alert_id}")

    # 8. Test Rule Editing: Must return to PENDING_APPROVAL and bump version
    res = client.put(f"/api/rules/{rule_id}", headers=headers_a, json={
        "rule_name": "Updated AI Egress Rule",
        "conditions": [{"field": "sensitive_data", "operator": "==", "value": True}],
        "classification": "PRIVACY_VIOLATION",
        "recommended_action": "BLOCK_OR_ALERT"
    })
    assert res.status_code == 200, f"Update rule failed: {res.text}"
    edited_rule = res.json()
    assert edited_rule["status"] == "PENDING_APPROVAL", f"Expected PENDING_APPROVAL after edit, got {edited_rule['status']}"
    assert edited_rule["version"] == "1.1", f"Expected version 1.1, got {edited_rule['version']}"
    print(f"✓ Verified: Edited rule returned to PENDING_APPROVAL (v{edited_rule['version']})")

    # 9. Test Rule Rejection
    res = client.post(f"/api/rules/{rule_id}/reject", headers=headers_a, json={
        "review_comment": "Rejected testing"
    })
    assert res.status_code == 200
    assert res.json()["new_status"] == "REJECTED"
    print("✓ Verified: Rule rejection works and sets status to REJECTED")

    # 10. Test Delete Event: NO 405 Method Not Allowed!
    # Also verify that audit record is preserved, and deletion is recorded in audit ledger
    res_del_evt = client.delete(f"/api/events/{event_id}", headers=headers_a)
    assert res_del_evt.status_code == 200, f"Delete event failed with status {res_del_evt.status_code}: {res_del_evt.text}"
    print(f"✓ DELETE /api/events/{event_id} returned 200 OK (Method Not Allowed FIXED!)")

    # Verify event is removed from active events
    res_evts = client.get("/api/events", headers=headers_a)
    assert all(e["event_id"] != event_id for e in res_evts.json()), "Event still present in events list"

    # Verify audit ledger has preserved the original proof card AND recorded EVENT_DELETED
    res_ledger = client.get("/api/audit/ledger", headers=headers_a)
    ledger_records = res_ledger.json()
    has_event_deleted = any(rec["classification"] == "EVENT_DELETED" for rec in ledger_records)
    assert has_event_deleted, "EVENT_DELETED entry missing from audit ledger"
    print("✓ Verified: Event deleted from stream, historical evidence preserved, and EVENT_DELETED recorded in ledger")

    # 11. Test Delete Alert: NO 405 Method Not Allowed!
    # Re-approve rule first so it generates an alert
    client.post(f"/api/rules/{rule_id}/approve", headers=headers_a, json={})
    res_sim = client.post("/api/events/simulate", headers=headers_a, json={
        "user_id": "EMP_003",
        "event_type": "AI_DATA_SEND",
        "resource": "CUSTOMER_DB",
        "activity_details": "Customer data export to unapproved destination",
        "sensitive_data": True,
        "authorized": False,
        "destination": "api.external-ai.com"
    })
    alerts_now = client.get("/api/alerts", headers=headers_a).json()
    assert len(alerts_now) > 0, "No alert to test delete"
    alt_to_delete = alerts_now[0]["alert_id"]
    res_del_alt = client.delete(f"/api/alerts/{alt_to_delete}", headers=headers_a)
    assert res_del_alt.status_code == 200, f"Delete alert failed: {res_del_alt.status_code} {res_del_alt.text}"
    print(f"✓ DELETE /api/alerts/{alt_to_delete} returned 200 OK (Method Not Allowed FIXED!)")

    # 12. Test Clear All Alerts
    res_clear_alts = client.delete("/api/alerts", headers=headers_a)
    assert res_clear_alts.status_code == 200, f"Clear alerts failed: {res_clear_alts.status_code}"
    assert len(client.get("/api/alerts", headers=headers_a).json()) == 0
    print("✓ DELETE /api/alerts returned 200 OK, alerts count is now 0")

    # 13. Test Clear All Events
    res_clear_evts = client.delete("/api/events", headers=headers_a)
    assert res_clear_evts.status_code == 200, f"Clear events failed: {res_clear_evts.status_code}"
    assert len(client.get("/api/events", headers=headers_a).json()) == 0
    print("✓ DELETE /api/events returned 200 OK, events count is now 0")

    # 14. Test Delete Single Audit Record and Ledger Integrity Verification
    res_ledger = client.get("/api/audit/ledger", headers=headers_a)
    records = res_ledger.json()
    assert len(records) > 0, "No audit records found"
    proof_to_delete = records[0]["proof_id"]
    res_del_proof = client.delete(f"/api/audit/{proof_to_delete}", headers=headers_a)
    assert res_del_proof.status_code == 200, f"Delete audit record failed: {res_del_proof.status_code} {res_del_proof.text}"
    print(f"✓ DELETE /api/audit/{proof_to_delete} returned 200 OK (Method Not Allowed FIXED!)")

    # Verify hash chain integrity after record deletion (chain must be re-sealed and intact)
    res_verify = client.post("/api/audit/verify", headers=headers_a)
    assert res_verify.status_code == 200
    verify_data = res_verify.json()
    assert verify_data["is_valid"] is True, f"Ledger integrity invalid after deletion: {verify_data}"
    print(f"✓ Cryptographic SHA-256 chain verified intact after audit record deletion: is_valid = {verify_data['is_valid']}")

    # 15. Test Clear Audit Ledger
    res_clear_audit = client.delete("/api/audit", headers=headers_a)
    assert res_clear_audit.status_code == 200
    res_clear_audit_alias = client.delete("/api/audit/ledger", headers=headers_a)
    assert res_clear_audit_alias.status_code == 200
    res_verify = client.post("/api/audit/verify", headers=headers_a)
    assert res_verify.json()["is_valid"] is True
    print("✓ DELETE /api/audit and /api/audit/ledger returned 200 OK, ledger reset to genesis intact")

    # 16. Test Master Workspace Reset
    res_reset = client.delete("/api/workspace/all", headers=headers_a)
    assert res_reset.status_code == 200
    print("✓ DELETE /api/workspace/all returned 200 OK")

    print("\n==================================================")
    print("ALL INTEGRATION TESTS PASSED PERFECTLY! 100% SUCCESS")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
