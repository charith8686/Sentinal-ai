import React, { useState } from 'react';
import {
  Server,
  Zap,
  Play,
  ShieldAlert,
  CheckCircle,
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  Eye,
  Lock,
  ArrowRight
} from 'lucide-react';
import { EventItem } from '../types';

interface EventMonitoringProps {
  events: EventItem[];
  onSimulateEvent: (eventData: any) => Promise<any>;
  onImportCsv: () => Promise<any>;
  onViewProofCard: (proofId: string) => void;
}

export const EventMonitoring: React.FC<EventMonitoringProps> = ({
  events,
  onSimulateEvent,
  onImportCsv,
  onViewProofCard
}) => {
  const [showSimulateModal, setShowSimulateModal] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [lastEvalResult, setLastEvalResult] = useState<any>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Simulation form states
  const [userId, setUserId] = useState('EMP301');
  const [eventType, setEventType] = useState('AI_DATA_SEND');
  const [resource, setResource] = useState('CUSTOMER_DB');
  const [activityDetails, setActivityDetails] = useState('Personal customer account numbers sent to external chatbot.');
  const [sensitiveData, setSensitiveData] = useState(true);
  const [authorized, setAuthorized] = useState<boolean | null>(false);
  const [rawPrompt, setRawPrompt] = useState('Customer PAN: 4532-1100-8842-9912, SSN: 987-65-4321. Summarize balance.');
  const [destination, setDestination] = useState('api.openai.com');

  const presetScenarios = [
    {
      label: 'Unauthorized External AI Prompt (DLP Leak)',
      user_id: 'EMP301',
      event_type: 'AI_DATA_SEND',
      resource: 'CUSTOMER_DB',
      activity_details: 'Personal customer data sent to unapproved external AI service.',
      sensitive_data: true,
      authorized: false,
      destination: 'api.openai.com',
      raw_prompt: 'Customer card: 4111-2222-3333-4444, SSN: 123-45-6789. Please draft an email.'
    },
    {
      label: 'Normal Authenticated Login (IBM Z SMF)',
      user_id: 'EMP101',
      event_type: 'LOGIN',
      resource: 'IBM_Z_MAINFRAME',
      activity_details: 'Employee logs in during normal working hours via RACF.',
      sensitive_data: false,
      authorized: true,
      destination: 'INTERNAL_IBM_Z',
      raw_prompt: ''
    },
    {
      label: 'Bulk Data Export (Exfiltration Anomaly)',
      user_id: 'EMP104',
      event_type: 'DATA_EXPORT',
      resource: 'CUSTOMER_DB',
      activity_details: 'Employee exports 5000 records in a short period above threshold.',
      sensitive_data: true,
      authorized: true,
      destination: 'INTERNAL_BACKUP_SPOOL',
      raw_prompt: ''
    },
    {
      label: 'Unauthorized Privilege Escalation',
      user_id: 'ADMIN02',
      event_type: 'PERMISSION_CHANGE',
      resource: 'ACCESS_CONTROL',
      activity_details: 'Administrator grants elevated access without an approval ticket.',
      sensitive_data: true,
      authorized: false,
      destination: 'RACF_DATABASE',
      raw_prompt: ''
    },
    {
      label: 'Off-Hours Sensitive Record Access',
      user_id: 'EMP110',
      event_type: 'OFF_HOURS_ACCESS',
      resource: 'CUSTOMER_DB',
      activity_details: 'Employee accesses sensitive records at an unusual hour; business reason not supplied.',
      sensitive_data: true,
      authorized: null,
      destination: 'CICS_TERMINAL',
      raw_prompt: ''
    }
  ];

  const handleSelectScenario = (sc: typeof presetScenarios[0]) => {
    setUserId(sc.user_id);
    setEventType(sc.event_type);
    setResource(sc.resource);
    setActivityDetails(sc.activity_details);
    setSensitiveData(sc.sensitive_data);
    setAuthorized(sc.authorized);
    setDestination(sc.destination);
    setRawPrompt(sc.raw_prompt);
  };

  const handleSubmitSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);
    try {
      const res = await onSimulateEvent({
        user_id: userId,
        event_type: eventType,
        resource,
        activity_details: activityDetails,
        sensitive_data: sensitiveData,
        authorized,
        destination,
        raw_prompt: rawPrompt
      });
      setLastEvalResult(res);
      setShowSimulateModal(false);
    } catch (err: any) {
      alert(err.message || 'Simulation error');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCsvImport = async () => {
    try {
      const res = await onImportCsv();
      setImportStatus(`Imported ${res.imported_count} new events (${res.skipped_existing_count} already existed).`);
      setTimeout(() => setImportStatus(null), 5000);
    } catch (err: any) {
      alert(err.message || 'CSV Import failed');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>Event Monitoring & Deterministic Enforcement</h1>
          <p style={{ color: '#9BA8AB', fontSize: 13 }}>
            Continuous Lane 2 processing. Active rules evaluate SMF/RACF, CICS, and AI gateway events with ZERO AI in the decision path.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={handleCsvImport}>
            <FileSpreadsheet size={15} /> Re-Import Ground Truth CSV
          </button>
          <button className="btn btn-accent" onClick={() => setShowSimulateModal(true)}>
            <Zap size={15} /> Simulate Live Event
          </button>
        </div>
      </div>

      {importStatus && (
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10B981', color: '#10B981', padding: '10px 16px', borderRadius: 6, marginBottom: 16 }}>
          {importStatus}
        </div>
      )}

      {/* Latest Evaluation Result Banner (if just simulated) */}
      {lastEvalResult && (
        <div className="card" style={{ borderLeft: `4px solid ${lastEvalResult.classification === 'PRIVACY_VIOLATION' ? '#EF4444' : (lastEvalResult.classification === 'NORMAL' ? '#10B981' : '#F59E0B')}`, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, color: '#9BA8AB', textTransform: 'uppercase' }}>
                Latest Deterministic Evaluation • Event: <span className="font-mono" style={{ color: '#38BDF8' }}>{lastEvalResult.event_id}</span>
              </div>
              <h3 style={{ fontSize: 16, marginTop: 4 }}>
                {lastEvalResult.classification} — Action: {lastEvalResult.recommended_action}
              </h3>
              <p style={{ fontSize: 13, color: '#CCD0CF', marginTop: 4 }}>{lastEvalResult.reason}</p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#9BA8AB' }}>Evaluation Latency</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#10B981' }}>{lastEvalResult.latency_ms} ms</div>
              <div style={{ fontSize: 10, color: '#9BA8AB' }}>Pure Deterministic</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, marginTop: 12, borderTop: '1px solid #4A5C6A', paddingTop: 10, fontSize: 12 }}>
            <div>
              <span style={{ color: '#9BA8AB' }}>Matched Active Rule:</span>{' '}
              <strong style={{ color: '#CCD0CF' }}>{lastEvalResult.matched_rule_id || 'NONE (Baseline Normal)'}</strong>
            </div>
            <div>
              <span style={{ color: '#9BA8AB' }}>Cited Clause:</span>{' '}
              <strong style={{ color: '#38BDF8' }}>{lastEvalResult.cited_clause_id || 'N/A'}</strong>
            </div>
            <div>
              <span style={{ color: '#9BA8AB' }}>MLz Advisory Anomaly:</span>{' '}
              <strong style={{ color: '#F59E0B' }}>{lastEvalResult.advisory_anomaly_score}</strong>
            </div>
            {lastEvalResult.proof_id && (
              <div>
                <span style={{ color: '#9BA8AB' }}>Proof Card:</span>{' '}
                <button
                  className="btn btn-sm btn-accent"
                  style={{ padding: '0 6px', fontSize: 11 }}
                  onClick={() => onViewProofCard(lastEvalResult.proof_id)}
                >
                  {lastEvalResult.proof_id}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Events Table */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Server size={17} color="#38BDF8" /> Evaluated Event Stream ({events.length} records)
          </h3>
          <span className="badge badge-info font-mono">SIMULATED IBM Z SMF & AI GATEWAY</span>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Event ID</th>
                <th>Timestamp</th>
                <th>User / Actor</th>
                <th>Event Type</th>
                <th>Resource</th>
                <th>Sensitive?</th>
                <th>Authorized?</th>
                <th>Expected Outcome</th>
                <th>Activity Details & DLP</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.event_id}>
                  <td className="font-mono" style={{ color: '#38BDF8', fontWeight: 600 }}>{ev.event_id}</td>
                  <td style={{ fontSize: 11, color: '#9BA8AB' }}>{ev.timestamp.replace('T', ' ')}</td>
                  <td><strong style={{ color: '#FFFFFF' }}>{ev.user_id}</strong></td>
                  <td>
                    <span className="badge badge-neutral font-mono" style={{ fontSize: 10 }}>
                      {ev.event_type}
                    </span>
                  </td>
                  <td className="font-mono" style={{ fontSize: 11 }}>{ev.resource}</td>
                  <td>
                    {ev.sensitive_data ? (
                      <span className="badge badge-danger" style={{ fontSize: 10 }}>SENSITIVE</span>
                    ) : (
                      <span className="badge badge-neutral" style={{ fontSize: 10 }}>STANDARD</span>
                    )}
                  </td>
                  <td>
                    {ev.authorized === true && <span className="badge badge-success" style={{ fontSize: 10 }}>YES</span>}
                    {ev.authorized === false && <span className="badge badge-danger" style={{ fontSize: 10 }}>NO</span>}
                    {ev.authorized === null && <span className="badge badge-warning" style={{ fontSize: 10 }}>UNKNOWN</span>}
                  </td>
                  <td>
                    {ev.expected_classification && (
                      <div>
                        <span className={`badge ${ev.expected_classification === 'PRIVACY_VIOLATION' ? 'badge-danger' : (ev.expected_classification === 'SUSPICIOUS' ? 'badge-warning' : 'badge-success')}`} style={{ fontSize: 10 }}>
                          {ev.expected_classification}
                        </span>
                        <div style={{ fontSize: 10, color: '#9BA8AB', marginTop: 2 }}>{ev.expected_action}</div>
                      </div>
                    )}
                  </td>
                  <td style={{ maxWidth: 320 }}>
                    <div style={{ fontSize: 12, color: '#CCD0CF' }}>{ev.activity_details}</div>
                    {ev.dlp_findings && ev.dlp_findings.length > 0 && (
                      <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {ev.dlp_findings.map((f, i) => (
                          <span key={i} className="badge badge-warning font-mono" style={{ fontSize: 9 }}>
                            DLP: {f.category} ({f.sample_masked})
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simulate Event Modal */}
      {showSimulateModal && (
        <div className="modal-overlay" onClick={() => setShowSimulateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={18} color="#38BDF8" /> Simulate Event & Inline Deterministic Evaluation
              </h3>
              <span className="badge badge-info font-mono">Lane 2 Detection</span>
            </div>

            <form onSubmit={handleSubmitSimulation}>
              <div className="modal-body">
                {/* Preset Scenario Selector */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, color: '#9BA8AB', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
                    Select Demonstration Scenario:
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {presetScenarios.map((sc, i) => (
                      <button
                        key={i}
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => handleSelectScenario(sc)}
                        style={{ fontSize: 11 }}
                      >
                        {sc.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid-2" style={{ gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#9BA8AB', marginBottom: 4 }}>User ID / RACF Principal</label>
                    <input type="text" value={userId} onChange={(e) => setUserId(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#9BA8AB', marginBottom: 4 }}>Event Type</label>
                    <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
                      <option value="AI_DATA_SEND">AI_DATA_SEND (AI Gateway Prompt)</option>
                      <option value="LOGIN">LOGIN (SMF Type 80)</option>
                      <option value="READ_RECORD">READ_RECORD (Customer DB Access)</option>
                      <option value="DATA_EXPORT">DATA_EXPORT (Batch Exfiltration)</option>
                      <option value="EXTERNAL_TRANSFER">EXTERNAL_TRANSFER (Cross-Border Movement)</option>
                      <option value="PERMISSION_CHANGE">PERMISSION_CHANGE (RACF Privilege Grant)</option>
                      <option value="OFF_HOURS_ACCESS">OFF_HOURS_ACCESS (Temporal Anomaly)</option>
                    </select>
                  </div>
                </div>

                <div className="grid-2" style={{ gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#9BA8AB', marginBottom: 4 }}>Resource Target</label>
                    <input type="text" value={resource} onChange={(e) => setResource(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#9BA8AB', marginBottom: 4 }}>Destination Endpoint / Host</label>
                    <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} />
                  </div>
                </div>

                <div className="grid-2" style={{ gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#9BA8AB', marginBottom: 4 }}>Contains Sensitive Data?</label>
                    <select value={sensitiveData ? 'true' : 'false'} onChange={(e) => setSensitiveData(e.target.value === 'true')}>
                      <option value="true">True (PII / Financial / Credentials)</option>
                      <option value="false">False (Standard / Public)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#9BA8AB', marginBottom: 4 }}>Authorized by Policy / Role?</label>
                    <select
                      value={authorized === true ? 'true' : (authorized === false ? 'false' : 'null')}
                      onChange={(e) => setAuthorized(e.target.value === 'true' ? true : (e.target.value === 'false' ? false : null))}
                    >
                      <option value="true">Authorized (Valid permission & ticket)</option>
                      <option value="false">Unauthorized (No ticket / wrong role)</option>
                      <option value="null">Indeterminate (Missing context)</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#9BA8AB', marginBottom: 4 }}>Activity Details</label>
                  <input type="text" value={activityDetails} onChange={(e) => setActivityDetails(e.target.value)} required />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#9BA8AB', marginBottom: 4 }}>
                    Raw AI Prompt / Outbound Content (Optional DLP Pattern Test)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter outgoing prompt to test inline regex DLP (Credit card, SSN, API key redaction)..."
                    value={rawPrompt}
                    onChange={(e) => setRawPrompt(e.target.value)}
                  />
                  <div style={{ fontSize: 11, color: '#9BA8AB', marginTop: 4 }}>
                    Data Privacy Guarantee: Raw prompt is scanned in-memory and immediately purged. Only masked metadata is persisted.
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-neutral" onClick={() => setShowSimulateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-accent" disabled={isSimulating}>
                  <Play size={14} /> {isSimulating ? 'Evaluating...' : 'Ingest & Evaluate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
