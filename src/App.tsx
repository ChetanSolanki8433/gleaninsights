import React, { useState, useEffect } from 'react';
import { simulationManager } from './services/simulationStore';
import { SimulationState } from './services/rcaEngine';
import { Navbar } from './components/Navbar';
import { FaultInjectorModal } from './components/FaultInjectorModal';
import { DemoTourModal } from './components/DemoTourModal';
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
import { EvaluationMetricsView } from './components/EvaluationMetricsView';

export function App() {
  const [state, setState] = useState<SimulationState>(simulationManager.getState());
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isFaultModalOpen, setIsFaultModalOpen] = useState<boolean>(false);
  const [isDemoTourOpen, setIsDemoTourOpen] = useState<boolean>(false);

  useEffect(() => {
    // Subscribe to real-time simulation updates
    const unsubscribe = simulationManager.subscribe((newState) => {
      setState(newState);
    });
    return () => unsubscribe();
  }, []);

  const handleSelectScenario = (scenarioId: string) => {
    simulationManager.setScenario(scenarioId as any);
  };

  const handleToggleSimulation = () => {
    simulationManager.toggleRunning();
  };

  const handleStepSimulation = () => {
    simulationManager.step();
  };

  const handleResetSimulation = () => {
    simulationManager.reset();
  };

  const handleApproveRemediation = (recommendationId: string, approver?: string) => {
    simulationManager.approveRemediation(recommendationId, approver);
  };

  const handleRejectRemediation = (recommendationId: string, reason: string) => {
    simulationManager.rejectRemediation(recommendationId, reason);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-800 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      {/* Top Navigation Bar with Telemetry Indicators & Fault Controls */}
      <Navbar
        state={state}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenFaultModal={() => setIsFaultModalOpen(true)}
        onOpenDemoTour={() => setIsDemoTourOpen(true)}
        onToggleSimulation={handleToggleSimulation}
        onStepSimulation={handleStepSimulation}
        onResetSimulation={handleResetSimulation}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'overview' && (
          <SystemOverview
            state={state}
            onNavigateTab={setActiveTab}
            onOpenFaultModal={() => setIsFaultModalOpen(true)}
            onApproveRemediation={handleApproveRemediation}
          />
        )}

        {activeTab === 'topology' && (
          <DependencyGraphView
            state={state}
            onSelectService={(id) => {
              setActiveTab('services');
            }}
          />
        )}

        {activeTab === 'metrics' && (
          <LiveMetricsView state={state} />
        )}

        {activeTab === 'logs' && (
          <LogStreamView state={state} />
        )}

        {activeTab === 'anomalies' && (
          <AnomalyTimelineView state={state} />
        )}

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

        {activeTab === 'services' && (
          <ServicesView state={state} />
        )}

        {activeTab === 'evaluation' && (
          <EvaluationMetricsView />
        )}
      </main>

      {/* Fault Injection Sandbox Modal */}
      <FaultInjectorModal
        isOpen={isFaultModalOpen}
        currentScenario={state.currentScenario}
        onClose={() => setIsFaultModalOpen(false)}
        onSelectScenario={handleSelectScenario}
      />

      {/* Guided Interactive Demo Tour Modal */}
      <DemoTourModal
        isOpen={isDemoTourOpen}
        onClose={() => setIsDemoTourOpen(false)}
        onNavigateTab={setActiveTab}
      />
    </div>
  );
}

export default App;
