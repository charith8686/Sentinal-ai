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
}

export const SettingsIndustry: React.FC<SettingsIndustryProps> = ({
  health,
  onImportCsv
}) => {
  const [aiStatus, setAiStatus] = useState<any>(null);
  const [checkingAi, setCheckingAi] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
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
          <span style={{ fontSize: 12, color: '#6B7B83' }}>Company-Isolated CSV Evaluation</span>
        </div>

        <p style={{ fontSize: 13, color: '#253745', marginBottom: 12 }}>
          Select a CSV dataset containing access logs or system events to evaluate against your company's active compliance rules.
          Events are parsed, evaluated deterministically, flagged for alerts when non-compliant, and cryptographically sealed into your company's SHA-256 audit ledger.
        </p>

        <div style={{
          backgroundColor: '#FAFBFB',
          border: '1px solid #E2E6E7',
          borderRadius: 6,
          padding: '12px 14px',
          marginBottom: 16,
          fontSize: 12,
          color: '#4A5C6A'
        }}>
          <strong>Supported Columns:</strong> <code>event_id</code>, <code>timestamp</code>, <code>user_id</code>, <code>event_type</code>, <code>resource</code>, <code>activity_details</code>, <code>sensitive_data</code>, <code>authorized</code>, <code>policy_rule</code>, <code>destination</code>
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
            Click to choose a .csv file from your computer
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
    </div>
  );
};
