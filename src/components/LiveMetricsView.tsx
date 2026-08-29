import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { Cpu, Database, Activity, Clock, Server, BarChart3 } from 'lucide-react';
import { SimulationState } from '../services/rcaEngine';

interface LiveMetricsViewProps {
  state: SimulationState;
}

export const LiveMetricsView: React.FC<LiveMetricsViewProps> = ({ state }) => {
  const [selectedServiceId, setSelectedServiceId] = useState<string>('all');
  const [metricTab, setMetricTab] = useState<'resources' | 'latency' | 'database'>('resources');

  const services = state.services;

  // Transform metrics history into Recharts-friendly time-series data
  const timestamps = Array.from(new Set(state.metricsHistory.map((m) => m.timestamp))).slice(-20);

  const chartData = timestamps.map((ts) => {
    const point: any = { time: ts };
    state.metricsHistory
      .filter((m) => m.timestamp === ts)
      .forEach((m) => {
        const srv = services.find((s) => s.id === m.serviceId);
        const name = srv?.name.split(' ')[0] || m.serviceId;
        point[`${name}_cpu`] = m.cpuPercent;
        point[`${name}_mem`] = m.memoryMb;
        point[`${name}_lat`] = m.latencyP95Ms;
        point[`${name}_err`] = m.errorRatePercent;
        point[`${name}_dblat`] = m.dbLatencyMs;
        point[`${name}_dbconn`] = m.dbConnections;
      });
    return point;
  });

  const serviceColors: Record<string, string> = {
    User: '#888B90', // Sheet metal primary
    Order: '#f43f5e', // Rose accent for alerts
    Payment: '#B2B5BA', // Light zinc / aluminum
    Inventory: '#10b981', // Emerald
    Notification: '#f59e0b', // Amber
  };

  return (
    <div id="live-metrics-view" className="space-y-6">
      {/* Controls Bar in Sheet Metal Plate */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-[#888B90]/30 rounded-xl p-4 shadow-lg shadow-black/20">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#888B90]/30 to-slate-800 border border-[#888B90]/50 flex items-center justify-center text-[#888B90]">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Live Microservice Telemetry Stream</h2>
            <p className="text-xs text-[#888B90] font-mono">
              High-resolution sliding window metrics sampled at 2.5s intervals
            </p>
          </div>
        </div>

        {/* View Switchers */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-950 rounded-lg p-1 border border-[#888B90]/30 shadow-inner">
            <button
              onClick={() => setMetricTab('resources')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold transition-all ${
                metricTab === 'resources'
                  ? 'bg-gradient-to-b from-[#888B90] to-[#686B70] text-slate-950 shadow-sm border border-[#B2B5BA]'
                  : 'text-[#888B90] hover:text-white'
              }`}
            >
              CPU &amp; Memory
            </button>
            <button
              onClick={() => setMetricTab('latency')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold transition-all ${
                metricTab === 'latency'
                  ? 'bg-gradient-to-b from-[#888B90] to-[#686B70] text-slate-950 shadow-sm border border-[#B2B5BA]'
                  : 'text-[#888B90] hover:text-white'
              }`}
            >
              Latency &amp; Errors
            </button>
            <button
              onClick={() => setMetricTab('database')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold transition-all ${
                metricTab === 'database'
                  ? 'bg-gradient-to-b from-[#888B90] to-[#686B70] text-slate-950 shadow-sm border border-[#B2B5BA]'
                  : 'text-[#888B90] hover:text-white'
              }`}
            >
              Database &amp; Pool
            </button>
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      {metricTab === 'resources' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CPU Utilization Chart */}
          <div className="bg-slate-900 border border-[#888B90]/30 rounded-xl p-5 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white font-mono">CPU Utilization (% of Core Allocation)</h3>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-[#888B90] font-mono border border-[#888B90]/25 font-bold">
                Threshold: 80%
              </span>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2B2D33" />
                  <XAxis dataKey="time" stroke="#888B90" fontSize={10} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="#888B90" fontSize={10} tickLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#16171A', borderColor: '#888B90', borderRadius: '8px', fontSize: '11px', color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  {['User', 'Order', 'Payment', 'Inventory', 'Notification'].map((name) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={`${name}_cpu`}
                      name={`${name} Service`}
                      stroke={serviceColors[name]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Memory Heap Usage Chart */}
          <div className="bg-slate-900 border border-[#888B90]/30 rounded-xl p-5 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-[#888B90]" />
                <h3 className="text-sm font-bold text-white font-mono">Resident Memory Heap Footprint (MB)</h3>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-[#888B90] font-mono border border-[#888B90]/25 font-bold">
                Limit: 1024 MB
              </span>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2B2D33" />
                  <XAxis dataKey="time" stroke="#888B90" fontSize={10} tickLine={false} />
                  <YAxis domain={[0, 1100]} stroke="#888B90" fontSize={10} tickLine={false} unit="MB" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#16171A', borderColor: '#888B90', borderRadius: '8px', fontSize: '11px', color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  {['User', 'Order', 'Payment', 'Inventory'].map((name) => (
                    <Area
                      key={name}
                      type="monotone"
                      dataKey={`${name}_mem`}
                      name={`${name} Service`}
                      stroke={serviceColors[name]}
                      fill={serviceColors[name]}
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {metricTab === 'latency' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Request Latency p95 Chart */}
          <div className="bg-slate-900 border border-[#888B90]/30 rounded-xl p-5 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-[#888B90]" />
                <h3 className="text-sm font-bold text-white font-mono">HTTP Request Latency (p95 ms)</h3>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-[#888B90] font-mono border border-[#888B90]/25 font-bold">
                SLA: &lt; 200ms
              </span>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2B2D33" />
                  <XAxis dataKey="time" stroke="#888B90" fontSize={10} tickLine={false} />
                  <YAxis stroke="#888B90" fontSize={10} tickLine={false} unit="ms" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#16171A', borderColor: '#888B90', borderRadius: '8px', fontSize: '11px', color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  {['User', 'Order', 'Payment', 'Inventory', 'Notification'].map((name) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={`${name}_lat`}
                      name={`${name} Service`}
                      stroke={serviceColors[name]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Error Rate Chart */}
          <div className="bg-slate-900 border border-[#888B90]/30 rounded-xl p-5 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white font-mono">HTTP 5xx Error Rate (% of Inbound Calls)</h3>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-[#888B90] font-mono border border-[#888B90]/25 font-bold">
                Target: &lt; 0.5%
              </span>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2B2D33" />
                  <XAxis dataKey="time" stroke="#888B90" fontSize={10} tickLine={false} />
                  <YAxis domain={[0, 'auto']} stroke="#888B90" fontSize={10} tickLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#16171A', borderColor: '#888B90', borderRadius: '8px', fontSize: '11px', color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  {['User', 'Order', 'Payment', 'Inventory'].map((name) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={`${name}_err`}
                      name={`${name} Service`}
                      stroke={serviceColors[name]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {metricTab === 'database' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* DB Query Latency */}
          <div className="bg-slate-900 border border-[#888B90]/30 rounded-xl p-5 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-[#888B90]" />
                <h3 className="text-sm font-bold text-white font-mono">PostgreSQL Query Execution Time (ms)</h3>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-[#888B90] font-mono border border-[#888B90]/25 font-bold">
                Slow Query: &gt; 200ms
              </span>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2B2D33" />
                  <XAxis dataKey="time" stroke="#888B90" fontSize={10} tickLine={false} />
                  <YAxis stroke="#888B90" fontSize={10} tickLine={false} unit="ms" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#16171A', borderColor: '#888B90', borderRadius: '8px', fontSize: '11px', color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  {['User', 'Order', 'Payment', 'Inventory'].map((name) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={`${name}_dblat`}
                      name={`${name} DB Latency`}
                      stroke={serviceColors[name]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* DB Connection Pool Active */}
          <div className="bg-slate-900 border border-[#888B90]/30 rounded-xl p-5 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white font-mono">Active Database Connection Pool Usage</h3>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-[#888B90] font-mono border border-[#888B90]/25 font-bold">
                Pool Max: 80-100
              </span>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2B2D33" />
                  <XAxis dataKey="time" stroke="#888B90" fontSize={10} tickLine={false} />
                  <YAxis stroke="#888B90" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#16171A', borderColor: '#888B90', borderRadius: '8px', fontSize: '11px', color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  {['User', 'Order', 'Payment', 'Inventory'].map((name) => (
                    <Area
                      key={name}
                      type="monotone"
                      dataKey={`${name}_dbconn`}
                      name={`${name} Connections`}
                      stroke={serviceColors[name]}
                      fill={serviceColors[name]}
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
