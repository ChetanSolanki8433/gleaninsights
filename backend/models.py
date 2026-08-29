import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from backend.database import Base

class TelemetryMetric(Base):
    __tablename__ = "telemetry_metrics"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    service_id = Column(String(64), index=True, nullable=False)
    service_name = Column(String(128), nullable=False)
    cpu_percent = Column(Float, nullable=False)
    memory_mb = Column(Float, nullable=False)
    request_rate = Column(Float, default=0.0)
    latency_p95_ms = Column(Float, nullable=False)
    error_rate_percent = Column(Float, default=0.0)
    db_query_latency_ms = Column(Float, default=0.0)
    db_connections = Column(Integer, default=0)
    queue_backlog = Column(Integer, default=0)
    source = Column(String(32), default="collector") # "host", "synthetic", "prometheus"


class LogEntry(Base):
    __tablename__ = "log_entries"

    id = Column(String(64), primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    service_id = Column(String(64), index=True, nullable=False)
    service_name = Column(String(128), nullable=False)
    level = Column(String(16), index=True, nullable=False) # DEBUG, INFO, WARN, ERROR, FATAL
    message = Column(Text, nullable=False)
    request_id = Column(String(64), index=True)
    trace_id = Column(String(64), index=True)
    endpoint = Column(String(256))
    exception_type = Column(String(128))
    duration_ms = Column(Float)
    status_code = Column(Integer)
    extra_metadata = Column(JSON, default={})


class AnomalyEvent(Base):
    __tablename__ = "anomaly_events"

    id = Column(String(64), primary_key=True, index=True)
    detected_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    service_id = Column(String(64), index=True, nullable=False)
    service_name = Column(String(128), nullable=False)
    metric_name = Column(String(64), nullable=False)
    isolation_forest_score = Column(Float, nullable=False)
    autoencoder_recon_error = Column(Float, nullable=False)
    context_score = Column(Float, nullable=False)
    final_anomaly_score = Column(Float, nullable=False, index=True)
    threshold = Column(Float, default=0.60)
    severity = Column(String(32), nullable=False) # normal, suspicious, anomalous, severe
    details = Column(Text)
    incident_id = Column(String(64), ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True)


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String(64), primary_key=True, index=True)
    service_id = Column(String(64), nullable=False)
    service_name = Column(String(128), nullable=False)
    title = Column(String(256), nullable=False)
    incident_type = Column(String(128), nullable=False)
    start_time = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    end_time = Column(DateTime, nullable=True)
    severity = Column(String(32), default="high") # low, medium, high, critical
    status = Column(String(32), default="active", index=True) # active, investigating, mitigating, resolved
    current_stage = Column(String(64), default="anomaly_detected")
    summary = Column(Text)
    confidence_score = Column(Float, default=90.0)
    affected_services = Column(JSON, default=[])
    anomalies_detected = Column(Integer, default=0)
    primary_metric_impacted = Column(String(64))
    mttd_seconds = Column(Float, default=0.0)
    mttr_seconds = Column(Float, nullable=True)
    root_cause_service = Column(String(128))
    remediation_action_taken = Column(String(256))
    lifecycle_timeline = Column(JSON, default=[])
    operator_comments = Column(JSON, default=[])

    anomalies = relationship("AnomalyEvent", backref="incident", lazy="select")
    rca_results = relationship("RcaResult", backref="incident", cascade="all, delete-orphan")


class RcaResult(Base):
    __tablename__ = "rca_results"

    id = Column(String(64), primary_key=True, index=True)
    incident_id = Column(String(64), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False)
    candidate_service_id = Column(String(64), nullable=False)
    candidate_service_name = Column(String(128), nullable=False)
    candidate_type = Column(String(64), default="microservice")
    rank = Column(Integer, nullable=False)
    score = Column(Float, nullable=False) # 0-100 overall score
    metric_evidence_score = Column(Float, default=0.0)
    dependency_impact_score = Column(Float, default=0.0)
    temporal_precedence_score = Column(Float, default=0.0)
    log_evidence_score = Column(Float, default=0.0)
    fault_signature_score = Column(Float, default=0.0)
    evidence_summary = Column(Text)
    evidence_items = Column(JSON, default=[])
    fault_signature_matched = Column(String(256))
    lead_lag_relationship = Column(String(128))
    confidence = Column(Float, default=90.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class RemediationAudit(Base):
    __tablename__ = "remediation_audits"

    id = Column(String(64), primary_key=True, index=True)
    incident_id = Column(String(64), index=True, nullable=False)
    recommendation_id = Column(String(64), nullable=False)
    playbook_id = Column(String(64), nullable=False)
    action_title = Column(String(256), nullable=False)
    target_service = Column(String(128), nullable=False)
    action_type = Column(String(64), nullable=False)
    approver = Column(String(128), default="SRE On-Call Operator")
    status = Column(String(32), default="pending") # pending, approved, rejected, executing, completed, failed
    decision_comment = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    executed_at = Column(DateTime, nullable=True)
    verification_status = Column(String(64), default="unresolved") # verifying, verified_healthy, unresolved
    execution_logs = Column(JSON, default=[])
