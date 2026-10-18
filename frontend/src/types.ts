// Shared Data Types for Sentinel AI
export interface CompanyProfile {
  company_id: string;
  name: string;
  email: string;
  industry: string;
  token?: string;
}

export interface ClauseReference {
  clause_id: string;
  standard: string;
  section: string;
  title: string;
  text: string;
  relevance_score: number;
}

export interface Policy {
  policy_id: string;
  company_id?: string;
  title: string;
  industry: string;
  text: string;
  version: string;
  status: 'ACTIVE' | 'DRAFT' | 'NEEDS_REVIEW';
  clauses: ClauseReference[];
  missing_info_reason?: string | null;
  clarification_questions?: string[];
  created_at: string;
}

export interface RuleCondition {
  field: string;
  operator: string;
  value: any;
}

export interface Rule {
  rule_id: string;
  company_id?: string;
  rule_name: string;
  source_policy_id: string;
  source_clause_id: string;
  supporting_clause_text: string;
  conditions: RuleCondition[];
  classification: string;
  recommended_action: string;
  risk_level: string;
  explanation: string;
  version: string;
  status: 'ACTIVE' | 'REJECTED' | 'DRAFT';
  approver?: string | null;
  approval_time?: string | null;
  review_comment?: string | null;
  validation_status?: string;
  validation_message?: string;
  requires_revalidation?: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventItem {
  event_id: string;
  company_id?: string;
  timestamp: string;
  received_time?: string;
  user_id: string;
  event_type: string;
  resource: string;
  activity_details: string;
  sensitive_data: boolean;
  authorized: boolean | null;
  policy_rule?: string | null;
  destination?: string | null;
  region?: string;
  metadata?: Record<string, any>;
  dlp_findings?: Array<{ pattern_name: string; match_count: number }>;
  expected_classification?: string | null;
  expected_action?: string | null;
  expected_reason?: string | null;
  is_sample?: boolean;
}

export interface AlertItem {
  alert_id: string;
  company_id?: string;
  event_id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  detection_time: string;
  rule_id: string;
  rule_version: string;
  policy_id: string;
  policy_version: string;
  cited_clause_id: string;
  event_details: Record<string, any>;
  explanation: string;
  recommended_remediation: string;
  investigation_status: 'OPEN' | 'INVESTIGATING' | 'REMEDIATED' | 'RESOLVED';
  assigned_to?: string | null;
  investigation_notes?: Array<{ author: string; timestamp: string; text: string }>;
}

export interface ProofCardItem {
  id?: number;
  company_id?: string;
  proof_id: string;
  event_id: string;
  event_timestamp: string;
  detection_timestamp: string;
  rule_id: string;
  rule_version: string;
  policy_id: string;
  policy_version: string;
  cited_clause_id: string;
  classification: string;
  recommended_action: string;
  approver_id: string;
  approval_time?: string | null;
  previous_hash: string;
  current_hash: string;
  is_tampered?: boolean;
}

export interface AuditVerification {
  is_valid: boolean;
  total_records: number;
  genesis_hash: string;
  latest_hash: string;
  first_corrupted_id?: string | null;
  details: string;
}

export interface DashboardOverview {
  metrics: {
    policies: number;
    active_rules: number;
    open_alerts: number;
    audit_records: number;
  };
  active_rules_list: Array<{
    rule_id: string;
    rule_name: string;
    source_clause_id: string;
    risk_level: string;
    status: string;
    created_at: string;
  }>;
  recent_alerts: Array<{
    alert_id: string;
    event_id: string;
    severity: string;
    detection_time: string;
    rule_id: string;
    cited_clause_id: string;
    explanation: string;
    investigation_status: string;
  }>;
  system_status: {
    environment: string;
    deterministic_engine: string;
    audit_ledger: string;
    audit_is_valid: boolean;
    company_name: string;
    company_id: string;
  };
}

export interface SystemHealth {
  status: string;
  app_name: string;
  environment: string;
  ai_service: {
    online: boolean;
    provider: string;
    model_id: string;
    message: string;
  };
  linux_integration: {
    status: string;
    log_sources: string[];
  };
  timestamp: string;
}
