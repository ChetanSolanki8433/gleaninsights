import React, { useState } from 'react';
import {
  Network,
  Database,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { SimulationState } from '../services/rcaEngine';
import { Microservice, ServiceDependency } from '../types';

interface DependencyGraphViewProps {
  state: SimulationState;
  onSelectService?: (serviceId: string) => void;
}

export const DependencyGraphView: React.FC<DependencyGraphViewProps> = ({
  state,
  onSelectService,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('order-service');

  // Node coordinates on a balanced, readable canvas layout
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Microservice Dependency & Causal Call Topology</h2>
            <p className="text-xs text-slate-500 font-mono">
              Live directional HTTP & DB call graph with edge latency badges and cascade path tracking
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-4 text-xs font-mono">
          <div className="flex items-center space-x-1.5 text-emerald-600">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
            <span>Nominal (&lt;50ms)</span>
          </div>
          <div className="flex items-center space-x-1.5 text-amber-600">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Degraded Edge</span>
          </div>
          <div className="flex items-center space-x-1.5 text-rose-600">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span>Impacted / Cascade Chain</span>
          </div>
        </div>
      </div>

      {/* Causal Failure Propagation Path Banner (When Incident is Active) */}
      {state.activeIncident && (
        <div className="bg-white border-2 border-rose-300 rounded-xl p-4 space-y-2 shadow-xs text-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 flex items-center space-x-2 font-mono">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Causal Failure Propagation Trail (Graph Blast Radius: {state.activeIncident.affectedServices.length}/5 Services)</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-500">Downstream Blast Radius</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="px-3 py-1.5 rounded-lg bg-rose-100 border border-rose-300 text-rose-800 text-xs font-bold font-mono flex items-center space-x-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>{state.activeIncident.rootCauseService || state.activeIncident.serviceName} [ROOT CAUSE]</span>
            </div>

            {state.activeIncident.affectedServices
              .filter((s) => s !== (state.activeIncident?.rootCauseService || state.activeIncident?.serviceName))
              .map((svc, i) => (
                <React.Fragment key={i}>
                  <ArrowRight className="w-4 h-4 text-rose-500 animate-pulse" />
                  <div className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-800 text-xs font-mono font-semibold">
                    <span>{svc} [CASCADING LATENCY]</span>
                  </div>
                </React.Fragment>
              ))}
          </div>
        </div>
      )}

      {/* Main Interactive Stage: SVG Graph + Node Inspector Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SVG Graph Canvas */}
        <div className="lg:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-4 overflow-hidden relative flex items-center justify-center min-h-[520px] shadow-xs">
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
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#94A3B8" />
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
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#f43f5e" />
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
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
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

              // Calculate edge midpoint for badge
              const midX = (src.x + tgt.x) / 2;
              const midY = (src.y + tgt.y) / 2;

              return (
                <g key={dep.id} className="transition-all">
                  {/* Base Line */}
                  <line
                    x1={src.x}
                    y1={src.y}
                    x2={tgt.x}
                    y2={tgt.y}
                    stroke={isFailing ? '#f43f5e' : isSlow ? '#f59e0b' : isSelected ? '#1e293b' : '#cbd5e1'}
                    strokeWidth={isFailing ? 2.5 : isSelected ? 2.2 : 1.5}
                    strokeDasharray={isFailing ? '6,4' : undefined}
                    markerEnd={isFailing ? 'url(#arrow-impacted)' : isSlow ? 'url(#arrow-slow)' : 'url(#arrow-normal)'}
                    className={isFailing ? 'animate-pulse' : ''}
                  />

                  {/* Latency badge on edge */}
                  <g transform={`translate(${midX}, ${midY})`}>
                    <rect
                      x="-32"
                      y="-11"
                      width="64"
                      height="22"
                      rx="4"
                      fill={isFailing ? '#ffe4e6' : isSlow ? '#fef3c7' : '#ffffff'}
                      stroke={isFailing ? '#f43f5e' : isSlow ? '#f59e0b' : '#cbd5e1'}
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill={isFailing ? '#9f1239' : isSlow ? '#92400e' : '#334155'}
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="600"
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
              const isService = pos.type === 'service';
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
                  {/* Outer selection ring */}
                  {isSelected && (
                    <circle
                      r="40"
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth="2"
                      strokeDasharray="4,3"
                      className="animate-spin"
                      style={{ animationDuration: '8s' }}
                    />
                  )}

                  {/* Node Circle */}
                  <circle
                    r="32"
                    fill={
                      status === 'crashed'
                        ? '#ffe4e6'
                        : status === 'critical'
                        ? '#fff1f2'
                        : isDegraded
                        ? '#fef3c7'
                        : isDatabase
                        ? '#f1f5f9'
                        : isGateway
                        ? '#f1f5f9'
                        : '#ffffff'
                    }
                    stroke={
                      status === 'crashed'
                        ? '#f43f5e'
                        : status === 'critical'
                        ? '#e11d48'
                        : isDegraded
                        ? '#f59e0b'
                        : isDatabase
                        ? '#94a3b8'
                        : isGateway
                        ? '#94a3b8'
                        : isSelected
                        ? '#0f172a'
                        : '#cbd5e1'
                    }
                    strokeWidth={isDegraded || isSelected ? 2.5 : 1.5}
                    className="transition-all group-hover:scale-105 shadow-xs"
                  />

                  {/* Node Icon */}
                  <g transform="translate(-10, -10)">
                    {isDatabase ? (
                      <Database className="w-5 h-5 text-slate-700" />
                    ) : isGateway ? (
                      <Globe className="w-5 h-5 text-slate-700" />
                    ) : isDegraded ? (
                      <AlertTriangle className="w-5 h-5 text-rose-600" />
                    ) : (
                      <Network className="w-5 h-5 text-emerald-600" />
                    )}
                  </g>

                  {/* Node Label Below */}
                  <text
                    x="0"
                    y="48"
                    textAnchor="middle"
                    fill={isSelected ? '#0f172a' : '#334155'}
                    fontSize="11"
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
                      fill={srv.currentMetrics.cpuPercent > 80 ? '#f43f5e' : '#64748b'}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="500"
                    >
                      CPU: {srv.currentMetrics.cpuPercent.toFixed(0)}% • p95: {srv.currentMetrics.latencyP95Ms}ms
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected Node Details Drawer */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 flex flex-col justify-between shadow-xs text-slate-800">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider font-bold font-mono">
                  Node Inspector
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {nodePositions[selectedNodeId]?.label || selectedNodeId}
                </h3>
              </div>
              {selectedService && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold font-mono ${
                    selectedService.status === 'healthy'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {selectedService.status.toUpperCase()}
                </span>
              )}
            </div>

            {selectedService ? (
              <div className="mt-4 space-y-3.5 text-xs">
                <p className="text-slate-600 leading-relaxed">
                  {selectedService.description}
                </p>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-[11px] text-slate-500 font-mono">CPU Load:</span>
                    <div className="font-mono font-bold text-slate-900">
                      {selectedService.currentMetrics.cpuPercent.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 font-mono">Memory Heap:</span>
                    <div className="font-mono font-bold text-slate-900">
                      {selectedService.currentMetrics.memoryMb} MB
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 font-mono">Latency p95:</span>
                    <div className="font-mono font-bold text-slate-900">
                      {selectedService.currentMetrics.latencyP95Ms} ms
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 font-mono">Error Rate:</span>
                    <div className="font-mono font-bold text-slate-900">
                      {selectedService.currentMetrics.errorRatePercent.toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* Call Dependencies */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">Outbound Dependencies ({outgoingDeps.length})</span>
                  <div className="space-y-1.5">
                    {outgoingDeps.length === 0 ? (
                      <span className="text-slate-400 text-[11px] font-mono">No outbound service calls</span>
                    ) : (
                      outgoingDeps.map((dep) => (
                        <div
                          key={dep.id}
                          className="p-2 bg-slate-50 rounded border border-slate-200 flex items-center justify-between text-[11px]"
                        >
                          <span className="text-slate-800 font-medium">{dep.targetName}</span>
                          <span className={`font-mono font-semibold ${dep.isImpacted ? 'text-rose-600' : 'text-slate-500'}`}>
                            {dep.avgLatencyMs}ms ({dep.callRatePerMin} rpm)
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">Inbound Callers ({incomingDeps.length})</span>
                  <div className="space-y-1.5">
                    {incomingDeps.length === 0 ? (
                      <span className="text-slate-400 text-[11px] font-mono">Direct ingress / leaf node</span>
                    ) : (
                      incomingDeps.map((dep) => (
                        <div
                          key={dep.id}
                          className="p-2 bg-slate-50 rounded border border-slate-200 flex items-center justify-between text-[11px]"
                        >
                          <span className="text-slate-800 font-medium">{dep.sourceName}</span>
                          <span className={`font-mono font-semibold ${dep.isImpacted ? 'text-rose-600' : 'text-slate-500'}`}>
                            {dep.avgLatencyMs}ms
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 text-xs text-slate-500 space-y-2">
                <p>PostgreSQL Relational DB shared across microservices with distinct logical schemas.</p>
                <div className="p-3 bg-slate-50 rounded border border-slate-200 font-mono text-[11px]">
                  <div>Port: 5432</div>
                  <div>Pool Headroom: 80-100 max</div>
                  <div>Avg Query: 14ms (nominal)</div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 text-slate-500 text-[11px] flex items-center space-x-1 font-mono">
            <Info className="w-3.5 h-3.5" />
            <span>Click any node to inspect directional call edges and metrics</span>
          </div>
        </div>
      </div>
    </div>
  );
};
