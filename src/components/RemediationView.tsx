import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Zap,
  Clock,
  Check,
  Terminal,
  Activity,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { SimulationState } from '../services/rcaEngine';
import { REMEDIATION_PLAYBOOKS } from '../services/simulator';
import { RemediationRecommendation } from '../types';

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
  onNavigateTab,
}) => {
  const [approverName, setApproverName] = useState('SRE On-Call Lead');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const recommendations = state.recommendations;
  const approvals = state.approvalActions;

  return (
    <div id="remediation-view" className="space-y-6">
      {/* Header Banner in Sheet Metal Plate */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-[#888B90]/30 rounded-xl p-4 shadow-lg shadow-black/20">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#888B90]/30 to-slate-800 border border-[#888B90]/50 flex items-center justify-center text-[#888B90]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Remediation Playbooks & Human-in-the-Loop Recovery</h2>
            <p className="text-xs text-[#888B90] font-mono">
              Context-aware automated recovery actions strictly gated by human operator approval
            </p>
          </div>
        </div>

        {/* Active Approver Tag */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="text-[#888B90]">Operator Role:</span>
          <span className="px-2.5 py-1 rounded bg-slate-800 text-[#E4E5E8] border border-[#888B90]/40 font-bold">
            {approverName}
          </span>
        </div>
      </div>

      {/* Proposed Remediation Action Cards */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-[#888B90] uppercase tracking-wider font-mono">
          Proposed Action Proposals for Active Incident ({recommendations.length})
        </h3>

        {recommendations.length === 0 ? (
          <div className="bg-slate-900 border border-[#888B90]/30 rounded-xl p-10 text-center space-y-3 shadow-lg shadow-black/20">
            <CheckCircle2 className="w-9 h-9 mx-auto text-emerald-400" />
            <h4 className="text-sm font-bold text-white">No Action Proposals Pending</h4>
            <p className="text-xs text-[#888B90] max-w-md mx-auto font-mono">
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
                className={`bg-slate-900 border rounded-xl p-5 transition-all shadow-md ${
                  isExecuting
                    ? 'border-[#888B90] ring-1 ring-[#888B90]/50 bg-slate-850'
                    : isExecuted
                    ? 'border-emerald-600/80 bg-emerald-950/15'
                    : isRejected
                    ? 'border-[#888B90]/15 opacity-60'
                    : 'border-[#888B90]/35 hover:border-[#888B90]/60'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2 max-w-3xl">
                    <div className="flex items-center space-x-2.5">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                          rec.isSafeAuto
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {rec.isSafeAuto ? 'Safe Automated Playbook' : 'Manual Operational Step'}
                      </span>

                      <span className="text-xs text-[#888B90] font-mono">
                        Target: <strong className="text-white font-mono">{rec.affectedService}</strong>
                      </span>

                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-[#D0D2D6] border border-[#888B90]/30 font-mono">
                        Risk Level: {rec.riskLevel}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-white">
                      {rec.title}
                    </h4>

                    <p className="text-xs text-[#D0D2D6] leading-relaxed">
                      {rec.recommendationText}
                    </p>
                  </div>

                  {/* Action Controls */}
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
                          className="cursor-pointer px-4 py-2 bg-gradient-to-b from-[#888B90] to-[#686B70] hover:from-[#9C9FA4] hover:to-[#797C82] active:scale-95 text-slate-950 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md hover:shadow-lg border border-[#B2B5BA] focus:outline-none focus:ring-2 focus:ring-[#888B90]"
                        >
                          <Check className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                          <span>Approve &amp; Execute Action</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setRejectingId(rec.id);
                          }}
                          className="cursor-pointer px-3 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-[#D0D2D6] rounded-lg text-xs font-bold transition-colors border border-[#888B90]/30 font-mono"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {isExecuting && (
                      <div className="flex items-center space-x-2 text-xs font-bold text-[#888B90] bg-slate-800 px-3 py-1.5 rounded-lg border border-[#888B90]/40 font-mono">
                        <RotateCcw className="w-4 h-4 animate-spin text-[#888B90]" />
                        <span>Executing Recovery Protocol...</span>
                      </div>
                    )}

                    {isExecuted && (
                      <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 bg-emerald-950/80 px-3 py-1.5 rounded-lg border border-emerald-800 font-mono">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Action Completed &amp; Verified Healthy</span>
                      </div>
                    )}

                    {isRejected && (
                      <div className="flex items-center space-x-2 text-xs font-bold text-[#888B90] bg-slate-800 px-3 py-1.5 rounded-lg border border-[#888B90]/25 font-mono">
                        <XCircle className="w-4 h-4" />
                        <span>Rejected by Operator</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reject Input Dialog Drawer */}
                {rejectingId === rec.id && (
                  <div className="mt-4 p-3 bg-slate-950 rounded-lg border border-[#888B90]/30 space-y-2 shadow-inner">
                    <span className="text-xs font-bold text-[#E4E5E8] font-mono">Reason for Rejecting Action:</span>
                    <input
                      type="text"
                      placeholder="e.g., Scheduled maintenance window approaching; preferring manual DB restart..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full bg-slate-900 border border-[#888B90]/40 rounded p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#888B90] font-mono"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setRejectingId(null)}
                        className="px-3 py-1 text-xs text-[#888B90] hover:text-white font-mono"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          onReject(rec.id, rejectReason || 'Operator opted for manual investigation');
                          setRejectingId(null);
                          setRejectReason('');
                        }}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-bold font-mono"
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
      <div className="bg-slate-900 border border-[#888B90]/30 rounded-xl p-5 space-y-4 shadow-lg shadow-black/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-[#888B90]" />
            <h3 className="text-sm font-bold text-white font-mono">Recovery Execution Stream & Verification Log</h3>
          </div>
          <span className="text-xs text-[#888B90] font-mono">
            {approvals.length} total audit entries recorded
          </span>
        </div>

        <div className="space-y-3 font-mono text-xs max-h-[320px] overflow-y-auto">
          {approvals.length === 0 ? (
            <div className="text-center py-8 text-[#888B90] text-xs font-mono">
              No recovery actions executed yet. Approving a recommendation logs live execution steps here.
            </div>
          ) : (
            approvals.map((appr) => (
              <div
                key={appr.id}
                className="p-3.5 bg-slate-950 rounded-lg border border-[#888B90]/25 space-y-2 shadow-inner"
              >
                <div className="flex items-center justify-between text-[11px] pb-2 border-b border-[#888B90]/15">
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-bold">{appr.actionTitle}</span>
                    <span className="text-[#888B90]">({appr.targetService})</span>
                  </div>
                  <div className="flex items-center space-x-2 text-[#888B90]">
                    <span>Approver: <strong className="text-[#E4E5E8]">{appr.approver}</strong></span>
                    <span>{appr.createdAt}</span>
                  </div>
                </div>

                <div className="space-y-1 text-[11px]">
                  {appr.executionLogs.map((logLine, idx) => (
                    <div key={idx} className="text-emerald-400 flex items-start space-x-1.5">
                      <span className="text-[#888B90]">&gt;</span>
                      <span className="text-[#E4E5E8]">{logLine}</span>
                    </div>
                  ))}
                </div>

                {appr.verificationStatus === 'verified_healthy' && (
                  <div className="pt-2 border-t border-[#888B90]/15 text-[10px] text-emerald-400 flex items-center space-x-1 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Telemetric Verification Passed: Target latency and CPU normalized back to baseline.</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Catalog of Predefined Playbooks in Sheet Metal Matrix */}
      <div className="bg-slate-900 border border-[#888B90]/30 rounded-xl p-5 space-y-4 shadow-lg shadow-black/20">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-[#888B90]" />
          <h3 className="text-sm font-bold text-white font-mono">Predefined Playbook Registry ({REMEDIATION_PLAYBOOKS.length})</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {REMEDIATION_PLAYBOOKS.map((pb) => (
            <div
              key={pb.id}
              className="p-3 bg-slate-950 rounded-lg border border-[#888B90]/25 text-xs space-y-1.5 flex flex-col justify-between shadow-inner"
            >
              <div>
                <div className="flex items-center justify-between text-[10px] text-[#888B90] font-mono">
                  <span className="font-bold">{pb.priority}</span>
                  <span className="text-emerald-400">~{pb.estimatedRecoveryTimeSec}s recovery</span>
                </div>
                <div className="font-bold text-white mt-1">{pb.title}</div>
                <p className="text-[11px] text-[#888B90] mt-1 line-clamp-2">{pb.recommendationText}</p>
              </div>

              <div className="pt-2 border-t border-[#888B90]/15 text-[10px] text-[#888B90] font-mono">
                Action: {pb.actionType}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
