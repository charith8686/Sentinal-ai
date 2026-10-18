import os
import json
import datetime
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, HTTPException, Query, Body, Header, Depends, status, UploadFile, File
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database.db import init_db, get_connection
from app.models.schemas import (
    CompanyRegister, CompanyLogin, PolicyCreate, EventIngest
)
from app.services.auth_service import (
    register_company, login_company, logout_company, get_company_by_token
)
from app.services.policy_service import (
    create_policy_service, get_all_policies, delete_policy_service, delete_all_policies_service
)
from app.services.rule_service import (
    get_all_rules, get_active_rules, delete_rule_service, delete_all_rules_service,
    approve_rule_service, reject_rule_service, update_rule_service, get_rule_history_service
)
from app.services.event_service import (
    import_sample_csv, import_csv_data, get_all_events, ingest_and_evaluate_event,
    delete_event_service, delete_all_events_service, delete_alert_service, delete_all_alerts_service
)
from app.services.audit_service import (
    get_audit_ledger, verify_ledger_integrity, simulate_tamper, restore_ledger_integrity,
    delete_audit_record_service, clear_audit_ledger_service
)
from app.services.alert_service import get_alerts, update_alert_investigation
from app.services.ai_service import get_ai_provider

app = FastAPI(
    title="Sentinel AI - Enterprise AI Governance & Security on LinuxONE",
    version="2.0.0",
    description="Multi-Company Isolated AI Governance & Real-Time Deterministic Compliance"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

# --- AUTHENTICATION DEPENDENCY ---
async def get_current_company(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in to your Company account."
        )
    parts = authorization.split()
    token = parts[1] if len(parts) == 2 and parts[0].lower() == "bearer" else authorization
    company = get_company_by_token(token)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid token. Please log in again."
        )
    return company

# --- AUTH ENDPOINTS ---

@app.post("/api/auth/register")
def register_endpoint(data: CompanyRegister):
    try:
        return register_company(
            name=data.name,
            email=data.email,
            password=data.password,
            industry=data.industry
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/login")
def login_endpoint(data: CompanyLogin):
    try:
        return login_company(email=data.email, password=data.password)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

@app.post("/api/auth/logout")
def logout_endpoint(authorization: Optional[str] = Header(None)):
    if authorization:
        parts = authorization.split()
        token = parts[1] if len(parts) == 2 and parts[0].lower() == "bearer" else authorization
        logout_company(token)
    return {"message": "Successfully logged out."}

@app.get("/api/auth/me")
def get_current_company_profile(company: Dict[str, Any] = Depends(get_current_company)):
    return company

# --- SYSTEM HEALTH & SETTINGS ENDPOINTS ---

@app.get("/api/health")
async def get_system_health(company: Optional[Dict[str, Any]] = None):
    # Optional auth: returns server status and honest AI connection status
    ai_provider = get_ai_provider()
    ai_status = await ai_provider.test_connection()
    return {
        "status": "ONLINE",
        "app_name": settings.app_name,
        "environment": "IBM LinuxONE Virtual Server",
        "ai_service": {
            "online": ai_status.get("connected", False),
            "provider": ai_status.get("provider", "IBM watsonx.ai"),
            "model_id": ai_status.get("model_id", "Not configured"),
            "message": ai_status.get("message", "Model provider configured.")
        },
        "linux_integration": {
            "status": "Ready",
            "log_sources": ["Linux Security Audit", "Syslog", "SMF/RACF Event Format"]
        },
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

@app.get("/api/settings/ai-status")
async def check_ai_status(company: Dict[str, Any] = Depends(get_current_company)):
    ai_provider = get_ai_provider()
    return await ai_provider.test_connection()

# --- OVERVIEW DASHBOARD ENDPOINT (MULTI-TENANT ISOLATED) ---

@app.get("/api/stats/overview")
def get_dashboard_overview(company: Dict[str, Any] = Depends(get_current_company)):
    """
    Returns only genuine records belonging to the authenticated company.
    New company returns exact zeros.
    """
    company_id = company["company_id"]
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as count FROM policies WHERE company_id = ?", (company_id,))
    total_policies = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) as count FROM rules WHERE company_id = ? AND status = 'ACTIVE'", (company_id,))
    active_rules = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) as count FROM rules WHERE company_id = ? AND status = 'PENDING_APPROVAL'", (company_id,))
    pending_rules = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) as count FROM alerts WHERE company_id = ? AND investigation_status != 'RESOLVED'", (company_id,))
    open_alerts = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) as count FROM audit_ledger WHERE company_id = ?", (company_id,))
    total_audit_records = cursor.fetchone()["count"]

    # Recent Alerts
    cursor.execute("SELECT * FROM alerts WHERE company_id = ? ORDER BY detection_time DESC LIMIT 10", (company_id,))
    recent_alerts = []
    for r in cursor.fetchall():
        recent_alerts.append({
            "alert_id": r["alert_id"],
            "event_id": r["event_id"],
            "severity": r["severity"],
            "detection_time": r["detection_time"],
            "rule_id": r["rule_id"],
            "cited_clause_id": r["cited_clause_id"],
            "explanation": r["explanation"],
            "investigation_status": r["investigation_status"]
        })

    # Active Rules summary
    cursor.execute("SELECT * FROM rules WHERE company_id = ? AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 10", (company_id,))
    active_rules_list = []
    for r in cursor.fetchall():
        active_rules_list.append({
            "rule_id": r["rule_id"],
            "rule_name": r["rule_name"],
            "source_clause_id": r["source_clause_id"],
            "risk_level": r["risk_level"],
            "status": r["status"],
            "created_at": r["created_at"]
        })

    conn.close()

    integrity = verify_ledger_integrity(company_id)

    return {
        "metrics": {
            "policies": total_policies,
            "active_rules": active_rules,
            "pending_rules": pending_rules,
            "open_alerts": open_alerts,
            "audit_records": total_audit_records
        },
        "active_rules_list": active_rules_list,
        "recent_alerts": recent_alerts,
        "system_status": {
            "environment": "IBM LinuxONE Virtual Server",
            "deterministic_engine": "Active",
            "audit_ledger": "Verified Intact" if integrity["is_valid"] else "Tamper Detected",
            "audit_is_valid": integrity["is_valid"],
            "company_name": company["name"],
            "company_id": company["company_id"]
        }
    }

