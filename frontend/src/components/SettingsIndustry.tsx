import React, { useState } from 'react';
import {
  Sliders,
  Cpu,
  Server,
  Shield,
  Layers,
  Radio,
  Power,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Globe,
  Terminal
} from 'lucide-react';
import { SystemHealth } from '../types';

interface SettingsIndustryProps {
  health: SystemHealth | null;
  onToggleDegraded: (online: boolean) => Promise<any>;
  currentIndustry: string;
  onSetIndustry: (industry: string) => Promise<any>;
  industryConfig: any;
}

export const SettingsIndustry: React.FC<SettingsIndustryProps> = ({
  health,
  onToggleDegraded,
  currentIndustry,
  onSetIndustry,
  industryConfig
}) => {
  const [selectedInd, setSelectedInd] = useState<string>(currentIndustry || 'Banking');
  const [isSwitching, setIsSwitching] = useState<boolean>(false);

  const isAiOnline = health?.degraded_mode?.ai_service_online ?? true;

  const handleIndustryChange = async (ind: string) => {
    setSelectedInd(ind);
    setIsSwitching(true);
    try {
      await onSetIndustry(ind);
    } finally {
      setIsSwitching(false);
    }
  };

  const industries = ['Banking', 'Healthcare', 'Insurance', 'Retail'];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, marginBottom: 4 }}>System Settings, Multi-Industry & IBM Z Architecture</h1>
        <p style={{ color: '#9BA8AB', fontSize: 13 }}>
          Configure industry profiles, verify Degraded Mode fault-tolerance, and inspect IBM LinuxONE / s390x platform architecture.
        </p>
      </div>

      {/* 1. Multi-Industry Configuration */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Globe size={17} color="#38BDF8" /> Multi-Industry Configuration Matrix
          </h3>
          <span style={{ fontSize: 12, color: '#9BA8AB' }}>Adaptive Compliance Profiles</span>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          {industries.map((ind) => (
            <button
              key={ind}
              className={`btn ${selectedInd === ind ? 'btn-accent' : 'btn-primary'}`}
              onClick={() => handleIndustryChange(ind)}
              disabled={isSwitching}
              style={{ fontWeight: 600 }}
            >
              {ind}
            </button>
          ))}
        </div>

        {industryConfig && (
          <div className="grid-2" style={{ gap: 16, backgroundColor: '#11212D', padding: 16, borderRadius: 6, border: '1px solid #4A5C6A' }}>
            <div>
              <div style={{ fontSize: 11, color: '#9BA8AB', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                Governing Regulatory Frameworks
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {industryConfig.regulatory_frameworks?.map((rf: string) => (
                  <span key={rf} className="badge badge-info font-mono" style={{ fontSize: 11 }}>
                    {rf}
                  </span>
                ))}
              </div>

              <div style={{ fontSize: 11, color: '#9BA8AB', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                Primary IBM Z Protected Resources
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {industryConfig.primary_resources?.map((res: string) => (
                  <span key={res} className="badge badge-neutral font-mono" style={{ fontSize: 11 }}>
                    {res}
                  </span>
                ))}
              </div>

              <div style={{ fontSize: 11, color: '#9BA8AB', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                Allowed Internal Destinations
              </div>
              <div style={{ fontSize: 12, color: '#10B981', fontFamily: 'monospace' }}>
                {industryConfig.allowed_destinations?.join(', ')}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: '#9BA8AB', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                Sensitive Data Categories (DLP Monitored)
              </div>
              <ul style={{ paddingLeft: 18, fontSize: 12, color: '#CCD0CF', marginBottom: 12 }}>
                {industryConfig.sensitive_data_categories?.map((cat: string, i: number) => (
                  <li key={i}>{cat}</li>
                ))}
              </ul>

              <div style={{ fontSize: 11, color: '#9BA8AB', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                Bulk Exfiltration Anomaly Threshold
              </div>
              <div style={{ fontSize: 13, color: '#F59E0B', fontWeight: 700, marginBottom: 10 }}>
                {industryConfig.export_threshold_records} records per single transaction window
              </div>

              <div style={{ fontSize: 11, color: '#9BA8AB', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                Remediation Playbook
              </div>
              <div style={{ fontSize: 12, color: '#CCD0CF' }}>
                {industryConfig.remediation_playbook}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Degraded Mode Resilience Test */}
      <div className="card" style={{ marginBottom: 24, borderLeft: `4px solid ${isAiOnline ? '#10B981' : '#F59E0B'}` }}>
        <div className="card-header">
          <h3 style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Radio size={17} color={isAiOnline ? '#10B981' : '#F59E0B'} />
            Degraded Mode: High-Availability Fault Tolerance
          </h3>
          <span className={`badge ${isAiOnline ? 'badge-success' : 'badge-warning'}`}>
            {isAiOnline ? 'AI PLANE ONLINE' : 'DEGRADED MODE ACTIVE'}
          </span>
        </div>

        <p style={{ fontSize: 13, color: '#CCD0CF', marginBottom: 14 }}>
          Sentinel AI decouples the generative AI plane (Lane 1) from the real-time detection plane (Lane 2).
          When external AI models (watsonx.ai / cloud LLMs) experience outages, latency spikes, or network partitions,
          <strong> deterministic compliance detection, DLP checks, and SHA-256 audit logging continue running without interruption</strong>.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, backgroundColor: '#11212D', padding: 14, borderRadius: 6 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#FFFFFF' }}>
              Current Status: {isAiOnline ? 'All Systems Fully Operational' : 'Degraded Mode Activated'}
            </div>
            <div style={{ fontSize: 11, color: '#9BA8AB', marginTop: 2 }}>
              {isAiOnline
                ? 'AI assists policy translation and alert drafting. Deterministic engine operates normally.'
                : 'AI drafting disabled. Existing active rules evaluate events at full speed. Prototype proof of zero-AI dependency.'}
            </div>
          </div>

          <button
            className={`btn ${isAiOnline ? 'btn-danger' : 'btn-success'}`}
            onClick={() => onToggleDegraded(!isAiOnline)}
          >
            <Power size={14} />
            {isAiOnline ? 'Simulate AI Service Outage' : 'Restore AI Service'}
          </button>
        </div>
      </div>

      {/* 3. IBM LinuxONE & Z Architecture Specifications */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Server size={17} color="#38BDF8" /> IBM Z Platform Deployment Blueprint (s390x / LinuxONE)
          </h3>
          <span className="badge badge-info font-mono">UBUNTU 24.04 / s390x</span>
        </div>

        <div className="grid-3" style={{ gap: 16, marginBottom: 16 }}>
          <div style={{ backgroundColor: '#11212D', padding: 14, borderRadius: 6, border: '1px solid #4A5C6A' }}>
            <div style={{ fontSize: 11, color: '#38BDF8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
              1. Detection Plane (On-Platform)
            </div>
            <div style={{ fontSize: 12, color: '#CCD0CF', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div>• <strong>Environment:</strong> IBM Z / z/OS & LinuxONE (s390x)</div>
              <div>• <strong>Engine:</strong> Deterministic C/Python on zIIP processors</div>
              <div>• <strong>Data Sources:</strong> SMF/RACF queues & CICS/IMS logs</div>
              <div>• <strong>Data Boundary:</strong> Sensitive data NEVER leaves IBM Z</div>
            </div>
          </div>

          <div style={{ backgroundColor: '#11212D', padding: 14, borderRadius: 6, border: '1px solid #4A5C6A' }}>
            <div style={{ fontSize: 11, color: '#10B981', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
              2. Advisory ML Scorer (MLz)
            </div>
            <div style={{ fontSize: 12, color: '#CCD0CF', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div>• <strong>Platform:</strong> Machine Learning for IBM z/OS (Enterprise)</div>
              <div>• <strong>Model:</strong> Tabular XGBoost / scikit-learn on z/OS USS</div>
              <div>• <strong>Acceleration:</strong> On-chip Telum II AI Accelerator</div>
              <div>• <strong>Scope:</strong> Advisory risk context only; does not override rules</div>
            </div>
          </div>

          <div style={{ backgroundColor: '#11212D', padding: 14, borderRadius: 6, border: '1px solid #4A5C6A' }}>
            <div style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
              3. AI Plane (On-Premises Spyre)
            </div>
            <div style={{ fontSize: 12, color: '#CCD0CF', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div>• <strong>Target:</strong> IBM Spyre PCIe Accelerator (or watsonx.ai)</div>
              <div>• <strong>Input:</strong> Anonymized metadata & clause IDs only</div>
              <div>• <strong>Output:</strong> Proposed candidate rules & explanations</div>
              <div>• <strong>Governance:</strong> Human approval required before deployment</div>
            </div>
          </div>
        </div>

        {/* Quantum-Safe & Transparency Notice */}
        <div style={{ borderTop: '1px solid #4A5C6A', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: '#9BA8AB' }}>
          <div>
            <strong style={{ color: '#38BDF8' }}>Quantum-Safe Readiness:</strong> Designed for cryptographic discovery via zCDI, ICSF hardware coprocessors (CEX8S), and hybrid post-quantum signatures (ML-KEM / ML-DSA) for long-term ledger integrity.
          </div>
          <div>
            <strong style={{ color: '#F59E0B' }}>Transparency Disclosure:</strong> This prototype is running on a simulated IBM Z environment. All SMF, RACF, CICS, and transaction event records are synthetic demonstration datasets. Production integration with live z/OS mainframes requires standard IBM Z adapters.
          </div>
        </div>
      </div>
    </div>
  );
};
