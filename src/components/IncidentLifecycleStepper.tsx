import React from 'react';
import {
  AlertTriangle,
  FileSearch,
  Layers,
  Brain,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  UserCheck,
  Zap,
} from 'lucide-react';
import { Incident, IncidentLifecycleStage } from '../types';

interface IncidentLifecycleStepperProps {
  incident: Incident | null;
  onNavigateTab?: (tab: string) => void;
}

interface StageDefinition {
  stage: IncidentLifecycleStage;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  description: string;
  tabTarget?: string;
}

const STAGES: StageDefinition[] = [
  {
    stage: 'anomaly_detected',
    label: '1. Anomaly Detected',
    shortLabel: 'Anomaly',
    icon: AlertTriangle,
    description: 'Multivariate ML anomaly detected across telemetry stream',
    tabTarget: 'anomalies',
  },
  {
    stage: 'incident_created',
    label: '2. Incident Declared',
    shortLabel: 'Declared',
    icon: Zap,
    description: 'System declared active incident and initiated correlation pipeline',
    tabTarget: 'overview',
  },
  {
    stage: 'rca_ranking',
    label: '3. RCA Hypotheses Ranked',
    shortLabel: 'RCA Ranked',
    icon: Layers,
    description: '5-factor root cause algorithm scored candidate services',
    tabTarget: 'rca',
  },
  {
    stage: 'evidence_assembly',
    label: '4. Evidence Assembled',
    shortLabel: 'Evidence',
    icon: FileSearch,
    description: 'Correlated logs, traces, topology edges, and metric curves',
    tabTarget: 'rca',
  },
  {
    stage: 'diagnosis_generated',
    label: '5. AI Diagnosis Generated',
    shortLabel: 'AI Diagnosis',
    icon: Brain,
    description: 'Gemini synthesized grounded, evidence-backed narrative',
    tabTarget: 'ai_diagnosis',
  },
  {
    stage: 'remediation_recommended',
    label: '6. Playbook Recommended',
    shortLabel: 'Playbook',
    icon: ShieldCheck,
    description: 'Calibrated automated recovery playbook selected',
    tabTarget: 'remediation',
  },
  {
    stage: 'operator_approval',
    label: '7. Operator Approved',
    shortLabel: 'Approved',
    icon: UserCheck,
    description: 'Human-in-the-loop SRE authenticated and approved execution',
    tabTarget: 'remediation',
  },
  {
    stage: 'recovery_executing',
    label: '8. Action Executed',
    shortLabel: 'Executing',
    icon: Zap,
    description: 'Automator dispatched commands to container orchestrator',
    tabTarget: 'remediation',
  },
  {
    stage: 'verified_closed',
    label: '9. Verified & Closed',
    shortLabel: 'Closed',
    icon: CheckCircle2,
    description: 'Closed-loop telemetry verified SLO normalization',
    tabTarget: 'history',
  },
];

const STAGE_ORDER: IncidentLifecycleStage[] = [
  'anomaly_detected',
  'incident_created',
  'rca_ranking',
  'evidence_assembly',
  'diagnosis_generated',
  'remediation_recommended',
  'operator_approval',
  'recovery_executing',
  'verified_closed',
];

export const IncidentLifecycleStepper: React.FC<IncidentLifecycleStepperProps> = ({
  incident,
  onNavigateTab,
}) => {
  if (!incident) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3 text-slate-600 text-xs">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
          <span>Incident Lifecycle Pipeline: <strong className="text-slate-900 font-mono">Idle / Baseline Nominal</strong></span>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">9-Stage Closed-Loop Machine Ready</span>
      </div>
    );
  }

  const currentStage = incident.currentStage || 'anomaly_detected';
  const currentStageIndex = STAGE_ORDER.indexOf(currentStage);

  return (
    <div id="incident-lifecycle-stepper" className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4 shadow-xs text-slate-800">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          <span className="text-xs font-bold uppercase tracking-wider text-rose-600 font-mono">
            Active Incident Lifecycle: {incident.id}
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono border border-slate-200 font-semibold">
            {incident.title}
          </span>
        </div>
        <div className="flex items-center space-x-3 text-xs text-slate-500">
          <span className="flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono">Started: {incident.startTime}</span>
          </span>
          {incident.mttdSeconds && (
            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 rounded font-mono text-[11px] font-bold">
              MTTD: {incident.mttdSeconds}s
            </span>
          )}
        </div>
      </div>

      {/* 9-Stage Progress Track */}
      <div className="overflow-x-auto pb-2 scrollbar-none">
        <div className="min-w-[760px] flex items-center justify-between relative py-2">
          {/* Background Connecting Conduit */}
          <div className="absolute top-7 left-4 right-4 h-1 bg-slate-200 z-0 rounded-full" />
          <div
            className="absolute top-7 left-4 h-1 bg-slate-900 transition-all duration-500 z-0 rounded-full shadow-xs"
            style={{
              width: `${(Math.max(0, currentStageIndex) / (STAGE_ORDER.length - 1)) * 100}%`,
            }}
          />

          {STAGES.map((s, idx) => {
            const Icon = s.icon;
            const isCompleted = idx < currentStageIndex || incident.status === 'resolved';
            const isCurrent = idx === currentStageIndex && incident.status !== 'resolved';
            const isPending = idx > currentStageIndex && incident.status !== 'resolved';

            const event = incident.lifecycleTimeline?.find((e) => e.stage === s.stage);

            return (
              <div
                key={s.stage}
                id={`lifecycle-step-${s.stage}`}
                onClick={() => s.tabTarget && onNavigateTab && onNavigateTab(s.tabTarget)}
                className="relative z-10 flex flex-col items-center group cursor-pointer text-center px-1 max-w-[85px] transition-all"
                title={`${s.label}: ${s.description}`}
              >
                {/* Step Circle */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shadow-xs ${
                    isCompleted
                      ? 'bg-slate-900 text-white ring-2 ring-slate-400 font-extrabold'
                      : isCurrent
                      ? 'bg-rose-600 text-white ring-4 ring-rose-200 animate-pulse'
                      : 'bg-slate-100 text-slate-500 border border-slate-300 group-hover:border-slate-400'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Icon className="w-4 h-4" />}
                </div>

                {/* Step Labels */}
                <div className="mt-2.5 space-y-0.5">
                  <p
                    className={`text-[11px] font-semibold leading-tight line-clamp-1 ${
                      isCurrent
                        ? 'text-rose-600 font-bold'
                        : isCompleted
                        ? 'text-slate-900'
                        : 'text-slate-500'
                    }`}
                  >
                    {s.shortLabel}
                  </p>
                  {event ? (
                    <span className="text-[9px] text-slate-500 font-mono block">
                      {event.timestamp}
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-400 block">
                      {isCurrent ? 'In progress' : 'Pending'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage Detail Callout */}
      {incident.lifecycleTimeline && incident.lifecycleTimeline.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-500">Current Phase:</span>
            <span className="font-semibold text-slate-900">
              {STAGES.find((s) => s.stage === currentStage)?.label || currentStage}
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600 font-mono text-[11px]">
              {incident.lifecycleTimeline[incident.lifecycleTimeline.length - 1]?.description}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-[11px]">
            <span className="text-slate-500">Actor:</span>
            <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-mono font-semibold border border-slate-300">
              {incident.lifecycleTimeline[incident.lifecycleTimeline.length - 1]?.actor || 'System'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
