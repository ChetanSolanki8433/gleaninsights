import {
  Microservice,
  ServiceDependency,
  MetricDataPoint,
  LogEntry,
  AnomalyRecord,
  Incident,
  RcaCandidate,
  RemediationRecommendation,
  ApprovalAction,
  FaultScenarioType,
  RemediationPlaybook,
} from '../types';
import { INITIAL_SERVICES, INITIAL_DEPENDENCIES, REMEDIATION_PLAYBOOKS } from './simulator';

export interface SimulationState {
  currentScenario: FaultScenarioType;
  scenarioStartTime: number;
  services: Microservice[];
  dependencies: ServiceDependency[];
  metricsHistory: MetricDataPoint[];
  logsHistory: LogEntry[];
  anomaliesHistory: AnomalyRecord[];
  activeIncident: Incident | null;
  incidentHistory: Incident[];
  rcaCandidates: RcaCandidate[];
  recommendations: RemediationRecommendation[];
  approvalActions: ApprovalAction[];
  benchmarkReport: import('../types').BenchmarkSuiteReport | null;
  isBenchmarking: boolean;
  isPaused: boolean;
  simulationTick: number;
}

/**
 * Calculates synthetic Isolation Forest score, Autoencoder reconstruction error, and Context penalty
 */
export function computeAnomalyScores(
  service: Microservice,
  scenario: FaultScenarioType,
  timeSinceFaultSec: number
): {
  isolationForestScore: number;
  autoencoderReconError: number;
  contextScore: number;
  finalAnomalyScore: number;
  severity: 'normal' | 'suspicious' | 'anomalous' | 'severe';
} {
  const m = service.currentMetrics;
  // Baseline normal values
  const cpuNorm = Math.min(1, Math.max(0, (m.cpuPercent - 20) / 70));
  const memNorm = Math.min(1, Math.max(0, (m.memoryMb / (m.memoryMaxMb || 1024) - 0.25) / 0.7));
  const latNorm = Math.min(1, Math.max(0, (m.latencyP95Ms - 40) / 800));
  const errNorm = Math.min(1, Math.max(0, m.errorRatePercent / 20));
  const dbLatNorm = Math.min(1, Math.max(0, (m.dbQueryLatencyMs - 10) / 500));
  const dbConnNorm = Math.min(1, Math.max(0, (m.dbConnectionsActive / (m.dbConnectionsMax || 50) - 0.3) / 0.7));

  // Feature vector multivariate distance (Isolation forest proxy)
  const multivariateVector = [cpuNorm * 1.3, memNorm * 1.1, latNorm * 1.4, errNorm * 1.5, dbLatNorm * 1.2, dbConnNorm * 1.0];
  const maxFeature = Math.max(...multivariateVector);
  const avgFeature = multivariateVector.reduce((a, b) => a + b, 0) / multivariateVector.length;

  // S_IF: Isolation forest splits isolated anomalies faster (higher score)
  let isolationForestScore = Math.min(0.99, Math.max(0.08, (maxFeature * 0.7 + avgFeature * 0.3) * 0.95 + (Math.random() * 0.04 - 0.02)));

  // S_AE: Autoencoder reconstruction error is sensitive to non-linear co-variance violations
  let autoencoderReconError = Math.min(0.99, Math.max(0.06, (Math.pow(maxFeature, 1.4) * 0.65 + avgFeature * 0.35) * 0.98 + (Math.random() * 0.03 - 0.015)));

  // Context score based on health and restarts
  let contextScore = 0.05;
  if (service.status === 'degraded') contextScore = 0.55;
  if (service.status === 'critical') contextScore = 0.85;
  if (service.status === 'crashed') contextScore = 0.98;

  // Weight combination: S_final = 0.45 * S_IF + 0.35 * S_AE + 0.20 * S_context
  let finalAnomalyScore = 0.45 * isolationForestScore + 0.35 * autoencoderReconError + 0.20 * contextScore;

  if (scenario === 'normal') {
    isolationForestScore = Math.min(0.24, 0.10 + Math.random() * 0.12);
    autoencoderReconError = Math.min(0.22, 0.08 + Math.random() * 0.10);
    contextScore = 0.04;
    finalAnomalyScore = 0.45 * isolationForestScore + 0.35 * autoencoderReconError + 0.20 * contextScore;
  }

  let severity: 'normal' | 'suspicious' | 'anomalous' | 'severe' = 'normal';
  if (finalAnomalyScore >= 0.82) {
    severity = 'severe';
  } else if (finalAnomalyScore >= 0.60) {
    severity = 'anomalous';
  } else if (finalAnomalyScore >= 0.35) {
    severity = 'suspicious';
  }

  return {
    isolationForestScore: Number(isolationForestScore.toFixed(2)),
    autoencoderReconError: Number(autoencoderReconError.toFixed(2)),
    contextScore: Number(contextScore.toFixed(2)),
    finalAnomalyScore: Number(finalAnomalyScore.toFixed(2)),
    severity,
  };
}

