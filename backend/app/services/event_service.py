import csv
import io
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

def import_csv_data(company_id: str, csv_content: str) -> Dict[str, Any]:
    """
    Parses user-provided CSV content, validates headers and rows,
    evaluates each event deterministically against the company's active rules,
    persists events, generates alerts for violations/suspicious actions,
    and seals each record into the company's cryptographic SHA-256 audit ledger.
    Enforces strict company multi-tenant isolation.
    """
    if not csv_content or not csv_content.strip():
        raise ValueError("The uploaded CSV file is empty.")

    # 1. Detect delimiter automatically (, or ; or \t)
    first_line = csv_content.strip().splitlines()[0] if csv_content.strip().splitlines() else ""
    delimiter = ","
    if first_line.count(";") > first_line.count(",") and first_line.count(";") > first_line.count("\t"):
        delimiter = ";"
    elif first_line.count("\t") > first_line.count(",") and first_line.count("\t") > first_line.count(";"):
        delimiter = "\t"

    f = io.StringIO(csv_content.strip())
    reader = csv.DictReader(f, delimiter=delimiter)
    
    if not reader.fieldnames:
        raise ValueError("Invalid CSV format: no header row found. Please ensure the first row contains column headers.")

    # Standardize fieldnames
    raw_headers = [h.strip() for h in reader.fieldnames if h]
    lower_headers = [h.lower() for h in raw_headers]
    
    rows = list(reader)
    if not rows:
        raise ValueError("CSV file contains headers but no data rows.")

    conn = get_connection()
    cursor = conn.cursor()

    # Active rules for this company only (strict isolation)
    active_rules = get_active_rules(company_id)

    # Get latest hash for this company's audit ledger
    cursor.execute("SELECT current_hash FROM audit_ledger WHERE company_id = ? ORDER BY id DESC LIMIT 1", (company_id,))
    last_row = cursor.fetchone()
    previous_hash = last_row["current_hash"] if last_row else GENESIS_HASH

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    imported_count = 0
    alerts_created = 0
    records = []

    for idx, row in enumerate(rows):
        # Clean row dictionary
        clean_row = {}
        for k, v in row.items():
            if k is not None:
                clean_row[k.strip().lower()] = v.strip() if isinstance(v, str) else str(v or "")

        # Extract fields with broad aliases
        raw_event_id = (
            clean_row.get("event_id") or clean_row.get("id") or clean_row.get("eventid") or 
            clean_row.get("event_number") or clean_row.get("transaction_id") or ""
        )
        if raw_event_id:
            event_id = raw_event_id
            # Guarantee global event_id uniqueness to prevent primary key collision
            cursor.execute("SELECT 1 FROM events WHERE event_id = ?", (event_id,))
            if cursor.fetchone():
                event_id = f"{event_id}-{uuid.uuid4().hex[:6].upper()}"
        else:
            event_id = f"EVT-{uuid.uuid4().hex[:6].upper()}"

        timestamp = (
            clean_row.get("timestamp") or clean_row.get("time") or clean_row.get("date") or 
            clean_row.get("datetime") or clean_row.get("created_at") or now_iso
        )
        user_id = (
            clean_row.get("user_id") or clean_row.get("user") or clean_row.get("userid") or 
            clean_row.get("username") or clean_row.get("employee_id") or clean_row.get("actor") or "SYSTEM_USER"
        )
        event_type = (
            clean_row.get("event_type") or clean_row.get("type") or clean_row.get("event") or 
            clean_row.get("action") or clean_row.get("activity_type") or clean_row.get("operation") or "GENERIC_ACCESS"
        )
        resource = (
            clean_row.get("resource") or clean_row.get("target") or clean_row.get("asset") or 
            clean_row.get("system") or clean_row.get("database") or clean_row.get("table") or "SYSTEM_RESOURCE"
        )

        activity_details = (
            clean_row.get("activity_details") or clean_row.get("details") or clean_row.get("description") or 
            clean_row.get("message") or clean_row.get("log") or clean_row.get("summary") or ""
        )
        if not activity_details:
            # Fallback synthesize from available columns
            activity_details = f"Activity {event_type} on {resource} by {user_id}"

        # Parse boolean values
        sensitive_raw = (
            clean_row.get("sensitive_data") or clean_row.get("is_sensitive") or clean_row.get("sensitive") or
            clean_row.get("pii") or clean_row.get("contains_sensitive")
        )
        sensitive_data = bool(parse_csv_boolean(sensitive_raw))

        # Run DLP scanner
        dlp_findings = scan_text_dlp(activity_details)
        if dlp_findings:
            sensitive_data = True

        auth_raw = (
            clean_row.get("authorized") or clean_row.get("is_authorized") or clean_row.get("auth") or
            clean_row.get("permitted") or clean_row.get("approved")
        )
        authorized = parse_csv_boolean(auth_raw)
        auth_db_val = 1 if authorized is True else (0 if authorized is False else None)

        policy_rule = clean_row.get("policy_rule") or clean_row.get("rule") or clean_row.get("policy") or ""

        # Destination & Region
        destination = clean_row.get("destination") or clean_row.get("endpoint") or clean_row.get("target_system")
        if not destination:
            act_lower = activity_details.lower()
            if "unapproved" in act_lower or "external" in act_lower or "ai" in act_lower:
                destination = "EXTERNAL_AI_ENDPOINT"
            else:
                destination = "INTERNAL_LINUX_SERVER"

        region = clean_row.get("region") or clean_row.get("location") or clean_row.get("country") or "EU"

        expected_classification = clean_row.get("expected_classification") or clean_row.get("classification") or ""
        expected_action = clean_row.get("expected_action") or clean_row.get("action_recommended") or ""
        expected_reason = clean_row.get("expected_reason") or clean_row.get("reason") or ""

        # Persist event with company isolation
        cursor.execute("""
            INSERT INTO events (
                event_id, company_id, timestamp, received_time, user_id, event_type,
                resource, activity_details, sensitive_data, authorized,
                policy_rule, destination, region, metadata_json,
                dlp_findings_json, expected_classification, expected_action, expected_reason, is_sample
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        """, (
            event_id, company_id, timestamp, now_iso, user_id, event_type,
            resource, activity_details, 1 if sensitive_data else 0,
            auth_db_val, policy_rule, destination, region,
            json.dumps({"source": "USER_CSV_IMPORT", "row_index": idx + 1}),
            json.dumps(dlp_findings), expected_classification, expected_action, expected_reason
        ))

        # Evaluate deterministically against this company's active rules only
        evaluation_event_dict = {
            "event_id": event_id,
            "user_id": user_id,
            "event_type": event_type,
            "resource": resource,
            "activity_details": activity_details,
            "sensitive_data": sensitive_data,
            "authorized": authorized,
            "destination": destination,
            "region": region,
            "expected_classification": expected_classification
        }
        eval_result = evaluate_event_against_rules(evaluation_event_dict, active_rules)

        # Generate Proof Card & Append to Company SHA-256 Ledger
        proof_id = f"PRF-{uuid.uuid4().hex[:8].upper()}"
        cursor.execute("SELECT 1 FROM audit_ledger WHERE proof_id = ?", (proof_id,))
        if cursor.fetchone():
            proof_id = f"PRF-{uuid.uuid4().hex[:12].upper()}"

        rule_id_str = eval_result.get("matched_rule_id") or "BASELINE_DEFAULT"
        rule_ver_str = "1.0"
        policy_id_str = eval_result.get("source_policy_id") or "BASELINE_POLICY"
        clause_id_str = eval_result.get("cited_clause_id") or "General Security Standard"
        approver_id_str = "Automated Verification"

        if eval_result.get("matched_rule_id"):
            for r in active_rules:
                if r["rule_id"] == eval_result["matched_rule_id"]:
                    rule_ver_str = r.get("version", "1.0")
                    approver_id_str = r.get("approver") or "Automated Verification"
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
                company_id, proof_id, event_id, event_timestamp, detection_timestamp,
                rule_id, rule_version, policy_id, policy_version, cited_clause_id,
                classification, recommended_action, approver_id, approval_time,
                previous_hash, current_hash, is_tampered
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        """, (
            company_id, proof_id, event_id, timestamp, now_iso,
            rule_id_str, rule_ver_str, policy_id_str, "1.0", clause_id_str,
            eval_result["classification"], eval_result["recommended_action"],
            approver_id_str, now_iso, previous_hash, current_hash
        ))

        # Advance previous_hash in the chain
        previous_hash = current_hash

        # If violation or suspicious, generate Alert record
        if eval_result.get("classification") in ["PRIVACY_VIOLATION", "SUSPICIOUS"]:
            alert_id = f"ALT-{uuid.uuid4().hex[:6].upper()}"
            cursor.execute("SELECT 1 FROM alerts WHERE alert_id = ?", (alert_id,))
            if cursor.fetchone():
                alert_id = f"ALT-{uuid.uuid4().hex[:10].upper()}"

            severity = "CRITICAL" if eval_result["classification"] == "PRIVACY_VIOLATION" else "MEDIUM"
            explanation = (
                f"Event matched rule '{eval_result.get('matched_rule_name', rule_id_str)}'. "
                f"Details: {eval_result.get('reason')}"
            )
            remediation = (
                "Block destination access and review authentication logs."
                if eval_result["classification"] == "PRIVACY_VIOLATION"
                else "Investigate user activity and verify ticketing documentation."
            )

            cursor.execute("""
                INSERT INTO alerts (
                    alert_id, company_id, event_id, severity, detection_time,
                    rule_id, rule_version, policy_id, policy_version, cited_clause_id,
                    event_details_json, explanation, recommended_remediation,
                    investigation_status, assigned_to, investigation_notes_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', NULL, '[]')
            """, (
                alert_id, company_id, event_id, severity, now_iso,
                rule_id_str, rule_ver_str, policy_id_str, "1.0", clause_id_str,
                json.dumps(evaluation_event_dict), explanation, remediation
            ))
            alerts_created += 1

        imported_count += 1
        records.append(event_id)

    conn.commit()
    conn.close()

    return {
        "status": "success",
        "imported_count": imported_count,
        "alerts_created": alerts_created,
        "audit_records_created": imported_count,
        "event_ids": records,
        "message": f"Successfully imported {imported_count} events from CSV ({alerts_created} alerts generated, {imported_count} audit records sealed in ledger)."
    }

def import_sample_csv(company_id: str) -> Dict[str, Any]:
    """
    Controlled import of benchmark test events into the authenticated company workspace.
    """
    if not os.path.exists(CSV_PATH):
        raise FileNotFoundError(f"Benchmark CSV not found at {CSV_PATH}")

    with open(CSV_PATH, "r", encoding="utf-8") as f:
        csv_content = f.read()

    return import_csv_data(company_id, csv_content)

def get_all_events(company_id: str) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM events WHERE company_id = ? ORDER BY timestamp DESC", (company_id,))
    rows = cursor.fetchall()
    events = []
    for r in rows:
        auth_val = None
        if r["authorized"] is not None:
            auth_val = bool(r["authorized"])
        events.append({
            "event_id": r["event_id"],
            "company_id": r["company_id"],
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
            "expected_reason": r["expected_reason"],
            "is_sample": bool(r["is_sample"])
        })
    conn.close()
    return events

def ingest_and_evaluate_event(event_data: Dict[str, Any], company_id: str) -> Dict[str, Any]:
    """
    Ingests an event for the authenticated company, executes DLP scanning,
    evaluates against that company's ACTIVE rules, creates alerts and cryptographic audit records.
    """
    conn = get_connection()
    cursor = conn.cursor()

    event_id = event_data.get("event_id") or f"EVT-{uuid.uuid4().hex[:6].upper()}"
    
    # Reject duplicate event_id within company
    cursor.execute("SELECT event_id FROM events WHERE event_id = ? AND company_id = ?", (event_id, company_id))
    if cursor.fetchone():
        conn.close()
        raise ValueError(f"Event integrity check failed: Duplicate event ID {event_id} already exists.")

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    timestamp = event_data.get("timestamp") or now_iso
    received_time = now_iso

    # Run DLP check
    activity_details = event_data.get("activity_details", "")
    raw_prompt = event_data.get("raw_prompt")
    scan_text = f"{activity_details} {raw_prompt or ''}".strip()
    dlp_findings = scan_text_dlp(scan_text)

    sanitized_metadata = dict(event_data.get("metadata", {}))
    if raw_prompt:
        sanitized_metadata["dlp_prompt_scanned"] = True
        sanitized_metadata["prompt_character_length"] = len(raw_prompt)

    sensitive_data = bool(event_data.get("sensitive_data", False))
    if dlp_findings:
        sensitive_data = True

    authorized = event_data.get("authorized")
    auth_db_val = 1 if authorized is True else (0 if authorized is False else None)

    destination = event_data.get("destination") or "LINUX_SERVER"
    region = event_data.get("region") or "EU"

    # Persist event
    cursor.execute("""
        INSERT INTO events (
            event_id, company_id, timestamp, received_time, user_id, event_type,
            resource, activity_details, sensitive_data, authorized,
            policy_rule, destination, region, metadata_json,
            dlp_findings_json, expected_classification, expected_action, expected_reason, is_sample
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    """, (
        event_id, company_id, timestamp, received_time, event_data.get("user_id", "ANONYMOUS"),
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

    # Evaluate deterministically against this company's ACTIVE rules only
    active_rules = get_active_rules(company_id)
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

    # Generate Proof Card & Append to Company SHA-256 Ledger
    proof_id = f"PRF-{uuid.uuid4().hex[:8].upper()}"
    
    cursor.execute("SELECT current_hash FROM audit_ledger WHERE company_id = ? ORDER BY id DESC LIMIT 1", (company_id,))
    last_row = cursor.fetchone()
    previous_hash = last_row["current_hash"] if last_row else GENESIS_HASH

    rule_id_str = eval_result.get("matched_rule_id") or "BASELINE_DEFAULT"
    rule_ver_str = "1.0"
    policy_id_str = eval_result.get("source_policy_id") or "BASELINE_POLICY"
    clause_id_str = eval_result.get("cited_clause_id") or "General Security Standard"
    approver_id_str = "Automated Engine"

    if eval_result.get("matched_rule_id"):
        for r in active_rules:
            if r["rule_id"] == eval_result["matched_rule_id"]:
                rule_ver_str = r.get("version", "1.0")
                approver_id_str = r.get("approver") or "Automated Verification"
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
            company_id, proof_id, event_id, event_timestamp, detection_timestamp,
            rule_id, rule_version, policy_id, policy_version, cited_clause_id,
            classification, recommended_action, approver_id, approval_time,
            previous_hash, current_hash, is_tampered
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    """, (
        company_id, proof_id, event_id, timestamp, now_iso,
        rule_id_str, rule_ver_str, policy_id_str, "1.0", clause_id_str,
        eval_result["classification"], eval_result["recommended_action"],
        approver_id_str, now_iso, previous_hash, current_hash
    ))

    # If event matches violation or suspicious condition, generate Alert record
    if eval_result.get("classification") in ["PRIVACY_VIOLATION", "SUSPICIOUS"]:
        alert_id = f"ALT-{uuid.uuid4().hex[:6].upper()}"
        severity = "CRITICAL" if eval_result["classification"] == "PRIVACY_VIOLATION" else "MEDIUM"
        
        explanation = (
            f"Event matched rule '{eval_result.get('matched_rule_name', rule_id_str)}'. "
            f"Details: {eval_result.get('reason')}"
        )
        remediation = (
            "Block destination access and review authentication logs."
            if eval_result["classification"] == "PRIVACY_VIOLATION"
            else "Investigate user activity and verify ticketing documentation."
        )

        cursor.execute("""
            INSERT INTO alerts (
                alert_id, company_id, event_id, severity, detection_time,
                rule_id, rule_version, policy_id, policy_version, cited_clause_id,
                event_details_json, explanation, recommended_remediation,
                investigation_status, assigned_to, investigation_notes_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', NULL, '[]')
        """, (
            alert_id, company_id, event_id, severity, now_iso,
            rule_id_str, rule_ver_str, policy_id_str, "1.0", clause_id_str,
            json.dumps(evaluation_event_dict), explanation, remediation
        ))

    conn.commit()
    conn.close()

    eval_result["proof_id"] = proof_id
    return eval_result

def delete_event_service(event_id: str, company_id: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM events WHERE event_id = ? AND company_id = ?", (event_id, company_id))
    affected = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return affected

def delete_all_events_service(company_id: str) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM events WHERE company_id = ?", (company_id,))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected

def delete_alert_service(alert_id: str, company_id: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM alerts WHERE alert_id = ? AND company_id = ?", (alert_id, company_id))
    affected = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return affected

def delete_all_alerts_service(company_id: str) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM alerts WHERE company_id = ?", (company_id,))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected

