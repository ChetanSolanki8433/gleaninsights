import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional
from pydantic import BaseModel

from backend.database import get_db
from backend.models import Incident, AnomalyEvent, RcaResult

router = APIRouter(prefix="/api/v1/incidents", tags=["incidents"])

class CommentRequest(BaseModel):
    comment: str
    operator: str = "System Operator"

@router.get("")
def get_incidents(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Incident)
    if status:
        query = query.filter(Incident.status == status)
    
    # Active first, then by start time descending
    incidents = query.order_by(
        desc(Incident.status == "active"),
        desc(Incident.start_time)
    ).all()
    
    return incidents

@router.get("/active")
def get_active_incident(db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.status == "active").order_by(desc(Incident.start_time)).first()
    return incident

@router.get("/{incident_id}")
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    anomalies = db.query(AnomalyEvent).filter(AnomalyEvent.incident_id == incident_id).all()
    rca_results = db.query(RcaResult).filter(RcaResult.incident_id == incident_id).order_by(RcaResult.rank).all()
    
    response = incident.__dict__.copy()
    response.pop("_sa_instance_state", None)
    response["anomalies"] = anomalies
    response["rca_results"] = rca_results
    return response

@router.post("/{incident_id}/resolve")
def resolve_incident(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    if incident.status != "resolved":
        incident.status = "resolved"
        incident.end_time = datetime.datetime.utcnow()
        if incident.start_time:
            incident.mttr_seconds = (incident.end_time - incident.start_time).total_seconds()
        db.commit()
    return {"status": "resolved"}

@router.post("/{incident_id}/comments")
def add_comment(incident_id: str, req: CommentRequest, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    comments = incident.operator_comments or []
    comments.append({
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "operator": req.operator,
        "text": req.comment
    })
    
    incident.operator_comments = list(comments)
    db.commit()
    
    return {"status": "comment_added"}