/**
 * Executes structured Root Cause Analysis using the specified formula:
 * R = 0.30 * metric_evidence + 0.20 * dependency_impact + 0.20 * temporal_precedence + 0.15 * log_evidence + 0.15 * fault_signature
 */
export function executeStructuredRca(
  incident: Incident,
  services: Microservice[],
  dependencies: ServiceDependency[],
  logs: LogEntry[],
  anomalies: AnomalyRecord[],
  scenario: FaultScenarioType
): { candidates: RcaCandidate[]; recommendations: RemediationRecommendation[] } {
  if (scenario === 'normal' || !incident) {
    return { candidates: [], recommendations: [] };
  }

  const candidates: RcaCandidate[] = [];

  services.forEach((srv) => {
    let metricEvidence = 0;
    let dependencyImpact = 0;
    let temporalPrecedence = 0;
    let logEvidence = 0;
    let faultSignature = 0;
    let faultSignatureMatched = 'Nominal operational pattern';
    let leadLagRelationship = 'Normal follower';

    const evidenceItems: { type: 'metric' | 'log' | 'topology' | 'timing'; description: string; severity: 'info' | 'warn' | 'error'; value?: string }[] = [];
    const srvLogs = logs.filter((l) => l.serviceId === srv.id);
    const errorLogs = srvLogs.filter((l) => l.level === 'ERROR' || l.level === 'FATAL');
    const srvAnomalies = anomalies.filter((a) => a.serviceId === srv.id && a.severity !== 'normal');

    // 1. Metric Evidence (0 - 100)
    const m = srv.currentMetrics;
    let metricScoreAccum = 0;
    if (m.cpuPercent > 80) {
      metricScoreAccum += 35;
      evidenceItems.push({ type: 'metric', description: `Severe CPU compute utilization: ${m.cpuPercent.toFixed(2)}%`, severity: 'error', value: `${m.cpuPercent.toFixed(2)}%` });
    } else if (m.cpuPercent > 50) {
      metricScoreAccum += 15;
    }

    if (m.memoryMb / (m.memoryMaxMb || 1024) > 0.85) {
      metricScoreAccum += 35;
      evidenceItems.push({ type: 'metric', description: `Memory heap exhaustion: ${m.memoryMb.toFixed(2)}MB / ${(m.memoryMaxMb || 1024).toFixed(2)}MB (${((m.memoryMb / (m.memoryMaxMb || 1024)) * 100).toFixed(2)}%)`, severity: 'error', value: `${m.memoryMb.toFixed(2)}MB` });
    }

    if (m.latencyP95Ms > 500) {
      metricScoreAccum += 30;
      evidenceItems.push({ type: 'metric', description: `Excessive request latency p95: ${m.latencyP95Ms.toFixed(2)}ms`, severity: 'error', value: `${m.latencyP95Ms.toFixed(2)}ms` });
    }

    if (m.errorRatePercent > 5) {
      metricScoreAccum += 30;
      evidenceItems.push({ type: 'metric', description: `High request error rate: ${m.errorRatePercent.toFixed(2)}%`, severity: 'error', value: `${m.errorRatePercent.toFixed(2)}%` });
    }

    if (m.dbQueryLatencyMs > 200) {
      metricScoreAccum += 35;
      evidenceItems.push({ type: 'metric', description: `Database query slowdown: ${m.dbQueryLatencyMs.toFixed(2)}ms`, severity: 'error', value: `${m.dbQueryLatencyMs.toFixed(2)}ms` });
    }

    if (m.dbConnectionsActive / (m.dbConnectionsMax || 50) > 0.85) {
      metricScoreAccum += 35;
      evidenceItems.push({ type: 'metric', description: `Database connection pool exhaustion: ${m.dbConnectionsActive}/${m.dbConnectionsMax}`, severity: 'error', value: `${m.dbConnectionsActive}` });
    }
    metricEvidence = Math.min(100, metricScoreAccum);

    // 2. Dependency Impact (0 - 100)
    const outgoingDeps = dependencies.filter((d) => d.sourceServiceId === srv.id && d.isImpacted);
    const incomingDeps = dependencies.filter((d) => d.targetServiceId === srv.id && d.isImpacted);
    if (outgoingDeps.length > 0) {
      dependencyImpact += outgoingDeps.length * 28;
      evidenceItems.push({
        type: 'topology',
        description: `Downstream service dependencies stalled: ${outgoingDeps.map((d) => d.targetName).join(', ')}`,
        severity: 'warn',
      });
    }
    if (incomingDeps.length > 0) {
      dependencyImpact += incomingDeps.length * 20;
    }
    dependencyImpact = Math.min(100, dependencyImpact);

    // 3. Temporal Precedence (0 - 100)
    if (srvAnomalies.length > 0) {
      const firstAnomaly = srvAnomalies[0];
      const earliestAnomalyTime = Math.min(...anomalies.map((a) => a.detectedAtMs));
      const deltaSec = (firstAnomaly.detectedAtMs - earliestAnomalyTime) / 1000;
      if (deltaSec < 5) {
        temporalPrecedence = 95;
        leadLagRelationship = 'Leading indicator (T+0s origin)';
        evidenceItems.push({ type: 'timing', description: 'Earliest anomaly onset timestamp in cluster timeline (Leading T+0s)', severity: 'error' });
      } else if (deltaSec < 15) {
        temporalPrecedence = 60;
        leadLagRelationship = `Secondary follower (T+${deltaSec.toFixed(0)}s)`;
      } else {
        temporalPrecedence = 25;
        leadLagRelationship = `Downstream cascade recipient (T+${deltaSec.toFixed(0)}s)`;
      }
    } else {
      temporalPrecedence = 10;
    }

    // 4. Log Evidence (0 - 100)
    if (errorLogs.length > 0) {
      logEvidence = Math.min(100, errorLogs.length * 20);
      const topException = errorLogs[0].exceptionType || 'RuntimeError';
      evidenceItems.push({
        type: 'log',
        description: `Matching critical log signature: ${topException} (${errorLogs.length} occurrences)`,
        severity: 'error',
        value: topException,
      });
    } else {
      logEvidence = 10;
    }

    // 5. Fault Signature (0 - 100)
    if (scenario === 'cpu_saturation_order' && srv.id === 'order-service') {
      faultSignature = 96;
      faultSignatureMatched = 'SIG-CPU-SATURATION: Elevated CPU (96%) + Latency spike + Thread pool queue saturation';
    } else if (scenario === 'memory_leak_user' && srv.id === 'user-service') {
      faultSignature = 98;
      faultSignatureMatched = 'SIG-MEM-LEAK: Monotonic heap growth + GC pauses exceeding 300ms + Near-OOM';
    } else if (scenario === 'database_latency_order' && (srv.id === 'order-service' || srv.id === 'inventory-service')) {
      faultSignature = srv.id === 'order-service' ? 95 : 65;
      faultSignatureMatched = 'SIG-DB-SLOW-QUERY: PostgreSQL query latency > 1500ms on unindexed table scan';
    } else if (scenario === 'db_connection_exhaustion' && srv.id === 'payment-service') {
      faultSignature = 97;
      faultSignatureMatched = 'SIG-DB-POOL-LEAK: Active connections pegged at 98% pool ceiling + timeout exceptions';
    } else if (scenario === 'service_crash_payment' && srv.id === 'payment-service') {
      faultSignature = 100;
      faultSignatureMatched = 'SIG-PROC-CRASH: Process exit / zero health probe + 503 response flood';
    } else if (scenario === 'network_latency_inventory' && srv.id === 'inventory-service') {
      faultSignature = 94;
      faultSignatureMatched = 'SIG-NET-DELAY: Elevated roundtrip latency (1200ms) with normal local host CPU (18%)';
    } else if (scenario === 'slow_payment_gateway' && srv.id === 'payment-service') {
      faultSignature = 96;
      faultSignatureMatched = 'SIG-EXT-GW-TIMEOUT: Downstream third-party payment partner clearing latency > 4000ms';
    } else if (scenario === 'cascading_failure_chain') {
      if (srv.id === 'order-service') {
        faultSignature = 94;
        faultSignatureMatched = 'SIG-CASCADE-ORIGIN: Upstream retry storm initiation';
      } else {
        faultSignature = 70;
        faultSignatureMatched = 'SIG-CASCADE-VICTIM: Downstream queue exhaustion via propagated retry load';
      }
    } else {
      faultSignature = Math.max(10, Math.floor(metricEvidence * 0.4));
    }

    // Weighted Formula:
    // R = 0.30 * metric_evidence + 0.20 * dependency_impact + 0.20 * temporal_precedence + 0.15 * log_evidence + 0.15 * fault_signature
    const overallScore = Math.round(
      0.30 * metricEvidence +
      0.20 * dependencyImpact +
      0.20 * temporalPrecedence +
      0.15 * logEvidence +
      0.15 * faultSignature
    );

    if (overallScore > 15 || srvAnomalies.length > 0) {
      candidates.push({
        id: `rca-${incident.id}-${srv.id}`,
        incidentId: incident.id,
        candidateServiceId: srv.id,
        candidateServiceName: srv.name,
        candidateType: srv.name + ' Fault Hypothesis',
        rank: 0,
        score: overallScore,
        scoreBreakdown: {
          metricEvidence,
          dependencyImpact,
          temporalPrecedence,
          logEvidence,
          faultSignature,
        },
        evidenceSummary: `${evidenceItems.length} primary evidence factors identified. Lead: ${leadLagRelationship}.`,
        evidenceItems,
        faultSignatureMatched,
        leadLagRelationship,
        confidence: Math.min(99, Math.max(45, Math.round(overallScore * 0.96 + 2))),
      });
    }
  });

  // Sort candidates by score descending and assign rank
  candidates.sort((a, b) => b.score - a.score);
  candidates.forEach((c, idx) => {
    c.rank = idx + 1;
  });

  // Generate matched remediation recommendations from Playbooks
  const recommendations: RemediationRecommendation[] = [];
  if (candidates.length > 0) {
    const topCandidate = candidates[0];
    const matchingPlaybook = findPlaybookForScenario(scenario, topCandidate.candidateServiceId);
    if (matchingPlaybook) {
      recommendations.push({
        id: `rec-${matchingPlaybook.id}-${incident.id}`,
        incidentId: incident.id,
        rootCauseCandidateId: topCandidate.id,
        playbookId: matchingPlaybook.id,
        title: matchingPlaybook.title,
        actionType: matchingPlaybook.actionType,
        recommendationText: matchingPlaybook.recommendationText,
        isSafeAuto: matchingPlaybook.safeAutoAction,
        approvalRequired: matchingPlaybook.approvalRequired,
        confidence: topCandidate.confidence,
        riskLevel: matchingPlaybook.safeAutoAction ? 'Low' : 'Medium',
        affectedService: topCandidate.candidateServiceName,
        status: 'proposed',
        createdAt: new Date().toISOString(),
      });
    }
  }

  return { candidates, recommendations };
}

