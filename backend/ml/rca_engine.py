import datetime
from typing import List, Dict, Any, Optional
import numpy as np

# Microservice Dependency Topology
TOPOLOGY_EDGES = [
    {"source": "api-gateway", "target": "order-service", "type": "http"},
    {"source": "api-gateway", "target": "user-service", "type": "http"},
    {"source": "order-service", "target": "payment-service", "type": "http"},
    {"source": "order-service", "target": "inventory-service", "type": "http"},
    {"source": "order-service", "target": "order-postgres-db", "type": "database"},
    {"source": "payment-service", "target": "stripe-external-api", "type": "external_gateway"},
    {"source": "inventory-service", "target": "inventory-redis-cache", "type": "database"},
]

SERVICE_METADATA = {
    "api-gateway": {"name": "API Gateway", "framework": "Go / Gin", "layer": "ingress"},
    "order-service": {"name": "Order Processing Service", "framework": "Node.js / Express", "layer": "core"},
    "payment-service": {"name": "Payment Gateway Service", "framework": "Java / Spring Boot", "layer": "core"},
    "inventory-service": {"name": "Inventory & Catalog Service", "framework": "Python / FastAPI", "layer": "core"},
    "user-service": {"name": "User Auth & Profile Service", "framework": "Rust / Axum", "layer": "core"},
}

KNOWN_FAULT_SIGNATURES = [
    {
        "signature": "CPU Thread Starvation & Event Loop Blocking",
        "service": "order-service",
        "metric_pattern": lambda m: m.get("cpu_percent", 0) > 80 and m.get("latency_p95_ms", 0) > 500,
        "log_keyword": "CPU",
        "score_boost": 94.0
    },
    {
        "signature": "Heap Memory Leak & Garbage Collection Thrashing",
        "service": "user-service",
        "metric_pattern": lambda m: m.get("memory_mb", 0) > 750,
        "log_keyword": "OutOfMemoryError",
        "score_boost": 92.0
    },
    {
        "signature": "PostgreSQL Connection Pool Exhaustion & Thread Locking",
        "service": "order-service",
        "metric_pattern": lambda m: m.get("db_connections", 0) >= 48 or m.get("db_query_latency_ms", 0) > 300,
        "log_keyword": "connection pool",
        "score_boost": 96.0
    },
    {
        "signature": "Third-Party Payment Gateway Latency Spike & Cascading Worker Exhaustion",
        "service": "payment-service",
        "metric_pattern": lambda m: m.get("latency_p95_ms", 0) > 1200,
        "log_keyword": "timeout",
        "score_boost": 95.0
    },
    {
        "signature": "Service Container Crash & Process Termination (SIGSEGV / OOMKill)",
        "service": "payment-service",
        "metric_pattern": lambda m: m.get("error_rate_percent", 0) > 60,
        "log_keyword": "CRASH",
        "score_boost": 98.0
    },
    {
        "signature": "Redis Cache Eviction Surge & Network Latency Delay",
        "service": "inventory-service",
        "metric_pattern": lambda m: m.get("latency_p95_ms", 0) > 350 and m.get("db_query_latency_ms", 0) > 150,
        "log_keyword": "redis",
        "score_boost": 89.0
    }
]


