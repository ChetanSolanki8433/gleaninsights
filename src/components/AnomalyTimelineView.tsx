import React, { useState } from 'react';
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Layers,
  Cpu,
  Activity,
  CheckCircle2,
  Sliders,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { SimulationState } from '../services/rcaEngine';
import { computeAnomalyScores } from '../services/rcaEngine';

interface AnomalyTimelineViewProps {
  state: SimulationState;
}

export const AnomalyTimelineView: React.FC<AnomalyTimelineViewProps> = ({ state }) => {
  const [thresholdSensitivity, setThresholdSensitivity] = useState<number>(0.60);

  // Compute live scores for all 5 services
  const currentScores = state.services.map((srv) => {
    const scores = computeAnomalyScores(srv, state.currentScenario, 20);
    return {
      serviceId: srv.id,
      name: srv.name.split(' ')[0],
      fullName: srv.name,
      ifScore: scores.isolationForestScore,
      aeScore: scores.autoencoderReconError,
      contextScore: scores.contextScore,
      finalScore: scores.finalAnomalyScore,
      severity: scores.severity,
    };
  });

  return (
    <div id="anomaly-timeline-view" className="space-y-6">
      {/* Header Banner in Sheet Metal Plate */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-[#888B90]/30 rounded-xl p-4 shadow-lg shadow-black/20">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#888B90]/30 to-slate-800 border border-[#888B90]/50 flex items-center justify-center text-[#888B90]">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">ML Anomaly Detection Pipeline</h2>
            <p className="text-xs text-[#888B90] font-mono">
              Multivariate Isolation Forest + Autoencoder Reconstruction Error ensemble scoring
            </p>
          </div>
        </div>

        {/* Model Ensemble Formula Badge */}
        <div className="bg-slate-950 border border-[#888B90]/40 px-3 py-1.5 rounded-lg text-xs font-mono text-[#D0D2D6] shadow-inner">
          <span className="text-[#888B90] font-bold">S_final</span> = 0.45·S_IF + 0.35·S_AE + 0.20·S_context
        </div>
      </div>

      {/* Ensemble Comparison Chart & Service Anomaly Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Anomaly Score Breakdown Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-[#888B90]/30 rounded-xl p-5 space-y-4 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-[#888B90]" />
              <h3 className="text-sm font-bold text-white font-mono">Live Service Anomaly Scores vs Threshold (0.60)</h3>
            </div>
            <div className="flex items-center space-x-2 text-xs text-[#888B90] font-mono">
              <span className="w-2.5 h-2.5 bg-rose-500 rounded" />
              <span>Threshold Line</span>
            </div>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currentScores} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2B2D33" />
                <XAxis dataKey="name" stroke="#888B90" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 1.0]} stroke="#888B90" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#16171A', borderColor: '#888B90', borderRadius: '8px', fontSize: '11px', color: '#fff' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <ReferenceLine y={thresholdSensitivity} stroke="#f43f5e" strokeDasharray="4 4" strokeWidth={2} label={{ value: 'Incident Threshold (0.60)', fill: '#f43f5e', fontSize: 10 }} />
                <Bar dataKey="ifScore" name="Isolation Forest (S_IF)" fill="#888B90" radius={[4, 4, 0, 0]} />
                <Bar dataKey="aeScore" name="Autoencoder Recon (S_AE)" fill="#B2B5BA" radius={[4, 4, 0, 0]} />
                <Bar dataKey="finalScore" name="Ensemble Score (S_final)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ensemble Math Card & Thresholding Logic */}
        <div className="bg-slate-900 border border-[#888B90]/30 rounded-xl p-5 space-y-4 flex flex-col justify-between shadow-lg shadow-black/20">
          <div className="space-y-3">
            <div className="flex items-center space-x-2 pb-2 border-b border-[#888B90]/20">
              <Sliders className="w-4 h-4 text-[#888B90]" />
              <h3 className="text-sm font-bold text-white font-mono">Detection Math &amp; Tuning</h3>
            </div>

            <p className="text-xs text-[#D0D2D6] leading-relaxed">
              Features are extracted per 30-second window across CPU trend slopes, memory expansion rates, latency p95, and DB pool churn.
            </p>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-slate-950 rounded-lg border border-[#888B90]/25 space-y-1 shadow-inner">
                <div className="text-[11px] font-bold text-white font-mono">Isolation Forest (w₁ = 0.45)</div>
                <div className="text-[10px] text-[#888B90]">
                  Measures path length isolation in multivariate feature tree space. Sensitive to abrupt spikes.
                </div>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-[#888B90]/25 space-y-1 shadow-inner">
                <div className="text-[11px] font-bold text-white font-mono">Autoencoder Loss (w₂ = 0.35)</div>
                <div className="text-[10px] text-[#888B90]">
                  Measures reconstruction error against normal operational covariance baseline.
                </div>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-[#888B90]/25 space-y-1 shadow-inner">
                <div className="text-[11px] font-bold text-white font-mono">Context Penalty (w₃ = 0.20)</div>
                <div className="text-[10px] text-[#888B90]">
                  Applies health probe degradation and container restart count multipliers.
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#888B90]/20 text-[11px] text-[#888B90] flex items-center justify-between font-mono">
            <span>Classification:</span>
            <span className="text-emerald-400 font-bold">&lt;0.35 Normal</span>
            <span className="text-amber-400 font-bold">&gt;0.60 Anomalous</span>
          </div>
        </div>
      </div>

      {/* Anomaly Events Timeline Feed */}
      <div className="bg-slate-900 border border-[#888B90]/30 rounded-xl p-5 shadow-lg shadow-black/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-bold text-white font-mono">Historical Anomaly Detection Events</h3>
          </div>
          <span className="text-xs text-[#888B90] font-mono">
            {state.anomaliesHistory.length} total event markers logged
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto">
          {state.anomaliesHistory.length === 0 ? (
            <div className="col-span-full text-center py-12 text-[#888B90] text-xs font-mono">
              No anomaly events recorded. All microservice telemetry vectors within nominal bands.
            </div>
          ) : (
            state.anomaliesHistory.map((record) => {
              const isSevere = record.severity === 'severe';
              return (
                <div
                  key={record.id}
                  className={`p-3.5 rounded-lg border transition-colors text-xs ${
                    isSevere
                      ? 'bg-rose-950/20 border-rose-800/80 text-rose-200'
                      : 'bg-amber-950/20 border-amber-800/60 text-amber-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-white font-mono">{record.serviceName}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                        isSevere ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
                      }`}
                    >
                      {record.severity.toUpperCase()}
                    </span>
                  </div>

                  <div className="text-[11px] text-[#D0D2D6]">
                    Metric: <strong className="text-white font-mono">{record.metricName}</strong>
                  </div>

                  <div className="mt-2 pt-2 border-t border-[#888B90]/20 grid grid-cols-3 gap-1 font-mono text-[10px] text-[#888B90]">
                    <div>
                      <span>IF: </span>
                      <strong className="text-white">{record.isolationForestScore}</strong>
                    </div>
                    <div>
                      <span>AE: </span>
                      <strong className="text-white">{record.autoencoderReconError}</strong>
                    </div>
                    <div>
                      <span>Final: </span>
                      <strong className="text-rose-400">{record.finalAnomalyScore}</strong>
                    </div>
                  </div>

                  <div className="mt-2 text-[10px] text-[#888B90] flex items-center justify-between font-mono">
                    <span>Logged: {record.detectedAt}</span>
                    <span>Thresh: {record.threshold}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
