import json
import datetime
from typing import Dict, Any, List, Optional
from app.database.db import get_connection

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

def delete_rule_service(rule_id: str, company_id: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM rules WHERE rule_id = ? AND company_id = ?", (rule_id, company_id))
    affected = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return affected
