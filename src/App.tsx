import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { SystemOverview } from './components/SystemOverview';
import { DependencyGraphView } from './components/DependencyGraphView';
import { LiveMetricsView } from './components/LiveMetricsView';
import { LogStreamView } from './components/LogStreamView';
import { AnomalyTimelineView } from './components/AnomalyTimelineView';
import { RcaEngineView } from './components/RcaEngineView';
import { AiDiagnosisView } from './components/AiDiagnosisView';
import { RemediationView } from './components/RemediationView';
import { IncidentHistoryView } from './components/IncidentHistoryView';
import { ServicesView } from './components/ServicesView';
import { FaultSandboxModal } from './components/FaultSandboxModal';
import { simulationManager } from './services/simulationStore';
import { SimulationState } from './services/rcaEngine';
import { ScenarioType } from './types';

export default function App() {
  const [state, setState] = useState<SimulationState>(simulationManager.getState());
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isSandboxOpen, setIsSandboxOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type: 'alert' | 'success' } | null>(null);

  useEffect(() => {
    const unsubscribe = simulationManager.subscribe((newState) => {
      setState(newState);
    });
    return () => unsubscribe();
  }, []);

  const handleInjectFault = (scenario: ScenarioType) => {
    simulationManager.setScenario(scenario);
    setToastMessage({
      title: 'Failure Injected',
      desc: `Simulated failure (${scenario}) activated. ML anomaly pipeline and RCA engine engaged.`,
      type: 'alert',
    });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleResetNominal = () => {
    simulationManager.resetToNominal();
    setToastMessage({
      title: 'Nominal Baseline Restored',
      desc: 'All 5 microservices recovered. Anomaly scores and latency returned to baseline bands.',
      type: 'success',
    });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleApproveRemediation = (id: string, approver = 'SRE On-Call Lead') => {
    simulationManager.approveRemediation(id, approver);
    setToastMessage({
      title: 'Recovery Playbook Initiated',
      desc: 'Automated remediation executing. Telemetric verification in progress...',
      type: 'success',
    });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleRejectRemediation = (id: string, reason: string) => {
    simulationManager.rejectRemediation(id, reason);
  };

  return (
    <div className="min-h-screen bg-[#faf9f5] text-[#141413] flex flex-col selection:bg-[#f5e3c7] selection:text-[#141413]">
      {/* Top Fixed / Sticky Navigation Bar */}
      <Navbar
        state={state}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onTabChange={setActiveTab}
        onOpenFaultModal={() => setIsSandboxOpen(true)}
        onOpenSandbox={() => setIsSandboxOpen(true)}
        onToggleSimulation={() => simulationManager.toggleRunning()}
        onResetSimulation={handleResetNominal}
      />

      {/* Main Container Stage with 1200px max width and 32px/48px editorial breathing space */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Floating Toast Notification */}
        {toastMessage && (
          <div
            className={`mb-6 p-4 rounded-[24px] border flex items-center justify-between transition-all ${
              toastMessage.type === 'alert'
                ? 'bg-[#f5e3c7] border-[#d97757] text-[#141413]'
                : 'bg-[#faf9f5] border-[#4d7c71] text-[#141413]'
            }`}
          >
            <div>
              <span className="font-serif font-bold text-sm block">{toastMessage.title}</span>
              <span className="text-xs text-[#141413]">{toastMessage.desc}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-xs px-2.5 py-1 rounded-md bg-[#faf9f5] text-[#141413] border border-[#cccbc8] hover:bg-[#e3dacc] font-mono"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Dynamic Views */}
        {activeTab === 'overview' && (
          <SystemOverview
            state={state}
            onNavigateTab={setActiveTab}
            onOpenSandbox={() => setIsSandboxOpen(true)}
            onApproveRemediation={handleApproveRemediation}
          />
        )}

        {activeTab === 'topology' && (
          <DependencyGraphView
            state={state}
            onSelectService={() => setActiveTab('services')}
          />
        )}

        {activeTab === 'metrics' && <LiveMetricsView state={state} />}

        {activeTab === 'logs' && <LogStreamView state={state} />}

        {activeTab === 'anomalies' && <AnomalyTimelineView state={state} />}

        {activeTab === 'rca' && (
          <RcaEngineView
            state={state}
            onNavigateTab={setActiveTab}
            onApproveRemediation={handleApproveRemediation}
          />
        )}

        {activeTab === 'ai_diagnosis' && (
          <AiDiagnosisView
            state={state}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'remediation' && (
          <RemediationView
            state={state}
            onApprove={handleApproveRemediation}
            onReject={handleRejectRemediation}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'history' && (
          <IncidentHistoryView
            incidents={state.incidentHistory}
            activeIncident={state.activeIncident}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'services' && <ServicesView state={state} />}
      </main>

      {/* Fault Sandbox Modal Dialog */}
      <FaultSandboxModal
        isOpen={isSandboxOpen}
        onClose={() => setIsSandboxOpen(false)}
        currentScenario={state.currentScenario}
        onInjectFault={handleInjectFault}
        onResetNominal={handleResetNominal}
      />

      {/* Editorial Footer */}
      <footer className="border-t border-[#cccbc8] bg-[#faf9f5] py-6 px-4 sm:px-8 mt-12">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#87867f] font-mono">
          <div className="flex items-center space-x-2">
            <span className="font-serif font-semibold text-[#141413]">Glean <span className="italic text-[#87867f] font-normal">insights</span></span>
            <span>·</span>
            <span>Microservice Telemetry &amp; Causal RCA Platform</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Isolation Forest &amp; Autoencoder Ensembles</span>
            <span>·</span>
            <span>5-Factor RCA Scoring</span>
            <span>·</span>
            <span className="text-[#4d7c71] flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4d7c71]" />
              Nominal Cluster
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
