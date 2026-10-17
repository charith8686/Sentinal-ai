import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  ShieldAlert,
  User,
  MessageSquare,
  FileCheck,
  Send,
  Filter
} from 'lucide-react';
import { AlertItem } from '../types';

interface AlertsInvestigationsProps {
  alerts: AlertItem[];
  onUpdateAlert: (alertId: string, data: { status?: string; assigned_to?: string; new_note?: string }) => Promise<any>;
  onViewProofCard: (proofId: string) => void;
}

export const AlertsInvestigations: React.FC<AlertsInvestigationsProps> = ({
  alerts,
  onUpdateAlert,
  onViewProofCard
}) => {
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [newNote, setNewNote] = useState<string>('');
  const [assignedToInput, setAssignedToInput] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const filteredAlerts = alerts.filter((alt) => {
    if (severityFilter !== 'ALL' && alt.severity !== severityFilter) return false;
    if (statusFilter !== 'ALL' && alt.investigation_status !== statusFilter) return false;
    return true;
  });

  const handleSaveInvestigation = async (newStatus?: string) => {
    if (!selectedAlert) return;
    setIsUpdating(true);
    try {
      await onUpdateAlert(selectedAlert.alert_id, {
        status: newStatus || selectedAlert.investigation_status,
        assigned_to: assignedToInput || selectedAlert.assigned_to || undefined,
        new_note: newNote.trim() ? newNote : undefined
      });
      // Update local state
      setSelectedAlert((prev) => {
        if (!prev) return null;
        const notes = prev.investigation_notes ? [...prev.investigation_notes] : [];
        if (newNote.trim()) {
          notes.push({
            author: 'Current Reviewer',
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

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'RESOLVED':
        return <span className="badge badge-success"><CheckCircle size={10} /> RESOLVED</span>;
      case 'REMEDIATED':
        return <span className="badge badge-info">REMEDIATED</span>;
      case 'INVESTIGATING':
        return <span className="badge badge-warning"><Clock size={10} /> INVESTIGATING</span>;
      case 'OPEN':
      default:
        return <span className="badge badge-danger">OPEN</span>;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>Alerts & Case Investigations</h1>
          <p style={{ color: '#9BA8AB', fontSize: 13 }}>
            Review deterministic security detections, manage incident lifecycles, and maintain tamper-evident audit evidence.
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10 }}>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{ width: '140px', backgroundColor: '#11212D' }}
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
            style={{ width: '160px', backgroundColor: '#11212D' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="REMEDIATED">Remediated</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={17} color="#EF4444" /> Security Alerts ({filteredAlerts.length})
          </h3>
          <span style={{ fontSize: 12, color: '#9BA8AB' }}>Compliance Incidents</span>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Alert ID</th>
                <th>Detection Time</th>
                <th>Severity</th>
                <th>Target Event</th>
                <th>Rule Matched</th>
                <th>Cited Clause</th>
                <th>Assigned To</th>
                <th>Case Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.map((alt) => (
                <tr key={alt.alert_id}>
                  <td className="font-mono" style={{ color: '#38BDF8', fontWeight: 600 }}>{alt.alert_id}</td>
                  <td style={{ fontSize: 11, color: '#9BA8AB' }}>{alt.detection_time.slice(0, 19).replace('T', ' ')}</td>
                  <td>
                    <span className={`badge ${alt.severity === 'CRITICAL' || alt.severity === 'HIGH' ? 'badge-danger' : 'badge-warning'}`}>
                      {alt.severity}
                    </span>
                  </td>
                  <td className="font-mono">{alt.event_id}</td>
                  <td className="font-mono" style={{ fontSize: 12 }}>{alt.rule_id} v{alt.rule_version}</td>
                  <td style={{ color: '#CCD0CF', fontWeight: 600 }}>{alt.cited_clause_id}</td>
                  <td style={{ fontSize: 12, color: alt.assigned_to ? '#CCD0CF' : '#9BA8AB' }}>
                    {alt.assigned_to || 'Unassigned'}
                  </td>
                  <td>{getStatusBadge(alt.investigation_status)}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => {
                        setSelectedAlert(alt);
                        setAssignedToInput(alt.assigned_to || '');
                      }}
                    >
                      Investigate Case
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Investigation Details Modal */}
      {selectedAlert && (
        <div className="modal-overlay" onClick={() => setSelectedAlert(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: 17, color: '#FFFFFF' }}>Incident Case: {selectedAlert.alert_id}</h3>
                <div style={{ fontSize: 11, color: '#9BA8AB', marginTop: 2 }}>
                  Detected at {selectedAlert.detection_time} • Severity:{' '}
                  <span style={{ color: '#EF4444', fontWeight: 700 }}>{selectedAlert.severity}</span>
                </div>
              </div>
              <div>{getStatusBadge(selectedAlert.investigation_status)}</div>
            </div>

            <div className="modal-body">
              {/* Event & Matched Rule Linchpin */}
              <div className="grid-2" style={{ gap: 14, marginBottom: 16 }}>
                <div style={{ backgroundColor: '#06141B', padding: 12, borderRadius: 6, border: '1px solid #4A5C6A' }}>
                  <div style={{ fontSize: 11, color: '#9BA8AB', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                    Event Target & Actor
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>
                    Event ID: <span className="font-mono" style={{ color: '#38BDF8' }}>{selectedAlert.event_id}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#CCD0CF', marginTop: 4 }}>
                    Actor: <strong>{selectedAlert.event_details?.user_id}</strong> • Resource: <span className="font-mono">{selectedAlert.event_details?.resource}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#9BA8AB', marginTop: 4 }}>
                    Details: {selectedAlert.event_details?.activity_details}
                  </div>
                </div>

                <div style={{ backgroundColor: '#06141B', padding: 12, borderRadius: 6, border: '1px solid #4A5C6A' }}>
                  <div style={{ fontSize: 11, color: '#38BDF8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                    Matched Rule & Legal Evidence
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#CCD0CF' }}>
                    Rule: <span className="font-mono" style={{ color: '#10B981' }}>{selectedAlert.rule_id}</span> (v{selectedAlert.rule_version})
                  </div>
                  <div style={{ fontSize: 12, color: '#CCD0CF', marginTop: 4 }}>
                    Cited Legal Clause: <strong style={{ color: '#38BDF8' }}>{selectedAlert.cited_clause_id}</strong>
                  </div>
                  <div style={{ fontSize: 11, color: '#9BA8AB', marginTop: 4 }}>
                    Policy Source: {selectedAlert.policy_id} v{selectedAlert.policy_version}
                  </div>
                </div>
              </div>

              {/* Explanation & Remediation Playbook */}
              <div style={{ backgroundColor: '#11212D', padding: 14, borderRadius: 6, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#9BA8AB', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                  Technical Explanation (Cited Evidence):
                </div>
                <p style={{ fontSize: 13, color: '#CCD0CF', marginBottom: 12 }}>{selectedAlert.explanation}</p>

                <div style={{ fontSize: 11, color: '#10B981', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                  Recommended Remediation Playbook:
                </div>
                <p style={{ fontSize: 12, color: '#CCD0CF' }}>{selectedAlert.recommended_remediation}</p>
              </div>

              {/* Investigation Status & Assignee Controls */}
              <div className="grid-2" style={{ gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#9BA8AB', marginBottom: 4 }}>Case Status</label>
                  <select
                    value={selectedAlert.investigation_status}
                    onChange={(e) => handleSaveInvestigation(e.target.value)}
                  >
                    <option value="OPEN">OPEN (Unresolved)</option>
                    <option value="INVESTIGATING">INVESTIGATING (SOC Active)</option>
                    <option value="REMEDIATED">REMEDIATED (Access Revoked / Safeguarded)</option>
                    <option value="RESOLVED">RESOLVED (Case Closed)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#9BA8AB', marginBottom: 4 }}>Assignee</label>
                  <input
                    type="text"
                    value={assignedToInput}
                    onChange={(e) => setAssignedToInput(e.target.value)}
                    placeholder="e.g. SOC Analyst (K. Rivera)"
                  />
                </div>
              </div>

              {/* Investigation Notes History */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#CCD0CF', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MessageSquare size={14} color="#38BDF8" /> Investigation Audit Notes:
                </div>

                {selectedAlert.investigation_notes && selectedAlert.investigation_notes.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 120, overflowY: 'auto', marginBottom: 10 }}>
                    {selectedAlert.investigation_notes.map((note, idx) => (
                      <div key={idx} style={{ backgroundColor: '#06141B', padding: '6px 10px', borderRadius: 4, fontSize: 12 }}>
                        <div style={{ fontSize: 10, color: '#9BA8AB', display: 'flex', justifyContent: 'space-between' }}>
                          <strong>{note.author}</strong>
                          <span>{note.timestamp.slice(0, 19).replace('T', ' ')}</span>
                        </div>
                        <div style={{ color: '#CCD0CF', marginTop: 2 }}>{note.text}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#9BA8AB', marginBottom: 8, fontStyle: 'italic' }}>
                    No investigation notes recorded yet.
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Add an investigation finding or remediation note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveInvestigation();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleSaveInvestigation()}
                    disabled={isUpdating || !newNote.trim()}
                  >
                    <Send size={13} /> Add Note
                  </button>
                </div>
              </div>

              <div style={{ fontSize: 11, color: '#9BA8AB', borderTop: '1px solid #4A5C6A', paddingTop: 8 }}>
                Security Principle: Resolving an alert does NOT rewrite the original detection result or mutate the SHA-256 hash-chained proof card.
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-neutral" onClick={() => setSelectedAlert(null)}>
                Close
              </button>
              <button
                type="button"
                className="btn btn-success"
                disabled={isUpdating || selectedAlert.investigation_status === 'RESOLVED'}
                onClick={() => handleSaveInvestigation('RESOLVED')}
              >
                <CheckCircle size={14} /> Close & Mark Case Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
