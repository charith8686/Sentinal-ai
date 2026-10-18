import React from 'react';
import {
  Server,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Cpu
} from 'lucide-react';
import { SystemHealth, CompanyProfile } from '../types';

interface TopBarProps {
  health: SystemHealth | null;
  company: CompanyProfile | null;
  auditIsValid: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  health,
  company,
  auditIsValid
}) => {
  return (
    <header className="top-bar">
      {/* Left: Environment & Cryptographic Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          backgroundColor: '#F5F7F8',
          border: '1px solid #CCD0CF',
          padding: '4px 10px',
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 600,
          color: '#253745'
        }}>
          <Server size={14} color="#4A5C6A" />
          <span>IBM LINUXONE DEPLOYMENT</span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          color: auditIsValid ? '#166534' : '#991B1B'
        }}>
          {auditIsValid ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          <span style={{ fontWeight: 500 }}>
            {auditIsValid ? 'Cryptographic Ledger Intact' : 'Tamper Detected'}
          </span>
        </div>
      </div>

      {/* Right: Shared AI Model & Company Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Model Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          backgroundColor: '#F0FDF4',
          border: '1px solid #BBF7D0',
          padding: '4px 10px',
          borderRadius: 4,
          fontSize: 12,
          color: '#166534'
        }}>
          <Cpu size={14} color="#166534" />
          <span style={{ fontWeight: 600 }}>Shared AI Model:</span>
          <span>{health?.ai_service?.provider || 'IBM watsonx.ai'}</span>
        </div>

        {/* Company Identity */}
        {company && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #CCD0CF',
            borderRadius: 4,
            fontSize: 12,
            color: '#11212D'
          }}>
            <Building2 size={14} color="#4A5C6A" />
            <span style={{ fontWeight: 600 }}>{company.name}</span>
          </div>
        )}
      </div>
    </header>
  );
};
