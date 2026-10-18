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
    cursor.execute("DELETE FROM audit_ledger WHERE proof_id = ? AND company_id = ?", (proof_id, company_id))
    affected = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return affected

def clear_audit_ledger_service(company_id: str) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM audit_ledger WHERE company_id = ?", (company_id,))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected

