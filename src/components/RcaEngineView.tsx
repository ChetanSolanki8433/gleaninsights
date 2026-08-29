import React, { useState } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  FileText,
  Network,
  Sparkles,
  ShieldCheck,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { SimulationState } from '../services/rcaEngine';
import { RcaCandidate } from '../types';
import { IncidentLifecycleStepper } from './IncidentLifecycleStepper';

interface RcaEngineViewProps {
  state: SimulationState;
  onNavigateTab: (tab: string) => void;
  onApproveRemediation: (id: string) => void;
}

export const RcaEngineView: React.FC<RcaEngineViewProps> = ({
  state,
  onNavigateTab,
  onApproveRemediation,
}) => {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  const candidates = state.rcaCandidates;
  const isHealthy = state.currentScenario === 'normal' || candidates.length === 0;
  const topCandidate = candidates.length > 0 ? candidates[0] : null;

  return (
    <div id="rca-engine-view" className="space-y-6">
      {/* 9-Stage Incident Lifecycle Pipeline */}
      <IncidentLifecycleStepper
        incident={state.activeIncident}
        onNavigateTab={onNavigateTab}
      />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Structured Root Cause Analysis (RCA) Engine</h2>
            <p className="text-xs text-slate-500 font-mono">
              Multi-source telemetry correlation, causal graph traversal, and fault signature matching
            </p>
          </div>
        </div>

        {/* RCA Weight Formula Header */}
        <div className="bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-700 shadow-xs">
          <span className="text-slate-500 font-bold">R</span> = 0.30·Metric + 0.20·Dep + 0.20·Temp + 0.15·Log + 0.15·Sig
        </div>
      </div>

      {isHealthy ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3 shadow-xs">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600" />
          <h3 className="text-base font-bold text-slate-900">No Active Root Causes Detected</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto font-mono">
            All 5 microservices are reporting telemetry within normal baseline thresholds. Inject a failure from the Fault Sandbox to trigger automated root cause ranking.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Probable Root Cause & Reasoning */}
          {topCandidate && (
            <div className="bg-white border-2 border-rose-300 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-sm shadow-xs font-mono">
                    #1
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-rose-600 font-mono">
                      Probable Root Cause
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      {topCandidate.candidateServiceName}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-xs px-2.5 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200 font-mono font-semibold">
                    {topCandidate.leadLagRelationship}
                  </span>
                  <div className="text-right">
                    <span className="text-lg font-bold text-slate-900 font-mono">{topCandidate.score}/100</span>
                    <span className="text-xs text-emerald-600 block font-bold font-mono">{topCandidate.confidence}% Confidence</span>
                  </div>
                </div>
              </div>

              {/* 4 Explainable Sub-panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Why This is Likely */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
                  <h4 className="font-bold text-emerald-700 flex items-center space-x-1.5 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Why This Is Likely (Root Cause Hypothesis)</span>
                  </h4>
                  <p className="text-slate-700 leading-relaxed">
                    <strong className="text-slate-900">{topCandidate.candidateServiceName}</strong> exhibited the earliest anomaly onset in the temporal causal window. High metric divergence ({topCandidate.scoreBreakdown.metricEvidence}/100) and signature correlation ({topCandidate.scoreBreakdown.faultSignature}/100) match the signature <em className="text-slate-500">&quot;{topCandidate.faultSignatureMatched}&quot;</em>.
                  </p>
                </div>

                {/* Why It Is Not Final Certainty */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
                  <h4 className="font-bold text-amber-700 flex items-center space-x-1.5 font-mono">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Why Not Final Certainty (Uncertainty &amp; Confounders)</span>
                  </h4>
                  <p className="text-slate-700 leading-relaxed">
                    Downstream dependency retry loops may amplify apparent metric anomalies on adjacent services. Confounding network latency or concurrent background tasks could introduce minor latency jitter. Confidence is bounded at {topCandidate.confidence}%.
                  </p>
                </div>
              </div>

              {/* 5-Factor Radar / Meters */}
              <div className="space-y-2 pt-1">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                  5-Factor Mathematical Score Breakdown
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-500">Metric Divergence</span>
                      <span className="font-mono text-slate-900 font-bold">{topCandidate.scoreBreakdown.metricEvidence}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: `${topCandidate.scoreBreakdown.metricEvidence}%` }} />
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono">Weight: 30%</span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-500">Dependency Impact</span>
                      <span className="font-mono text-slate-900 font-bold">{topCandidate.scoreBreakdown.dependencyImpact}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${topCandidate.scoreBreakdown.dependencyImpact}%` }} />
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono">Weight: 20%</span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-500">Temporal Lead</span>
                      <span className="font-mono text-slate-900 font-bold">{topCandidate.scoreBreakdown.temporalPrecedence}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-700 rounded-full" style={{ width: `${topCandidate.scoreBreakdown.temporalPrecedence}%` }} />
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono">Weight: 20%</span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-500">Log Specificity</span>
                      <span className="font-mono text-slate-900 font-bold">{topCandidate.scoreBreakdown.logEvidence}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${topCandidate.scoreBreakdown.logEvidence}%` }} />
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono">Weight: 15%</span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-500">Signature Match</span>
                      <span className="font-mono text-slate-900 font-bold">{topCandidate.scoreBreakdown.faultSignature}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-500 rounded-full" style={{ width: `${topCandidate.scoreBreakdown.faultSignature}%` }} />
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono">Weight: 15%</span>
                  </div>
                </div>
              </div>

              {/* Supporting Telemetry Evidence List */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                  Supporting Telemetry Evidence Anchors ({topCandidate.evidenceItems.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {topCandidate.evidenceItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-start space-x-2"
                    >
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold uppercase shrink-0 ${
                          item.type === 'metric'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : item.type === 'timing'
                            ? 'bg-slate-200 text-slate-800 border border-slate-300'
                            : item.type === 'topology'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-slate-200 text-slate-700 border border-slate-300'
                        }`}
                      >
                        {item.type}
                      </span>
                      <span className="text-slate-700 leading-snug">{item.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => onNavigateTab('ai_diagnosis')}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-xs border border-slate-300"
                >
                  <Sparkles className="w-3.5 h-3.5 text-slate-600" />
                  <span>View Grounded AI Synthesis</span>
                </button>

                <button
                  onClick={() => onNavigateTab('remediation')}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-white" />
                  <span>Execute Matched Remediation Playbook</span>
                </button>
              </div>
            </div>
          )}

          {/* Section 2: Alternative Candidates Comparison Table */}
          {candidates.length > 1 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 font-mono">
                  <Layers className="w-4 h-4 text-slate-500" />
                  <span>Alternative Hypotheses &amp; Downstream Impacted Candidates</span>
                </h3>
                <span className="text-xs text-slate-500 font-mono">{candidates.length} candidates evaluated</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-mono">
                      <th className="p-3">Rank</th>
                      <th className="p-3">Candidate Service</th>
                      <th className="p-3">Lead/Lag Role</th>
                      <th className="p-3 text-center">R-Score</th>
                      <th className="p-3 text-center">Confidence</th>
                      <th className="p-3">Matched Signature</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {candidates.slice(1).map((candidate) => (
                      <tr key={candidate.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-slate-900">#{candidate.rank}</td>
                        <td className="p-3 font-semibold text-slate-800">{candidate.candidateServiceName}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] border border-slate-200 font-semibold">
                            {candidate.leadLagRelationship}
                          </span>
                        </td>
                        <td className="p-3 text-center text-slate-900 font-bold">{candidate.score}/100</td>
                        <td className="p-3 text-center text-slate-500">{candidate.confidence}%</td>
                        <td className="p-3 text-slate-600 text-[11px]">{candidate.faultSignatureMatched}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => onNavigateTab('topology')}
                            className="text-slate-600 hover:text-slate-900 font-bold hover:underline text-[11px]"
                          >
                            Trace Graph →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
