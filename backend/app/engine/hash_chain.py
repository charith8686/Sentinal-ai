import hashlib
import json
from typing import Dict, Any, Tuple, Optional, List

GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"

def canonical_serialize(payload: Dict[str, Any]) -> str:
    """
    Produce a deterministic, canonical JSON string with sorted keys and no whitespace.
    """
    return json.dumps(payload, sort_keys=True, separators=(',', ':'))

def compute_record_hash(canonical_payload_str: str, previous_hash: str) -> str:
    """
    Compute SHA-256 hash over canonical payload concatenated with previous_hash:
    Hash_N = SHA-256(canonical_payload_str + previous_hash)
    """
    combined = (canonical_payload_str + previous_hash).encode('utf-8')
    return hashlib.sha256(combined).hexdigest()

def create_proof_payload(
    event_id: str,
    event_timestamp: str,
    detection_timestamp: str,
    rule_id: str,
    rule_version: str,
    policy_id: str,
    policy_version: str,
    cited_clause_id: str,
    classification: str,
    recommended_action: str,
    approver_id: str,
    approval_time: Optional[str]
) -> Dict[str, Any]:
    """
    Construct the immutable lineage payload for the proof card.
    """
    return {
        "event_id": str(event_id),
        "event_timestamp": str(event_timestamp),
        "detection_timestamp": str(detection_timestamp),
        "rule_id": str(rule_id),
        "rule_version": str(rule_version),
        "policy_id": str(policy_id),
        "policy_version": str(policy_version),
        "cited_clause_id": str(cited_clause_id),
        "classification": str(classification),
        "recommended_action": str(recommended_action),
        "approver_id": str(approver_id),
        "approval_time": str(approval_time or "")
    }

def verify_chain(records: List[Dict[str, Any]]) -> Tuple[bool, Optional[str], str]:
    """
    Verify the cryptographic hash chain for a list of sequential records.
    Each record must have:
      - proof_id
      - previous_hash
      - current_hash
      - payload fields (or canonical_payload)
    Returns: (is_valid, first_corrupted_proof_id, explanation)
    """
    if not records:
        return True, None, "Ledger is empty. Cryptographic root is valid."

    expected_prev_hash = GENESIS_HASH

    for idx, rec in enumerate(records):
        prev_hash_in_rec = rec.get("previous_hash")
        curr_hash_in_rec = rec.get("current_hash")
        proof_id = rec.get("proof_id", f"INDEX_{idx}")

        # 1. Verify link to previous block
        if prev_hash_in_rec != expected_prev_hash:
            return (
                False,
                proof_id,
                f"Broken chain link at proof {proof_id} (Record #{idx+1}): "
                f"expected previous hash {expected_prev_hash[:16]}..., but found {prev_hash_in_rec[:16]}..."
            )

        # 2. Extract payload to recompute canonical hash
        payload = create_proof_payload(
            event_id=rec.get("event_id", ""),
            event_timestamp=rec.get("event_timestamp", ""),
            detection_timestamp=rec.get("detection_timestamp", ""),
            rule_id=rec.get("rule_id", ""),
            rule_version=rec.get("rule_version", ""),
            policy_id=rec.get("policy_id", ""),
            policy_version=rec.get("policy_version", ""),
            cited_clause_id=rec.get("cited_clause_id", ""),
            classification=rec.get("classification", ""),
            recommended_action=rec.get("recommended_action", ""),
            approver_id=rec.get("approver_id", ""),
            approval_time=rec.get("approval_time", "")
        )

        canonical_str = canonical_serialize(payload)
        recalculated_hash = compute_record_hash(canonical_str, expected_prev_hash)

        # 3. Verify record hash integrity
        if recalculated_hash != curr_hash_in_rec:
            return (
                False,
                proof_id,
                f"Tampered record payload detected at proof {proof_id} (Record #{idx+1}): "
                f"recalculated SHA-256 {recalculated_hash[:16]}... does not match recorded {curr_hash_in_rec[:16]}..."
            )

        # Advance pointer
        expected_prev_hash = curr_hash_in_rec

    return True, None, f"All {len(records)} audit records verified. SHA-256 chain is mathematically intact."
