"""
Lab Service Telemetry & Fault Instrumentation Base
Provides:
- Prometheus metric exposure (/metrics)
- Structured JSON logging with in-memory buffer (/lab/logs)
- Controlled fault injection (/lab/fault and /lab/fault/reset)
- Real metric measurement with psutil fallback & dynamic behavior
"""
import os
import time
import uuid
import json
import psutil
import logging
import threading
import datetime
from typing import Dict, Any, List, Optional
from prometheus_client import Counter, Gauge, Histogram, generate_latest, CONTENT_TYPE_LATEST
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse

# Configure structured JSON logger
logger = logging.getLogger("lab_service")
logger.setLevel(logging.INFO)

class LabTelemetry:
    def __init__(self, service_id: str, service_name: str, port: int):
        self.service_id = service_id
        self.service_name = service_name
        self.port = port
        self.start_time = time.time()
        
        # Prometheus Metrics
        self.http_requests_total = Counter(
            f"{service_id.replace('-', '_')}_requests_total",
            "Total HTTP requests received",
            ["method", "endpoint", "status"]
        )
        self.http_duration_seconds = Histogram(
            f"{service_id.replace('-', '_')}_duration_seconds",
            "Request execution duration in seconds",
            ["method", "endpoint"]
        )
        self.gauge_cpu = Gauge(f"{service_id.replace('-', '_')}_cpu_percent", "Current CPU utilization percentage")
        self.gauge_memory = Gauge(f"{service_id.replace('-', '_')}_memory_mb", "Current RAM consumption in MB")
        self.gauge_db_conn = Gauge(f"{service_id.replace('-', '_')}_db_connections", "Active database connections")
        self.gauge_db_latency = Gauge(f"{service_id.replace('-', '_')}_db_query_latency_ms", "Database query latency in ms")
        self.gauge_error_rate = Gauge(f"{service_id.replace('-', '_')}_error_rate_percent", "Current error rate percentage")
        
        # In-memory structured logs buffer (last 200 logs)
        self._logs_buffer: List[Dict[str, Any]] = []
        self._logs_lock = threading.Lock()
        
        # Controlled Fault Injection State
        self.active_fault: Optional[Dict[str, Any]] = None
        self._fault_lock = threading.Lock()
        self._cpu_burn_stop = threading.Event()
        self._memory_leak_blocks: List[bytearray] = []
        
        # Baseline simulation metrics (realistic microservice idle values)
        self.baseline_cpu = 18.0 + (port % 5) * 3.0
        self.baseline_memory = 320.0 + (port % 5) * 40.0
        self.baseline_db_conn = 12 + (port % 3) * 5
        self.baseline_db_lat = 8.0 + (port % 4) * 2.5
        
        # Request counters for dynamic error & latency tracking
        self._total_requests_window = 0
        self._error_requests_window = 0
        self._latencies_window: List[float] = []

    def emit_log(
        self,
        level: str,
        message: str,
        endpoint: str = "/",
        status_code: int = 200,
        duration_ms: float = 10.0,
        request_id: Optional[str] = None,
        trace_id: Optional[str] = None,
        exception_type: Optional[str] = None,
        extra_metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Emits a structured JSON log and retains in buffer for telemetry harvesting."""
        log_entry = {
            "id": f"log-{uuid.uuid4().hex[:12]}",
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "service_id": self.service_id,
            "service_name": self.service_name,
            "level": level.upper(),
            "message": message,
            "request_id": request_id or f"req-{uuid.uuid4().hex[:8]}",
            "trace_id": trace_id or f"tr-{uuid.uuid4().hex[:12]}",
            "endpoint": endpoint,
            "exception_type": exception_type,
            "duration_ms": round(duration_ms, 2),
            "status_code": status_code,
            "extra_metadata": extra_metadata or {}
        }
        
        with self._logs_lock:
            self._logs_buffer.append(log_entry)
            if len(self._logs_buffer) > 200:
                self._logs_buffer.pop(0)
                
        # Also print to standard output as formatted JSON
        print(json.dumps(log_entry))
        return log_entry

    def get_recent_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Returns recent structured logs from buffer."""
        with self._logs_lock:
            return list(self._logs_buffer[-limit:])

    def inject_fault(self, fault_type: str, duration_sec: int = 60, intensity: float = 1.0) -> Dict[str, Any]:
        """Activates a controlled hardware / runtime fault."""
        self.reset_faults()
        
        with self._fault_lock:
            self.active_fault = {
                "fault_type": fault_type,
                "start_time": time.time(),
                "duration_sec": duration_sec,
                "intensity": intensity,
                "expires_at": time.time() + duration_sec
            }
            
        self.emit_log(
            level="WARN",
            message=f"Fault injection activated on {self.service_name}: {fault_type} (duration={duration_sec}s, intensity={intensity})",
            endpoint="/lab/fault",
            status_code=200
        )
        
        if fault_type in ["cpu_saturation", "high_cpu"]:
            self._cpu_burn_stop.clear()
            num_threads = max(1, int(2 * intensity))
            for _ in range(num_threads):
                t = threading.Thread(target=self._cpu_worker, daemon=True)
                t.start()
                
        elif fault_type in ["memory_leak", "high_memory"]:
            # Allocate memory chunks in RAM (e.g., 350MB - 600MB)
            chunk_size_mb = 50
            total_chunks = max(4, int(10 * intensity))
            for _ in range(total_chunks):
                try:
                    self._memory_leak_blocks.append(bytearray(chunk_size_mb * 1024 * 1024))
                except MemoryError:
                    break
                    
        return {"status": "injected", "fault": self.active_fault}

    def _cpu_worker(self):
        """Worker thread to produce real CPU cycles."""
        start = time.time()
        while not self._cpu_burn_stop.is_set():
            if self.active_fault and time.time() > self.active_fault.get("expires_at", float("inf")):
                break
            _ = [x * x for x in range(50000)]
            time.sleep(0.001)

    def reset_faults(self) -> Dict[str, Any]:
        """Clears all running faults and releases allocated compute resources."""
        self._cpu_burn_stop.set()
        self._memory_leak_blocks.clear()
        
        had_fault = self.active_fault is not None
        with self._fault_lock:
            self.active_fault = None
            
        if had_fault:
            self.emit_log(
                level="INFO",
                message=f"Faults cleared on {self.service_name}. Normal baseline restored.",
                endpoint="/lab/fault/reset",
                status_code=200
            )
            
        return {"status": "reset", "service": self.service_id}

    def get_current_metrics_snapshot(self) -> Dict[str, Any]:
        """
        Calculates current real-time telemetry snapshot matching Glean's TelemetryMetric schema.
        Includes real CPU/memory measurements with fault effects.
        """
        now = time.time()
        
        # Check fault expiry
        if self.active_fault and now > self.active_fault.get("expires_at", float("inf")):
            self.reset_faults()
            
        # Real system process metrics if available
        try:
            proc = psutil.Process()
            cpu_val = proc.cpu_percent(interval=None)
            mem_val = proc.memory_info().rss / (1024 * 1024)
        except Exception:
            cpu_val = self.baseline_cpu
            mem_val = self.baseline_memory

        cpu_percent = max(self.baseline_cpu, cpu_val)
        memory_mb = max(self.baseline_memory, mem_val)
        db_conn = self.baseline_db_conn
        db_latency = self.baseline_db_lat
        latency_p95 = 25.0 + (self.port % 10) * 2.0
        error_rate = 0.05
        request_rate = max(10.0, float(self._total_requests_window * 2.0))
        queue_backlog = 0

        # Apply active fault dynamics directly to the emitted telemetry
        if self.active_fault:
            f_type = self.active_fault["fault_type"]
            duration = now - self.active_fault["start_time"]
            
            if f_type in ["cpu_saturation", "high_cpu"]:
                cpu_percent = min(99.0, 92.0 + (cpu_val % 7.0))
                latency_p95 = 1200.0 + duration * 15.0
                error_rate = 8.5
                queue_backlog = 180
                
            elif f_type in ["memory_leak", "high_memory"]:
                allocated_mb = len(self._memory_leak_blocks) * 50
                memory_mb = max(memory_mb, 550.0 + allocated_mb + min(400.0, duration * 20.0))
                latency_p95 = 450.0 + duration * 5.0
                cpu_percent = min(90.0, cpu_percent + 25.0)
                
            elif f_type in ["database_latency", "slow_db"]:
                db_latency = 1250.0 + (now % 300)
                latency_p95 = latency_p95 + db_latency
                db_conn = min(150, db_conn + 45)
                error_rate = 12.0
                
            elif f_type in ["connection_exhaustion", "db_pool_leak"]:
                db_conn = 98
                db_latency = 950.0
                error_rate = 28.5
                latency_p95 = 1450.0
                
            elif f_type in ["crash", "service_crash"]:
                cpu_percent = 0.0
                memory_mb = 0.0
                request_rate = 0.0
                latency_p95 = 0.0
                error_rate = 100.0
                
            elif f_type in ["network_delay", "network_latency"]:
                latency_p95 = 2100.0 + (now % 400)
                error_rate = 10.0
                
            elif f_type in ["slow_payment_gateway", "gateway_timeout"]:
                latency_p95 = 3800.0 + (now % 600)
                error_rate = 22.0
                queue_backlog = 450

        # Update Prometheus gauges
        self.gauge_cpu.set(cpu_percent)
        self.gauge_memory.set(memory_mb)
        self.gauge_db_conn.set(db_conn)
        self.gauge_db_latency.set(db_latency)
        self.gauge_error_rate.set(error_rate)

        # Reset window counters
        self._total_requests_window = 0
        self._error_requests_window = 0
        self._latencies_window.clear()

        return {
            "service_id": self.service_id,
            "service_name": self.service_name,
            "cpu_percent": round(cpu_percent, 2),
            "memory_mb": round(memory_mb, 2),
            "request_rate": round(request_rate, 2),
            "latency_p95_ms": round(latency_p95, 2),
            "error_rate_percent": round(error_rate, 2),
            "db_query_latency_ms": round(db_latency, 2),
            "db_connections": int(db_conn),
            "queue_backlog": int(queue_backlog),
            "source": "lab_microservice"
        }

def setup_lab_service(app: FastAPI, telemetry: LabTelemetry):
    """Hooks standard lab routes and middleware onto any FastAPI lab microservice."""
    
    @app.middleware("http")
    async def lab_metrics_middleware(request: Request, call_next):
        start_t = time.time()
        req_id = request.headers.get("X-Request-ID", f"req-{uuid.uuid4().hex[:8]}")
        trace_id = request.headers.get("X-Trace-ID", f"tr-{uuid.uuid4().hex[:12]}")
        
        # Check if service is simulated crashed
        if telemetry.active_fault and telemetry.active_fault.get("fault_type") in ["crash", "service_crash"]:
            telemetry.emit_log(
                level="FATAL",
                message=f"Process down: 503 Service Unavailable on {request.url.path}",
                endpoint=request.url.path,
                status_code=503,
                request_id=req_id,
                trace_id=trace_id,
                exception_type="ProcessCrashException"
            )
            telemetry.http_requests_total.labels(method=request.method, endpoint=request.url.path, status=503).inc()
            return JSONResponse(status_code=503, content={"error": f"{telemetry.service_name} is currently crashed / restarting."})

        # Check injected latency
        if telemetry.active_fault:
            f_type = telemetry.active_fault.get("fault_type")
            if f_type in ["network_delay", "network_latency"]:
                time.sleep(0.15)
            elif f_type in ["slow_payment_gateway", "gateway_timeout"] and "payment" in telemetry.service_id:
                time.sleep(0.25)
                
        response = await call_next(request)
        duration_s = time.time() - start_t
        duration_ms = duration_s * 1000.0
        
        telemetry.http_requests_total.labels(
            method=request.method,
            endpoint=request.url.path,
            status=response.status_code
        ).inc()
        telemetry.http_duration_seconds.labels(
            method=request.method,
            endpoint=request.url.path
        ).observe(duration_s)
        
        telemetry._total_requests_window += 1
        if response.status_code >= 400:
            telemetry._error_requests_window += 1
        telemetry._latencies_window.append(duration_ms)
        
        # Emit standard access log on non-internal paths
        if not request.url.path.startswith(("/metrics", "/health", "/lab/")):
            lvl = "INFO" if response.status_code < 400 else "ERROR"
            telemetry.emit_log(
                level=lvl,
                message=f"{request.method} {request.url.path} responded {response.status_code} in {duration_ms:.1f}ms",
                endpoint=request.url.path,
                status_code=response.status_code,
                duration_ms=duration_ms,
                request_id=req_id,
                trace_id=trace_id
            )
            
        return response

    @app.get("/metrics")
    def prometheus_metrics():
        """Exposes standard Prometheus scrape target."""
        # Update gauges prior to scraping
        telemetry.get_current_metrics_snapshot()
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    @app.get("/health")
    def health_check():
        """Returns health probe status."""
        is_healthy = True
        status_str = "healthy"
        if telemetry.active_fault:
            if telemetry.active_fault.get("fault_type") in ["crash", "service_crash"]:
                is_healthy = False
                status_str = "crashed"
            else:
                status_str = "degraded"
                
        return {
            "service_id": telemetry.service_id,
            "service_name": telemetry.service_name,
            "status": status_str,
            "healthy": is_healthy,
            "uptime_seconds": round(time.time() - telemetry.start_time, 1),
            "active_fault": telemetry.active_fault,
            "port": telemetry.port
        }

    @app.get("/lab/metrics")
    def lab_metrics_snapshot():
        """Returns structured metrics snapshot for Glean ingestion."""
        return telemetry.get_current_metrics_snapshot()

    @app.get("/lab/logs")
    def lab_logs(limit: int = 50):
        """Returns buffered structured JSON logs."""
        return telemetry.get_recent_logs(limit=limit)

    @app.post("/lab/fault")
    def trigger_fault(payload: Dict[str, Any]):
        """Injects controlled fault."""
        fault_type = payload.get("fault_type", "cpu_saturation")
        duration = int(payload.get("duration_sec", 60))
        intensity = float(payload.get("intensity", 1.0))
        return telemetry.inject_fault(fault_type=fault_type, duration_sec=duration, intensity=intensity)

    @app.post("/lab/fault/reset")
    def reset_fault():
        """Resets all faults to nominal baseline."""
        return telemetry.reset_faults()
