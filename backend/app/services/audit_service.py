import json
from typing import Dict, Any, List, Optional
from app.database.db import get_connection
from app.engine.hash_chain import verify_chain, GENESIS_HASH, create_proof_payload, canonical_serialize, compute_record_hash

def get_audit_ledger() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_ledger ORDER BY id ASC")
    rows = cursor.fetchall()
    records = []
    for r in rows:
        records.append({
            "id": r["id"],
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

def verify_ledger_integrity() -> Dict[str, Any]:
    records = get_audit_ledger()
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

def simulate_tamper(proof_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Simulates malicious tampering with an audit record (e.g. changing classification
    from PRIVACY_VIOLATION to NORMAL, or modifying approver_id).
    This breaks the cryptographic SHA-256 chain.
    """
    conn = get_connection()
    cursor = conn.cursor()

    if proof_id:
        cursor.execute("SELECT * FROM audit_ledger WHERE proof_id = ?", (proof_id,))
    else:
        cursor.execute("SELECT * FROM audit_ledger ORDER BY id ASC LIMIT 1")
    
    target = cursor.fetchone()
    if not target:
        conn.close()
        raise ValueError("No audit records available to tamper with.")

    target_proof_id = target["proof_id"]
    original_classification = target["classification"]
    tampered_classification = "NORMAL" if original_classification != "NORMAL" else "PRIVACY_VIOLATION"

    # Intentionally update record payload WITHOUT updating its current_hash or subsequent hashes!
    cursor.execute("""
        UPDATE audit_ledger
        SET classification = ?,
            is_tampered = 1
        WHERE proof_id = ?
    """, (tampered_classification, target_proof_id))

    conn.commit()
    conn.close()

    return {
        "status": "tampered",
        "proof_id": target_proof_id,
        "original_classification": original_classification,
        "tampered_classification": tampered_classification,
        "message": f"Record {target_proof_id} tampered. SHA-256 payload no longer matches stored hash."
    }

def restore_ledger_integrity() -> Dict[str, Any]:
    """
    Recalculates and re-seals the SHA-256 chain so all links are valid again.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_ledger ORDER BY id ASC")
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
            WHERE id = ?
        """, (prev_hash, curr_hash, r["id"]))
        
        prev_hash = curr_hash
        recomputed_count += 1

    conn.commit()
    conn.close()

    return {
        "status": "restored",
        "records_re_sealed": recomputed_count,
        "latest_hash": prev_hash,
        "message": "Audit ledger re-sealed with consistent cryptographic hashes."
    }
