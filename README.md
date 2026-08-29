# AIOps Microservice Observability & Deterministic RCA Platform

An enterprise-grade, **100% offline, native full-stack** AIOps observability platform featuring:
- **Dual-Engine ML Anomaly Detection**: Scikit-Learn Isolation Forest ($S_{\text{IF}}$) + PyTorch Autoencoder reconstruction loss ($S_{\text{AE}}$) + operational context weighting ($S_{\text{context}}$).
- **Academic 5-Factor RCA Mathematical Engine**: Deterministic directional ranking ($R$) across microservice dependency call graphs without hallucination risk.
- **Local Evidence-Grounded AI Explanations**: Native deterministic template synthesizer strictly anchored to ingested database facts (zero cloud API dependencies or external tokens).
- **FastAPI + SQLAlchemy Architecture**: SQLite (zero-config local) & PostgreSQL enterprise persistence with Pydantic v2 validation.
- **psutil & Prometheus Collector**: Real-time host hardware instrumentation and synthetic fault injection sandbox.

---

## 📐 Mathematical Formulation

### 1. Multivariate ML Anomaly Scoring ($S_{\text{final}}$)
$$S_{\text{final}} = 0.45 \cdot S_{\text{IF}} + 0.35 \cdot S_{\text{AE}} + 0.20 \cdot S_{\text{context}}$$
Where:
- $S_{\text{IF}} \in [0, 1]$: Isolation Forest tree isolation depth across 6 telemetry dimensions ($CPU$, $Memory$, $Latency_{p95}$, $ErrorRate\%$, $DB_{lat}$, $DB_{conn}$).
- $S_{\text{AE}} \in [0, 1]$: Mean Squared Error (MSE) reconstruction loss from a 6-layer PyTorch MLP Autoencoder.
- $S_{\text{context}} \in [0, 1]$: Operational state degradation & restart count penalty.
- Anomalies trigger when $S_{\text{final}} \ge 0.60$.

### 2. Deterministic Root Cause Analysis (RCA) $R$-Score
$$R = 0.30 \cdot M_{\text{evidence}} + 0.20 \cdot D_{\text{impact}} + 0.20 \cdot T_{\text{temporal}} + 0.15 \cdot L_{\text{log}} + 0.15 \cdot S_{\text{signature}}$$
- $M_{\text{evidence}}$: Magnitude of metric deviation and 3-sigma z-score.
- $D_{\text{impact}}$: Microservice call graph downstream fan-out count.
- $T_{\text{temporal}}$: Causal precedence (earliest anomaly onset).
- $L_{\text{log}}$: Frequency of `ERROR`/`FATAL` structured log entries.
- $S_{\text{signature}}$: Pattern match against known operational failure templates.

---

## 🚀 Quickstart & Architecture

### Backend (Python FastAPI)
```bash
# 1. Install dependencies
pip install -r backend/requirements.txt

# 2. Start FastAPI ML & Telemetry Server
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### Frontend (React + Vite)
```bash
# 1. Install Node packages
npm install

# 2. Run dev server on port 3000
npm run dev
```

### Docker Compose
```bash
docker-compose up -d --build
```

---

## 📡 API Specification Summary

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | `GET` | Health status and ML engine registration |
| `/api/v1/metrics/ingest` | `POST` | Ingests batch telemetry, evaluates ML anomalies, saves to DB |
| `/api/v1/metrics/latest` | `GET` | Queries latest metric data points |
| `/api/v1/metrics/host` | `GET` | Real-time host hardware metrics via `psutil` |
| `/api/v1/logs/ingest` | `POST` | Ingests structured JSON logs |
| `/api/v1/logs/query` | `GET` | Filters logs by service, level, and keyword |
| `/api/v1/anomalies/feed` | `GET` | Streaming feed of ML anomaly records |
| `/api/v1/rca/diagnose` | `POST` | Executes 5-factor mathematical RCA engine |
| `/api/v1/ai/explain-incident` | `POST` | Offline evidence-grounded AI narrative report |
| `/api/v1/remediation/playbooks`| `GET` | Catalog of automated & operator recovery playbooks |
| `/api/v1/remediation/approve` | `POST` | Human-in-the-loop audit recording & recovery execution |
| `/metrics` | `GET` | Prometheus telemetry scrape endpoint |
