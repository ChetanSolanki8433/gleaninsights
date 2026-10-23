"""
User Service (Lab Microservice)
Port: 8001
Dependencies: order-service (8002), payment-service (8003), notification-service (8005)
"""
import os
import time
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from lab.common.telemetry import LabTelemetry, setup_lab_service

SERVICE_ID = "user-service"
SERVICE_NAME = "User Service"
PORT = int(os.getenv("PORT", 8001))

app = FastAPI(title=SERVICE_NAME, version="4.2.1")
telemetry = LabTelemetry(service_id=SERVICE_ID, service_name=SERVICE_NAME, port=PORT)
setup_lab_service(app, telemetry)

NOTIFICATION_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://localhost:8005")

class LoginRequest(BaseModel):
    username: str
    password: Optional[str] = "secret"

@app.get("/api/v1/users/{user_id}")
def get_user(user_id: str):
    """Retrieves user profile and account status."""
    return {
        "user_id": user_id,
        "username": f"user_{user_id}",
        "email": f"user_{user_id}@example.com",
        "tier": "enterprise",
        "status": "active"
    }

@app.post("/api/v1/auth/login")
def login(req: LoginRequest):
    """Authenticates credentials and dispatches notification."""
    # Notify notification-service of login
    try:
        requests.post(
            f"{NOTIFICATION_URL}/api/v1/notifications/send",
            json={
                "recipient": f"{req.username}@example.com",
                "channel": "email",
                "message": f"Login event detected for {req.username}"
            },
            timeout=1.0
        )
    except Exception:
        pass # Non-blocking fallback
        
    return {
        "status": "authenticated",
        "token": f"jwt-token-{int(time.time())}",
        "user": req.username,
        "expires_in": 3600
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=False)
