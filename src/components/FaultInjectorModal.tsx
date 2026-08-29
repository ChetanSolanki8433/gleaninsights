import React from 'react';
import { X, Zap, Shield, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { FAULT_SCENARIOS } from '../services/simulator';
import { FaultScenarioType } from '../types';

interface FaultInjectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentScenario: FaultScenarioType;
  onSelectScenario: (scenario: FaultScenarioType) => void;
}

export const FaultInjectorModal: React.FC<FaultInjectorModalProps> = ({
  isOpen,
  onClose,
  currentScenario,
  onSelectScenario,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div
        id="fault-injector-modal"
        className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Fault Injection Sandbox</h2>
              <p className="text-xs text-slate-500 font-mono">
                Trigger realistic distributed microservice failures to validate anomaly detection &amp; RCA pipeline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scenarios Grid */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {FAULT_SCENARIOS.map((scenario) => {
              const isSelected = currentScenario === scenario.id;
              const isNormal = scenario.id === 'normal';

              return (
                <div
                  key={scenario.id}
                  id={`scenario-card-${scenario.id}`}
                  onClick={() => {
                    onSelectScenario(scenario.id);
                    onClose();
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? isNormal
                        ? 'bg-emerald-50 border-emerald-500 shadow-xs ring-1 ring-emerald-300'
                        : 'bg-rose-50 border-rose-500 shadow-xs ring-1 ring-rose-300'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/70 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                            isNormal
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-slate-200 text-slate-700 border border-slate-300'
                          }`}
                        >
                          {scenario.category}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">Target: {scenario.targetService}</span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-1.5 flex items-center space-x-1.5">
                        <span>{scenario.title}</span>
                      </h3>
                    </div>

                    {isSelected && (
                      <div className="flex items-center text-xs font-mono font-bold space-x-1 text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                    {scenario.description}
                  </p>

                  {/* Signatures */}
                  <div className="mt-3 pt-2.5 border-t border-slate-200 flex flex-wrap gap-1.5">
                    {scenario.telemetrySignatures.map((sig, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200 font-mono"
                      >
                        {sig}
                      </span>
                    ))}
                  </div>

                  {/* Action & Expected */}
                  <div className="mt-3 text-[11px] flex items-center justify-between text-slate-500 font-mono">
                    <span className="truncate max-w-[240px]">
                      <strong className="text-slate-800">Playbook:</strong> {scenario.recommendedPlaybook}
                    </span>
                    <span className="flex items-center space-x-1 text-slate-900 font-bold hover:underline">
                      <span>Inject</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>
            Current Active Scenario: <strong className="text-slate-900 font-bold">{currentScenario}</strong>
          </span>
          <button
            onClick={() => {
              onSelectScenario('normal');
              onClose();
            }}
            className="px-3 py-1.5 rounded-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors font-bold shadow-xs"
          >
            Reset to Nominal
          </button>
        </div>
      </div>
    </div>
  );
};
