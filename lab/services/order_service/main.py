"""
Order Service (Lab Microservice)
Port: 8002
Dependencies: payment-service (8003), inventory-service (8004), notification-service (8005)
"""
import os
import time
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from lab.common.telemetry import LabTelemetry, setup_lab_service

SERVICE_ID = "order-service"
SERVICE_NAME = "Order Service"
PORT = int(os.getenv("PORT", 8002))

app = FastAPI(title=SERVICE_NAME, version="3.8.5")
telemetry = LabTelemetry(service_id=SERVICE_ID, service_name=SERVICE_NAME, port=PORT)
setup_lab_service(app, telemetry)

PAYMENT_URL = os.getenv("PAYMENT_SERVICE_URL", "http://localhost:8003")
INVENTORY_URL = os.getenv("INVENTORY_SERVICE_URL", "http://localhost:8004")
NOTIFICATION_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://localhost:8005")

class OrderCreateRequest(BaseModel):
    user_id: str = "usr_101"
    sku: str = "SKU-4912"
    quantity: int = 1
    amount: float = 99.0

@app.get("/api/v1/orders/{order_id}")
def get_order(order_id: str):
    """Retrieves order details."""
    return {
        "order_id": order_id,
        "status": "completed",
        "items": [{"sku": "SKU-4912", "quantity": 1}],
        "total": 99.0
    }

@app.post("/api/v1/orders")
def create_order(order: OrderCreateRequest):
    """
    Core orchestrator:
    1. Reserves stock with inventory-service
    2. Processes transaction with payment-service
    3. Triggers confirmation with notification-service
    """
    order_id = f"ord-{int(time.time() * 1000)}"
    
    # 1. Call inventory-service
    inv_res = None
    try:
        r = requests.post(
            f"{INVENTORY_URL}/api/v1/inventory/reserve",
            json={"sku": order.sku, "quantity": order.quantity},
            timeout=2.0
        )
        if r.status_code == 200:
            inv_res = r.json()
    except Exception as e:
        telemetry.emit_log("WARN", f"Inventory reservation timeout for {order.sku}: {e}", endpoint="/api/v1/orders")

    # 2. Call payment-service
    pay_res = None
    try:
        r = requests.post(
            f"{PAYMENT_URL}/api/v1/payments/charge",
            json={"order_id": order_id, "amount": order.amount, "user_id": order.user_id},
            timeout=3.0
        )
        if r.status_code == 200:
            pay_res = r.json()
        elif r.status_code >= 500:
            telemetry.emit_log("ERROR", f"Payment failure response ({r.status_code}) for order {order_id}", endpoint="/api/v1/orders")
    except Exception as e:
        telemetry.emit_log("ERROR", f"Payment service call failed: {e}", endpoint="/api/v1/orders")

    # 3. Call notification-service
    try:
        requests.post(
            f"{NOTIFICATION_URL}/api/v1/notifications/send",
            json={"recipient": f"{order.user_id}@example.com", "channel": "email", "message": f"Order {order_id} created"},
            timeout=1.0
        )
    except Exception:
        pass

    return {
        "order_id": order_id,
        "status": "created",
        "inventory": inv_res or {"reserved": False},
        "payment": pay_res or {"charged": False}
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=False)
