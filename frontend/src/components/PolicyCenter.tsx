import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { Policy } from '../types';

interface PolicyCenterProps {
  policies: Policy[];
  onSubmitPolicy: (data: { title: string; industry: string; text: string }) => Promise<any>;
  onNavigateToRuleReview: (ruleId: string) => void;
  currentIndustry: string;
}

export const PolicyCenter: React.FC<PolicyCenterProps> = ({
  policies,
  onSubmitPolicy,
  onNavigateToRuleReview,
  currentIndustry
}) => {
  const [title, setTitle] = useState('');
  const [industry, setIndustry] = useState(currentIndustry || 'Banking');
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const presetExamples = [
    {
      label: 'Personal Data to External AI (Core Benchmark)',
      title: 'Prohibition of Customer Data Transmission to External AI',
      industry: 'Banking',
      text: 'Personal customer data must not be sent to unapproved external AI services.'
    },
    {
      label: 'Cross-Border EU Transfer (GDPR Art 44/48)',
      title: 'Prohibition of Unauthorized Cross-Border Data Movement',
      industry: 'Banking',
      text: 'Personal data must not leave the EU without approval.'
    },
    {
      label: 'Ambiguity Test: Vague Directive (Triggers NEEDS_REVIEW)',
      title: 'General Data Governance Guidance',
      industry: 'Banking',
      text: 'Handle data appropriately and ensure safety.'
    },
    {
      label: 'Bulk Customer Export Anomaly (Data Exfiltration)',
      title: 'Bulk Customer Record Export Threshold Rule',
      industry: 'Banking',
      text: 'Bulk exports of customer records exceeding 5000 records require secondary review and authorization.'
    }
  ];

  const handleSelectPreset = (p: typeof presetExamples[0]) => {
    setTitle(p.title);
    setIndustry(p.industry);
    setText(p.text);
    setLastResult(null);
    setErrorMsg(null);
  };

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
      setErrorMsg(err.message || 'Error submitting policy');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, marginBottom: 4 }}>Policy Center: Policy → Rule Transformation</h1>
        <p style={{ color: '#9BA8AB', fontSize: 13 }}>
          Translate human-readable regulatory prose into deterministic, human-approved IF-THEN technical rules grounded in legal evidence.
        </p>
      </div>

      {/* Preset Example Selectors */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#CCD0CF', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <BookOpen size={14} color="#38BDF8" /> QUICK PRESETS & AMBIGUITY TEST CASES:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {presetExamples.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => handleSelectPreset(preset)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Policy Ingestion Form */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={17} color="#38BDF8" /> Ingest Regulatory or Internal Enterprise Policy
          </h3>
          <span style={{ fontSize: 12, color: '#9BA8AB' }}>Control Lane (Asynchronous)</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid-2" style={{ marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#9BA8AB', marginBottom: 6 }}>
                Policy Title
              </label>
              <input
                type="text"
                placeholder="e.g. Prohibition of Customer Data Transmission to External AI"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#9BA8AB', marginBottom: 6 }}>
                Target Industry Sector
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="Banking">Banking (GDPR, PCI-DSS, SOX, RACF)</option>
                <option value="Healthcare">Healthcare (HIPAA, HITECH, PHI)</option>
                <option value="Insurance">Insurance (NAIC, NYDFS 500)</option>
                <option value="Retail">Retail (CCPA, PCI-DSS, FTC)</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#9BA8AB', marginBottom: 6 }}>
              Natural Language Policy Statement / Clause Text
            </label>
            <textarea
              rows={4}
              placeholder="Paste exact compliance requirement or regulatory article..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {errorMsg && (
            <div style={{ color: '#EF4444', fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={15} /> {errorMsg}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              type="submit"
              className="btn btn-accent"
              disabled={isSubmitting}
            >
              <Sparkles size={16} />
              {isSubmitting ? 'Analyzing & Grounding...' : 'Extract Clauses & Propose Rule'}
            </button>
          </div>
        </form>
      </div>

      {/* Result Card: Proposed Rule or Ambiguity Warning */}
      {lastResult && (
        <div style={{ marginTop: 20 }}>
          {lastResult.policy.status === 'NEEDS_REVIEW' ? (
            /* Ambiguous Policy Warning Box */
            <div className="card" style={{ border: '2px solid #F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <ShieldAlert size={22} color="#F59E0B" />
                <h3 style={{ fontSize: 16, color: '#F59E0B' }}>
                  Policy Ambiguity Detected — Automated Rule Activation Blocked
                </h3>
              </div>
              <p style={{ fontSize: 13, color: '#CCD0CF', marginBottom: 12 }}>
                <strong>Reason:</strong> {lastResult.policy.missing_info_reason}
              </p>
              <div style={{ backgroundColor: '#11212D', padding: 16, borderRadius: 6, border: '1px solid #4A5C6A' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#F59E0B', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <HelpCircle size={14} /> CLARIFICATION QUESTIONS FOR COMPLIANCE OFFICER:
                </div>
                <ul style={{ paddingLeft: 20, fontSize: 13, color: '#CCD0CF', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {lastResult.policy.clarification_questions?.map((q: string, idx: number) => (
                    <li key={idx}>{q}</li>
                  ))}
                </ul>
              </div>
              <div style={{ marginTop: 12, fontSize: 11, color: '#9BA8AB' }}>
                Governing Axiom: AI never invents or guesses missing legal predicates. Routed to manual review queue.
              </div>
            </div>
          ) : (
            /* Successful Proposal Card */
            <div className="card" style={{ border: '1px solid #10B981', backgroundColor: 'rgba(16, 185, 129, 0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={20} color="#10B981" />
                  <h3 style={{ fontSize: 16, color: '#10B981' }}>Candidate Rule Drafted & Grounded</h3>
                </div>
                <span className="badge badge-warning">Awaiting Human Approval</span>
              </div>

              <div className="grid-2" style={{ gap: 16, marginBottom: 16 }}>
                {/* Left: Grounded Clause Citation */}
                <div style={{ backgroundColor: '#11212D', padding: 14, borderRadius: 6, border: '1px solid #4A5C6A' }}>
                  <div style={{ fontSize: 11, color: '#38BDF8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                    Grounded Source Clause Citation
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF', marginBottom: 4 }}>
                    {lastResult.proposed_rule?.source_clause_id}
                  </div>
                  <p style={{ fontSize: 12, color: '#9BA8AB', fontStyle: 'italic', lineHeight: 1.4 }}>
                    "{lastResult.proposed_rule?.supporting_clause_text}"
                  </p>
                </div>

                {/* Right: Deterministic IF-THEN Proposal */}
                <div style={{ backgroundColor: '#11212D', padding: 14, borderRadius: 6, border: '1px solid #4A5C6A' }}>
                  <div style={{ fontSize: 11, color: '#10B981', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                    Proposed Deterministic IF-THEN Logic
                  </div>
                  <div className="font-mono" style={{ backgroundColor: '#06141B', padding: 10, borderRadius: 4, fontSize: 11, color: '#CCD0CF' }}>
                    <div><strong>IF:</strong></div>
                    {lastResult.proposed_rule?.conditions.map((c: any, i: number) => (
                      <div key={i} style={{ paddingLeft: 12, color: '#38BDF8' }}>
                        • {c.field} {c.operator} {JSON.stringify(c.value)}
                      </div>
                    ))}
                    <div style={{ marginTop: 6 }}><strong>THEN:</strong></div>
                    <div style={{ paddingLeft: 12, color: '#EF4444' }}>
                      • classification = {lastResult.proposed_rule?.classification}
                    </div>
                    <div style={{ paddingLeft: 12, color: '#F59E0B' }}>
                      • action = {lastResult.proposed_rule?.recommended_action}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => onNavigateToRuleReview(lastResult.proposed_rule.rule_id)}
                >
                  Inspect in Rule Registry & Sign Off <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Existing Policies List */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <h3 style={{ fontSize: 14 }}>Active & Pending Ingested Policies</h3>
          <span style={{ fontSize: 12, color: '#9BA8AB' }}>{policies.length} Policies</span>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Policy ID</th>
                <th>Title</th>
                <th>Sector</th>
                <th>Status</th>
                <th>Grounded Clauses</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr key={p.policy_id}>
                  <td className="font-mono" style={{ color: '#38BDF8' }}>{p.policy_id}</td>
                  <td style={{ fontWeight: 600 }}>{p.title}</td>
                  <td><span className="badge badge-neutral">{p.industry}</span></td>
                  <td>
                    <span className={`badge ${p.status === 'ACTIVE' ? 'badge-success' : (p.status === 'NEEDS_REVIEW' ? 'badge-warning' : 'badge-neutral')}`}>
                      {p.status}
                    </span>
                  </td>
                  <td>
                    {p.clauses && p.clauses.length > 0 ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        {p.clauses.map((c) => (
                          <span key={c.clause_id} className="badge badge-info font-mono" style={{ fontSize: 10 }}>
                            {c.clause_id}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: '#F59E0B', fontSize: 12 }}>No clause matched</span>
                    )}
                  </td>
                  <td style={{ fontSize: 12, color: '#9BA8AB' }}>{p.created_at.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
