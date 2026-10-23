import threading
import time
import logging
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.database import SessionLocal, get_db
from backend.models import TelemetryMetric, LogEntry, AnomalyEvent, ServiceModel, DependencyModel
from backend.services.synthetic_generator import synthetic_generator, SERVICES
from backend.services.incident_engine import incident_engine
from backend.ml.anomaly_detector import anomaly_detector

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/simulation", tags=["simulation"])

class ScenarioRequest(BaseModel):
    scenario: str

_simulation_running = False
_simulation_thread = None
_tick_count = 0

# Service definitions matching the frontend's simulator.ts
SERVICE_DEFINITIONS = {
    "user-service": {
        "name": "User Service",
        "version": "4.2.1",
        "language": "Java 17",
        "framework": "Spring Boot 3.2",
        "database": "PostgreSQL 15",
        "description": "Handles user authentication, session management, and profile CRUD operations.",
    },
    "order-service": {
        "name": "Order Service",
        "version": "3.8.5",
        "language": "Java 17",
        "framework": "Spring Boot 3.2",
        "database": "PostgreSQL 15",
        "description": "Core orchestrator for order lifecycle, inventory reservation, and payment coordination.",
    },
    "payment-service": {
        "name": "Payment Service",
        "version": "2.5.3",
        "language": "Node.js 20",
        "framework": "Express 4.18",
        "database": "PostgreSQL 15",
        "description": "Processes payment transactions via Stripe/Visa gateway and manages refund workflows.",
    },
    "inventory-service": {
        "name": "Inventory Service",
        "version": "3.1.0",
        "language": "Go 1.21",
        "framework": "Gin",
        "database": "PostgreSQL 15",
        "description": "Real-time stock level management, warehouse allocation, and reorder triggers.",
    },
    "notification-service": {
        "name": "Notification Service",
        "version": "1.9.2",
        "language": "Python 3.11",
        "framework": "FastAPI",
        "database": "Redis (cache)",
        "description": "Multi-channel delivery engine for email, SMS, push, and webhook notifications.",
    },
}

# Dependency graph matching the frontend
DEPENDENCY_GRAPH = [
    {"id": "dep-1", "sourceServiceId": "user-service", "sourceName": "User Service", "targetServiceId": "order-service", "targetName": "Order Service", "protocol": "HTTP/gRPC", "avgLatencyMs": 12, "callRatePerMin": 340, "status": "healthy", "isImpacted": False},
    {"id": "dep-2", "sourceServiceId": "order-service", "sourceName": "Order Service", "targetServiceId": "payment-service", "targetName": "Payment Service", "protocol": "HTTP", "avgLatencyMs": 28, "callRatePerMin": 220, "status": "healthy", "isImpacted": False},
    {"id": "dep-3", "sourceServiceId": "order-service", "sourceName": "Order Service", "targetServiceId": "inventory-service", "targetName": "Inventory Service", "protocol": "HTTP/gRPC", "avgLatencyMs": 18, "callRatePerMin": 280, "status": "healthy", "isImpacted": False},
    {"id": "dep-4", "sourceServiceId": "payment-service", "sourceName": "Payment Service", "targetServiceId": "notification-service", "targetName": "Notification Service", "protocol": "HTTP", "avgLatencyMs": 8, "callRatePerMin": 150, "status": "healthy", "isImpacted": False},
    {"id": "dep-5", "sourceServiceId": "order-service", "sourceName": "Order Service", "targetServiceId": "notification-service", "targetName": "Notification Service", "protocol": "HTTP", "avgLatencyMs": 10, "callRatePerMin": 200, "status": "healthy", "isImpacted": False},
    {"id": "dep-6", "sourceServiceId": "user-service", "sourceName": "User Service", "targetServiceId": "notification-service", "targetName": "Notification Service", "protocol": "HTTP", "avgLatencyMs": 6, "callRatePerMin": 120, "status": "healthy", "isImpacted": False},
    {"id": "dep-7", "sourceServiceId": "inventory-service", "sourceName": "Inventory Service", "targetServiceId": "notification-service", "targetName": "Notification Service", "protocol": "HTTP", "avgLatencyMs": 9, "callRatePerMin": 80, "status": "healthy", "isImpacted": False},
    {"id": "dep-8", "sourceServiceId": "payment-service", "sourceName": "Payment Service", "targetServiceId": "order-service", "targetName": "Order Service", "protocol": "HTTP (callback)", "avgLatencyMs": 15, "callRatePerMin": 180, "status": "healthy", "isImpacted": False},
    {"id": "dep-9", "sourceServiceId": "user-service", "sourceName": "User Service", "targetServiceId": "payment-service", "targetName": "Payment Service", "protocol": "HTTP", "avgLatencyMs": 22, "callRatePerMin": 160, "status": "healthy", "isImpacted": False},
]

