import React, { useState } from 'react';
import {
  Server,
} from 'lucide-react';
import { SimulationState } from '../services/rcaEngine';

interface ServicesViewProps {
  state: SimulationState;
  onSelectService?: (serviceId: string) => void;
}

export const ServicesView: React.FC<ServicesViewProps> = ({
  state,
}) => {
  const [selectedServiceId, setSelectedServiceId] = useState<string>(state.services[0].id);
  const selectedService = state.services.find((s) => s.id === selectedServiceId) || state.services[0];

  return (
    <div id="services-catalog-view" className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-5">
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-xl bg-[#e3dacc] border border-[#cccbc8] flex items-center justify-center text-[#141413]">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-serif font-bold text-[#141413]">Microservice Environment Catalog</h2>
            <p className="text-xs text-[#87867f] font-sans">
              5 Containerized services with isolated endpoints, databases &amp; live telemetry agents
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono text-[#87867f]">
          <span>Cluster Active: <strong className="text-[#141413]">15 Pod Replicas</strong></span>
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
                className={`p-4 rounded-[24px] border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#e3dacc]/40 border-[#141413]'
                    : 'bg-[#faf9f5] border-[#cccbc8] hover:bg-[#f0eee6]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isHealthy ? 'bg-[#4d7c71]' : 'bg-[#d97757]'
                      }`}
                    />
                    <h3 className="text-sm font-serif font-bold text-[#141413]">{service.name}</h3>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-medium ${
                      isHealthy
                        ? 'bg-[#e3dacc] text-[#141413] border border-[#cccbc8]'
                        : 'bg-[#d97757] text-[#ffffff]'
                    }`}
                  >
                    {service.status.toUpperCase()}
                  </span>
                </div>
                <div className="mt-2 text-xs text-[#87867f] font-mono flex items-center justify-between">
                  <span>{service.framework}</span>
                  <span>{service.version}</span>
                </div>
                <div className="mt-3 pt-2.5 border-t border-[#cccbc8]/60 grid grid-cols-3 gap-2 text-[11px] font-mono text-[#87867f]">
                  <div>
                    <span>CPU: </span>
                    <strong className={m.cpuPercent > 80 ? 'text-[#d97757]' : 'text-[#141413]'}>
                      {m.cpuPercent.toFixed(2)}%
                    </strong>
                  </div>
                  <div>
                    <span>p95: </span>
                    <strong className={m.latencyP95Ms > 500 ? 'text-[#d97757]' : 'text-[#141413]'}>
                      {m.latencyP95Ms.toFixed(2)}ms
                    </strong>
                  </div>
                  <div>
                    <span>Err: </span>
                    <strong className={m.errorRatePercent > 2 ? 'text-[#d97757]' : 'text-[#141413]'}>
                      {m.errorRatePercent.toFixed(2)}%
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Details Panel */}
        <div className="lg:col-span-2 bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-6 space-y-6 text-[#141413]">
          {/* Service Title & Specs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#cccbc8]/60">
            <div>
              <div className="flex items-center space-x-3">
                <h3 className="text-xl font-serif font-bold text-[#141413]">{selectedService.name}</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-md bg-[#e3dacc] text-[#141413] font-mono border border-[#cccbc8]">
                  {selectedService.version}
                </span>
              </div>
              <p className="text-xs text-[#141413] mt-1.5 leading-relaxed font-serif text-[13px] max-w-xl">
                {selectedService.description}
              </p>
            </div>
            <div className="text-right font-mono text-xs text-[#87867f] space-y-0.5 shrink-0">
              <div>Uptime: {(selectedService.uptimeSeconds / 3600).toFixed(2)} hrs</div>
              <div>Instances: {selectedService.instanceCount} pods</div>
            </div>
          </div>

          {/* Architecture & Tech Specs in Paper Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3.5 bg-[#f0eee6] rounded-xl border border-[#cccbc8]">
              <span className="text-[11px] text-[#87867f] block mb-1">Runtime / Language</span>
              <span className="font-bold text-[#141413]">{selectedService.language}</span>
            </div>
            <div className="p-3.5 bg-[#f0eee6] rounded-xl border border-[#cccbc8]">
              <span className="text-[11px] text-[#87867f] block mb-1">Web Framework</span>
              <span className="font-bold text-[#141413]">{selectedService.framework}</span>
            </div>
            <div className="p-3.5 bg-[#f0eee6] rounded-xl border border-[#cccbc8]">
              <span className="text-[11px] text-[#87867f] block mb-1">Storage Layer</span>
              <span className="font-bold text-[#141413]">{selectedService.database}</span>
            </div>
            <div className="p-3.5 bg-[#f0eee6] rounded-xl border border-[#cccbc8]">
              <span className="text-[11px] text-[#87867f] block mb-1">Crash Restarts</span>
              <span className={`font-bold ${selectedService.currentMetrics.restartCount > 0 ? 'text-[#d97757]' : 'text-[#4d7c71]'}`}>
                {selectedService.currentMetrics.restartCount}
              </span>
            </div>
          </div>

          {/* Current Live Telemetry Panel */}
          <div className="space-y-3">
            <h4 className="text-xs font-serif font-bold text-[#87867f] uppercase tracking-wider">
              Real-time Ingested Metrics
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-[#f0eee6] rounded-xl border border-[#cccbc8]">
                <span className="text-[11px] text-[#87867f] font-mono">CPU Load</span>
                <div className={`text-base font-bold font-mono mt-1 ${selectedService.currentMetrics.cpuPercent > 80 ? 'text-[#d97757]' : 'text-[#141413]'}`}>
                  {selectedService.currentMetrics.cpuPercent.toFixed(2)}%
                </div>
              </div>
              <div className="p-3.5 bg-[#f0eee6] rounded-xl border border-[#cccbc8]">
                <span className="text-[11px] text-[#87867f] font-mono">Memory Occupancy</span>
                <div className="text-base font-bold font-mono mt-1 text-[#141413]">
                  {selectedService.currentMetrics.memoryMb.toFixed(2)} / {(selectedService.currentMetrics.memoryMaxMb || 1024).toFixed(2)} MB
                </div>
              </div>
              <div className="p-3.5 bg-[#f0eee6] rounded-xl border border-[#cccbc8]">
                <span className="text-[11px] text-[#87867f] font-mono">Throughput</span>
                <div className="text-base font-bold font-mono mt-1 text-[#141413]">
                  {selectedService.currentMetrics.requestRate.toFixed(2)} req/s
                </div>
              </div>
              <div className="p-3.5 bg-[#f0eee6] rounded-xl border border-[#cccbc8]">
                <span className="text-[11px] text-[#87867f] font-mono">Latency (p50/p95/p99)</span>
                <div className="text-xs font-bold font-mono mt-1 text-[#141413]">
                  {selectedService.currentMetrics.latencyP50Ms.toFixed(2)} / {selectedService.currentMetrics.latencyP95Ms.toFixed(2)} / {selectedService.currentMetrics.latencyP99Ms.toFixed(2)} ms
                </div>
              </div>
            </div>
          </div>

          {/* Service Endpoints Registry */}
          <div className="space-y-3">
            <h4 className="text-xs font-serif font-bold text-[#87867f] uppercase tracking-wider">
              Exposed HTTP / RPC Endpoints ({selectedService.endpoints.length})
            </h4>
            <div className="divide-y divide-[#cccbc8]/50 border border-[#cccbc8] rounded-xl overflow-hidden font-mono text-xs">
              {selectedService.endpoints.map((ep, idx) => (
                <div key={idx} className="p-3.5 bg-[#f0eee6] flex items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        ep.method === 'POST' ? 'bg-[#141413] text-[#faf9f5]' : 'bg-[#e3dacc] text-[#141413] border border-[#cccbc8]'
                      }`}
                    >
                      {ep.method}
                    </span>
                    <span className="text-[#141413] font-bold">{ep.path}</span>
                    <span className="text-[#87867f] text-[11px] font-sans hidden sm:inline">
                      {ep.description}
                    </span>
                  </div>
                  <span className="text-[#87867f] text-[11px] shrink-0 font-bold">
                    avg: {ep.avgLatencyMs.toFixed(2)}ms
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
