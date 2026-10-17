import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { OverviewDashboard } from './components/OverviewDashboard';
import { PolicyCenter } from './components/PolicyCenter';
import { RuleRegistry } from './components/RuleRegistry';
import { RuleBacktest } from './components/RuleBacktest';
import { EventMonitoring } from './components/EventMonitoring';
import { AlertsInvestigations } from './components/AlertsInvestigations';
import { AuditLedger } from './components/AuditLedger';
import { SettingsIndustry } from './components/SettingsIndustry';
import { api } from './api';
import {
  SystemHealth,
  DashboardOverview,
  Policy,
  Rule,
  EventItem,
  AlertItem,
  ProofCardItem,
  AuditVerification
} from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [ledger, setLedger] = useState<ProofCardItem[]>([]);
  const [verificationResult, setVerificationResult] = useState<AuditVerification | null>(null);
  const [industryConfig, setIndustryConfig] = useState<any>(null);

  // Selected item targets for cross-tab jumping
  const [focusedRuleId, setFocusedRuleId] = useState<string | null>(null);
  const [focusedProofId, setFocusedProofId] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const [h, ov, p, r, ev, al, ld, vf, ind] = await Promise.all([
        api.getHealth(),
        api.getOverview(),
        api.getPolicies(),
        api.getRules(),
        api.getEvents(),
        api.getAlerts(),
        api.getLedger(),
        api.verifyAudit(),
        api.getIndustry()
      ]);
      setHealth(h);
      setOverview(ov);
      setPolicies(p);
      setRules(r);
      setEvents(ev);
      setAlerts(al);
      setLedger(ld);
      setVerificationResult(vf);
      setIndustryConfig(ind?.config);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  const handleToggleDegraded = async (online: boolean) => {
    try {
      await api.toggleDegradedMode(online);
      const h = await api.getHealth();
      setHealth(h);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSwitchReviewer = async (reviewer: string) => {
    try {
      await api.switchReviewer(reviewer);
      const h = await api.getHealth();
      setHealth(h);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitPolicy = async (data: { title: string; industry: string; text: string }) => {
    const res = await api.createPolicy(data);
    await loadAllData();
    return res;
  };

  const handleApproveRule = async (ruleId: string, decision: 'APPROVE' | 'REJECT', comment?: string) => {
    const res = await api.approveRule(ruleId, decision, comment, health?.current_reviewer);
    await loadAllData();
    return res;
  };

  const handleSimulateEvent = async (eventData: any) => {
    const res = await api.simulateEvent(eventData);
    await loadAllData();
    return res;
  };

  const handleImportCsv = async () => {
    const res = await api.importCsv();
    await loadAllData();
    return res;
  };

  const handleUpdateAlert = async (alertId: string, data: any) => {
    const res = await api.updateAlert(alertId, data);
    const updatedAlerts = await api.getAlerts();
    setAlerts(updatedAlerts);
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

  const handleSetIndustry = async (industry: string) => {
    const res = await api.setIndustry(industry);
    setIndustryConfig(res.config);
    const h = await api.getHealth();
    setHealth(h);
    return res;
  };

  const navigateToRuleReview = (ruleId: string) => {
    setFocusedRuleId(ruleId);
    setActiveTab('rules');
  };

  const navigateToBacktest = (ruleId: string) => {
    setFocusedRuleId(ruleId);
    setActiveTab('backtest');
  };

  const navigateToProofCard = (proofId: string) => {
    setFocusedProofId(proofId);
    setActiveTab('audit');
  };

  const pendingReviewsCount = rules.filter((r) => r.status === 'PENDING_APPROVAL' || r.status === 'NEEDS_REVIEW').length;
  const openAlertsCount = alerts.filter((a) => a.investigation_status === 'OPEN').length;

  return (
    <div className="app-container">
      {/* Collapsible Enterprise Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(t) => {
          setActiveTab(t);
          setFocusedProofId(null);
        }}
        pendingReviewsCount={pendingReviewsCount}
        openAlertsCount={openAlertsCount}
      />

      {/* Main App Layout */}
      <div className="main-content">
        <TopBar
          health={health}
          onToggleDegraded={handleToggleDegraded}
          onSwitchReviewer={handleSwitchReviewer}
          tamperedBlocksCount={overview?.tampered_blocks_count || 0}
        />

        <main className="content-body">
          {activeTab === 'overview' && (
            <OverviewDashboard
              data={overview}
              onNavigate={setActiveTab}
              onVerifyLedger={handleVerifyLedger}
              onSimulateQuick={() => setActiveTab('events')}
            />
          )}

          {activeTab === 'policies' && (
            <PolicyCenter
              policies={policies}
              onSubmitPolicy={handleSubmitPolicy}
              onNavigateToRuleReview={navigateToRuleReview}
              currentIndustry={health?.current_industry || 'Banking'}
            />
          )}

          {activeTab === 'rules' && (
            <RuleRegistry
              rules={rules}
              onApproveRule={handleApproveRule}
              onNavigateToBacktest={navigateToBacktest}
              selectedRuleId={focusedRuleId}
            />
          )}

          {activeTab === 'backtest' && (
            <RuleBacktest
              rules={rules}
              initialRuleId={focusedRuleId}
            />
          )}

          {activeTab === 'events' && (
            <EventMonitoring
              events={events}
              onSimulateEvent={handleSimulateEvent}
              onImportCsv={handleImportCsv}
              onViewProofCard={navigateToProofCard}
            />
          )}

          {activeTab === 'alerts' && (
            <AlertsInvestigations
              alerts={alerts}
              onUpdateAlert={handleUpdateAlert}
              onViewProofCard={navigateToProofCard}
            />
          )}

          {activeTab === 'audit' && (
            <AuditLedger
              ledger={ledger}
              verificationResult={verificationResult}
              onVerifyLedger={handleVerifyLedger}
              onSimulateTamper={handleSimulateTamper}
              onRestoreLedger={handleRestoreLedger}
              initialFocusProofId={focusedProofId}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsIndustry
              health={health}
              onToggleDegraded={handleToggleDegraded}
              currentIndustry={health?.current_industry || 'Banking'}
              onSetIndustry={handleSetIndustry}
              industryConfig={industryConfig}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
