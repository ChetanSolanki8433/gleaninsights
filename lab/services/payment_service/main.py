"""
Payment Service (Lab Microservice)
Port: 8003
Dependencies: notification-service (8005)
"""
import os
import time
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from lab.common.telemetry import LabTelemetry, setup_lab_service

SERVICE_ID = "payment-service"
SERVICE_NAME = "Payment Service"
PORT = int(os.getenv("PORT", 8003))

app = FastAPI(title=SERVICE_NAME, version="2.5.3")
telemetry = LabTelemetry(service_id=SERVICE_ID, service_name=SERVICE_NAME, port=PORT)
setup_lab_service(app, telemetry)

NOTIFICATION_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://localhost:8005")

class ChargeRequest(BaseModel):
    order_id: str
    amount: float = 99.0
    user_id: str = "usr_101"

@app.get("/api/v1/payments/{payment_id}")
def get_payment(payment_id: str):
    """Retrieves transaction confirmation."""
    return {
        "payment_id": payment_id,
        "status": "settled",
        "amount": 99.0,
        "gateway": "stripe"
    }

@app.post("/api/v1/payments/charge")
def charge_payment(req: ChargeRequest):
    """Processes payment authorization with external banking gateway."""
    # Check if payment gateway fault is active
    if telemetry.active_fault:
        f_type = telemetry.active_fault.get("fault_type")
        if f_type in ["slow_payment_gateway", "gateway_timeout"]:
            telemetry.emit_log(
                level="ERROR",
                message=f"Gateway timeout: External Visa/Stripe Clearing Gateway exceeded 2500ms for {req.order_id}",
                endpoint="/api/v1/payments/charge",
                status_code=504,
                exception_type="GatewayTimeoutException"
            )
            raise HTTPException(status_code=504, detail="Upstream banking gateway timeout")
            
        if f_type in ["connection_exhaustion", "db_pool_leak"]:
            telemetry.emit_log(
                level="FATAL",
                message="HikariPool-1 - Connection is not available, request timed out (pool exhausted: 80/80)",
                endpoint="/api/v1/payments/charge",
                status_code=503,
                exception_type="PoolExhaustedException"
            )
            raise HTTPException(status_code=503, detail="Database connection pool exhausted")

    payment_id = f"pay-{int(time.time() * 1000)}"

    # Notify notification-service
    try:
        requests.post(
            f"{NOTIFICATION_URL}/api/v1/notifications/send",
            json={"recipient": f"{req.user_id}@example.com", "channel": "sms", "message": f"Payment {payment_id} approved for ${req.amount}"},
            timeout=1.0
        )
    except Exception:
        pass

    return {
        "payment_id": payment_id,
        "order_id": req.order_id,
        "status": "approved",
        "amount": req.amount,
        "currency": "USD"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=False)
