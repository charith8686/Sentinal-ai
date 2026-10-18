import json
import datetime
from typing import Dict, Any, List, Optional
from app.database.db import get_connection
from app.services.audit_service import append_audit_record
from app.services.rule_validator import validate_and_test_rule

def get_all_rules(company_id: str) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM rules WHERE company_id = ? ORDER BY created_at DESC", (company_id,))
    rows = cursor.fetchall()
    rules = []
    for row in rows:
        rules.append({
            "rule_id": row["rule_id"],
            "company_id": row["company_id"],
            "rule_name": row["rule_name"],
            "source_policy_id": row["source_policy_id"],
            "source_clause_id": row["source_clause_id"],
            "supporting_clause_text": row["supporting_clause_text"],
            "conditions": json.loads(row["conditions_json"] or "[]"),
            "classification": row["classification"],
            "recommended_action": row["recommended_action"],
            "risk_level": row["risk_level"],
            "explanation": row["explanation"],
            "version": row["version"],
            "status": row["status"],
            "approver": row["approver"],
            "approval_time": row["approval_time"],
            "review_comment": row["review_comment"],
            "validation_status": row["validation_status"] if "validation_status" in row.keys() else "VALIDATED",
            "validation_message": row["validation_message"] if "validation_message" in row.keys() else "",
            "requires_revalidation": bool(row["requires_revalidation"]),
            "created_at": row["created_at"],
            "updated_at": row["updated_at"]
        })
    conn.close()
    return rules

