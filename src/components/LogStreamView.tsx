import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Filter,
  ArrowDown,
  Terminal,
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle,
  Copy,
  Check,
} from 'lucide-react';
import { SimulationState } from '../services/rcaEngine';
import { LogEntry } from '../types';

interface LogStreamViewProps {
  state: SimulationState;
}

export const LogStreamView: React.FC<LogStreamViewProps> = ({ state }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedService, setSelectedService] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredLogs = useMemo(() => {
    return state.logsHistory.filter((log) => {
      if (selectedService !== 'all' && log.serviceId !== selectedService) return false;
      if (selectedLevel !== 'all' && log.level !== selectedLevel) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesMsg = log.message.toLowerCase().includes(query);
        const matchesEndpoint = log.endpoint.toLowerCase().includes(query);
        const matchesReq = log.requestId.toLowerCase().includes(query);
        const matchesTrace = log.traceId.toLowerCase().includes(query);
        const matchesEx = (log.exceptionType || '').toLowerCase().includes(query);
        return matchesMsg || matchesEndpoint || matchesReq || matchesTrace || matchesEx;
      }
      return true;
    });
  }, [state.logsHistory, selectedService, selectedLevel, searchTerm]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div id="log-stream-view" className="space-y-6">
      {/* Controls & Filter Bar in Sheet Metal Plate */}
      <div className="bg-slate-900 border border-[#888B90]/30 rounded-xl p-4 space-y-3 shadow-lg shadow-black/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#888B90]/30 to-slate-800 border border-[#888B90]/50 flex items-center justify-center text-[#888B90]">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Structured Telemetry Log Stream</h2>
              <p className="text-xs text-[#888B90] font-mono">
                Correlated application logs with trace IDs, request tracking &amp; exception tags
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs text-[#888B90] font-mono">
            <span>Displaying: <strong className="text-white font-bold">{filteredLogs.length}</strong> / {state.logsHistory.length} logs</span>
          </div>
        </div>

        {/* Filter Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-2 border-t border-[#888B90]/20">
          {/* Search Box */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-[#888B90] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by keyword, endpoint, exception, trace ID, request ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-[#888B90]/30 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#888B90] font-mono shadow-inner"
            />
          </div>

          {/* Service Selector */}
          <div>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full bg-slate-950 border border-[#888B90]/30 rounded-lg px-3 py-1.5 text-xs text-[#E4E5E8] focus:outline-none focus:border-[#888B90] font-mono shadow-inner"
            >
              <option value="all">All Services (5)</option>
              {state.services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Log Level Selector */}
          <div>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full bg-slate-950 border border-[#888B90]/30 rounded-lg px-3 py-1.5 text-xs text-[#E4E5E8] focus:outline-none focus:border-[#888B90] font-mono shadow-inner"
            >
              <option value="all">All Log Levels</option>
              <option value="FATAL">FATAL Only</option>
              <option value="ERROR">ERROR Only</option>
              <option value="WARN">WARN Only</option>
              <option value="INFO">INFO Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Log Feed Table / List in Sheet Metal Container */}
      <div className="bg-slate-900 border border-[#888B90]/30 rounded-xl overflow-hidden shadow-lg shadow-black/20">
        <div className="max-h-[640px] overflow-y-auto divide-y divide-[#888B90]/15 font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-[#888B90] space-y-2 font-mono">
              <Terminal className="w-8 h-8 mx-auto text-[#888B90]/60" />
              <p>No matching logs found for the selected filter criteria.</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const isFatal = log.level === 'FATAL';
              const isError = log.level === 'ERROR';
              const isWarn = log.level === 'WARN';

              return (
                <div
                  key={log.id}
                  id={`log-entry-${log.id}`}
                  className={`p-3.5 transition-colors cursor-pointer ${
                    isFatal
                      ? 'bg-rose-950/30 hover:bg-rose-950/50'
                      : isError
                      ? 'bg-rose-950/15 hover:bg-rose-950/30'
                      : isWarn
                      ? 'bg-amber-950/15 hover:bg-amber-950/30'
                      : 'hover:bg-slate-800/60'
                  }`}
                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-2.5 shrink-0">
                      {/* Level Badge */}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                          isFatal
                            ? 'bg-rose-600 text-white'
                            : isError
                            ? 'bg-rose-900/80 text-rose-200 border border-rose-700'
                            : isWarn
                            ? 'bg-amber-900/80 text-amber-200 border border-amber-700'
                            : 'bg-slate-800 text-[#D0D2D6] border border-[#888B90]/30'
                        }`}
                      >
                        {log.level}
                      </span>

                      {/* Timestamp */}
                      <span className="text-[#888B90] text-[11px]">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, fractionalSecondDigits: 3 })}
                      </span>

                      {/* Service Tag */}
                      <span className="text-[#E4E5E8] font-bold">{log.serviceName}</span>

                      {/* Endpoint */}
                      <span className="text-[#888B90] text-[11px] hidden md:inline">
                        {log.endpoint}
                      </span>
                    </div>

                    {/* Meta chips */}
                    <div className="flex items-center space-x-2 text-[10px] text-[#888B90] shrink-0 font-mono">
                      {log.statusCode && (
                        <span
                          className={`px-1.5 py-0.2 rounded font-bold ${
                            log.statusCode >= 500 ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-slate-800 text-[#D0D2D6]'
                          }`}
                        >
                          HTTP {log.statusCode}
                        </span>
                      )}
                      {log.durationMs && <span>{log.durationMs}ms</span>}
                      <span className="text-[#888B90]">ID: {log.requestId}</span>
                    </div>
                  </div>

                  {/* Message body */}
                  <div className="mt-1.5 text-[#E4E5E8] break-words leading-relaxed pl-1 text-[11px]">
                    {log.message}
                  </div>

                  {/* Exception callout */}
                  {log.exceptionType && (
                    <div className="mt-1 text-rose-400 text-[11px] font-bold flex items-center space-x-1 pl-1">
                      <AlertOctagon className="w-3 h-3 shrink-0" />
                      <span>Exception: {log.exceptionType}</span>
                    </div>
                  )}

                  {/* Expanded JSON Inspector Drawer */}
                  {isExpanded && (
                    <div
                      className="mt-3 p-3 bg-slate-950 rounded-lg border border-[#888B90]/30 text-[11px] space-y-2 text-[#D0D2D6] shadow-inner"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between text-[#888B90] pb-1.5 border-b border-[#888B90]/20 text-[10px]">
                        <span>Structured Telemetry Metadata Payload</span>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(log, null, 2), log.id)}
                          className="flex items-center space-x-1 text-[#888B90] hover:text-white font-bold"
                        >
                          {copiedId === log.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedId === log.id ? 'Copied' : 'Copy JSON'}</span>
                        </button>
                      </div>

                      <pre className="text-[10px] text-[#E4E5E8] overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(
                          {
                            logId: log.id,
                            timestamp: log.timestamp,
                            service: log.serviceName,
                            serviceId: log.serviceId,
                            level: log.level,
                            requestId: log.requestId,
                            traceId: log.traceId,
                            endpoint: log.endpoint,
                            exceptionType: log.exceptionType || null,
                            durationMs: log.durationMs || null,
                            statusCode: log.statusCode || 200,
                            message: log.message,
                          },
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