# Available fault scenarios matching the frontend
AVAILABLE_SCENARIOS = [
    {"id": "normal", "title": "Nominal Baseline", "category": "baseline", "targetService": "all", "description": "Healthy microservice cluster."},
    {"id": "cpu_saturation_order", "title": "Scenario 1 — CPU Saturation on Order Service", "category": "compute", "targetService": "order-service", "description": "Unbounded batch serialization loop causes severe CPU saturation (96%)."},
    {"id": "memory_leak_user", "title": "Scenario 2 — JVM Heap Memory Leak", "category": "memory", "targetService": "user-service", "description": "Session cache map fails to evict stale JWT tokens, driving heap allocation to 950MB+."},
    {"id": "database_latency_order", "title": "Scenario 3 — Slow SQL Query Spike", "category": "database", "targetService": "order-service", "description": "Unindexed JOIN on orders table causes full table scan latency spike."},
    {"id": "db_connection_exhaustion", "title": "Scenario 4 — Connection Pool Exhaustion", "category": "database", "targetService": "payment-service", "description": "Leaked connection inside transaction handler exhausts all pool connections."},
    {"id": "service_crash", "title": "Service Crash / Process Failure", "category": "crash", "targetService": "payment-service", "description": "Payment service process terminates unexpectedly, restart count increases, and downstream callers experience 5xx errors."},
    {"id": "service_crash_payment", "title": "Service Crash (Payment Service)", "category": "crash", "targetService": "payment-service", "description": "Null pointer exception in payment handler causes process crash and restart count increment."},
    {"id": "dependency_cascade", "title": "Dependency Cascade", "category": "cascade", "targetService": "order-service", "description": "Order service upstream thread saturation triggers cascading retry storms across 3+ downstream services."},
    {"id": "cascading_failure_chain", "title": "Dependency Cascade Chain", "category": "cascade", "targetService": "order-service", "description": "Origin service fails first and triggers downstream cascade through payment, inventory, and notification services."},
    {"id": "network_latency_inventory", "title": "Network Packet Drop & Jitter", "category": "network", "targetService": "inventory-service", "description": "Network partition causes packet drops between inventory service and database."},
    {"id": "slow_payment_gateway", "title": "Slow External Payment Gateway", "category": "external", "targetService": "payment-service", "description": "Upstream banking network experiences latency degradation and socket timeouts."},
]

