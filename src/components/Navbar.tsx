import React from 'react';
import {
  Activity,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Network,
  Cpu,
  FileText,
  Brain,
  ShieldCheck,
  Award,
  Server,
  Sparkles,
  History,
  Compass,
} from 'lucide-react';
import { SimulationState } from '../services/rcaEngine';
import { FAULT_SCENARIOS } from '../services/simulator';
import { GleanLogo } from '../assets/GleanLogo';

interface NavbarProps {
  state?: SimulationState;
  activeTab: string;
  onSelectTab?: (tab: string) => void;
  onTabChange?: (tab: string) => void;
  onOpenFaultModal?: () => void;
  onOpenSandbox?: () => void;
  onOpenDemoTour?: () => void;
  onToggleSimulation?: () => void;
  onStepSimulation?: () => void;
  onResetSimulation?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  state,
  activeTab,
  onSelectTab,
  onTabChange,
  onOpenFaultModal,
  onOpenSandbox,
  onOpenDemoTour,
  onToggleSimulation,
  onResetSimulation,
}) => {
  const handleSelectTab = (tab: string) => {
    if (onSelectTab) onSelectTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  const handleOpenFaultModal = () => {
    if (onOpenFaultModal) onOpenFaultModal();
    if (onOpenSandbox) onOpenSandbox();
  };

  const currentScenario = state?.currentScenario || 'normal';
  const currentScenarioMeta = FAULT_SCENARIOS.find((s) => s.id === currentScenario);
  const isHealthy = currentScenario === 'normal' && !state?.activeIncident;
  const isPaused = state?.isPaused ?? false;

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'topology', label: 'Topology Graph', icon: Network },
    { id: 'metrics', label: 'Live Metrics', icon: Cpu },
    { id: 'logs', label: 'Log Stream', icon: FileText },
    { id: 'anomalies', label: 'ML Anomaly Timeline', icon: Brain },
    { id: 'rca', label: 'Root Cause (RCA)', icon: AlertTriangle, badge: state?.rcaCandidates && state.rcaCandidates.length > 0 ? state.rcaCandidates.length : undefined },
    { id: 'ai_diagnosis', label: 'AI Diagnosis', icon: Sparkles },
    { id: 'remediation', label: 'Playbooks & Recovery', icon: ShieldCheck, badge: state?.recommendations ? (state.recommendations.filter(r => r.status === 'proposed').length || undefined) : undefined },
    { id: 'history', label: 'Incident History', icon: History, badge: state?.incidentHistory && state.incidentHistory.length > 0 ? state.incidentHistory.length : undefined },
    { id: 'services', label: 'Services', icon: Server },
  ];

  return (
    <header id="app-header" className="bg-[#f0eee6] border-b border-[#cccbc8] text-[#141413] sticky top-0 z-40">
      {/* Top Header Bar */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 py-2">
          {/* Logo & Creative Subtle Identity */}
          <div className="flex items-center space-x-3">
            <div
              id="brand-logo-container"
              className="w-8 h-8 rounded-lg bg-[#faf9f5] border border-[#cccbc8] flex items-center justify-center p-1 shrink-0 shadow-xs"
              title="Glean Insights · Telemetry & RCA Platform"
            >
              <GleanLogo className="w-full h-full text-[#141413]" />
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="font-serif font-semibold text-lg tracking-tight text-[#141413]">
                Glean
              </span>
              <span className="font-serif italic text-base text-[#87867f] font-normal tracking-wide">
                insights
              </span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#d97757] ml-0.5 mb-0.5" />
            </div>
          </div>

          {/* Status Pill & Decisive Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Status Pill */}
            <div
              id="system-status-indicator"
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs border font-sans font-medium transition-all ${
                isHealthy
                  ? 'bg-[#faf9f5] border-[#cccbc8] text-[#141413]'
                  : 'bg-[#f5e3c7] border-[#d97757] text-[#141413]'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-[#4d7c71]' : 'bg-[#d97757]'}`} />
              <span className="font-mono font-medium text-[11px] truncate max-w-[140px] sm:max-w-[220px]">
                {isHealthy ? 'Nominal (5/5 Services)' : currentScenarioMeta?.title || 'Fault Injected'}
              </span>
            </div>

            {/* Simulation Controls */}
            <div className="flex items-center bg-[#faf9f5] rounded-xl border border-[#cccbc8] p-0.5">
              <button
                id="btn-toggle-pause"
                onClick={onToggleSimulation}
                title={isPaused ? 'Resume Simulation Tick' : 'Pause Simulation Tick'}
                className="p-1.5 text-[#141413] hover:bg-[#e3dacc] rounded-lg transition-colors"
                aria-label={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
              >
                {isPaused ? <Play className="w-3.5 h-3.5 fill-[#141413]" /> : <Pause className="w-3.5 h-3.5 fill-[#141413]" />}
              </button>
              <button
                id="btn-reset-simulation"
                onClick={onResetSimulation}
                title="Reset to Nominal Baseline"
                className="p-1.5 text-[#141413] hover:bg-[#e3dacc] rounded-lg transition-colors"
                aria-label="Reset to Nominal Baseline"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Demo Tour Button */}
            {onOpenDemoTour && (
              <button
                id="btn-open-demo-tour"
                onClick={onOpenDemoTour}
                className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 bg-[#faf9f5] hover:bg-[#e3dacc] text-[#141413] border border-[#cccbc8] rounded-xl text-xs font-sans font-medium transition-all"
                title="Open Guided Incident Walkthrough"
              >
                <Compass className="w-3.5 h-3.5 text-[#87867f]" />
                <span>Field Guide</span>
              </button>
            )}

            {/* Fault Injector Button — Action CTA in Clay Accent */}
            <button
              id="btn-open-fault-injector"
              onClick={handleOpenFaultModal}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#d97757] hover:bg-[#c6613f] text-[#ffffff] rounded-xl text-xs font-sans font-medium transition-all shadow-xs"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Inject Fault</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation in Editorial Sans Style with Clean Subtle Scroll */}
        <nav
          id="main-navigation-tabs"
          className="flex space-x-1 overflow-x-auto py-2 subtle-scroll border-t border-[#cccbc8]/60 text-xs font-sans scroll-smooth"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => handleSelectTab(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-sans whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#141413] text-[#faf9f5] font-medium'
                    : 'text-[#141413] hover:text-[#141413] hover:bg-[#e3dacc]/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#faf9f5]' : 'text-[#87867f]'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive
                        ? 'bg-[#faf9f5]/20 text-[#faf9f5]'
                        : 'bg-[#e3dacc] text-[#141413] border border-[#cccbc8]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
