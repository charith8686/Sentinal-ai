import {
  Policy, Rule, EventItem, AlertItem, ProofCardItem,
  AuditVerification, SystemHealth, DashboardOverview
} from './types';

const API_BASE = '/api';

export const api = {
  // System Health & Settings
  getHealth: async (): Promise<SystemHealth> => {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },
  toggleDegradedMode: async (online: boolean): Promise<any> => {
    const res = await fetch(`${API_BASE}/settings/degraded-mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ online })
    });
    return res.json();
  },
  switchReviewer: async (reviewer_name: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/settings/reviewer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewer_name })
    });
    return res.json();
  },
  getIndustry: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/settings/industry`);
    return res.json();
  },
  setIndustry: async (industry: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/settings/industry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ industry })
    });
    return res.json();
  },

  // Overview
  getOverview: async (): Promise<DashboardOverview> => {
    const res = await fetch(`${API_BASE}/stats/overview`);
    return res.json();
  },

  // Policies
  getPolicies: async (): Promise<Policy[]> => {
    const res = await fetch(`${API_BASE}/policies`);
    return res.json();
  },
  createPolicy: async (data: { title: string; industry: string; text: string }): Promise<any> => {
    const res = await fetch(`${API_BASE}/policies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Rules
  getRules: async (status?: string): Promise<Rule[]> => {
    const url = status ? `${API_BASE}/rules?status=${status}` : `${API_BASE}/rules`;
    const res = await fetch(url);
    return res.json();
  },
  approveRule: async (ruleId: string, decision: 'APPROVE' | 'REJECT', comment?: string, reviewer?: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/rules/${ruleId}/approval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, comment, reviewer })
    });
    return res.json();
  },
  backtestRule: async (ruleId: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/rules/${ruleId}/backtest`, {
      method: 'POST'
    });
    return res.json();
  },

  // Events
  getEvents: async (): Promise<EventItem[]> => {
    const res = await fetch(`${API_BASE}/events`);
    return res.json();
  },
  simulateEvent: async (eventData: Partial<EventItem> & { raw_prompt?: string }): Promise<any> => {
    const res = await fetch(`${API_BASE}/events/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Simulation failed');
    }
    return res.json();
  },
  importCsv: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/events/import-csv`, { method: 'POST' });
    return res.json();
  },

  // Alerts
  getAlerts: async (severity?: string, status?: string): Promise<AlertItem[]> => {
    const params = new URLSearchParams();
    if (severity) params.append('severity', severity);
    if (status) params.append('status', status);
    const res = await fetch(`${API_BASE}/alerts?${params.toString()}`);
    return res.json();
  },
  updateAlert: async (alertId: string, data: { status?: string; assigned_to?: string; new_note?: string }): Promise<any> => {
    const res = await fetch(`${API_BASE}/alerts/${alertId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Audit
  getLedger: async (): Promise<ProofCardItem[]> => {
    const res = await fetch(`${API_BASE}/audit/ledger`);
    return res.json();
  },
  verifyAudit: async (): Promise<AuditVerification> => {
    const res = await fetch(`${API_BASE}/audit/verify`, { method: 'POST' });
    return res.json();
  },
  simulateTamper: async (proofId?: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/audit/tamper-demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proof_id: proofId })
    });
    return res.json();
  },
  restoreLedger: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/audit/restore`, { method: 'POST' });
    return res.json();
  }
};
