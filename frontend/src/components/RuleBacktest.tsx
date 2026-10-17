import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  ShieldCheck,
  Check,
  X
} from 'lucide-react';
import { Rule } from '../types';
import { api } from '../api';

interface RuleBacktestProps {
  rules: Rule[];
  initialRuleId?: string | null;
}

export const RuleBacktest: React.FC<RuleBacktestProps> = ({ rules, initialRuleId }) => {
  const [selectedRuleId, setSelectedRuleId] = useState<string>(
    initialRuleId || (rules.length > 0 ? rules[0].rule_id : '')
  );
  const [backtestResult, setBacktestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (initialRuleId) {
      setSelectedRuleId(initialRuleId);
      runBacktest(initialRuleId);
    }
  }, [initialRuleId]);

  const runBacktest = async (ruleIdToTest: string) => {
    if (!ruleIdToTest) return;
    setIsLoading(true);
    try {
      const res = await api.backtestRule(ruleIdToTest);
      setBacktestResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedRule = rules.find((r) => r.rule_id === selectedRuleId);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>Rule Testing & Backtesting Engine</h1>
          <p style={{ color: '#9BA8AB', fontSize: 13 }}>
            Replay candidate rules over the 15 simulated IBM Z ground-truth benchmark events before production sign-off.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select
            value={selectedRuleId}
            onChange={(e) => setSelectedRuleId(e.target.value)}
            style={{ width: '320px', backgroundColor: '#11212D' }}
          >
            {rules.map((r) => (
              <option key={r.rule_id} value={r.rule_id}>
                {r.rule_id} — {r.rule_name} ({r.status})
              </option>
            ))}
          </select>

          <button
            className="btn btn-accent"
            onClick={() => runBacktest(selectedRuleId)}
            disabled={isLoading || !selectedRuleId}
          >
            <Play size={14} /> {isLoading ? 'Simulating Replay...' : 'Run Backtest'}
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      <div style={{
        backgroundColor: '#11212D',
        border: '1px solid #4A5C6A',
        borderRadius: 6,
        padding: '12px 16px',
        marginBottom: 20,
        fontSize: 12,
        color: '#9BA8AB',
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }}>
        <Activity size={16} color="#38BDF8" />
        <span>
          <strong>Testing Methodology:</strong> Rules are backtested against the 15 ground-truth simulated IBM Z events in <code style={{ color: '#CCD0CF' }}>ibm_z_sentinel_ai_sample_events.csv</code>.
          This measures catches and false alarm rates before activation. Simulated test only.
        </span>
      </div>

      {/* Results Header KPIs */}
      {backtestResult && (
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <div className="card" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 11, color: '#9BA8AB' }}>Events Evaluated</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#CCD0CF', marginTop: 4 }}>
              {backtestResult.events_evaluated}
            </div>
            <div style={{ fontSize: 10, color: '#9BA8AB', marginTop: 2 }}>Ground-truth events</div>
          </div>

          <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #10B981' }}>
            <div style={{ fontSize: 11, color: '#9BA8AB' }}>Catches (Target Caught)</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#10B981', marginTop: 4 }}>
              {backtestResult.catches}
            </div>
            <div style={{ fontSize: 10, color: '#9BA8AB', marginTop: 2 }}>True positive detections</div>
          </div>

          <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #F59E0B' }}>
            <div style={{ fontSize: 11, color: '#9BA8AB' }}>False Positives</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: backtestResult.false_positives > 0 ? '#F59E0B' : '#10B981', marginTop: 4 }}>
              {backtestResult.false_positives}
            </div>
            <div style={{ fontSize: 10, color: '#9BA8AB', marginTop: 2 }}>Normal traffic flagged</div>
          </div>

          <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #38BDF8' }}>
            <div style={{ fontSize: 11, color: '#9BA8AB' }}>Overall Pass Rate</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#38BDF8', marginTop: 4 }}>
              {backtestResult.pass_rate_percent}%
            </div>
            <div style={{ fontSize: 10, color: '#9BA8AB', marginTop: 2 }}>Match against ground truth</div>
          </div>
        </div>
      )}

      {/* Breakdown Table */}
      {backtestResult && (
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 14 }}>Event-by-Event Backtest Comparison</h3>
            <span style={{ fontSize: 12, color: '#9BA8AB' }}>Rule: {backtestResult.rule_name}</span>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>User & Type</th>
                  <th>Resource</th>
                  <th>Activity Details</th>
                  <th>Rule Matched?</th>
                  <th>Actual Classification</th>
                  <th>Expected (Ground Truth)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {backtestResult.evaluations.map((ev: any) => (
                  <tr key={ev.event_id} style={{ backgroundColor: !ev.is_correct ? 'rgba(239, 68, 68, 0.05)' : undefined }}>
                    <td className="font-mono" style={{ color: '#38BDF8' }}>{ev.event_id}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{ev.user_id}</div>
                      <div style={{ fontSize: 10, color: '#9BA8AB' }}>{ev.event_type}</div>
                    </td>
                    <td className="font-mono" style={{ fontSize: 12 }}>{ev.resource}</td>
                    <td style={{ fontSize: 12, maxWidth: 320 }}>{ev.activity_details}</td>
                    <td>
                      {ev.rule_matched ? (
                        <span className="badge badge-success" style={{ fontSize: 10 }}>MATCH</span>
                      ) : (
                        <span className="badge badge-neutral" style={{ fontSize: 10 }}>NO MATCH</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${ev.actual_classification === 'PRIVACY_VIOLATION' ? 'badge-danger' : (ev.actual_classification === 'SUSPICIOUS' ? 'badge-warning' : 'badge-neutral')}`}>
                        {ev.actual_classification}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${ev.expected_classification === 'PRIVACY_VIOLATION' ? 'badge-danger' : (ev.expected_classification === 'SUSPICIOUS' ? 'badge-warning' : 'badge-neutral')}`}>
                        {ev.expected_classification}
                      </span>
                    </td>
                    <td>
                      {ev.is_correct ? (
                        <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                          <Check size={14} /> Target Match
                        </span>
                      ) : (
                        <span style={{ color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }} title={ev.ground_truth_reason}>
                          <X size={14} /> Mismatch
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