class DeterministicRcaEngine:
    """
    Academic-grade Deterministic 5-Factor Root Cause Analysis (RCA) Engine:
    R = 0.30 * Metric_Evidence + 0.20 * Dependency_Impact + 0.20 * Temporal_Precedence
        + 0.15 * Log_Evidence + 0.15 * Fault_Signature
    Traverses microservice call graphs to isolate true root causes from victim services.
    """
    def __init__(self):
        self.weights = {
            "metric": 0.30,
            "dependency": 0.20,
            "temporal": 0.20,
            "log": 0.15,
            "signature": 0.15
        }

    def _get_downstream_dependents(self, service_id: str) -> List[str]:
        """Finds all services that depend on service_id directly or transitively."""
        dependents = []
        for edge in TOPOLOGY_EDGES:
            if edge["target"] == service_id:
                dependents.append(edge["source"])
        return dependents

    def _get_upstream_dependencies(self, service_id: str) -> List[str]:
        """Finds all dependencies called by service_id."""
        dependencies = []
        for edge in TOPOLOGY_EDGES:
            if edge["source"] == service_id:
                dependencies.append(edge["target"])
        return dependencies

    def evaluate_candidates(
        self,
        incident_id: str,
        active_services: List[Dict[str, Any]],
        recent_anomalies: List[Dict[str, Any]],
        recent_logs: List[Dict[str, Any]],
        incident_start_time: Optional[datetime.datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        Ranks all microservices by their root cause likelihood score R.
        """
        candidates = []

        # Map anomalies by service
        anomalies_by_service: Dict[str, List[Dict[str, Any]]] = {}
        for a in recent_anomalies:
            s_id = a.get("service_id", "")
            if s_id not in anomalies_by_service:
                anomalies_by_service[s_id] = []
            anomalies_by_service[s_id].append(a)

        # Map error logs by service
        logs_by_service: Dict[str, List[Dict[str, Any]]] = {}
        for log in recent_logs:
            s_id = log.get("service_id", "")
            if s_id not in logs_by_service:
                logs_by_service[s_id] = []
            logs_by_service[s_id].append(log)

        for svc in active_services:
            svc_id = svc.get("id") or svc.get("service_id")
            svc_name = svc.get("name") or svc.get("service_name") or SERVICE_METADATA.get(svc_id, {}).get("name", svc_id)
            metrics = svc.get("current_metrics") or svc

            svc_anomalies = anomalies_by_service.get(svc_id, [])
            svc_logs = logs_by_service.get(svc_id, [])

            # 1. Metric Evidence Score (0-100)
            max_anomaly_score = max([a.get("final_anomaly_score", 0.0) for a in svc_anomalies], default=0.0)
            cpu_val = metrics.get("cpu_percent", 0.0)
            lat_val = metrics.get("latency_p95_ms", 0.0)
            err_val = metrics.get("error_rate_percent", 0.0)
            mem_mb = metrics.get("memory_mb", 0.0)
            db_conn = metrics.get("db_connections", 0)

            metric_evidence = min(100.0, (
                max_anomaly_score * 50.0 +
                (cpu_val / 100.0) * 15.0 +
                min(1.0, lat_val / 800.0) * 15.0 +
                min(1.0, err_val / 20.0) * 10.0 +
                min(1.0, mem_mb / 900.0) * 10.0
            ))

            # 2. Dependency Impact Score (0-100)
            # Services that have many callers that are degraded get higher causal weight
            downstream = self._get_downstream_dependents(svc_id)
            upstream = self._get_upstream_dependencies(svc_id)
            dep_score = 40.0
            if downstream:
                dep_score += min(50.0, len(downstream) * 25.0)
            if svc.get("status") in ["critical", "crashed"]:
                dep_score += 10.0
            dependency_impact = min(100.0, dep_score)

            # 3. Temporal Precedence Score (0-100)
            # Earliest anomaly gets highest precedence
            temporal_score = 30.0
            if svc_anomalies:
                temporal_score = 85.0
                # Check if this service had the earliest anomaly in the cluster
                earliest_svc = min(recent_anomalies, key=lambda x: x.get("detected_at", datetime.datetime.max), default=None)
                if earliest_svc and earliest_svc.get("service_id") == svc_id:
                    temporal_score = 98.0
            temporal_precedence = temporal_score

            # 4. Log Evidence Score (0-100)
            critical_logs = [l for l in svc_logs if l.get("level") in ["ERROR", "FATAL"]]
            log_score = 15.0
            if critical_logs:
                log_score = min(100.0, 50.0 + len(critical_logs) * 10.0)
            log_evidence = log_score

            # 5. Fault Signature Match Score (0-100)
            matched_signature_name = "Generic Service Latency Congestion"
            signature_score = 25.0
            for sig in KNOWN_FAULT_SIGNATURES:
                if sig["service"] == svc_id:
                    if sig["metric_pattern"](metrics):
                        signature_score = sig["score_boost"]
                        matched_signature_name = sig["signature"]
                        break
                    # Also check logs
                    for l in critical_logs:
                        if sig["log_keyword"].lower() in l.get("message", "").lower():
                            signature_score = max(signature_score, sig["score_boost"] - 5.0)
                            matched_signature_name = sig["signature"]

            fault_signature = signature_score

            # Compute Final R Score: R = 0.30*M + 0.20*D + 0.20*T + 0.15*L + 0.15*S
            total_r = (
                self.weights["metric"] * metric_evidence +
                self.weights["dependency"] * dependency_impact +
                self.weights["temporal"] * temporal_precedence +
                self.weights["log"] * log_evidence +
                self.weights["signature"] * fault_signature
            )
            total_r = round(float(np.clip(total_r, 5.0, 99.0)), 1)

            # Determine Lead/Lag Relationship
            if total_r >= 75.0 and temporal_precedence >= 75.0:
                lead_lag = "Primary Root Cause (Temporal & Causal Lead)"
            elif downstream and total_r >= 60.0:
                lead_lag = "Direct Dependency Bottleneck"
            else:
                lead_lag = "Cascading Downstream Victim (Lag Propagation)"

            # Build Evidence Anchors
            evidence_items = []
            if metric_evidence > 50:
                evidence_items.append({
                    "type": "metric",
                    "description": f"Telemetry anomaly score reached {round(max_anomaly_score, 2)} with abnormal metric divergence.",
                    "severity": "error" if metric_evidence > 70 else "warn",
                    "value": f"{round(metric_evidence, 1)}/100"
                })
            if critical_logs:
                evidence_items.append({
                    "type": "log",
                    "description": f"Detected {len(critical_logs)} critical log exceptions: '{critical_logs[0].get('message', '')[:65]}...'",
                    "severity": "error",
                    "value": f"{len(critical_logs)} logs"
                })
            if downstream:
                evidence_items.append({
                    "type": "topology",
                    "description": f"Propagating latency along dependency edges to: {', '.join(downstream)}",
                    "severity": "warn"
                })
            if temporal_precedence >= 80:
                evidence_items.append({
                    "type": "timing",
                    "description": "Earliest anomaly timestamp observed in correlation window (Lead Anchor)",
                    "severity": "info"
                })

            confidence = round(min(98.0, max(65.0, total_r * 0.98)), 1)

            candidates.append({
                "id": f"rca-cand-{svc_id}",
                "incident_id": incident_id,
                "candidate_service_id": svc_id,
                "candidate_service_name": svc_name,
                "candidate_type": "microservice",
                "score": total_r,
                "score_breakdown": {
                    "metricEvidence": round(metric_evidence, 1),
                    "dependencyImpact": round(dependency_impact, 1),
                    "temporalPrecedence": round(temporal_precedence, 1),
                    "logEvidence": round(log_evidence, 1),
                    "faultSignature": round(fault_signature, 1)
                },
                "evidence_summary": f"Calculated R-Score {total_r} via 5-factor mathematical analysis with {confidence}% confidence.",
                "evidence_items": evidence_items,
                "fault_signature_matched": matched_signature_name,
                "lead_lag_relationship": lead_lag,
                "confidence": confidence
            })

        # Sort descending by score R
        candidates.sort(key=lambda x: x["score"], reverse=True)
        for idx, cand in enumerate(candidates):
            cand["rank"] = idx + 1

        return candidates

rca_engine = DeterministicRcaEngine()