function findPlaybookForScenario(scenario: FaultScenarioType, serviceId: string): RemediationPlaybook | undefined {
  switch (scenario) {
    case 'cpu_saturation_order':
      return REMEDIATION_PLAYBOOKS.find((p) => p.id === 'pb-cpu-scale');
    case 'memory_leak_user':
      return REMEDIATION_PLAYBOOKS.find((p) => p.id === 'pb-mem-restart');
    case 'database_latency_order':
      return REMEDIATION_PLAYBOOKS.find((p) => p.id === 'pb-db-index');
    case 'db_connection_exhaustion':
      return REMEDIATION_PLAYBOOKS.find((p) => p.id === 'pb-pool-resize');
    case 'service_crash_payment':
      return REMEDIATION_PLAYBOOKS.find((p) => p.id === 'pb-crash-recover');
    case 'network_latency_inventory':
      return REMEDIATION_PLAYBOOKS.find((p) => p.id === 'pb-net-cache');
    case 'slow_payment_gateway':
      return REMEDIATION_PLAYBOOKS.find((p) => p.id === 'pb-gateway-breaker');
    case 'cascading_failure_chain':
      return REMEDIATION_PLAYBOOKS.find((p) => p.id === 'pb-cascade-throttle');
    default:
      return REMEDIATION_PLAYBOOKS[0];
  }
}
