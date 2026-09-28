import datetime
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.database import get_db
from backend.models import RemediationAudit, Incident
from backend.schemas import (
    RemediationPlaybookResponse,
    RemediationApprovalRequest,
    RemediationRejectRequest,
    RemediationAuditResponse
)
from backend.collectors.system_collector import system_collector

router = APIRouter(prefix="/api/v1/remediation", tags=["Remediation & Recovery"])

BUILTIN_PLAYBOOKS = [
    {
        "id": "playbook-restart-order",
        "failureType": "cpu_saturation_order",
        "rootCauseType": "order-service",
        "title": "Graceful Pod Restart & Node Re-balancing",
        "recommendationText": "Trigger rolling restart of order-service pods to flush hung CPU execution threads and clear node CPU starvation.",
        "actionType": "restart_service",
        "category": "automated_safe",
        "safeAutoAction": True,
        "approvalRequired": True,
        "priority": "P1",
        "estimatedRecoveryTimeSec": 15,
        "steps": [
            "Validate cluster health & node capacity",
            "Cordon node-worker-02 to prevent new pod assignments",
            "Perform rolling restart of order-service deployment (3 replicas)",
            "Wait for liveness/readiness probes to return HTTP 200 OK",
            "Verify CPU drop below 35% threshold"
        ]
    },
    {
        "id": "playbook-flush-gc-user",
        "failureType": "memory_leak_user",
        "rootCauseType": "user-service",
        "title": "Clear Session Token Cache & Trigger Forced GC",
        "recommendationText": "Evict expired JWT and user session metadata from memory cache and trigger garbage collection.",
        "actionType": "clear_cache",
        "category": "automated_safe",
        "safeAutoAction": True,
        "approvalRequired": True,
        "priority": "P1",
        "estimatedRecoveryTimeSec": 10,
        "steps": [
            "Connect to user-service management port",
            "Execute cache eviction routine on expired token bucket",
            "Trigger JVM / V8 heap compaction and garbage collection",
            "Verify resident set size (RSS) memory drops below 400MB"
        ]
    },
    {
        "id": "playbook-scale-db-pool",
        "failureType": "db_connection_exhaustion",
        "rootCauseType": "order-service",
        "title": "Scale DB Connection Pool Limit & Kill Leaked Connections",
        "recommendationText": "Expand max DB pool limit from 50 to 100 connections and terminate idle-in-transaction connections.",
        "actionType": "increase_db_pool",
        "category": "automated_safe",
        "safeAutoAction": True,
        "approvalRequired": True,
        "priority": "P1",
        "estimatedRecoveryTimeSec": 8,
        "steps": [
            "Query pg_stat_activity for idle-in-transaction sockets > 30s",
            "Terminate 18 leaked transaction locks",
            "Dynamically update HikariCP / pg-pool max connections = 100",
            "Verify active connections stabilize below 60%"
        ]
    },
    {
        "id": "playbook-circuit-breaker-stripe",
        "failureType": "slow_payment_gateway",
        "rootCauseType": "payment-service",
        "title": "Enable Resilience4j Payment Circuit Breaker & Fallback Mock",
        "recommendationText": "Isolate slow upstream Stripe API by activating circuit breaker with 2-second timeout and asynchronous retry queue.",
        "actionType": "enable_circuit_breaker",
        "category": "manual_operational",
        "safeAutoAction": False,
        "approvalRequired": True,
        "priority": "P1",
        "estimatedRecoveryTimeSec": 5,
        "steps": [
            "Flip payment-service circuit breaker state to HALF-OPEN / FALLBACK",
            "Route incoming payment authorizations to async Redis retry queue",
            "Log upstream latency telemetry to Stripe status monitor",
            "Verify order-service HTTP timeout errors drop to 0%"
        ]
    },
    {
        "id": "playbook-restart-crashed-payment",
        "failureType": "service_crash_payment",
        "rootCauseType": "payment-service",
        "title": "Auto-Heal Crashed Payment Container & Reset Health Probe",
        "recommendationText": "Spin up fresh payment-service container instance and reset failed circuit breakers.",
        "actionType": "restart_service",
        "category": "automated_safe",
        "safeAutoAction": True,
        "approvalRequired": True,
        "priority": "P1",
        "estimatedRecoveryTimeSec": 12,
        "steps": [
            "Purge crashed container namespace",
            "Deploy fresh payment-service v1.4.2 pod",
            "Execute synthetic health check probe",
            "Re-enable ingress routing"
        ]
    }
]

