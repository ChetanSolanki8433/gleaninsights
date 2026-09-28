import React, { useState } from 'react';
import {
  Brain,
  TrendingUp,
  Activity,
  Sliders,
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
  const [thresholdSensitivity] = useState<number>(0.60);

  const scenario = state?.currentScenario || 'normal';
  const services = state?.services || [];

  const currentScores = services.map((srv) => {
    const scores = computeAnomalyScores(srv, scenario, 20);
    return {
      serviceId: srv.id,
      name: srv.name.split(' ')[0],
      fullName: srv.name,
      ifScore: Number(scores.isolationForestScore.toFixed(2)),
      aeScore: Number(scores.autoencoderReconError.toFixed(2)),
      contextScore: Number(scores.contextScore.toFixed(2)),
      finalScore: Number(scores.finalAnomalyScore.toFixed(2)),
      severity: scores.severity,
    };
  });

  return (
    <div id="anomaly-timeline-view" className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-5">
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-xl bg-[#e3dacc] border border-[#cccbc8] flex items-center justify-center text-[#141413]">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-serif font-bold text-[#141413]">ML Anomaly Detection Pipeline</h2>
            <p className="text-xs text-[#87867f] font-sans">
              Multivariate Isolation Forest + Autoencoder Reconstruction Error ensemble scoring
            </p>
          </div>
        </div>

        {/* Model Ensemble Formula Badge */}
        <div className="bg-[#f0eee6] border border-[#cccbc8] px-3.5 py-1.5 rounded-xl text-xs font-mono text-[#141413]">
          <span className="font-bold text-[#d97757]">S_final</span> = 0.45 S_IF + 0.35 S_AE + 0.20 S_context
        </div>
      </div>

      {/* Ensemble Comparison Chart & Tuning Logic */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Anomaly Score Breakdown Chart */}
        <div className="lg:col-span-2 bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-[#87867f]" />
              <h3 className="text-sm font-serif font-bold text-[#141413]">Service Anomaly Scores vs Incident Threshold (0.60)</h3>
            </div>
            <div className="flex items-center space-x-2 text-xs text-[#87867f] font-mono">
              <span className="w-2.5 h-2.5 bg-[#d97757] rounded" />
              <span>Threshold Mark</span>
            </div>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currentScores} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cccbc8" vertical={false} />
                <XAxis dataKey="name" stroke="#87867f" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 1.0]} stroke="#87867f" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#faf9f5', borderColor: '#cccbc8', borderRadius: '12px', fontSize: '11px', color: '#141413' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <ReferenceLine y={thresholdSensitivity} stroke="#d97757" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Threshold (0.60)', fill: '#d97757', fontSize: 10 }} />
                <Bar dataKey="ifScore" name="Isolation Forest (S_IF)" fill="#141413" radius={[4, 4, 0, 0]} />
                <Bar dataKey="aeScore" name="Autoencoder Recon (S_AE)" fill="#87867f" radius={[4, 4, 0, 0]} />
                <Bar dataKey="finalScore" name="Ensemble Score (S_final)" fill="#d97757" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ensemble Math Card & Thresholding Logic */}
        <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center space-x-2 pb-2 border-b border-[#cccbc8]/60">
              <Sliders className="w-4 h-4 text-[#87867f]" />
              <h3 className="text-sm font-serif font-bold text-[#141413]">Detection Math &amp; Formulation</h3>
            </div>
            <p className="text-xs text-[#141413] leading-relaxed font-serif">
              Multivariate features are extracted per sliding window across CPU trends, memory accumulation, latency p95 divergence, and database connection churn.
            </p>
            <div className="space-y-2 text-xs font-sans">
              <div className="p-3 bg-[#f0eee6] rounded-xl border border-[#cccbc8] space-y-1">
                <div className="text-[11px] font-mono font-bold text-[#141413]">Isolation Forest (w = 0.45)</div>
                <div className="text-[10px] text-[#87867f]">
                  Path length isolation in multivariate feature tree space. Sensitive to abrupt step changes.
                </div>
              </div>
              <div className="p-3 bg-[#f0eee6] rounded-xl border border-[#cccbc8] space-y-1">
                <div className="text-[11px] font-mono font-bold text-[#141413]">Autoencoder Loss (w = 0.35)</div>
                <div className="text-[10px] text-[#87867f]">
                  Reconstruction MSE error against learned nominal covariance distribution.
                </div>
              </div>
              <div className="p-3 bg-[#f0eee6] rounded-xl border border-[#cccbc8] space-y-1">
                <div className="text-[11px] font-mono font-bold text-[#141413]">Context Penalty (w = 0.20)</div>
                <div className="text-[10px] text-[#87867f]">
                  Operational health probe degradation and container restart count multiplier.
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#cccbc8]/60 text-[11px] text-[#87867f] flex items-center justify-between font-mono">
            <span>Bounds:</span>
            <span className="text-[#4d7c71] font-medium">&lt; 0.35 Nominal</span>
            <span className="text-[#d97757] font-bold">&gt; 0.60 Anomalous</span>
          </div>
        </div>
      </div>

      {/* Anomaly Events Timeline Feed */}
      <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-[#87867f]" />
            <h3 className="text-sm font-serif font-bold text-[#141413]">Historical Anomaly Detection Markers</h3>
          </div>
          <span className="text-xs text-[#87867f] font-mono">
            {state.anomaliesHistory.length} total event markers logged
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[380px] overflow-y-auto subtle-scroll pr-1">
          {state.anomaliesHistory.length === 0 ? (
            <div className="col-span-full text-center py-12 text-[#87867f] text-xs font-mono">
              No anomaly events recorded. All microservice telemetry vectors within nominal bands.
            </div>
          ) : (
            state.anomaliesHistory.map((record) => {
              const isSevere = record.severity === 'severe';
              return (
                <div
                  key={record.id}
                  className={`p-4 rounded-xl border transition-colors text-xs ${
                    isSevere
                      ? 'bg-[#f5e3c7]/60 border-[#d97757] text-[#141413]'
                      : 'bg-[#f0eee6] border-[#cccbc8] text-[#141413]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-serif font-bold text-[#141413] text-sm">{record.serviceName}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
                        isSevere ? 'bg-[#d97757] text-[#ffffff]' : 'bg-[#e3dacc] text-[#141413] border border-[#cccbc8]'
                      }`}
                    >
                      {record.severity.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#141413] font-mono">
                    Metric: <strong className="text-[#141413]">{record.metricName}</strong>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#cccbc8]/60 grid grid-cols-3 gap-1 font-mono text-[10px] text-[#87867f]">
                    <div>
                      <span>IF: </span>
                      <strong className="text-[#141413]">
                        {typeof record.isolationForestScore === 'number' ? record.isolationForestScore.toFixed(2) : record.isolationForestScore}
                      </strong>
                    </div>
                    <div>
                      <span>AE: </span>
                      <strong className="text-[#141413]">
                        {typeof record.autoencoderReconError === 'number' ? record.autoencoderReconError.toFixed(2) : record.autoencoderReconError}
                      </strong>
                    </div>
                    <div>
                      <span>Final: </span>
                      <strong className="text-[#d97757]">
                        {typeof record.finalAnomalyScore === 'number' ? record.finalAnomalyScore.toFixed(2) : record.finalAnomalyScore}
                      </strong>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] text-[#87867f] flex items-center justify-between font-mono">
                    <span>Logged: {record.detectedAt}</span>
                    <span>Thresh: {typeof record.threshold === 'number' ? record.threshold.toFixed(2) : record.threshold}</span>
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
