import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Terminal,
  Lock,
} from 'lucide-react';
import { SimulationState } from '../services/rcaEngine';
import { simulationManager } from '../services/simulationStore';
import { AiDiagnosisReport } from '../types';
import { apiClient } from '../services/apiClient';

interface AiDiagnosisViewProps {
  state: SimulationState;
  onNavigateTab: (tab: string) => void;
}

export const AiDiagnosisView: React.FC<AiDiagnosisViewProps> = ({
  state,
  onNavigateTab,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<AiDiagnosisReport | null>(simulationManager.getAiDiagnosis());
  const [showJsonPayload, setShowJsonPayload] = useState(false);

  const activeIncident = state.activeIncident;

  const fetchAiExplanation = async () => {
    if (!activeIncident) return;
    setIsLoading(true);
    try {
      const payload = {
        incident: activeIncident,
        rcaCandidates: state.rcaCandidates,
        anomalies: state.anomaliesHistory.slice(0, 10),
        logs: state.logsHistory.slice(0, 15),
        topology: state.dependencies,
      };
      const data = await apiClient.explainIncident(payload);
      setReport(data);
      simulationManager.setAiDiagnosis(data);
    } catch (err: any) {
      console.error('AI diagnosis generation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeIncident && !report && !isLoading) {
      fetchAiExplanation();
    }
  }, [activeIncident?.id]);

  return (
    <div id="ai-diagnosis-view" className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-5">
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-xl bg-[#e3dacc] border border-[#cccbc8] flex items-center justify-center text-[#141413]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-serif font-bold text-[#141413] flex items-center gap-2">
              <span>Evidence-Grounded Causal Synthesis</span>
              <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-[#e3dacc] text-[#141413] border border-[#cccbc8] font-medium flex items-center gap-1">
                <Lock className="w-3 h-3 text-[#87867f]" />
                Zero Cloud LLMs · Fully Native
              </span>
            </h2>
            <p className="text-xs text-[#87867f] font-sans">
              Deterministic causal synthesis anchored strictly to ingested SQLite/Postgres telemetry and PyTorch autoencoders
            </p>
          </div>
        </div>

        {activeIncident && (
          <button
            onClick={fetchAiExplanation}
            disabled={isLoading}
            className="px-3.5 py-1.5 bg-[#141413] hover:bg-[#3d3d3a] disabled:opacity-50 text-[#faf9f5] rounded-xl text-xs font-sans font-medium flex items-center space-x-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Synthesizing...' : 'Regenerate Synthesis'}</span>
          </button>
        )}
      </div>

      {!activeIncident ? (
        <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-12 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 mx-auto text-[#4d7c71]" />
          <h3 className="text-base font-serif font-bold text-[#141413]">No Active Incident to Diagnose</h3>
          <p className="text-xs text-[#87867f] max-w-md mx-auto font-serif">
            The diagnosis engine operates strictly on active incident evidence packages. Inject a failure scenario to generate an evidence-bounded explanation.
          </p>
        </div>
      ) : isLoading ? (
        <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-16 text-center space-y-4">
          <div className="w-8 h-8 border-2 border-[#cccbc8] border-t-[#141413] rounded-full animate-spin mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-serif font-bold text-[#141413]">Synthesizing Ingested Telemetry Facts...</h3>
            <p className="text-xs text-[#87867f] font-mono">
              Correlating metric anomalies, dependency call delays, and log exception signatures
            </p>
          </div>
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* Main Diagnosis Card */}
          <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-6 space-y-5">
            {/* Top metadata */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#cccbc8]/60">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-md bg-[#e3dacc] text-[#141413] border border-[#cccbc8] text-xs font-mono font-medium">
                  {report.incidentId}
                </span>
                <span className="text-xs text-[#87867f] font-mono">
                  Engine: <strong className="text-[#141413]">{report.modelUsed}</strong>
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs font-mono">
                <span className="text-[#87867f]">Diagnosis Confidence:</span>
                <span className="px-2.5 py-0.5 rounded-md bg-[#e3dacc] text-[#141413] border border-[#cccbc8] font-bold">
                  {report.confidenceScore.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="space-y-2">
              <h3 className="text-xs font-serif font-bold text-[#87867f] uppercase tracking-wider">
                Executive Incident Summary
              </h3>
              <p className="text-base text-[#141413] leading-relaxed font-serif">
                {report.executiveSummary}
              </p>
            </div>

            {/* Probable Root Cause Statement in Warm Manilla */}
            <div className="p-4 bg-[#f5e3c7] rounded-xl border border-[#cccbc8] space-y-1.5">
              <div className="text-xs font-serif font-bold text-[#d97757] flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[#d97757]" />
                <span>Probable Root Cause Identification</span>
              </div>
              <p className="text-sm font-bold text-[#141413] font-serif">
                {report.probableRootCause}
              </p>
              <p className="text-xs text-[#87867f] font-mono">
                {report.confidenceJustification}
              </p>
            </div>

            {/* Evidence Chain */}
            <div className="space-y-3">
              <h3 className="text-xs font-serif font-bold text-[#87867f] uppercase tracking-wider">
                Traceable Evidence Chain (Telemetry Grounding)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {report.evidenceChain.map((ev, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-[#f0eee6] rounded-xl border border-[#cccbc8] space-y-2 text-xs font-sans"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-[#e3dacc] text-[#141413] font-bold flex items-center justify-center text-[10px] font-mono">
                        {idx + 1}
                      </span>
                      <span className="font-serif font-bold text-[#141413]">{ev.source}</span>
                    </div>
                    <p className="text-[#141413] text-[12px] leading-snug font-serif">
                      <strong className="text-[#141413] font-sans font-medium">Fact:</strong> {ev.telemetryFact}
                    </p>
                    <p className="text-[#87867f] text-[11px] leading-snug pt-1 border-t border-[#cccbc8]/60 font-mono">
                      <strong>Correlation:</strong> {ev.correlation}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Dependency Impact */}
            <div className="space-y-2">
              <h3 className="text-xs font-serif font-bold text-[#87867f] uppercase tracking-wider">
                Microservice Dependency Cascade Path
              </h3>
              <p className="text-xs text-[#141413] leading-relaxed bg-[#f0eee6] p-3.5 rounded-xl border border-[#cccbc8] font-serif text-[13px]">
                {report.dependencyImpactDescription}
              </p>
            </div>

            {/* Academic Limitations Section */}
            <div className="p-4 bg-[#f0eee6] rounded-xl border border-[#cccbc8] space-y-2 text-xs">
              <div className="flex items-center space-x-1.5 text-[#141413] font-serif font-bold">
                <ShieldAlert className="w-4 h-4 text-[#87867f]" />
                <span>Diagnosis Boundary Limitations &amp; Epistemic Bounds</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[#87867f] text-[11px] font-mono">
                {report.limitations.map((lim, idx) => (
                  <li key={idx}>{lim}</li>
                ))}
              </ul>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={() => setShowJsonPayload(!showJsonPayload)}
                className="text-xs text-[#87867f] hover:text-[#141413] flex items-center space-x-1 font-mono"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>{showJsonPayload ? 'Hide Structured Evidence' : 'Inspect Evidence Payload'}</span>
              </button>
              <button
                onClick={() => onNavigateTab('remediation')}
                className="px-4 py-2 bg-[#d97757] hover:bg-[#c6613f] text-[#ffffff] rounded-xl text-xs font-sans font-medium flex items-center space-x-1.5 transition-all"
              >
                <span>Proceed to Recovery Actions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Raw JSON Context Inspector */}
          {showJsonPayload && (
            <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-6 space-y-2">
              <div className="flex items-center justify-between text-xs text-[#87867f] font-mono">
                <span className="font-bold text-[#141413]">Structured Telemetry Grounding Payload</span>
                <span>Format: Pure JSON</span>
              </div>
              <pre className="p-4 bg-[#f0eee6] rounded-xl border border-[#cccbc8] font-mono text-[10px] text-[#141413] overflow-x-auto max-h-[300px]">
                {JSON.stringify(
                  {
                    incident: activeIncident,
                    topRcaCandidate: state.rcaCandidates[0] || null,
                    anomaliesSummary: state.anomaliesHistory.slice(0, 5),
                    criticalLogs: state.logsHistory.filter((l) => l.level === 'ERROR' || l.level === 'FATAL').slice(0, 5),
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-8 text-center text-xs text-[#87867f] font-mono">
          Click &quot;Regenerate Synthesis&quot; above to query the native offline reasoning engine.
        </div>
      )}
    </div>
  );
};
