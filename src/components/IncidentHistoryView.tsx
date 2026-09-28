import React, { useState } from 'react';
import {
  History,
  Clock,
  Download,
  Copy,
  MessageSquare,
  Send,
  User,
  ShieldCheck,
  TrendingDown,
} from 'lucide-react';
import { Incident } from '../types';
import { simulationManager } from '../services/simulationStore';

interface IncidentHistoryViewProps {
  incidents: Incident[];
  activeIncident: Incident | null;
  onNavigateTab: (tab: string) => void;
}

export const IncidentHistoryView: React.FC<IncidentHistoryViewProps> = ({
  incidents,
  activeIncident,
}) => {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
    activeIncident ? activeIncident.id : incidents[0]?.id || null
  );
  const [newCommentText, setNewCommentText] = useState('');
  const [authorName, setAuthorName] = useState('SRE On-Call Lead');
  const [copySuccess, setCopySuccess] = useState(false);

  const allIncidents: Incident[] = activeIncident
    ? [activeIncident, ...incidents.filter((i) => i.id !== activeIncident.id)]
    : incidents;

  const currentIncident = allIncidents.find((i) => i.id === selectedIncidentId) || allIncidents[0];

  const resolvedList = incidents.filter((i) => i.status === 'resolved');
  const avgMttd = resolvedList.length > 0
    ? (resolvedList.reduce((acc, curr) => acc + (curr.mttdSeconds || 2.5), 0) / resolvedList.length).toFixed(2)
    : '2.80';
  const avgMttr = resolvedList.length > 0
    ? (resolvedList.reduce((acc, curr) => acc + (curr.mttrSeconds || 160), 0) / resolvedList.length).toFixed(2)
    : '163.00';

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
**Mean Time to Detect (MTTD):** ${(currentIncident.mttdSeconds || 2.8).toFixed(2)}s
**Mean Time to Resolve (MTTR):** ${currentIncident.mttrSeconds ? currentIncident.mttrSeconds.toFixed(2) + 's' : 'N/A'}
**Confidence Score:** ${currentIncident.confidenceScore.toFixed(2)}%

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
    const summaryText = `[INCIDENT ${currentIncident.id}] ${currentIncident.title} | Root Cause: ${currentIncident.rootCauseService} | Status: ${currentIncident.status} | MTTR: ${(currentIncident.mttrSeconds || 0).toFixed(2)}s`;
    navigator.clipboard.writeText(summaryText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div id="incident-history-view" className="space-y-6">
      {/* Top Banner & KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-5 space-y-1">
          <div className="flex items-center justify-between text-[#87867f] text-xs font-sans">
            <span>Total Incidents Logged</span>
            <History className="w-4 h-4 text-[#87867f]" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#141413] font-mono">{allIncidents.length}</div>
          <p className="text-[11px] text-[#87867f] font-mono">Complete audit trail preserved</p>
        </div>

        <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-5 space-y-1">
          <div className="flex items-center justify-between text-[#87867f] text-xs font-sans">
            <span>Mean Time to Detect (MTTD)</span>
            <Clock className="w-4 h-4 text-[#87867f]" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#141413] font-mono">{avgMttd}s</div>
          <p className="text-[11px] text-[#87867f] font-mono">ML multivariate anomaly trigger</p>
        </div>

        <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-5 space-y-1">
          <div className="flex items-center justify-between text-[#87867f] text-xs font-sans">
            <span>Mean Time to Resolve (MTTR)</span>
            <TrendingDown className="w-4 h-4 text-[#4d7c71]" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#141413] font-mono">{avgMttr}s</div>
          <p className="text-[11px] text-[#87867f] font-mono">Automated closed-loop recovery</p>
        </div>

        <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-5 space-y-1">
          <div className="flex items-center justify-between text-[#87867f] text-xs font-sans">
            <span>Resolution Success Rate</span>
            <ShieldCheck className="w-4 h-4 text-[#4d7c71]" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#4d7c71] font-mono">100%</div>
          <p className="text-[11px] text-[#87867f] font-mono">Zero false-recovery rollbacks</p>
        </div>
      </div>

      {/* Main Split Layout: Incidents Master-Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Incidents List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-serif font-bold text-[#141413] flex items-center space-x-2">
              <History className="w-4 h-4 text-[#87867f]" />
              <span>Incident Archive</span>
            </h3>
            <span className="text-xs text-[#87867f] font-mono">{allIncidents.length} recorded</span>
          </div>

          <div className="space-y-2.5 max-h-[620px] overflow-y-auto subtle-scroll pr-1">
            {allIncidents.map((inc) => {
              const isSelected = selectedIncidentId === inc.id;
              const isActive = inc.status === 'active';

              return (
                <div
                  key={inc.id}
                  id={`incident-item-${inc.id}`}
                  onClick={() => setSelectedIncidentId(inc.id)}
                  className={`p-4 rounded-[24px] border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#e3dacc]/40 border-[#141413]'
                      : 'bg-[#faf9f5] border-[#cccbc8] hover:bg-[#f0eee6]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-bold text-[#141413]">{inc.id}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-medium ${
                        isActive
                          ? 'bg-[#d97757] text-[#ffffff]'
                          : 'bg-[#e3dacc] text-[#141413] border border-[#cccbc8]'
                      }`}
                    >
                      {isActive ? 'ACTIVE' : 'RESOLVED'}
                    </span>
                  </div>
                  <h4 className="text-sm font-serif font-bold text-[#141413] line-clamp-1 mb-1">{inc.title}</h4>
                  <div className="flex items-center justify-between text-[11px] text-[#87867f] font-mono">
                    <span>{inc.serviceName}</span>
                    <span>{inc.startTime}</span>
                  </div>
                  {inc.mttrSeconds && (
                    <div className="mt-2 pt-2 border-t border-[#cccbc8]/60 flex items-center justify-between text-[10px] text-[#87867f] font-mono">
                      <span>MTTD: {(inc.mttdSeconds || 2.5).toFixed(2)}s</span>
                      <span className="text-[#4d7c71] font-bold">MTTR: {(inc.mttrSeconds || 0).toFixed(2)}s</span>
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
            <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-6 space-y-6 text-[#141413]">
              {/* Incident Header & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#cccbc8]/60 pb-4">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs font-mono px-2 py-0.5 bg-[#e3dacc] text-[#141413] rounded-md border border-[#cccbc8] font-medium">
                      {currentIncident.id}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-md font-mono font-medium uppercase ${
                        currentIncident.severity === 'critical'
                          ? 'bg-[#d97757] text-[#ffffff]'
                          : 'bg-[#e3dacc] text-[#141413] border border-[#cccbc8]'
                      }`}
                    >
                      {currentIncident.severity}
                    </span>
                    <span className="text-xs text-[#87867f] font-mono">· {currentIncident.incidentType}</span>
                  </div>
                  <h2 className="text-xl font-serif font-bold text-[#141413]">{currentIncident.title}</h2>
                </div>

                {/* Export & Copy Toolbar */}
                <div className="flex items-center space-x-2 font-sans">
                  <button
                    onClick={handleCopySummary}
                    title="Copy incident one-liner"
                    className="flex items-center space-x-1 px-3 py-1.5 bg-[#faf9f5] hover:bg-[#e3dacc] text-[#141413] rounded-xl text-xs transition-colors border border-[#cccbc8]"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#87867f]" />
                    <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={handleExportMarkdown}
                    title="Export full post-mortem in Markdown"
                    className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#141413] hover:bg-[#3d3d3a] text-[#faf9f5] rounded-xl text-xs font-medium transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Markdown Post-Mortem</span>
                  </button>
                  <button
                    onClick={handleExportJson}
                    title="Download JSON telemetry payload"
                    className="p-1.5 bg-[#faf9f5] hover:bg-[#e3dacc] text-[#141413] rounded-xl border border-[#cccbc8]"
                  >
                    <Download className="w-4 h-4 text-[#87867f]" />
                  </button>
                </div>
              </div>

              {/* High-Level Overview Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#f0eee6] border border-[#cccbc8] rounded-xl p-3.5 text-xs">
                <div>
                  <span className="text-[#87867f] block text-[11px] font-mono">Primary Service</span>
                  <span className="font-serif font-bold text-[#141413]">{currentIncident.serviceName}</span>
                </div>
                <div>
                  <span className="text-[#87867f] block text-[11px] font-mono">Root Cause Service</span>
                  <span className="font-serif font-bold text-[#d97757]">{currentIncident.rootCauseService || currentIncident.serviceName}</span>
                </div>
                <div>
                  <span className="text-[#87867f] block text-[11px] font-mono">Time to Detect</span>
                  <span className="font-mono text-[#141413] font-bold">{currentIncident.mttdSeconds || 2.8}s</span>
                </div>
                <div>
                  <span className="text-[#87867f] block text-[11px] font-mono">Time to Resolve</span>
                  <span className="font-mono text-[#4d7c71] font-bold">{currentIncident.mttrSeconds ? `${currentIncident.mttrSeconds}s` : 'Active'}</span>
                </div>
              </div>

              {/* Summary Description */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-serif font-bold uppercase tracking-wider text-[#87867f]">Executive Summary</h4>
                <p className="text-sm text-[#141413] leading-relaxed bg-[#f0eee6] p-4 rounded-xl border border-[#cccbc8] font-serif">
                  {currentIncident.summary}
                </p>
              </div>

              {/* 9-Stage Lifecycle Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-serif font-bold uppercase tracking-wider text-[#87867f] flex items-center justify-between">
                  <span>Incident Lifecycle Audit Trail (9 Stages)</span>
                  <span className="text-[10px] text-[#87867f] font-mono">Complete Provenance</span>
                </h4>
                <div className="space-y-2 border-l-2 border-[#cccbc8] ml-3 pl-4">
                  {(currentIncident.lifecycleTimeline || []).map((event, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[22px] top-1.5 w-2 h-2 rounded-full bg-[#141413]" />
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-serif font-bold text-[#141413]">{event.label}</span>
                        <span className="text-[11px] font-mono text-[#87867f]">{event.timestamp}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#e3dacc] text-[#141413] border border-[#cccbc8] font-mono">
                          {event.actor}
                        </span>
                      </div>
                      <p className="text-xs text-[#87867f] mt-0.5 font-sans">{event.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Post-Mortem Comments & SRE Discussion */}
              <div className="space-y-3 pt-4 border-t border-[#cccbc8]/60">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-serif font-bold uppercase tracking-wider text-[#87867f] flex items-center space-x-2">
                    <MessageSquare className="w-3.5 h-3.5 text-[#87867f]" />
                    <span>SRE Operator Post-Mortem Discussion</span>
                  </h4>
                  <span className="text-[10px] text-[#87867f] font-mono">
                    {currentIncident.operatorComments?.length || 0} comments
                  </span>
                </div>

                {/* Comment List */}
                <div className="space-y-2.5">
                  {(currentIncident.operatorComments || []).map((c) => (
                    <div key={c.id} className="bg-[#f0eee6] border border-[#cccbc8] rounded-xl p-3.5 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-serif font-bold text-[#141413] flex items-center space-x-1.5">
                          <User className="w-3.5 h-3.5 text-[#87867f]" />
                          <span>{c.author}</span>
                        </span>
                        <span className="text-[11px] text-[#87867f] font-mono">{c.timestamp}</span>
                      </div>
                      <p className="text-xs text-[#141413] leading-relaxed font-serif text-[13px]">{c.text}</p>
                    </div>
                  ))}
                  {(!currentIncident.operatorComments || currentIncident.operatorComments.length === 0) && (
                    <div className="text-xs text-[#87867f] italic py-2 text-center font-serif">
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
                      className="w-1/3 bg-[#f0eee6] border border-[#cccbc8] rounded-xl px-3 py-1.5 text-xs text-[#141413] placeholder-[#87867f] focus:outline-none focus:border-[#141413] font-mono"
                    />
                    <input
                      type="text"
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder="Add post-mortem observation, ticket ref, or remediation note..."
                      className="flex-1 bg-[#f0eee6] border border-[#cccbc8] rounded-xl px-3 py-1.5 text-xs text-[#141413] placeholder-[#87867f] focus:outline-none focus:border-[#141413] font-mono"
                    />
                    <button
                      type="submit"
                      disabled={!newCommentText.trim()}
                      className="px-4 py-1.5 bg-[#141413] hover:bg-[#3d3d3a] disabled:opacity-40 text-[#faf9f5] rounded-xl text-xs font-medium transition-all flex items-center space-x-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Post</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-12 text-center text-[#87867f] font-serif">
              Select an incident from the archive to view its post-mortem audit trail.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
