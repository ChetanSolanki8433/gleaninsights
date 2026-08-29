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
  state: SimulationState;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenFaultModal: () => void;
  onOpenDemoTour?: () => void;
  onToggleSimulation: () => void;
  onStepSimulation?: () => void;
  onResetSimulation: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  state,
  activeTab,
  onSelectTab,
  onOpenFaultModal,
  onOpenDemoTour,
  onToggleSimulation,
  onResetSimulation,
}) => {
  const currentScenarioMeta = FAULT_SCENARIOS.find((s) => s.id === state.currentScenario);
  const isHealthy = state.currentScenario === 'normal' && !state.activeIncident;

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'topology', label: 'Topology Graph', icon: Network },
    { id: 'metrics', label: 'Live Metrics', icon: Cpu },
    { id: 'logs', label: 'Log Stream', icon: FileText },
    { id: 'anomalies', label: 'ML Anomaly Timeline', icon: Brain },
    { id: 'rca', label: 'Root Cause (RCA)', icon: AlertTriangle, badge: state.rcaCandidates.length > 0 ? state.rcaCandidates.length : undefined },
    { id: 'ai_diagnosis', label: 'AI Diagnosis', icon: Sparkles },
    { id: 'remediation', label: 'Playbooks & Recovery', icon: ShieldCheck, badge: state.recommendations.filter(r => r.status === 'proposed').length || undefined },
    { id: 'history', label: 'Incident History', icon: History, badge: state.incidentHistory.length > 0 ? state.incidentHistory.length : undefined },
    { id: 'services', label: 'Services', icon: Server },
    { id: 'evaluation', label: 'Evaluation Metrics', icon: Award },
  ];

  return (
    <header id="app-header" className="bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-800 sticky top-0 z-40 shadow-xs">
      {/* Top Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Branding */}
          <div className="flex items-center space-x-3">
            <div id="brand-logo-container" className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center p-1 overflow-hidden shrink-0 ring-1 ring-slate-900/5">
              <GleanLogo className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base tracking-tight text-slate-900 flex items-center gap-1.5 font-mono">
                  GLEAN Insights
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block font-mono text-[11px]">
                Multivariate Anomaly Detection, Topology Correlation & Grounded AI RCA
              </p>
            </div>
          </div>

          {/* Active Status Banner & Controls */}
          <div className="flex items-center space-x-2.5">
            {/* Status Pill */}
            <div
              id="system-status-indicator"
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                isHealthy
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-xs'
                  : 'bg-rose-50 border-rose-200 text-rose-800 animate-pulse shadow-xs'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-500' : 'bg-rose-600'}`} />
              <span className="font-mono font-semibold">
                {isHealthy ? 'Nominal (5 Services)' : `Active: ${currentScenarioMeta?.title || 'Fault Injected'}`}
              </span>
            </div>

            {/* Simulation Controls */}
            <div className="flex items-center bg-slate-100 rounded-md border border-slate-300 p-0.5 shadow-xs">
              <button
                id="btn-toggle-pause"
                onClick={onToggleSimulation}
                title={state.isPaused ? 'Resume Simulation Tick' : 'Pause Simulation Tick'}
                className="p-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"
              >
                {state.isPaused ? <Play className="w-4 h-4 text-emerald-600 fill-emerald-600" /> : <Pause className="w-4 h-4 text-amber-600 fill-amber-600" />}
              </button>

              <button
                id="btn-reset-simulation"
                onClick={onResetSimulation}
                title="Reset to Healthy Baseline"
                className="p-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Demo Tour Button */}
            {onOpenDemoTour && (
              <button
                id="btn-open-demo-tour"
                onClick={onOpenDemoTour}
                className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-md text-xs font-semibold shadow-xs transition-all"
                title="Open Guided Incident Response Walkthrough"
              >
                <Compass className="w-3.5 h-3.5 text-slate-700" />
                <span>Demo Tour</span>
              </button>
            )}

            {/* Fault Injector Button */}
            <button
              id="btn-open-fault-injector"
              onClick={onOpenFaultModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-semibold shadow-xs transition-all border border-rose-700"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Fault Sandbox</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation in Off-White style */}
        <nav id="main-navigation-tabs" className="flex space-x-1 overflow-x-auto py-2 scrollbar-none border-t border-slate-200">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-rose-100 text-rose-700 border border-rose-200'
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
