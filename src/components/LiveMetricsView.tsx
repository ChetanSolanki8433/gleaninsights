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
import { Cpu, Database, Activity, Clock, BarChart3 } from 'lucide-react';
import { SimulationState } from '../services/rcaEngine';

interface LiveMetricsViewProps {
  state: SimulationState;
}

export const LiveMetricsView: React.FC<LiveMetricsViewProps> = ({ state }) => {
  const [metricTab, setMetricTab] = useState<'resources' | 'latency' | 'database'>('resources');
  const services = state.services;

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
    User: '#141413',        // Slate Dark
    Order: '#d97757',       // Clay Accent
    Payment: '#87867f',     // Cloud Dark
    Inventory: '#4d7c71',   // Sage Natural Teal
    Notification: '#b87333',// Ochre / Warm Amber
  };

  return (
    <div id="live-metrics-view" className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-5">
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-xl bg-[#e3dacc] border border-[#cccbc8] flex items-center justify-center text-[#141413]">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-serif font-bold text-[#141413]">Live Microservice Telemetry Stream</h2>
            <p className="text-xs text-[#87867f] font-sans">
              High-resolution sliding window metrics sampled at 2.5s intervals
            </p>
          </div>
        </div>

        {/* View Switchers */}
        <div className="flex items-center bg-[#f0eee6] rounded-xl p-1 border border-[#cccbc8]">
          <button
            onClick={() => setMetricTab('resources')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-sans font-medium transition-all ${
              metricTab === 'resources'
                ? 'bg-[#141413] text-[#faf9f5]'
                : 'text-[#141413] hover:text-[#141413]'
            }`}
          >
            CPU &amp; Memory
          </button>
          <button
            onClick={() => setMetricTab('latency')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-sans font-medium transition-all ${
              metricTab === 'latency'
                ? 'bg-[#141413] text-[#faf9f5]'
                : 'text-[#141413] hover:text-[#141413]'
            }`}
          >
            Latency &amp; Errors
          </button>
          <button
            onClick={() => setMetricTab('database')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-sans font-medium transition-all ${
              metricTab === 'database'
                ? 'bg-[#141413] text-[#faf9f5]'
                : 'text-[#141413] hover:text-[#141413]'
            }`}
          >
            Database &amp; Pool
          </button>
        </div>
      </div>

      {/* Main Charts Grid in Parchment Style */}
      {metricTab === 'resources' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CPU Utilization Chart */}
          <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-[#d97757]" />
                <h3 className="text-sm font-serif font-bold text-[#141413]">CPU Utilization (% Allocation)</h3>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#e3dacc] text-[#141413] font-mono border border-[#cccbc8]">
                Threshold: 80%
              </span>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cccbc8" vertical={false} />
                  <XAxis dataKey="time" stroke="#87867f" fontSize={10} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="#87867f" fontSize={10} tickLine={false} unit="%" />
                  <Tooltip
                    formatter={(val: any) => (typeof val === 'number' ? val.toFixed(2) : val)}
                    contentStyle={{ backgroundColor: '#faf9f5', borderColor: '#cccbc8', borderRadius: '12px', fontSize: '11px', color: '#141413' }}
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
          <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-[#141413]" />
                <h3 className="text-sm font-serif font-bold text-[#141413]">Resident Memory Heap Footprint (MB)</h3>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#e3dacc] text-[#141413] font-mono border border-[#cccbc8]">
                Cap: 1024 MB
              </span>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cccbc8" vertical={false} />
                  <XAxis dataKey="time" stroke="#87867f" fontSize={10} tickLine={false} />
                  <YAxis domain={[0, 1100]} stroke="#87867f" fontSize={10} tickLine={false} unit="MB" />
                  <Tooltip
                    formatter={(val: any) => (typeof val === 'number' ? val.toFixed(2) : val)}
                    contentStyle={{ backgroundColor: '#faf9f5', borderColor: '#cccbc8', borderRadius: '12px', fontSize: '11px', color: '#141413' }}
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
                      fillOpacity={0.12}
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
          <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-[#141413]" />
                <h3 className="text-sm font-serif font-bold text-[#141413]">HTTP Request Latency (p95 ms)</h3>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#e3dacc] text-[#141413] font-mono border border-[#cccbc8]">
                SLO: &lt; 200ms
              </span>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cccbc8" vertical={false} />
                  <XAxis dataKey="time" stroke="#87867f" fontSize={10} tickLine={false} />
                  <YAxis stroke="#87867f" fontSize={10} tickLine={false} unit="ms" />
                  <Tooltip
                    formatter={(val: any) => (typeof val === 'number' ? val.toFixed(2) : val)}
                    contentStyle={{ backgroundColor: '#faf9f5', borderColor: '#cccbc8', borderRadius: '12px', fontSize: '11px', color: '#141413' }}
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
          <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-[#d97757]" />
                <h3 className="text-sm font-serif font-bold text-[#141413]">HTTP 5xx Error Rate (% of Calls)</h3>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#e3dacc] text-[#141413] font-mono border border-[#cccbc8]">
                SLO: &lt; 0.5%
              </span>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cccbc8" vertical={false} />
                  <XAxis dataKey="time" stroke="#87867f" fontSize={10} tickLine={false} />
                  <YAxis domain={[0, 'auto']} stroke="#87867f" fontSize={10} tickLine={false} unit="%" />
                  <Tooltip
                    formatter={(val: any) => (typeof val === 'number' ? val.toFixed(2) : val)}
                    contentStyle={{ backgroundColor: '#faf9f5', borderColor: '#cccbc8', borderRadius: '12px', fontSize: '11px', color: '#141413' }}
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
          <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-[#141413]" />
                <h3 className="text-sm font-serif font-bold text-[#141413]">PostgreSQL Query Latency (ms)</h3>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#e3dacc] text-[#141413] font-mono border border-[#cccbc8]">
                Slow Query: &gt; 200ms
              </span>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cccbc8" vertical={false} />
                  <XAxis dataKey="time" stroke="#87867f" fontSize={10} tickLine={false} />
                  <YAxis stroke="#87867f" fontSize={10} tickLine={false} unit="ms" />
                  <Tooltip
                    formatter={(val: any) => (typeof val === 'number' ? val.toFixed(2) : val)}
                    contentStyle={{ backgroundColor: '#faf9f5', borderColor: '#cccbc8', borderRadius: '12px', fontSize: '11px', color: '#141413' }}
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
          <div className="bg-[#faf9f5] border border-[#cccbc8] rounded-[24px] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-[#b87333]" />
                <h3 className="text-sm font-serif font-bold text-[#141413]">Active Database Connection Pool</h3>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#e3dacc] text-[#141413] font-mono border border-[#cccbc8]">
                Pool Limit: 80-100
              </span>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cccbc8" vertical={false} />
                  <XAxis dataKey="time" stroke="#87867f" fontSize={10} tickLine={false} />
                  <YAxis stroke="#87867f" fontSize={10} tickLine={false} />
                  <Tooltip
                    formatter={(val: any) => (typeof val === 'number' ? val.toFixed(2) : val)}
                    contentStyle={{ backgroundColor: '#faf9f5', borderColor: '#cccbc8', borderRadius: '12px', fontSize: '11px', color: '#141413' }}
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
    </div>
  );
};