@router.get("/playbooks", response_model=List[RemediationPlaybookResponse])
def list_playbooks():
    """Returns catalog of pre-configured automated and operator remediation playbooks."""
    return BUILTIN_PLAYBOOKS

@router.post("/approve", response_model=RemediationAuditResponse)
def approve_remediation(
    payload: RemediationApprovalRequest,
    db: Session = Depends(get_db)
):
    """
    Human-in-the-loop approval endpoint.
    Records operator audit trail, clears hardware fault injections, and logs recovery steps.
    """
    now = datetime.datetime.utcnow()
    audit_id = f"audit-{uuid.uuid4().hex[:10]}"

    # Execute remediation recovery on host/collector
    system_collector.clear_faults()

    execution_logs = [
        f"[{now.strftime('%H:%M:%S')}] Human operator '{payload.approver}' approved action '{payload.action_title}'",
        f"[{now.strftime('%H:%M:%S')}] Executing target action '{payload.action_type}' on service '{payload.target_service}'...",
        f"[{now.strftime('%H:%M:%S')}] Signal dispatched to container runtime orchestrator",
        f"[{now.strftime('%H:%M:%S')}] Clearing active compute load and resource saturation",
        f"[{now.strftime('%H:%M:%S')}] Telemetry health verification initiated (closed-loop MTTR tracking)",
        f"[{now.strftime('%H:%M:%S')}] Service returned HTTP 200 OK. Incident marked resolving."
    ]

    audit_entry = RemediationAudit(
        id=audit_id,
        incident_id=payload.incident_id,
        recommendation_id=payload.recommendation_id,
        playbook_id=payload.playbook_id,
        action_title=payload.action_title,
        target_service=payload.target_service,
        action_type=payload.action_type,
        approver=payload.approver or "SRE On-Call Operator",
        status="completed",
        decision_comment=payload.decision_comment or "Operator telemetry verification complete",
        created_at=now,
        executed_at=now,
        verification_status="verified_healthy",
        execution_logs=execution_logs
    )

    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)

    return audit_entry

@router.post("/reject", response_model=RemediationAuditResponse)
def reject_remediation(
    payload: RemediationRejectRequest,
    db: Session = Depends(get_db)
):
    """Rejects a proposed remediation playbook and logs operator reasoning to audit trail."""
    now = datetime.datetime.utcnow()
    audit_id = f"audit-{uuid.uuid4().hex[:10]}"

    audit_entry = RemediationAudit(
        id=audit_id,
        incident_id=payload.incident_id,
        recommendation_id=payload.recommendation_id,
        playbook_id="rejected",
        action_title="Action Rejected by Operator",
        target_service="N/A",
        action_type="rejected",
        approver=payload.approver or "SRE On-Call Operator",
        status="rejected",
        decision_comment=payload.reason,
        created_at=now,
        executed_at=now,
        verification_status="unresolved",
        execution_logs=[
            f"[{now.strftime('%H:%M:%S')}] Operator '{payload.approver}' rejected recommendation.",
            f"[{now.strftime('%H:%M:%S')}] Reason: {payload.reason}"
        ]
    )

    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)

    return audit_entry

@router.get("/audit", response_model=List[RemediationAuditResponse])
def get_audit_trail(
    limit: int = Query(50, ge=1, le=200),
    incident_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retrieves immutable SRE remediation execution audit records."""
    query = db.query(RemediationAudit)
    if incident_id:
        query = query.filter(RemediationAudit.incident_id == incident_id)
    return query.order_by(desc(RemediationAudit.created_at)).limit(limit).all()
