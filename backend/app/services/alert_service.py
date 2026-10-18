import json
import datetime
from typing import Dict, Any, List, Optional
from app.database.db import get_connection

def get_alerts(
    company_id: str,
    severity: Optional[str] = None,
    status: Optional[str] = None
) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM alerts WHERE company_id = ?"
    params = [company_id]

    if severity and severity != "ALL":
        query += " AND severity = ?"
        params.append(severity)
    if status and status != "ALL":
        query += " AND investigation_status = ?"
        params.append(status)

    query += " ORDER BY detection_time DESC"
    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()
    alerts = []
    for r in rows:
        alerts.append({
            "alert_id": r["alert_id"],
            "company_id": r["company_id"],
            "event_id": r["event_id"],
            "severity": r["severity"],
            "detection_time": r["detection_time"],
            "rule_id": r["rule_id"],
            "rule_version": r["rule_version"],
            "policy_id": r["policy_id"],
            "policy_version": r["policy_version"],
            "cited_clause_id": r["cited_clause_id"],
            "event_details": json.loads(r["event_details_json"] or "{}"),
            "explanation": r["explanation"],
            "recommended_remediation": r["recommended_remediation"],
            "investigation_status": r["investigation_status"],
            "assigned_to": r["assigned_to"],
            "investigation_notes": json.loads(r["investigation_notes_json"] or "[]")
        })
    conn.close()
    return alerts

def update_alert_investigation(
    alert_id: str,
    company_id: str,
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    new_note: Optional[str] = None,
    reviewer: str = "Company Security Lead"
) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM alerts WHERE alert_id = ? AND company_id = ?", (alert_id, company_id))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise ValueError(f"Alert {alert_id} not found in this company workspace.")

    notes = json.loads(row["investigation_notes_json"] or "[]")
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    if new_note:
        notes.append({
            "author": reviewer,
            "timestamp": now_iso,
            "text": new_note
        })

    updated_status = status or row["investigation_status"]
    updated_assignee = assigned_to or row["assigned_to"]

    cursor.execute("""
        UPDATE alerts
        SET investigation_status = ?,
            assigned_to = ?,
            investigation_notes_json = ?
        WHERE alert_id = ? AND company_id = ?
    """, (updated_status, updated_assignee, json.dumps(notes), alert_id, company_id))

    conn.commit()
    conn.close()

    return {
        "alert_id": alert_id,
        "investigation_status": updated_status,
        "assigned_to": updated_assignee,
        "notes_count": len(notes)
    }
