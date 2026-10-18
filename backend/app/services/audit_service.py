import json
from typing import Dict, Any, List, Optional
from app.database.db import get_connection
from app.engine.hash_chain import verify_chain, GENESIS_HASH, create_proof_payload, canonical_serialize, compute_record_hash

def get_audit_ledger(company_id: str) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_ledger WHERE company_id = ? ORDER BY id ASC", (company_id,))
    rows = cursor.fetchall()
    records = []
    for r in rows:
        records.append({
            "id": r["id"],
            "company_id": r["company_id"],
            "proof_id": r["proof_id"],
            "event_id": r["event_id"],
            "event_timestamp": r["event_timestamp"],
            "detection_timestamp": r["detection_timestamp"],
            "rule_id": r["rule_id"],
            "rule_version": r["rule_version"],
            "policy_id": r["policy_id"],
            "policy_version": r["policy_version"],
            "cited_clause_id": r["cited_clause_id"],
            "classification": r["classification"],
            "recommended_action": r["recommended_action"],
            "approver_id": r["approver_id"],
            "approval_time": r["approval_time"],
            "previous_hash": r["previous_hash"],
            "current_hash": r["current_hash"],
            "is_tampered": bool(r["is_tampered"])
        })
    conn.close()
    return records

def verify_ledger_integrity(company_id: str) -> Dict[str, Any]:
    records = get_audit_ledger(company_id)
    if not records:
        return {
            "is_valid": True,
            "total_records": 0,
            "genesis_hash": GENESIS_HASH,
            "latest_hash": GENESIS_HASH,
            "first_corrupted_id": None,
            "details": "No audit records created yet for this company. Ledger is ready to seal first event."
        }

    is_valid, corrupted_id, details = verify_chain(records)
    latest_hash = records[-1]["current_hash"] if records else GENESIS_HASH
    
    return {
        "is_valid": is_valid,
        "total_records": len(records),
        "genesis_hash": GENESIS_HASH,
        "latest_hash": latest_hash,
        "first_corrupted_id": corrupted_id,
        "details": details
    }

def simulate_tamper(company_id: str, proof_id: Optional[str] = None) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()

    if proof_id:
        cursor.execute("SELECT * FROM audit_ledger WHERE proof_id = ? AND company_id = ?", (proof_id, company_id))
    else:
        cursor.execute("SELECT * FROM audit_ledger WHERE company_id = ? ORDER BY id ASC LIMIT 1", (company_id,))
    
    target = cursor.fetchone()
    if not target:
        conn.close()
        raise ValueError("No audit records available to tamper with for this company.")

    target_proof_id = target["proof_id"]
    original_classification = target["classification"]
    tampered_classification = "NORMAL" if original_classification != "NORMAL" else "PRIVACY_VIOLATION"

    cursor.execute("""
        UPDATE audit_ledger
        SET classification = ?,
            is_tampered = 1
        WHERE proof_id = ? AND company_id = ?
    """, (tampered_classification, target_proof_id, company_id))

    conn.commit()
    conn.close()

    return {
        "status": "tampered",
        "proof_id": target_proof_id,
        "original_classification": original_classification,
        "tampered_classification": tampered_classification,
        "message": f"Audit record {target_proof_id} tampered. Cryptographic SHA-256 chain will now flag mismatch."
    }

