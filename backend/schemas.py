import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

# --- Telemetry Metric Schemas ---
class TelemetryMetricBase(BaseModel):
    service_id: str
    service_name: str
    cpu_percent: float = Field(..., ge=0.0, le=100.0)
    memory_mb: float = Field(..., ge=0.0)
    request_rate: float = Field(default=0.0, ge=0.0)
    latency_p95_ms: float = Field(..., ge=0.0)
    error_rate_percent: float = Field(default=0.0, ge=0.0, le=100.0)
    db_query_latency_ms: float = Field(default=0.0, ge=0.0)
    db_connections: int = Field(default=0, ge=0)
    queue_backlog: int = Field(default=0, ge=0)
    source: Optional[str] = "collector"

class TelemetryMetricCreate(TelemetryMetricBase):
    timestamp: Optional[datetime.datetime] = None

class TelemetryMetricResponse(TelemetryMetricBase):
    id: int
    timestamp: datetime.datetime
    model_config = ConfigDict(from_attributes=True)

class IngestMetricsBatchRequest(BaseModel):
    metrics: List[TelemetryMetricCreate]


# --- Structured Log Schemas ---
class LogEntryCreate(BaseModel):
    id: Optional[str] = None
    timestamp: Optional[datetime.datetime] = None
    service_id: str
    service_name: str
    level: str = Field(..., pattern="^(DEBUG|INFO|WARN|ERROR|FATAL)$")
    message: str
    request_id: Optional[str] = None
    trace_id: Optional[str] = None
    endpoint: Optional[str] = None
    exception_type: Optional[str] = None
    duration_ms: Optional[float] = None
    status_code: Optional[int] = None
    extra_metadata: Optional[Dict[str, Any]] = None

class LogEntryResponse(BaseModel):
    id: str
    timestamp: datetime.datetime
    service_id: str
    service_name: str
    level: str
    message: str
    request_id: Optional[str] = None
    trace_id: Optional[str] = None
    endpoint: Optional[str] = None
    exception_type: Optional[str] = None
    duration_ms: Optional[float] = None
    status_code: Optional[int] = None
    extra_metadata: Optional[Dict[str, Any]] = None
    model_config = ConfigDict(from_attributes=True)

class IngestLogsBatchRequest(BaseModel):
    logs: List[LogEntryCreate]


# --- Anomaly Schemas ---
class AnomalyEventResponse(BaseModel):
    id: str
    detected_at: datetime.datetime
    service_id: str
    service_name: str
    metric_name: str
    isolation_forest_score: float
    autoencoder_recon_error: float
    context_score: float
    final_anomaly_score: float
    threshold: float
    severity: str
    details: Optional[str] = None
    incident_id: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class AnomalyThresholdUpdate(BaseModel):
    threshold: float = Field(..., ge=0.1, le=0.99)
    if_weight: float = Field(default=0.45, ge=0.0, le=1.0)
    ae_weight: float = Field(default=0.35, ge=0.0, le=1.0)
    context_weight: float = Field(default=0.20, ge=0.0, le=1.0)


# --- RCA Schemas ---
class RcaScoreBreakdown(BaseModel):
    metricEvidence: float
    dependencyImpact: float
    temporalPrecedence: float
    logEvidence: float
    faultSignature: float

class EvidenceItem(BaseModel):
    type: str # 'metric' | 'log' | 'topology' | 'timing'
    description: str
    severity: str # 'info' | 'warn' | 'error'
    value: Optional[str] = None

class RcaCandidateResponse(BaseModel):
    id: str
    incident_id: str
    candidate_service_id: str
    candidate_service_name: str
    candidate_type: str
    rank: int
    score: float
    score_breakdown: RcaScoreBreakdown
    evidence_summary: str
    evidence_items: List[EvidenceItem]
    fault_signature_matched: str
    lead_lag_relationship: str
    confidence: float

class DiagnoseIncidentRequest(BaseModel):
    incident_id: Optional[str] = None
    service_id: Optional[str] = None
    lookback_seconds: int = Field(default=300, ge=30, le=3600)


# --- Offline AI Explanation Schemas ---
class EvidenceChainItem(BaseModel):
    source: str
    telemetryFact: str
    correlation: str

class AiDiagnosisReportResponse(BaseModel):
    incidentId: str
    executiveSummary: str
    probableRootCause: str
    evidenceChain: List[EvidenceChainItem]
    dependencyImpactDescription: str
    confidenceScore: float
    confidenceJustification: str
    limitations: List[str]
    generatedAt: str
    modelUsed: str


# --- Incident Schemas ---
class IncidentResponse(BaseModel):
    id: str
    service_id: str
    service_name: str
    title: str
    incident_type: str
    start_time: datetime.datetime
    end_time: Optional[datetime.datetime] = None
    severity: str
    status: str
    current_stage: str
    summary: Optional[str] = None
    confidence_score: float
    affected_services: List[str] = []
    anomalies_detected: int = 0
    primary_metric_impacted: Optional[str] = None
    mttd_seconds: Optional[float] = None
    mttr_seconds: Optional[float] = None
    root_cause_service: Optional[str] = None
    remediation_action_taken: Optional[str] = None
    lifecycle_timeline: List[Dict[str, Any]] = []
    operator_comments: List[Dict[str, Any]] = []
    model_config = ConfigDict(from_attributes=True)


# --- Remediation Schemas ---
class RemediationPlaybookResponse(BaseModel):
    id: str
    failureType: str
    rootCauseType: str
    title: str
    recommendationText: str
    actionType: str
    category: str
    safeAutoAction: bool
    approvalRequired: bool
    priority: str
    estimatedRecoveryTimeSec: int
    steps: List[str]

class RemediationApprovalRequest(BaseModel):
    incident_id: str
    recommendation_id: str
    playbook_id: str
    action_title: str
    target_service: str
    action_type: str
    approver: Optional[str] = "SRE On-Call Operator"
    decision_comment: Optional[str] = "Approved after telemetry validation"

class RemediationRejectRequest(BaseModel):
    incident_id: str
    recommendation_id: str
    reason: str
    approver: Optional[str] = "SRE On-Call Operator"

class RemediationAuditResponse(BaseModel):
    id: str
    incident_id: str
    recommendation_id: str
    playbook_id: str
    action_title: str
    target_service: str
    action_type: str
    approver: str
    status: str
    decision_comment: Optional[str] = None
    created_at: datetime.datetime
    executed_at: Optional[datetime.datetime] = None
    verification_status: str
    execution_logs: List[str] = []
    model_config = ConfigDict(from_attributes=True)

class FaultInjectionRequest(BaseModel):
    scenario: str
    intensity: Optional[float] = 1.0
    duration_seconds: Optional[int] = 120
