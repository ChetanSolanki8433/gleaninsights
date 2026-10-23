import time
import random
import uuid
import datetime
from typing import Dict, Any, List

import numpy as np

SERVICES = [
    {"id": "user-service", "name": "User Service"},
    {"id": "order-service", "name": "Order Service"},
    {"id": "payment-service", "name": "Payment Service"},
    {"id": "inventory-service", "name": "Inventory Service"},
    {"id": "notification-service", "name": "Notification Service"},
]

class SyntheticDataGenerator:
    """
    Generates realistic synthetic microservice telemetry data and feeds it through the backend's ingestion pipeline.
    """
    def __init__(self):
        self.current_scenario = "nominal"
        self.scenario_start_time = time.time()
        
    def set_scenario(self, scenario_name: str):
        """Sets the current fault scenario or returns to nominal."""
        self.current_scenario = scenario_name
        self.scenario_start_time = time.time()
        
    def reset(self):
        """Resets the generator to the nominal baseline state."""
        self.current_scenario = "nominal"
        self.scenario_start_time = time.time()
        
    def get_state(self) -> Dict[str, Any]:
        """Returns the current scenario state."""
        return {
            "scenario": self.current_scenario,
            "active_since": self.scenario_start_time,
            "duration_seconds": time.time() - self.scenario_start_time
        }
        
    def _generate_metric(self, service: Dict[str, str], scenario: str, duration: float) -> Dict[str, Any]:
        """Generates telemetry metrics for a given service and scenario."""
        s_name = service["name"]
        s_id = service["id"]
        
        # Nominal baselines
        cpu = np.clip(np.random.normal(30, 5), 0, 100)
        memory = np.clip(np.random.normal(512, 50), 0, 4096)
        latency = np.clip(np.random.lognormal(mean=np.log(50), sigma=0.5), 10, 5000)
        error_rate = np.clip(np.random.exponential(0.1), 0, 100)
        request_rate = np.clip(np.random.normal(100, 20), 0, 1000)
        db_latency = np.clip(np.random.normal(10, 2), 1, 1000)
        db_connections = int(np.clip(np.random.normal(20, 5), 0, 500))
        queue_backlog = int(np.clip(np.random.exponential(1), 0, 10000))
        
        # Defaults
        restart_count = 0
        service_status = "healthy"
        
        # Apply scenario logic
        if scenario == "cpu_saturation_order" and s_id == "order-service":
            cpu = np.clip(np.random.normal(95, 3), 90, 100)
            latency = latency * 3
            service_status = "critical"
            
        elif scenario == "memory_leak_user" and s_id == "user-service":
            leak_amount = min(420 + duration * 20, 2048) # Starts at >930MB and grows
            memory = np.clip(np.random.normal(512 + leak_amount, 30), 0, 4096)
            latency = np.clip(np.random.normal(350, 50), 200, 1000)
            service_status = "critical"
            
        elif scenario == "database_latency_order" and s_id == "order-service":
            db_latency = np.clip(np.random.normal(800, 100), 500, 2000)
            latency = latency + db_latency
            db_connections = int(np.clip(np.random.normal(90, 10), 50, 200))
            service_status = "critical"
            
        elif scenario == "db_connection_exhaustion" and s_id == "payment-service":
            db_connections = int(np.clip(np.random.normal(490, 10), 450, 500))
            db_latency = db_latency * 10
            error_rate = np.clip(np.random.normal(15, 5), 0, 100)
            service_status = "critical"
            
        elif scenario in ["service_crash", "service_crash_payment"]:
            if s_id == "payment-service":
                cpu = 0.0
                memory = 0.0
                request_rate = 0.0
                error_rate = 100.0
                latency = 0.0
                restart_count = min(5, max(1, int(1 + duration // 6)))
                service_status = "crashed"
            elif s_id == "order-service":
                error_rate = np.clip(np.random.normal(48, 4), 35, 75)
                latency = np.clip(np.random.normal(1250, 100), 800, 2500)
                service_status = "critical"
            
        elif scenario == "network_latency_inventory" and s_id == "inventory-service":
            latency = np.clip(np.random.normal(2000, 500), 1000, 5000)
            service_status = "degraded"
            
        elif scenario == "slow_payment_gateway" and s_id == "payment-service":
            latency = np.clip(np.random.normal(3000, 500), 2000, 10000)
            queue_backlog = int(np.clip(np.random.normal(1000, 200), 0, 5000))
            service_status = "critical"
            
        elif scenario in ["dependency_cascade", "cascading_failure_chain"]:
            # Origin service: order-service fails first at T+0s
            if s_id == "order-service":
                cpu = np.clip(np.random.normal(86, 4), 78, 96)
                latency = np.clip(np.random.normal(2100, 150), 1800, 3500)
                error_rate = np.clip(np.random.normal(26, 3), 18, 40)
                queue_backlog = int(np.clip(np.random.normal(520, 25), 450, 700))
                service_status = "critical"
            # Downstream dependency 1: payment-service becomes anomalous through retry storm
            elif s_id == "payment-service" and duration >= 0.05:
                latency = np.clip(np.random.normal(1600, 120), 1200, 2500)
                error_rate = np.clip(np.random.normal(22, 2.5), 14, 35)
                queue_backlog = int(np.clip(np.random.normal(260, 20), 200, 400))
                service_status = "critical"
            # Downstream dependency 2: inventory-service becomes anomalous through lock timeouts
            elif s_id == "inventory-service" and duration >= 0.10:
                latency = np.clip(np.random.normal(1450, 120), 1000, 2200)
                error_rate = np.clip(np.random.normal(18, 2), 12, 28)
                queue_backlog = int(np.clip(np.random.normal(190, 20), 120, 300))
                service_status = "critical"
            # Downstream dependency 3: notification-service buffer overflows
            elif s_id == "notification-service" and duration >= 0.15:
                latency = np.clip(np.random.normal(680, 60), 450, 1200)
                error_rate = np.clip(np.random.normal(14, 2), 8, 22)
                queue_backlog = int(np.clip(np.random.normal(340, 25), 250, 500))
                service_status = "degraded"
        
        return {
            "service_id": s_id,
            "service_name": s_name,
            "cpu_percent": float(cpu),
            "memory_mb": float(memory),
            "request_rate": float(request_rate),
            "latency_p95_ms": float(latency),
            "error_rate_percent": float(error_rate),
            "db_query_latency_ms": float(db_latency),
            "db_connections": int(db_connections),
            "queue_backlog": int(queue_backlog),
            "restart_count": int(restart_count),
            "status": service_status,
            "service_status": service_status,
            "source": "synthetic"
        }
        
    def _generate_log(self, service: Dict[str, str], scenario: str, duration: float) -> List[Dict[str, Any]]:
        """Generates structured log entries appropriate to the scenario."""
        s_name = service["name"]
        s_id = service["id"]
        
        logs = []
        num_logs = random.randint(1, 3)
        
        # Determine if we should generate error logs based on scenario
        is_error = False
        error_msg = ""
        level = "INFO"
        
        if scenario == "cpu_saturation_order" and s_id == "order-service":
            if random.random() < 0.3:
                is_error = True
                level = "WARN"
                error_msg = "Thread pool exhaustion warning"
        elif scenario == "memory_leak_user" and s_id == "user-service":
            if duration > 30 and random.random() < 0.2:
                is_error = True
                level = "ERROR"
                error_msg = "OutOfMemoryError: Java heap space"
        elif scenario == "database_latency_order" and s_id == "order-service":
            if random.random() < 0.4:
                is_error = True
                level = "WARN"
                error_msg = "Slow query detected on orders table"
        elif scenario == "db_connection_exhaustion" and s_id == "payment-service":
            if random.random() < 0.6:
                is_error = True
                level = "ERROR"
                error_msg = "ConnectionPoolTimeoutException: Could not get a resource from the pool"
        elif scenario in ["service_crash", "service_crash_payment"]:
            if s_id == "payment-service":
                is_error = True
                level = "FATAL"
                error_msg = f"Process terminated unexpectedly: Uncaught NullPointerException in PaymentSettlementWorker. Container exited with code 137. Restart count: {min(5, max(1, int(1 + duration // 6)))}."
            elif s_id == "order-service":
                is_error = True
                level = "ERROR"
                error_msg = "HTTP 503 Service Unavailable: Downstream payment-service unreachable at http://payment-service:8080/api/v1/payments"
        elif scenario == "network_latency_inventory" and s_id == "inventory-service":
            if random.random() < 0.3:
                is_error = True
                level = "ERROR"
                error_msg = "ReadTimeoutException executing GET /api/v1/stock"
        elif scenario == "slow_payment_gateway" and s_id == "payment-service":
            if random.random() < 0.5:
                is_error = True
                level = "WARN"
                error_msg = "Gateway timeout, retrying payment processing"
        elif scenario in ["dependency_cascade", "cascading_failure_chain"]:
            if s_id == "order-service":
                is_error = True
                level = "FATAL"
                error_msg = "Upstream thread pool queue overflow (backlog: 520). Initiating aggressive unthrottled retries to downstream dependencies."
            elif s_id == "payment-service" and duration >= 0.05:
                is_error = True
                level = "ERROR"
                error_msg = "Cascading payment worker starvation: Unthrottled retry burst from order-service exceeded thread pool limit."
            elif s_id == "inventory-service" and duration >= 0.10:
                is_error = True
                level = "ERROR"
                error_msg = "Cascading lock timeout: High concurrency stock check retries from order-service timed out after 3000ms."
            elif s_id == "notification-service" and duration >= 0.15:
                is_error = True
                level = "WARN"
                error_msg = "Cascading notification queue saturation: Backlog exceeded 300 items due to checkout failure event storm."
                
        for _ in range(num_logs):
            msg = error_msg if is_error else f"Processed request successfully for {s_name}"
            lvl = level if is_error else "INFO"
            
            logs.append({
                "id": str(uuid.uuid4()),
                "service_id": s_id,
                "service_name": s_name,
                "level": lvl,
                "message": msg,
                "request_id": str(uuid.uuid4()),
                "trace_id": str(uuid.uuid4()),
                "endpoint": f"/api/v1/{s_name.split('-')[0]}s",
                "status_code": 500 if lvl in ["ERROR", "FATAL"] else 200,
                "duration_ms": random.uniform(10, 500),
            })
            
        return logs

    def generate_tick(self) -> Dict[str, Any]:
        """Generates telemetry data for a single point in time across all services."""
        metrics = []
        logs = []
        duration = time.time() - self.scenario_start_time
        
        for svc in SERVICES:
            metrics.append(self._generate_metric(svc, self.current_scenario, duration))
            logs.extend(self._generate_log(svc, self.current_scenario, duration))
            
        return {
            "metrics": metrics,
            "logs": logs
        }

# Module-level singleton
synthetic_generator = SyntheticDataGenerator()
