import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  FileCheck,
  Activity,
  AlertTriangle,
  History,
  Lock,
  MessageSquare
} from 'lucide-react';
import { Rule } from '../types';

interface RuleRegistryProps {
  rules: Rule[];
  onApproveRule: (ruleId: string, decision: 'APPROVE' | 'REJECT', comment?: string) => Promise<any>;
  onNavigateToBacktest: (ruleId: string) => void;
  selectedRuleId?: string | null;
}

export const RuleRegistry: React.FC<RuleRegistryProps> = ({
  rules,
  onApproveRule,
  onNavigateToBacktest,
  selectedRuleId
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [inspectRule, setInspectRule] = useState<Rule | null>(
    selectedRuleId ? rules.find((r) => r.rule_id === selectedRuleId) || null : null
  );
  const [reviewComment, setReviewComment] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const filteredRules = rules.filter((r) => {
    if (activeFilter === 'ALL') return true;
    return r.status === activeFilter;
  });

  const handleDecision = async (decision: 'APPROVE' | 'REJECT') => {
    if (!inspectRule) return;
    setActionLoading(true);
    try {
      await onApproveRule(inspectRule.rule_id, decision, reviewComment);
      setInspectRule(null);
      setReviewComment('');
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="badge badge-success"><CheckCircle size={11} /> ACTIVE</span>;
      case 'PENDING_APPROVAL':
        return <span className="badge badge-warning"><Lock size={11} /> PENDING APPROVAL</span>;
      case 'NEEDS_REVIEW':
        return <span className="badge badge-warning">NEEDS REVIEW</span>;
      case 'REJECTED':
        return <span className="badge badge-danger"><XCircle size={11} /> REJECTED</span>;
      case 'DRAFT':
      default:
        return <span className="badge badge-neutral">DRAFT</span>;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>Rule Registry & Dual-Control Governance</h1>
          <p style={{ color: '#9BA8AB', fontSize: 13 }}>
            Inspect candidate compliance logic, backtest results, and enforce explicit human sign-off before runtime activation.
          </p>
        </div>

        {/* Status Filters */}
        <div style={{ display: 'flex', gap: 6 }}>
          {['ALL', 'ACTIVE', 'PENDING_APPROVAL', 'NEEDS_REVIEW', 'REJECTED'].map((filter) => (
            <button
              key={filter}
              className={`btn btn-sm ${activeFilter === filter ? 'btn-primary' : 'btn-neutral'}`}
              onClick={() => setActiveFilter(filter)}
            >
              {filter.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Rules Table */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={17} color="#10B981" /> Registered Compliance Rules ({filteredRules.length})
          </h3>
          <span style={{ fontSize: 12, color: '#9BA8AB' }}>Deterministic Runtime Controls</span>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Rule ID</th>
                <th>Rule Name</th>
                <th>Grounded Clause</th>
                <th>Risk Level</th>
                <th>Version</th>
                <th>Status</th>
                <th>Approver</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRules.map((r) => (
                <tr key={r.rule_id} style={{ backgroundColor: r.status === 'PENDING_APPROVAL' ? 'rgba(245, 158, 11, 0.05)' : undefined }}>
                  <td className="font-mono" style={{ color: '#38BDF8', fontWeight: 600 }}>{r.rule_id}</td>
                  <td style={{ fontWeight: 600 }}>{r.rule_name}</td>
                  <td>
                    <span className="badge badge-info font-mono" style={{ fontSize: 10 }}>
                      {r.source_clause_id}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${r.risk_level === 'HIGH' || r.risk_level === 'CRITICAL' ? 'badge-danger' : 'badge-warning'}`}>
                      {r.risk_level}
                    </span>
                  </td>
                  <td className="font-mono">v{r.version}</td>
                  <td>{getStatusBadge(r.status)}</td>
                  <td style={{ fontSize: 12, color: r.approver ? '#CCD0CF' : '#9BA8AB' }}>
                    {r.approver || '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => {
                          setInspectRule(r);
                          setReviewComment(r.review_comment || '');
                        }}
                      >
                        Inspect
                      </button>
                      <button
                        className="btn btn-sm btn-accent"
                        onClick={() => onNavigateToBacktest(r.rule_id)}
                        title="Backtest against historical events"
                      >
                        <Activity size={12} /> Test
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Rule Inspection & Approval Modal */}
      {inspectRule && (
        <div className="modal-overlay" onClick={() => setInspectRule(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: 17, color: '#FFFFFF' }}>{inspectRule.rule_name}</h3>
                <div style={{ fontSize: 11, color: '#9BA8AB', marginTop: 2 }}>
                  RULE ID: <span className="font-mono" style={{ color: '#38BDF8' }}>{inspectRule.rule_id}</span> • Version: v{inspectRule.version}
                </div>
              </div>
              <div>{getStatusBadge(inspectRule.status)}</div>
            </div>

            <div className="modal-body">
              {/* Side-by-Side: Clause Evidence vs Deterministic Logic */}
              <div className="grid-2" style={{ gap: 16, marginBottom: 20 }}>
                {/* Left: Grounded Clause Evidence */}
                <div style={{ backgroundColor: '#06141B', padding: 14, borderRadius: 6, border: '1px solid #4A5C6A' }}>
                  <div style={{ fontSize: 11, color: '#38BDF8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
                    Cited Legal / Regulatory Clause
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>
                    {inspectRule.source_clause_id}
                  </div>
                  <p style={{ fontSize: 12, color: '#9BA8AB', fontStyle: 'italic', lineHeight: 1.5 }}>
                    "{inspectRule.supporting_clause_text}"
                  </p>
                  <div style={{ marginTop: 10, fontSize: 11, color: '#4A5C6A' }}>
                    Source Policy ID: <span className="font-mono" style={{ color: '#CCD0CF' }}>{inspectRule.source_policy_id}</span>
                  </div>
                </div>

                {/* Right: Deterministic IF-THEN Condition Specification */}
                <div style={{ backgroundColor: '#06141B', padding: 14, borderRadius: 6, border: '1px solid #4A5C6A' }}>
                  <div style={{ fontSize: 11, color: '#10B981', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
                    Deterministic Logic Specification
                  </div>
                  <div className="font-mono" style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ color: '#CCD0CF', fontWeight: 700 }}>IF:</div>
                    {inspectRule.conditions.map((c, i) => (
                      <div key={i} style={{ paddingLeft: 12, color: '#38BDF8' }}>
                        • {c.field} {c.operator} {JSON.stringify(c.value)}
                      </div>
                    ))}
                    <div style={{ color: '#CCD0CF', fontWeight: 700, marginTop: 6 }}>THEN:</div>
                    <div style={{ paddingLeft: 12, color: '#EF4444' }}>
                      • Classification: {inspectRule.classification}
                    </div>
                    <div style={{ paddingLeft: 12, color: '#F59E0B' }}>
                      • Recommended Action: {inspectRule.recommended_action}
                    </div>
                    <div style={{ paddingLeft: 12, color: '#CCD0CF' }}>
                      • Risk Level: {inspectRule.risk_level}
                    </div>
                  </div>
                </div>
              </div>

              {/* Natural Language Explanation */}
              <div style={{ backgroundColor: '#11212D', padding: 12, borderRadius: 6, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#9BA8AB', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                  Rule Intent & Explanation:
                </div>
                <p style={{ fontSize: 12, color: '#CCD0CF' }}>{inspectRule.explanation}</p>
              </div>

              {/* Governance & Sign-off history */}
              {inspectRule.approver && (
                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: 12, borderRadius: 6, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10B981', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    <CheckCircle size={14} /> Approved by {inspectRule.approver}
                  </div>
                  <div style={{ fontSize: 11, color: '#9BA8AB' }}>
                    Timestamp: {inspectRule.approval_time}
                  </div>
                  {inspectRule.review_comment && (
                    <div style={{ fontSize: 12, color: '#CCD0CF', marginTop: 4, fontStyle: 'italic' }}>
                      Comment: "{inspectRule.review_comment}"
                    </div>
                  )}
                </div>
              )}

              {/* Reviewer Comment Box */}
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#9BA8AB', marginBottom: 6 }}>
                  Reviewer Audit Comment / Rationale
                </label>
                <input
                  type="text"
                  placeholder="Enter audit justification (e.g. Verified against RACF SECADMIN access control policy)"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-neutral"
                onClick={() => setInspectRule(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-accent"
                onClick={() => {
                  onNavigateToBacktest(inspectRule.rule_id);
                  setInspectRule(null);
                }}
              >
                <Activity size={14} /> Run Backtest
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={actionLoading}
                onClick={() => handleDecision('REJECT')}
              >
                <XCircle size={14} /> Reject Rule
              </button>
              <button
                type="button"
                className="btn btn-success"
                disabled={actionLoading}
                onClick={() => handleDecision('APPROVE')}
              >
                <CheckCircle size={14} /> Approve & Activate Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
