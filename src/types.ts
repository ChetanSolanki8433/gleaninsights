/**
 * Core types for the Microservice Observability & RCA Platform
 */

export type ServiceHealthStatus = 'healthy' | 'degraded' | 'critical' | 'crashed' | 'maintenance';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'active' | 'investigating' | 'mitigating' | 'resolved';

export type IncidentLifecycleStage =
  | 'anomaly_detected'
  | 'incident_created'
  | 'rca_ranking'
  | 'evidence_assembly'
  | 'diagnosis_generated'
  | 'remediation_recommended'
  | 'operator_approval'
  | 'recovery_executing'
  | 'verified_closed';

export interface IncidentLifecycleEvent {
  stage: IncidentLifecycleStage;
  label: string;
  timestamp: string;
  timestampMs: number;
  description: string;
  status: 'completed' | 'in_progress' | 'pending';
  actor?: 'ML Anomaly Detector' | 'RCA Engine' | 'Gemini AI' | 'SRE Operator' | 'Automator' | 'Closed-Loop Verifier';
}

export interface OperatorComment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export interface Microservice {
  id: string;
  name: string;
  version: string;
  status: ServiceHealthStatus;
  instanceCount: number;
  uptimeSeconds: number;
  description: string;
  language: string;
  framework: string;
  database: string;
  endpoints: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
    description: string;
    avgLatencyMs: number;
  }[];
  currentMetrics: {
    cpuPercent: number;
    memoryMb: number;
    memoryMaxMb: number;
    requestRate: number; // req/sec
    latencyP50Ms: number;
    latencyP95Ms: number;
    latencyP99Ms: number;
    errorRatePercent: number;
    dbQueryLatencyMs: number;
    dbConnectionsActive: number;
    dbConnectionsMax: number;
    queueBacklog?: number;
    restartCount: number;
  };
}

export interface ServiceDependency {
  id: string;
  sourceServiceId: string;
  targetServiceId: string;
  sourceName: string;
  targetName: string;
  dependencyType: 'http' | 'database' | 'queue' | 'external_gateway';
  endpoint?: string;
  avgLatencyMs: number;
  callRatePerMin: number;
  failureRatePercent: number;
  isImpacted: boolean;
  status: 'normal' | 'slow' | 'failing';
}

export interface MetricDataPoint {
  timestamp: string;
  timestampMs: number;
  serviceId: string;
  cpuPercent: number;
  memoryMb: number;
  requestRate: number;
  latencyP95Ms: number;
  errorRatePercent: number;
  dbLatencyMs: number;
  dbConnections: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  timestampMs: number;
  serviceId: string;
  serviceName: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  message: string;
  requestId: string;
  traceId: string;
  endpoint: string;
  exceptionType?: string;
  durationMs?: number;
  statusCode?: number;
  metadata?: Record<string, any>;
}

export interface AnomalyRecord {
  id: string;
  serviceId: string;
  serviceName: string;
  metricName: string;
  isolationForestScore: number;
  autoencoderReconError: number;
  contextScore: number;
  finalAnomalyScore: number;
  threshold: number;
  severity: 'normal' | 'suspicious' | 'anomalous' | 'severe';
  detectedAt: string;
  detectedAtMs: number;
  details: string;
}

export interface Incident {
  id: string;
  serviceId: string;
  serviceName: string;
  title: string;
  incidentType: string;
  startTime: string;
  startTimeMs: number;
  endTime?: string;
  endTimeMs?: number;
  severity: IncidentSeverity;
  status: IncidentStatus;
  currentStage: IncidentLifecycleStage;
  lifecycleTimeline: IncidentLifecycleEvent[];
  summary: string;
  confidenceScore: number;
  affectedServices: string[];
  anomaliesDetected: number;
  primaryMetricImpacted: string;
  operatorComments: OperatorComment[];
  resolutionSummary?: string;
  mttdSeconds?: number;
  mttrSeconds?: number;
  rootCauseService?: string;
  remediationActionTaken?: string;
}

