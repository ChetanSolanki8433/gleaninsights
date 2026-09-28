import React, { useState } from 'react';
import {
  Network,
  Database,
  Globe,
  AlertTriangle,
  Zap,
  ArrowRight,
  Info,
} from 'lucide-react';
import { SimulationState } from '../services/rcaEngine';

interface DependencyGraphViewProps {
  state: SimulationState;
  onSelectService?: (serviceId: string) => void;
}

export const DependencyGraphView: React.FC<DependencyGraphViewProps> = ({
  state,
  onSelectService,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('order-service');

  const nodePositions: Record<string, { x: number; y: number; type: 'service' | 'database' | 'gateway'; label: string }> = {
    'user-service': { x: 180, y: 120, type: 'service', label: 'User Service' },
    'order-service': { x: 450, y: 220, type: 'service', label: 'Order Service (Orchestrator)' },
    'payment-service': { x: 720, y: 120, type: 'service', label: 'Payment Service' },
    'inventory-service': { x: 260, y: 380, type: 'service', label: 'Inventory Service' },
    'notification-service': { x: 640, y: 380, type: 'service', label: 'Notification Service' },
    'postgres-db': { x: 450, y: 520, type: 'database', label: 'PostgreSQL Database' },
    'ext-gateway': { x: 860, y: 240, type: 'gateway', label: 'Stripe/Visa Gateway Sim' },
  };

  const selectedService = state.services.find((s) => s.id === selectedNodeId);
  const incomingDeps = state.dependencies.filter((d) => d.targetServiceId === selectedNodeId);
  const outgoingDeps = state.dependencies.filter((d) => d.sourceServiceId === selectedNodeId);

  return (
    <div id="dependency-graph-view" className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-5">
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-xl bg-[#e3dacc] border border-[#cccbc8] flex items-center justify-center text-[#141413]">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-serif font-bold text-[#141413]">Microservice Dependency &amp; Causal Call Topology</h2>
            <p className="text-xs text-[#87867f] font-sans">
              Live directional HTTP &amp; database call graph with edge latency badges and cascade propagation tracking
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-4 text-xs font-sans">
          <div className="flex items-center space-x-1.5 text-[#141413]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4d7c71]" />
            <span>Nominal (&lt;50ms)</span>
          </div>
          <div className="flex items-center space-x-1.5 text-[#141413]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#87867f]" />
            <span>Degraded Edge</span>
          </div>
          <div className="flex items-center space-x-1.5 text-[#d97757]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#d97757]" />
            <span className="font-medium">Impacted Cascade</span>
          </div>
        </div>
      </div>

      {/* Causal Failure Propagation Path Banner (When Incident is Active) */}
      {state.activeIncident && (
        <div className="bg-[#f5e3c7] border border-[#cccbc8] rounded-[24px] p-5 space-y-2 text-[#141413]">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-serif font-bold uppercase tracking-wider text-[#d97757] flex items-center space-x-2">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Causal Failure Propagation Trail (Blast Radius: {state.activeIncident.affectedServices.length}/5 Services)</span>
            </h3>
            <span className="text-[11px] font-mono text-[#87867f]">Downstream Path</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="px-3 py-1.5 rounded-lg bg-[#faf9f5] border border-[#d97757] text-[#141413] text-xs font-mono font-bold flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-[#d97757]" />
              <span>{state.activeIncident.rootCauseService || state.activeIncident.serviceName} [ROOT CAUSE]</span>
            </div>
            {state.activeIncident.affectedServices
              .filter((s) => s !== (state.activeIncident?.rootCauseService || state.activeIncident?.serviceName))
              .map((svc, i) => (
                <React.Fragment key={i}>
                  <ArrowRight className="w-4 h-4 text-[#d97757]" />
                  <div className="px-3 py-1.5 rounded-lg bg-[#faf9f5] border border-[#cccbc8] text-[#141413] text-xs font-mono">
                    <span>{svc} [CASCADE LAG]</span>
                  </div>
                </React.Fragment>
              ))}
          </div>
        </div>
      )}

      {/* Main Interactive Stage: SVG Graph + Node Inspector Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SVG Graph Canvas */}
        <div className="lg:col-span-2 bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-4 overflow-hidden relative flex items-center justify-center min-h-[520px]">
          <svg
            viewBox="0 0 960 580"
            className="w-full h-full max-h-[540px] select-none"
          >
            <defs>
              <marker
                id="arrow-normal"
                viewBox="0 0 10 10"
                refX="24"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#87867f" />
              </marker>
              <marker
                id="arrow-impacted"
                viewBox="0 0 10 10"
                refX="24"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#d97757" />
              </marker>
              <marker
                id="arrow-slow"
                viewBox="0 0 10 10"
                refX="24"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#87867f" />
              </marker>
            </defs>

            {/* Render Dependency Edges */}
            {state.dependencies.map((dep) => {
              const src = nodePositions[dep.sourceServiceId];
              const tgt = nodePositions[dep.targetServiceId];
              if (!src || !tgt) return null;
              const isFailing = dep.status === 'failing';
              const isSlow = dep.status === 'slow';
              const isSelected =
                dep.sourceServiceId === selectedNodeId || dep.targetServiceId === selectedNodeId;

              const midX = (src.x + tgt.x) / 2;
              const midY = (src.y + tgt.y) / 2;

              return (
                <g key={dep.id} className="transition-all">
                  <line
                    x1={src.x}
                    y1={src.y}
                    x2={tgt.x}
                    y2={tgt.y}
                    stroke={isFailing ? '#d97757' : isSlow ? '#87867f' : isSelected ? '#141413' : '#cccbc8'}
                    strokeWidth={isFailing ? 2.5 : isSelected ? 2.2 : 1.5}
                    strokeDasharray={isFailing ? '6,4' : undefined}
                    markerEnd={isFailing ? 'url(#arrow-impacted)' : isSlow ? 'url(#arrow-slow)' : 'url(#arrow-normal)'}
                  />
                  {/* Latency badge on edge */}
                  <g transform={`translate(${midX}, ${midY})`}>
                    <rect
                      x="-30"
                      y="-11"
                      width="60"
                      height="22"
                      rx="6"
                      fill={isFailing ? '#f5e3c7' : '#faf9f5'}
                      stroke={isFailing ? '#d97757' : '#cccbc8'}
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill="#141413"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="500"
                    >
                      {dep.avgLatencyMs}ms
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Render Nodes */}
            {Object.entries(nodePositions).map(([id, pos]) => {
              const srv = state.services.find((s) => s.id === id);
              const isSelected = selectedNodeId === id;
              const isDatabase = pos.type === 'database';
              const isGateway = pos.type === 'gateway';
              const status = srv ? srv.status : 'healthy';
              const isDegraded = status === 'degraded' || status === 'critical' || status === 'crashed';

              return (
                <g
                  key={id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onClick={() => {
                    setSelectedNodeId(id);
                    if (onSelectService && srv) onSelectService(id);
                  }}
                  className="cursor-pointer group"
                >
                  {/* Selection Indicator Ring */}
                  {isSelected && (
                    <circle
                      r="39"
                      fill="none"
                      stroke="#141413"
                      strokeWidth="1.5"
                      strokeDasharray="4,3"
                    />
                  )}

                  {/* Node Circle */}
                  <circle
                    r="32"
                    fill={
                      status === 'crashed' || status === 'critical'
                        ? '#f5e3c7'
                        : isDegraded
                        ? '#e3dacc'
                        : isDatabase || isGateway
                        ? '#f0eee6'
                        : '#faf9f5'
                    }
                    stroke={
                      status === 'crashed' || status === 'critical'
                        ? '#d97757'
                        : isSelected
                        ? '#141413'
                        : '#cccbc8'
                    }
                    strokeWidth={isDegraded || isSelected ? 2 : 1}
                    className="transition-all group-hover:scale-105"
                  />

                  {/* Node Icon */}
                  <g transform="translate(-10, -10)">
                    {isDatabase ? (
                      <Database className="w-5 h-5 text-[#141413]" />
                    ) : isGateway ? (
                      <Globe className="w-5 h-5 text-[#141413]" />
                    ) : isDegraded ? (
                      <AlertTriangle className="w-5 h-5 text-[#d97757]" />
                    ) : (
                      <Network className="w-5 h-5 text-[#141413]" />
                    )}
                  </g>

                  {/* Node Label Below */}
                  <text
                    x="0"
                    y="48"
                    textAnchor="middle"
                    fill="#141413"
                    fontSize="11"
                    fontFamily="serif"
                    fontWeight={isSelected ? '700' : '600'}
                  >
                    {pos.label.split(' ')[0]} {pos.label.split(' ')[1] || ''}
                  </text>

                  {/* Subtitle / Metrics */}
                  {srv && (
                    <text
                      x="0"
                      y="62"
                      textAnchor="middle"
                      fill={srv.currentMetrics.cpuPercent > 80 ? '#d97757' : '#87867f'}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="500"
                    >
                      CPU: {srv.currentMetrics.cpuPercent.toFixed(2)}% · p95: {srv.currentMetrics.latencyP95Ms.toFixed(2)}ms
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected Node Details Drawer */}
        <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-6 space-y-4 flex flex-col justify-between text-[#141413] max-h-[580px] overflow-y-auto subtle-scroll">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#cccbc8]/60">
              <div>
                <span className="text-[11px] text-[#87867f] uppercase tracking-wider font-sans font-medium">
                  Node Inspector
                </span>
                <h3 className="text-base font-serif font-bold text-[#141413] mt-0.5">
                  {nodePositions[selectedNodeId]?.label || selectedNodeId}
                </h3>
              </div>
              {selectedService && (
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-md font-mono font-medium ${
                    selectedService.status === 'healthy'
                      ? 'bg-[#e3dacc] text-[#141413] border border-[#cccbc8]'
                      : 'bg-[#d97757] text-[#ffffff]'
                  }`}
                >
                  {selectedService.status.toUpperCase()}
                </span>
              )}
            </div>

            {selectedService ? (
              <div className="mt-4 space-y-4 text-xs font-sans">
                <p className="text-[#141413] leading-relaxed font-serif text-[13px]">
                  {selectedService.description}
                </p>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-2 gap-2.5 bg-[#f0eee6] p-3.5 rounded-xl border border-[#cccbc8]">
                  <div>
                    <span className="text-[11px] text-[#87867f] font-mono">CPU Load:</span>
                    <div className="font-mono font-bold text-[#141413]">
                      {selectedService.currentMetrics.cpuPercent.toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#87867f] font-mono">Memory Heap:</span>
                    <div className="font-mono font-bold text-[#141413]">
                      {selectedService.currentMetrics.memoryMb.toFixed(2)} MB
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#87867f] font-mono">Latency p95:</span>
                    <div className="font-mono font-bold text-[#141413]">
                      {selectedService.currentMetrics.latencyP95Ms.toFixed(2)} ms
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#87867f] font-mono">Error Rate:</span>
                    <div className="font-mono font-bold text-[#141413]">
                      {selectedService.currentMetrics.errorRatePercent.toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* Call Dependencies */}
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-serif font-bold text-[#141413] uppercase tracking-wider">
                    Outbound Calls ({outgoingDeps.length})
                  </span>
                  <div className="space-y-1.5">
                    {outgoingDeps.length === 0 ? (
                      <span className="text-[#87867f] text-[11px] font-mono">No outbound service calls</span>
                    ) : (
                      outgoingDeps.map((dep) => (
                        <div
                          key={dep.id}
                          className="p-2.5 bg-[#f0eee6] rounded-lg border border-[#cccbc8] flex items-center justify-between text-[11px]"
                        >
                          <span className="text-[#141413] font-medium">{dep.targetName}</span>
                          <span className={`font-mono ${dep.isImpacted ? 'text-[#d97757] font-bold' : 'text-[#87867f]'}`}>
                            {dep.avgLatencyMs}ms ({dep.callRatePerMin} rpm)
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <span className="text-xs font-serif font-bold text-[#141413] uppercase tracking-wider">
                    Inbound Callers ({incomingDeps.length})
                  </span>
                  <div className="space-y-1.5">
                    {incomingDeps.length === 0 ? (
                      <span className="text-[#87867f] text-[11px] font-mono">Direct ingress / leaf node</span>
                    ) : (
                      incomingDeps.map((dep) => (
                        <div
                          key={dep.id}
                          className="p-2.5 bg-[#f0eee6] rounded-lg border border-[#cccbc8] flex items-center justify-between text-[11px]"
                        >
                          <span className="text-[#141413] font-medium">{dep.sourceName}</span>
                          <span className={`font-mono ${dep.isImpacted ? 'text-[#d97757] font-bold' : 'text-[#87867f]'}`}>
                            {dep.avgLatencyMs}ms
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 text-xs text-[#87867f] space-y-2 font-sans">
                <p>PostgreSQL Relational DB shared across microservices with distinct logical schemas.</p>
                <div className="p-3.5 bg-[#f0eee6] rounded-xl border border-[#cccbc8] font-mono text-[11px] space-y-1 text-[#141413]">
                  <div>Port: 5432</div>
                  <div>Pool Headroom: 80-100 max</div>
                  <div>Avg Query: 14ms (nominal)</div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[#cccbc8]/60 text-[#87867f] text-[11px] flex items-center space-x-1 font-mono">
            <Info className="w-3.5 h-3.5 text-[#87867f]" />
            <span>Click any node to inspect call graph edges &amp; live metrics</span>
          </div>
        </div>
      </div>
    </div>
  );
};