def restore_ledger_integrity(company_id: str) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_ledger WHERE company_id = ? ORDER BY id ASC", (company_id,))
    rows = cursor.fetchall()
    
    prev_hash = GENESIS_HASH
    recomputed_count = 0

    for r in rows:
        payload = create_proof_payload(
            event_id=r["event_id"],
            event_timestamp=r["event_timestamp"],
            detection_timestamp=r["detection_timestamp"],
            rule_id=r["rule_id"],
            rule_version=r["rule_version"],
            policy_id=r["policy_id"],
            policy_version=r["policy_version"],
            cited_clause_id=r["cited_clause_id"],
            classification=r["classification"],
            recommended_action=r["recommended_action"],
            approver_id=r["approver_id"],
            approval_time=r["approval_time"]
        )
        canonical_str = canonical_serialize(payload)
        curr_hash = compute_record_hash(canonical_str, prev_hash)

        cursor.execute("""
            UPDATE audit_ledger
            SET previous_hash = ?,
                current_hash = ?,
                is_tampered = 0
            WHERE id = ? AND company_id = ?
        """, (prev_hash, curr_hash, r["id"], company_id))
        
        prev_hash = curr_hash
        recomputed_count += 1

    conn.commit()
    conn.close()

    return {
        "status": "restored",
        "records_re_sealed": recomputed_count,
        "latest_hash": prev_hash,
        "message": "Company audit ledger re-sealed with consistent SHA-256 hashes."
    }

def delete_audit_record_service(proof_id: str, company_id: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT proof_id FROM audit_ledger WHERE proof_id = ? AND company_id = ?", (proof_id, company_id))
    if not cursor.fetchone():
        conn.close()
        return False
    cursor.execute("DELETE FROM audit_ledger WHERE proof_id = ? AND company_id = ?", (proof_id, company_id))
    conn.commit()
    conn.close()
    # Recalculate remaining chain so deletion does not leave a broken cryptographic chain
    restore_ledger_integrity(company_id)
    return True

def clear_audit_ledger_service(company_id: str) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM audit_ledger WHERE company_id = ?", (company_id,))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected

def append_audit_record(
    company_id: str,
    event_id: str,
    rule_id: str = "GOVERNANCE",
    rule_version: str = "1.0",
    policy_id: str = "POLICY",
    policy_version: str = "1.0",
    cited_clause_id: str = "Internal Governance",
    classification: str = "AUDIT_RECORD",
    recommended_action: str = "RECORD_LOGGED",
    approver_id: str = "System",
    approval_time: Optional[str] = None,
    event_timestamp: Optional[str] = None,
    detection_timestamp: Optional[str] = None,
    proof_id: Optional[str] = None,
    cursor = None
) -> Dict[str, Any]:
    import uuid
    import datetime
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    evt_time = event_timestamp or now_iso
    det_time = detection_timestamp or now_iso
    app_time = approval_time or det_time
    pid = proof_id or f"PRF-{uuid.uuid4().hex[:6].upper()}"

    close_conn = False
    if cursor is None:
        conn = get_connection()
        cursor = conn.cursor()
        close_conn = True
    else:
        conn = None

    cursor.execute("SELECT current_hash FROM audit_ledger WHERE company_id = ? ORDER BY id DESC LIMIT 1", (company_id,))
    last_row = cursor.fetchone()
    prev_hash = last_row["current_hash"] if last_row else GENESIS_HASH

    payload = create_proof_payload(
        event_id=event_id,
        event_timestamp=evt_time,
        detection_timestamp=det_time,
        rule_id=rule_id,
        rule_version=rule_version,
        policy_id=policy_id,
        policy_version=policy_version,
        cited_clause_id=cited_clause_id,
        classification=classification,
        recommended_action=recommended_action,
        approver_id=approver_id,
        approval_time=app_time
    )
    canonical_str = canonical_serialize(payload)
    curr_hash = compute_record_hash(canonical_str, prev_hash)

    cursor.execute("""
        INSERT INTO audit_ledger (
            company_id, proof_id, event_id, event_timestamp, detection_timestamp,
            rule_id, rule_version, policy_id, policy_version, cited_clause_id,
            classification, recommended_action, approver_id, approval_time,
            previous_hash, current_hash, is_tampered
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    """, (
        company_id, pid, event_id, evt_time, det_time,
        rule_id, rule_version, policy_id, policy_version, cited_clause_id,
        classification, recommended_action, approver_id, app_time,
        prev_hash, curr_hash
    ))

    if close_conn and conn:
        conn.commit()
        conn.close()

    return {
        "proof_id": pid,
        "company_id": company_id,
        "event_id": event_id,
        "current_hash": curr_hash,
        "previous_hash": prev_hash
    }