# --- POLICY ENDPOINTS (COMPANY ISOLATED) ---

@app.get("/api/policies")
def list_policies(company: Dict[str, Any] = Depends(get_current_company)):
    return get_all_policies(company["company_id"])

@app.post("/api/policies")
async def submit_policy(policy_in: PolicyCreate, company: Dict[str, Any] = Depends(get_current_company)):
    return await create_policy_service(
        title=policy_in.title,
        industry=policy_in.industry or company.get("industry", "Banking"),
        text=policy_in.text,
        company_id=company["company_id"]
    )

@app.delete("/api/policies/{policy_id}")
def delete_policy(policy_id: str, company: Dict[str, Any] = Depends(get_current_company)):
    success = delete_policy_service(policy_id, company["company_id"])
    if not success:
        raise HTTPException(status_code=404, detail="Policy not found or unauthorized.")
    return {"status": "success", "message": "Policy and associated rules deleted."}

@app.delete("/api/policies")
def delete_all_policies_endpoint(company: Dict[str, Any] = Depends(get_current_company)):
    count = delete_all_policies_service(company["company_id"])
    return {"status": "success", "message": f"Deleted {count} policies and all associated rules."}

# --- RULES ENDPOINTS (COMPANY ISOLATED) ---

@app.get("/api/rules")
def list_rules(company: Dict[str, Any] = Depends(get_current_company)):
    return get_all_rules(company["company_id"])

