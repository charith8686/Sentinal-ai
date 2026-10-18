import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { OverviewDashboard } from './components/OverviewDashboard';
import { PolicyCenter } from './components/PolicyCenter';
import { RuleRegistry } from './components/RuleRegistry';
import { EventsAndAlerts } from './components/EventsAndAlerts';
import { AuditLedger } from './components/AuditLedger';
import { SettingsIndustry } from './components/SettingsIndustry';
import { CompanyAuthModal } from './components/CompanyAuthModal';
import { api } from './api';
import {
  SystemHealth,
  DashboardOverview,
  Policy,
  Rule,
  EventItem,
  AlertItem,
  ProofCardItem,
  AuditVerification,
  CompanyProfile
} from './types';

export function App() {
  const [company, setCompany] = useState<CompanyProfile | null>(() => {
    const saved = localStorage.getItem('sentinel_company');
    const token = localStorage.getItem('sentinel_token');
    if (saved && token) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [ledger, setLedger] = useState<ProofCardItem[]>([]);
  const [verificationResult, setVerificationResult] = useState<AuditVerification | null>(null);

  // Cross-tab jumping
  const [focusedAlertId, setFocusedAlertId] = useState<string | null>(null);
  const [focusedProofId, setFocusedProofId] = useState<string | null>(null);

  useEffect(() => {
    const handleLogoutEvent = () => {
      setCompany(null);
    };
    window.addEventListener('sentinel-logout', handleLogoutEvent);
    return () => window.removeEventListener('sentinel-logout', handleLogoutEvent);
  }, []);

  useEffect(() => {
    if (company) {
      loadAllData();
    }
  }, [company]);

  const loadAllData = async () => {
    try {
      const [h, ov, p, r, ev, al, ld, vf] = await Promise.all([
        api.getHealth(),
        api.getOverview(),
        api.getPolicies(),
        api.getRules(),
        api.getEvents(),
        api.getAlerts(),
        api.getLedger(),
        api.verifyAudit()
      ]);
      setHealth(h);
      setOverview(ov);
      setPolicies(p);
      setRules(r);
      setEvents(ev);
      setAlerts(al);
      setLedger(ld);
      setVerificationResult(vf);
    } catch (err) {
      console.error('Failed to load company workspace data:', err);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setCompany(null);
  };

  const handleSubmitPolicy = async (data: { title: string; industry: string; text: string }) => {
    const res = await api.createPolicy(data);
    await loadAllData();
    return res;
  };

  const handleDeletePolicy = async (policyId: string) => {
    const res = await api.deletePolicy(policyId);
    await loadAllData();
    return res;
  };

  const handleDeleteAllPolicies = async () => {
    const res = await api.deleteAllPolicies();
    await loadAllData();
    return res;
  };

  const handleDeleteRule = async (ruleId: string) => {
    const res = await api.deleteRule(ruleId);
    await loadAllData();
    return res;
  };

  const handleDeleteAllRules = async () => {
    const res = await api.deleteAllRules();
    await loadAllData();
    return res;
  };

  const handleDeleteEvent = async (eventId: string) => {
    const res = await api.deleteEvent(eventId);
    await loadAllData();
    return res;
  };

  const handleDeleteAllEvents = async () => {
    const res = await api.deleteAllEvents();
    await loadAllData();
    return res;
  };

  const handleDeleteAlert = async (alertId: string) => {
    const res = await api.deleteAlert(alertId);
    await loadAllData();
    return res;
  };

  const handleDeleteAllAlerts = async () => {
    const res = await api.deleteAllAlerts();
    await loadAllData();
    return res;
  };

  const handleDeleteAuditRecord = async (proofId: string) => {
    const res = await api.deleteAuditRecord(proofId);
    await loadAllData();
    return res;
  };

  const handleClearAuditLedger = async () => {
    const res = await api.clearAuditLedger();
    await loadAllData();
    return res;
  };

  const handleResetWorkspaceAll = async () => {
    const res = await api.resetWorkspaceAll();
    await loadAllData();
    return res;
  };


  const handleSimulateEvent = async (eventData: any) => {
    const res = await api.simulateEvent(eventData);
    await loadAllData();
    return res;
  };

  const handleImportCsv = async (file: File) => {
    const res = await api.importCsv(file);
    await loadAllData();
    return res;
  };

  const handleUpdateAlert = async (alertId: string, data: any) => {
    const res = await api.updateAlert(alertId, data);
    const updatedAlerts = await api.getAlerts();
    setAlerts(updatedAlerts);
    const ov = await api.getOverview();
    setOverview(ov);
    return res;
  };

  const handleVerifyLedger = async () => {
    const vf = await api.verifyAudit();
    setVerificationResult(vf);
    const ov = await api.getOverview();
    setOverview(ov);
    return vf;
  };

  const handleSimulateTamper = async (proofId?: string) => {
    const res = await api.simulateTamper(proofId);
    const ld = await api.getLedger();
    setLedger(ld);
    const vf = await api.verifyAudit();
    setVerificationResult(vf);
    const ov = await api.getOverview();
    setOverview(ov);
    return res;
  };

  const handleRestoreLedger = async () => {
    const res = await api.restoreLedger();
    const ld = await api.getLedger();
    setLedger(ld);
    const vf = await api.verifyAudit();
    setVerificationResult(vf);
    const ov = await api.getOverview();
    setOverview(ov);
    return res;
  };

  const navigateToAlertInspect = (alertId: string) => {
    setFocusedAlertId(alertId);
    setActiveTab('events-alerts');
  };

  const navigateToProofCard = (proofId: string) => {
    setFocusedProofId(proofId);
    setActiveTab('audit');
  };

  // If no company session, render Company Login / Registration modal directly
  if (!company) {
    return <CompanyAuthModal onSuccess={(comp) => setCompany(comp)} />;
  }

  const openAlertsCount = overview?.metrics?.open_alerts ?? alerts.filter((a) => a.investigation_status === 'OPEN').length;

  return (
    <div className="app-container">
      {/* Sidebar with 6 Sections & Company Details */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(t) => {
          setActiveTab(t);
          setFocusedProofId(null);
          setFocusedAlertId(null);
        }}
        openAlertsCount={openAlertsCount}
        company={company}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="main-content">
        <TopBar
          health={health}
          company={company}
          auditIsValid={verificationResult?.is_valid ?? true}
        />

        <main className="content-body">
          {activeTab === 'overview' && (
            <OverviewDashboard
              data={overview}
              onNavigate={setActiveTab}
              onInspectAlert={navigateToAlertInspect}
            />
          )}

          {activeTab === 'policies' && (
            <PolicyCenter
              policies={policies}
              onSubmitPolicy={handleSubmitPolicy}
              onDeletePolicy={handleDeletePolicy}
              onDeleteAllPolicies={handleDeleteAllPolicies}
              onNavigateToRules={() => setActiveTab('rules')}
              currentIndustry={company?.industry || 'Banking'}
            />
          )}

          {activeTab === 'rules' && (
            <RuleRegistry
              rules={rules}
              onDeleteRule={handleDeleteRule}
              onDeleteAllRules={handleDeleteAllRules}
            />
          )}

          {activeTab === 'events-alerts' && (
            <EventsAndAlerts
              events={events}
              alerts={alerts}
              onSimulateEvent={handleSimulateEvent}
              onUpdateAlert={handleUpdateAlert}
              onDeleteEvent={handleDeleteEvent}
              onDeleteAllEvents={handleDeleteAllEvents}
              onDeleteAlert={handleDeleteAlert}
              onDeleteAllAlerts={handleDeleteAllAlerts}
              onViewProofCard={navigateToProofCard}
              selectedAlertId={focusedAlertId}
            />
          )}

          {activeTab === 'audit' && (
            <AuditLedger
              ledger={ledger}
              verificationResult={verificationResult}
              onVerifyLedger={handleVerifyLedger}
              onSimulateTamper={handleSimulateTamper}
              onRestoreLedger={handleRestoreLedger}
              onDeleteRecord={handleDeleteAuditRecord}
              onClearLedger={handleClearAuditLedger}
              initialFocusProofId={focusedProofId}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsIndustry
              health={health}
              onImportCsv={handleImportCsv}
              onResetWorkspace={handleResetWorkspaceAll}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