def _simulation_loop():
    """Background simulation loop that generates telemetry, detects anomalies, and checks for incidents."""
    global _simulation_running, _tick_count
    while _simulation_running:
        try:
            tick_data = synthetic_generator.generate_tick()
            _tick_count += 1
            
            db = SessionLocal()
            try:
                for metric in tick_data.get("metrics", []):
                    db_metric = TelemetryMetric(
                        service_id=metric.get("service_id"),
                        service_name=metric.get("service_name"),
                        cpu_percent=metric.get("cpu_percent", 0.0),
                        memory_mb=metric.get("memory_mb", 0.0),
                        request_rate=metric.get("request_rate", 0.0),
                        latency_p95_ms=metric.get("latency_p95_ms", 0.0),
                        error_rate_percent=metric.get("error_rate_percent", 0.0),
                        db_query_latency_ms=metric.get("db_query_latency_ms", 0.0),
                        db_connections=metric.get("db_connections", 0),
                        queue_backlog=metric.get("queue_backlog", 0),
                        restart_count=metric.get("restart_count", 0),
                        source="synthetic"
                    )
                    db.add(db_metric)
                    db.flush()

                    eval_result = anomaly_detector.evaluate_telemetry(metric)
                    
                    if eval_result.get("is_anomaly"):
                        db_anomaly = AnomalyEvent(
                            id=f"ano-{_tick_count}-{int(time.time()*1000)}-{metric.get('service_id')}",
                            service_id=metric.get("service_id"),
                            service_name=metric.get("service_name"),
                            metric_name=eval_result.get("primary_metric", "unknown"),
                            isolation_forest_score=eval_result.get("isolation_forest_score", 0.0),
                            autoencoder_recon_error=eval_result.get("autoencoder_recon_error", 0.0),
                            context_score=eval_result.get("context_score", 0.0),
                            final_anomaly_score=eval_result.get("final_anomaly_score", 0.0),
                            threshold=eval_result.get("threshold", 0.6),
                            severity=eval_result.get("severity", "suspicious"),
                            details=f"Detected anomaly with score {eval_result.get('final_anomaly_score', 0.0):.3f}"
                        )
                        db.add(db_anomaly)
                
                for log_item in tick_data.get("logs", []):
                    db_log = LogEntry(
                        id=log_item.get("id", f"log-{_tick_count}-{int(time.time()*1000)}"),
                        service_id=log_item.get("service_id"),
                        service_name=log_item.get("service_name"),
                        level=log_item.get("level"),
                        message=log_item.get("message"),
                        request_id=log_item.get("request_id"),
                        trace_id=log_item.get("trace_id"),
                        endpoint=log_item.get("endpoint"),
                        exception_type=log_item.get("exception_type"),
                        duration_ms=log_item.get("duration_ms"),
                        status_code=log_item.get("status_code")
                    )
                    db.add(db_log)
                db.commit()

                # Check for incidents based on recent anomalies
                incident_engine.check_for_incidents(db)

            finally:
                db.close()
            
        except Exception as e:
            logger.error(f"Simulation loop error: {e}", exc_info=True)
        
        time.sleep(2.5)

@router.post("/start")
def start_simulation():
    global _simulation_running, _simulation_thread
    if not _simulation_running:
        _simulation_running = True
        _simulation_thread = threading.Thread(target=_simulation_loop, daemon=True)
        _simulation_thread.start()
        return {"status": "started"}
    return {"status": "already_running"}

@router.post("/stop")
def stop_simulation():
    global _simulation_running
    _simulation_running = False
    return {"status": "stopped"}

@router.post("/scenario")
def set_scenario(req: ScenarioRequest):
    synthetic_generator.set_scenario(req.scenario)
    return {"status": "scenario_set", "scenario": req.scenario}

@router.post("/reset")
def reset_simulation():
    synthetic_generator.reset()
    return {"status": "reset_to_baseline"}

@router.get("/state")
def get_state():
    state = synthetic_generator.get_state()
    active_inc = incident_engine.get_active_incident_id() if hasattr(incident_engine, 'get_active_incident_id') else None
    
    return {
        "scenario": state.get("scenario", "nominal"),
        "tick_count": _tick_count,
        "is_running": _simulation_running,
        "active_incident": active_inc,
        "duration_seconds": state.get("duration_seconds", 0),
    }

