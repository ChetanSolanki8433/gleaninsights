"""Core backend tests for Glean Insights."""
import sys
import os
import unittest
import time
import datetime

# Ensure project root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


class TestSyntheticGenerator(unittest.TestCase):
    """Tests for the SyntheticDataGenerator."""
    
    def test_nominal_tick(self):
        from backend.services.synthetic_generator import SyntheticDataGenerator
        gen = SyntheticDataGenerator()
        tick = gen.generate_tick()
        self.assertIn("metrics", tick)
        self.assertIn("logs", tick)
        self.assertEqual(len(tick["metrics"]), 5)  # 5 services
        self.assertGreater(len(tick["logs"]), 0)
    
    def test_scenario_affects_target(self):
        from backend.services.synthetic_generator import SyntheticDataGenerator
        gen = SyntheticDataGenerator()
        gen.set_scenario("cpu_saturation_order")
        time.sleep(0.1)
        tick = gen.generate_tick()
        order_metric = [m for m in tick["metrics"] if m["service_id"] == "order-service"][0]
        self.assertGreater(order_metric["cpu_percent"], 85)
    
    def test_reset_returns_to_nominal(self):
        from backend.services.synthetic_generator import SyntheticDataGenerator
        gen = SyntheticDataGenerator()
        gen.set_scenario("cpu_saturation_order")
        gen.reset()
        state = gen.get_state()
        self.assertEqual(state["scenario"], "nominal")
    
    def test_all_scenarios_generate_data(self):
        from backend.services.synthetic_generator import SyntheticDataGenerator
        scenarios = [
            "nominal", "cpu_saturation_order", "memory_leak_user",
            "database_latency_order", "db_connection_exhaustion",
            "service_crash_payment", "network_latency_inventory",
            "slow_payment_gateway", "cascading_failure_chain"
        ]
        for sc in scenarios:
            gen = SyntheticDataGenerator()
            gen.set_scenario(sc)
            tick = gen.generate_tick()
            self.assertEqual(len(tick["metrics"]), 5, f"Scenario {sc} failed to generate 5 metrics")


class TestAnomalyDetector(unittest.TestCase):
    """Tests for the ML anomaly detector."""
    
    def test_normal_metrics_not_anomalous(self):
        from backend.ml.anomaly_detector import anomaly_detector
        normal_metric = {
            "service_id": "order-service",
            "service_name": "Order Service",
            "cpu_percent": 25.0,
            "memory_mb": 512.0,
            "latency_p95_ms": 45.0,
            "error_rate_percent": 0.1,
            "db_query_latency_ms": 8.0,
            "db_connections": 15,
            "service_status": "healthy"
        }
        result = anomaly_detector.evaluate_telemetry(normal_metric)
        self.assertLess(result["final_anomaly_score"], 0.7)
    
    def test_anomalous_metrics_detected(self):
        from backend.ml.anomaly_detector import anomaly_detector
        bad_metric = {
            "service_id": "order-service",
            "service_name": "Order Service",
            "cpu_percent": 98.0,
            "memory_mb": 512.0,
            "latency_p95_ms": 1500.0,
            "error_rate_percent": 15.0,
            "db_query_latency_ms": 8.0,
            "db_connections": 15,
            "service_status": "critical"
        }
        result = anomaly_detector.evaluate_telemetry(bad_metric)
        self.assertTrue(result["is_anomaly"])


class TestRcaEngine(unittest.TestCase):
    """Tests for the deterministic RCA engine."""
    
    def test_rca_ranks_candidates(self):
        from backend.ml.rca_engine import rca_engine
        services = [
            {"id": "order-service", "name": "Order Service", "cpu_percent": 95, "memory_mb": 512, "latency_p95_ms": 1200, "error_rate_percent": 10, "db_connections": 20, "db_query_latency_ms": 8, "status": "critical"},
            {"id": "user-service", "name": "User Service", "cpu_percent": 25, "memory_mb": 300, "latency_p95_ms": 40, "error_rate_percent": 0.1, "db_connections": 10, "db_query_latency_ms": 5, "status": "healthy"},
        ]
        anomalies = [
            {"id": "a1", "service_id": "order-service", "service_name": "Order Service", "metric_name": "CPU", "final_anomaly_score": 0.85, "detected_at": datetime.datetime.utcnow()}
        ]
        candidates = rca_engine.evaluate_candidates("test-inc", services, anomalies, [], datetime.datetime.utcnow())
        self.assertGreaterEqual(len(candidates), 1)
        self.assertEqual(candidates[0]["candidate_service_id"], "order-service")
        self.assertEqual(candidates[0]["rank"], 1)
    
    def test_rca_does_not_use_scenario_label(self):
        """Verify that the RCA engine's evaluate_candidates does NOT accept a scenario parameter (Rule 2)."""
        import inspect
        from backend.ml.rca_engine import DeterministicRcaEngine
        sig = inspect.signature(DeterministicRcaEngine.evaluate_candidates)
        param_names = list(sig.parameters.keys())
        self.assertNotIn("scenario", param_names, "RCA engine must NOT accept a 'scenario' parameter (Rule 2)")


