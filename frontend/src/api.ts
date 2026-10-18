import {
  CompanyProfile, Policy, Rule, EventItem, AlertItem, ProofCardItem,
  AuditVerification, SystemHealth, DashboardOverview
} from './types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('sentinel_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function request(endpoint: string, options: RequestInit = {}): Promise<any> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {})
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (res.status === 401) {
    // Only redirect if not already on login/auth calls
    if (!endpoint.startsWith('/auth/')) {
      localStorage.removeItem('sentinel_token');
      localStorage.removeItem('sentinel_company');
      window.dispatchEvent(new Event('sentinel-logout'));
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Request failed with status ${res.status}`);
  }
  return data;
}

export const api = {
  // Auth
  register: async (payload: { name: string; email: string; password: string; industry?: string }): Promise<CompanyProfile & { token: string }> => {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  login: async (payload: { email: string; password: string }): Promise<CompanyProfile & { token: string }> => {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  logout: async (): Promise<any> => {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('sentinel_token');
      localStorage.removeItem('sentinel_company');
    }
  },
  getMe: async (): Promise<CompanyProfile> => {
    return request('/auth/me');
  },

  // System Health & Settings
  getHealth: async (): Promise<SystemHealth> => {
    return request('/health');
  },
  getAiStatus: async (): Promise<any> => {
    return request('/settings/ai-status');
  },

  // Overview
  getOverview: async (): Promise<DashboardOverview> => {
    return request('/stats/overview');
  },

  // Policies
  getPolicies: async (): Promise<Policy[]> => {
    return request('/policies');
  },
  createPolicy: async (data: { title: string; industry?: string; text: string }): Promise<any> => {
    return request('/policies', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  deletePolicy: async (policyId: string): Promise<any> => {
    return request(`/policies/${policyId}`, { method: 'DELETE' });
  },
  deleteAllPolicies: async (): Promise<any> => {
    return request('/policies', { method: 'DELETE' });
  },

  // Rules
  getRules: async (): Promise<Rule[]> => {
    return request('/rules');
  },
  deleteRule: async (ruleId: string): Promise<any> => {
    return request(`/rules/${ruleId}`, { method: 'DELETE' });
  },
  deleteAllRules: async (): Promise<any> => {
    return request('/rules', { method: 'DELETE' });
  },

  // Events
  getEvents: async (): Promise<EventItem[]> => {
    return request('/events');
  },
  deleteEvent: async (eventId: string): Promise<any> => {
    return request(`/events/${eventId}`, { method: 'DELETE' });
  },
  deleteAllEvents: async (): Promise<any> => {
    return request('/events', { method: 'DELETE' });
  },
  simulateEvent: async (eventData: Partial<EventItem> & { raw_prompt?: string }): Promise<any> => {
    return request('/events/simulate', {
      method: 'POST',
      body: JSON.stringify(eventData)
    });
  },
  importCsv: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('sentinel_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/events/import-csv`, {
      method: 'POST',
      headers,
      body: formData
    });

    if (res.status === 401) {
      localStorage.removeItem('sentinel_token');
      localStorage.removeItem('sentinel_company');
      window.dispatchEvent(new Event('sentinel-logout'));
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || `Upload failed with status ${res.status}`);
    }
    return data;
  },

  // Alerts
  getAlerts: async (severity?: string, status?: string): Promise<AlertItem[]> => {
    const params = new URLSearchParams();
    if (severity && severity !== 'ALL') params.append('severity', severity);
    if (status && status !== 'ALL') params.append('status', status);
    const qs = params.toString();
    return request(`/alerts${qs ? `?${qs}` : ''}`);
  },
  updateAlert: async (alertId: string, data: { status?: string; assigned_to?: string; new_note?: string }): Promise<any> => {
    return request(`/alerts/${alertId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },
  deleteAlert: async (alertId: string): Promise<any> => {
    return request(`/alerts/${alertId}`, { method: 'DELETE' });
  },
  deleteAllAlerts: async (): Promise<any> => {
    return request('/alerts', { method: 'DELETE' });
  },

  // Audit
  getLedger: async (): Promise<ProofCardItem[]> => {
    return request('/audit/ledger');
  },
  verifyAudit: async (): Promise<AuditVerification> => {
    return request('/audit/verify', { method: 'POST' });
  },
  simulateTamper: async (proofId?: string): Promise<any> => {
    return request('/audit/tamper-demo', {
      method: 'POST',
      body: JSON.stringify({ proof_id: proofId })
    });
  },
  restoreLedger: async (): Promise<any> => {
    return request('/audit/restore', { method: 'POST' });
  },
  deleteAuditRecord: async (proofId: string): Promise<any> => {
    return request(`/audit/${proofId}`, { method: 'DELETE' });
  },
  clearAuditLedger: async (): Promise<any> => {
    return request('/audit', { method: 'DELETE' });
  },

  // Master Workspace Reset
  resetWorkspaceAll: async (): Promise<any> => {
    return request('/workspace/all', { method: 'DELETE' });
  }
};