@router.get("/services")
def get_services(db: Session = Depends(get_db)):
    """Returns service definitions with their latest metrics."""
    # Check if DB has services seeded
    db_services = db.query(ServiceModel).all()
    svc_map = {s.id: s for s in db_services} if db_services else {}

    services = []
    service_ids = list(svc_map.keys()) if svc_map else list(SERVICE_DEFINITIONS.keys())

    for svc_id in service_ids:
        svc_name = svc_map[svc_id].name if svc_id in svc_map else SERVICE_DEFINITIONS.get(svc_id, {}).get("name", svc_id)
        svc_ver = svc_map[svc_id].version if svc_id in svc_map else SERVICE_DEFINITIONS.get(svc_id, {}).get("version", "1.0.0")
        svc_lang = svc_map[svc_id].language if svc_id in svc_map else SERVICE_DEFINITIONS.get(svc_id, {}).get("language", "Unknown")
        svc_framework = svc_map[svc_id].framework if svc_id in svc_map else SERVICE_DEFINITIONS.get(svc_id, {}).get("framework", "Unknown")
        svc_db = svc_map[svc_id].database if svc_id in svc_map else SERVICE_DEFINITIONS.get(svc_id, {}).get("database", "Unknown")
        svc_desc = svc_map[svc_id].description if svc_id in svc_map else SERVICE_DEFINITIONS.get(svc_id, {}).get("description", "")

        latest_metric = (
            db.query(TelemetryMetric)
            .filter(TelemetryMetric.service_id == svc_id)
            .order_by(desc(TelemetryMetric.timestamp))
            .first()
        )
        metric_data = {
            "cpuPercent": latest_metric.cpu_percent if latest_metric else 0.0,
            "memoryMb": latest_metric.memory_mb if latest_metric else 0.0,
            "requestRate": latest_metric.request_rate if latest_metric else 0.0,
            "latencyP95Ms": latest_metric.latency_p95_ms if latest_metric else 0.0,
            "errorRatePercent": latest_metric.error_rate_percent if latest_metric else 0.0,
            "dbQueryLatencyMs": latest_metric.db_query_latency_ms if latest_metric else 0.0,
            "dbConnections": latest_metric.db_connections if latest_metric else 0,
            "queueBacklog": latest_metric.queue_backlog if latest_metric else 0,
            "restartCount": getattr(latest_metric, "restart_count", 0) if latest_metric else 0,
        }
        
        # Determine service status from metrics
        status = "healthy"
        if latest_metric:
            if getattr(latest_metric, "restart_count", 0) > 0 or latest_metric.error_rate_percent >= 90:
                status = "crashed"
            elif latest_metric.cpu_percent > 90 or latest_metric.error_rate_percent > 10:
                status = "critical"
            elif latest_metric.cpu_percent > 70 or latest_metric.latency_p95_ms > 500:
                status = "degraded"
        
        services.append({
            "id": svc_id,
            "name": svc_name,
            "version": svc_ver,
            "status": status,
            "language": svc_lang,
            "framework": svc_framework,
            "database": svc_db,
            "description": svc_desc,
            "currentMetrics": metric_data,
        })
    return services

@router.get("/dependencies")
def get_dependencies(db: Session = Depends(get_db)):
    """Returns the service dependency graph from DB if available."""
    db_deps = db.query(DependencyModel).all()
    if db_deps:
        return [
            {
                "id": d.id,
                "sourceServiceId": d.source_service_id,
                "sourceName": d.source_name,
                "targetServiceId": d.target_service_id,
                "targetName": d.target_name,
                "protocol": d.protocol,
                "avgLatencyMs": d.avg_latency_ms,
                "callRatePerMin": d.call_rate_per_min,
                "status": d.status,
                "isImpacted": False,
            }
            for d in db_deps
        ]
    return DEPENDENCY_GRAPH

@router.get("/scenarios")
def get_scenarios():
    """Returns the list of available fault scenarios."""
    return AVAILABLE_SCENARIOS

def auto_start_simulation():
    """Called on app startup to begin the simulation in nominal mode."""
    global _simulation_running, _simulation_thread
    if not _simulation_running:
        _simulation_running = True
        _simulation_thread = threading.Thread(target=_simulation_loop, daemon=True)
        _simulation_thread.start()
        logger.info("Auto-started simulation in nominal mode")
