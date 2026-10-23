"""
Notification Service (Lab Microservice)
Port: 8005
Dependencies: None (leaf service)
"""
import os
import time
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
from lab.common.telemetry import LabTelemetry, setup_lab_service

SERVICE_ID = "notification-service"
SERVICE_NAME = "Notification Service"
PORT = int(os.getenv("PORT", 8005))

app = FastAPI(title=SERVICE_NAME, version="1.9.2")
telemetry = LabTelemetry(service_id=SERVICE_ID, service_name=SERVICE_NAME, port=PORT)
setup_lab_service(app, telemetry)

class NotificationRequest(BaseModel):
    recipient: str = "customer@example.com"
    channel: str = "email"
    message: str = "Order confirmed"

@app.get("/api/v1/notifications/{notif_id}")
def get_notification(notif_id: str):
    """Retrieves delivery status of a dispatch request."""
    return {
        "notification_id": notif_id,
        "status": "delivered",
        "delivered_at": time.time()
    }

@app.post("/api/v1/notifications/send")
def send_notification(req: NotificationRequest):
    """Dispatches multi-channel notification."""
    notif_id = f"notif-{int(time.time() * 1000)}"
    return {
        "notification_id": notif_id,
        "recipient": req.recipient,
        "channel": req.channel,
        "status": "queued",
        "timestamp": time.time()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=False)
