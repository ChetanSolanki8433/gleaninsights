import os
import time
import threading
import psutil
import requests
import datetime
from typing import Dict, Any, List, Optional
from backend.ml.anomaly_detector import anomaly_detector
from backend.models import TelemetryMetric, AnomalyEvent
from backend.database import SessionLocal

class SystemCollector:
    """
    Live Host & Container Telemetry Collector using psutil and Prometheus client scraper.
    Also manages native background compute fault injection (CPU spinner, memory allocation).
    """
    def __init__(self):
        self.is_running = False
        self._thread: Optional[threading.Thread] = None
        self.active_faults: Dict[str, Any] = {}
        self.prometheus_url = os.getenv("PROMETHEUS_URL", "http://localhost:9090")
        self.node_exporter_url = os.getenv("NODE_EXPORTER_URL", "http://localhost:9100/metrics")
        self._allocated_memory_blocks: List[bytearray] = []
        self._cpu_burn_active = False

    def get_host_metrics(self) -> Dict[str, Any]:
        """Collects real-time hardware telemetry from the host / container."""
        cpu_percent = psutil.cpu_percent(interval=None)
        mem = psutil.virtual_memory()
        disk = psutil.disk_usage("/")
        net = psutil.net_io_counters()

        # Count active network connections
        try:
            conns = len(psutil.net_connections(kind="inet"))
        except Exception:
            conns = 12

        return {
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "cpu_percent": float(cpu_percent),
            "memory_mb": round(float((mem.total - mem.available) / (1024 * 1024)), 1),
            "memory_total_mb": round(float(mem.total / (1024 * 1024)), 1),
            "memory_percent": float(mem.percent),
            "disk_percent": float(disk.percent),
            "network_bytes_sent": net.bytes_sent,
            "network_bytes_recv": net.bytes_recv,
            "active_socket_connections": conns,
            "system_load_avg": list(os.getloadavg()) if hasattr(os, "getloadavg") else [0.5, 0.4, 0.3],
            "cpu_count": psutil.cpu_count() or 4
        }

    def scrape_prometheus_metrics(self) -> Optional[Dict[str, float]]:
        """Scrapes standard prometheus node_exporter endpoint if reachable."""
        try:
            resp = requests.get(self.node_exporter_url, timeout=1.5)
            if resp.status_code == 200:
                lines = resp.text.splitlines()
                parsed = {}
                for line in lines:
                    if line.startswith("#") or not line.strip():
                        continue
                    parts = line.split()
                    if len(parts) >= 2:
                        metric_name = parts[0]
                        try:
                            val = float(parts[1])
                            parsed[metric_name] = val
                        except ValueError:
                            pass
                return parsed
        except Exception:
            pass
        return None

    # --- Native Real Fault Injections for Local Benchmarking ---
    def trigger_cpu_load(self, duration_sec: int = 30, threads_count: int = 2):
        """Spins native CPU worker threads to produce genuine hardware CPU load."""
        def burn():
            start = time.time()
            while time.time() - start < duration_sec and self._cpu_burn_active:
                _ = [x * x for x in range(10000)]
                time.sleep(0.001)

        self._cpu_burn_active = True
        for _ in range(threads_count):
            t = threading.Thread(target=burn, daemon=True)
            t.start()

    def trigger_memory_load(self, size_mb: int = 200, duration_sec: int = 30):
        """Allocates real memory in process space to trigger actual memory saturation."""
        def alloc():
            try:
                # Allocate chunk of bytes
                chunk = bytearray(size_mb * 1024 * 1024)
                self._allocated_memory_blocks.append(chunk)
                time.sleep(duration_sec)
            finally:
                self._allocated_memory_blocks.clear()

        t = threading.Thread(target=alloc, daemon=True)
        t.start()

    def clear_faults(self):
        """Terminates all active fault worker loops and frees allocated memory."""
        self._cpu_burn_active = False
        self._allocated_memory_blocks.clear()
        self.active_faults.clear()

system_collector = SystemCollector()
