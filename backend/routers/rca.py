import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.database import get_db
from backend.models import Incident, RcaResult, AnomalyEvent, LogEntry, TelemetryMetric
from backend.schemas import DiagnoseIncidentRequest, RcaCandidateResponse, AiDiagnosisReportResponse
from backend.ml.rca_engine import rca_engine, SERVICE_METADATA, TOPOLOGY_EDGES
from backend.ml.local_explainer import local_explainer

router = APIRouter(prefix="/api/v1/rca", tags=["Root Cause Analysis"])

@router.post("/diagnose")
def run_rca_diagnosis(
    payload: DiagnoseIncidentRequest,
    db: Session = Depends(get_db)
):
    """
    Executes the 5-factor mathematical RCA engine on the latest telemetry window,
    persists ranked candidate models, and returns structured causal ranking.
    """
    now = datetime.datetime.utcnow()
    lookback = datetime.timedelta(seconds=payload.lookback_seconds)
    cutoff = now - lookback

    # Fetch recent metrics grouped by service
    recent_metrics = db.query(TelemetryMetric).filter(TelemetryMetric.timestamp >= cutoff).all()
    recent_anomalies = db.query(AnomalyEvent).filter(AnomalyEvent.detected_at >= cutoff).all()
    recent_logs = db.query(LogEntry).filter(LogEntry.timestamp >= cutoff).all()

    # Build active services representation
    active_services = []
    for s_id, s_meta in SERVICE_METADATA.items():
        # Get latest metric for service
        svc_metrics = [m for m in recent_metrics if m.service_id == s_id]
        if svc_metrics:
            latest = max(svc_metrics, key=lambda x: x.timestamp)
            active_services.append({
                "id": s_id,
                "name": s_meta["name"],
                "cpu_percent": latest.cpu_percent,
                "memory_mb": latest.memory_mb,
                "latency_p95_ms": latest.latency_p95_ms,
                "error_rate_percent": latest.error_rate_percent,
                "db_query_latency_ms": latest.db_query_latency_ms,
                "db_connections": latest.db_connections,
                "status": "critical" if latest.error_rate_percent > 20 or latest.latency_p95_ms > 800 else "healthy"
            })
        else:
            active_services.append({
                "id": s_id,
                "name": s_meta["name"],
                "cpu_percent": 25.0,
                "memory_mb": 250.0,
                "latency_p95_ms": 40.0,
                "error_rate_percent": 0.0,
                "db_query_latency_ms": 12.0,
                "db_connections": 10,
                "status": "healthy"
            })

    inc_id = payload.incident_id or f"INC-{int(now.timestamp())}"

    # Evaluate RCA candidates
    candidates = rca_engine.evaluate_candidates(
        incident_id=inc_id,
        active_services=active_services,
        recent_anomalies=[{
            "service_id": a.service_id,
            "detected_at": a.detected_at,
            "final_anomaly_score": a.final_anomaly_score
        } for a in recent_anomalies],
        recent_logs=[{
            "service_id": l.service_id,
            "level": l.level,
            "message": l.message
        } for l in recent_logs]
    )

    # Save to database
    for cand in candidates:
        db_rca = RcaResult(
            id=cand["id"],
            incident_id=inc_id,
            candidate_service_id=cand["candidate_service_id"],
            candidate_service_name=cand["candidate_service_name"],
            candidate_type=cand["candidate_type"],
            rank=cand["rank"],
            score=cand["score"],
            metric_evidence_score=cand["score_breakdown"]["metricEvidence"],
            dependency_impact_score=cand["score_breakdown"]["dependencyImpact"],
            temporal_precedence_score=cand["score_breakdown"]["temporalPrecedence"],
            log_evidence_score=cand["score_breakdown"]["logEvidence"],
            fault_signature_score=cand["score_breakdown"]["faultSignature"],
            evidence_summary=cand["evidence_summary"],
            evidence_items=cand["evidence_items"],
            fault_signature_matched=cand["fault_signature_matched"],
            lead_lag_relationship=cand["lead_lag_relationship"],
            confidence=cand["confidence"]
        )
        db.merge(db_rca)

    db.commit()

    return {
        "incident_id": inc_id,
        "evaluated_at": now.isoformat() + "Z",
        "candidates_count": len(candidates),
        "candidates": candidates
    }

@router.get("/candidates/{incident_id}")
def get_rca_candidates(
    incident_id: str,
    db: Session = Depends(get_db)
):
    """Retrieves ranked RCA candidates for an incident from database."""
    results = db.query(RcaResult).filter(RcaResult.incident_id == incident_id).order_by(RcaResult.rank).all()
    return results

@router.post("/explain", response_model=AiDiagnosisReportResponse)
def explain_incident(
    payload: dict,
    db: Session = Depends(get_db)
):
    """
    Generates a 100% offline, deterministic, fact-grounded incident explanation
    adhering strictly to ingested database telemetry facts without external cloud API calls.
    """
    incident = payload.get("incident", {})
    rca_candidates = payload.get("rcaCandidates", [])
    anomalies = payload.get("anomalies", [])
    logs = payload.get("logs", [])
    topology = payload.get("topology", TOPOLOGY_EDGES)

    report = local_explainer.generate_explanation(
        incident=incident,
        rca_candidates=rca_candidates,
        anomalies=anomalies,
        logs=logs,
        topology=topology
    )

    return report
