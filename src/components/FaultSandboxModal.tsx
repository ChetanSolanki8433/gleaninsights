import React, { useState } from 'react';
import {
  X,
  Zap,
  RotateCcw,
  CheckCircle2,
  Database,
  Cpu,
  Globe,
  Radio,
} from 'lucide-react';
import { ScenarioType } from '../types';

interface FaultSandboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentScenario: ScenarioType;
  onInjectFault: (scenario: ScenarioType) => void;
  onResetNominal: () => void;
}

export const FaultSandboxModal: React.FC<FaultSandboxModalProps> = ({
  isOpen,
  onClose,
  currentScenario,
  onInjectFault,
  onResetNominal,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>(currentScenario);

  if (!isOpen) return null;

  const scenarios: Array<{
    id: ScenarioType;
    title: string;
    service: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    symptoms: string[];
    cascadeEffect: string;
  }> = [
    {
      id: 'db_connection_exhaustion',
      title: 'Postgres Connection Pool Exhaustion',
      service: 'Payment Service',
      description:
        'A leaked connection inside the transaction handler steadily exhausts all 100 pool connections, blocking new checkout queries.',
      icon: Database,
      symptoms: ['DB Connections hit 98/100', 'Payment latency rises to 2,800ms', 'Active transactions block'],
      cascadeEffect: 'Order Service encounters 504 Gateway Timeouts on POST /orders/checkout.',
    },
    {
      id: 'memory_leak_user',
      title: 'JVM / Heap Memory Leak & OOM',
      service: 'User Service',
      description:
        'Session cache map fails to evict stale JWT tokens, driving heap allocation to 950MB+ and initiating aggressive GC pause loops.',
      icon: Radio,
      symptoms: ['Memory reaches 940MB', 'Minor GC pauses exceed 1,400ms', 'Thread starvation occurs'],
      cascadeEffect: 'User authentication slows down, causing ingress gateway queue pileups.',
    },
    {
      id: 'cpu_saturation_order',
      title: 'High CPU Saturation & Serialization Overhead',
      service: 'Order Service',
      description:
        'Unbounded batch serialization loop causes severe CPU saturation (96%), latency spike, and order timeouts.',
      icon: Cpu,
      symptoms: ['CPU spikes to 96%', 'Order queue backlog > 450', 'Response latency hits 1,400ms'],
      cascadeEffect: 'Order Service item reservations experience cascaded timeout retries.',
    },
    {
      id: 'slow_payment_gateway',
      title: 'Third-Party Gateway Timeout Cascade',
      service: 'Payment Service (External Gateway)',
      description:
        'Simulated latency degradation and socket timeouts on upstream banking network, cascading to callers due to missing circuit breaker.',
      icon: Globe,
      symptoms: ['Outbound HTTP latency > 3,200ms', 'HTTP 502/504 error burst', 'Thread pool exhaustion'],
      cascadeEffect: 'Immediate failure of checkout workflows across customer sessions.',
    },
    {
      id: 'normal',
      title: 'Nominal Baseline Operating State',
      service: 'All 5 Services',
      description:
        'Healthy microservice cluster with balanced synthetic load, p95 latency under 50ms, and zero active alerts.',
      icon: CheckCircle2,
      symptoms: ['Latency < 45ms', 'CPU < 35%', 'Error rate 0.00%'],
      cascadeEffect: 'Clean cluster slate; all health probes return HTTP 200 OK.',
    },
  ];

  const handleApply = () => {
    if (selectedScenario === 'normal') {
      onResetNominal();
    } else {
      onInjectFault(selectedScenario);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141413]/40 backdrop-blur-xs">
      <div
        id="fault-sandbox-modal"
        className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] max-w-2xl w-full p-6 space-y-5 relative max-h-[90vh] overflow-y-auto subtle-scroll"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#cccbc8]/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#f5e3c7] border border-[#d97757] flex items-center justify-center text-[#d97757]">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-[#141413]">Fault Injection Sandbox</h3>
              <p className="text-xs text-[#87867f] font-sans">
                Simulate realistic production failures across microservices to evaluate RCA &amp; recovery
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#87867f] hover:text-[#141413] rounded-xl hover:bg-[#e3dacc] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scenarios Radio List */}
        <div className="space-y-3">
          {scenarios.map((sc) => {
            const isSelected = selectedScenario === sc.id;
            const Icon = sc.icon;
            const isNormal = sc.id === 'normal';

            return (
              <div
                key={sc.id}
                id={`scenario-option-${sc.id}`}
                onClick={() => setSelectedScenario(sc.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? isNormal
                      ? 'bg-[#e3dacc]/40 border-[#141413]'
                      : 'bg-[#f5e3c7]/50 border-[#d97757]'
                    : 'bg-[#f0eee6] border-[#cccbc8] hover:bg-[#e3dacc]/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <div
                      className={`p-2 rounded-lg mt-0.5 border ${
                        isSelected
                          ? isNormal
                            ? 'bg-[#faf9f5] border-[#141413] text-[#141413]'
                            : 'bg-[#faf9f5] border-[#d97757] text-[#d97757]'
                          : 'bg-[#faf9f5] border-[#cccbc8] text-[#87867f]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-serif font-bold text-[#141413]">{sc.title}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#faf9f5] border border-[#cccbc8] font-mono text-[#87867f]">
                          {sc.service}
                        </span>
                      </div>
                      <p className="text-xs text-[#141413] mt-1 leading-relaxed font-serif text-[12px]">
                        {sc.description}
                      </p>
                      {!isNormal && (
                        <div className="mt-2 text-[11px] text-[#87867f] font-mono">
                          <strong className="text-[#141413]">Cascade blast radius:</strong> {sc.cascadeEffect}
                        </div>
                      )}
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="faultScenario"
                    checked={isSelected}
                    onChange={() => setSelectedScenario(sc.id)}
                    className="mt-1 accent-[#d97757]"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#cccbc8]/60">
          <button
            onClick={() => {
              onResetNominal();
              onClose();
            }}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs text-[#87867f] hover:text-[#141413] font-mono hover:bg-[#e3dacc] rounded-xl transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Nominal</span>
          </button>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-sans font-medium text-[#141413] hover:bg-[#e3dacc] rounded-xl transition-colors border border-[#cccbc8]"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className={`px-5 py-2 text-xs font-sans font-medium text-white rounded-xl transition-all ${
                selectedScenario === 'normal'
                  ? 'bg-[#141413] hover:bg-[#3d3d3a]'
                  : 'bg-[#d97757] hover:bg-[#c6613f]'
              }`}
            >
              {selectedScenario === 'normal' ? 'Apply Baseline' : 'Inject Failure Scenario'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
