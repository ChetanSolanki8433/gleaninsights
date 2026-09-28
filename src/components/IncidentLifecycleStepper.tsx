import React from 'react';
import {
  AlertTriangle,
  FileSearch,
  Layers,
  Brain,
  ShieldCheck,
  CheckCircle2,
  Clock,
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
    description: 'Grounded AI synthesized evidence-backed narrative',
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
      <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-5 flex items-center justify-between">
        <div className="flex items-center space-x-3 text-[#141413] text-xs font-sans">
          <span className="w-2.5 h-2.5 rounded-full bg-[#4d7c71]" />
          <span>Incident Lifecycle Pipeline: <strong className="font-mono text-[#141413]">Idle · Baseline Nominal</strong></span>
        </div>
        <span className="text-[11px] text-[#87867f] font-mono">9-Stage Closed-Loop Machine Ready</span>
      </div>
    );
  }

  const currentStage = incident.currentStage || 'anomaly_detected';
  const currentStageIndex = STAGE_ORDER.indexOf(currentStage);

  return (
    <div id="incident-lifecycle-stepper" className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-6 space-y-4 text-[#141413]">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#cccbc8]/60 pb-3">
        <div className="flex items-center space-x-2.5">
          <span className="w-2 h-2 rounded-full bg-[#d97757]" />
          <span className="text-xs font-serif font-bold uppercase tracking-wider text-[#d97757]">
            Active Incident Lifecycle: {incident.id}
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded-md bg-[#e3dacc] text-[#141413] font-mono border border-[#cccbc8] font-medium">
            {incident.title}
          </span>
        </div>
        <div className="flex items-center space-x-3 text-xs text-[#87867f] font-sans">
          <span className="flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-[#87867f]" />
            <span className="font-mono">Started: {incident.startTime}</span>
          </span>
          {incident.mttdSeconds !== undefined && (
            <span className="px-2 py-0.5 bg-[#e3dacc] border border-[#cccbc8] text-[#141413] rounded-md font-mono text-[11px]">
              MTTD: {typeof incident.mttdSeconds === 'number' ? incident.mttdSeconds.toFixed(2) : incident.mttdSeconds}s
            </span>
          )}
        </div>
      </div>

      {/* 9-Stage Progress Track with Smooth Subtle Scroll */}
      <div className="overflow-x-auto pb-2 subtle-scroll">
        <div className="min-w-[780px] flex items-center justify-between relative py-2">
          {/* Background Connecting Conduit */}
          <div className="absolute top-7 left-4 right-4 h-0.5 bg-[#cccbc8] z-0" />
          <div
            className="absolute top-7 left-4 h-0.5 bg-[#141413] transition-all duration-500 z-0"
            style={{
              width: `${(Math.max(0, currentStageIndex) / (STAGE_ORDER.length - 1)) * 100}%`,
            }}
          />

          {STAGES.map((s, idx) => {
            const Icon = s.icon;
            const isCompleted = idx < currentStageIndex || incident.status === 'resolved';
            const isCurrent = idx === currentStageIndex && incident.status !== 'resolved';
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
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-mono transition-all duration-300 border ${
                    isCompleted
                      ? 'bg-[#141413] text-[#faf9f5] border-[#141413] font-bold'
                      : isCurrent
                      ? 'bg-[#d97757] text-[#ffffff] border-[#d97757] ring-2 ring-[#d97757]/30'
                      : 'bg-[#faf9f5] text-[#87867f] border-[#cccbc8] group-hover:border-[#141413]'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4 text-[#faf9f5]" /> : <Icon className="w-4 h-4" />}
                </div>

                {/* Step Labels */}
                <div className="mt-2.5 space-y-0.5">
                  <p
                    className={`text-[11px] font-sans leading-tight line-clamp-1 ${
                      isCurrent
                        ? 'text-[#d97757] font-bold'
                        : isCompleted
                        ? 'text-[#141413] font-medium'
                        : 'text-[#87867f]'
                    }`}
                  >
                    {s.shortLabel}
                  </p>
                  {event ? (
                    <span className="text-[10px] text-[#87867f] font-mono block">
                      {event.timestamp}
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#b0aea5] font-mono block">
                      {isCurrent ? 'Active' : 'Pending'}
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
        <div className="bg-[#f0eee6] border border-[#cccbc8] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-sans">
          <div className="flex items-center space-x-2">
            <span className="text-[#87867f]">Current Stage:</span>
            <span className="font-serif font-bold text-[#141413]">
              {STAGES.find((s) => s.stage === currentStage)?.label || currentStage}
            </span>
            <span className="text-[#cccbc8]">|</span>
            <span className="text-[#141413] font-mono text-[11px]">
              {incident.lifecycleTimeline[incident.lifecycleTimeline.length - 1]?.description}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-[11px]">
            <span className="text-[#87867f]">Actor:</span>
            <span className="px-2 py-0.5 rounded bg-[#faf9f5] text-[#141413] font-mono border border-[#cccbc8]">
              {incident.lifecycleTimeline[incident.lifecycleTimeline.length - 1]?.actor || 'System'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
