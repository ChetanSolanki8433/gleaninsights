/**
 * Native API Client communicating with the Python FastAPI Backend & Node middleware.
 * Fully offline, zero external cloud dependencies.
 */

import {
  MetricDataPoint,
  LogEntry,
  AnomalyRecord,
  RcaCandidate,
  AiDiagnosisReport,
  RemediationPlaybook,
  ApprovalAction,
} from '../types';

const API_BASE = '/api/v1';

export interface HostTelemetry {
  timestamp: string;
  cpu_percent: number;
  memory_mb: number;
  memory_total_mb: number;
  memory_percent: number;
  disk_percent: number;
  network_bytes_sent: number;
  network_bytes_recv: number;
  active_socket_connections: number;
  system_load_avg: number[];
  cpu_count: number;
}

export interface HealthStatus {
  status: string;
  version: string;
  architecture: string;
  ml_engines: {
    anomaly_detector: string;
    rca_engine: string;
    ai_explainer: string;
  };
  database: string;
  collector: string;
  timestamp: string;
}

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : endpoint;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`API Error [${res.status}]: ${errBody || res.statusText}`);
    }

    return res.json();
  }

  // --- Health & Host Telemetry ---
  async getHealth(): Promise<HealthStatus> {
    return this.request<HealthStatus>('/api/health');
  }

  async getHostTelemetry(): Promise<HostTelemetry> {
    return this.request<HostTelemetry>(`${API_BASE}/metrics/host`);
  }

  // --- Telemetry Metrics ---
  async ingestMetrics(metrics: any[]): Promise<any> {
    return this.request(`${API_BASE}/metrics/ingest`, {
      method: 'POST',
      body: JSON.stringify({ metrics }),
    });
  }

  async getLatestMetrics(limit = 50, serviceId?: string): Promise<MetricDataPoint[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (serviceId) params.append('service_id', serviceId);
    return this.request<MetricDataPoint[]>(`${API_BASE}/metrics/latest?${params.toString()}`);
  }

  // --- Structured Logs ---
  async ingestLogs(logs: any[]): Promise<any> {
    return this.request(`${API_BASE}/logs/ingest`, {
      method: 'POST',
      body: JSON.stringify({ logs }),
    });
  }

  async queryLogs(params: {
    serviceId?: string;
    level?: string;
    search?: string;
    limit?: number;
  } = {}): Promise<LogEntry[]> {
    const query = new URLSearchParams();
    if (params.serviceId) query.append('service_id', params.serviceId);
    if (params.level && params.level !== 'ALL') query.append('level', params.level);
    if (params.search) query.append('search', params.search);
    if (params.limit) query.append('limit', String(params.limit));

    return this.request<LogEntry[]>(`${API_BASE}/logs/query?${query.toString()}`);
  }

  // --- ML Anomalies ---
  async getAnomalyFeed(limit = 50, serviceId?: string, minScore = 0.0): Promise<AnomalyRecord[]> {
    const params = new URLSearchParams({
      limit: String(limit),
      min_score: String(minScore),
    });
    if (serviceId) params.append('service_id', serviceId);

    return this.request<AnomalyRecord[]>(`${API_BASE}/anomalies/feed?${params.toString()}`);
  }

  // --- RCA Diagnosis ---
  async runRcaDiagnosis(incidentId?: string, lookbackSeconds = 300): Promise<{
    incident_id: string;
    evaluated_at: string;
    candidates_count: number;
    candidates: RcaCandidate[];
  }> {
    return this.request(`${API_BASE}/rca/diagnose`, {
      method: 'POST',
      body: JSON.stringify({
        incident_id: incidentId,
        lookback_seconds: lookbackSeconds,
      }),
    });
  }

  // --- Local Offline AI Diagnosis ---
  async explainIncident(payload: {
    incident: any;
    rcaCandidates: any[];
    anomalies: any[];
    logs: any[];
    topology: any[];
  }): Promise<AiDiagnosisReport> {
    return this.request<AiDiagnosisReport>(`${API_BASE}/ai/explain-incident`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- Remediation Playbooks & Approvals ---
  async getPlaybooks(): Promise<RemediationPlaybook[]> {
    return this.request<RemediationPlaybook[]>(`${API_BASE}/remediation/playbooks`);
  }

  async approveRemediation(payload: {
    incident_id: string;
    recommendation_id: string;
    playbook_id: string;
    action_title: string;
    target_service: string;
    action_type: string;
    approver?: string;
    decision_comment?: string;
  }): Promise<ApprovalAction> {
    return this.request<ApprovalAction>(`${API_BASE}/remediation/approve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async rejectRemediation(payload: {
    incident_id: string;
    recommendation_id: string;
    reason: string;
    approver?: string;
  }): Promise<ApprovalAction> {
    return this.request<ApprovalAction>(`${API_BASE}/remediation/reject`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getRemediationAudit(incidentId?: string, limit = 50): Promise<ApprovalAction[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (incidentId) params.append('incident_id', incidentId);
    return this.request<ApprovalAction[]>(`${API_BASE}/remediation/audit?${params.toString()}`);
  }

  // --- Native Fault Injection ---
  async injectFault(scenario: string, durationSec = 60): Promise<any> {
    return this.request(`${API_BASE}/faults/inject?scenario=${encodeURIComponent(scenario)}&duration_sec=${durationSec}`, {
      method: 'POST',
    });
  }

  async resetFaults(): Promise<any> {
    return this.request(`${API_BASE}/faults/reset`, {
      method: 'POST',
    });
  }
}

export const apiClient = new ApiClient();
