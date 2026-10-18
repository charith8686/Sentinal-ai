import React from 'react';
import {
  LayoutDashboard,
  FileText,
  ShieldCheck,
  Activity,
  Link2,
  Sliders,
  LogOut,
  Building2
} from 'lucide-react';
import { CompanyProfile } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openAlertsCount: number;
  pendingRulesCount?: number;
  company: CompanyProfile | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  openAlertsCount,
  pendingRulesCount = 0,
  company,
  onLogout
}) => {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'policies', label: 'Policies', icon: FileText },
    {
      id: 'rules',
      label: 'Rules',
      icon: ShieldCheck,
      badge: pendingRulesCount > 0 ? `${pendingRulesCount}` : null,
      badgeType: 'warning'
    },
    {
      id: 'events-alerts',
      label: 'Events & Alerts',
      icon: Activity,
      badge: openAlertsCount > 0 ? `${openAlertsCount}` : null,
      badgeType: 'danger'
    },
    { id: 'audit', label: 'Audit Ledger', icon: Link2 },
    { id: 'settings', label: 'Settings', icon: Sliders }
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div style={{
          width: 32,
          height: 32,
          backgroundColor: '#11212D',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #253745'
        }}>
          <ShieldCheck size={18} color="#CCD0CF" />
        </div>
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.04em', color: '#FFFFFF', margin: 0 }}>
            SENTINEL AI
          </h2>
          <div style={{ fontSize: 10, color: '#9BA8AB', letterSpacing: '0.03em' }}>
            Policy → Rule → Proof
          </div>
        </div>
      </div>

      {/* Authenticated Company Workspace Badge */}
      {company && (
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(74, 92, 106, 0.25)',
          backgroundColor: 'rgba(17, 33, 45, 0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#9BA8AB', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            <Building2 size={12} color="#CCD0CF" /> Workspace
          </div>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#FFFFFF', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {company.name}
          </div>
          <div style={{ fontSize: 11, color: '#9BA8AB' }}>
            {company.industry}
          </div>
        </div>
      )}

      {/* Navigation List - Six Main Sections */}
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
              <Icon size={16} color={isActive ? '#FFFFFF' : '#9BA8AB'} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span
                  className={item.badgeType === 'warning' ? 'badge badge-warning' : 'badge badge-danger'}
                  style={{
                    fontSize: 10,
                    padding: '1px 6px',
                    ...(item.badgeType === 'warning' ? { backgroundColor: '#F59E0B', color: '#11212D', border: 'none', fontWeight: 700 } : {})
                  }}
                >
                  {item.badge}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {/* Logout & Footer */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(74, 92, 106, 0.3)' }}>
        <button
          onClick={onLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            backgroundColor: 'transparent',
            border: '1px solid rgba(74, 92, 106, 0.4)',
            borderRadius: 6,
            color: '#CCD0CF',
            fontSize: 12,
            cursor: 'pointer',
            transition: 'background-color 0.15s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#11212D')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <LogOut size={14} color="#9BA8AB" />
          <span>Exit Workspace</span>
        </button>
      </div>

      <div className="sidebar-footer">
        <div style={{ fontWeight: 600, color: '#CCD0CF', marginBottom: 4, letterSpacing: '0.04em' }}>
          HOSTED PLATFORM
        </div>
        <div style={{ fontSize: 11, color: '#9BA8AB' }}>
          IBM LinuxONE Enterprise
        </div>
      </div>
    </aside>
  );
};
