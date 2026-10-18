import os
import json
import datetime
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, HTTPException, Query, Body, Header, Depends, status, UploadFile, File
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
    create_policy_service, get_all_policies, delete_policy_service
)
from app.services.rule_service import (
    get_all_rules, get_active_rules, delete_rule_service
)
from app.services.event_service import (
    import_sample_csv, import_csv_data, get_all_events, ingest_and_evaluate_event
)
from app.services.audit_service import (
    get_audit_ledger, verify_ledger_integrity, simulate_tamper, restore_ledger_integrity
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

# --- RULES ENDPOINTS (COMPANY ISOLATED) ---

@app.get("/api/rules")
def list_rules(company: Dict[str, Any] = Depends(get_current_company)):
    return get_all_rules(company["company_id"])

@app.delete("/api/rules/{rule_id}")
def delete_rule(rule_id: str, company: Dict[str, Any] = Depends(get_current_company)):
    success = delete_rule_service(rule_id, company["company_id"])
    if not success:
        raise HTTPException(status_code=404, detail="Rule not found or unauthorized.")
    return {"status": "success", "message": "Rule removed."}

# --- EVENTS & ALERTS ENDPOINTS (COMPANY ISOLATED) ---

@app.get("/api/events")
def list_events(company: Dict[str, Any] = Depends(get_current_company)):
    return get_all_events(company["company_id"])

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
        if not content_bytes:
            raise HTTPException(status_code=400, detail="The selected CSV file is empty.")

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
        raise HTTPException(status_code=500, detail=f"Failed to import dataset: {str(e)}")

@app.post("/api/events/simulate")
def simulate_event(event_in: EventIngest, company: Dict[str, Any] = Depends(get_current_company)):
    try:
        return ingest_and_evaluate_event(event_in.dict(), company["company_id"])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

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

# Static frontend serving
dist_path = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
if os.path.exists(dist_path):
    app.mount("/", StaticFiles(directory=dist_path, html=True), name="static")