class TestDatabaseModels(unittest.TestCase):
    """Tests for database models."""
    
    def test_models_importable(self):
        from backend.models import (
            TelemetryMetric, LogEntry, AnomalyEvent, Incident,
            RcaResult, RemediationAudit, ServiceModel, DependencyModel
        )
        self.assertEqual(ServiceModel.__tablename__, "services")
        self.assertEqual(DependencyModel.__tablename__, "dependencies")
    
    def test_init_db(self):
        from backend.database import init_db
        init_db()


class TestEvaluationHarness(unittest.TestCase):
    """Tests for the backend evaluation harness."""
    
    def test_evaluation_runs_scenario(self):
        from backend.services.synthetic_generator import SyntheticDataGenerator
        from backend.ml.anomaly_detector import anomaly_detector
        from backend.ml.rca_engine import rca_engine
        
        gen = SyntheticDataGenerator()
        gen.set_scenario("cpu_saturation_order")
        
        all_metrics = []
        anomalies = []
        for _ in range(4):
            tick = gen.generate_tick()
            for m in tick["metrics"]:
                all_metrics.append(m)
                result = anomaly_detector.evaluate_telemetry(m)
                if result.get("is_anomaly"):
                    anomalies.append({
                        "id": f"test-{m['service_id']}",
                        "service_id": m["service_id"],
                        "service_name": m["service_name"],
                        "metric_name": result.get("primary_metric", "CPU"),
                        "final_anomaly_score": result["final_anomaly_score"],
                        "detected_at": datetime.datetime.utcnow()
                    })
        
        services = {}
        for m in all_metrics:
            services[m["service_id"]] = m
            services[m["service_id"]]["id"] = m["service_id"]
            services[m["service_id"]]["name"] = m["service_name"]
            services[m["service_id"]]["status"] = "critical" if m["cpu_percent"] > 90 else "active"
        
        candidates = rca_engine.evaluate_candidates(
            "eval-test", list(services.values()), anomalies, [],
            datetime.datetime.utcnow()
        )
        
        self.assertGreater(len(candidates), 0)
        self.assertEqual(candidates[0]["candidate_service_id"], "order-service")


