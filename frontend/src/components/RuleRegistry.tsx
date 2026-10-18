import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Lock,
  Trash2,
  Eye,
  Info,
  Check
} from 'lucide-react';
import { Rule } from '../types';

interface RuleRegistryProps {
  rules: Rule[];
  onApproveRule?: (ruleId: string, comment?: string) => Promise<any>;
  onRejectRule?: (ruleId: string, comment?: string) => Promise<any>;
  onDeleteRule: (ruleId: string) => Promise<any>;
  onDeleteAllRules?: () => Promise<any>;
}

export const RuleRegistry: React.FC<RuleRegistryProps> = ({
  rules,
  onApproveRule,
  onRejectRule,
  onDeleteRule,
  onDeleteAllRules
}) => {
  const [inspectRule, setInspectRule] = useState<Rule | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'ACTIVE' | 'REJECTED'>('ALL');

  const pendingRules = rules.filter((r) => r.status === 'PENDING_APPROVAL');
  const activeRules = rules.filter((r) => r.status === 'ACTIVE');
  const rejectedRules = rules.filter((r) => r.status === 'REJECTED');

  const filteredRules = rules.filter((r) => {
    if (statusFilter === 'PENDING') return r.status === 'PENDING_APPROVAL';
    if (statusFilter === 'ACTIVE') return r.status === 'ACTIVE';
    if (statusFilter === 'REJECTED') return r.status === 'REJECTED';
    return true;
  });

  const handleApprove = async (ruleId: string) => {
    if (!onApproveRule) return;
    const rule = rules.find((r) => r.rule_id === ruleId);
    if (rule && rule.validation_status !== 'VALIDATED') {
      alert(`Cannot activate rule: It failed deterministic validation (${rule.validation_message || 'ambiguous conditions'}). Correct conditions before approval.`);
      return;
    }
    if (!window.confirm(`Approve and activate rule "${rule?.rule_name || ruleId}" into the runtime evaluation engine?`)) {
      return;
    }
    setActionLoadingId(ruleId);
    try {
      await onApproveRule(ruleId);
      if (inspectRule?.rule_id === ruleId) {
        setInspectRule((prev) => prev ? { ...prev, status: 'ACTIVE', approver: 'Authorized User', approval_time: new Date().toISOString() } : null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to approve rule.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (ruleId: string) => {
    if (!onRejectRule) return;
    const rule = rules.find((r) => r.rule_id === ruleId);
    if (!window.confirm(`Reject rule "${rule?.rule_name || ruleId}"? Rejected rules will not evaluate events.`)) {
      return;
    }
    setActionLoadingId(ruleId);
    try {
      await onRejectRule(ruleId);
      if (inspectRule?.rule_id === ruleId) {
        setInspectRule((prev) => prev ? { ...prev, status: 'REJECTED', approval_time: new Date().toISOString() } : null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to reject rule.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this rule?')) {
      return;
    }
    setDeletingId(ruleId);
    try {
      await onDeleteRule(ruleId);
      if (inspectRule?.rule_id === ruleId) {
        setInspectRule(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete rule.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!onDeleteAllRules) return;
    if (!window.confirm(`Are you sure you want to delete all ${rules.length} rules?`)) {
      return;
    }
    try {
      await onDeleteAllRules();
      setInspectRule(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete rules.');
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={11} /> Active (Enforced)
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span
            className="badge badge-warning"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              backgroundColor: '#FEF3C7',
              color: '#92400E',
              border: '1px solid #FDE68A'
            }}
          >
            <Clock size={11} /> Pending Approval
          </span>
        );
      case 'REJECTED':
        return (
          <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <XCircle size={11} /> Rejected
          </span>
        );
      case 'NEEDS_REVIEW':
        return (
          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <AlertCircle size={11} /> Needs Review
          </span>
        );
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, color: '#11212D', marginBottom: 4 }}>
            Rules Governance & Verification
          </h1>
          <p style={{ color: '#4A5C6A', fontSize: 13 }}>
            Executable deterministic rules proposed by watsonx.ai and validated by the engine. Company human review is strictly required before runtime activation.
          </p>
        </div>

        {pendingRules.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: 6,
            fontSize: 12,
            color: '#92400E',
            fontWeight: 600
          }}>
            <Clock size={14} />
            <span>{pendingRules.length} rule{pendingRules.length > 1 ? 's' : ''} awaiting human approval</span>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #CCD0CF', marginBottom: 20 }}>
        <button
          onClick={() => setStatusFilter('ALL')}
          style={{
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            color: statusFilter === 'ALL' ? '#11212D' : '#6B7B83',
            borderBottom: statusFilter === 'ALL' ? '2px solid #253745' : '2px solid transparent'
          }}
        >
          All Rules ({rules.length})
        </button>
        <button
          onClick={() => setStatusFilter('PENDING')}
          style={{
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            color: statusFilter === 'PENDING' ? '#92400E' : '#6B7B83',
            borderBottom: statusFilter === 'PENDING' ? '2px solid #92400E' : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          Pending Approval ({pendingRules.length})
          {pendingRules.length > 0 && (
            <span style={{
              backgroundColor: '#92400E',
              color: '#FFFFFF',
              borderRadius: 10,
              padding: '1px 6px',
              fontSize: 10
            }}>
              {pendingRules.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setStatusFilter('ACTIVE')}
          style={{
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            color: statusFilter === 'ACTIVE' ? '#166534' : '#6B7B83',
            borderBottom: statusFilter === 'ACTIVE' ? '2px solid #166534' : '2px solid transparent'
          }}
        >
          Active Enforced ({activeRules.length})
        </button>
        <button
          onClick={() => setStatusFilter('REJECTED')}
          style={{
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            color: statusFilter === 'REJECTED' ? '#991B1B' : '#6B7B83',
            borderBottom: statusFilter === 'REJECTED' ? '2px solid #991B1B' : '2px solid transparent'
          }}
        >
          Rejected ({rejectedRules.length})
        </button>
      </div>

      {/* Rules Table */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, color: '#11212D' }}>
            <ShieldCheck size={16} color="#166534" />
            {statusFilter === 'ALL' && `All Compliance Rules (${rules.length})`}
            {statusFilter === 'PENDING' && `Pending Human Approval (${pendingRules.length})`}
            {statusFilter === 'ACTIVE' && `Active Enforced Rules (${activeRules.length})`}
            {statusFilter === 'REJECTED' && `Rejected Rules (${rejectedRules.length})`}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {rules.length > 0 && onDeleteAllRules && (
              <button
                className="btn btn-sm btn-danger"
                onClick={handleDeleteAll}
                style={{ fontSize: 11, padding: '4px 10px' }}
                title="Delete all rules"
              >
                <Trash2 size={12} /> Clear All Rules
              </button>
            )}
            <span style={{ fontSize: 12, color: '#6B7B83' }}>
              Deterministic Runtime Logic
            </span>
          </div>
        </div>

        {filteredRules.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center', color: '#6B7B83', fontSize: 13 }}>
            <ShieldCheck size={28} color="#9BA8AB" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontWeight: 600, color: '#11212D', marginBottom: 4 }}>
              {statusFilter === 'PENDING' ? 'No rules currently awaiting approval' : 'No rules found'}
            </div>
            <div>
              {statusFilter === 'PENDING'
                ? 'All proposed rules have been reviewed or activated.'
                : 'Submit a company policy in the Policy section to generate new deterministic rules.'}
            </div>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Rule Name</th>
                  <th>Citation</th>
                  <th>Classification</th>
                  <th>Action</th>
                  <th>Review Status</th>
                  <th>Validation</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map((r) => (
                  <tr key={r.rule_id}>
                    <td style={{ fontWeight: 600, color: '#11212D' }}>
                      {r.rule_name}
                      {r.version && <span style={{ fontSize: 11, color: '#6B7B83', marginLeft: 6 }}>v{r.version}</span>}
                    </td>
                    <td>
                      <span className="badge badge-neutral font-mono" style={{ fontSize: 11 }}>
                        {r.source_clause_id}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${r.classification === 'PRIVACY_VIOLATION' ? 'badge-danger' : 'badge-warning'}`}>
                        {r.classification === 'PRIVACY_VIOLATION' ? 'Privacy Violation' : 'Suspicious Activity'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: '#253745', fontWeight: 500 }}>
                      {r.recommended_action === 'BLOCK_OR_ALERT' ? 'Block & Alert' : 'Investigate'}
                    </td>
                    <td>
                      {renderStatusBadge(r.status)}
                    </td>
                    <td>
                      {r.validation_status === 'VALIDATED' ? (
                        <span className="badge badge-neutral font-mono" style={{ fontSize: 10, color: '#166534' }}>
                          ✓ Validated
                        </span>
                      ) : (
                        <span className="badge badge-danger font-mono" style={{ fontSize: 10 }}>
                          Failed
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {r.status === 'PENDING_APPROVAL' && onApproveRule && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleApprove(r.rule_id)}
                            disabled={actionLoadingId === r.rule_id || r.validation_status !== 'VALIDATED'}
                            style={{ padding: '3px 8px', fontSize: 11 }}
                            title={r.validation_status !== 'VALIDATED' ? 'Rule failed validation' : 'Approve & Activate rule into detection engine'}
                          >
                            <Check size={12} /> Approve
                          </button>
                        )}

                        {r.status === 'PENDING_APPROVAL' && onRejectRule && (
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleReject(r.rule_id)}
                            disabled={actionLoadingId === r.rule_id}
                            style={{ padding: '3px 8px', fontSize: 11 }}
                            title="Reject rule"
                          >
                            <XCircle size={12} /> Reject
                          </button>
                        )}

                        {r.status === 'ACTIVE' && onRejectRule && (
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleReject(r.rule_id)}
                            disabled={actionLoadingId === r.rule_id}
                            style={{ padding: '3px 8px', fontSize: 11 }}
                            title="Deactivate and reject rule"
                          >
                            Deactivate
                          </button>
                        )}

                        {r.status === 'REJECTED' && onApproveRule && r.validation_status === 'VALIDATED' && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleApprove(r.rule_id)}
                            disabled={actionLoadingId === r.rule_id}
                            style={{ padding: '3px 8px', fontSize: 11 }}
                            title="Re-approve rule"
                          >
                            <Check size={12} /> Approve
                          </button>
                        )}

                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => setInspectRule(r)}
                          style={{ padding: '3px 8px', fontSize: 11 }}
                        >
                          <Eye size={12} /> Inspect
                        </button>

                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(r.rule_id)}
                          disabled={deletingId === r.rule_id}
                          style={{ padding: '3px 6px' }}
                          title="Delete rule"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Rule Modal */}
      {inspectRule && (
        <div className="modal-overlay" onClick={() => setInspectRule(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: 16, color: '#11212D', margin: 0 }}>
                  {inspectRule.rule_name}
                  {inspectRule.version && <span style={{ fontSize: 12, color: '#6B7B83', marginLeft: 8 }}>v{inspectRule.version}</span>}
                </h3>
                <div style={{ fontSize: 12, color: '#4A5C6A', marginTop: 2 }}>
                  Policy: <strong>{inspectRule.source_policy_id}</strong> • Created on {inspectRule.created_at.slice(0, 10)}
                  {inspectRule.approver && (
                    <span> • Approved by <strong>{inspectRule.approver}</strong></span>
                  )}
                </div>
              </div>
              <div>
                {renderStatusBadge(inspectRule.status)}
              </div>
            </div>

            <div className="modal-body">
              {/* Citation & Grounding */}
              <div style={{ backgroundColor: '#FAFBFB', padding: 14, borderRadius: 6, border: '1px solid #E2E6E7', marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: '#4A5C6A', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                  Grounded Legal Citation
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#11212D', marginBottom: 4 }}>
                  {inspectRule.source_clause_id}
                </div>
                <p style={{ fontSize: 12, color: '#4A5C6A', fontStyle: 'italic', margin: 0, lineHeight: 1.4 }}>
                  "{inspectRule.supporting_clause_text}"
                </p>
              </div>

              {/* Deterministic Execution Logic */}
              <div style={{ backgroundColor: '#FFFFFF', padding: 14, borderRadius: 6, border: '1px solid #CCD0CF', marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: '#4A5C6A', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
                  Deterministic Rule Predicates
                </div>
                <div className="font-mono" style={{ fontSize: 12, color: '#253745', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontWeight: 700, color: '#11212D' }}>IF:</div>
                  {inspectRule.conditions?.map((c, i) => (
                    <div key={i} style={{ paddingLeft: 12, color: '#11212D' }}>
                      • {c.field} {c.operator} {JSON.stringify(c.value)}
                    </div>
                  ))}
                  <div style={{ fontWeight: 700, color: '#11212D', marginTop: 6 }}>THEN:</div>
                  <div style={{ paddingLeft: 12, color: '#991B1B', fontWeight: 700 }}>
                    • Flag as {inspectRule.classification} ({inspectRule.recommended_action})
                  </div>
                </div>
              </div>

              {/* Rationale & Validation Tests */}
              <div style={{ backgroundColor: '#F5F7F8', padding: 12, borderRadius: 6, marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: '#4A5C6A', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                  AI Reasoning & Grounded Explanation
                </div>
                <div style={{ fontSize: 12, color: '#253745', lineHeight: 1.4 }}>
                  {inspectRule.explanation}
                </div>
                <div style={{
                  marginTop: 10,
                  padding: '8px 10px',
                  borderRadius: 4,
                  backgroundColor: inspectRule.validation_status === 'VALIDATED' ? '#F0FDF4' : '#FEF2F2',
                  border: `1px solid ${inspectRule.validation_status === 'VALIDATED' ? '#BBF7D0' : '#FECACA'}`,
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: inspectRule.validation_status === 'VALIDATED' ? '#166534' : '#991B1B'
                }}>
                  {inspectRule.validation_status === 'VALIDATED' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  <span><strong>Deterministic Validation:</strong> {inspectRule.validation_message || (inspectRule.validation_status === 'VALIDATED' ? 'All rule conditions tested and validated against simulated traffic.' : 'Rule failed validation tests.')}</span>
                </div>
              </div>

              {/* Human Approval Notice */}
              {inspectRule.status === 'PENDING_APPROVAL' && (
                <div style={{
                  padding: '10px 14px',
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  borderRadius: 6,
                  fontSize: 12,
                  color: '#92400E',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <Clock size={16} />
                  <span>
                    <strong>Human Approval Required:</strong> Sentinel AI never automatically enables detection rules without company authorization. Only active rules evaluate events.
                  </span>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleDelete(inspectRule.rule_id)}
                >
                  <Trash2 size={13} /> Delete Rule
                </button>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                {inspectRule.status === 'PENDING_APPROVAL' && onRejectRule && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleReject(inspectRule.rule_id)}
                    disabled={actionLoadingId === inspectRule.rule_id}
                  >
                    <XCircle size={13} /> Reject Rule
                  </button>
                )}

                {inspectRule.status === 'PENDING_APPROVAL' && onApproveRule && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleApprove(inspectRule.rule_id)}
                    disabled={actionLoadingId === inspectRule.rule_id || inspectRule.validation_status !== 'VALIDATED'}
                  >
                    <CheckCircle2 size={14} /> Approve &amp; Activate Rule
                  </button>
                )}

                {inspectRule.status === 'ACTIVE' && onRejectRule && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleReject(inspectRule.rule_id)}
                    disabled={actionLoadingId === inspectRule.rule_id}
                  >
                    <XCircle size={13} /> Deactivate Rule
                  </button>
                )}

                <button type="button" className="btn btn-secondary" onClick={() => setInspectRule(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
