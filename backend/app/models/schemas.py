from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

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
    industry: str = "Banking"
    text: str

class Policy(BaseModel):
    policy_id: str
    title: str
    industry: str
    text: str
    version: str = "1.0"
    status: str = "ACTIVE" # ACTIVE, DRAFT, NEEDS_REVIEW
    clauses: List[ClauseReference] = []
    missing_info_reason: Optional[str] = None
    clarification_questions: List[str] = []
    created_at: str

# --- RULE SCHEMAS ---
class RuleCondition(BaseModel):
    field: str
    operator: str  # "==", "!=", "in", "not_in", ">", "<", "contains"
    value: Any

class RuleCreate(BaseModel):
    rule_id: Optional[str] = None
    rule_name: str
    source_policy_id: str
    source_clause_id: str
    supporting_clause_text: str
    conditions: List[Dict[str, Any]]
    classification: str # PRIVACY_VIOLATION, SUSPICIOUS, NORMAL, NEEDS_HUMAN_REVIEW
    recommended_action: str # BLOCK_OR_ALERT, INVESTIGATE, ALLOW, HUMAN_REVIEW, ALERT_AND_REVIEW
    risk_level: str # CRITICAL, HIGH, MEDIUM, LOW
    explanation: str

class Rule(BaseModel):
    rule_id: str
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
    status: str = "DRAFT" # DRAFT, NEEDS_REVIEW, PENDING_APPROVAL, APPROVED, ACTIVE, REJECTED, INACTIVE
    approver: Optional[str] = None
    approval_time: Optional[str] = None
    review_comment: Optional[str] = None
    requires_revalidation: bool = False
    created_at: str
    updated_at: str

class RuleApprovalRequest(BaseModel):
    decision: str # "APPROVE" or "REJECT"
    comment: Optional[str] = None
    reviewer: Optional[str] = None

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
    expected_classification: Optional[str] = None
    expected_action: Optional[str] = None
    expected_reason: Optional[str] = None

class Event(BaseModel):
    event_id: str
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
    expected_classification: Optional[str] = None
    expected_action: Optional[str] = None
    expected_reason: Optional[str] = None

# --- EVALUATION AND ALERT SCHEMAS ---
class EvaluationResult(BaseModel):
    event_id: str
    matched_rule_id: Optional[str] = None
    matched_rule_name: Optional[str] = None
    classification: str
    recommended_action: str
    risk_level: str
    reason: str
    cited_clause_id: Optional[str] = None
    source_policy_id: Optional[str] = None
    proof_id: Optional[str] = None
    latency_ms: float
    advisory_anomaly_score: float = 0.05
    is_mismatch: bool = False
    expected_classification: Optional[str] = None

class Alert(BaseModel):
    alert_id: str
    event_id: str
    severity: str # CRITICAL, HIGH, MEDIUM, LOW
    detection_time: str
    rule_id: str
    rule_version: str
    policy_id: str
    policy_version: str
    cited_clause_id: str
    event_details: Dict[str, Any]
    explanation: str
    recommended_remediation: str
    investigation_status: str = "OPEN" # OPEN, INVESTIGATING, REMEDIATED, RESOLVED
    assigned_to: Optional[str] = None
    investigation_notes: List[Dict[str, str]] = []

# --- AUDIT AND PROOF SCHEMAS ---
class ProofCard(BaseModel):
    proof_id: str
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

# --- BACKTEST SCHEMAS ---
class BacktestResult(BaseModel):
    rule_id: str
    rule_name: str
    events_evaluated: int
    correct_detections: int
    missed_violations: int
    false_positives: int
    pass_rate_percent: float
    catches: int
    evaluations: List[Dict[str, Any]]