@app.post("/api/rules/{rule_id}/approve")
def approve_rule_endpoint(
    rule_id: str,
    payload: Optional[Dict[str, Any]] = Body(default={}),
    company: Dict[str, Any] = Depends(get_current_company)
):
    try:
        review_comment = payload.get("review_comment") if payload else None
        actor_name = f"{company['name']} ({company['email']})"
        return approve_rule_service(
            rule_id=rule_id,
            company_id=company["company_id"],
            actor_id=company["company_id"],
            actor_name=actor_name,
            review_comment=review_comment
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/rules/{rule_id}/reject")
def reject_rule_endpoint(
    rule_id: str,
    payload: Optional[Dict[str, Any]] = Body(default={}),
    company: Dict[str, Any] = Depends(get_current_company)
):
    try:
        review_comment = payload.get("review_comment") if payload else None
        actor_name = f"{company['name']} ({company['email']})"
        return reject_rule_service(
            rule_id=rule_id,
            company_id=company["company_id"],
            actor_id=company["company_id"],
            actor_name=actor_name,
            review_comment=review_comment
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/api/rules/{rule_id}")
@app.patch("/api/rules/{rule_id}")
def update_rule_endpoint(
    rule_id: str,
    updates: Dict[str, Any] = Body(...),
    company: Dict[str, Any] = Depends(get_current_company)
):
    try:
        actor_name = f"{company['name']} ({company['email']})"
        return update_rule_service(
            rule_id=rule_id,
            company_id=company["company_id"],
            actor_id=company["company_id"],
            actor_name=actor_name,
            updates=updates
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/rules/{rule_id}/history")
def get_rule_history_endpoint(
    rule_id: str,
    company: Dict[str, Any] = Depends(get_current_company)
):
    return get_rule_history_service(rule_id, company["company_id"])

@app.delete("/api/rules/{rule_id}")
def delete_rule(rule_id: str, company: Dict[str, Any] = Depends(get_current_company)):
    success = delete_rule_service(rule_id, company["company_id"])
    if not success:
        raise HTTPException(status_code=404, detail="Rule not found or unauthorized.")
    return {"status": "success", "message": "Rule removed."}

@app.delete("/api/rules")
def delete_all_rules_endpoint(company: Dict[str, Any] = Depends(get_current_company)):
    count = delete_all_rules_service(company["company_id"])
    return {"status": "success", "message": f"Deleted {count} rules."}

# --- EVENTS & ALERTS ENDPOINTS (COMPANY ISOLATED) ---

@app.get("/api/events")
def list_events(company: Dict[str, Any] = Depends(get_current_company)):
    return get_all_events(company["company_id"])

@app.get("/api/events/sample-csv")
def get_sample_csv_template():
    """
    Returns the standard benchmark event dataset as a downloadable CSV template.
    """
    csv_file = os.path.join(os.path.dirname(__file__), "data", "ibm_z_sentinel_ai_sample_events.csv")
    if os.path.exists(csv_file):
        with open(csv_file, "r", encoding="utf-8") as f:
            content = f.read()
    else:
        content = "event_id,timestamp,user_id,event_type,resource,activity_details,sensitive_data,authorized,policy_rule\n"
    return PlainTextResponse(
        content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sentinel_ai_events_sample.csv"}
    )

@app.post("/api/events/import-csv")
async def import_csv_endpoint(
    file: Optional[UploadFile] = File(None),
    company: Dict[str, Any] = Depends(get_current_company)
):
    if not file or not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No CSV file was uploaded. Please select a valid .csv file to import."
        )

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file format: Only comma-separated (.csv) files are supported."
        )

    try:
        content_bytes = await file.read()
        if not content_bytes or len(content_bytes.strip()) == 0:
            raise HTTPException(status_code=400, detail="The selected CSV file is empty (0 bytes).")

        try:
            csv_text = content_bytes.decode("utf-8-sig")
        except UnicodeDecodeError:
            csv_text = content_bytes.decode("latin-1")

        return import_csv_data(company["company_id"], csv_text)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Failed to process CSV dataset: {str(e)}")

@app.post("/api/events/simulate")
def simulate_event(event_in: EventIngest, company: Dict[str, Any] = Depends(get_current_company)):
    try:
        return ingest_and_evaluate_event(event_in.dict(), company["company_id"])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/events/{event_id}")
def delete_single_event(event_id: str, company: Dict[str, Any] = Depends(get_current_company)):
    actor_name = f"{company['name']} ({company['email']})"
    success = delete_event_service(event_id, company["company_id"], actor_name=actor_name)
    if not success:
        raise HTTPException(status_code=404, detail="Event not found or unauthorized.")
    return {"status": "success", "message": "Event deleted and logged in audit ledger."}

@app.delete("/api/events")
def delete_all_events_endpoint(company: Dict[str, Any] = Depends(get_current_company)):
    actor_name = f"{company['name']} ({company['email']})"
    count = delete_all_events_service(company["company_id"], actor_name=actor_name)
    return {"status": "success", "message": f"Deleted {count} events and logged in audit ledger."}

@app.get("/api/alerts")
def list_alerts(
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    company: Dict[str, Any] = Depends(get_current_company)
):
    return get_alerts(company["company_id"], severity=severity, status=status)

@app.patch("/api/alerts/{alert_id}")
def update_alert(
    alert_id: str,
    status: Optional[str] = Body(None),
    assigned_to: Optional[str] = Body(None),
    new_note: Optional[str] = Body(None),
    company: Dict[str, Any] = Depends(get_current_company)
):
    try:
        return update_alert_investigation(
            alert_id=alert_id,
            company_id=company["company_id"],
            status=status,
            assigned_to=assigned_to,
            new_note=new_note,
            reviewer=company["name"]
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.delete("/api/alerts/{alert_id}")
def delete_single_alert(alert_id: str, company: Dict[str, Any] = Depends(get_current_company)):
    actor_name = f"{company['name']} ({company['email']})"
    success = delete_alert_service(alert_id, company["company_id"], actor_name=actor_name)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found or unauthorized.")
    return {"status": "success", "message": "Alert deleted and logged in audit ledger."}

@app.delete("/api/alerts")
def delete_all_alerts_endpoint(company: Dict[str, Any] = Depends(get_current_company)):
    actor_name = f"{company['name']} ({company['email']})"
    count = delete_all_alerts_service(company["company_id"], actor_name=actor_name)
    return {"status": "success", "message": f"Deleted {count} alerts and logged in audit ledger."}

# --- AUDIT LEDGER ENDPOINTS (COMPANY ISOLATED) ---

@app.get("/api/audit/ledger")
def list_audit_ledger(company: Dict[str, Any] = Depends(get_current_company)):
    return get_audit_ledger(company["company_id"])

@app.post("/api/audit/verify")
def verify_audit_ledger(company: Dict[str, Any] = Depends(get_current_company)):
    return verify_ledger_integrity(company["company_id"])

@app.post("/api/audit/tamper-demo")
def tamper_demo_endpoint(
    proof_id: Optional[str] = Body(None, embed=True),
    company: Dict[str, Any] = Depends(get_current_company)
):
    try:
        return simulate_tamper(company["company_id"], proof_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/audit/restore")
def restore_audit_endpoint(company: Dict[str, Any] = Depends(get_current_company)):
    return restore_ledger_integrity(company["company_id"])

@app.delete("/api/audit")
@app.delete("/api/audit/ledger")
def clear_audit_ledger_endpoint(company: Dict[str, Any] = Depends(get_current_company)):
    count = clear_audit_ledger_service(company["company_id"])
    return {"status": "success", "message": f"Cleared {count} audit ledger records."}

@app.delete("/api/audit/{proof_id}")
def delete_single_audit_record(proof_id: str, company: Dict[str, Any] = Depends(get_current_company)):
    success = delete_audit_record_service(proof_id, company["company_id"])
    if not success:
        raise HTTPException(status_code=404, detail="Audit record not found or unauthorized.")
    return {"status": "success", "message": "Audit record deleted and remaining ledger re-sealed."}



# --- MASTER WORKSPACE RESET (DELETE EVERYTHING FOR COMPANY) ---

@app.delete("/api/workspace/all")
def reset_workspace_all(company: Dict[str, Any] = Depends(get_current_company)):
    company_id = company["company_id"]
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM policies WHERE company_id = ?", (company_id,))
    policies_deleted = cursor.rowcount
    cursor.execute("DELETE FROM rules WHERE company_id = ?", (company_id,))
    rules_deleted = cursor.rowcount
    cursor.execute("DELETE FROM events WHERE company_id = ?", (company_id,))
    events_deleted = cursor.rowcount
    cursor.execute("DELETE FROM alerts WHERE company_id = ?", (company_id,))
    alerts_deleted = cursor.rowcount
    cursor.execute("DELETE FROM audit_ledger WHERE company_id = ?", (company_id,))
    audit_deleted = cursor.rowcount
    conn.commit()
    conn.close()
    return {
        "status": "success",
        "message": "Workspace reset to zero records.",
        "deleted": {
            "policies": policies_deleted,
            "rules": rules_deleted,
            "events": events_deleted,
            "alerts": alerts_deleted,
            "audit_records": audit_deleted
        }
    }

# Static frontend serving
dist_path = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
if os.path.exists(dist_path):
    app.mount("/", StaticFiles(directory=dist_path, html=True), name="static")

