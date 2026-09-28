import React, { useState } from 'react';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  Play,
  Zap,
  RotateCcw,
  Layers,
  Brain,
  ShieldCheck,
  X,
  Compass,
} from 'lucide-react';
import { simulationManager } from '../services/simulationStore';
import { FaultScenarioType } from '../types';

interface DemoTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
}

interface TourStep {
  id: number;
  title: string;
  subtitle: string;
  narrative: string;
  sreActionLabel: string;
  targetTab: string;
  actionType: 'reset' | 'inject_db_pool' | 'nav_anomalies' | 'nav_rca' | 'nav_ai' | 'approve_remedy';
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 1,
    title: '1. Establish Operational Baseline',
    subtitle: 'Healthy Distributed Microservice Topology',
    narrative:
      'Begin by observing all 5 microservices running in a nominal baseline state. Metrics are within healthy SLO thresholds (CPU < 25%, Latency p95 < 25ms, Error Rate < 0.05%). The ML anomaly detector monitors the telemetry streams continuously.',
    sreActionLabel: 'Reset to Healthy Baseline',
    targetTab: 'overview',
    actionType: 'reset',
  },
  {
    id: 2,
    title: '2. Inject Real-World Fault Scenario',
    subtitle: 'Simulating Connection Pool Exhaustion on Payment Gateway',
    narrative:
      'We inject a synthetic failure: "HikariCP Connection Pool Exhaustion" on Payment Service. Within seconds, active DB connections hit 80/80, causing query timeouts and upstream cascading latency into Order Service.',
    sreActionLabel: 'Inject DB Pool Exhaustion Fault',
    targetTab: 'overview',
    actionType: 'inject_db_pool',
  },
  {
    id: 3,
    title: '3. Multivariate ML Anomaly Detection',
    subtitle: 'Isolation Forest + Autoencoder Reconstruction Scoring',
    narrative:
      'The ML detection engine detects anomalies simultaneously across metric dimensions without rigid hardcoded static thresholds. Anomaly scores exceed the 0.60 threshold, automatically promoting the anomaly into an official P1 Incident.',
    sreActionLabel: 'Inspect ML Anomaly Timeline',
    targetTab: 'anomalies',
    actionType: 'nav_anomalies',
  },
  {
    id: 4,
    title: '4. Explainable 5-Factor RCA & AI Diagnosis',
    subtitle: 'Multi-Source Correlation & Grounded Gemini Synthesis',
    narrative:
      'The Structured RCA Engine calculates mathematical scores across 5 factors: Metric Anomaly (30%), Centrality (20%), Temporal Precedence (20%), Error Specificity (15%), and Signature Match (15%). Ranked candidate #1 is identified as Payment Service with 95% confidence.',
    sreActionLabel: 'Review RCA Ranking & AI Diagnosis',
    targetTab: 'rca',
    actionType: 'nav_rca',
  },
  {
    id: 5,
    title: '5. Safe Operator-Approved Remediation',
    subtitle: 'Human-in-the-Loop Approval & Closed-Loop Verification',
    narrative:
      'The system recommends the "Recycle and Expand DB Connection Pool" playbook. The SRE Lead reviews blast radius and approves execution. The platform dispatches commands to the orchestrator and verifies telemetry return to nominal SLO levels.',
    sreActionLabel: 'Execute Safe Playbook & Closed-Loop Verification',
    targetTab: 'remediation',
    actionType: 'approve_remedy',
  },
];

export const DemoTourModal: React.FC<DemoTourModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const step = TOUR_STEPS[currentStepIdx];

  if (!isOpen) return null;

  const handleExecuteStepAction = () => {
    onNavigateTab(step.targetTab);

    if (step.actionType === 'reset') {
      simulationManager.reset();
    } else if (step.actionType === 'inject_db_pool') {
      simulationManager.setScenario('db_connection_exhaustion');
    } else if (step.actionType === 'approve_remedy') {
      const state = simulationManager.getState();
      if (state.recommendations.length > 0) {
        simulationManager.approveRemediation(state.recommendations[0].id, 'SRE Demo Operator');
      }
    }
  };

  const handleNext = () => {
    if (currentStepIdx < TOUR_STEPS.length - 1) {
      const nextIdx = currentStepIdx + 1;
      setCurrentStepIdx(nextIdx);
      onNavigateTab(TOUR_STEPS[nextIdx].targetTab);
    }
  };

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      const prevIdx = currentStepIdx - 1;
      setCurrentStepIdx(prevIdx);
      onNavigateTab(TOUR_STEPS[prevIdx].targetTab);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div
        id="demo-tour-modal"
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-0 text-slate-800"
      >
        {/* Header */}
        <div className="bg-slate-50 p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <span>Guided Incident Response Demo Script</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-mono border border-slate-300 font-bold">
                  Step {currentStepIdx + 1} of {TOUR_STEPS.length}
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                A narrative walkthrough illustrating the complete AIOps incident lifecycle
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Indicators */}
        <div className="bg-slate-100/80 px-6 py-3 border-b border-slate-200 flex items-center justify-between font-mono">
          {TOUR_STEPS.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => {
                setCurrentStepIdx(idx);
                onNavigateTab(s.targetTab);
              }}
              className={`flex items-center space-x-1.5 text-xs transition-all ${
                idx === currentStepIdx
                  ? 'text-slate-900 font-bold'
                  : idx < currentStepIdx
                  ? 'text-emerald-700 font-medium'
                  : 'text-slate-400'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  idx === currentStepIdx
                    ? 'bg-slate-900 text-white font-bold'
                    : idx < currentStepIdx
                    ? 'bg-emerald-100 border border-emerald-300 text-emerald-800'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {idx < currentStepIdx ? '✓' : s.id}
              </span>
              <span className="hidden sm:inline">{s.title.split('.')[1]}</span>
            </button>
          ))}
        </div>

        {/* Step Content */}
        <div className="p-6 space-y-5">
          <div className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
              {step.subtitle}
            </span>
            <h3 className="text-lg font-bold text-slate-900">{step.title}</h3>
          </div>

          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-xs font-mono">
            {step.narrative}
          </p>

          {/* Action Trigger Button */}
          <div className="pt-2">
            <button
              id="btn-execute-tour-step"
              onClick={handleExecuteStepAction}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all font-mono"
            >
              <Zap className="w-4 h-4 fill-current text-amber-400" />
              <span>{step.sreActionLabel}</span>
            </button>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between font-mono">
          <button
            onClick={handlePrev}
            disabled={currentStepIdx === 0}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 rounded-lg text-xs font-bold transition-colors border border-slate-300 shadow-xs"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous Step</span>
          </button>

          <span className="text-xs text-slate-500">
            {currentStepIdx + 1} / {TOUR_STEPS.length}
          </span>

          <button
            onClick={currentStepIdx === TOUR_STEPS.length - 1 ? onClose : handleNext}
            className="flex items-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
          >
            <span>{currentStepIdx === TOUR_STEPS.length - 1 ? 'Finish Tour' : 'Next Step'}</span>
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};
