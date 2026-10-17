export interface ClauseReference {
  clause_id: string;
  standard: string;
  section: string;
  title: string;
  text: string;
  relevance_score?: number;
}

export interface Policy {
  policy_id: string;
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
  rule_name: string;
  source_policy_id: string;
  source_clause_id: string;
  supporting_clause_text: string;
  conditions: RuleCondition[];
  classification: string;
  recommended_action: string;
  risk_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  explanation: string;
  version: string;
  status: 'DRAFT' | 'NEEDS_REVIEW' | 'PENDING_APPROVAL' | 'APPROVED' | 'ACTIVE' | 'REJECTED' | 'INACTIVE';
  approver?: string | null;
  approval_time?: string | null;
  review_comment?: string | null;
  requires_revalidation?: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventItem {
  event_id: string;
  timestamp: string;
  received_time: string;
  user_id: string;
  event_type: string;
  resource: string;
  activity_details: string;
  sensitive_data: boolean;
  authorized: boolean | null;
  policy_rule?: string | null;
  destination?: string | null;
  region?: string | null;
  metadata?: Record<string, any>;
  dlp_findings?: Array<{
    category: string;
    matches_count: number;
    sample_masked: string;
    risk: string;
  }>;
  expected_classification?: string | null;
  expected_action?: string | null;
  expected_reason?: string | null;
}

export interface AlertItem {
  alert_id: string;
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
  investigation_notes?: Array<{
    author: string;
    timestamp: string;
    text: string;
  }>;
}

export interface ProofCardItem {
  id: number;
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

export interface SystemHealth {
  status: string;
  app_name: string;
  environment: string;
  ibm_z_architecture: string;
  governing_principles: string[];
  degraded_mode: {
    ai_service_online: boolean;
    ai_provider: string;
    impact: string;
  };
  current_reviewer: string;
  current_industry: string;
  timestamp: string;
}

export interface DashboardOverview {
  total_policies: number;
  active_rules: number;
  pending_reviews: number;
  events_evaluated: number;
  violations_detected: number;
  audit_verification_status: string;
  tampered_blocks_count: number;
  severity_distribution: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  recent_alerts: any[];
  pending_rules_attention: any[];
  performance_metrics: {
    p50_latency_ms: number;
    p95_latency_ms: number;
    rule_engine_throughput: string;
    sensor_health: Record<string, string>;
  };
}
