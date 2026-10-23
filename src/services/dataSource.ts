import { SimulationState } from './rcaEngine';
import { 
  FaultScenarioType, 
  AiDiagnosisReport, 
  BenchmarkSuiteReport,
  Microservice,
  Incident,
  ApprovalAction,
} from '../types';
import { simulationManager } from './simulationStore';
import { apiClient } from './apiClient';

export type DataSourceMode = 'simulator' | 'api';

export const DATA_SOURCE: DataSourceMode = ((import.meta as any).env.VITE_DATA_SOURCE as DataSourceMode) || 'simulator';

export interface DataSourceAdapter {
  getState(): SimulationState;
  subscribe(listener: (state: SimulationState) => void): () => void;
  setScenario(scenario: FaultScenarioType): void;
  resetToNominal(): void;
  toggleRunning(): void;
  approveRemediation(id: string, approver?: string): void;
  rejectRemediation(id: string, reason: string): void;
  getAiDiagnosis(): AiDiagnosisReport | null;
  setAiDiagnosis(diagnosis: AiDiagnosisReport | null): void;
  addOperatorComment(incidentId: string, author: string, text: string): void;
  runBenchmarkSuite(): Promise<BenchmarkSuiteReport>;
}

class SimulatorDataSource implements DataSourceAdapter {
  getState() {
    return simulationManager.getState();
  }
  subscribe(listener: (state: SimulationState) => void) {
    return simulationManager.subscribe(listener);
  }
  setScenario(scenario: FaultScenarioType) {
    simulationManager.setScenario(scenario);
  }
  resetToNominal() {
    simulationManager.resetToNominal();
  }
  toggleRunning() {
    simulationManager.toggleRunning();
  }
  approveRemediation(id: string, approver?: string) {
    simulationManager.approveRemediation(id, approver);
  }
  rejectRemediation(id: string, reason: string) {
    simulationManager.rejectRemediation(id, reason);
  }
  getAiDiagnosis() {
    return simulationManager.getAiDiagnosis();
  }
  setAiDiagnosis(diagnosis: AiDiagnosisReport | null) {
    simulationManager.setAiDiagnosis(diagnosis);
  }
  addOperatorComment(incidentId: string, author: string, text: string) {
    simulationManager.addOperatorComment(incidentId, author, text);
  }
  runBenchmarkSuite() {
    return simulationManager.runBenchmarkSuite();
  }
}

// Convert python snake_case state to frontend camelCase SimulationState
function transformApiState(apiData: any, aiDiagnosis: AiDiagnosisReport | null): SimulationState {
  return {
    currentScenario: apiData.current_scenario || 'normal',
    scenarioStartTime: apiData.scenario_start_time || Date.now(),
    services: (apiData.services || []).map((s: any) => ({
      ...s,
      errorRate: s.error_rate !== undefined ? s.error_rate : s.errorRate,
    })),
    dependencies: apiData.dependencies || [],
    metricsHistory: apiData.metrics_history || [],
    logsHistory: apiData.logs_history || [],
    anomaliesHistory: apiData.anomalies_history || [],
    activeIncident: apiData.active_incident || null,
    incidentHistory: apiData.incident_history || [],
    rcaCandidates: apiData.rca_candidates || [],
    recommendations: apiData.recommendations || [],
    approvalActions: apiData.approval_actions || [],
    benchmarkReport: apiData.benchmark_report || null,
    isBenchmarking: apiData.is_benchmarking || false,
    isPaused: apiData.is_paused || false,
    simulationTick: apiData.simulation_tick || 0,
  };
}

class ApiDataSource implements DataSourceAdapter {
  private state: SimulationState;
  private listeners: Set<(state: SimulationState) => void> = new Set();
  private timer: number | null = null;
  private servicesTimer: number | null = null;
  private aiDiagnosis: AiDiagnosisReport | null = null;

  constructor() {
    // Initialize with a fallback state
    this.state = {
      currentScenario: 'normal',
      scenarioStartTime: Date.now(),
      services: [],
      dependencies: [],
      metricsHistory: [],
      logsHistory: [],
      anomaliesHistory: [],
      activeIncident: null,
      incidentHistory: [],
      rcaCandidates: [],
      recommendations: [],
      approvalActions: [],
      benchmarkReport: null,
      isBenchmarking: false,
      isPaused: false,
      simulationTick: 0,
    };
    
    this.startPolling();
  }

