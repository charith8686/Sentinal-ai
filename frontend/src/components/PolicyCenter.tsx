import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Trash2,
  ArrowRight,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import { Policy } from '../types';

interface PolicyCenterProps {
  policies: Policy[];
  onSubmitPolicy: (data: { title: string; industry: string; text: string }) => Promise<any>;
  onDeletePolicy: (policyId: string) => Promise<any>;
  onNavigateToRules: () => void;
  currentIndustry: string;
}

export const PolicyCenter: React.FC<PolicyCenterProps> = ({
  policies,
  onSubmitPolicy,
  onDeletePolicy,
  onNavigateToRules,
  currentIndustry
}) => {
  const [title, setTitle] = useState('');
  const [industry, setIndustry] = useState(currentIndustry || 'Banking');
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !text.trim()) {
      setErrorMsg('Please enter both a policy title and policy text.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await onSubmitPolicy({ title, industry, text });
      setLastResult(res);
      setTitle('');
      setText('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting policy for AI analysis.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (policyId: string) => {
    if (!window.confirm('Are you sure you want to delete this policy? Any associated runtime rules will also be removed.')) {
      return;
    }
    setDeletingId(policyId);
    try {
      await onDeletePolicy(policyId);
    } catch (err: any) {
      alert(err.message || 'Failed to delete policy.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, color: '#11212D', marginBottom: 4 }}>
          Company Policies
        </h1>
        <p style={{ color: '#4A5C6A', fontSize: 13 }}>
          Add your organization's natural language privacy and compliance policies. Our shared AI model evaluates each statement, grounds it in legal citations, and proposes deterministic rules.
        </p>
      </div>

      {/* Policy Ingestion Form */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, color: '#11212D' }}>
            <FileText size={16} color="#253745" /> Add Policy for AI Analysis
          </h3>
          <span style={{ fontSize: 12, color: '#6B7B83' }}>Step 1: Policy → AI Analysis → Automatic Rule</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid-2" style={{ marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#4A5C6A', fontWeight: 500, marginBottom: 6 }}>
                Policy Title
              </label>
              <input
                type="text"
                placeholder="e.g. Prohibition of Customer Data Transmission to External AI"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#4A5C6A', fontWeight: 500, marginBottom: 6 }}>
                Sector / Framework (Optional)
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="Banking">Banking & Financial Services (GDPR, PCI-DSS)</option>
                <option value="Healthcare">Healthcare (HIPAA, HITECH)</option>
                <option value="Insurance">Insurance & Actuarial</option>
                <option value="Retail">Retail & E-Commerce (CCPA)</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#4A5C6A', fontWeight: 500, marginBottom: 6 }}>
              Natural Language Policy Statement
            </label>
            <textarea
              rows={3}
              placeholder="Enter your organization's policy statement (e.g. 'Personal customer records must not be exported in batches exceeding 5,000 records without secondary authorization')..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          {errorMsg && (
            <div style={{ color: '#991B1B', fontSize: 13, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={15} /> {errorMsg}
            </div>
          )}

          {isSubmitting && (
            <div style={{
              marginBottom: 14,
              padding: '12px 16px',
              backgroundColor: '#F0F4F7',
              border: '1px solid #CCD0CF',
              borderRadius: 6,
              fontSize: 12,
              color: '#253745',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <Sparkles size={14} color="#253745" />
              <span>
                <strong>IBM watsonx.ai (Granite 4)</strong> is analyzing your policy statement, grounding it in legal citations, and formulating a deterministic rule. This may take 5–15 seconds...
              </span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              <Sparkles size={15} />
              {isSubmitting ? 'Analyzing with IBM Granite 4...' : 'Analyze Policy & Propose Rule'}
            </button>
          </div>
        </form>
      </div>

      {/* Result Outcome: Ambiguity Warning OR Auto-Activated Rule */}
      {lastResult && (
        <div style={{ marginBottom: 24 }}>
          {lastResult.policy.status === 'NEEDS_REVIEW' ? (
            <div className="card" style={{ border: '1px solid #FDE68A', backgroundColor: '#FFFBEB' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <ShieldAlert size={20} color="#92400E" />
                <h3 style={{ fontSize: 15, color: '#92400E', margin: 0 }}>
                  Policy Ambiguity Detected — Automated Activation Halted
                </h3>
              </div>
              <p style={{ fontSize: 13, color: '#253745', marginBottom: 12 }}>
                <strong>Reason:</strong> {lastResult.policy.missing_info_reason}
              </p>
              <div style={{ backgroundColor: '#FFFFFF', padding: 14, borderRadius: 6, border: '1px solid #FDE68A' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#92400E', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <HelpCircle size={14} /> Clarification Needed:
                </div>
                <ul style={{ paddingLeft: 18, fontSize: 13, color: '#253745', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {lastResult.policy.clarification_questions?.map((q: string, idx: number) => (
                    <li key={idx}>{q}</li>
                  ))}
                </ul>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: '#6B7B83' }}>
                Core Principle: Sentinel AI never invents subjective conditions. Subjective statements require technical clarification before runtime activation.
              </div>
            </div>
          ) : (
            <div className="card" style={{ border: '1px solid #BBF7D0', backgroundColor: '#F0FDF4' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={18} color="#166534" />
                  <h3 style={{ fontSize: 15, color: '#166534', margin: 0 }}>
                    AI Analysis Complete — Rule Automatically Validated & Activated
                  </h3>
                </div>
                <span className="badge badge-success">Active in Runtime Engine</span>
              </div>

              <div className="grid-2" style={{ gap: 16, marginBottom: 16 }}>
                <div style={{ backgroundColor: '#FFFFFF', padding: 14, borderRadius: 6, border: '1px solid #DDE2E3' }}>
                  <div style={{ fontSize: 11, color: '#4A5C6A', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                    Grounded Citation
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#11212D', marginBottom: 4 }}>
                    {lastResult.proposed_rule?.source_clause_id}
                  </div>
                  <p style={{ fontSize: 12, color: '#4A5C6A', fontStyle: 'italic', lineHeight: 1.4, margin: 0 }}>
                    "{lastResult.proposed_rule?.supporting_clause_text}"
                  </p>
                </div>

                <div style={{ backgroundColor: '#FFFFFF', padding: 14, borderRadius: 6, border: '1px solid #DDE2E3' }}>
                  <div style={{ fontSize: 11, color: '#4A5C6A', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                    Deterministic Logic Enforced
                  </div>
                  <div className="font-mono" style={{ fontSize: 12, color: '#253745', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div><strong>IF:</strong></div>
                    {lastResult.proposed_rule?.conditions.map((c: any, i: number) => (
                      <div key={i} style={{ paddingLeft: 10, color: '#11212D' }}>
                        • {c.field} {c.operator} {JSON.stringify(c.value)}
                      </div>
                    ))}
                    <div style={{ marginTop: 4 }}><strong>THEN:</strong></div>
                    <div style={{ paddingLeft: 10, color: '#991B1B', fontWeight: 600 }}>
                      • {lastResult.proposed_rule?.classification} ({lastResult.proposed_rule?.recommended_action})
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Explanation + Attribution */}
              {lastResult.proposed_rule?.explanation && (
                <div style={{ backgroundColor: '#FFFFFF', padding: 14, borderRadius: 6, border: '1px solid #DDE2E3', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: '#4A5C6A', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
                    AI Reasoning
                  </div>
                  <p style={{ fontSize: 13, color: '#253745', margin: 0, lineHeight: 1.5 }}>
                    {lastResult.proposed_rule.explanation}
                  </p>
                  <div style={{ marginTop: 8, fontSize: 11, color: '#9BA8AB' }}>
                    Analysis by IBM watsonx.ai · {lastResult.proposed_rule.ai_provider || 'Granite 4'} · Rule auto-validated &amp; activated
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-primary"
                  onClick={onNavigateToRules}
                >
                  View in Rules Registry <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Existing Policies Table */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ fontSize: 15, color: '#11212D' }}>Configured Policies ({policies.length})</h3>
          <span style={{ fontSize: 12, color: '#6B7B83' }}>Company Workspace Isolated</span>
        </div>

        {policies.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center', color: '#6B7B83', fontSize: 13 }}>
            <FileText size={28} color="#9BA8AB" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontWeight: 600, color: '#11212D', marginBottom: 4 }}>No policies submitted yet</div>
            <div>Use the form above to submit your company's first privacy policy.</div>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Sector</th>
                  <th>Status</th>
                  <th>Grounded Citation</th>
                  <th>Created Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((p) => (
                  <tr key={p.policy_id}>
                    <td style={{ fontWeight: 600, color: '#11212D' }}>{p.title}</td>
                    <td><span className="badge badge-neutral">{p.industry}</span></td>
                    <td>
                      <span className={`badge ${p.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>
                        {p.status === 'ACTIVE' ? 'Active' : 'Clarification Needed'}
                      </span>
                    </td>
                    <td>
                      {p.clauses && p.clauses.length > 0 ? (
                        <span className="badge badge-neutral font-mono" style={{ fontSize: 11 }}>
                          {p.clauses[0].clause_id}
                        </span>
                      ) : (
                        <span style={{ color: '#92400E', fontSize: 12 }}>Subjective Statement</span>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: '#6B7B83' }}>{p.created_at.slice(0, 10)}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(p.policy_id)}
                        disabled={deletingId === p.policy_id}
                        style={{ padding: '4px 8px' }}
                        title="Delete policy and its runtime rules"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