export interface RcaCandidate {
  id: string;
  incidentId: string;
  candidateServiceId: string;
  candidateServiceName: string;
  candidateType: string;
  rank: number;
  score: number;
  scoreBreakdown: {
    metricEvidence: number;
    dependencyImpact: number;
    temporalPrecedence: number;
    logEvidence: number;
    faultSignature: number;
  };
  evidenceSummary: string;
  evidenceItems: {
    type: 'metric' | 'log' | 'topology' | 'timing';
    description: string;
    severity: 'info' | 'warn' | 'error';
    value?: string;
  }[];
  faultSignatureMatched: string;
  leadLagRelationship: string;
  confidence: number;
}

export interface AiDiagnosisReport {
  incidentId: string;
  executiveSummary: string;
  probableRootCause: string;
  evidenceChain: {
    source: string;
    telemetryFact: string;
    correlation: string;
  }[];
  dependencyImpactDescription: string;
  confidenceScore: number;
  confidenceJustification: string;
  limitations: string[];
  generatedAt: string;
  modelUsed: string;
}

export interface RemediationPlaybook {
  id: string;
  failureType: string;
  rootCauseType: string;
  title: string;
  recommendationText: string;
  actionType: 'restart_service' | 'clear_cache' | 'scale_out_replica' | 'increase_db_pool' | 'enable_circuit_breaker' | 'optimize_query_index' | 'throttle_requests';
  category: 'automated_safe' | 'manual_operational';
  safeAutoAction: boolean;
  approvalRequired: boolean;
  priority: 'P1' | 'P2' | 'P3';
  estimatedRecoveryTimeSec: number;
  steps: string[];
}

export interface RemediationRecommendation {
  id: string;
  incidentId: string;
  rootCauseCandidateId: string;
  playbookId: string;
  title: string;
  actionType: string;
  recommendationText: string;
  isSafeAuto: boolean;
  approvalRequired: boolean;
  confidence: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  affectedService: string;
  status: 'proposed' | 'approved' | 'rejected' | 'executing' | 'executed' | 'failed';
  createdAt: string;
}

export interface ApprovalAction {
  id: string;
  incidentId: string;
  recommendationId: string;
  actionTitle: string;
  targetService: string;
  actionType: string;
  approver?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  decisionComment?: string;
  createdAt: string;
  executedAt?: string;
  verificationStatus?: 'verifying' | 'verified_healthy' | 'unresolved';
  executionLogs: string[];
}

export type FaultScenarioType =
  | 'normal'
  | 'cpu_saturation_order'
  | 'memory_leak_user'
  | 'database_latency_order'
  | 'db_connection_exhaustion'
  | 'service_crash_payment'
  | 'network_latency_inventory'
  | 'slow_payment_gateway'
  | 'cascading_failure_chain';

export type ScenarioType = FaultScenarioType;

export interface FaultScenarioMeta {
  id: FaultScenarioType;
  title: string;
  targetService: string;
  category: string;
  description: string;
  telemetrySignatures: string[];
  expectedTopRootCause: string;
  recommendedPlaybook: string;
  safeRecoveryAction: string;
}

export interface BenchmarkRunResult {
  scenarioId: FaultScenarioType;
  scenarioTitle: string;
  groundTruthCause: string;
  detectedTopCause: string;
  detectedRank: number;
  detectionLatencyMs: number;
  confidenceScore: number;
  isCorrectTop1: boolean;
  isCorrectTop3: boolean;
  precision: number;
  recall: number;
  f1Score: number;
  remediationMatched: boolean;
}

export interface BenchmarkSuiteReport {
  totalScenarios: number;
  top1Accuracy: number;
  top3Accuracy: number;
  avgDetectionLatencyMs: number;
  precision: number;
  recall: number;
  f1Score: number;
  mttdSeconds: number;
  mttrSeconds: number;
  results: BenchmarkRunResult[];
  executedAt: string;
}

export interface DemoScriptStep {
  stepNumber: number;
  title: string;
  stageName: string;
  targetTab: string;
  scenario?: FaultScenarioType;
  actionRequired?: 'inject' | 'inspect_topology' | 'inspect_rca' | 'run_ai_diagnosis' | 'approve_remediation' | 'verify_recovery' | 'none';
  narration: string;
  keyTakeaway: string;
  evidenceAnchor?: string;
}
