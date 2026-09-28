import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Layers,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { SimulationState } from '../services/rcaEngine';
import { IncidentLifecycleStepper } from './IncidentLifecycleStepper';

interface RcaEngineViewProps {
  state: SimulationState;
  onNavigateTab: (tab: string) => void;
  onApproveRemediation: (id: string) => void;
}

export const RcaEngineView: React.FC<RcaEngineViewProps> = ({
  state,
  onNavigateTab,
}) => {
  const candidates = state?.rcaCandidates || [];
  const isHealthy = (state?.currentScenario || 'normal') === 'normal' || candidates.length === 0;
  const topCandidate = candidates.length > 0 ? candidates[0] : null;

  return (
    <div id="rca-engine-view" className="space-y-6">
      {/* 9-Stage Incident Lifecycle Pipeline */}
      <IncidentLifecycleStepper
        incident={state?.activeIncident || null}
        onNavigateTab={onNavigateTab}
      />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-5">
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-xl bg-[#e3dacc] border border-[#cccbc8] flex items-center justify-center text-[#141413]">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-serif font-bold text-[#141413]">Structured Root Cause Analysis (RCA) Engine</h2>
            <p className="text-xs text-[#87867f] font-sans">
              Multi-source telemetry correlation, causal graph traversal, and fault signature matching
            </p>
          </div>
        </div>

        {/* RCA Weight Formula Header */}
        <div className="bg-[#f0eee6] border border-[#cccbc8] px-3.5 py-1.5 rounded-xl text-xs font-mono text-[#141413]">
          <span className="font-bold text-[#d97757]">R</span> = 0.30 M + 0.20 D + 0.20 T + 0.15 L + 0.15 S
        </div>
      </div>

      {isHealthy ? (
        <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-12 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 mx-auto text-[#4d7c71]" />
          <h3 className="text-base font-serif font-bold text-[#141413]">No Active Root Causes Detected</h3>
          <p className="text-xs text-[#87867f] max-w-md mx-auto font-serif">
            All 5 microservices are reporting telemetry within normal baseline thresholds. Inject a failure from the Fault Sandbox to trigger automated root cause ranking.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Probable Root Cause & Reasoning */}
          {topCandidate && (
            <div className="bg-[#f5e3c7] border border-[#cccbc8] rounded-[24px] p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#cccbc8]/60 pb-3">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#141413] text-[#faf9f5] flex items-center justify-center font-bold text-sm font-mono">
                    #1
                  </div>
                  <div>
                    <span className="text-[11px] uppercase font-sans font-bold tracking-wider text-[#d97757]">
                      Probable Root Cause
                    </span>
                    <h3 className="text-lg font-serif font-bold text-[#141413]">
                      {topCandidate.candidateServiceName}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-xs px-2.5 py-1 rounded-md bg-[#faf9f5] text-[#141413] border border-[#cccbc8] font-mono font-medium">
                    {topCandidate.leadLagRelationship}
                  </span>
                  <div className="text-right">
                    <span className="text-lg font-serif font-bold text-[#141413] font-mono">{topCandidate.score.toFixed(2)}/100</span>
                    <span className="text-xs text-[#4d7c71] block font-mono font-bold">{topCandidate.confidence.toFixed(2)}% Confidence</span>
                  </div>
                </div>
              </div>

              {/* Explainable Sub-panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                {/* Why This is Likely */}
                <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-xl p-4 space-y-2">
                  <h4 className="font-serif font-bold text-[#141413] flex items-center space-x-1.5 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-[#4d7c71]" />
                    <span>Why This Is Likely (Root Cause Hypothesis)</span>
                  </h4>
                  <p className="text-[#141413] leading-relaxed font-serif text-[13px]">
                    <strong className="text-[#141413]">{topCandidate.candidateServiceName}</strong> exhibited the earliest anomaly onset in the temporal causal window. High metric divergence ({topCandidate.scoreBreakdown.metricEvidence.toFixed(2)}/100) and signature correlation ({topCandidate.scoreBreakdown.faultSignature.toFixed(2)}/100) match the signature: <em className="text-[#87867f]">&quot;{topCandidate.faultSignatureMatched}&quot;</em>.
                  </p>
                </div>

                {/* Why It Is Not Final Certainty */}
                <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-xl p-4 space-y-2">
                  <h4 className="font-serif font-bold text-[#141413] flex items-center space-x-1.5 text-sm">
                    <HelpCircle className="w-4 h-4 text-[#87867f]" />
                    <span>Uncertainty &amp; Confounders</span>
                  </h4>
                  <p className="text-[#141413] leading-relaxed font-serif text-[13px]">
                    Downstream dependency retry loops may amplify apparent metric anomalies on adjacent services. Confounding network latency or concurrent background tasks could introduce minor latency jitter. Confidence is mathematically bounded at {topCandidate.confidence.toFixed(2)}%.
                  </p>
                </div>
              </div>

              {/* 5-Factor Score Meters */}
              <div className="space-y-2.5 pt-1">
                <h4 className="text-xs font-serif font-bold text-[#87867f] uppercase tracking-wider">
                  5-Factor Mathematical Score Breakdown
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="bg-[#faf9f5] p-3 rounded-xl border border-[#cccbc8]">
                    <div className="flex justify-between text-[11px] mb-1 font-mono">
                      <span className="text-[#87867f]">Metric</span>
                      <span className="text-[#141413] font-bold">{topCandidate.scoreBreakdown.metricEvidence.toFixed(2)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#e3dacc] rounded-full overflow-hidden">
                      <div className="h-full bg-[#d97757] rounded-full" style={{ width: `${topCandidate.scoreBreakdown.metricEvidence}%` }} />
                    </div>
                    <span className="text-[9px] text-[#87867f] font-mono">Weight: 30%</span>
                  </div>

                  <div className="bg-[#faf9f5] p-3 rounded-xl border border-[#cccbc8]">
                    <div className="flex justify-between text-[11px] mb-1 font-mono">
                      <span className="text-[#87867f]">Dependency</span>
                      <span className="text-[#141413] font-bold">{topCandidate.scoreBreakdown.dependencyImpact.toFixed(2)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#e3dacc] rounded-full overflow-hidden">
                      <div className="h-full bg-[#141413] rounded-full" style={{ width: `${topCandidate.scoreBreakdown.dependencyImpact}%` }} />
                    </div>
                    <span className="text-[9px] text-[#87867f] font-mono">Weight: 20%</span>
                  </div>

                  <div className="bg-[#faf9f5] p-3 rounded-xl border border-[#cccbc8]">
                    <div className="flex justify-between text-[11px] mb-1 font-mono">
                      <span className="text-[#87867f]">Temporal</span>
                      <span className="text-[#141413] font-bold">{topCandidate.scoreBreakdown.temporalPrecedence.toFixed(2)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#e3dacc] rounded-full overflow-hidden">
                      <div className="h-full bg-[#141413] rounded-full" style={{ width: `${topCandidate.scoreBreakdown.temporalPrecedence}%` }} />
                    </div>
                    <span className="text-[9px] text-[#87867f] font-mono">Weight: 20%</span>
                  </div>

                  <div className="bg-[#faf9f5] p-3 rounded-xl border border-[#cccbc8]">
                    <div className="flex justify-between text-[11px] mb-1 font-mono">
                      <span className="text-[#87867f]">Log Evidence</span>
                      <span className="text-[#141413] font-bold">{topCandidate.scoreBreakdown.logEvidence.toFixed(2)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#e3dacc] rounded-full overflow-hidden">
                      <div className="h-full bg-[#87867f] rounded-full" style={{ width: `${topCandidate.scoreBreakdown.logEvidence}%` }} />
                    </div>
                    <span className="text-[9px] text-[#87867f] font-mono">Weight: 15%</span>
                  </div>

                  <div className="bg-[#faf9f5] p-3 rounded-xl border border-[#cccbc8]">
                    <div className="flex justify-between text-[11px] mb-1 font-mono">
                      <span className="text-[#87867f]">Signature</span>
                      <span className="text-[#141413] font-bold">{topCandidate.scoreBreakdown.faultSignature.toFixed(2)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#e3dacc] rounded-full overflow-hidden">
                      <div className="h-full bg-[#87867f] rounded-full" style={{ width: `${topCandidate.scoreBreakdown.faultSignature}%` }} />
                    </div>
                    <span className="text-[9px] text-[#87867f] font-mono">Weight: 15%</span>
                  </div>
                </div>
              </div>

              {/* Supporting Telemetry Evidence List */}
              <div className="space-y-2.5 pt-2 border-t border-[#cccbc8]/60">
                <h4 className="text-xs font-serif font-bold text-[#87867f] uppercase tracking-wider">
                  Supporting Telemetry Evidence Anchors ({topCandidate.evidenceItems.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-sans">
                  {topCandidate.evidenceItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-[#faf9f5] rounded-xl border border-[#cccbc8] flex items-start space-x-2"
                    >
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium uppercase shrink-0 ${
                          item.type === 'metric'
                            ? 'bg-[#d97757] text-[#ffffff]'
                            : 'bg-[#e3dacc] text-[#141413] border border-[#cccbc8]'
                        }`}
                      >
                        {item.type}
                      </span>
                      <span className="text-[#141413] leading-snug">{item.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => onNavigateTab('ai_diagnosis')}
                  className="px-4 py-2 bg-[#faf9f5] hover:bg-[#e3dacc] text-[#141413] rounded-xl text-xs font-sans font-medium flex items-center space-x-1.5 transition-colors border border-[#cccbc8]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#87867f]" />
                  <span>Grounded AI Narrative</span>
                </button>
                <button
                  onClick={() => onNavigateTab('remediation')}
                  className="px-4 py-2 bg-[#d97757] hover:bg-[#c6613f] text-[#ffffff] rounded-xl text-xs font-sans font-medium flex items-center space-x-1.5 transition-all"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Execute Matched Recovery Playbook</span>
                </button>
              </div>
            </div>
          )}

          {/* Section 2: Alternative Candidates Comparison Table */}
          {candidates.length > 1 && (
            <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-serif font-bold text-[#141413] flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-[#87867f]" />
                  <span>Alternative Hypotheses &amp; Downstream Impacted Candidates</span>
                </h3>
                <span className="text-xs text-[#87867f] font-mono">{candidates.length} candidates evaluated</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="bg-[#f0eee6] border-y border-[#cccbc8] text-[#87867f] font-mono">
                      <th className="p-3">Rank</th>
                      <th className="p-3">Candidate Service</th>
                      <th className="p-3">Role</th>
                      <th className="p-3 text-center">R-Score</th>
                      <th className="p-3 text-center">Confidence</th>
                      <th className="p-3">Matched Signature</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#cccbc8]/50 font-mono">
                    {candidates.slice(1).map((candidate) => (
                      <tr key={candidate.id} className="hover:bg-[#f0eee6]/60 transition-colors">
                        <td className="p-3 font-bold text-[#141413]">#{candidate.rank}</td>
                        <td className="p-3 font-serif font-bold text-[#141413]">{candidate.candidateServiceName}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-[#f0eee6] text-[#141413] text-[10px] border border-[#cccbc8]">
                            {candidate.leadLagRelationship}
                          </span>
                        </td>
                        <td className="p-3 text-center text-[#141413] font-bold">{candidate.score.toFixed(2)}/100</td>
                        <td className="p-3 text-center text-[#87867f]">{candidate.confidence.toFixed(2)}%</td>
                        <td className="p-3 text-[#87867f] text-[11px] font-sans">{candidate.faultSignatureMatched}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => onNavigateTab('topology')}
                            className="text-[#141413] hover:underline font-bold text-[11px]"
                          >
                            Trace Graph
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
