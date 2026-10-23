"""
Inventory Service (Lab Microservice)
Port: 8004
Dependencies: notification-service (8005)
"""
import os
import time
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from lab.common.telemetry import LabTelemetry, setup_lab_service

SERVICE_ID = "inventory-service"
SERVICE_NAME = "Inventory Service"
PORT = int(os.getenv("PORT", 8004))

app = FastAPI(title=SERVICE_NAME, version="3.1.0")
telemetry = LabTelemetry(service_id=SERVICE_ID, service_name=SERVICE_NAME, port=PORT)
setup_lab_service(app, telemetry)

NOTIFICATION_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://localhost:8005")

class ReserveRequest(BaseModel):
    sku: str = "SKU-4912"
    quantity: int = 1

@app.get("/api/v1/inventory/stock/{sku}")
def get_stock(sku: str):
    """Queries warehouse SKU inventory balance."""
    return {
        "sku": sku,
        "available_quantity": 450,
        "warehouse": "warehouse-01",
        "reserved": 12
    }

@app.post("/api/v1/inventory/reserve")
def reserve_stock(req: ReserveRequest):
    """Allocates stock items for an order."""
    if telemetry.active_fault:
        f_type = telemetry.active_fault.get("fault_type")
        if f_type in ["network_delay", "network_latency"]:
            telemetry.emit_log(
                level="WARN",
                message=f"TCP Retransmit spike on inventory socket interface; latency elevated for {req.sku}",
                endpoint="/api/v1/inventory/reserve",
                status_code=200,
                exception_type="NetworkJitterException"
            )
            time.sleep(0.1)

    reservation_id = f"resv-{int(time.time() * 1000)}"
    return {
        "reservation_id": reservation_id,
        "sku": req.sku,
        "quantity": req.quantity,
        "status": "reserved",
        "warehouse": "warehouse-01"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=False)
