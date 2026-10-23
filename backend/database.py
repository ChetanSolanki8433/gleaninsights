import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Default to local zero-config SQLite database if DATABASE_URL is not set
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./aiops.db")

# SQLite requires check_same_thread=False for multithreading in FastAPI
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """FastAPI Dependency for database session lifecycle."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initializes all database tables registered in SQLAlchemy models."""
    from backend import models
    from sqlalchemy import inspect, text
    Base.metadata.create_all(bind=engine)

    # Lightweight SQLite column migration for existing databases
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        with engine.connect() as conn:
            for model in [
                models.TelemetryMetric,
                models.LogEntry,
                models.AnomalyEvent,
                models.Incident,
                models.RcaResult,
                models.RemediationAudit,
                models.ServiceModel,
                models.DependencyModel,
            ]:
                tname = model.__tablename__
                if tname in tables:
                    db_cols = {col["name"] for col in inspector.get_columns(tname)}
                    for col in model.__table__.columns:
                        if col.name not in db_cols:
                            col_type = col.type.compile(engine.dialect)
                            default_val = "0" if "INT" in str(col_type).upper() else "NULL"
                            alter_stmt = f"ALTER TABLE {tname} ADD COLUMN {col.name} {col_type} DEFAULT {default_val}"
                            conn.execute(text(alter_stmt))
                            conn.commit()
    except Exception as e:
        pass
