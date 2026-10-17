import React from 'react';
import {
  ShieldCheck,
  FileText,
  AlertTriangle,
  Server,
  Link2,
  Clock,
  ArrowRight,
  CheckCircle,
  AlertOctagon,
  Zap,
  Activity,
  Plus
} from 'lucide-react';
import { DashboardOverview } from '../types';

interface OverviewDashboardProps {
  data: DashboardOverview | null;
  onNavigate: (tab: string) => void;
  onVerifyLedger: () => void;
  onSimulateQuick: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  data,
  onNavigate,
  onVerifyLedger,
  onSimulateQuick
}) => {
  if (!data) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#9BA8AB' }}>Loading Sentinel AI telemetry...</div>;
  }

  const isAuditVerified = data.audit_verification_status === 'VERIFIED_INTACT';

  return (
    <div>
      {/* Header with Title and Quick Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>IBM Z Governance & Compliance Overview</h1>
          <p style={{ color: '#9BA8AB', fontSize: 13 }}>
            Continuous deterministic monitoring of mainframe transactions (SMF/RACF/CICS) & external AI gateways.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => onNavigate('policies')}>
            <Plus size={15} /> Add Policy
          </button>
          <button className="btn btn-primary" onClick={() => onNavigate('rules')}>
            <ShieldCheck size={15} /> Review Pending Rules ({data.pending_reviews})
          </button>
          <button className="btn btn-accent" onClick={onSimulateQuick}>
            <Zap size={15} /> Simulate Event
          </button>
          <button
            className={`btn ${isAuditVerified ? 'btn-success' : 'btn-danger'}`}
            onClick={onVerifyLedger}
          >
            <Link2 size={15} /> Verify Audit Ledger
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #38BDF8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#9BA8AB' }}>Total Policies</span>
            <FileText size={18} color="#38BDF8" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8, color: '#FFFFFF' }}>
            {data.total_policies}
          </div>
          <div style={{ fontSize: 11, color: '#9BA8AB', marginTop: 4 }}>
            Ingested natural language mandates
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #10B981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#9BA8AB' }}>Active Approved Rules</span>
            <ShieldCheck size={18} color="#10B981" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8, color: '#10B981' }}>
            {data.active_rules}
          </div>
          <div style={{ fontSize: 11, color: '#9BA8AB', marginTop: 4 }}>
            Deterministically enforced in runtime
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #F59E0B' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#9BA8AB' }}>Pending Human Reviews</span>
            <Clock size={18} color="#F59E0B" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8, color: '#F59E0B' }}>
            {data.pending_reviews}
          </div>
          <div style={{ fontSize: 11, color: '#9BA8AB', marginTop: 4 }}>
            Awaiting human compliance sign-off
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderLeft: `4px solid ${isAuditVerified ? '#10B981' : '#EF4444'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#9BA8AB' }}>Ledger Integrity</span>
            {isAuditVerified ? <CheckCircle size={18} color="#10B981" /> : <AlertOctagon size={18} color="#EF4444" />}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 12, color: isAuditVerified ? '#10B981' : '#EF4444' }}>
            {isAuditVerified ? 'VERIFIED INTACT' : 'TAMPER DETECTED'}
          </div>
          <div style={{ fontSize: 11, color: '#9BA8AB', marginTop: 8 }}>
            SHA-256 Hash Chain ({data.tampered_blocks_count} altered blocks)
          </div>
        </div>
      </div>

      {/* Middle Row: Detection Telemetry & Risk Distribution */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Live Performance Panel */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={16} color="#38BDF8" /> IBM Z Performance & Latency Telemetry
            </h3>
            <span className="badge badge-info font-mono">SIMULATOR BENCHMARK</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            <div style={{ backgroundColor: '#11212D', padding: 12, borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#9BA8AB' }}>p50 Latency</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#10B981', marginTop: 4 }}>
                {data.performance_metrics.p50_latency_ms} ms
              </div>
              <div style={{ fontSize: 10, color: '#9BA8AB' }}>Telum / Memory</div>
            </div>
            <div style={{ backgroundColor: '#11212D', padding: 12, borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#9BA8AB' }}>p95 Latency</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#38BDF8', marginTop: 4 }}>
                {data.performance_metrics.p95_latency_ms} ms
              </div>
              <div style={{ fontSize: 10, color: '#9BA8AB' }}>SLA &lt; 4 ms</div>
            </div>
            <div style={{ backgroundColor: '#11212D', padding: 12, borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#9BA8AB' }}>Throughput</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#CCD0CF', marginTop: 6 }}>
                &gt;500k/s
              </div>
              <div style={{ fontSize: 10, color: '#9BA8AB' }}>zIIP Engine</div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #4A5C6A', paddingTop: 12 }}>
            <div style={{ fontSize: 12, color: '#9BA8AB', marginBottom: 8 }}>Sensor Health & Connectivity:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>IBM Z SMF / RACF Adapter</span>
                <span style={{ color: '#10B981', fontWeight: 600 }}>{data.performance_metrics.sensor_health.ibm_z_smf_adapter}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>AI Gateway & Prompt DLP Sensor</span>
                <span style={{ color: '#10B981', fontWeight: 600 }}>{data.performance_metrics.sensor_health.ai_gateway_dlp}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Cryptographic SHA-256 Hasher</span>
                <span style={{ color: '#10B981', fontWeight: 600 }}>{data.performance_metrics.sensor_health.audit_hasher}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Severity Distribution & Attention Items */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} color="#F59E0B" /> Severity & Compliance Distribution
            </h3>
            <span style={{ fontSize: 12, color: '#9BA8AB' }}>Total: {data.violations_detected} detections</span>
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: 12, borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#EF4444', fontWeight: 600 }}>CRITICAL</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#EF4444', marginTop: 4 }}>{data.severity_distribution.CRITICAL}</div>
            </div>
            <div style={{ flex: 1, backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: 12, borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#EF4444', fontWeight: 600 }}>HIGH</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#EF4444', marginTop: 4 }}>{data.severity_distribution.HIGH}</div>
            </div>
            <div style={{ flex: 1, backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: 12, borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600 }}>MEDIUM</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#F59E0B', marginTop: 4 }}>{data.severity_distribution.MEDIUM}</div>
            </div>
            <div style={{ flex: 1, backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: 12, borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>LOW</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#10B981', marginTop: 4 }}>{data.severity_distribution.LOW}</div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #4A5C6A', paddingTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#CCD0CF', marginBottom: 8 }}>
              Requires Reviewer Attention:
            </div>
            {data.pending_rules_attention.length === 0 ? (
              <div style={{ fontSize: 12, color: '#10B981' }}>All drafted rules have been reviewed and approved.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.pending_rules_attention.map((pr: any) => (
                  <div
                    key={pr.rule_id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#11212D',
                      padding: '8px 12px',
                      borderRadius: 4,
                      fontSize: 12
                    }}
                  >
                    <div>
                      <strong style={{ color: '#FFFFFF' }}>{pr.rule_name}</strong>
                      <span style={{ marginLeft: 8, color: '#9BA8AB', fontFamily: 'monospace' }}>{pr.source_clause_id}</span>
                    </div>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => onNavigate('rules')}
                    >
                      Inspect <ArrowRight size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Security Alerts Table */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Server size={16} color="#EF4444" /> Recent Security Alerts & Compliance Violations
          </h3>
          <button className="btn btn-sm btn-primary" onClick={() => onNavigate('alerts')}>
            View All Alerts
          </button>
        </div>

        {data.recent_alerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#9BA8AB' }}>No active alerts. System baseline is secure.</div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Alert ID</th>
                  <th>Detection Time</th>
                  <th>Severity</th>
                  <th>Event Target</th>
                  <th>Cited Clause</th>
                  <th>Explanation</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_alerts.map((alt: any) => (
                  <tr key={alt.alert_id}>
                    <td className="font-mono" style={{ color: '#38BDF8', fontWeight: 600 }}>{alt.alert_id}</td>
                    <td style={{ fontSize: 12, color: '#9BA8AB' }}>{alt.detection_time.slice(0, 19).replace('T', ' ')}</td>
                    <td>
                      <span className={`badge ${alt.severity === 'CRITICAL' || alt.severity === 'HIGH' ? 'badge-danger' : 'badge-warning'}`}>
                        {alt.severity}
                      </span>
                    </td>
                    <td className="font-mono">{alt.event_id}</td>
                    <td style={{ color: '#CCD0CF', fontWeight: 600 }}>{alt.cited_clause_id}</td>
                    <td style={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {alt.explanation}
                    </td>
                    <td>
                      <span className="badge badge-neutral">{alt.investigation_status}</span>
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
