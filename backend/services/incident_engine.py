import datetime
import uuid
import json
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.models import Incident, AnomalyEvent, RcaResult, TelemetryMetric, LogEntry
from backend.ml.rca_engine import rca_engine, TOPOLOGY_EDGES
from backend.ml.local_explainer import local_explainer

class IncidentEngine:
    """
    Incident Engine that creates incidents from anomaly thresholds, 
    runs automated RCA, and associates remediation playbooks.
    """
    def __init__(self):
        self.anomaly_threshold = 3
        self.time_window_seconds = 60
        self._active_incident_id: Optional[str] = None

    def get_active_incident_id(self) -> Optional[str]:
        """Returns the current active incident ID tracked in-memory."""
        return self._active_incident_id
        
    def check_for_incidents(self, db: Session) -> Optional[Incident]:
        """
        Checks for recent anomalies and creates an incident if threshold is crossed.
        """
        # Look for active incidents first
        active_incident = self.get_active_incident(db)
        if active_incident:
            rca_count = db.query(RcaResult).filter(RcaResult.incident_id == active_incident.id).count()
            if rca_count == 0:
                self._run_rca_and_diagnosis(db, active_incident)
            return active_incident
            
        # Get recent anomalies
        time_threshold = datetime.datetime.utcnow() - datetime.timedelta(seconds=self.time_window_seconds)
        recent_anomalies = db.query(AnomalyEvent).filter(AnomalyEvent.detected_at >= time_threshold).all()
        
        # Group by service
        service_counts: Dict[str, List[AnomalyEvent]] = {}
        for anomaly in recent_anomalies:
            if anomaly.service_name not in service_counts:
                service_counts[anomaly.service_name] = []
            service_counts[anomaly.service_name].append(anomaly)
            
        for service_name, anomalies in service_counts.items():
            if len(anomalies) >= self.anomaly_threshold:
                return self._create_incident(db, service_name, anomalies)
                
        return None

    def get_active_incident(self, db: Session) -> Optional[Incident]:
        """Returns the current active incident or None."""
        return db.query(Incident).filter(Incident.status.in_(["active", "investigating", "mitigating"])).first()

    def resolve_incident(self, db: Session, incident_id: str) -> bool:
        """Marks an incident as resolved."""
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            return False
            
        incident.status = "resolved"
        incident.end_time = datetime.datetime.utcnow()
        if incident.start_time:
            incident.mttr_seconds = (incident.end_time - incident.start_time).total_seconds()
            
        self._append_timeline(incident, "resolved", "Incident resolved successfully.")
        self._active_incident_id = None
        db.commit()
        return True

    def _append_timeline(self, incident: Incident, stage: str, details: str):
        """Helper to append a lifecycle stage to the incident timeline."""
        timeline = list(incident.lifecycle_timeline) if incident.lifecycle_timeline else []
        timeline.append({
            "stage": stage,
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "details": details
        })
        incident.lifecycle_timeline = timeline
        incident.current_stage = stage

    def _create_incident(self, db: Session, service_name: str, anomalies: List[AnomalyEvent]) -> Incident:
        """Creates a new incident from a list of triggering anomalies."""
        service_id = anomalies[0].service_id
        
        incident_id = str(uuid.uuid4())
        
        timeline = [{
            "stage": "anomaly_detected",
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "details": f"Detected {len(anomalies)} anomalies in {service_name} within time window."
        }, {
            "stage": "incident_created",
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "details": f"Created incident for {service_name}."
        }]
        
        primary_metric = anomalies[0].metric_name if anomalies else "unknown"
        
        new_incident = Incident(
            id=incident_id,
            service_id=service_id,
            service_name=service_name,
            title=f"Multiple anomalies detected on {service_name}",
            incident_type="Performance Degradation",
            severity="high",
            current_stage="incident_created",
            summary=f"Automated incident created due to elevated anomaly count on {service_name}.",
            anomalies_detected=len(anomalies),
            primary_metric_impacted=primary_metric,
            lifecycle_timeline=timeline,
            affected_services=[service_name]
        )
        db.add(new_incident)
        db.commit()
        db.refresh(new_incident)
        
        self._active_incident_id = incident_id
        
        for anomaly in anomalies:
            anomaly.incident_id = incident_id
        db.commit()
        
        # Run RCA automatically
        self._run_rca_and_diagnosis(db, new_incident)
        
        return new_incident
        
    def _run_rca_and_diagnosis(self, db: Session, incident: Incident):
        """Runs the root cause analysis, evidence assembly, diagnosis generation, and remediation."""
        # 1. RCA Ranking
        self._append_timeline(incident, "rca_ranking", "Starting automated root cause analysis.")
        db.commit()
        
        # Gather data for RCA
        time_threshold = incident.start_time - datetime.timedelta(minutes=5)
        
        # Anomalies
        recent_anomalies_objs = db.query(AnomalyEvent).filter(AnomalyEvent.detected_at >= time_threshold).all()
        anomalies_dicts = [{
            "id": a.id,
            "service_id": a.service_id,
            "service_name": a.service_name,
            "metric_name": a.metric_name,
            "final_anomaly_score": a.final_anomaly_score,
            "detected_at": a.detected_at
        } for a in recent_anomalies_objs]
        
        # Logs
        recent_logs_objs = db.query(LogEntry).filter(LogEntry.timestamp >= time_threshold).all()
        logs_dicts = [{
            "id": l.id,
            "service_id": l.service_id,
            "service_name": l.service_name,
            "level": l.level,
            "message": l.message,
            "timestamp": l.timestamp
        } for l in recent_logs_objs]
        
        # Active services (latest metrics)
        services = {}
        recent_metrics = db.query(TelemetryMetric).filter(TelemetryMetric.timestamp >= time_threshold).order_by(desc(TelemetryMetric.timestamp)).all()
        for m in recent_metrics:
            if m.service_id not in services:
                m_restart = getattr(m, "restart_count", 0)
                is_crashed = m_restart > 0 or (m.error_rate_percent >= 90.0 and m.cpu_percent < 5.0)
                services[m.service_id] = {
                    "id": m.service_id,
                    "name": m.service_name,
                    "cpu_percent": m.cpu_percent,
                    "memory_mb": m.memory_mb,
                    "latency_p95_ms": m.latency_p95_ms,
                    "error_rate_percent": m.error_rate_percent,
                    "db_connections": m.db_connections,
                    "db_query_latency_ms": m.db_query_latency_ms,
                    "queue_backlog": getattr(m, "queue_backlog", 0),
                    "restart_count": m_restart,
                    "status": "crashed" if is_crashed else ("critical" if m.error_rate_percent > 30 or m.cpu_percent > 80 else "active")
                }
        active_services = list(services.values())
        
        candidates = rca_engine.evaluate_candidates(
            incident.id, 
            active_services, 
            anomalies_dicts, 
            logs_dicts, 
            incident.start_time
        )
        
        # Save RcaResult
        for cand in candidates:
            cand_pk = f"rca-{incident.id[:8]}-{cand['candidate_service_id']}"
            rca_res = RcaResult(
                id=cand_pk,
                incident_id=incident.id,
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
            db.add(rca_res)
            
        incident.root_cause_service = candidates[0]["candidate_service_name"] if candidates else incident.service_name
        self._append_timeline(incident, "evidence_assembly", "Gathered multi-modal telemetry evidence.")
        db.commit()
        
        # 2. Diagnosis Generation
        self._append_timeline(incident, "diagnosis_generated", "Synthesized deterministic local explanation.")
        
        incident_dict = {
            "id": incident.id,
            "service_id": incident.service_id,
            "service_name": incident.service_name,
            "affected_services": incident.affected_services
        }
        
        explanation = local_explainer.generate_explanation(
            incident_dict,
            candidates,
            anomalies_dicts,
            logs_dicts,
            TOPOLOGY_EDGES
        )
        
        incident.summary = explanation["executiveSummary"]
        
        # 3. Remediation Recommended
        self._append_timeline(incident, "remediation_recommended", "Matched automated playbook recommendations based on fault signature.")
        
        top_signature = candidates[0]["fault_signature_matched"] if candidates else ""
        playbook = self._match_playbook(top_signature, incident.root_cause_service)
        incident.remediation_action_taken = playbook
        
        db.commit()
        
    def _match_playbook(self, signature: str, service_name: str) -> str:
        """Matches a remediation playbook given the fault signature."""
        if "CPU" in signature:
            return f"Scale up compute resources for {service_name} or profile thread pool."
        elif "Memory" in signature or "Heap" in signature:
            return f"Restart {service_name} pods to clear memory leak and capture heap dump."
        elif "Connection Pool" in signature:
            return f"Increase database connection pool size for {service_name} or terminate idle queries."
        elif "Payment Gateway" in signature or "Timeout" in signature:
            return "Engage third-party provider or failover to secondary gateway."
        elif "Crash" in signature:
            return f"Auto-redeploy {service_name} and check OOM killer events."
        else:
            return f"Perform standard rollback or restart of {service_name}."

# Module-level singleton
incident_engine = IncidentEngine()
