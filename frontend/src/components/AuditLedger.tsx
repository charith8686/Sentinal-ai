import React, { useState } from 'react';
import {
  Link2,
  CheckCircle,
  AlertOctagon,
  ShieldAlert,
  RotateCcw,
  RefreshCw,
  Hash,
  Eye,
  Key,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { ProofCardItem, AuditVerification } from '../types';

interface AuditLedgerProps {
  ledger: ProofCardItem[];
  verificationResult: AuditVerification | null;
  onVerifyLedger: () => Promise<any>;
  onSimulateTamper: (proofId?: string) => Promise<any>;
  onRestoreLedger: () => Promise<any>;
  initialFocusProofId?: string | null;
}

export const AuditLedger: React.FC<AuditLedgerProps> = ({
  ledger,
  verificationResult,
  onVerifyLedger,
  onSimulateTamper,
  onRestoreLedger,
  initialFocusProofId
}) => {
  const [selectedProof, setSelectedProof] = useState<ProofCardItem | null>(
    initialFocusProofId ? ledger.find((l) => l.proof_id === initialFocusProofId) || null : null
  );
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [tamperLoading, setTamperLoading] = useState<boolean>(false);
  const [tamperMsg, setTamperMsg] = useState<string | null>(null);

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
      const res = await onSimulateTamper(proofId);
      setTamperMsg(`Tampered with ${res.proof_id}. Classification was silently edited.`);
      await onVerifyLedger();
    } catch (err: any) {
      alert(err.message || 'Tamper demo failed');
    } finally {
      setTamperLoading(false);
    }
  };

  const handleRestore = async () => {
    setTamperLoading(true);
    try {
      await onRestoreLedger();
      setTamperMsg(null);
      await onVerifyLedger();
    } finally {
      setTamperLoading(false);
    }
  };

  const isIntact = verificationResult?.is_valid ?? true;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>Cryptographic Audit Ledger & Proof Cards</h1>
          <p style={{ color: '#9BA8AB', fontSize: 13 }}>
            Continuous SHA-256 hash chaining of compliance determinations, approver identities, and cited clauses on IBM Z.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className={`btn ${isIntact ? 'btn-success' : 'btn-danger'}`}
            onClick={handleVerify}
            disabled={isVerifying}
          >
            <RefreshCw size={14} className={isVerifying ? 'animate-spin' : ''} />
            {isVerifying ? 'Recalculating Chain...' : 'Verify Ledger Integrity'}
          </button>

          {isIntact ? (
            <button
              className="btn btn-danger"
              onClick={() => handleTamper()}
              disabled={tamperLoading || ledger.length === 0}
              title="Inject malicious payload modification to demonstrate cryptographic breach detection"
            >
              <AlertOctagon size={14} /> Inject Tamper Test
            </button>
          ) : (
            <button
              className="btn btn-accent"
              onClick={handleRestore}
              disabled={tamperLoading}
              title="Re-seal hash chain and restore cryptographic consistency"
            >
              <RotateCcw size={14} /> Re-Seal / Restore Ledger
            </button>
          )}
        </div>
      </div>

      {/* Verification Status Banner */}
      <div
        className="card"
        style={{
          borderLeft: `4px solid ${isIntact ? '#10B981' : '#EF4444'}`,
          backgroundColor: isIntact ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.08)',
          marginBottom: 20
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isIntact ? <CheckCircle size={24} color="#10B981" /> : <AlertOctagon size={24} color="#EF4444" />}
            <div>
              <h3 style={{ fontSize: 16, color: isIntact ? '#10B981' : '#EF4444' }}>
                {isIntact ? 'CRYPTOGRAPHIC AUDIT CHAIN VERIFIED INTACT' : 'TAMPER DETECTED: CRYPTOGRAPHIC HASH MISMATCH'}
              </h3>
              <p style={{ fontSize: 12, color: '#CCD0CF', marginTop: 2 }}>
                {verificationResult?.details || 'Ledger is sealed with SHA-256 hash chain.'}
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#9BA8AB' }}>Blocks Chained</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF' }}>{ledger.length}</div>
          </div>
        </div>

        {!isIntact && verificationResult?.first_corrupted_id && (
          <div style={{ marginTop: 12, padding: 10, backgroundColor: '#06141B', borderRadius: 4, border: '1px solid #EF4444', fontSize: 12 }}>
            <span style={{ color: '#EF4444', fontWeight: 700 }}>FIRST CORRUPTED BLOCK DETECTED:</span>{' '}
            <span className="font-mono" style={{ color: '#38BDF8' }}>{verificationResult.first_corrupted_id}</span>
            <div style={{ color: '#9BA8AB', fontSize: 11, marginTop: 4 }}>
              Any unauthorized database update breaks the linear SHA-256 dependency immediately.
            </div>
          </div>
        )}
      </div>

      {/* Audit Chain Cards Visualizer */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link2 size={17} color="#38BDF8" /> SHA-256 Sequential Proof Cards ({ledger.length} entries)
          </h3>
          <span style={{ fontSize: 11, color: '#9BA8AB', fontFamily: 'monospace' }}>
            GENESIS: 0000000000000000...
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {ledger.map((item, idx) => {
            const isCorrupted = item.is_tampered;
            return (
              <div
                key={item.proof_id}
                style={{
                  backgroundColor: isCorrupted ? 'rgba(239, 68, 68, 0.1)' : '#11212D',
                  border: `1px solid ${isCorrupted ? '#EF4444' : '#4A5C6A'}`,
                  borderRadius: 6,
                  padding: '14px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="badge badge-neutral" style={{ fontFamily: 'monospace' }}>
                      Block #{idx + 1}
                    </span>
                    <strong className="font-mono" style={{ color: '#38BDF8', fontSize: 13 }}>
                      {item.proof_id}
                    </strong>
                    <span className={`badge ${item.classification === 'PRIVACY_VIOLATION' ? 'badge-danger' : (item.classification === 'NORMAL' ? 'badge-success' : 'badge-warning')}`}>
                      {item.classification}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#9BA8AB' }}>
                      {item.detection_timestamp.slice(0, 19).replace('T', ' ')}
                    </span>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => setSelectedProof(item)}
                    >
                      <Eye size={12} /> View Proof Card
                    </button>
                    {!item.is_tampered && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleTamper(item.proof_id)}
                        title="Simulate unauthorized tampering on this specific block"
                        style={{ padding: '2px 8px', fontSize: 10 }}
                      >
                        Tamper
                      </button>
                    )}
                  </div>
                </div>

                {/* Lineage Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, fontSize: 12, color: '#CCD0CF', backgroundColor: '#06141B', padding: 8, borderRadius: 4 }}>
                  <div>
                    <span style={{ color: '#9BA8AB' }}>Event:</span> <strong className="font-mono">{item.event_id}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#9BA8AB' }}>Rule:</span> <strong className="font-mono">{item.rule_id} (v{item.rule_version})</strong>
                  </div>
                  <div>
                    <span style={{ color: '#9BA8AB' }}>Clause:</span> <strong>{item.cited_clause_id}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#9BA8AB' }}>Approver:</span> <strong>{item.approver_id}</strong>
                  </div>
                </div>

                {/* Hashes */}
                <div style={{ display: 'flex', gap: 16, fontSize: 11, fontFamily: 'monospace' }}>
                  <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ color: '#9BA8AB' }}>PREV HASH:</span>{' '}
                    <span style={{ color: '#CCD0CF' }}>{item.previous_hash}</span>
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ color: '#9BA8AB' }}>CURRENT HASH:</span>{' '}
                    <span style={{ color: isCorrupted ? '#EF4444' : '#10B981', fontWeight: 600 }}>{item.current_hash}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Proof Card Detail Modal */}
      {selectedProof && (
        <div className="modal-overlay" onClick={() => setSelectedProof(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Lock size={18} color="#38BDF8" />
                <div>
                  <h3 style={{ fontSize: 16, color: '#FFFFFF' }}>Cryptographic Proof Card</h3>
                  <div className="font-mono" style={{ fontSize: 11, color: '#38BDF8' }}>
                    {selectedProof.proof_id}
                  </div>
                </div>
              </div>
              <span className={`badge ${selectedProof.classification === 'PRIVACY_VIOLATION' ? 'badge-danger' : 'badge-success'}`}>
                {selectedProof.classification}
              </span>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ backgroundColor: '#06141B', padding: 14, borderRadius: 6, border: '1px solid #4A5C6A' }}>
                <div style={{ fontSize: 11, color: '#9BA8AB', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>
                  Execution Lineage Fields (Canonical Hash Target):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                  <div>
                    <span style={{ color: '#9BA8AB' }}>Event ID:</span> <strong className="font-mono" style={{ color: '#CCD0CF' }}>{selectedProof.event_id}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#9BA8AB' }}>Action Taken:</span> <strong style={{ color: '#CCD0CF' }}>{selectedProof.recommended_action}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#9BA8AB' }}>Enforced Rule:</span> <strong className="font-mono" style={{ color: '#10B981' }}>{selectedProof.rule_id} v{selectedProof.rule_version}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#9BA8AB' }}>Cited Clause:</span> <strong style={{ color: '#38BDF8' }}>{selectedProof.cited_clause_id}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#9BA8AB' }}>Human Approver:</span> <strong style={{ color: '#CCD0CF' }}>{selectedProof.approver_id}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#9BA8AB' }}>Policy ID:</span> <strong className="font-mono" style={{ color: '#CCD0CF' }}>{selectedProof.policy_id}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#9BA8AB' }}>Event Time:</span> <span style={{ color: '#CCD0CF' }}>{selectedProof.event_timestamp}</span>
                  </div>
                  <div>
                    <span style={{ color: '#9BA8AB' }}>Detection Time:</span> <span style={{ color: '#CCD0CF' }}>{selectedProof.detection_timestamp}</span>
                  </div>
                </div>
              </div>

              {/* Hashes in Detail */}
              <div style={{ backgroundColor: '#06141B', padding: 14, borderRadius: 6, border: '1px solid #4A5C6A' }}>
                <div style={{ fontSize: 11, color: '#38BDF8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
                  Cryptographic Hashes (SHA-256):
                </div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', marginBottom: 6 }}>
                  <div style={{ color: '#9BA8AB' }}>Previous Hash:</div>
                  <div style={{ wordBreak: 'break-all', color: '#CCD0CF' }}>{selectedProof.previous_hash}</div>
                </div>
                <div style={{ fontSize: 11, fontFamily: 'monospace' }}>
                  <div style={{ color: '#9BA8AB' }}>Current Hash (SHA-256 of Payload + Prev Hash):</div>
                  <div style={{ wordBreak: 'break-all', color: selectedProof.is_tampered ? '#EF4444' : '#10B981', fontWeight: 700 }}>
                    {selectedProof.current_hash}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 11, color: '#9BA8AB' }}>
                Audit Verification Axiom: Every alert is permanently anchored in this ledger. Any attempt to modify the classification or approver changes the SHA-256 digest, breaking the chain for all subsequent blocks.
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-neutral" onClick={() => setSelectedProof(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