def get_active_rules(company_id: str) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    # Critical security rule: ONLY status = 'ACTIVE' rules are returned to the detection engine
    cursor.execute("SELECT * FROM rules WHERE company_id = ? AND status = 'ACTIVE'", (company_id,))
    rows = cursor.fetchall()
    rules = []
    for row in rows:
        rules.append({
            "rule_id": row["rule_id"],
            "company_id": row["company_id"],
            "rule_name": row["rule_name"],
            "source_policy_id": row["source_policy_id"],
            "source_clause_id": row["source_clause_id"],
            "supporting_clause_text": row["supporting_clause_text"],
            "conditions": json.loads(row["conditions_json"] or "[]"),
            "classification": row["classification"],
            "recommended_action": row["recommended_action"],
            "risk_level": row["risk_level"],
            "explanation": row["explanation"],
            "version": row["version"],
            "status": row["status"],
            "approver": row["approver"],
            "approval_time": row["approval_time"],
            "review_comment": row["review_comment"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"]
        })
    conn.close()
    return rules

def approve_rule_service(
    rule_id: str,
    company_id: str,
    actor_id: str,
    actor_name: str,
    review_comment: Optional[str] = None
) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM rules WHERE rule_id = ? AND company_id = ?", (rule_id, company_id))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise ValueError(f"Rule {rule_id} not found or unauthorized.")
    
    val_status = row["validation_status"] if "validation_status" in row.keys() else "VALIDATED"
    if val_status != "VALIDATED":
        conn.close()
        raise ValueError(f"Rule {rule_id} cannot be activated: It failed deterministic validation or has ambiguous conditions. Please correct conditions before activation.")
    
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    comment = review_comment or "Human verified and approved for runtime engine enforcement."
    
    cursor.execute("""
        UPDATE rules
        SET status = 'ACTIVE',
            approver = ?,
            approval_time = ?,
            review_comment = ?,
            updated_at = ?
        WHERE rule_id = ? AND company_id = ?
    """, (actor_name, now_iso, comment, now_iso, rule_id, company_id))

    rule_snapshot = dict(row)
    rule_snapshot["status"] = "ACTIVE"
    rule_snapshot["approver"] = actor_name
    rule_snapshot["approval_time"] = now_iso
    rule_snapshot["conditions"] = json.loads(row["conditions_json"] or "[]")
    
    cursor.execute("""
        INSERT INTO rule_history (
            company_id, rule_id, version, action, actor_id, actor_name,
            status, validation_status, validation_message, comment, timestamp, rule_snapshot_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        company_id, rule_id, row["version"], "APPROVED", actor_id, actor_name,
        "ACTIVE", val_status, row["validation_message"], comment, now_iso,
        json.dumps(rule_snapshot)
    ))

    # Append immutable cryptographic audit evidence
    append_audit_record(
        company_id=company_id,
        event_id=rule_id,
        rule_id=rule_id,
        rule_version=row["version"],
        policy_id=row["source_policy_id"],
        policy_version="1.0",
        cited_clause_id=row["source_clause_id"],
        classification="RULE_APPROVED",
        recommended_action="ACTIVATE",
        approver_id=actor_name,
        approval_time=now_iso,
        cursor=cursor
    )

    conn.commit()
    conn.close()

    return {
        "status": "success",
        "rule_id": rule_id,
        "new_status": "ACTIVE",
        "approver": actor_name,
        "approval_time": now_iso,
        "message": f"Rule {rule_id} has been human-approved and activated into the runtime evaluation engine."
    }

def reject_rule_service(
    rule_id: str,
    company_id: str,
    actor_id: str,
    actor_name: str,
    review_comment: Optional[str] = None
) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM rules WHERE rule_id = ? AND company_id = ?", (rule_id, company_id))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise ValueError(f"Rule {rule_id} not found or unauthorized.")
    
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    comment = review_comment or "Rejected by company user."
    
    cursor.execute("""
        UPDATE rules
        SET status = 'REJECTED',
            approver = ?,
            approval_time = ?,
            review_comment = ?,
            updated_at = ?
        WHERE rule_id = ? AND company_id = ?
    """, (actor_name, now_iso, comment, now_iso, rule_id, company_id))

    rule_snapshot = dict(row)
    rule_snapshot["status"] = "REJECTED"
    rule_snapshot["approver"] = actor_name
    rule_snapshot["approval_time"] = now_iso
    rule_snapshot["conditions"] = json.loads(row["conditions_json"] or "[]")

    cursor.execute("""
        INSERT INTO rule_history (
            company_id, rule_id, version, action, actor_id, actor_name,
            status, validation_status, validation_message, comment, timestamp, rule_snapshot_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        company_id, rule_id, row["version"], "REJECTED", actor_id, actor_name,
        "REJECTED", row["validation_status"], row["validation_message"], comment, now_iso,
        json.dumps(rule_snapshot)
    ))

    # Append to SHA-256 audit ledger
    append_audit_record(
        company_id=company_id,
        event_id=rule_id,
        rule_id=rule_id,
        rule_version=row["version"],
        policy_id=row["source_policy_id"],
        policy_version="1.0",
        cited_clause_id=row["source_clause_id"],
        classification="RULE_REJECTED",
        recommended_action="REJECT",
        approver_id=actor_name,
        approval_time=now_iso,
        cursor=cursor
    )

    conn.commit()
    conn.close()

    return {
        "status": "success",
        "rule_id": rule_id,
        "new_status": "REJECTED",
        "approver": actor_name,
        "approval_time": now_iso,
        "message": f"Rule {rule_id} has been rejected and will not evaluate events."
    }

def update_rule_service(
    rule_id: str,
    company_id: str,
    actor_id: str,
    actor_name: str,
    updates: Dict[str, Any]
) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM rules WHERE rule_id = ? AND company_id = ?", (rule_id, company_id))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise ValueError(f"Rule {rule_id} not found or unauthorized.")
    
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    old_version = row["version"]
    try:
        parts = old_version.split(".")
        new_version = f"{parts[0]}.{int(parts[1]) + 1}"
    except Exception:
        new_version = f"{old_version}.1"

    # Archive previous version snapshot
    cursor.execute("""
        INSERT INTO rule_history (
            company_id, rule_id, version, action, actor_id, actor_name,
            status, validation_status, validation_message, comment, timestamp, rule_snapshot_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        company_id, rule_id, old_version, "VERSION_ARCHIVED", actor_id, actor_name,
        row["status"], row["validation_status"], row["validation_message"], "Archived prior to modification", now_iso,
        json.dumps(dict(row))
    ))

    # Build updated draft
    new_rule_name = updates.get("rule_name") or row["rule_name"]
    new_conditions = updates.get("conditions") if "conditions" in updates else json.loads(row["conditions_json"] or "[]")
    new_classification = updates.get("classification") or row["classification"]
    new_recommended_action = updates.get("recommended_action") or row["recommended_action"]
    new_risk_level = updates.get("risk_level") or row["risk_level"]
    new_explanation = updates.get("explanation") or row["explanation"]

    rule_draft = {
        "rule_id": rule_id,
        "company_id": company_id,
        "rule_name": new_rule_name,
        "source_policy_id": row["source_policy_id"],
        "source_clause_id": row["source_clause_id"],
        "supporting_clause_text": row["supporting_clause_text"],
        "conditions": new_conditions,
        "classification": new_classification,
        "recommended_action": new_recommended_action,
        "risk_level": new_risk_level,
        "explanation": new_explanation,
        "version": new_version,
        "created_at": row["created_at"],
        "updated_at": now_iso
    }

    # Revalidation required
    validation = validate_and_test_rule(rule_draft, company_id)
    validation_status = "VALIDATED" if validation["passed"] else "REJECTED"
    validation_message = validation["message"]
    # Edits must return rule to PENDING_APPROVAL before it can become active
    new_status = "PENDING_APPROVAL" if validation["passed"] else "NEEDS_REVIEW"

    cursor.execute("""
        UPDATE rules
        SET rule_name = ?,
            conditions_json = ?,
            classification = ?,
            recommended_action = ?,
            risk_level = ?,
            explanation = ?,
            version = ?,
            status = ?,
            approver = NULL,
            approval_time = NULL,
            review_comment = 'Rule edited; re-evaluation and human approval required.',
            requires_revalidation = 0,
            validation_status = ?,
            validation_message = ?,
            updated_at = ?
        WHERE rule_id = ? AND company_id = ?
    """, (
        new_rule_name, json.dumps(new_conditions), new_classification,
        new_recommended_action, new_risk_level, new_explanation, new_version,
        new_status, validation_status, validation_message, now_iso,
        rule_id, company_id
    ))

    # Log edited action in rule_history
    cursor.execute("""
        INSERT INTO rule_history (
            company_id, rule_id, version, action, actor_id, actor_name,
            status, validation_status, validation_message, comment, timestamp, rule_snapshot_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        company_id, rule_id, new_version, "EDITED", actor_id, actor_name,
        new_status, validation_status, validation_message, "Edited rule revalidated and returned to PENDING_APPROVAL", now_iso,
        json.dumps(rule_draft)
    ))

    # Log in audit ledger
    append_audit_record(
        company_id=company_id,
        event_id=rule_id,
        rule_id=rule_id,
        rule_version=new_version,
        policy_id=row["source_policy_id"],
        policy_version="1.0",
        cited_clause_id=row["source_clause_id"],
        classification="RULE_EDITED",
        recommended_action="PENDING_APPROVAL",
        approver_id=actor_name,
        approval_time=now_iso,
        cursor=cursor
    )

    conn.commit()
    conn.close()

    rule_draft["status"] = new_status
    rule_draft["validation_status"] = validation_status
    rule_draft["validation_message"] = validation_message
    return rule_draft

def get_rule_history_service(rule_id: str, company_id: str) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM rule_history
        WHERE rule_id = ? AND company_id = ?
        ORDER BY id DESC
    """, (rule_id, company_id))
    rows = cursor.fetchall()
    history = []
    for r in rows:
        history.append({
            "id": r["id"],
            "rule_id": r["rule_id"],
            "version": r["version"],
            "action": r["action"],
            "actor_id": r["actor_id"],
            "actor_name": r["actor_name"],
            "status": r["status"],
            "validation_status": r["validation_status"],
            "validation_message": r["validation_message"],
            "comment": r["comment"],
            "timestamp": r["timestamp"]
        })
    conn.close()
    return history

def delete_rule_service(rule_id: str, company_id: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM rules WHERE rule_id = ? AND company_id = ?", (rule_id, company_id))
    affected = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return affected

def delete_all_rules_service(company_id: str) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM rules WHERE company_id = ?", (company_id,))
    deleted = cursor.rowcount
    conn.commit()
    conn.close()
    return deleted
