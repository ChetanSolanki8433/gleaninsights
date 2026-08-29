import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST, Counter, Gauge

from backend.database import init_db
from backend.routers import metrics, logs, anomalies, rca, remediation
from backend.collectors.system_collector import system_collector

# Initialize DB tables
init_db()

app = FastAPI(
    title="AIOps Microservice Observability & RCA Engine",
    description="Native, fully offline ML anomaly detection, 5-factor deterministic RCA, and human-approved remediation platform.",
    version="2.0.0"
)

# CORS middleware for local frontend connectivity
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all API Routers
app.include_router(metrics.router)
app.include_router(logs.router)
app.include_router(anomalies.router)
app.include_router(rca.router)
app.include_router(remediation.router)

# Prometheus Metrics instrumentation
HTTP_REQUESTS_TOTAL = Counter("aiops_http_requests_total", "Total HTTP requests received", ["method", "endpoint"])
SYSTEM_CPU_GAUGE = Gauge("aiops_system_cpu_percent", "Current Host CPU utilization")
SYSTEM_MEM_GAUGE = Gauge("aiops_system_memory_mb", "Current Host RAM utilization in MB")

@app.middleware("http")
async def monitor_requests(request: Request, call_next):
    HTTP_REQUESTS_TOTAL.labels(method=request.method, endpoint=request.url.path).inc()
    response = await call_next(request)
    return response

@app.get("/metrics")
def get_prometheus_metrics():
    """Exposes Prometheus scrape endpoint for host and application telemetry."""
    host = system_collector.get_host_metrics()
    SYSTEM_CPU_GAUGE.set(host["cpu_percent"])
    SYSTEM_MEM_GAUGE.set(host["memory_mb"])
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.get("/api/health")
def health_check():
    """Health check endpoint validating native offline ML state."""
    return {
        "status": "ok",
        "version": "2.0.0",
        "architecture": "native-offline-fullstack",
        "ml_engines": {
            "anomaly_detector": "Scikit-Learn IsolationForest + PyTorch Autoencoder",
            "rca_engine": "Deterministic 5-Factor Mathematical Correlation (R-Score)",
            "ai_explainer": "Local Evidence-Grounded Synthesis Engine (Zero Cloud LLM)"
        },
        "database": "SQLAlchemy SQLite / PostgreSQL",
        "collector": "psutil native system telemetry + Prometheus scraper",
        "timestamp": system_collector.get_host_metrics()["timestamp"]
    }

# Synthetic and real compute fault injection endpoints for reproducibility
@app.post("/api/v1/faults/inject")
def inject_fault(scenario: str, duration_sec: int = 60):
    """Triggers genuine compute and memory load on host for benchmark reproducibility."""
    if scenario in ["cpu_saturation_order", "high_cpu"]:
        system_collector.trigger_cpu_load(duration_sec=duration_sec, threads_count=2)
    elif scenario in ["memory_leak_user", "high_memory"]:
        system_collector.trigger_memory_load(size_mb=180, duration_sec=duration_sec)

    return {
        "status": "injected",
        "scenario": scenario,
        "duration_sec": duration_sec,
        "target": "native-system-collector"
    }

@app.post("/api/v1/faults/reset")
def reset_faults():
    """Clears all running background fault routines."""
    system_collector.clear_faults()
    return {"status": "cleared"}

# Direct alias for frontend explanation endpoint
@app.post("/api/v1/ai/explain-incident")
def explain_incident_alias(payload: dict):
    from backend.routers.rca import explain_incident
    return explain_incident(payload=payload, db=None)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=False)
