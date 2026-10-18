import React, { useState } from 'react';
import {
  AlertTriangle,
  Server,
  Zap,
  CheckCircle2,
  Clock,
  Send,
  Play
} from 'lucide-react';
import { EventItem, AlertItem } from '../types';

interface EventsAndAlertsProps {
  events: EventItem[];
  alerts: AlertItem[];
  onSimulateEvent: (eventData: any) => Promise<any>;
  onUpdateAlert: (alertId: string, data: { status?: string; assigned_to?: string; new_note?: string }) => Promise<any>;
  onViewProofCard: (proofId: string) => void;
  selectedAlertId?: string | null;
}

export const EventsAndAlerts: React.FC<EventsAndAlertsProps> = ({
  events,
  alerts,
  onSimulateEvent,
  onUpdateAlert,
  onViewProofCard,
  selectedAlertId
}) => {
  const [subTab, setSubTab] = useState<'alerts' | 'events'>('alerts');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [activeAlert, setActiveAlert] = useState<AlertItem | null>(
    selectedAlertId ? alerts.find((a) => a.alert_id === selectedAlertId) || null : null
  );
  const [newNote, setNewNote] = useState<string>('');
  const [assignedToInput, setAssignedToInput] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Simulation Modal State
  const [showSimulateModal, setShowSimulateModal] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [lastEvalResult, setLastEvalResult] = useState<any>(null);

  // Clean empty simulation form fields
  const [userId, setUserId] = useState('');
  const [eventType, setEventType] = useState('AI_DATA_SEND');
  const [resource, setResource] = useState('');
  const [activityDetails, setActivityDetails] = useState('');
  const [sensitiveData, setSensitiveData] = useState(false);
  const [authorized, setAuthorized] = useState<boolean | null>(true);
  const [destination, setDestination] = useState('');
  const [rawPrompt, setRawPrompt] = useState('');

  const handleSubmitSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);
    try {
      const res = await onSimulateEvent({
        user_id: userId || 'EMP_USER',
        event_type: eventType,
        resource: resource || 'SYSTEM_DB',
        activity_details: activityDetails,
        sensitive_data: sensitiveData,
        authorized,
        destination: destination || 'LINUX_SERVER',
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

  const handleSaveInvestigation = async (newStatus?: string) => {
    if (!activeAlert) return;
    setIsUpdating(true);
    try {
      await onUpdateAlert(activeAlert.alert_id, {
        status: newStatus || activeAlert.investigation_status,
        assigned_to: assignedToInput || activeAlert.assigned_to || undefined,
        new_note: newNote.trim() ? newNote : undefined
      });
      setActiveAlert((prev) => {
        if (!prev) return null;
        const notes = prev.investigation_notes ? [...prev.investigation_notes] : [];
        if (newNote.trim()) {
          notes.push({
            author: 'Company Security Lead',
            timestamp: new Date().toISOString(),
            text: newNote
          });
        }
        return {
          ...prev,
          investigation_status: (newStatus as any) || prev.investigation_status,
          assigned_to: assignedToInput || prev.assigned_to,
          investigation_notes: notes
        };
      });
      setNewNote('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredAlerts = alerts.filter((alt) => {
    if (severityFilter !== 'ALL' && alt.severity !== severityFilter) return false;
    if (statusFilter !== 'ALL' && alt.investigation_status !== statusFilter) return false;
    return true;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, color: '#11212D', marginBottom: 4 }}>
            Events & Alerts
          </h1>
          <p style={{ color: '#4A5C6A', fontSize: 13 }}>
            Continuous monitoring and deterministic evaluation against your company's active privacy rules.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={() => setShowSimulateModal(true)}>
            <Zap size={14} /> Evaluate Test Event
          </button>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid #CCD0CF', marginBottom: 20 }}>
        <button
          onClick={() => setSubTab('alerts')}
          style={{
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            color: subTab === 'alerts' ? '#11212D' : '#6B7B83',
            borderBottom: subTab === 'alerts' ? '2px solid #253745' : '2px solid transparent'
          }}
        >
          Security Alerts ({alerts.length})
        </button>
        <button
          onClick={() => setSubTab('events')}
          style={{
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            color: subTab === 'events' ? '#11212D' : '#6B7B83',
            borderBottom: subTab === 'events' ? '2px solid #253745' : '2px solid transparent'
          }}
        >
          Evaluated Events ({events.length})
        </button>
      </div>

      {/* Latest Evaluation Result Banner */}
      {lastEvalResult && (
        <div className="card" style={{
          padding: '14px 18px',
          marginBottom: 18,
          borderLeft: `4px solid ${lastEvalResult.classification === 'PRIVACY_VIOLATION' ? '#991B1B' : (lastEvalResult.classification === 'NORMAL' ? '#166534' : '#92400E')}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: '#4A5C6A', textTransform: 'uppercase', fontWeight: 600 }}>
                Test Evaluation Result
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#11212D', marginTop: 2 }}>
                {lastEvalResult.classification === 'PRIVACY_VIOLATION' ? 'Privacy Violation Detected' : (lastEvalResult.classification === 'NORMAL' ? 'Compliant Event' : 'Suspicious Activity')} — Action: {lastEvalResult.recommended_action}
              </div>
              <div style={{ fontSize: 12, color: '#4A5C6A', marginTop: 2 }}>
                {lastEvalResult.reason}
              </div>
            </div>

            {lastEvalResult.proof_id && (
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => onViewProofCard(lastEvalResult.proof_id)}
              >
                View Audit Proof Card
              </button>
            )}
          </div>
        </div>
      )}

      {/* TAB 1: SECURITY ALERTS */}
      {subTab === 'alerts' && (
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, color: '#11212D' }}>
              <AlertTriangle size={16} color="#991B1B" /> Detection Alerts ({filteredAlerts.length})
            </h3>

            {/* Filter controls */}
            <div style={{ display: 'flex', gap: 10 }}>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                style={{ width: '130px', padding: '4px 8px', fontSize: 12 }}
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: '130px', padding: '4px 8px', fontSize: 12 }}
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="INVESTIGATING">Investigating</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>
          </div>

          {filteredAlerts.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: '#6B7B83', fontSize: 13 }}>
              <CheckCircle2 size={28} color="#166534" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontWeight: 600, color: '#11212D', marginBottom: 4 }}>Zero alerts recorded</div>
              <div>Events matching your company's active privacy rules will generate genuine alerts here.</div>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Alert Description</th>
                    <th>Detection Time</th>
                    <th>Severity</th>
                    <th>Citation</th>
                    <th>Assignee</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAlerts.map((alt) => (
                    <tr key={alt.alert_id}>
                      <td style={{ fontWeight: 600, color: '#11212D', maxWidth: 320 }}>
                        {alt.explanation}
                      </td>
                      <td style={{ fontSize: 11, color: '#6B7B83' }}>
                        {alt.detection_time.slice(0, 19).replace('T', ' ')}
                      </td>
                      <td>
                        <span className={`badge ${alt.severity === 'CRITICAL' || alt.severity === 'HIGH' ? 'badge-danger' : 'badge-warning'}`}>
                          {alt.severity}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, fontWeight: 500 }}>{alt.cited_clause_id}</td>
                      <td style={{ fontSize: 12, color: alt.assigned_to ? '#253745' : '#6B7B83' }}>
                        {alt.assigned_to || 'Unassigned'}
                      </td>
                      <td>
                        <span className={`badge ${alt.investigation_status === 'RESOLVED' ? 'badge-success' : (alt.investigation_status === 'INVESTIGATING' ? 'badge-warning' : 'badge-danger')}`}>
                          {alt.investigation_status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => {
                            setActiveAlert(alt);
                            setAssignedToInput(alt.assigned_to || '');
                          }}
                        >
                          Inspect Case
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EVENT STREAM */}
      {subTab === 'events' && (
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, color: '#11212D' }}>
              <Server size={16} color="#4A5C6A" /> Evaluated System Events ({events.length})
            </h3>
            <span style={{ fontSize: 12, color: '#6B7B83' }}>Company Stream</span>
          </div>

          {events.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: '#6B7B83', fontSize: 13 }}>
              <Server size={28} color="#9BA8AB" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontWeight: 600, color: '#11212D', marginBottom: 4 }}>No events ingested yet</div>
              <div>Use "Evaluate Test Event" to test live events against your active rules.</div>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User / Principal</th>
                    <th>Event Type</th>
                    <th>Resource</th>
                    <th>Sensitive Data?</th>
                    <th>Authorized?</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => (
                    <tr key={ev.event_id}>
                      <td style={{ fontSize: 11, color: '#6B7B83' }}>
                        {ev.timestamp.replace('T', ' ').slice(0, 19)}
                      </td>
                      <td style={{ fontWeight: 600 }}>{ev.user_id}</td>
                      <td>
                        <span className="badge badge-neutral font-mono" style={{ fontSize: 10 }}>
                          {ev.event_type}
                        </span>
                      </td>
                      <td className="font-mono" style={{ fontSize: 11 }}>{ev.resource}</td>
                      <td>
                        {ev.sensitive_data ? (
                          <span className="badge badge-danger" style={{ fontSize: 10 }}>Yes</span>
                        ) : (
                          <span className="badge badge-neutral" style={{ fontSize: 10 }}>No</span>
                        )}
                      </td>
                      <td>
                        {ev.authorized === true && <span className="badge badge-success" style={{ fontSize: 10 }}>Yes</span>}
                        {ev.authorized === false && <span className="badge badge-danger" style={{ fontSize: 10 }}>No</span>}
                        {ev.authorized === null && <span className="badge badge-warning" style={{ fontSize: 10 }}>Unknown</span>}
                      </td>
                      <td style={{ fontSize: 12, maxWidth: 300, color: '#4A5C6A' }}>
                        {ev.activity_details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Case Investigation Modal */}
      {activeAlert && (
        <div className="modal-overlay" onClick={() => setActiveAlert(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: 16, color: '#11212D', margin: 0 }}>Incident Investigation</h3>
                <div style={{ fontSize: 11, color: '#4A5C6A', marginTop: 2 }}>
                  Detected at {activeAlert.detection_time.slice(0, 19).replace('T', ' ')} • Severity: {activeAlert.severity}
                </div>
              </div>
              <span className={`badge ${activeAlert.investigation_status === 'RESOLVED' ? 'badge-success' : 'badge-danger'}`}>
                {activeAlert.investigation_status}
              </span>
            </div>

            <div className="modal-body">
              <div style={{ backgroundColor: '#F5F7F8', padding: 14, borderRadius: 6, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#4A5C6A', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                  Why Was This Flagged?
                </div>
                <div style={{ fontSize: 13, color: '#11212D', fontWeight: 500, marginBottom: 10 }}>
                  {activeAlert.explanation}
                </div>
                <div style={{ fontSize: 11, color: '#4A5C6A', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                  Recommended Action
                </div>
                <div style={{ fontSize: 12, color: '#253745' }}>
                  {activeAlert.recommended_remediation}
                </div>
              </div>

              {/* Status & Assignee Controls */}
              <div className="grid-2" style={{ gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#4A5C6A', fontWeight: 500, marginBottom: 4 }}>Case Status</label>
                  <select
                    value={activeAlert.investigation_status}
                    onChange={(e) => handleSaveInvestigation(e.target.value)}
                  >
                    <option value="OPEN">Open (Unresolved)</option>
                    <option value="INVESTIGATING">Investigating</option>
                    <option value="RESOLVED">Resolved</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#4A5C6A', fontWeight: 500, marginBottom: 4 }}>Assignee</label>
                  <input
                    type="text"
                    value={assignedToInput}
                    onChange={(e) => setAssignedToInput(e.target.value)}
                    placeholder="e.g. Lead Security Analyst"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#11212D', marginBottom: 6 }}>
                  Investigation Log:
                </div>

                {activeAlert.investigation_notes && activeAlert.investigation_notes.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 110, overflowY: 'auto', marginBottom: 10 }}>
                    {activeAlert.investigation_notes.map((note, idx) => (
                      <div key={idx} style={{ backgroundColor: '#FAFBFB', padding: '6px 10px', borderRadius: 4, fontSize: 12, border: '1px solid #E2E6E7' }}>
                        <div style={{ fontSize: 10, color: '#6B7B83', display: 'flex', justifyContent: 'space-between' }}>
                          <strong>{note.author}</strong>
                          <span>{note.timestamp.slice(0, 19).replace('T', ' ')}</span>
                        </div>
                        <div style={{ color: '#253745', marginTop: 2 }}>{note.text}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#6B7B83', marginBottom: 8, fontStyle: 'italic' }}>
                    No investigation notes recorded yet.
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Add an investigation finding..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleSaveInvestigation()}
                    disabled={isUpdating || !newNote.trim()}
                  >
                    <Send size={13} /> Add Note
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setActiveAlert(null)}>
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={isUpdating || activeAlert.investigation_status === 'RESOLVED'}
                onClick={() => handleSaveInvestigation('RESOLVED')}
              >
                <CheckCircle2 size={14} /> Close & Mark Case Resolved
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simulate Event Modal */}
      {showSimulateModal && (
        <div className="modal-overlay" onClick={() => setShowSimulateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#11212D', margin: 0 }}>
                <Zap size={16} color="#253745" /> Evaluate Event Against Active Rules
              </h3>
              <span className="badge badge-neutral font-mono">Deterministic Evaluation</span>
            </div>

            <form onSubmit={handleSubmitSimulation}>
              <div className="modal-body">
                <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#4A5C6A', fontWeight: 500, marginBottom: 4 }}>User / Service Account</label>
                    <input type="text" placeholder="e.g. EMP_204" value={userId} onChange={(e) => setUserId(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#4A5C6A', fontWeight: 500, marginBottom: 4 }}>Event Type</label>
                    <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
                      <option value="AI_DATA_SEND">AI_DATA_SEND (Outbound External AI Egress)</option>
                      <option value="DATA_EXPORT">DATA_EXPORT (Database Export Batch)</option>
                      <option value="READ_RECORD">READ_RECORD (Customer DB Access)</option>
                      <option value="LOGIN">LOGIN (System Access)</option>
                      <option value="PERMISSION_CHANGE">PERMISSION_CHANGE (Privilege Grant)</option>
                    </select>
                  </div>
                </div>

                <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#4A5C6A', fontWeight: 500, marginBottom: 4 }}>Target Resource</label>
                    <input type="text" placeholder="e.g. CUSTOMER_DB" value={resource} onChange={(e) => setResource(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#4A5C6A', fontWeight: 500, marginBottom: 4 }}>Destination Endpoint</label>
                    <input type="text" placeholder="e.g. api.external-ai.com" value={destination} onChange={(e) => setDestination(e.target.value)} />
                  </div>
                </div>

                <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#4A5C6A', fontWeight: 500, marginBottom: 4 }}>Contains Sensitive Data?</label>
                    <select value={sensitiveData ? 'true' : 'false'} onChange={(e) => setSensitiveData(e.target.value === 'true')}>
                      <option value="true">True (PII, Financial, or Confidential Records)</option>
                      <option value="false">False (Standard / Public Records)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#4A5C6A', fontWeight: 500, marginBottom: 4 }}>Authorized with Valid Ticket?</label>
                    <select
                      value={authorized === true ? 'true' : (authorized === false ? 'false' : 'null')}
                      onChange={(e) => setAuthorized(e.target.value === 'true' ? true : (e.target.value === 'false' ? false : null))}
                    >
                      <option value="true">Authorized (Approved Ticket Documented)</option>
                      <option value="false">Unauthorized (No Ticket / Role Mismatch)</option>
                      <option value="null">Unverified Context</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#4A5C6A', fontWeight: 500, marginBottom: 4 }}>Activity Details</label>
                  <input
                    type="text"
                    placeholder="e.g. Employee transferred customer database records to unapproved external endpoint."
                    value={activityDetails}
                    onChange={(e) => setActivityDetails(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#4A5C6A', fontWeight: 500, marginBottom: 4 }}>
                    Payload Content (Optional Inline DLP Scan)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter payload to test real-time DLP regex inspection (Credit Cards, SSN, API Tokens)..."
                    value={rawPrompt}
                    onChange={(e) => setRawPrompt(e.target.value)}
                  />
                  <div style={{ fontSize: 11, color: '#6B7B83', marginTop: 3 }}>
                    Confidential prompt text is scanned in memory and purged immediately; only masked metadata is stored.
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowSimulateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSimulating}>
                  <Play size={13} /> {isSimulating ? 'Evaluating...' : 'Ingest & Evaluate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
