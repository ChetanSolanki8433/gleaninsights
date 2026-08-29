import React, { useState } from 'react';
import {
  Server,
  Cpu,
  Activity,
  Database,
  Layers,
  ArrowRight,
  Globe,
  Clock,
  Shield,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { SimulationState } from '../services/rcaEngine';
import { Microservice } from '../types';

interface ServicesViewProps {
  state: SimulationState;
  onSelectService?: (serviceId: string) => void;
}

export const ServicesView: React.FC<ServicesViewProps> = ({
  state,
  onSelectService,
}) => {
  const [selectedServiceId, setSelectedServiceId] = useState<string>(state.services[0].id);

  const selectedService = state.services.find((s) => s.id === selectedServiceId) || state.services[0];

  return (
    <div id="services-catalog-view" className="space-y-6">
      {/* Header Banner in Sheet Metal Plate */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-[#888B90]/30 rounded-xl p-4 shadow-lg shadow-black/20">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#888B90]/30 to-slate-800 border border-[#888B90]/50 flex items-center justify-center text-[#888B90]">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Microservice Environment Catalog</h2>
            <p className="text-xs text-[#888B90] font-mono">
              5 Containerized services with isolated endpoints, databases &amp; live telemetry agents
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-[#888B90]">
          <span>Active Pods: <strong className="text-white font-bold">15 Replicas</strong></span>
        </div>
      </div>

      {/* Services Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left List of Services */}
        <div className="space-y-3">
          {state.services.map((service) => {
            const isSelected = selectedServiceId === service.id;
            const isHealthy = service.status === 'healthy';
            const m = service.currentMetrics;

            return (
              <div
                key={service.id}
                id={`service-nav-card-${service.id}`}
                onClick={() => setSelectedServiceId(service.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-slate-800 border-[#888B90] shadow-md ring-1 ring-[#888B90]/50'
                    : 'bg-slate-900 border-[#888B90]/30 hover:border-[#888B90]/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isHealthy ? 'bg-emerald-400' : 'bg-rose-500 animate-pulse'
                      }`}
                    />
                    <h3 className="text-sm font-bold text-white font-mono">{service.name}</h3>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      isHealthy
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}
                  >
                    {service.status.toUpperCase()}
                  </span>
                </div>

                <div className="mt-2 text-xs text-[#888B90] font-mono flex items-center justify-between">
                  <span>{service.framework}</span>
                  <span>{service.version}</span>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#888B90]/20 grid grid-cols-3 gap-2 text-[11px] font-mono text-[#888B90]">
                  <div>
                    <span>CPU: </span>
                    <strong className={m.cpuPercent > 80 ? 'text-rose-400' : 'text-white'}>
                      {m.cpuPercent.toFixed(0)}%
                    </strong>
                  </div>
                  <div>
                    <span>p95: </span>
                    <strong className={m.latencyP95Ms > 500 ? 'text-rose-400' : 'text-white'}>
                      {m.latencyP95Ms}ms
                    </strong>
                  </div>
                  <div>
                    <span>Err: </span>
                    <strong className={m.errorRatePercent > 2 ? 'text-rose-400' : 'text-white'}>
                      {m.errorRatePercent.toFixed(1)}%
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Details Panel */}
        <div className="lg:col-span-2 bg-slate-900 border border-[#888B90]/30 rounded-xl p-6 space-y-6 shadow-lg shadow-black/20">
          {/* Service Title & Specs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#888B90]/20">
            <div>
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-bold text-white">{selectedService.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-[#E4E5E8] font-mono border border-[#888B90]/30 font-bold">
                  {selectedService.version}
                </span>
              </div>
              <p className="text-xs text-[#D0D2D6] mt-1 leading-relaxed max-w-xl">
                {selectedService.description}
              </p>
            </div>

            <div className="text-right font-mono text-xs text-[#888B90] space-y-0.5 shrink-0">
              <div>Uptime: {(selectedService.uptimeSeconds / 3600).toFixed(1)} hrs</div>
              <div>Instances: {selectedService.instanceCount} pods</div>
            </div>
          </div>

          {/* Architecture & Tech Specs in Sheet Metal Tile Boxes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 bg-slate-950 rounded-lg border border-[#888B90]/25 shadow-inner">
              <span className="text-[11px] text-[#888B90] block mb-1">Runtime / Language</span>
              <span className="font-bold text-white">{selectedService.language}</span>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-[#888B90]/25 shadow-inner">
              <span className="text-[11px] text-[#888B90] block mb-1">Web Framework</span>
              <span className="font-bold text-white">{selectedService.framework}</span>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-[#888B90]/25 shadow-inner">
              <span className="text-[11px] text-[#888B90] block mb-1">Storage Layer</span>
              <span className="font-bold text-white">{selectedService.database}</span>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-[#888B90]/25 shadow-inner">
              <span className="text-[11px] text-[#888B90] block mb-1">Crash Restarts</span>
              <span className={`font-bold ${selectedService.currentMetrics.restartCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {selectedService.currentMetrics.restartCount}
              </span>
            </div>
          </div>

          {/* Current Live Telemetry Panel */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#888B90] uppercase tracking-wider font-mono">
              Real-time Ingested Metrics
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-950 rounded-lg border border-[#888B90]/25 shadow-inner">
                <span className="text-[11px] text-[#888B90] font-mono">CPU Load</span>
                <div className={`text-base font-bold font-mono mt-1 ${selectedService.currentMetrics.cpuPercent > 80 ? 'text-rose-400' : 'text-white'}`}>
                  {selectedService.currentMetrics.cpuPercent.toFixed(1)}%
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-[#888B90]/25 shadow-inner">
                <span className="text-[11px] text-[#888B90] font-mono">Memory Occupancy</span>
                <div className="text-base font-bold font-mono mt-1 text-white">
                  {selectedService.currentMetrics.memoryMb} / {selectedService.currentMetrics.memoryMaxMb || 1024} MB
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-[#888B90]/25 shadow-inner">
                <span className="text-[11px] text-[#888B90] font-mono">Throughput</span>
                <div className="text-base font-bold font-mono mt-1 text-white">
                  {selectedService.currentMetrics.requestRate} req/s
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-[#888B90]/25 shadow-inner">
                <span className="text-[11px] text-[#888B90] font-mono">Latency (p50/p95/p99)</span>
                <div className="text-xs font-bold font-mono mt-1 text-white">
                  {selectedService.currentMetrics.latencyP50Ms} / {selectedService.currentMetrics.latencyP95Ms} / {selectedService.currentMetrics.latencyP99Ms} ms
                </div>
              </div>
            </div>
          </div>

          {/* Service Endpoints Registry */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#888B90] uppercase tracking-wider font-mono">
              Exposed HTTP / RPC Endpoints ({selectedService.endpoints.length})
            </h4>

            <div className="divide-y divide-[#888B90]/15 border border-[#888B90]/30 rounded-lg overflow-hidden font-mono text-xs shadow-inner">
              {selectedService.endpoints.map((ep, idx) => (
                <div key={idx} className="p-3 bg-slate-950 flex items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        ep.method === 'POST' ? 'bg-slate-800 text-[#E4E5E8] border border-[#888B90]/40' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {ep.method}
                    </span>
                    <span className="text-[#E4E5E8] font-bold">{ep.path}</span>
                    <span className="text-[#888B90] text-[11px] font-sans hidden sm:inline">
                      {ep.description}
                    </span>
                  </div>

                  <span className="text-[#888B90] text-[11px] shrink-0 font-bold">
                    avg: {ep.avgLatencyMs}ms
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
