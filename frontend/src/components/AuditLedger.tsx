import React, { useState } from 'react';
import {
  Link2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Eye,
  Lock,
  Info,
  Trash2
} from 'lucide-react';
import { ProofCardItem, AuditVerification } from '../types';

interface AuditLedgerProps {
  ledger: ProofCardItem[];
  verificationResult: AuditVerification | null;
  onVerifyLedger: () => Promise<any>;
  onSimulateTamper: (proofId?: string) => Promise<any>;
  onRestoreLedger: () => Promise<any>;
  onDeleteRecord?: (proofId: string) => Promise<any>;
  onClearLedger?: () => Promise<any>;
  initialFocusProofId?: string | null;
}

export const AuditLedger: React.FC<AuditLedgerProps> = ({
  ledger,
  verificationResult,
  onVerifyLedger,
  onSimulateTamper,
  onRestoreLedger,
  onDeleteRecord,
  onClearLedger,
  initialFocusProofId
}) => {
  const [selectedProof, setSelectedProof] = useState<ProofCardItem | null>(
    initialFocusProofId ? ledger.find((l) => l.proof_id === initialFocusProofId) || null : null
  );
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [tamperLoading, setTamperLoading] = useState<boolean>(false);

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      await onVerifyLedger();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleTamper = async (proofId?: string) => {
    setTamperLoading(true);
    try {
      await onSimulateTamper(proofId);
      await onVerifyLedger();
    } catch (err: any) {
      alert(err.message || 'Tamper test failed');
    } finally {
      setTamperLoading(false);
    }
  };

  const handleRestore = async () => {
    setTamperLoading(true);
    try {
      await onRestoreLedger();
      await onVerifyLedger();
    } finally {
      setTamperLoading(false);
    }
  };

  const handleClearLedger = async () => {
    if (!onClearLedger) return;
    if (!window.confirm(`Are you sure you want to clear all ${ledger.length} records from your company's audit ledger? This will reset your cryptographic ledger back to genesis.`)) {
      return;
    }
    try {
      await onClearLedger();
      setSelectedProof(null);
      await onVerifyLedger();
    } catch (err: any) {
      alert(err.message || 'Failed to clear audit ledger.');
    }
  };

  const handleDeleteSingleProof = async (proofId: string) => {
    if (!onDeleteRecord) return;
    if (!window.confirm(`Are you sure you want to delete audit record ${proofId}?`)) {
      return;
    }
    try {
      await onDeleteRecord(proofId);
      setSelectedProof(null);
      await onVerifyLedger();
    } catch (err: any) {
      alert(err.message || 'Failed to delete audit record.');
    }
  };

  const isIntact = verificationResult?.is_valid ?? true;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, color: '#11212D', marginBottom: 4 }}>
            Audit Ledger & Cryptographic Proof
          </h1>
          <p style={{ color: '#4A5C6A', fontSize: 13 }}>
            Sequential SHA-256 hash chaining of every evaluation verdict, active rule, and cited clause.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className={`btn ${isIntact ? 'btn-success' : 'btn-danger'}`}
            onClick={handleVerify}
            disabled={isVerifying}
          >
            <RefreshCw size={14} className={isVerifying ? 'animate-spin' : ''} />
            {isVerifying ? 'Verifying Hashes...' : 'Verify Ledger Integrity'}
          </button>

          {ledger.length > 0 && (
            isIntact ? (
              <button
                className="btn btn-secondary"
                onClick={() => handleTamper()}
                disabled={tamperLoading}
                title="Test cryptographic tamper detection on a database record"
              >
                <AlertTriangle size={14} /> Test Tamper Detection
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={handleRestore}
                disabled={tamperLoading}
                title="Re-seal hash chain and restore cryptographic integrity"
              >
                <RotateCcw size={14} /> Re-Seal Ledger
              </button>
            )
          )}

          {ledger.length > 0 && onClearLedger && (
            <button
              className="btn btn-danger"
              onClick={handleClearLedger}
              title="Clear all records from audit ledger"
            >
              <Trash2 size={14} /> Clear Ledger
            </button>
          )}
        </div>
      </div>

      {/* Verification Status Banner */}
      <div
        className="card"
        style={{
          borderLeft: `4px solid ${isIntact ? '#166534' : '#991B1B'}`,
          backgroundColor: isIntact ? '#F0FDF4' : '#FEF2F2',
          padding: '16px 20px',
          marginBottom: 20
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isIntact ? <CheckCircle2 size={22} color="#166534" /> : <AlertTriangle size={22} color="#991B1B" />}
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: isIntact ? '#166534' : '#991B1B' }}>
                {ledger.length === 0
                  ? 'Audit Ledger Initialized (Zero Records)'
                  : (isIntact ? 'Audit Ledger Cryptographically Verified' : 'Tamper Detected: Hash Dependency Broken')}
              </div>
              <div style={{ fontSize: 12, color: '#253745', marginTop: 2 }}>
                {verificationResult?.details || 'All records sealed with sequential SHA-256 hashes.'}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#4A5C6A' }}>Sealed Proof Records</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#11212D' }}>{ledger.length}</div>
          </div>
        </div>

        {!isIntact && verificationResult?.first_corrupted_id && (
          <div style={{ marginTop: 10, padding: 8, backgroundColor: '#FFFFFF', borderRadius: 4, border: '1px solid #FECACA', fontSize: 12 }}>
            <strong style={{ color: '#991B1B' }}>First Corrupted Record:</strong>{' '}
            <span className="font-mono">{verificationResult.first_corrupted_id}</span>
          </div>
        )}
      </div>

      {/* Educational Disclosure on Immutable Storage vs Hash Chaining */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: 20, backgroundColor: '#FAFBFB', border: '1px solid #E2E6E7' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <Info size={15} color="#4A5C6A" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12, color: '#4A5C6A', lineHeight: 1.5 }}>
            <strong>Cryptographic Traceability Disclosure:</strong> Sequential SHA-256 hash chaining guarantees tamper-evidence by ensuring any retroactive modification to an evaluation record or rule citation breaks the cryptographic chain. It does not independently guarantee immutable storage if storage permissions are unrestricted.
          </div>
        </div>
      </div>

      {/* Sequential Blocks Table */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, color: '#11212D' }}>
            <Link2 size={16} color="#4A5C6A" /> Cryptographic Proof Cards ({ledger.length})
          </h3>
          <span style={{ fontSize: 12, color: '#6B7B83' }}>
            Company Ledger Stream
          </span>
        </div>

        {ledger.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center', color: '#6B7B83', fontSize: 13 }}>
            <Link2 size={28} color="#9BA8AB" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontWeight: 600, color: '#11212D', marginBottom: 4 }}>No audit records in company ledger</div>
            <div>When events are ingested and evaluated against active rules, a cryptographic proof card is sealed and chained here automatically.</div>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Block #</th>
                  <th>Classification</th>
                  <th>Legal Citation</th>
                  <th>Current SHA-256 Hash</th>
                  <th>Timestamp</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((item, idx) => (
                  <tr key={item.proof_id} style={{ backgroundColor: item.is_tampered ? '#FEF2F2' : undefined }}>
                    <td className="font-mono" style={{ fontSize: 12, color: '#6B7B83' }}>
                      #{idx + 1}
                    </td>
                    <td>
                      <span className={`badge ${item.classification === 'PRIVACY_VIOLATION' ? 'badge-danger' : (item.classification === 'NORMAL' ? 'badge-success' : 'badge-warning')}`}>
                        {item.classification === 'PRIVACY_VIOLATION' ? 'Privacy Violation' : (item.classification === 'NORMAL' ? 'Compliant' : 'Suspicious')}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, fontWeight: 500 }}>{item.cited_clause_id}</td>
                    <td className="font-mono" style={{ fontSize: 11, color: item.is_tampered ? '#991B1B' : '#4A5C6A', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.current_hash}
                    </td>
                    <td style={{ fontSize: 11, color: '#6B7B83' }}>
                      {item.detection_timestamp.slice(0, 19).replace('T', ' ')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => setSelectedProof(item)}
                        >
                          <Eye size={12} /> View Card
                        </button>
                        {!item.is_tampered && (
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleTamper(item.proof_id)}
                            style={{ padding: '2px 8px', fontSize: 10 }}
                            title="Tamper with this record to test detection"
                          >
                            Tamper
                          </button>
                        )}
                        {onDeleteRecord && (
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeleteSingleProof(item.proof_id)}
                            style={{ padding: '4px 8px' }}
                            title="Delete this audit record"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Proof Card Modal */}
      {selectedProof && (
        <div className="modal-overlay" onClick={() => setSelectedProof(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Lock size={16} color="#253745" />
                <h3 style={{ fontSize: 16, color: '#11212D', margin: 0 }}>Cryptographic Proof Card</h3>
              </div>
              <span className={`badge ${selectedProof.classification === 'PRIVACY_VIOLATION' ? 'badge-danger' : 'badge-success'}`}>
                {selectedProof.classification}
              </span>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ backgroundColor: '#FAFBFB', padding: 14, borderRadius: 6, border: '1px solid #E2E6E7' }}>
                <div style={{ fontSize: 11, color: '#4A5C6A', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>
                  Canonical Sealed Payload
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                  <div>
                    <span style={{ color: '#6B7B83' }}>Verdict:</span> <strong>{selectedProof.classification}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6B7B83' }}>Action:</span> <strong>{selectedProof.recommended_action}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6B7B83' }}>Citation:</span> <strong>{selectedProof.cited_clause_id}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6B7B83' }}>Evaluator:</span> <strong>{selectedProof.approver_id}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6B7B83' }}>Detection Time:</span> <span>{selectedProof.detection_timestamp.slice(0, 19).replace('T', ' ')}</span>
                  </div>
                </div>
              </div>

              {/* Hashes */}
              <div style={{ backgroundColor: '#FAFBFB', padding: 14, borderRadius: 6, border: '1px solid #E2E6E7' }}>
                <div style={{ fontSize: 11, color: '#4A5C6A', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
                  SHA-256 Hash Chaining
                </div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', marginBottom: 6 }}>
                  <div style={{ color: '#6B7B83' }}>Previous Hash:</div>
                  <div style={{ wordBreak: 'break-all', color: '#253745' }}>{selectedProof.previous_hash}</div>
                </div>
                <div style={{ fontSize: 11, fontFamily: 'monospace' }}>
                  <div style={{ color: '#6B7B83' }}>Current Hash (SHA-256 of Canonical Payload + Prev Hash):</div>
                  <div style={{ wordBreak: 'break-all', color: selectedProof.is_tampered ? '#991B1B' : '#166534', fontWeight: 700 }}>
                    {selectedProof.current_hash}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {onDeleteRecord && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => handleDeleteSingleProof(selectedProof.proof_id)}
                  >
                    <Trash2 size={13} /> Delete Record
                  </button>
                )}
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedProof(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
