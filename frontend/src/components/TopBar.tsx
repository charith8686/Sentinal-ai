import React from 'react';
import {
  Server,
  UserCheck,
  Power,
  CheckCircle2,
  AlertOctagon,
  Radio
} from 'lucide-react';
import { SystemHealth } from '../types';

interface TopBarProps {
  health: SystemHealth | null;
  onToggleDegraded: (online: boolean) => void;
  onSwitchReviewer: (reviewer: string) => void;
  tamperedBlocksCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  health,
  onToggleDegraded,
  onSwitchReviewer,
  tamperedBlocksCount
}) => {
  const isAiOnline = health?.degraded_mode?.ai_service_online ?? true;
  const currentReviewer = health?.current_reviewer || 'Chief Compliance Officer (J. Vance - RACF SECADMIN)';

  const reviewerOptions = [
    'Chief Compliance Officer (J. Vance - RACF SECADMIN)',
    'Senior IT Privacy Auditor (M. Chen - CISA)',
    'Enterprise Security Operations Lead (D. Rivera - SOC)',
    'RACF Systems Programmer (K. Kowalski - IBM Z Admin)'
  ];

  return (
    <header className="top-bar">
      {/* Left side: Architecture & Simulated IBM Z environment */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          backgroundColor: '#06141B',
          padding: '5px 12px',
          borderRadius: 4,
          border: '1px solid #4A5C6A'
        }}>
          <Server size={15} color="#38BDF8" />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#CCD0CF' }}>
            SIMULATED IBM Z
          </span>
          <span style={{
            fontSize: 10,
            padding: '1px 6px',
            borderRadius: 3,
            backgroundColor: 'rgba(56, 189, 248, 0.15)',
            color: '#38BDF8',
            fontFamily: 'monospace'
          }}>
            s390x / Telum II
          </span>
        </div>

        {/* Live Integrity Indicator */}
        {tamperedBlocksCount > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#EF4444', fontSize: 12, fontWeight: 600 }}>
            <AlertOctagon size={16} />
            <span>LEDGER ALERT: {tamperedBlocksCount} Tampered Block(s)</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10B981', fontSize: 12 }}>
            <CheckCircle2 size={15} />
            <span>SHA-256 Ledger Intact</span>
          </div>
        )}
      </div>

      {/* Right side: AI Degraded Mode Toggle & Reviewer Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* Degraded Mode Toggle Button */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          backgroundColor: isAiOnline ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.15)',
          padding: '4px 12px',
          borderRadius: 6,
          border: `1px solid ${isAiOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.5)'}`
        }}>
          <Radio size={14} color={isAiOnline ? '#10B981' : '#F59E0B'} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 10, color: '#9BA8AB', textTransform: 'uppercase' }}>
              AI Plane Status
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: isAiOnline ? '#10B981' : '#F59E0B' }}>
              {isAiOnline ? 'watsonx.ai ONLINE' : 'DEGRADED (OFFLINE)'}
            </span>
          </div>
          <button
            onClick={() => onToggleDegraded(!isAiOnline)}
            className="btn btn-sm"
            style={{
              marginLeft: 4,
              backgroundColor: isAiOnline ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              borderColor: isAiOnline ? '#EF4444' : '#10B981',
              color: isAiOnline ? '#EF4444' : '#10B981'
            }}
            title="Toggle simulated AI availability to test degraded mode resilience"
          >
            <Power size={12} />
            {isAiOnline ? 'Cut AI (Simulate Outage)' : 'Restore AI'}
          </button>
        </div>

        {/* Reviewer Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserCheck size={16} color="#9BA8AB" />
          <select
            value={currentReviewer}
            onChange={(e) => onSwitchReviewer(e.target.value)}
            style={{
              backgroundColor: '#06141B',
              fontSize: 12,
              padding: '6px 10px',
              maxWidth: '280px',
              border: '1px solid #4A5C6A'
            }}
            title="Select human reviewer for dual-control governance sign-offs"
          >
            {reviewerOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};
