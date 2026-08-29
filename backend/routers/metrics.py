import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.database import get_db
from backend.models import TelemetryMetric, AnomalyEvent
from backend.schemas import (
    TelemetryMetricCreate,
    TelemetryMetricResponse,
    IngestMetricsBatchRequest
)
from backend.ml.anomaly_detector import anomaly_detector
from backend.collectors.system_collector import system_collector

router = APIRouter(prefix="/api/v1/metrics", tags=["Telemetry Metrics"])

@router.post("/ingest", response_model=List[TelemetryMetricResponse])
def ingest_metrics(
    payload: IngestMetricsBatchRequest,
    db: Session = Depends(get_db)
):
    """Ingests a batch of telemetry metrics, runs real-time ML anomaly detection, and saves to database."""
    saved_records = []
    now = datetime.datetime.utcnow()

    for item in payload.metrics:
        ts = item.timestamp or now
        record = TelemetryMetric(
            timestamp=ts,
            service_id=item.service_id,
            service_name=item.service_name,
            cpu_percent=item.cpu_percent,
            memory_mb=item.memory_mb,
            request_rate=item.request_rate,
            latency_p95_ms=item.latency_p95_ms,
            error_rate_percent=item.error_rate_percent,
            db_query_latency_ms=item.db_query_latency_ms,
            db_connections=item.db_connections,
            queue_backlog=item.queue_backlog,
            source=item.source or "collector"
        )
        db.add(record)
        saved_records.append(record)

        # Run online local ML anomaly detector
        ml_eval = anomaly_detector.evaluate_telemetry({
            "cpu_percent": item.cpu_percent,
            "memory_mb": item.memory_mb,
            "latency_p95_ms": item.latency_p95_ms,
            "error_rate_percent": item.error_rate_percent,
            "db_query_latency_ms": item.db_query_latency_ms,
            "db_connections": item.db_connections
        })

        if ml_eval["is_anomaly"]:
            anomaly_rec = AnomalyEvent(
                id=f"anom-{item.service_id}-{int(ts.timestamp() * 1000)}",
                detected_at=ts,
                service_id=item.service_id,
                service_name=item.service_name,
                metric_name=ml_eval["primary_metric"],
                isolation_forest_score=ml_eval["isolation_forest_score"],
                autoencoder_recon_error=ml_eval["autoencoder_recon_error"],
                context_score=ml_eval["context_score"],
                final_anomaly_score=ml_eval["final_anomaly_score"],
                threshold=ml_eval["threshold"],
                severity=ml_eval["severity"],
                details=f"Multivariate deviation on {item.service_name} (S_final: {ml_eval['final_anomaly_score']})"
            )
            db.add(anomaly_rec)

    db.commit()
    for r in saved_records:
        db.refresh(r)

    return saved_records

@router.get("/latest", response_model=List[TelemetryMetricResponse])
def get_latest_metrics(
    limit: int = Query(50, ge=1, le=500),
    service_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retrieves the latest ingested telemetry metric data points."""
    query = db.query(TelemetryMetric)
    if service_id:
        query = query.filter(TelemetryMetric.service_id == service_id)
    return query.order_by(desc(TelemetryMetric.timestamp)).limit(limit).all()

@router.get("/host")
def get_host_telemetry():
    """Returns real-time host hardware telemetry collected natively via psutil."""
    return system_collector.get_host_metrics()
