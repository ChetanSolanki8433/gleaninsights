import React, { useState } from 'react';
import {
  History,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Download,
  Copy,
  MessageSquare,
  Send,
  User,
  ShieldCheck,
  Zap,
  TrendingDown,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Incident, OperatorComment } from '../types';
import { simulationManager } from '../services/simulationStore';

interface IncidentHistoryViewProps {
  incidents: Incident[];
  activeIncident: Incident | null;
  onNavigateTab: (tab: string) => void;
}

export const IncidentHistoryView: React.FC<IncidentHistoryViewProps> = ({
  incidents,
  activeIncident,
  onNavigateTab,
}) => {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
    activeIncident ? activeIncident.id : incidents[0]?.id || null
  );
  const [newCommentText, setNewCommentText] = useState('');
  const [authorName, setAuthorName] = useState('SRE On-Call Lead');
  const [copySuccess, setCopySuccess] = useState(false);

  // Combine active incident + historical incidents
  const allIncidents: Incident[] = activeIncident
    ? [activeIncident, ...incidents.filter((i) => i.id !== activeIncident.id)]
    : incidents;

  const currentIncident = allIncidents.find((i) => i.id === selectedIncidentId) || allIncidents[0];

  // Calculate high-level SRE KPIs
  const resolvedList = incidents.filter((i) => i.status === 'resolved');
  const avgMttd = resolvedList.length > 0
    ? (resolvedList.reduce((acc, curr) => acc + (curr.mttdSeconds || 2.5), 0) / resolvedList.length).toFixed(1)
    : '2.8';
  const avgMttr = resolvedList.length > 0
    ? (resolvedList.reduce((acc, curr) => acc + (curr.mttrSeconds || 160), 0) / resolvedList.length).toFixed(0)
    : '163';

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !currentIncident) return;
    simulationManager.addOperatorComment(currentIncident.id, authorName, newCommentText.trim());
    setNewCommentText('');
  };

  const handleExportMarkdown = () => {
    if (!currentIncident) return;
    const md = `# Incident Post-Mortem: ${currentIncident.title} (${currentIncident.id})
**Status:** ${currentIncident.status.toUpperCase()}
**Severity:** ${currentIncident.severity.toUpperCase()}
**Root Cause Service:** ${currentIncident.rootCauseService || currentIncident.serviceName}
**Start Time:** ${currentIncident.startTime}
**End Time:** ${currentIncident.endTime || 'In Progress'}
**Mean Time to Detect (MTTD):** ${currentIncident.mttdSeconds || 2.8}s
**Mean Time to Resolve (MTTR):** ${currentIncident.mttrSeconds ? currentIncident.mttrSeconds + 's' : 'N/A'}
**Confidence Score:** ${currentIncident.confidenceScore}%

## Incident Summary
${currentIncident.summary}

## Resolution Summary
${currentIncident.resolutionSummary || 'Remediation executed via automated playbook with closed-loop telemetry confirmation.'}

## Lifecycle Audit Trail
${(currentIncident.lifecycleTimeline || [])
  .map((e) => `- **[${e.timestamp}] ${e.label}** (${e.actor}): ${e.description}`)
  .join('\n')}

## Post-Mortem Notes & Operator Discussion
${(currentIncident.operatorComments || [])
  .map((c) => `> **${c.author}** [${c.timestamp}]: ${c.text}`)
  .join('\n\n')}
`;

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incident-${currentIncident.id}-postmortem.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    if (!currentIncident) return;
    const jsonStr = JSON.stringify(currentIncident, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incident-${currentIncident.id}-data.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopySummary = () => {
    if (!currentIncident) return;
    const summaryText = `[INCIDENT ${currentIncident.id}] ${currentIncident.title} | Root Cause: ${currentIncident.rootCauseService} | Status: ${currentIncident.status} | MTTR: ${currentIncident.mttrSeconds || 0}s`;
    navigator.clipboard.writeText(summaryText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div id="incident-history-view" className="space-y-6">
      {/* Top Banner & KPI Cards in Sheet Metal Plates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-[#888B90]/30 rounded-xl p-4 space-y-1 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between text-[#888B90] text-xs font-mono">
            <span>Total Incidents Logged</span>
            <History className="w-4 h-4 text-[#888B90]" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{allIncidents.length}</div>
          <p className="text-[11px] text-[#888B90] font-mono">Complete audit trail preserved</p>
        </div>

        <div className="bg-slate-900 border border-[#888B90]/30 rounded-xl p-4 space-y-1 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between text-[#888B90] text-xs font-mono">
            <span>Mean Time to Detect (MTTD)</span>
            <Clock className="w-4 h-4 text-[#888B90]" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{avgMttd}s</div>
          <p className="text-[11px] text-[#888B90] font-mono">ML multivariate anomaly trigger</p>
        </div>

        <div className="bg-slate-900 border border-[#888B90]/30 rounded-xl p-4 space-y-1 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between text-[#888B90] text-xs font-mono">
            <span>Mean Time to Resolve (MTTR)</span>
            <TrendingDown className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{avgMttr}s</div>
          <p className="text-[11px] text-[#888B90] font-mono">Automated closed-loop recovery</p>
        </div>

        <div className="bg-slate-900 border border-[#888B90]/30 rounded-xl p-4 space-y-1 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between text-[#888B90] text-xs font-mono">
            <span>Resolution Success Rate</span>
            <ShieldCheck className="w-4 h-4 text-[#888B90]" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">100%</div>
          <p className="text-[11px] text-[#888B90] font-mono">Zero false-recovery rollbacks</p>
        </div>
      </div>

      {/* Main Split Layout: Incidents Master-Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Incidents List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2 font-mono">
              <History className="w-4 h-4 text-[#888B90]" />
              <span>Incident Archive</span>
            </h3>
            <span className="text-xs text-[#888B90] font-mono">{allIncidents.length} recorded</span>
          </div>

          <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
            {allIncidents.map((inc) => {
              const isSelected = selectedIncidentId === inc.id;
              const isActive = inc.status === 'active';

              return (
                <div
                  key={inc.id}
                  id={`incident-item-${inc.id}`}
                  onClick={() => setSelectedIncidentId(inc.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 border-[#888B90] shadow-md ring-1 ring-[#888B90]/50'
                      : 'bg-slate-900 border-[#888B90]/30 hover:border-[#888B90]/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold font-mono text-[#E4E5E8]">{inc.id}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                        isActive
                          ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {isActive ? 'ACTIVE' : 'RESOLVED'}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white line-clamp-1 mb-1">{inc.title}</h4>

                  <div className="flex items-center justify-between text-[11px] text-[#888B90] font-mono">
                    <span>{inc.serviceName}</span>
                    <span>{inc.startTime}</span>
                  </div>

                  {inc.mttrSeconds && (
                    <div className="mt-2 pt-2 border-t border-[#888B90]/20 flex items-center justify-between text-[10px] text-[#888B90] font-mono">
                      <span>MTTD: {inc.mttdSeconds || 2.5}s</span>
                      <span className="text-emerald-400 font-bold">MTTR: {inc.mttrSeconds}s</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed Post-Mortem & Timeline */}
        <div className="lg:col-span-8">
          {currentIncident ? (
            <div className="bg-slate-900 border border-[#888B90]/30 rounded-xl p-5 space-y-6 shadow-lg shadow-black/20">
              {/* Incident Header & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#888B90]/20 pb-4">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs font-mono px-2 py-0.5 bg-slate-800 text-[#E4E5E8] rounded border border-[#888B90]/40 font-bold">
                      {currentIncident.id}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-mono font-bold uppercase ${
                        currentIncident.severity === 'critical'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {currentIncident.severity}
                    </span>
                    <span className="text-xs text-[#888B90] font-mono">• {currentIncident.incidentType}</span>
                  </div>
                  <h2 className="text-base font-bold text-white">{currentIncident.title}</h2>
                </div>

                {/* Export & Copy Toolbar in Sheet Metal Buttons */}
                <div className="flex items-center space-x-2 font-mono">
                  <button
                    onClick={handleCopySummary}
                    title="Copy incident one-liner"
                    className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-[#E4E5E8] rounded text-xs transition-colors border border-[#888B90]/40 font-bold"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={handleExportMarkdown}
                    title="Export full post-mortem in Markdown"
                    className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-b from-[#888B90] to-[#686B70] hover:from-[#9C9FA4] hover:to-[#797C82] text-slate-950 rounded text-xs font-bold transition-all shadow-sm border border-[#B2B5BA]"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-950" />
                    <span>Markdown Post-Mortem</span>
                  </button>

                  <button
                    onClick={handleExportJson}
                    title="Download JSON telemetry payload"
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-[#888B90] hover:text-white rounded border border-[#888B90]/40"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* High-Level Overview Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 border border-[#888B90]/25 rounded-lg p-3 text-xs shadow-inner">
                <div>
                  <span className="text-[#888B90] block text-[11px] font-mono">Primary Service</span>
                  <span className="font-bold text-white">{currentIncident.serviceName}</span>
                </div>
                <div>
                  <span className="text-[#888B90] block text-[11px] font-mono">Root Cause Service</span>
                  <span className="font-bold text-rose-400">{currentIncident.rootCauseService || currentIncident.serviceName}</span>
                </div>
                <div>
                  <span className="text-[#888B90] block text-[11px] font-mono">Time to Detect</span>
                  <span className="font-mono text-amber-400 font-bold">{currentIncident.mttdSeconds || 2.8} seconds</span>
                </div>
                <div>
                  <span className="text-[#888B90] block text-[11px] font-mono">Time to Resolve</span>
                  <span className="font-mono text-emerald-400 font-bold">{currentIncident.mttrSeconds ? `${currentIncident.mttrSeconds}s` : 'Active'}</span>
                </div>
              </div>

              {/* Summary Description */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#888B90] font-mono">Executive Summary</h4>
                <p className="text-xs text-[#D0D2D6] leading-relaxed bg-slate-950 p-3 rounded-lg border border-[#888B90]/25 font-mono shadow-inner">
                  {currentIncident.summary}
                </p>
              </div>

              {/* 9-Stage Lifecycle Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#888B90] flex items-center justify-between font-mono">
                  <span>Incident Lifecycle Audit Trail (9 Stages)</span>
                  <span className="text-[10px] text-[#888B90] font-mono">Full Provenance Log</span>
                </h4>

                <div className="space-y-2 border-l-2 border-[#888B90]/40 ml-3 pl-4">
                  {(currentIncident.lifecycleTimeline || []).map((event, idx) => (
                    <div key={idx} className="relative group">
                      <div className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full bg-[#888B90] ring-4 ring-slate-900 border border-[#B2B5BA]" />
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-white font-mono">{event.label}</span>
                        <span className="text-[11px] font-mono text-[#888B90]">{event.timestamp}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-[#D0D2D6] border border-[#888B90]/30 font-mono">
                          {event.actor}
                        </span>
                      </div>
                      <p className="text-xs text-[#D0D2D6] mt-0.5">{event.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Post-Mortem Comments & SRE Discussion */}
              <div className="space-y-3 pt-4 border-t border-[#888B90]/20">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#888B90] flex items-center space-x-2 font-mono">
                    <MessageSquare className="w-3.5 h-3.5 text-[#888B90]" />
                    <span>SRE Operator Post-Mortem Discussion</span>
                  </h4>
                  <span className="text-[10px] text-[#888B90] font-mono">
                    {currentIncident.operatorComments?.length || 0} comments
                  </span>
                </div>

                {/* Comment List */}
                <div className="space-y-2.5">
                  {(currentIncident.operatorComments || []).map((c) => (
                    <div key={c.id} className="bg-slate-950 border border-[#888B90]/25 rounded-lg p-3 space-y-1 shadow-inner">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#E4E5E8] flex items-center space-x-1.5 font-mono">
                          <User className="w-3.5 h-3.5 text-[#888B90]" />
                          <span>{c.author}</span>
                        </span>
                        <span className="text-[11px] text-[#888B90] font-mono">{c.timestamp}</span>
                      </div>
                      <p className="text-xs text-[#D0D2D6] leading-relaxed">{c.text}</p>
                    </div>
                  ))}

                  {(!currentIncident.operatorComments || currentIncident.operatorComments.length === 0) && (
                    <div className="text-xs text-[#888B90] italic py-2 text-center font-mono">
                      No operator discussion comments recorded yet. Add notes below.
                    </div>
                  )}
                </div>

                {/* Comment Input Form */}
                <form onSubmit={handleAddComment} className="pt-2 space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="Operator Name (e.g. Lead SRE)"
                      className="w-1/3 bg-slate-950 border border-[#888B90]/30 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#888B90] font-mono shadow-inner"
                    />
                    <input
                      type="text"
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder="Add post-mortem observation, ticket ref, or remediation note..."
                      className="flex-1 bg-slate-950 border border-[#888B90]/30 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#888B90] font-mono shadow-inner"
                    />
                    <button
                      type="submit"
                      disabled={!newCommentText.trim()}
                      className="px-3.5 py-1.5 bg-gradient-to-b from-[#888B90] to-[#686B70] hover:from-[#9C9FA4] hover:to-[#797C82] disabled:opacity-40 text-slate-950 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 border border-[#B2B5BA] font-mono"
                    >
                      <Send className="w-3.5 h-3.5 text-slate-950" />
                      <span>Post</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-[#888B90]/30 rounded-xl p-12 text-center text-[#888B90] font-mono shadow-lg shadow-black/20">
              Select an incident from the archive to view its post-mortem audit trail.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
