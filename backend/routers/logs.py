import datetime
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.database import get_db
from backend.models import LogEntry
from backend.schemas import LogEntryCreate, LogEntryResponse, IngestLogsBatchRequest

router = APIRouter(prefix="/api/v1/logs", tags=["Structured Logs"])

@router.post("/ingest", response_model=List[LogEntryResponse])
def ingest_logs(
    payload: IngestLogsBatchRequest,
    db: Session = Depends(get_db)
):
    """Ingests a batch of structured JSON logs into the observability database."""
    saved_logs = []
    now = datetime.datetime.utcnow()

    for item in payload.logs:
        log_id = item.id or f"log-{uuid.uuid4().hex[:12]}"
        ts = item.timestamp or now
        record = LogEntry(
            id=log_id,
            timestamp=ts,
            service_id=item.service_id,
            service_name=item.service_name,
            level=item.level,
            message=item.message,
            request_id=item.request_id,
            trace_id=item.trace_id,
            endpoint=item.endpoint,
            exception_type=item.exception_type,
            duration_ms=item.duration_ms,
            status_code=item.status_code,
            extra_metadata=item.extra_metadata or {}
        )
        db.add(record)
        saved_logs.append(record)

    db.commit()
    for r in saved_logs:
        db.refresh(r)

    return saved_logs

@router.get("/query", response_model=List[LogEntryResponse])
def query_logs(
    service_id: Optional[str] = None,
    level: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Queries structured logs with full-text keyword matching and level filters."""
    query = db.query(LogEntry)
    if service_id:
        query = query.filter(LogEntry.service_id == service_id)
    if level and level != "ALL":
        query = query.filter(LogEntry.level == level)
    if search:
        query = query.filter(LogEntry.message.ilike(f"%{search}%"))

    return query.order_by(desc(LogEntry.timestamp)).limit(limit).all()
