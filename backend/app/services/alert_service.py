import json
import datetime
from typing import Dict, Any, List, Optional
from app.database.db import get_connection

def get_alerts(
    severity: Optional[str] = None,
    status: Optional[str] = None
) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM alerts WHERE 1=1"
    params = []

    if severity:
        query += " AND severity = ?"
        params.append(severity)
    if status:
        query += " AND investigation_status = ?"
        params.append(status)

    query += " ORDER BY detection_time DESC"
    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()
    alerts = []
    for r in rows:
        alerts.append({
            "alert_id": r["alert_id"],
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
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    new_note: Optional[str] = None,
    reviewer: str = "SOC Reviewer"
) -> Dict[str, Any]:
    """
    Updates investigation workflow on an alert.
    CRITICAL: Preserves the original compliance verdict and audit proof record unchanged!
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM alerts WHERE alert_id = ?", (alert_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise ValueError(f"Alert {alert_id} not found.")

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
        WHERE alert_id = ?
    """, (updated_status, updated_assignee, json.dumps(notes), alert_id))

    conn.commit()
    conn.close()

    return {
        "alert_id": alert_id,
        "investigation_status": updated_status,
        "assigned_to": updated_assignee,
        "notes_count": len(notes)
    }
