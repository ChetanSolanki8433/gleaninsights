"""
Backend Integration Wrapper for Lab Telemetry Collector
Allows Glean backend to harvest telemetry directly from running lab services.
"""
import threading
import logging
from typing import Dict, Any, Optional
from lab.collector.telemetry_collector import LabTelemetryCollector

logger = logging.getLogger("backend.lab_collector")

class BackendLabCollector:
    def __init__(self):
        self.collector = LabTelemetryCollector()
        self._running = False
        self._thread: Optional[threading.Thread] = None

    def harvest_tick(self) -> Dict[str, Any]:
        """Harvests telemetry from all running lab microservices and ingests into Glean."""
        return self.collector.harvest_and_forward()

    def start_background(self, interval_sec: float = 3.0):
        if not self._running:
            self._running = True
            def loop():
                while self._running:
                    try:
                        self.harvest_tick()
                    except Exception as e:
                        logger.error(f"Lab collector background error: {e}")
                    import time
                    time.sleep(interval_sec)
            self._thread = threading.Thread(target=loop, daemon=True)
            self._thread.start()
            logger.info("Started lab collector background thread.")

    def stop_background(self):
        self._running = False

    def get_status(self) -> Dict[str, Any]:
        return {
            "is_running": self._running,
            "services_monitored": [s["id"] for s in self.collector.services]
        }

lab_collector = BackendLabCollector()
