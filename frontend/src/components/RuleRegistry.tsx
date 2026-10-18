import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Lock,
  Trash2,
  Eye,
  Info
} from 'lucide-react';
import { Rule } from '../types';

interface RuleRegistryProps {
  rules: Rule[];
  onDeleteRule: (ruleId: string) => Promise<any>;
}

export const RuleRegistry: React.FC<RuleRegistryProps> = ({
  rules,
  onDeleteRule
}) => {
  const [inspectRule, setInspectRule] = useState<Rule | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (ruleId: string) => {
    if (!window.confirm('Are you sure you want to remove this rule from active enforcement?')) {
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, color: '#11212D', marginBottom: 4 }}>
            Rules & Automated Activation
          </h1>
          <p style={{ color: '#4A5C6A', fontSize: 13 }}>
            Executable deterministic rules proposed by AI and automatically validated and tested before activation into the runtime engine.
          </p>
        </div>
      </div>

      {/* Rules Table */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, color: '#11212D' }}>
            <ShieldCheck size={16} color="#166534" /> Active Compliance Rules ({rules.length})
          </h3>
          <span style={{ fontSize: 12, color: '#6B7B83' }}>
            Deterministic Runtime Logic
          </span>
        </div>

        {rules.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center', color: '#6B7B83', fontSize: 13 }}>
            <ShieldCheck size={28} color="#9BA8AB" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontWeight: 600, color: '#11212D', marginBottom: 4 }}>No rules generated yet</div>
            <div>Submit a company policy in the Policy section. AI will analyze the policy and automatically validate and activate runtime rules.</div>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Rule Name</th>
                  <th>Legal Citation</th>
                  <th>Classification</th>
                  <th>Action</th>
                  <th>Status</th>
                  <th>Validation</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.rule_id}>
                    <td style={{ fontWeight: 600, color: '#11212D' }}>{r.rule_name}</td>
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
                      <span className="badge badge-success">
                        <CheckCircle2 size={11} /> {r.status}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-neutral font-mono" style={{ fontSize: 10 }}>
                        {r.validation_status || 'Auto-Verified'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => setInspectRule(r)}
                        >
                          <Eye size={12} /> Inspect
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(r.rule_id)}
                          disabled={deletingId === r.rule_id}
                          style={{ padding: '4px 8px' }}
                          title="Remove rule"
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
                <h3 style={{ fontSize: 16, color: '#11212D', margin: 0 }}>{inspectRule.rule_name}</h3>
                <div style={{ fontSize: 12, color: '#4A5C6A', marginTop: 2 }}>
                  Status: <span style={{ color: '#166534', fontWeight: 600 }}>Active (Enforced)</span> • Auto-activated on {inspectRule.created_at.slice(0, 10)}
                </div>
              </div>
              <span className="badge badge-success">Enforced</span>
            </div>

            <div className="modal-body">
              {/* Citation & Grounding */}
              <div style={{ backgroundColor: '#FAFBFB', padding: 14, borderRadius: 6, border: '1px solid #E2E6E7', marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#4A5C6A', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                  Grounded Citation
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#11212D', marginBottom: 4 }}>
                  {inspectRule.source_clause_id}
                </div>
                <p style={{ fontSize: 12, color: '#4A5C6A', fontStyle: 'italic', margin: 0, lineHeight: 1.4 }}>
                  "{inspectRule.supporting_clause_text}"
                </p>
              </div>

              {/* Deterministic Execution Logic */}
              <div style={{ backgroundColor: '#FFFFFF', padding: 14, borderRadius: 6, border: '1px solid #CCD0CF', marginBottom: 16 }}>
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

              {/* Rationale */}
              <div style={{ backgroundColor: '#F5F7F8', padding: 12, borderRadius: 6 }}>
                <div style={{ fontSize: 11, color: '#4A5C6A', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                  Automated Engine Verification
                </div>
                <div style={{ fontSize: 12, color: '#253745' }}>
                  {inspectRule.explanation}
                </div>
                {inspectRule.validation_message && (
                  <div style={{ fontSize: 11, color: '#166534', marginTop: 6, fontWeight: 500 }}>
                    ✓ {inspectRule.validation_message}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setInspectRule(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
