import csv
import json
import os
import uuid
import datetime
from typing import Dict, Any, List, Optional
from app.database.db import get_connection
from app.engine.deterministic_engine import evaluate_event_against_rules
from app.engine.advisory_scorer import score_event_advisory_anomaly
from app.engine.dlp_scanner import scan_text_dlp, evaluate_ai_destination
from app.engine.hash_chain import (
    create_proof_payload,
    canonical_serialize,
    compute_record_hash,
    GENESIS_HASH
)
from app.services.rule_service import get_active_rules

CSV_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "ibm_z_sentinel_ai_sample_events.csv")

def parse_csv_boolean(val: Any) -> Optional[bool]:
    if val is None:
        return None
    s = str(val).strip().lower()
    if s in ["true", "1", "yes", "t"]:
        return True
    if s in ["false", "0", "no", "f"]:
        return False
    return None

def import_sample_csv() -> Dict[str, Any]:
    """
    Imports and validates ibm_z_sentinel_ai_sample_events.csv into persistent database.
    Prevents duplicate event insertion.
    """
    if not os.path.exists(CSV_PATH):
        raise FileNotFoundError(f"Sample CSV not found at {CSV_PATH}")

    conn = get_connection()
    cursor = conn.cursor()

    imported = 0
    skipped = 0
    records = []

    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            event_id = row["event_id"].strip()
            
            # Check if event already exists
            cursor.execute("SELECT event_id FROM events WHERE event_id = ?", (event_id,))
            if cursor.fetchone():
                skipped += 1
                continue

            timestamp = row.get("timestamp", "").strip()
            received_time = datetime.datetime.now(datetime.timezone.utc).isoformat()
            user_id = row.get("user_id", "").strip()
            event_type = row.get("event_type", "").strip()
            resource = row.get("resource", "").strip()
            activity_details = row.get("activity_details", "").strip()
            sensitive_data = bool(parse_csv_boolean(row.get("sensitive_data")))
            authorized = parse_csv_boolean(row.get("authorized"))
            policy_rule = row.get("policy_rule", "").strip()
            expected_classification = row.get("expected_classification", "").strip()
            expected_action = row.get("expected_action", "").strip()
            expected_reason = row.get("expected_reason", "").strip()

            dlp_findings = scan_text_dlp(activity_details)

            cursor.execute("""
                INSERT INTO events (
                    event_id, timestamp, received_time, user_id, event_type,
                    resource, activity_details, sensitive_data, authorized,
                    policy_rule, destination, region, metadata_json,
                    dlp_findings_json, expected_classification, expected_action, expected_reason
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event_id, timestamp, received_time, user_id, event_type,
                resource, activity_details, 1 if sensitive_data else 0,
                1 if authorized is True else (0 if authorized is False else None),
                policy_rule, "INTERNAL_IBM_Z", "EU", json.dumps({"source": "SMF/RACF_SIMULATOR"}),
                json.dumps(dlp_findings), expected_classification, expected_action, expected_reason
            ))

            imported += 1
            records.append(event_id)

    conn.commit()
    conn.close()

    return {
        "status": "success",
        "imported_count": imported,
        "skipped_existing_count": skipped,
        "event_ids": records
    }

def get_all_events() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM events ORDER BY timestamp ASC")
    rows = cursor.fetchall()
    events = []
    for r in rows:
        auth_val = None
        if r["authorized"] is not None:
            auth_val = bool(r["authorized"])
        events.append({
            "event_id": r["event_id"],
            "timestamp": r["timestamp"],
            "received_time": r["received_time"],
            "user_id": r["user_id"],
            "event_type": r["event_type"],
            "resource": r["resource"],
            "activity_details": r["activity_details"],
            "sensitive_data": bool(r["sensitive_data"]),
            "authorized": auth_val,
            "policy_rule": r["policy_rule"],
            "destination": r["destination"],
            "region": r["region"],
            "metadata": json.loads(r["metadata_json"] or "{}"),
            "dlp_findings": json.loads(r["dlp_findings_json"] or "[]"),
            "expected_classification": r["expected_classification"],
            "expected_action": r["expected_action"],
            "expected_reason": r["expected_reason"]
        })
    conn.close()
    return events

def ingest_and_evaluate_event(event_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Ingests an event, performs integrity checks, DLP scanning, deterministic rule evaluation,
    and appends alerts & proof cards when appropriate.
    """
    conn = get_connection()
    cursor = conn.cursor()

    event_id = event_data.get("event_id") or f"EVT-{uuid.uuid4().hex[:6].upper()}"
    
    # 1. Integrity check: reject duplicate event_id
    cursor.execute("SELECT event_id FROM events WHERE event_id = ?", (event_id,))
    if cursor.fetchone():
        conn.close()
        raise ValueError(f"Event integrity check failed: Duplicate event_id {event_id} rejected to prevent replay.")

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    timestamp = event_data.get("timestamp") or now_iso
    received_time = now_iso

    # Run DLP check
    activity_details = event_data.get("activity_details", "")
    raw_prompt = event_data.get("raw_prompt")
    scan_text = f"{activity_details} {raw_prompt or ''}".strip()
    dlp_findings = scan_text_dlp(scan_text)

    # Sanitize: confidential content is NEVER stored
    sanitized_metadata = dict(event_data.get("metadata", {}))
    if raw_prompt:
        sanitized_metadata["dlp_prompt_scanned"] = True
        sanitized_metadata["prompt_character_length"] = len(raw_prompt)

    sensitive_data = bool(event_data.get("sensitive_data", False))
    if dlp_findings:
        sensitive_data = True

    authorized = event_data.get("authorized")
    auth_db_val = 1 if authorized is True else (0 if authorized is False else None)

    destination = event_data.get("destination") or "IBM_Z_MAINFRAME"
    region = event_data.get("region") or "EU"

    # Persist event
    cursor.execute("""
        INSERT INTO events (
            event_id, timestamp, received_time, user_id, event_type,
            resource, activity_details, sensitive_data, authorized,
            policy_rule, destination, region, metadata_json,
            dlp_findings_json, expected_classification, expected_action, expected_reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        event_id, timestamp, received_time, event_data.get("user_id", "ANONYMOUS"),
        event_data.get("event_type", "GENERIC_ACCESS"),
        event_data.get("resource", "DATABASE"),
        activity_details,
        1 if sensitive_data else 0,
        auth_db_val,
        event_data.get("policy_rule"),
        destination,
        region,
        json.dumps(sanitized_metadata),
        json.dumps(dlp_findings),
        event_data.get("expected_classification"),
        event_data.get("expected_action"),
        event_data.get("expected_reason")
    ))

    # 2. Deterministic Rule Evaluation against ACTIVE rules only
    active_rules = get_active_rules()
    evaluation_event_dict = {
        "event_id": event_id,
        "user_id": event_data.get("user_id"),
        "event_type": event_data.get("event_type"),
        "resource": event_data.get("resource"),
        "activity_details": activity_details,
        "sensitive_data": sensitive_data,
        "authorized": authorized,
        "destination": destination,
        "region": region,
        "expected_classification": event_data.get("expected_classification")
    }
    
    eval_result = evaluate_event_against_rules(evaluation_event_dict, active_rules)

    # 3. Advisory Anomaly Score from MLz simulation
    ml_advisory = score_event_advisory_anomaly(evaluation_event_dict)

    # 4. Generate Proof Card & Append to SHA-256 Ledger for relevant events
    proof_id = f"PRF-{uuid.uuid4().hex[:8].upper()}"
    
    # Query latest hash from audit_ledger
    cursor.execute("SELECT current_hash FROM audit_ledger ORDER BY id DESC LIMIT 1")
    last_row = cursor.fetchone()
    previous_hash = last_row["current_hash"] if last_row else GENESIS_HASH

    rule_id_str = eval_result.get("matched_rule_id") or "BASELINE_DEFAULT"
    rule_ver_str = "1.0"
    policy_id_str = eval_result.get("source_policy_id") or "BASELINE_POLICY"
    clause_id_str = eval_result.get("cited_clause_id") or "ENT-BASE-01"
    approver_id_str = "SYSTEM_AUTOMATION"

    # If matched rule, get its approver
    if eval_result.get("matched_rule_id"):
        for r in active_rules:
            if r["rule_id"] == eval_result["matched_rule_id"]:
                rule_ver_str = r.get("version", "1.0")
                approver_id_str = r.get("approver") or "SECADMIN_APPROVAL"
                break

    proof_payload = create_proof_payload(
        event_id=event_id,
        event_timestamp=timestamp,
        detection_timestamp=now_iso,
        rule_id=rule_id_str,
        rule_version=rule_ver_str,
        policy_id=policy_id_str,
        policy_version="1.0",
        cited_clause_id=clause_id_str,
        classification=eval_result["classification"],
        recommended_action=eval_result["recommended_action"],
        approver_id=approver_id_str,
        approval_time=now_iso
    )

    canonical_str = canonical_serialize(proof_payload)
    current_hash = compute_record_hash(canonical_str, previous_hash)

    cursor.execute("""
        INSERT INTO audit_ledger (
            proof_id, event_id, event_timestamp, detection_timestamp,
            rule_id, rule_version, policy_id, policy_version,
            cited_clause_id, classification, recommended_action,
            approver_id, approval_time, previous_hash, current_hash, is_tampered
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    """, (
        proof_id, event_id, timestamp, now_iso,
        rule_id_str, rule_ver_str, policy_id_str, "1.0",
        clause_id_str, eval_result["classification"], eval_result["recommended_action"],
        approver_id_str, now_iso, previous_hash, current_hash
    ))

    # 5. Create Alert if classification is not NORMAL
    alert_obj = None
    if eval_result["classification"] in ["PRIVACY_VIOLATION", "SUSPICIOUS", "NEEDS_HUMAN_REVIEW"]:
        alert_id = f"ALT-{uuid.uuid4().hex[:6].upper()}"
        explanation = (
            f"Event {event_id} triggered policy control grounded in {clause_id_str}. "
            f"Details: {eval_result['reason']} "
            f"MLz Advisory Risk: {ml_advisory['advisory_tier']} ({ml_advisory['advisory_score']})."
        )
        remediation = (
            "Initiate immediate access revocation or security review. "
            "Inspect user session on IBM Z SMF queue and notify compliance reviewer."
        )

        cursor.execute("""
            INSERT INTO alerts (
                alert_id, event_id, severity, detection_time,
                rule_id, rule_version, policy_id, policy_version,
                cited_clause_id, event_details_json, explanation,
                recommended_remediation, investigation_status, assigned_to, investigation_notes_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', 'Unassigned', '[]')
        """, (
            alert_id, event_id, eval_result["risk_level"], now_iso,
            rule_id_str, rule_ver_str, policy_id_str, "1.0",
            clause_id_str, json.dumps(evaluation_event_dict), explanation,
            remediation
        ))

        alert_obj = {
            "alert_id": alert_id,
            "event_id": event_id,
            "severity": eval_result["risk_level"],
            "detection_time": now_iso,
            "explanation": explanation
        }

    conn.commit()
    conn.close()

    eval_result["proof_id"] = proof_id
    eval_result["advisory_anomaly_score"] = ml_advisory["advisory_score"]
    eval_result["advisory_context"] = ml_advisory
    eval_result["alert"] = alert_obj

    return eval_result
