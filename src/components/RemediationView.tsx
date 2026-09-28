import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Check,
  Terminal,
} from 'lucide-react';
import { SimulationState } from '../services/rcaEngine';
import { REMEDIATION_PLAYBOOKS } from '../services/simulator';

interface RemediationViewProps {
  state: SimulationState;
  onApprove: (id: string, approver?: string) => void;
  onReject: (id: string, reason: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const RemediationView: React.FC<RemediationViewProps> = ({
  state,
  onApprove,
  onReject,
}) => {
  const [approverName] = useState('SRE On-Call Lead');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const recommendations = state.recommendations;
  const approvals = state.approvalActions;

  return (
    <div id="remediation-view" className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-5">
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-xl bg-[#e3dacc] border border-[#cccbc8] flex items-center justify-center text-[#141413]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-serif font-bold text-[#141413]">Remediation Playbooks &amp; Human-Approved Recovery</h2>
            <p className="text-xs text-[#87867f] font-sans">
              Context-aware automated recovery actions strictly gated by human operator authentication
            </p>
          </div>
        </div>

        {/* Active Operator Badge */}
        <div className="flex items-center space-x-2 text-xs font-sans">
          <span className="text-[#87867f]">Operator Role:</span>
          <span className="px-2.5 py-1 rounded-md bg-[#e3dacc] text-[#141413] border border-[#cccbc8] font-mono font-medium">
            {approverName}
          </span>
        </div>
      </div>

      {/* Proposed Remediation Action Proposals */}
      <div className="space-y-4">
        <h3 className="text-xs font-serif font-bold text-[#87867f] uppercase tracking-wider">
          Proposed Action Proposals for Active Incident ({recommendations.length})
        </h3>

        {recommendations.length === 0 ? (
          <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-10 text-center space-y-3">
            <CheckCircle2 className="w-9 h-9 mx-auto text-[#4d7c71]" />
            <h4 className="text-sm font-serif font-bold text-[#141413]">No Action Proposals Pending</h4>
            <p className="text-xs text-[#87867f] max-w-md mx-auto font-serif">
              System is operating nominally or awaiting RCA candidate generation. Trigger a fault scenario to view matched playbooks.
            </p>
          </div>
        ) : (
          recommendations.map((rec) => {
            const isProposed = rec.status === 'proposed';
            const isExecuting = rec.status === 'executing';
            const isExecuted = rec.status === 'executed';
            const isRejected = rec.status === 'rejected';

            return (
              <div
                key={rec.id}
                id={`recommendation-card-${rec.id}`}
                className={`bg-[#faf9f5] border rounded-[24px] p-6 transition-all ${
                  isExecuting
                    ? 'border-[#141413] bg-[#f5e3c7]/30'
                    : isExecuted
                    ? 'border-[#4d7c71] bg-[#faf9f5]'
                    : isRejected
                    ? 'border-[#cccbc8] opacity-60'
                    : 'border-[#cccbc8]'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  <div className="space-y-2 max-w-3xl">
                    <div className="flex items-center space-x-2.5">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-md font-sans font-medium ${
                          rec.isSafeAuto
                            ? 'bg-[#e3dacc] text-[#141413] border border-[#cccbc8]'
                            : 'bg-[#f5e3c7] text-[#141413] border border-[#cccbc8]'
                        }`}
                      >
                        {rec.isSafeAuto ? 'Safe Automated Playbook' : 'Manual Operational Step'}
                      </span>
                      <span className="text-xs text-[#87867f] font-mono">
                        Target: <strong className="text-[#141413] font-mono">{rec.affectedService}</strong>
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-[#f0eee6] text-[#87867f] border border-[#cccbc8] font-mono">
                        Risk: {rec.riskLevel}
                      </span>
                    </div>

                    <h4 className="text-lg font-serif font-bold text-[#141413]">
                      {rec.title}
                    </h4>
                    <p className="text-xs text-[#141413] leading-relaxed font-serif text-[13px]">
                      {rec.recommendationText}
                    </p>
                  </div>

                  {/* Action Controls — Clay Filled Button for Approve Action */}
                  <div className="flex items-center space-x-3 shrink-0">
                    {isProposed && (
                      <>
                        <button
                          type="button"
                          id={`btn-approve-${rec.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onApprove(rec.id, approverName);
                          }}
                          className="cursor-pointer px-4 py-2.5 bg-[#d97757] hover:bg-[#c6613f] text-[#ffffff] rounded-xl text-xs font-sans font-medium flex items-center space-x-2 transition-all"
                        >
                          <Check className="w-4 h-4 text-[#ffffff] stroke-[2.5]" />
                          <span>Approve &amp; Execute Action</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setRejectingId(rec.id);
                          }}
                          className="cursor-pointer px-3.5 py-2.5 bg-[#faf9f5] hover:bg-[#e3dacc] text-[#141413] rounded-xl text-xs font-sans font-medium transition-colors border border-[#87867f]"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {isExecuting && (
                      <div className="flex items-center space-x-2 text-xs font-medium text-[#141413] bg-[#f5e3c7] px-3.5 py-2 rounded-xl border border-[#d97757] font-mono">
                        <RotateCcw className="w-4 h-4 animate-spin text-[#d97757]" />
                        <span>Executing Recovery Protocol...</span>
                      </div>
                    )}

                    {isExecuted && (
                      <div className="flex items-center space-x-2 text-xs font-medium text-[#141413] bg-[#e3dacc] px-3.5 py-2 rounded-xl border border-[#4d7c71] font-mono">
                        <CheckCircle2 className="w-4 h-4 text-[#4d7c71]" />
                        <span>Action Completed &amp; Verified Healthy</span>
                      </div>
                    )}

                    {isRejected && (
                      <div className="flex items-center space-x-2 text-xs font-medium text-[#87867f] bg-[#f0eee6] px-3.5 py-2 rounded-xl border border-[#cccbc8] font-mono">
                        <XCircle className="w-4 h-4" />
                        <span>Rejected by Operator</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reject Input Dialog Drawer */}
                {rejectingId === rec.id && (
                  <div className="mt-4 p-4 bg-[#f0eee6] rounded-xl border border-[#cccbc8] space-y-2.5">
                    <span className="text-xs font-serif font-bold text-[#141413]">Reason for Rejecting Proposal:</span>
                    <input
                      type="text"
                      placeholder="e.g., Preferring manual DB investigation; maintenance scheduled..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full bg-[#faf9f5] border border-[#cccbc8] rounded-xl p-2.5 text-xs text-[#141413] placeholder-[#87867f] focus:outline-none focus:border-[#141413] font-mono"
                    />
                    <div className="flex justify-end space-x-2 pt-1">
                      <button
                        onClick={() => setRejectingId(null)}
                        className="px-3 py-1.5 text-xs text-[#87867f] hover:text-[#141413] font-sans"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          onReject(rec.id, rejectReason || 'Operator opted for manual investigation');
                          setRejectingId(null);
                          setRejectReason('');
                        }}
                        className="px-3 py-1.5 bg-[#d97757] hover:bg-[#c6613f] text-white rounded-xl text-xs font-sans font-medium"
                      >
                        Confirm Rejection
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Execution Stream & Audit Log */}
      <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-[#87867f]" />
            <h3 className="text-sm font-serif font-bold text-[#141413]">Recovery Execution Stream &amp; Verification Audit</h3>
          </div>
          <span className="text-xs text-[#87867f] font-mono">
            {approvals.length} total audit entries recorded
          </span>
        </div>

        <div className="space-y-3 font-mono text-xs max-h-[320px] overflow-y-auto subtle-scroll pr-1">
          {approvals.length === 0 ? (
            <div className="text-center py-8 text-[#87867f] text-xs font-mono">
              No recovery actions executed yet. Approving a recommendation logs live execution steps here.
            </div>
          ) : (
            approvals.map((appr) => (
              <div
                key={appr.id}
                className="p-4 bg-[#f0eee6] rounded-xl border border-[#cccbc8] space-y-2"
              >
                <div className="flex items-center justify-between text-[11px] pb-2 border-b border-[#cccbc8]/60">
                  <div className="flex items-center space-x-2">
                    <span className="text-[#141413] font-bold font-serif">{appr.actionTitle}</span>
                    <span className="text-[#87867f]">({appr.targetService})</span>
                  </div>
                  <div className="flex items-center space-x-2 text-[#87867f]">
                    <span>Approver: <strong className="text-[#141413]">{appr.approver}</strong></span>
                    <span>{appr.createdAt}</span>
                  </div>
                </div>
                <div className="space-y-1 text-[11px]">
                  {appr.executionLogs.map((logLine, idx) => (
                    <div key={idx} className="text-[#141413] flex items-start space-x-1.5">
                      <span className="text-[#87867f]">&gt;</span>
                      <span>{logLine}</span>
                    </div>
                  ))}
                </div>
                {appr.verificationStatus === 'verified_healthy' && (
                  <div className="pt-2 border-t border-[#cccbc8]/60 text-[11px] text-[#4d7c71] flex items-center space-x-1 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Telemetric Verification Passed: Target latency and CPU normalized back to baseline.</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Catalog of Predefined Playbooks */}
      <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-6 space-y-4">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-[#87867f]" />
          <h3 className="text-sm font-serif font-bold text-[#141413]">Predefined Playbook Registry ({REMEDIATION_PLAYBOOKS.length})</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {REMEDIATION_PLAYBOOKS.map((pb) => (
            <div
              key={pb.id}
              className="p-4 bg-[#f0eee6] rounded-xl border border-[#cccbc8] text-xs space-y-2 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-[10px] text-[#87867f] font-mono">
                  <span className="font-bold">{pb.priority}</span>
                  <span className="text-[#4d7c71]">~{pb.estimatedRecoveryTimeSec}s recovery</span>
                </div>
                <div className="font-serif font-bold text-[#141413] text-sm mt-1">{pb.title}</div>
                <p className="text-[11px] text-[#141413] mt-1 line-clamp-2 font-serif">{pb.recommendationText}</p>
              </div>
              <div className="pt-2 border-t border-[#cccbc8]/60 text-[10px] text-[#87867f] font-mono">
                Action: {pb.actionType}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
