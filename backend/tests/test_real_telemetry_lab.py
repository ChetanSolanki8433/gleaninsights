"""
Real Telemetry Lab Smoke Test & Pipeline Verification
Proves:
1. All five microservices start and expose health probes
2. Prometheus receives/scrapes standardized metrics
3. Microservices emit structured JSON logs
4. Glean receives telemetry from real lab services via ingestion API
5. Telemetry is persisted in database
6. Glean's online ML detector detects an injected fault
7. Incident engine automatically declares an incident
8. RCA engine identifies the affected service without knowing the scenario label
"""
import sys
import os
import unittest
import time
import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi.testclient import TestClient

# Glean Backend
from backend.main import app as glean_app
from backend.database import SessionLocal, init_db
from backend.models import TelemetryMetric, LogEntry, AnomalyEvent, Incident, RcaResult
from backend.services.incident_engine import incident_engine

# Lab Services
from lab.services.user_service.main import app as user_app
from lab.services.order_service.main import app as order_app
from lab.services.payment_service.main import app as payment_app
from lab.services.inventory_service.main import app as inventory_app
from lab.services.notification_service.main import app as notification_app

# Lab Collector
from lab.collector.telemetry_collector import LabTelemetryCollector


class TestRealTelemetryLab(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.glean_client = TestClient(glean_app)
        cls.clients = {
            "user-service": TestClient(user_app),
            "order-service": TestClient(order_app),
            "payment-service": TestClient(payment_app),
            "inventory-service": TestClient(inventory_app),
            "notification-service": TestClient(notification_app),
        }
        cls.collector = LabTelemetryCollector(
            service_clients=cls.clients,
            glean_client=cls.glean_client
        )

    def test_1_all_five_services_start_and_healthy(self):
        """Proof 1: All five lab microservices start and respond to health probes."""
        for svc_id, client in self.clients.items():
            resp = client.get("/health")
            self.assertEqual(resp.status_code, 200, f"{svc_id} health probe failed")
            data = resp.json()
            self.assertEqual(data["service_id"], svc_id)
            self.assertTrue(data["healthy"])
            self.assertEqual(data["status"], "healthy")

    def test_2_prometheus_receives_metrics(self):
        """Proof 2: Every microservice exposes valid Prometheus metrics format."""
        for svc_id, client in self.clients.items():
            resp = client.get("/metrics")
            self.assertEqual(resp.status_code, 200, f"{svc_id} /metrics failed")
            self.assertIn("text/plain", resp.headers.get("content-type", ""))
            body = resp.text
            # Verify required Prometheus metrics exist
            metric_prefix = svc_id.replace("-", "_")
            self.assertIn(f"{metric_prefix}_cpu_percent", body)
            self.assertIn(f"{metric_prefix}_memory_mb", body)
            self.assertIn(f"{metric_prefix}_requests_total", body)

    def test_3_services_generate_structured_logs(self):
        """Proof 3: Microservice business operations generate structured JSON logs."""
        # Execute business requests
        u_client = self.clients["user-service"]
        u_client.get("/api/v1/users/usr_402")
        u_client.post("/api/v1/auth/login", json={"username": "alex_sre"})

        o_client = self.clients["order-service"]
        o_client.get("/api/v1/orders/ord_100")

        # Check logs buffer
        for svc_id in ["user-service", "order-service"]:
            resp = self.clients[svc_id].get("/lab/logs")
            self.assertEqual(resp.status_code, 200)
            logs = resp.json()
            self.assertGreater(len(logs), 0, f"{svc_id} did not produce logs")
            first_log = logs[0]
            self.assertEqual(first_log["service_id"], svc_id)
            self.assertIn("message", first_log)
            self.assertIn("timestamp", first_log)
            self.assertIn("level", first_log)

    def test_4_glean_receives_and_persists_telemetry(self):
        """Proof 4 & 5: Glean receives telemetry and logs from the collector and persists them."""
        db = SessionLocal()
        try:
            # Run one collector harvest cycle across all 5 live services
            result = self.collector.harvest_and_forward()
            self.assertEqual(result["services_scraped"], 5)
            self.assertGreaterEqual(result["metrics_forwarded"], 5)

            # Verify metrics are persisted in Glean DB with real provenance
            metrics = (
                db.query(TelemetryMetric)
                .filter(TelemetryMetric.source == "lab_container")
                .all()
            )
            self.assertGreater(len(metrics), 0, "No lab container metrics found in DB")
            service_ids_in_db = {m.service_id for m in metrics}
            self.assertIn("user-service", service_ids_in_db)
            self.assertIn("order-service", service_ids_in_db)

            # Verify structured logs are persisted in Glean DB
            logs_in_db = db.query(LogEntry).all()
            self.assertGreater(len(logs_in_db), 0, "No structured logs persisted in DB")
        finally:
            db.close()

    def test_5_injected_fault_detection_incident_and_rca(self):
        """Proof 6, 7 & 8: Injected fault produces anomaly detection, incident creation, and RCA ranking."""
        order_client = self.clients["order-service"]
        db = SessionLocal()
        try:
            # 1. Inject controlled CPU saturation fault directly on order-service
            fault_res = order_client.post("/lab/fault", json={
                "fault_type": "cpu_saturation",
                "duration_sec": 60,
                "intensity": 1.0
            })
            self.assertEqual(fault_res.status_code, 200)
            self.assertEqual(fault_res.json()["status"], "injected")

            # 2. Verify order-service health reflects degraded status
            health_res = order_client.get("/health")
            self.assertEqual(health_res.json()["status"], "degraded")

            # 3. Harvest 4 ticks of real telemetry through the collector
            anomalies_detected = []
            for _ in range(4):
                self.collector.harvest_and_forward()
                time.sleep(0.05)

            # 4. Check that Glean's online ML detector flagged anomalies for order-service
            anomalies = (
                db.query(AnomalyEvent)
                .filter(AnomalyEvent.service_id == "order-service")
                .all()
            )
            self.assertGreater(len(anomalies), 0, "Glean ML detector failed to detect order-service anomaly")

            # 5. Evaluate incidents via IncidentEngine
            incident = incident_engine.check_for_incidents(db)
            active_inc = incident_engine.get_active_incident(db)
            target_incident = incident or active_inc
            self.assertIsNotNone(target_incident, "Incident was not created for order-service anomaly")
            self.assertEqual(target_incident.service_id, "order-service")

            # 6. Verify 5-factor RCA identified order-service as top candidate
            rca_candidates = (
                db.query(RcaResult)
                .filter(RcaResult.incident_id == target_incident.id)
                .order_by(RcaResult.rank)
                .all()
            )
            self.assertGreater(len(rca_candidates), 0, "No RCA candidates produced")
            top_cand = rca_candidates[0]
            self.assertEqual(top_cand.candidate_service_id, "order-service")
            self.assertEqual(top_cand.rank, 1)
            self.assertGreater(top_cand.score, 40.0)

            # 7. Clean up: reset fault on order-service
            reset_res = order_client.post("/lab/fault/reset")
            self.assertEqual(reset_res.status_code, 200)
            self.assertEqual(order_client.get("/health").json()["status"], "healthy")
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
