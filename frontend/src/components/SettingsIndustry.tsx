import React, { useState, useEffect, useRef } from 'react';
import {
  Sliders,
  Radio,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Server,
  Cpu,
  Upload,
  Info
} from 'lucide-react';
import { SystemHealth } from '../types';
import { api } from '../api';

interface SettingsIndustryProps {
  health: SystemHealth | null;
  onImportCsv: (file: File) => Promise<any>;
  onResetWorkspace?: () => Promise<any>;
}

export const SettingsIndustry: React.FC<SettingsIndustryProps> = ({
  health,
  onImportCsv,
  onResetWorkspace
}) => {
  const [aiStatus, setAiStatus] = useState<any>(null);
  const [checkingAi, setCheckingAi] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkAiConnection();
  }, []);

  const checkAiConnection = async () => {
    setCheckingAi(true);
    try {
      const res = await api.getAiStatus();
      setAiStatus(res);
    } catch (err: any) {
      setAiStatus({ connected: false, message: err.message || 'Connection test failed.' });
    } finally {
      setCheckingAi(false);
    }
  };

  const handleResetWorkspace = async () => {
    if (!onResetWorkspace) return;
    if (!window.confirm(
      'WARNING: This will permanently delete ALL of your company\'s policies, rules, events, alerts, and audit records. This action cannot be undone. Type "RESET" to confirm, then click OK.'
    )) return;
    const confirmation = window.prompt('Type RESET to confirm complete workspace reset:');
    if (confirmation !== 'RESET') {
      alert('Reset cancelled — confirmation text did not match.');
      return;
    }
    setResetting(true);
    setResetStatus(null);
    try {
      const res = await onResetWorkspace();
      const d = res.deleted || {};
      setResetStatus(
        `Workspace reset complete. Deleted: ${d.policies ?? 0} policies, ${d.rules ?? 0} rules, ${d.events ?? 0} events, ${d.alerts ?? 0} alerts, ${d.audit_records ?? 0} audit records.`
      );
      setTimeout(() => setResetStatus(null), 10000);
    } catch (err: any) {
      alert(err.message || 'Failed to reset workspace.');
    } finally {
      setResetting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the user can re-select the same file if needed
    e.target.value = '';

    setImportError(null);
    setImportStatus(null);

    // 1. Client-side validation: must have .csv extension
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setImportError('Invalid file type: Please select a valid CSV (.csv) file.');
      return;
    }

    // 2. Client-side validation: non-empty file
    if (file.size === 0) {
      setImportError('The selected CSV file is empty (0 bytes).');
      return;
    }

    // 3. Client-side validation: max size 15MB
    if (file.size > 15 * 1024 * 1024) {
      setImportError('File size exceeds the 15MB limit.');
      return;
    }

    setSelectedFileName(file.name);
    setImporting(true);

    try {
      const res = await onImportCsv(file);
      setImportStatus(
        res.message ||
        `Successfully imported ${res.imported_count} events (${res.alerts_created || 0} alerts generated, ${res.audit_records_created || res.imported_count} audit records sealed).`
      );
      setTimeout(() => setImportStatus(null), 9000);
    } catch (err: any) {
      setImportError(err.message || 'Failed to import CSV dataset.');
    } finally {
      setImporting(false);
    }
  };

  const handleLoadSampleBenchmark = async () => {
    setImporting(true);
    setImportError(null);
    setImportStatus(null);
    setSelectedFileName('ibm_z_sentinel_ai_sample_events.csv');
    try {
      const resp = await fetch('/api/events/sample-csv');
      const text = await resp.text();
      const file = new File([text], 'ibm_z_sentinel_ai_sample_events.csv', { type: 'text/csv' });
      const res = await onImportCsv(file);
      setImportStatus(
        res.message ||
        `Successfully imported ${res.imported_count} benchmark events (${res.alerts_created || 0} alerts generated, ${res.audit_records_created || res.imported_count} audit records sealed).`
      );
      setTimeout(() => setImportStatus(null), 9000);
    } catch (err: any) {
      setImportError(err.message || 'Failed to load benchmark dataset.');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadSample = () => {
    window.open('/api/events/sample-csv', '_blank');
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, color: '#11212D', marginBottom: 4 }}>
          Settings & Environment
        </h1>
        <p style={{ color: '#4A5C6A', fontSize: 13 }}>
          Configure shared AI model connectivity, inspect deployment details on IBM LinuxONE, and synchronize test datasets.
        </p>
      </div>

      {importStatus && (
        <div style={{
          backgroundColor: '#F0FDF4',
          border: '1px solid #BBF7D0',
          color: '#166534',
          padding: '12px 16px',
          borderRadius: 6,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <CheckCircle2 size={18} color="#166534" style={{ flexShrink: 0 }} />
          <div>{importStatus}</div>
        </div>
      )}

      {importError && (
        <div style={{
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          color: '#991B1B',
          padding: '12px 16px',
          borderRadius: 6,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <AlertCircle size={18} color="#991B1B" style={{ flexShrink: 0 }} />
          <div>{importError}</div>
        </div>
      )}

      {/* 1. Genuine AI Model Provider Status */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h3 style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, color: '#11212D' }}>
            <Cpu size={16} color="#253745" /> Shared AI Model Connectivity
          </h3>
          <button
            className="btn btn-sm btn-secondary"
            onClick={checkAiConnection}
            disabled={checkingAi}
          >
            {checkingAi ? 'Testing Connection...' : 'Test Model Connection'}
          </button>
        </div>

        <p style={{ fontSize: 13, color: '#253745', marginBottom: 14 }}>
          Sentinel AI uses one shared enterprise AI model (e.g. IBM watsonx.ai Granite or external foundation model) to interpret policies across all companies independently without mixing company data.
        </p>

        <div style={{
          padding: 14,
          borderRadius: 6,
          backgroundColor: '#FAFBFB',
          border: '1px solid #E2E6E7',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {aiStatus?.connected ? (
                <CheckCircle2 size={16} color="#166534" />
              ) : (
                <AlertCircle size={16} color="#92400E" />
              )}
              <span style={{ fontWeight: 600, fontSize: 13, color: '#11212D' }}>
                Provider: {aiStatus?.provider || health?.ai_service?.provider || 'IBM watsonx.ai'}
              </span>
              <span className={`badge ${aiStatus?.connected ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: 10 }}>
                {aiStatus?.connected ? 'Connected' : 'Credentials Not Configured'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#4A5C6A', marginTop: 4 }}>
              {aiStatus?.message || health?.ai_service?.message}
            </div>
            {aiStatus?.notice && (
              <div style={{ marginTop: 8, padding: '8px 12px', backgroundColor: '#F1F5F7', border: '1px solid #CCD0CF', borderRadius: 4, fontSize: 12, color: '#253745' }}>
                <strong>Configuration Note:</strong> {aiStatus.notice}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: '#6B7B83', lineHeight: 1.4 }}>
          To connect IBM watsonx.ai or an external model, configure <code>WATSONX_APIKEY</code>, <code>WATSONX_PROJECT_ID</code>, or <code>OPENAI_API_KEY</code> in the server <code>.env</code> file. When unconfigured, Sentinel AI uses local grounded clause extraction and clearly discloses fallback status.
        </div>
      </div>

      {/* 2. Dataset Ingestion */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h3 style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, color: '#11212D' }}>
            <FileSpreadsheet size={16} color="#253745" /> Import Dataset
          </h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-sm btn-secondary"
              onClick={handleDownloadSample}
              title="Download standard CSV template formatted for Sentinel AI"
            >
              <FileSpreadsheet size={13} /> Download Sample CSV
            </button>
            <button
              className="btn btn-sm btn-secondary"
              onClick={handleLoadSampleBenchmark}
              disabled={importing}
              title="Quick-load the 15-event standard benchmark directly into this company workspace"
            >
              Load Benchmark Dataset
            </button>
          </div>
        </div>

        <p style={{ fontSize: 13, color: '#253745', marginBottom: 14 }}>
          Upload a CSV file containing access logs or system events to evaluate against your company's active compliance rules.
          Events are parsed, evaluated deterministically, flagged for alerts when non-compliant, and cryptographically sealed into your company's SHA-256 audit ledger.
        </p>

        {/* Format Explanation Box */}
        <div style={{
          backgroundColor: '#FAFBFB',
          border: '1px solid #E2E6E7',
          borderRadius: 6,
          padding: '14px 16px',
          marginBottom: 16
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#11212D', marginBottom: 6 }}>
            Expected CSV Format &amp; Column Headers:
          </div>
          <div style={{ fontSize: 12, color: '#4A5C6A', lineHeight: 1.6 }}>
            <div>• <code>event_id</code> (Optional): Unique event identifier (e.g. <code>E001</code>, <code>EVT-102</code>). Auto-generated if omitted.</div>
            <div>• <code>timestamp</code> (Optional): ISO 8601 date-time (e.g. <code>2026-10-18T10:15:00</code>). Defaults to now if omitted.</div>
            <div>• <code>user_id</code>: Username or employee identifier (e.g. <code>EMP102</code>, <code>ADMIN01</code>).</div>
            <div>• <code>event_type</code>: Action code (e.g. <code>READ_RECORD</code>, <code>AI_DATA_SEND</code>, <code>DATA_EXPORT</code>, <code>LOGIN</code>).</div>
            <div>• <code>resource</code>: Target database, server, or asset (e.g. <code>CUSTOMER_DB</code>, <code>PAYROLL_DB</code>, <code>IBM_Z_MAINFRAME</code>).</div>
            <div>• <code>activity_details</code>: Natural language description of what occurred (e.g. <em>"Employee uploads 100 customer account records to external AI tool"</em>). DLP scans this text for sensitive data.</div>
            <div>• <code>sensitive_data</code>: <code>True</code> or <code>False</code> (or <code>1</code>/<code>0</code>). Automatically verified via regex DLP.</div>
            <div>• <code>authorized</code>: <code>True</code>, <code>False</code>, or empty/unknown.</div>
            <div>• <code>destination</code> (Optional): Destination host (e.g. <code>EXTERNAL_AI_ENDPOINT</code>, <code>INTERNAL_LINUX_SERVER</code>).</div>
          </div>
        </div>

        {importing && (
          <div style={{
            padding: '12px 14px',
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: 6,
            marginBottom: 14,
            fontSize: 12,
            color: '#1E40AF',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <FileSpreadsheet size={15} />
            <span>
              Uploading <strong>{selectedFileName}</strong>, scanning for sensitive data, and evaluating rows against active deterministic rules...
            </span>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          accept=".csv,text/csv"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            <Upload size={14} /> {importing ? 'Importing Dataset...' : 'Import Dataset'}
          </button>
          <span style={{ fontSize: 12, color: '#6B7B83' }}>
            Supports comma (,), semicolon (;), and tab-separated CSV files.
          </span>
        </div>
      </div>

      {/* 3. Honest Deployment Disclosure */}
      <div className="card" style={{ backgroundColor: '#FAFBFB', border: '1px solid #E2E6E7' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Server size={16} color="#4A5C6A" />
          <h4 style={{ fontSize: 13, fontWeight: 600, color: '#11212D', margin: 0 }}>
            Deployment Platform: IBM LinuxONE
          </h4>
        </div>
        <p style={{ fontSize: 12, color: '#4A5C6A', lineHeight: 1.5, margin: 0 }}>
          Sentinel AI is deployed on IBM LinuxONE (Linux on s390x / Ubuntu virtual server).
          The deterministic runtime engine, regex DLP inspection, and SHA-256 hash chaining execute entirely on the LinuxONE backend.
          Server event integration supports Linux system security logs (Auditd, Syslog) and IBM Z SMF/RACF log formats.
        </p>
      </div>

      {/* 4. Danger Zone — Workspace Reset */}
      {onResetWorkspace && (
        <div className="card" style={{ border: '1px solid #FECACA', backgroundColor: '#FFF5F5' }}>
          <div className="card-header" style={{ borderBottom: '1px solid #FECACA' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#991B1B', margin: 0 }}>
              ⚠ Danger Zone
            </h3>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#11212D', marginBottom: 4 }}>
                  Reset Entire Workspace
                </div>
                <div style={{ fontSize: 12, color: '#6B7B83' }}>
                  Permanently deletes all policies, rules, events, alerts, and audit records for your company. This cannot be undone.
                </div>
              </div>
              <button
                className="btn btn-danger"
                onClick={handleResetWorkspace}
                disabled={resetting}
                style={{ marginLeft: 20, whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                {resetting ? 'Resetting...' : '🗑 Reset Workspace'}
              </button>
            </div>
            {resetStatus && (
              <div style={{ marginTop: 12, padding: '10px 14px', backgroundColor: '#D1FAE5', borderRadius: 6, fontSize: 12, color: '#166534', border: '1px solid #A7F3D0' }}>
                ✓ {resetStatus}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