class TestNewScenarios(unittest.TestCase):
    """Specific tests for Scenario 5 (Service Crash) and Scenario 6 (Dependency Cascade)."""

    def test_scenario_5_service_crash_telemetry_and_rca(self):
        """Scenario 5: Selected service crashes, restart count increases, downstream caller shows 5xx, RCA isolates crashed service."""
        from backend.services.synthetic_generator import SyntheticDataGenerator
        from backend.ml.anomaly_detector import anomaly_detector
        from backend.ml.rca_engine import rca_engine
        
        gen = SyntheticDataGenerator()
        gen.set_scenario("service_crash")
        
        tick = gen.generate_tick()
        metrics = {m["service_id"]: m for m in tick["metrics"]}
        logs = tick["logs"]
        
        # 1. Target service is crashed with increased restart count
        payment_m = metrics["payment-service"]
        self.assertEqual(payment_m["status"], "crashed")
        self.assertGreaterEqual(payment_m["restart_count"], 1)
        self.assertEqual(payment_m["error_rate_percent"], 100.0)
        
        # 2. Downstream caller order-service experiences 5xx errors and latency
        order_m = metrics["order-service"]
        self.assertGreater(order_m["error_rate_percent"], 30.0)
        self.assertGreater(order_m["latency_p95_ms"], 700.0)
        
        # 3. Log evidence contains crash exception and caller 503 error
        fatal_logs = [l for l in logs if l["service_id"] == "payment-service" and l["level"] == "FATAL"]
        caller_errors = [l for l in logs if l["service_id"] == "order-service" and l["level"] in ["ERROR", "FATAL"]]
        self.assertGreaterEqual(len(fatal_logs), 1)
        self.assertGreaterEqual(len(caller_errors), 1)
        self.assertIn("503", caller_errors[0]["message"])
        
        # 4. Multi-tick anomaly detection & RCA
        all_metrics = []
        all_logs = []
        anomalies = []
        base_time = datetime.datetime.utcnow()
        
        for i in range(4):
            t_data = gen.generate_tick()
            t_time = base_time + datetime.timedelta(seconds=i * 2)
            for m in t_data["metrics"]:
                all_metrics.append(m)
                eval_res = anomaly_detector.evaluate_telemetry(m)
                if eval_res.get("is_anomaly"):
                    anomalies.append({
                        "id": f"ano-{i}-{m['service_id']}",
                        "service_id": m["service_id"],
                        "service_name": m["service_name"],
                        "metric_name": eval_res.get("primary_metric", "Process Liveness"),
                        "final_anomaly_score": eval_res["final_anomaly_score"],
                        "detected_at": t_time
                    })
            all_logs.extend(t_data["logs"])
        
        services = {}
        for m in all_metrics:
            is_crashed = m.get("restart_count", 0) > 0 or m.get("status") == "crashed"
            services[m["service_id"]] = {
                "id": m["service_id"],
                "name": m["service_name"],
                "cpu_percent": m["cpu_percent"],
                "memory_mb": m["memory_mb"],
                "latency_p95_ms": m["latency_p95_ms"],
                "error_rate_percent": m["error_rate_percent"],
                "db_connections": m["db_connections"],
                "db_query_latency_ms": m["db_query_latency_ms"],
                "restart_count": m.get("restart_count", 0),
                "status": "crashed" if is_crashed else "active"
            }
        
        # Execute RCA without scenario label
        candidates = rca_engine.evaluate_candidates(
            "inc-crash-test", list(services.values()), anomalies, all_logs, base_time
        )
        self.assertGreater(len(candidates), 0)
        self.assertEqual(candidates[0]["candidate_service_id"], "payment-service")
        self.assertEqual(candidates[0]["rank"], 1)
        self.assertIn("CRASH", candidates[0]["fault_signature_matched"].upper())

    def test_scenario_6_dependency_cascade_telemetry_and_rca(self):
        """Scenario 6: Origin fails first, downstream dependencies become anomalous (>=3 services anomalous), RCA identifies origin via temporal + topology."""
        from backend.services.synthetic_generator import SyntheticDataGenerator
        from backend.ml.anomaly_detector import anomaly_detector
        from backend.ml.rca_engine import rca_engine
        
        gen = SyntheticDataGenerator()
        gen.set_scenario("dependency_cascade")
        
        all_metrics = []
        all_logs = []
        anomalies = []
        base_time = datetime.datetime.utcnow()
        
        # Generate 4 sequential ticks letting the cascade propagate
        for tick_i in range(4):
            t_data = gen.generate_tick()
            t_time = base_time + datetime.timedelta(seconds=tick_i * 2)
            for m in t_data["metrics"]:
                all_metrics.append(m)
                eval_res = anomaly_detector.evaluate_telemetry(m)
                if eval_res.get("is_anomaly"):
                    anomalies.append({
                        "id": f"ano-casc-{tick_i}-{m['service_id']}",
                        "service_id": m["service_id"],
                        "service_name": m["service_name"],
                        "metric_name": eval_res.get("primary_metric", "Latency"),
                        "final_anomaly_score": eval_res["final_anomaly_score"],
                        "detected_at": t_time
                    })
            all_logs.extend(t_data["logs"])
            time.sleep(0.06)
        
        # At least 3 services must become anomalous
        anomalous_service_ids = set(a["service_id"] for a in anomalies)
        self.assertGreaterEqual(
            len(anomalous_service_ids), 3,
            f"Expected at least 3 anomalous services in cascade, got: {anomalous_service_ids}"
        )
        self.assertIn("order-service", anomalous_service_ids)
        
        # Origin order-service had the earliest anomaly timestamp
        order_anomalies = [a for a in anomalies if a["service_id"] == "order-service"]
        earliest_cluster_time = min(a["detected_at"] for a in anomalies)
        earliest_order_time = min(a["detected_at"] for a in order_anomalies)
        self.assertEqual(earliest_order_time, earliest_cluster_time)
        
        # Build service state
        services = {}
        for m in all_metrics:
            services[m["service_id"]] = {
                "id": m["service_id"],
                "name": m["service_name"],
                "cpu_percent": m["cpu_percent"],
                "memory_mb": m["memory_mb"],
                "latency_p95_ms": m["latency_p95_ms"],
                "error_rate_percent": m["error_rate_percent"],
                "db_connections": m["db_connections"],
                "db_query_latency_ms": m["db_query_latency_ms"],
                "queue_backlog": m.get("queue_backlog", 0),
                "restart_count": m.get("restart_count", 0),
                "status": "critical" if m["error_rate_percent"] > 20 else "active"
            }
            
        # Execute RCA without scenario label or ground truth
        candidates = rca_engine.evaluate_candidates(
            "inc-cascade-test", list(services.values()), anomalies, all_logs, base_time
        )
        self.assertGreater(len(candidates), 0)
        # Order Service must be ranked #1 as causal origin
        self.assertEqual(candidates[0]["candidate_service_id"], "order-service")
        self.assertEqual(candidates[0]["rank"], 1)
        self.assertGreaterEqual(candidates[0]["score_breakdown"]["temporalPrecedence"], 90.0)


if __name__ == "__main__":
    unittest.main()
