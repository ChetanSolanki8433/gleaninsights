"""API integration tests for Glean Insights."""
import sys
import os
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


class TestHealthEndpoint(unittest.TestCase):
    def test_health_check(self):
        response = client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertIn("ml_engines", data)


class TestSimulationEndpoints(unittest.TestCase):
    def test_get_state(self):
        response = client.get("/api/v1/simulation/state")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("scenario", data)
        self.assertIn("is_running", data)
    
    def test_get_scenarios(self):
        response = client.get("/api/v1/simulation/scenarios")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreaterEqual(len(data), 8)
    
    def test_get_services(self):
        response = client.get("/api/v1/simulation/services")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 5)
    
    def test_get_dependencies(self):
        response = client.get("/api/v1/simulation/dependencies")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreaterEqual(len(data), 7)
    
    def test_set_scenario(self):
        response = client.post("/api/v1/simulation/scenario", json={"scenario": "cpu_saturation_order"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["scenario"], "cpu_saturation_order")
        client.post("/api/v1/simulation/reset")
    
    def test_set_scenario_crash(self):
        response = client.post("/api/v1/simulation/scenario", json={"scenario": "service_crash"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["scenario"], "service_crash")
        client.post("/api/v1/simulation/reset")

    def test_set_scenario_cascade(self):
        response = client.post("/api/v1/simulation/scenario", json={"scenario": "dependency_cascade"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["scenario"], "dependency_cascade")
        client.post("/api/v1/simulation/reset")

    def test_reset(self):
        response = client.post("/api/v1/simulation/reset")
        self.assertEqual(response.status_code, 200)


class TestRemediationEndpoints(unittest.TestCase):
    def test_get_playbooks(self):
        response = client.get("/api/v1/remediation/playbooks")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreaterEqual(len(data), 6)
        playbook_ids = {p["id"] for p in data}
        self.assertIn("playbook-restart-crashed-payment", playbook_ids)
        self.assertIn("playbook-cascade-throttle", playbook_ids)
    
    def test_get_audit_trail(self):
        response = client.get("/api/v1/remediation/audit")
        self.assertEqual(response.status_code, 200)


class TestIncidentEndpoints(unittest.TestCase):
    def test_list_incidents(self):
        response = client.get("/api/v1/incidents")
        self.assertEqual(response.status_code, 200)

    def test_active_incident(self):
        response = client.get("/api/v1/incidents/active")
        self.assertEqual(response.status_code, 200)


class TestMetricsEndpoints(unittest.TestCase):
    def test_latest_metrics(self):
        response = client.get("/api/v1/metrics/latest")
        self.assertEqual(response.status_code, 200)


class TestEvaluationEndpoint(unittest.TestCase):
    def test_get_report_empty(self):
        response = client.get("/api/v1/evaluation/report")
        self.assertEqual(response.status_code, 200)

    def test_run_evaluation_api(self):
        response = client.post("/api/v1/evaluation/run")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreaterEqual(data["totalScenarios"], 8)
        self.assertGreaterEqual(data["top1Accuracy"], 90.0)
        self.assertGreaterEqual(data["top3Accuracy"], 90.0)


if __name__ == "__main__":
    unittest.main()
