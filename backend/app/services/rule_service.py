import json
import datetime
from typing import Dict, Any, List, Optional
from app.database.db import get_connection

def get_all_rules() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM rules ORDER BY created_at DESC")
    rows = cursor.fetchall()
    rules = []
    for row in rows:
        rules.append({
            "rule_id": row["rule_id"],
            "rule_name": row["rule_name"],
            "source_policy_id": row["source_policy_id"],
            "source_clause_id": row["source_clause_id"],
            "supporting_clause_text": row["supporting_clause_text"],
            "conditions": json.loads(row["conditions_json"]),
            "classification": row["classification"],
            "recommended_action": row["recommended_action"],
            "risk_level": row["risk_level"],
            "explanation": row["explanation"],
            "version": row["version"],
            "status": row["status"],
            "approver": row["approver"],
            "approval_time": row["approval_time"],
            "review_comment": row["review_comment"],
            "requires_revalidation": bool(row["requires_revalidation"]),
            "created_at": row["created_at"],
            "updated_at": row["updated_at"]
        })
    conn.close()
    return rules

def get_active_rules() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM rules WHERE status = 'ACTIVE'")
    rows = cursor.fetchall()
    rules = []
    for row in rows:
        rules.append({
            "rule_id": row["rule_id"],
            "rule_name": row["rule_name"],
            "source_policy_id": row["source_policy_id"],
            "source_clause_id": row["source_clause_id"],
            "supporting_clause_text": row["supporting_clause_text"],
            "conditions": json.loads(row["conditions_json"]),
            "classification": row["classification"],
            "recommended_action": row["recommended_action"],
            "risk_level": row["risk_level"],
            "explanation": row["explanation"],
            "version": row["version"],
            "status": row["status"],
            "approver": row["approver"],
            "approval_time": row["approval_time"],
            "review_comment": row["review_comment"],
            "requires_revalidation": bool(row["requires_revalidation"]),
            "created_at": row["created_at"],
            "updated_at": row["updated_at"]
        })
    conn.close()
    return rules

def process_rule_approval(
    rule_id: str,
    decision: str,  # "APPROVE" or "REJECT"
    comment: Optional[str],
    reviewer: str
) -> Dict[str, Any]:
    """
    Executes explicit human approval or rejection on a proposed rule.
    Only approved rules can enter ACTIVE status.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM rules WHERE rule_id = ?", (rule_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise ValueError(f"Rule {rule_id} not found.")

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    new_status = "ACTIVE" if decision.upper() == "APPROVE" else "REJECTED"

    cursor.execute("""
        UPDATE rules
        SET status = ?,
            approver = ?,
            approval_time = ?,
            review_comment = ?,
            requires_revalidation = 0,
            updated_at = ?
        WHERE rule_id = ?
    """, (new_status, reviewer, now, comment or "", now, rule_id))

    conn.commit()
    conn.close()

    return {
        "rule_id": rule_id,
        "status": new_status,
        "decision": decision,
        "approver": reviewer,
        "approval_time": now,
        "comment": comment
    }

def update_rule_conditions(rule_id: str, new_conditions: List[Dict[str, Any]], explanation: Optional[str]) -> Dict[str, Any]:
    """
    If a rule is edited, it MUST require re-validation and human re-approval.
    Status reverts to NEEDS_REVIEW or PENDING_APPROVAL.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM rules WHERE rule_id = ?", (rule_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise ValueError(f"Rule {rule_id} not found.")

    current_ver = float(row["version"] or "1.0")
    new_ver = f"{current_ver + 0.1:.1f}"
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    cursor.execute("""
        UPDATE rules
        SET conditions_json = ?,
            explanation = COALESCE(?, explanation),
            version = ?,
            status = 'PENDING_APPROVAL',
            requires_revalidation = 1,
            approver = NULL,
            approval_time = NULL,
            updated_at = ?
        WHERE rule_id = ?
    """, (json.dumps(new_conditions), explanation, new_ver, now, rule_id))

    conn.commit()
    conn.close()

    return {
        "rule_id": rule_id,
        "version": new_ver,
        "status": "PENDING_APPROVAL",
        "requires_revalidation": True
    }
