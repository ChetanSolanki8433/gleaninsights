import React from 'react';
import {
  Activity,
  AlertTriangle,
  Server,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Clock,
  Radio,
} from 'lucide-react';
import { SimulationState } from '../services/rcaEngine';
import { IncidentLifecycleStepper } from './IncidentLifecycleStepper';

interface SystemOverviewProps {
  state: SimulationState;
  onNavigateTab: (tab: string) => void;
  onOpenFaultModal?: () => void;
  onOpenSandbox?: () => void;
  onApproveRemediation: (id: string) => void;
}

export const SystemOverview: React.FC<SystemOverviewProps> = ({
  state,
  onNavigateTab,
  onOpenFaultModal,
  onOpenSandbox,
  onApproveRemediation,
}) => {
  const isHealthy = (state?.currentScenario || 'normal') === 'normal' && !state?.activeIncident;

  const severeAnomalies = (state?.anomaliesHistory || []).filter(
    (a) => a.severity === 'severe' || a.severity === 'anomalous'
  );

  return (
    <div id="system-overview-view" className="space-y-8">
      {/* 9-Stage Incident Lifecycle Tracker */}
      <IncidentLifecycleStepper
        incident={state.activeIncident}
        onNavigateTab={onNavigateTab}
      />

      {/* Top Stat Cards in Parchment Editorial Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Cluster Health Status */}
        <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-sans uppercase tracking-wider text-[#87867f] font-medium">Cluster Status</span>
            <span className={`w-2.5 h-2.5 rounded-full ${isHealthy ? 'bg-[#4d7c71]' : 'bg-[#d97757]'}`} />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-serif font-bold text-[#141413]">
              {isHealthy ? 'Nominal Baseline' : 'Incident in Progress'}
            </div>
            <p className="text-xs text-[#87867f] mt-1 font-mono">
              {state.services.filter((s) => s.status === 'healthy').length} of 5 services nominal
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#cccbc8]/60 flex items-center justify-between text-xs text-[#87867f] font-sans">
            <span className="font-mono">Availability: 99.98%</span>
            <button
              onClick={() => onNavigateTab('topology')}
              className="text-[#141413] hover:underline font-medium flex items-center gap-1"
            >
              Topology <ArrowUpRight className="w-3 h-3 text-[#87867f]" />
            </button>
          </div>
        </div>

        {/* Active Incident */}
        <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-sans uppercase tracking-wider text-[#87867f] font-medium">Active Incidents</span>
            <AlertTriangle className={`w-4 h-4 ${isHealthy ? 'text-[#87867f]' : 'text-[#d97757]'}`} />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-serif font-bold text-[#141413]">
              {state.activeIncident ? '1 Active Incident' : '0 Active'}
            </div>
            <p className="text-xs text-[#87867f] mt-1 truncate font-mono">
              {state.activeIncident ? state.activeIncident.title : 'All metrics within thresholds'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#cccbc8]/60 flex items-center justify-between text-xs text-[#87867f] font-sans">
            <span className="font-mono">Severity: {state.activeIncident?.severity.toUpperCase() || 'NONE'}</span>
            {state.activeIncident && (
              <button
                onClick={() => onNavigateTab('rca')}
                className="text-[#d97757] font-medium hover:underline flex items-center gap-1"
              >
                Inspect RCA <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Anomaly Detection Count */}
        <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-sans uppercase tracking-wider text-[#87867f] font-medium">ML Anomaly Signals</span>
            <TrendingUp className="w-4 h-4 text-[#87867f]" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-serif font-bold text-[#141413] flex items-baseline space-x-2">
              <span className="font-mono">{severeAnomalies.length}</span>
              <span className="text-xs font-sans font-normal text-[#87867f]">/ 30 windows</span>
            </div>
            <p className="text-xs text-[#87867f] mt-1 font-mono">
              Isolation Forest + Autoencoder
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#cccbc8]/60 flex items-center justify-between text-xs text-[#87867f] font-sans">
            <span className="font-mono">Threshold: &gt; 0.60</span>
            <button
              onClick={() => onNavigateTab('anomalies')}
              className="text-[#141413] hover:underline font-medium flex items-center gap-1"
            >
              Timeline <ArrowUpRight className="w-3 h-3 text-[#87867f]" />
            </button>
          </div>
        </div>

        {/* Top Root Cause Confidence */}
        <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-sans uppercase tracking-wider text-[#87867f] font-medium">Top RCA Confidence</span>
            <Activity className="w-4 h-4 text-[#87867f]" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-serif font-bold text-[#141413] font-mono">
              {state.rcaCandidates.length > 0 ? `${state.rcaCandidates[0].confidence.toFixed(2)}%` : '100.00%'}
            </div>
            <p className="text-xs text-[#87867f] mt-1 truncate font-mono">
              {state.rcaCandidates.length > 0 ? state.rcaCandidates[0].candidateServiceName : 'Nominal baseline'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#cccbc8]/60 flex items-center justify-between text-xs text-[#87867f] font-sans">
            <span className="font-mono">Formula: 5-Factor</span>
            <button
              onClick={() => onNavigateTab('ai_diagnosis')}
              className="text-[#141413] hover:underline font-medium flex items-center gap-1"
            >
              AI Diagnosis <Sparkles className="w-3 h-3 text-[#87867f]" />
            </button>
          </div>
        </div>
      </div>

      {/* Featured Active Incident Card in Manilla / Warm Editorial Tone */}
      {state.activeIncident && (
        <div
          id="active-incident-banner"
          className="bg-[#f5e3c7] border border-[#cccbc8] rounded-[24px] p-6 text-[#141413] space-y-4"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex items-center space-x-2.5">
                <span className="px-2.5 py-0.5 rounded-md bg-[#faf9f5] text-[#141413] border border-[#cccbc8] text-xs font-mono font-medium">
                  {state.activeIncident.id}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-md bg-[#e3dacc] text-[#141413] uppercase font-sans font-medium tracking-wide border border-[#cccbc8]">
                  {state.activeIncident.severity} Severity
                </span>
                <span className="text-xs text-[#87867f] flex items-center font-mono">
                  <Clock className="w-3 h-3 mr-1 text-[#87867f]" />
                  Started at {state.activeIncident.startTime}
                </span>
              </div>
              <h2 className="text-xl font-serif font-bold text-[#141413]">
                {state.activeIncident.title}
              </h2>
              <p className="text-sm text-[#141413] max-w-3xl leading-relaxed font-serif">
                {state.activeIncident.summary}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-[#87867f] font-mono">Affected Scope:</span>
                {state.activeIncident.affectedServices.map((srv, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2.5 py-0.5 rounded-md bg-[#faf9f5] text-[#141413] border border-[#cccbc8] font-mono"
                  >
                    {srv}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick Actions with Editorial Buttons */}
            <div className="flex flex-wrap lg:flex-col gap-2.5 shrink-0">
              <button
                id="btn-goto-rca"
                onClick={() => onNavigateTab('rca')}
                className="px-4 py-2 bg-[#141413] hover:bg-[#3d3d3a] text-[#faf9f5] rounded-xl text-xs font-sans font-medium flex items-center justify-center space-x-1.5 transition-all"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-[#faf9f5]" />
                <span>Investigate Root Cause</span>
              </button>
              <button
                id="btn-goto-ai-diagnosis"
                onClick={() => onNavigateTab('ai_diagnosis')}
                className="px-4 py-2 bg-[#faf9f5] hover:bg-[#e3dacc] text-[#141413] rounded-xl text-xs font-sans font-medium flex items-center justify-center space-x-1.5 transition-colors border border-[#cccbc8]"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#87867f]" />
                <span>Grounded AI Synthesis</span>
              </button>
              {state.recommendations.length > 0 && state.recommendations[0].status === 'proposed' && (
                <button
                  id="btn-quick-approve"
                  onClick={() => onApproveRemediation(state.recommendations[0].id)}
                  className="px-4 py-2 bg-[#d97757] hover:bg-[#c6613f] text-[#ffffff] rounded-xl text-xs font-sans font-medium flex items-center justify-center space-x-1.5 transition-colors"
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Server className="w-4 h-4 text-[#87867f]" />
            <h2 className="text-base font-serif font-bold text-[#141413]">Microservice Environment (5 Nodes)</h2>
          </div>
          <button
            onClick={() => onNavigateTab('services')}
            className="text-xs text-[#141413] hover:underline font-sans font-medium flex items-center gap-1"
          >
            Service Registry <ArrowUpRight className="w-3 h-3 text-[#87867f]" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {state.services.map((service) => {
            const m = service.currentMetrics;
            const isDegraded = service.status === 'degraded' || service.status === 'critical' || service.status === 'crashed';
            return (
              <div
                key={service.id}
                id={`service-card-${service.id}`}
                className={`border rounded-[24px] p-5 flex flex-col justify-between transition-all ${
                  service.status === 'crashed'
                    ? 'border-[#d97757] bg-[#f5e3c7]/60'
                    : service.status === 'critical'
                    ? 'border-[#d97757] bg-[#f5e3c7]/40'
                    : service.status === 'degraded'
                    ? 'border-[#87867f] bg-[#e3dacc]/50'
                    : 'border-[#cccbc8] bg-[#faf9f5]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-serif font-bold text-[#141413]">{service.name}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-medium ${
                        service.status === 'healthy'
                          ? 'bg-[#e3dacc] text-[#141413] border border-[#cccbc8]'
                          : 'bg-[#d97757] text-[#ffffff]'
                      }`}
                    >
                      {service.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#87867f] mt-1 font-mono">
                    {service.version} · {service.language.split('/')[0].trim()}
                  </div>
                </div>

                {/* Micro Metric Gauges */}
                <div className="mt-4 space-y-2.5 text-xs font-sans">
                  <div>
                    <div className="flex justify-between text-[#87867f] text-[11px] mb-1 font-mono">
                      <span>CPU Load</span>
                      <span className={m.cpuPercent > 80 ? 'text-[#d97757] font-bold' : 'text-[#141413]'}>
                        {m.cpuPercent.toFixed(2)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#e3dacc] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          m.cpuPercent > 80 ? 'bg-[#d97757]' : 'bg-[#141413]'
                        }`}
                        style={{ width: `${Math.min(100, m.cpuPercent)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[#87867f] text-[11px] mb-1 font-mono">
                      <span>Memory Heap</span>
                      <span className={m.memoryMb > 800 ? 'text-[#d97757] font-bold' : 'text-[#141413]'}>
                        {m.memoryMb.toFixed(2)} MB
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#e3dacc] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          m.memoryMb > 800 ? 'bg-[#d97757]' : 'bg-[#87867f]'
                        }`}
                        style={{ width: `${Math.min(100, (m.memoryMb / (m.memoryMaxMb || 1024)) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#cccbc8]/60 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#87867f]">Latency p95:</span>
                    <span className={m.latencyP95Ms > 500 ? 'text-[#d97757] font-bold' : 'text-[#141413]'}>
                      {m.latencyP95Ms.toFixed(2)} ms
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#87867f]">Error Rate:</span>
                    <span className={m.errorRatePercent > 2 ? 'text-[#d97757] font-bold' : 'text-[#141413]'}>
                      {m.errorRatePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-[#cccbc8]/60 text-[10px] text-[#87867f] flex justify-between font-mono">
                  <span>Replicas: {service.instanceCount}</span>
                  <span>{service.database.split(' ')[0]}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two-Column Grid: Recent Anomaly Feed & Structured Logs Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Anomaly Detection Feed */}
        <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-[#87867f]" />
              <h3 className="text-sm font-serif font-bold text-[#141413]">Live ML Anomaly Detections</h3>
            </div>
            <button
              onClick={() => onNavigateTab('anomalies')}
              className="text-xs text-[#141413] hover:underline font-sans font-medium"
            >
              Full Feed ({state.anomaliesHistory.length})
            </button>
          </div>

          <div className="space-y-2.5 max-h-[320px] overflow-y-auto subtle-scroll pr-1">
            {state.anomaliesHistory.length === 0 ? (
              <div className="text-center py-10 text-xs text-[#87867f] font-mono">
                No telemetry anomalies flagged in current time window.
              </div>
            ) : (
              state.anomaliesHistory.slice(0, 5).map((anom) => (
                <div
                  key={anom.id}
                  className="p-3.5 bg-[#f0eee6] border border-[#cccbc8] rounded-xl flex items-start justify-between text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 font-sans">
                      <span className="font-serif font-bold text-[#141413]">{anom.serviceName}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#faf9f5] text-[#141413] font-mono border border-[#cccbc8]">
                        {anom.metricName}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                          anom.severity === 'severe'
                            ? 'bg-[#d97757] text-[#ffffff]'
                            : 'bg-[#e3dacc] text-[#141413] border border-[#cccbc8]'
                        }`}
                      >
                        {anom.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[#87867f] text-[11px] font-mono">{anom.details}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3 font-mono text-[11px] text-[#87867f]">
                    <div>Score: <strong className="text-[#141413]">{typeof anom.finalAnomalyScore === 'number' ? anom.finalAnomalyScore.toFixed(2) : anom.finalAnomalyScore}</strong></div>
                    <div className="text-[10px] text-[#b0aea5]">{anom.detectedAt}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Structured Log Stream Preview */}
        <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-[#87867f]" />
              <h3 className="text-sm font-serif font-bold text-[#141413]">Ingested Telemetry Log Stream</h3>
            </div>
            <button
              onClick={() => onNavigateTab('logs')}
              className="text-xs text-[#141413] hover:underline font-sans font-medium"
            >
              Search Logs ({state.logsHistory.length})
            </button>
          </div>

          <div className="space-y-2 max-h-[320px] overflow-y-auto subtle-scroll font-mono text-[11px] pr-1">
            {state.logsHistory.slice(0, 6).map((log) => (
              <div
                key={log.id}
                className={`p-3 rounded-xl border transition-colors ${
                  log.level === 'FATAL' || log.level === 'ERROR'
                    ? 'bg-[#f5e3c7]/60 border-[#d97757] text-[#141413]'
                    : log.level === 'WARN'
                    ? 'bg-[#e3dacc]/50 border-[#cccbc8] text-[#141413]'
                    : 'bg-[#f0eee6] border-[#cccbc8] text-[#141413]'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-[#87867f] mb-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-serif font-bold text-[#141413]">{log.serviceName}</span>
                    <span>{log.endpoint}</span>
                  </div>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="truncate text-[#141413]">{log.message}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
