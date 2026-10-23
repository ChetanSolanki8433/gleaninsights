"""Seeds initial service definitions and dependency graph into the database."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import SessionLocal, init_db
from backend.models import ServiceModel, DependencyModel

def seed():
    init_db()
    db = SessionLocal()
    try:
        services = [
            ServiceModel(id="user-service", name="User Service", version="4.2.1", language="Java 17", framework="Spring Boot 3.2", database="PostgreSQL 15", description="Handles user authentication, session management, and profile CRUD operations."),
            ServiceModel(id="order-service", name="Order Service", version="3.8.5", language="Java 17", framework="Spring Boot 3.2", database="PostgreSQL 15", description="Core orchestrator for order lifecycle, inventory reservation, and payment coordination."),
            ServiceModel(id="payment-service", name="Payment Service", version="2.5.3", language="Node.js 20", framework="Express 4.18", database="PostgreSQL 15", description="Processes payment transactions via Stripe/Visa gateway and manages refund workflows."),
            ServiceModel(id="inventory-service", name="Inventory Service", version="3.1.0", language="Go 1.21", framework="Gin", database="PostgreSQL 15", description="Real-time stock level management, warehouse allocation, and reorder triggers."),
            ServiceModel(id="notification-service", name="Notification Service", version="1.9.2", language="Python 3.11", framework="FastAPI", database="Redis (cache)", description="Multi-channel delivery engine for email, SMS, push, and webhook notifications."),
        ]
        for s in services:
            db.merge(s)

        deps = [
            DependencyModel(id="dep-1", source_service_id="user-service", source_name="User Service", target_service_id="order-service", target_name="Order Service", protocol="HTTP/gRPC", avg_latency_ms=12, call_rate_per_min=340),
            DependencyModel(id="dep-2", source_service_id="order-service", source_name="Order Service", target_service_id="payment-service", target_name="Payment Service", protocol="HTTP", avg_latency_ms=28, call_rate_per_min=220),
            DependencyModel(id="dep-3", source_service_id="order-service", source_name="Order Service", target_service_id="inventory-service", target_name="Inventory Service", protocol="HTTP/gRPC", avg_latency_ms=18, call_rate_per_min=280),
            DependencyModel(id="dep-4", source_service_id="payment-service", source_name="Payment Service", target_service_id="notification-service", target_name="Notification Service", protocol="HTTP", avg_latency_ms=8, call_rate_per_min=150),
            DependencyModel(id="dep-5", source_service_id="order-service", source_name="Order Service", target_service_id="notification-service", target_name="Notification Service", protocol="HTTP", avg_latency_ms=10, call_rate_per_min=200),
            DependencyModel(id="dep-6", source_service_id="user-service", source_name="User Service", target_service_id="notification-service", target_name="Notification Service", protocol="HTTP", avg_latency_ms=6, call_rate_per_min=120),
            DependencyModel(id="dep-7", source_service_id="inventory-service", source_name="Inventory Service", target_service_id="notification-service", target_name="Notification Service", protocol="HTTP", avg_latency_ms=9, call_rate_per_min=80),
            DependencyModel(id="dep-8", source_service_id="payment-service", source_name="Payment Service", target_service_id="order-service", target_name="Order Service", protocol="HTTP (callback)", avg_latency_ms=15, call_rate_per_min=180),
            DependencyModel(id="dep-9", source_service_id="user-service", source_name="User Service", target_service_id="payment-service", target_name="Payment Service", protocol="HTTP", avg_latency_ms=22, call_rate_per_min=160),
        ]
        for d in deps:
            db.merge(d)

        db.commit()
        print(f"Seeded {len(services)} services and {len(deps)} dependencies.")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
