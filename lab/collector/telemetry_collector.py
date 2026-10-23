"""
Lab Telemetry Collector
Harvests real telemetry from running lab microservices:
1. Queries /lab/metrics (or scrapes Prometheus /metrics) from all 5 microservices
2. Queries /lab/logs for structured JSON logs
3. Forwards metric batch to Glean: POST /api/v1/metrics/ingest
4. Forwards log batch to Glean: POST /api/v1/logs/ingest
5. Triggers online ML anomaly detection & incident creation via Glean's ingestion path
"""
import os
import time
import requests
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("lab_collector")
logging.basicConfig(level=logging.INFO)

LAB_SERVICES_CONFIG = [
    {"id": "user-service", "name": "User Service", "port": 8001, "env_var": "USER_SERVICE_URL"},
    {"id": "order-service", "name": "Order Service", "port": 8002, "env_var": "ORDER_SERVICE_URL"},
    {"id": "payment-service", "name": "Payment Service", "port": 8003, "env_var": "PAYMENT_SERVICE_URL"},
    {"id": "inventory-service", "name": "Inventory Service", "port": 8004, "env_var": "INVENTORY_SERVICE_URL"},
    {"id": "notification-service", "name": "Notification Service", "port": 8005, "env_var": "NOTIFICATION_SERVICE_URL"},
]

class LabTelemetryCollector:
    def __init__(
        self,
        glean_api_url: Optional[str] = None,
        service_clients: Optional[Dict[str, Any]] = None,
        glean_client: Optional[Any] = None
    ):
        self.glean_api_url = glean_api_url or os.getenv("GLEAN_API_URL", "http://localhost:8000")
        self.services = self._resolve_service_urls()
        self.seen_log_ids = set()
        self.service_clients = service_clients or {}
        self.glean_client = glean_client

    def _resolve_service_urls(self) -> List[Dict[str, Any]]:
        resolved = []
        for s in LAB_SERVICES_CONFIG:
            default_url = f"http://localhost:{s['port']}"
            url = os.getenv(s["env_var"], default_url)
            resolved.append({
                "id": s["id"],
                "name": s["name"],
                "port": s["port"],
                "url": url
            })
        return resolved

    def collect_service_metrics(self, service: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Collects telemetry snapshot from a single running microservice."""
        try:
            client = self.service_clients.get(service["id"])
            if client:
                resp = client.get("/lab/metrics")
            else:
                resp = requests.get(f"{service['url']}/lab/metrics", timeout=2.0)
                
            if resp.status_code == 200:
                data = resp.json()
                data["source"] = "lab_container"
                return data
        except Exception as e:
            logger.debug(f"Service {service['id']} unreachable at {service['url']}: {e}")
        return None

    def collect_service_logs(self, service: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Collects structured JSON logs from a single running microservice."""
        new_logs = []
        try:
            client = self.service_clients.get(service["id"])
            if client:
                resp = client.get("/lab/logs?limit=30")
            else:
                resp = requests.get(f"{service['url']}/lab/logs?limit=30", timeout=2.0)
                
            if resp.status_code == 200:
                logs = resp.json()
                for log in logs:
                    log_id = log.get("id")
                    if log_id and log_id not in self.seen_log_ids:
                        self.seen_log_ids.add(log_id)
                        new_logs.append(log)
                if len(self.seen_log_ids) > 1000:
                    self.seen_log_ids = set(list(self.seen_log_ids)[-500:])
        except Exception as e:
            logger.debug(f"Failed to fetch logs from {service['id']}: {e}")
        return new_logs

    def harvest_and_forward(self) -> Dict[str, Any]:
        """
        Executes one harvest cycle across all 5 lab services:
        - Collects metrics and logs
        - Submits to Glean API ingestion endpoints
        """
        metrics_batch = []
        logs_batch = []

        for s in self.services:
            m = self.collect_service_metrics(s)
            if m:
                metrics_batch.append(m)
            l = self.collect_service_logs(s)
            if l:
                logs_batch.extend(l)

        ingested_metrics_count = 0
        ingested_logs_count = 0

        # Ingest metrics into Glean API
        if metrics_batch:
            try:
                if self.glean_client:
                    m_resp = self.glean_client.post("/api/v1/metrics/ingest", json={"metrics": metrics_batch})
                else:
                    m_resp = requests.post(
                        f"{self.glean_api_url}/api/v1/metrics/ingest",
                        json={"metrics": metrics_batch},
                        timeout=3.0
                    )
                if m_resp.status_code == 200:
                    ingested_metrics_count = len(metrics_batch)
                    logger.info(f"Successfully forwarded {ingested_metrics_count} metrics to Glean API")
            except Exception as e:
                logger.error(f"Failed to post metrics to Glean API: {e}")

        # Ingest logs into Glean API
        if logs_batch:
            try:
                if self.glean_client:
                    l_resp = self.glean_client.post("/api/v1/logs/ingest", json={"logs": logs_batch})
                else:
                    l_resp = requests.post(
                        f"{self.glean_api_url}/api/v1/logs/ingest",
                        json={"logs": logs_batch},
                        timeout=3.0
                    )
                if l_resp.status_code == 200:
                    ingested_logs_count = len(logs_batch)
                    logger.info(f"Successfully forwarded {ingested_logs_count} logs to Glean API")
            except Exception as e:
                logger.error(f"Failed to post logs to Glean API: {e}")

        return {
            "services_scraped": len(self.services),
            "metrics_forwarded": ingested_metrics_count,
            "logs_forwarded": ingested_logs_count,
            "timestamp": time.time()
        }

    def run_continuous(self, interval_sec: float = 3.0):
        """Runs the continuous telemetry collection loop."""
        logger.info(f"Starting Lab Telemetry Collector (interval={interval_sec}s, target={self.glean_api_url})...")
        while True:
            try:
                self.harvest_and_forward()
            except Exception as e:
                logger.error(f"Collector loop iteration error: {e}")
            time.sleep(interval_sec)

if __name__ == "__main__":
    collector = LabTelemetryCollector()
    collector.run_continuous(interval_sec=3.0)
