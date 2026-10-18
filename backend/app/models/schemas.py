from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr

# --- AUTH SCHEMAS ---
class CompanyRegister(BaseModel):
    name: str
    email: str
    password: str
    industry: str = "Banking"

class CompanyLogin(BaseModel):
    email: str
    password: str

class CompanyProfile(BaseModel):
    company_id: str
    name: str
    email: str
    industry: str

# --- POLICY SCHEMAS ---
class ClauseReference(BaseModel):
    clause_id: str
    standard: str
    section: str
    title: str
    text: str
    relevance_score: float = 1.0

class PolicyCreate(BaseModel):
    title: str
    industry: Optional[str] = "Banking"
    text: str

class Policy(BaseModel):
    policy_id: str
    company_id: str
    title: str
    industry: str
    text: str
    version: str = "1.0"
    status: str = "ACTIVE"
    clauses: List[ClauseReference] = []
    missing_info_reason: Optional[str] = None
    clarification_questions: List[str] = []
    created_at: str

# --- RULE SCHEMAS ---
class Rule(BaseModel):
    rule_id: str
    company_id: str
    rule_name: str
    source_policy_id: str
    source_clause_id: str
    supporting_clause_text: str
    conditions: List[Dict[str, Any]]
    classification: str
    recommended_action: str
    risk_level: str
    explanation: str
    version: str = "1.0"
    status: str = "ACTIVE"
    approver: Optional[str] = "Automated Verification"
    approval_time: Optional[str] = None
    validation_status: Optional[str] = "VALIDATED"
    validation_message: Optional[str] = ""
    created_at: str
    updated_at: str

# --- EVENT SCHEMAS ---
class EventIngest(BaseModel):
    event_id: Optional[str] = None
    timestamp: Optional[str] = None
    user_id: str
    event_type: str
    resource: str
    activity_details: str
    sensitive_data: bool = False
    authorized: Optional[bool] = True
    policy_rule: Optional[str] = None
    destination: Optional[str] = None
    region: Optional[str] = "EU"
    metadata: Dict[str, Any] = {}
    raw_prompt: Optional[str] = None

class Event(BaseModel):
    event_id: str
    company_id: str
    timestamp: str
    received_time: str
    user_id: str
    event_type: str
    resource: str
    activity_details: str
    sensitive_data: bool
    authorized: Optional[bool]
    policy_rule: Optional[str]
    destination: Optional[str] = None
    region: Optional[str] = "EU"
    metadata: Dict[str, Any] = {}
    dlp_findings: List[Dict[str, Any]] = []

# --- ALERT SCHEMAS ---
class Alert(BaseModel):
    alert_id: str
    company_id: str
    event_id: str
    severity: str
    detection_time: str
    rule_id: str
    rule_version: str
    policy_id: str
    policy_version: str
    cited_clause_id: str
    event_details: Dict[str, Any]
    explanation: str
    recommended_remediation: str
    investigation_status: str = "OPEN"
    assigned_to: Optional[str] = None
    investigation_notes: List[Dict[str, str]] = []

# --- AUDIT SCHEMAS ---
class ProofCard(BaseModel):
    proof_id: str
    company_id: str
    event_id: str
    event_timestamp: str
    detection_timestamp: str
    rule_id: str
    rule_version: str
    policy_id: str
    policy_version: str
    cited_clause_id: str
    classification: str
    recommended_action: str
    approver_id: str
    approval_time: Optional[str] = None
    previous_hash: str
    current_hash: str

class AuditVerificationResult(BaseModel):
    is_valid: bool
    total_records: int
    genesis_hash: str
    latest_hash: str
    first_corrupted_id: Optional[str] = None
    details: str
