import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Terminal,
  AlertOctagon,
  Copy,
  Check,
} from 'lucide-react';
import { SimulationState } from '../services/rcaEngine';

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
      {/* Controls & Filter Bar */}
      <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3.5">
            <div className="w-9 h-9 rounded-xl bg-[#e3dacc] border border-[#cccbc8] flex items-center justify-center text-[#141413]">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-[#141413]">Structured Telemetry Log Stream</h2>
              <p className="text-xs text-[#87867f] font-sans">
                Correlated application logs with distributed trace IDs, request tracking &amp; exception tags
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs text-[#87867f] font-mono">
            <span>Showing: <strong className="text-[#141413]">{filteredLogs.length}</strong> / {state.logsHistory.length} logs</span>
          </div>
        </div>

        {/* Filter Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-3 border-t border-[#cccbc8]/60">
          {/* Search Box */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-[#87867f] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search keyword, endpoint, exception, trace ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#f0eee6] border border-[#cccbc8] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#141413] placeholder-[#87867f] focus:outline-none focus:border-[#141413] font-mono"
            />
          </div>

          {/* Service Selector */}
          <div>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full bg-[#f0eee6] border border-[#cccbc8] rounded-xl px-3 py-1.5 text-xs text-[#141413] focus:outline-none focus:border-[#141413] font-mono"
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
              className="w-full bg-[#f0eee6] border border-[#cccbc8] rounded-xl px-3 py-1.5 text-xs text-[#141413] focus:outline-none focus:border-[#141413] font-mono"
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

      {/* Log Feed Table / List in Editorial Parchment Container */}
      <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] overflow-hidden">
        <div className="max-h-[640px] overflow-y-auto subtle-scroll divide-y divide-[#cccbc8]/50 font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-[#87867f] space-y-2 font-mono">
              <Terminal className="w-8 h-8 mx-auto text-[#87867f]" />
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
                  className={`p-4 transition-colors cursor-pointer ${
                    isFatal
                      ? 'bg-[#f5e3c7]/70 hover:bg-[#f5e3c7]'
                      : isError
                      ? 'bg-[#f5e3c7]/40 hover:bg-[#f5e3c7]/60'
                      : isWarn
                      ? 'bg-[#e3dacc]/30 hover:bg-[#e3dacc]/50'
                      : 'hover:bg-[#f0eee6]/60'
                  }`}
                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-2.5 shrink-0">
                      {/* Level Badge */}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-medium ${
                          isFatal || isError
                            ? 'bg-[#d97757] text-[#ffffff]'
                            : isWarn
                            ? 'bg-[#e3dacc] text-[#141413] border border-[#cccbc8]'
                            : 'bg-[#faf9f5] text-[#87867f] border border-[#cccbc8]'
                        }`}
                      >
                        {log.level}
                      </span>
                      {/* Timestamp */}
                      <span className="text-[#87867f] text-[11px]">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, fractionalSecondDigits: 3 })}
                      </span>
                      {/* Service Tag */}
                      <span className="text-[#141413] font-serif font-bold">{log.serviceName}</span>
                      {/* Endpoint */}
                      <span className="text-[#87867f] text-[11px] hidden md:inline">
                        {log.endpoint}
                      </span>
                    </div>

                    {/* Meta chips */}
                    <div className="flex items-center space-x-2 text-[10px] text-[#87867f] shrink-0 font-mono">
                      {log.statusCode && (
                        <span
                          className={`px-1.5 py-0.2 rounded font-medium ${
                            log.statusCode >= 500 ? 'bg-[#d97757] text-[#ffffff]' : 'bg-[#e3dacc] text-[#141413]'
                          }`}
                        >
                          HTTP {log.statusCode}
                        </span>
                      )}
                      {log.durationMs && <span>{log.durationMs}ms</span>}
                      <span className="text-[#87867f]">ID: {log.requestId}</span>
                    </div>
                  </div>

                  {/* Message body */}
                  <div className="mt-1.5 text-[#141413] break-words leading-relaxed text-[11px]">
                    {log.message}
                  </div>

                  {/* Exception callout */}
                  {log.exceptionType && (
                    <div className="mt-1 text-[#d97757] text-[11px] font-bold flex items-center space-x-1">
                      <AlertOctagon className="w-3 h-3 shrink-0" />
                      <span>Exception: {log.exceptionType}</span>
                    </div>
                  )}

                  {/* Expanded JSON Inspector Drawer */}
                  {isExpanded && (
                    <div
                      className="mt-3 p-3.5 bg-[#f0eee6] rounded-xl border border-[#cccbc8] text-[11px] space-y-2 text-[#141413]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between text-[#87867f] pb-1.5 border-b border-[#cccbc8]/60 text-[10px]">
                        <span>Structured Telemetry Metadata</span>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(log, null, 2), log.id)}
                          className="flex items-center space-x-1 text-[#141413] hover:underline font-bold"
                        >
                          {copiedId === log.id ? <Check className="w-3 h-3 text-[#4d7c71]" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedId === log.id ? 'Copied' : 'Copy JSON'}</span>
                        </button>
                      </div>
                      <pre className="text-[10px] text-[#141413] overflow-x-auto subtle-scroll whitespace-pre-wrap font-mono">
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
