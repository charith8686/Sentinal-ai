import React from 'react';
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  Link2,
  Plus,
  ArrowRight,
  CheckCircle2,
  Server,
  Building2
} from 'lucide-react';
import { DashboardOverview } from '../types';

interface OverviewDashboardProps {
  data: DashboardOverview | null;
  onNavigate: (tab: string) => void;
  onInspectAlert: (alertId: string) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  data,
  onNavigate,
  onInspectAlert
}) => {
  if (!data) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#4A5C6A' }}>
        Loading company workspace...
      </div>
    );
  }

  const { metrics, active_rules_list, recent_alerts, system_status } = data;
  const isBrandNew = metrics.policies === 0 && metrics.active_rules === 0 && metrics.open_alerts === 0;

  return (
    <div>
      {/* Top Header: Title & Company Indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, color: '#11212D', marginBottom: 4 }}>
            Company Governance Overview
          </h1>
          <p style={{ color: '#4A5C6A', fontSize: 13 }}>
            Continuous privacy and security monitoring on IBM LinuxONE for <strong style={{ color: '#11212D' }}>{system_status.company_name}</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Server status indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #CCD0CF',
            borderRadius: 6,
            fontSize: 12,
            color: '#253745'
          }}>
            <Server size={14} color="#4A5C6A" />
            <span>LinuxONE Deployment</span>
            <span style={{ color: '#CCD0CF' }}>•</span>
            <span style={{ color: '#166534', fontWeight: 600 }}>Engine Active</span>
          </div>

          <button className="btn btn-primary" onClick={() => onNavigate('policies')}>
            <Plus size={15} /> Add Policy
          </button>
        </div>
      </div>

      {/* Fresh workspace banner for brand new companies */}
      {isBrandNew && (
        <div className="card" style={{
          padding: '24px',
          marginBottom: 24,
          backgroundColor: '#FFFFFF',
          border: '1px solid #CCD0CF',
          borderLeft: '4px solid #253745'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: 16, color: '#11212D', marginBottom: 6 }}>
                Welcome to your isolated company workspace
              </h3>
              <p style={{ fontSize: 13, color: '#4A5C6A', margin: 0, maxWidth: 640 }}>
                This workspace starts completely empty. Submit your organization's first privacy policy or security mandate. Our shared AI model will analyze it, ground it against legal citations, and automatically generate and activate executable rules.
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => onNavigate('policies')}>
              <Plus size={14} /> Add Your First Policy
            </button>
          </div>
        </div>
      )}

      {/* Four Useful Metrics: Policies, Active Rules, Open Alerts, Audit Records */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        {/* 1. Policies */}
        <div className="card" style={{ padding: '18px 20px', cursor: 'pointer' }} onClick={() => onNavigate('policies')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#4A5C6A', fontWeight: 500 }}>Policies</span>
            <FileText size={18} color="#4A5C6A" />
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#11212D', marginTop: 8 }}>
            {metrics.policies}
          </div>
          <div style={{ fontSize: 12, color: '#6B7B83', marginTop: 4 }}>
            Company governance policies
          </div>
        </div>

        {/* 2. Active Rules */}
        <div className="card" style={{ padding: '18px 20px', cursor: 'pointer' }} onClick={() => onNavigate('rules')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#4A5C6A', fontWeight: 500 }}>Active Rules</span>
            <ShieldCheck size={18} color="#166534" />
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#166534', marginTop: 8 }}>
            {metrics.active_rules}
          </div>
          <div style={{ fontSize: 12, color: '#6B7B83', marginTop: 4 }}>
            Enforced deterministic rules
          </div>
        </div>

        {/* 3. Open Alerts */}
        <div className="card" style={{ padding: '18px 20px', cursor: 'pointer' }} onClick={() => onNavigate('events-alerts')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#4A5C6A', fontWeight: 500 }}>Open Alerts</span>
            <AlertTriangle size={18} color={metrics.open_alerts > 0 ? '#991B1B' : '#4A5C6A'} />
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: metrics.open_alerts > 0 ? '#991B1B' : '#11212D', marginTop: 8 }}>
            {metrics.open_alerts}
          </div>
          <div style={{ fontSize: 12, color: '#6B7B83', marginTop: 4 }}>
            Unresolved detections
          </div>
        </div>

        {/* 4. Audit Records */}
        <div className="card" style={{ padding: '18px 20px', cursor: 'pointer' }} onClick={() => onNavigate('audit')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#4A5C6A', fontWeight: 500 }}>Audit Records</span>
            <Link2 size={18} color="#253745" />
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#253745', marginTop: 8 }}>
            {metrics.audit_records}
          </div>
          <div style={{ fontSize: 12, color: '#6B7B83', marginTop: 4 }}>
            SHA-256 cryptographically sealed
          </div>
        </div>
      </div>

      {/* Main Content Split: Active Rules & Recent Alerts */}
      <div className="grid-2" style={{ gap: 24 }}>
        {/* Active Rules Section */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, color: '#11212D' }}>
              <ShieldCheck size={16} color="#166534" /> Active Rules Enforced ({active_rules_list.length})
            </h3>
            <button className="btn btn-sm btn-secondary" onClick={() => onNavigate('rules')}>
              View All Rules
            </button>
          </div>

          {active_rules_list.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: '#6B7B83', fontSize: 13 }}>
              <div style={{ marginBottom: 6 }}>No active rules configured yet.</div>
              <div style={{ fontSize: 12, color: '#9BA8AB' }}>Submit a policy to automatically validate and activate runtime rules.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {active_rules_list.map((rule) => (
                <div
                  key={rule.rule_id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    borderRadius: 6,
                    border: '1px solid #E2E6E7',
                    backgroundColor: '#FAFBFB'
                  }}
                >
                  <div style={{ flex: 1, marginRight: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#11212D' }}>
                      {rule.rule_name}
                    </div>
                    <div style={{ fontSize: 11, color: '#4A5C6A', marginTop: 3 }}>
                      Citation: <strong style={{ color: '#253745' }}>{rule.source_clause_id}</strong> • Risk: {rule.risk_level}
                    </div>
                  </div>

                  <span className="badge badge-success" style={{ fontSize: 11 }}>Active</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Alerts Section */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, color: '#11212D' }}>
              <AlertTriangle size={16} color="#991B1B" /> Recent Detections & Alerts ({recent_alerts.length})
            </h3>
            <button className="btn btn-sm btn-secondary" onClick={() => onNavigate('events-alerts')}>
              View All Alerts
            </button>
          </div>

          {recent_alerts.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: '#6B7B83', fontSize: 13 }}>
              <CheckCircle2 size={24} color="#166534" style={{ margin: '0 auto 8px' }} />
              <div>Zero alerts detected. Workspace is clean and compliant.</div>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Alert Description</th>
                    <th>Severity</th>
                    <th>Detection Time</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recent_alerts.map((alt) => (
                    <tr key={alt.alert_id}>
                      <td style={{ fontWeight: 500, color: '#11212D' }}>
                        {alt.explanation}
                      </td>
                      <td>
                        <span className={`badge ${alt.severity === 'CRITICAL' || alt.severity === 'HIGH' ? 'badge-danger' : 'badge-warning'}`}>
                          {alt.severity}
                        </span>
                      </td>
                      <td style={{ fontSize: 11, color: '#6B7B83' }}>
                        {alt.detection_time.slice(0, 19).replace('T', ' ')}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => onInspectAlert(alt.alert_id)}
                        >
                          Inspect
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
    </div>
  );
};
