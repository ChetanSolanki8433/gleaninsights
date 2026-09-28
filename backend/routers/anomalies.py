from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.database import get_db
from backend.models import AnomalyEvent
from backend.schemas import AnomalyEventResponse, AnomalyThresholdUpdate
from backend.ml.anomaly_detector import anomaly_detector

router = APIRouter(prefix="/api/v1/anomalies", tags=["ML Anomalies"])

@router.get("/feed", response_model=List[AnomalyEventResponse])
def get_anomaly_feed(
    limit: int = Query(50, ge=1, le=500),
    service_id: Optional[str] = None,
    min_score: float = Query(0.0, ge=0.0, le=1.0),
    db: Session = Depends(get_db)
):
    """Returns streaming real-time ML anomaly event feed filtered by service or threshold."""
    query = db.query(AnomalyEvent)
    if service_id:
        query = query.filter(AnomalyEvent.service_id == service_id)
    if min_score > 0.0:
        query = query.filter(AnomalyEvent.final_anomaly_score >= min_score)

    return query.order_by(desc(AnomalyEvent.detected_at)).limit(limit).all()

@router.post("/thresholds")
def update_anomaly_thresholds(payload: AnomalyThresholdUpdate):
    """Dynamically updates the Isolation Forest, Autoencoder, and Context weights/threshold."""
    anomaly_detector.threshold = payload.threshold
    anomaly_detector.weights["if"] = payload.if_weight
    anomaly_detector.weights["ae"] = payload.ae_weight
    anomaly_detector.weights["context"] = payload.context_weight

    return {
        "status": "updated",
        "threshold": anomaly_detector.threshold,
        "weights": anomaly_detector.weights
    }
