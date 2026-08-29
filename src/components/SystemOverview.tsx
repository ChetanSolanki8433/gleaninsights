import React from 'react';
import {
  Activity,
  AlertTriangle,
  Server,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  Zap,
  TrendingUp,
  Cpu,
  Database,
  CheckCircle2,
  Clock,
  Radio,
} from 'lucide-react';
import { SimulationState } from '../services/rcaEngine';
import { FAULT_SCENARIOS } from '../services/simulator';
import { IncidentLifecycleStepper } from './IncidentLifecycleStepper';

interface SystemOverviewProps {
  state: SimulationState;
  onNavigateTab: (tab: string) => void;
  onOpenFaultModal: () => void;
  onApproveRemediation: (id: string) => void;
}

export const SystemOverview: React.FC<SystemOverviewProps> = ({
  state,
  onNavigateTab,
  onOpenFaultModal,
  onApproveRemediation,
}) => {
  const isHealthy = state.currentScenario === 'normal' && !state.activeIncident;
  const currentScenarioMeta = FAULT_SCENARIOS.find((s) => s.id === state.currentScenario);

  // Compute cluster averages
  const avgCpu = Math.round(
    state.services.reduce((acc, s) => acc + s.currentMetrics.cpuPercent, 0) / state.services.length
  );
  const avgLatency = Math.round(
    state.services.reduce((acc, s) => acc + s.currentMetrics.latencyP95Ms, 0) / state.services.length
  );
  const maxErrorRate = Math.max(
    ...state.services.map((s) => s.currentMetrics.errorRatePercent)
  );

  const severeAnomalies = state.anomaliesHistory.filter((a) => a.severity === 'severe' || a.severity === 'anomalous');

  return (
    <div id="system-overview-view" className="space-y-6">
      {/* 9-Stage Incident Lifecycle Tracker */}
      <IncidentLifecycleStepper
        incident={state.activeIncident}
        onNavigateTab={onNavigateTab}
      />

      {/* Top Stat Cards in Off-White Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cluster Health Status */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cluster Status</span>
            <span className={`w-2.5 h-2.5 rounded-full ${isHealthy ? 'bg-emerald-500 shadow-emerald-500/50 shadow-sm' : 'bg-rose-500 animate-ping'}`} />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-slate-900 flex items-center space-x-2">
              <span>{isHealthy ? 'Nominal Baseline' : 'Incident in Progress'}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              {state.services.filter((s) => s.status === 'healthy').length} of 5 services nominal
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-mono">Uptime: 99.98%</span>
            <button onClick={() => onNavigateTab('topology')} className="text-slate-700 hover:text-slate-900 font-semibold flex items-center gap-0.5 hover:underline">
              Topology <ArrowUpRight className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Active Incident */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Incidents</span>
            <AlertTriangle className={`w-4 h-4 ${isHealthy ? 'text-slate-400' : 'text-rose-500'}`} />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {state.activeIncident ? '1 Active' : '0 Active'}
            </div>
            <p className="text-xs text-slate-500 mt-1 truncate font-mono">
              {state.activeIncident ? state.activeIncident.title : 'All metrics within thresholds'}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-mono">Severity: {state.activeIncident?.severity.toUpperCase() || 'NONE'}</span>
            {state.activeIncident && (
              <button onClick={() => onNavigateTab('rca')} className="text-rose-600 font-bold hover:underline flex items-center gap-0.5">
                View RCA <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Anomaly Detection Count */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">ML Anomaly Signals</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900 flex items-baseline space-x-2 font-mono">
              <span>{severeAnomalies.length}</span>
              <span className="text-xs font-normal text-slate-500">/ last 30 windows</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              Isolation Forest + Autoencoder model
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-mono">Threshold: &gt; 0.60</span>
            <button onClick={() => onNavigateTab('anomalies')} className="text-slate-700 hover:text-slate-900 font-semibold flex items-center gap-0.5 hover:underline">
              Timeline <ArrowUpRight className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Top Root Cause Confidence */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">RCA Top Confidence</span>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {state.rcaCandidates.length > 0 ? `${state.rcaCandidates[0].confidence}%` : '100% (Nominal)'}
            </div>
            <p className="text-xs text-slate-500 mt-1 truncate font-mono">
              {state.rcaCandidates.length > 0 ? state.rcaCandidates[0].candidateServiceName : 'No root cause detected'}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-mono">R-Formula: 5-Factor</span>
            <button onClick={() => onNavigateTab('ai_diagnosis')} className="text-slate-700 hover:text-slate-900 font-semibold flex items-center gap-0.5 hover:underline">
              AI Diagnosis <Sparkles className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Active Incident Action Card */}
      {state.activeIncident && (
        <div
          id="active-incident-banner"
          className="bg-white border-2 border-rose-300 rounded-xl p-5 shadow-md relative overflow-hidden text-slate-800"
        >
          <div className="absolute top-0 left-0 bottom-0 w-2 bg-gradient-to-b from-rose-500 to-rose-700" />
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5 pl-2">
              <div className="flex items-center space-x-2.5">
                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 text-xs font-mono font-bold">
                  {state.activeIncident.id}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-rose-50 text-rose-700 uppercase font-semibold tracking-wide border border-rose-200">
                  {state.activeIncident.severity} Severity
                </span>
                <span className="text-xs text-slate-500 flex items-center font-mono">
                  <Clock className="w-3 h-3 mr-1 text-slate-400" />
                  Started at {state.activeIncident.startTime}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900">
                {state.activeIncident.title}
              </h2>
              <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
                {state.activeIncident.summary}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-slate-500 font-mono">Affected Scope:</span>
                {state.activeIncident.affectedServices.map((srv, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono font-semibold"
                  >
                    {srv}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap lg:flex-col gap-2 shrink-0">
              <button
                id="btn-goto-rca"
                onClick={() => onNavigateTab('rca')}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-xs"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-white" />
                <span>Investigate Root Cause</span>
              </button>

              <button
                id="btn-goto-ai-diagnosis"
                onClick={() => onNavigateTab('ai_diagnosis')}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors border border-slate-300"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-700" />
                <span>Explain with Local ML</span>
              </button>

              {state.recommendations.length > 0 && state.recommendations[0].status === 'proposed' && (
                <button
                  id="btn-quick-approve"
                  onClick={() => onApproveRemediation(state.recommendations[0].id)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Approve Recovery Action</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Services Health & Telemetry Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Server className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-bold text-slate-900 tracking-wide uppercase">Microservice Cluster Health (5 Nodes)</h2>
          </div>
          <button
            onClick={() => onNavigateTab('services')}
            className="text-xs text-slate-600 hover:text-slate-900 font-semibold hover:underline flex items-center gap-0.5"
          >
            View Service Details <ArrowUpRight className="w-3 h-3 text-slate-400" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {state.services.map((service) => {
            const m = service.currentMetrics;
            const isDegraded = service.status === 'degraded' || service.status === 'critical' || service.status === 'crashed';

            return (
              <div
                key={service.id}
                id={`service-card-${service.id}`}
                className={`bg-white border rounded-xl p-4 flex flex-col justify-between transition-all shadow-xs ${
                  service.status === 'crashed'
                    ? 'border-rose-300 bg-rose-50/50'
                    : service.status === 'critical'
                    ? 'border-rose-300 bg-rose-50/30'
                    : service.status === 'degraded'
                    ? 'border-amber-300 bg-amber-50/30'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{service.name}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                        service.status === 'healthy'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : service.status === 'degraded'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {service.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-mono">
                    {service.version} • {service.language.split('/')[0].trim()}
                  </div>
                </div>

                {/* Micro Metric Gauges */}
                <div className="mt-4 space-y-2 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-500 text-[11px] mb-1 font-mono">
                      <span>CPU Utilization</span>
                      <span className={m.cpuPercent > 80 ? 'text-rose-600 font-bold' : 'text-slate-700 font-semibold'}>
                        {m.cpuPercent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          m.cpuPercent > 80
                            ? 'bg-rose-500'
                            : m.cpuPercent > 50
                            ? 'bg-amber-500'
                            : 'bg-slate-800'
                        }`}
                        style={{ width: `${Math.min(100, m.cpuPercent)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-500 text-[11px] mb-1 font-mono">
                      <span>Memory Heap</span>
                      <span className={m.memoryMb > 800 ? 'text-rose-600 font-bold' : 'text-slate-700 font-semibold'}>
                        {m.memoryMb}MB
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          m.memoryMb > 800 ? 'bg-rose-500' : 'bg-slate-700'
                        }`}
                        style={{ width: `${Math.min(100, (m.memoryMb / (m.memoryMaxMb || 1024)) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Latency p95:</span>
                    <span className={`font-mono font-semibold ${m.latencyP95Ms > 500 ? 'text-rose-600' : 'text-slate-700'}`}>
                      {m.latencyP95Ms}ms
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Error Rate:</span>
                    <span className={`font-mono font-semibold ${m.errorRatePercent > 2 ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
                      {m.errorRatePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex justify-between font-mono">
                  <span>Replicas: {service.instanceCount}</span>
                  <span>DB: {service.database.split(' ')[0]}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two-Column Grid: Recent Anomaly Feed & Structured Logs Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Anomaly Detection Feed */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Live ML Anomaly Detections</h3>
            </div>
            <button
              onClick={() => onNavigateTab('anomalies')}
              className="text-xs text-slate-600 hover:text-slate-900 font-semibold hover:underline"
            >
              View Full Feed ({state.anomaliesHistory.length})
            </button>
          </div>

          <div className="space-y-2.5 max-h-[320px] overflow-y-auto">
            {state.anomaliesHistory.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 font-mono">
                No telemetry anomalies flagged in current time window.
              </div>
            ) : (
              state.anomaliesHistory.slice(0, 5).map((anom) => (
                <div
                  key={anom.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start justify-between text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900">{anom.serviceName}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-mono">
                        {anom.metricName}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-bold font-mono ${
                          anom.severity === 'severe'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {anom.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px]">{anom.details}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3 font-mono text-[11px] text-slate-500">
                    <div>S_final: <strong className="text-rose-600 font-bold">{anom.finalAnomalyScore}</strong></div>
                    <div className="text-[10px] text-slate-400">{anom.detectedAt}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Structured Log Stream Preview */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Live Ingested Telemetry Logs</h3>
            </div>
            <button
              onClick={() => onNavigateTab('logs')}
              className="text-xs text-slate-600 hover:text-slate-900 font-semibold hover:underline"
            >
              Search Logs ({state.logsHistory.length})
            </button>
          </div>

          <div className="space-y-2 max-h-[320px] overflow-y-auto font-mono text-[11px]">
            {state.logsHistory.slice(0, 6).map((log) => (
              <div
                key={log.id}
                className={`p-2.5 rounded border transition-colors ${
                  log.level === 'FATAL'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : log.level === 'ERROR'
                    ? 'bg-rose-50/50 border-rose-200 text-rose-700'
                    : log.level === 'WARN'
                    ? 'bg-amber-50/50 border-amber-200 text-amber-700'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900">{log.serviceName}</span>
                    <span>{log.endpoint}</span>
                  </div>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="truncate text-slate-800">{log.message}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
