import React from 'react';
import {
  LayoutDashboard,
  FileText,
  ShieldCheck,
  Activity,
  AlertTriangle,
  Link2,
  Sliders,
  Cpu,
  Server
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingReviewsCount: number;
  openAlertsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingReviewsCount,
  openAlertsCount
}) => {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'policies', label: 'Policy Center', icon: FileText },
    { id: 'rules', label: 'Rule Registry', icon: ShieldCheck, badge: pendingReviewsCount ? `${pendingReviewsCount}` : null, badgeType: 'warning' },
    { id: 'backtest', label: 'Rule Testing', icon: Activity },
    { id: 'events', label: 'Event Monitoring', icon: Server },
    { id: 'alerts', label: 'Alerts & Cases', icon: AlertTriangle, badge: openAlertsCount ? `${openAlertsCount}` : null, badgeType: 'danger' },
    { id: 'audit', label: 'Audit Ledger', icon: Link2 },
    { id: 'settings', label: 'Settings & Architecture', icon: Sliders }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div style={{
          width: 32,
          height: 32,
          backgroundColor: '#253745',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #4A5C6A'
        }}>
          <ShieldCheck size={20} color="#38BDF8" />
        </div>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.04em', color: '#FFFFFF' }}>SENTINEL AI</h2>
          <div style={{ fontSize: 10, color: '#9BA8AB', letterSpacing: '0.05em' }}>POLICY → RULE → PROOF</div>
        </div>
      </div>

      <ul className="nav-list">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <li
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={17} color={isActive ? '#38BDF8' : '#9BA8AB'} />
              <span style={{ flex: 1, fontSize: 13 }}>{item.label}</span>
              {item.badge && (
                <span className={`badge ${item.badgeType === 'danger' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: 10, padding: '1px 6px' }}>
                  {item.badge}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {/* Governing Principles footer box */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #4A5C6A',
        backgroundColor: '#0B1A24',
        fontSize: 11,
        color: '#9BA8AB'
      }}>
        <div style={{ fontWeight: 600, color: '#CCD0CF', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Cpu size={14} color="#38BDF8" /> GOVERNING AXIOMS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div><strong style={{ color: '#10B981' }}>1. RULES DECIDE</strong> (Deterministic)</div>
          <div><strong style={{ color: '#38BDF8' }}>2. AI EXPLAINS</strong> (Cited Evidence)</div>
          <div><strong style={{ color: '#F59E0B' }}>3. HUMANS APPROVE</strong> (Dual Control)</div>
        </div>
      </div>
    </aside>
  );
};
