import React, { useState } from 'react';
import { ShieldCheck, Building2, Lock, Mail, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../api';
import { CompanyProfile } from '../types';

interface CompanyAuthModalProps {
  onSuccess: (company: CompanyProfile) => void;
}

export const CompanyAuthModal: React.FC<CompanyAuthModalProps> = ({ onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [industry, setIndustry] = useState('Banking');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let res: CompanyProfile & { token: string };
      if (isRegister) {
        if (!name.trim()) throw new Error('Company name is required.');
        res = await api.register({ name, email, password, industry });
      } else {
        res = await api.login({ email, password });
      }

      localStorage.setItem('sentinel_token', res.token);
      localStorage.setItem('sentinel_company', JSON.stringify({
        company_id: res.company_id,
        name: res.name,
        email: res.email,
        industry: res.industry
      }));
      onSuccess(res);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#06141B',
      padding: 20
    }}>
      <div style={{
        width: '100%',
        maxWidth: 440,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        border: '1px solid #CCD0CF',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        overflow: 'hidden'
      }}>
        {/* Header - Navy & Sentinel Identity */}
        <div style={{
          backgroundColor: '#11212D',
          padding: '28px 24px',
          color: '#FFFFFF',
          textAlign: 'center',
          borderBottom: '1px solid #253745'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            backgroundColor: '#253745',
            borderRadius: 8,
            marginBottom: 12
          }}>
            <ShieldCheck size={26} color="#CCD0CF" />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.02em', margin: 0 }}>
            SENTINEL AI
          </h1>
          <p style={{ fontSize: 12, color: '#9BA8AB', margin: '4px 0 0 0' }}>
            Shared AI-Powered Governance on IBM LinuxONE
          </p>
        </div>

        {/* Form Body */}
        <div style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, color: '#11212D', margin: 0 }}>
              {isRegister ? 'Register Company Workspace' : 'Company Login'}
            </h2>
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setError(null); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#253745',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              {isRegister ? 'Sign in to existing workspace' : 'Create new workspace'}
            </button>
          </div>

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 6,
              color: '#991B1B',
              fontSize: 12,
              marginBottom: 16
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {isRegister && (
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#4A5C6A', fontWeight: 500, marginBottom: 4 }}>
                  Company Legal Name
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Financial Group"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ paddingLeft: 32 }}
                  />
                  <Building2 size={14} color="#9BA8AB" style={{ position: 'absolute', left: 10, top: 12 }} />
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#4A5C6A', fontWeight: 500, marginBottom: 4 }}>
                Corporate Work Email
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: 32 }}
                />
                <Mail size={14} color="#9BA8AB" style={{ position: 'absolute', left: 10, top: 12 }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#4A5C6A', fontWeight: 500, marginBottom: 4 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: 32 }}
                />
                <Lock size={14} color="#9BA8AB" style={{ position: 'absolute', left: 10, top: 12 }} />
              </div>
            </div>

            {isRegister && (
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#4A5C6A', fontWeight: 500, marginBottom: 4 }}>
                  Industry Sector
                </label>
                <select value={industry} onChange={(e) => setIndustry(e.target.value)}>
                  <option value="Banking">Banking & Financial Services</option>
                  <option value="Healthcare">Healthcare & Life Sciences</option>
                  <option value="Insurance">Insurance & Actuarial</option>
                  <option value="Retail">Retail & Consumer Products</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px 16px',
                marginTop: 6,
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 600
              }}
            >
              {loading ? 'Processing...' : (isRegister ? 'Register Company' : 'Access Workspace')}
              <ArrowRight size={14} />
            </button>
          </form>

          <div style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid #E2E6E7',
            fontSize: 11,
            color: '#6B7B83',
            textAlign: 'center',
            lineHeight: 1.4
          }}>
            Multi-Tenant Isolation: Each company's policies, deterministic rules, events, alerts, and audit ledgers remain strictly cryptographically isolated.
          </div>
        </div>
      </div>
    </div>
  );
};