  private startPolling() {
    // Poll simulation state every 2 seconds
    this.timer = window.setInterval(async () => {
      try {
        const rawState = await (apiClient as any).request('/api/v1/simulation/state');
        this.state = transformApiState(rawState, this.aiDiagnosis);
        this.notifyListeners();
      } catch (err) {
        console.error('Failed to fetch simulation state:', err);
      }
    }, 2000);

    // Poll services less frequently or same (as requested: "every 2 seconds to get current state, poll services to get service data")
    this.servicesTimer = window.setInterval(async () => {
      try {
        const rawServices = await (apiClient as any).request('/api/v1/simulation/services');
        if (Array.isArray(rawServices)) {
          this.state.services = rawServices.map(s => ({
            ...s,
            errorRate: s.error_rate !== undefined ? s.error_rate : s.errorRate,
          }));
          this.notifyListeners();
        }
      } catch (err) {
        console.error('Failed to fetch services:', err);
      }
    }, 2000);
  }

  private notifyListeners() {
    this.listeners.forEach(l => l(this.state));
  }

  getState() {
    return this.state;
  }

  subscribe(listener: (state: SimulationState) => void) {
    this.listeners.add(listener);
    listener(this.state); // Immediate initial sync
    return () => {
      this.listeners.delete(listener);
    };
  }

  async setScenario(scenario: FaultScenarioType) {
    try {
      await (apiClient as any).request('/api/v1/simulation/scenario', {
        method: 'POST',
        body: JSON.stringify({ scenario }),
      });
      this.state.currentScenario = scenario;
      this.notifyListeners();
    } catch (err) {
      console.error('Failed to set scenario:', err);
    }
  }

  async resetToNominal() {
    try {
      await (apiClient as any).request('/api/v1/simulation/reset', {
        method: 'POST',
      });
      this.state.currentScenario = 'normal';
      this.notifyListeners();
    } catch (err) {
      console.error('Failed to reset simulation:', err);
    }
  }

  async toggleRunning() {
    try {
      const isPaused = this.state.isPaused;
      const endpoint = isPaused ? '/api/v1/simulation/start' : '/api/v1/simulation/stop';
      await (apiClient as any).request(endpoint, {
        method: 'POST',
      });
      this.state.isPaused = !isPaused;
      this.notifyListeners();
    } catch (err) {
      console.error('Failed to toggle simulation running state:', err);
    }
  }

  async approveRemediation(id: string, approver = 'Operator') {
    try {
      // Find candidate
      const recommendation = this.state.recommendations.find(r => r.id === id);
      if (!recommendation) return;
      await apiClient.approveRemediation({
        incident_id: recommendation.incidentId,
        recommendation_id: recommendation.id,
        playbook_id: recommendation.playbookId,
        action_title: recommendation.title,
        target_service: 'cluster',
        action_type: 'automation',
        approver,
      });
      // Optimistic update if needed, but state polling should catch it
    } catch (err) {
      console.error('Failed to approve remediation:', err);
    }
  }

  async rejectRemediation(id: string, reason: string) {
    try {
      const recommendation = this.state.recommendations.find(r => r.id === id);
      if (!recommendation) return;
      await apiClient.rejectRemediation({
        incident_id: recommendation.incidentId,
        recommendation_id: recommendation.id,
        reason,
        approver: 'Operator',
      });
    } catch (err) {
      console.error('Failed to reject remediation:', err);
    }
  }

  getAiDiagnosis() {
    return this.aiDiagnosis;
  }

  setAiDiagnosis(diagnosis: AiDiagnosisReport | null) {
    this.aiDiagnosis = diagnosis;
    this.notifyListeners();
  }

  async addOperatorComment(incidentId: string, author: string, text: string) {
    try {
      await (apiClient as any).request(`/api/v1/simulation/incidents/${incidentId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ author, text }),
      });
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  }

  async runBenchmarkSuite(): Promise<BenchmarkSuiteReport> {
    try {
      return await apiClient.runEvaluationSuite();
    } catch (err) {
      console.error('Failed to run benchmark suite:', err);
      return {
        executedAt: new Date().toISOString(),
        totalScenarios: 0,
        top1Accuracy: 0,
        top3Accuracy: 0,
        avgDetectionLatencyMs: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        mttdSeconds: 0,
        mttrSeconds: 0,
        results: [],
      };
    }
  }
}

export const dataSource: DataSourceAdapter = DATA_SOURCE === 'api' 
  ? new ApiDataSource() 
  : new SimulatorDataSource();
