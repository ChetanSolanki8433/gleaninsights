import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Layers,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Terminal,
  FileCheck,
  Info,
  Server,
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeIncident = state.activeIncident;

  const fetchAiExplanation = async () => {
    if (!activeIncident) return;
    setIsLoading(true);
    setErrorMsg(null);

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
      setErrorMsg(err.message || 'Failed to generate AI diagnosis');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // If active incident exists and no report cached yet, fetch automatically
    if (activeIncident && !report && !isLoading) {
      fetchAiExplanation();
    }
  }, [activeIncident?.id]);

  return (
    <div id="ai-diagnosis-view" className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Local Evidence-Grounded AI Synthesis</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold flex items-center gap-1">
                <Lock className="w-3 h-3" />
                100% Offline & Native
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Deterministic causal synthesis anchored strictly to ingested SQLite/Postgres telemetry and PyTorch autoencoders
            </p>
          </div>
        </div>

        {activeIncident && (
          <button
            onClick={fetchAiExplanation}
            disabled={isLoading}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-xs font-mono"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''} text-white`} />
            <span>{isLoading ? 'Synthesizing Diagnosis...' : 'Regenerate Local Synthesis'}</span>
          </button>
        )}
      </div>

      {!activeIncident ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3 shadow-xs">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600" />
          <h3 className="text-base font-bold text-slate-900">No Active Incident to Diagnose</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto font-mono">
            The offline diagnosis engine operates strictly on active incident evidence packages. Inject a failure scenario to generate an evidence-bounded explanation.
          </p>
        </div>
      ) : isLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-16 text-center space-y-4 shadow-xs">
          <div className="w-10 h-10 border-3 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 font-mono">Synthesizing Telemetry Facts with Local ML Engine...</h3>
            <p className="text-xs text-slate-500 font-mono">
              Correlating metric anomalies, dependency call delays, and log exception signatures into structured report
            </p>
          </div>
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* Main Diagnosis Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 bottom-0 w-2 bg-slate-900" />

            {/* Top metadata */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 pl-2">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 text-xs font-mono font-bold">
                  {report.incidentId}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Engine: <strong className="text-slate-800">{report.modelUsed}</strong>
                </span>
              </div>

              <div className="flex items-center space-x-2 text-xs font-mono">
                <span className="text-slate-500">Diagnosis Confidence:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold">
                  {report.confidenceScore}%
                </span>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="space-y-2 pl-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                Executive Incident Summary
              </h3>
              <p className="text-sm text-slate-800 leading-relaxed font-normal">
                {report.executiveSummary}
              </p>
            </div>

            {/* Probable Root Cause Statement */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
              <div className="text-xs font-bold text-rose-700 flex items-center space-x-1.5 font-mono">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Probable Root Cause Identification</span>
              </div>
              <p className="text-sm font-bold text-slate-900 font-mono">
                {report.probableRootCause}
              </p>
              <p className="text-xs text-slate-600">
                {report.confidenceJustification}
              </p>
            </div>

            {/* Evidence Chain */}
            <div className="space-y-3 pl-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                Traceable Evidence Chain (Telemetry Grounding)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {report.evidenceChain.map((ev, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-slate-200 border border-slate-300 text-slate-700 font-bold flex items-center justify-center text-[10px] font-mono">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-900 font-mono">{ev.source}</span>
                    </div>
                    <p className="text-slate-700 text-[11px] leading-snug">
                      <strong className="text-slate-900">Fact:</strong> {ev.telemetryFact}
                    </p>
                    <p className="text-slate-500 text-[11px] leading-snug pt-1 border-t border-slate-200">
                      <strong className="text-slate-700">Correlation:</strong> {ev.correlation}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Dependency Impact */}
            <div className="space-y-2 pl-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                Microservice Dependency Cascade Path
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                {report.dependencyImpactDescription}
              </p>
            </div>

            {/* Mandatory Academic Limitations Section */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center space-x-1.5 text-amber-700 font-bold font-mono">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Diagnosis Boundary Limitations & Epistemic Bounds</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px] font-mono">
                {report.limitations.map((lim, idx) => (
                  <li key={idx}>{lim}</li>
                ))}
              </ul>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex items-center justify-between pl-2">
              <button
                onClick={() => setShowJsonPayload(!showJsonPayload)}
                className="text-xs text-slate-500 hover:text-slate-900 flex items-center space-x-1 font-mono"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>{showJsonPayload ? 'Hide Structured Evidence Input' : 'Inspect Grounded Synthesis Payload'}</span>
              </button>

              <button
                onClick={() => onNavigateTab('remediation')}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs"
              >
                <span>Proceed to Human-Approved Recovery</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Raw JSON Context Inspector */}
          {showJsonPayload && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                <span className="font-bold text-slate-900">Structured Telemetry Payload Grounded in SQLite</span>
                <span>Format: Pure JSON (Database Fact Anchors)</span>
              </div>
              <pre className="p-4 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[10px] text-slate-800 overflow-x-auto max-h-[300px]">
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
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500 font-mono">
          Click "Regenerate Local Synthesis" above to query the native offline reasoning engine.
        </div>
      )}
    </div>
  );
};
