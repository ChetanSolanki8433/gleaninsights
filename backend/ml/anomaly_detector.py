import numpy as np
import torch
import torch.nn as nn
from sklearn.ensemble import IsolationForest
from typing import Dict, Any, Tuple, Optional

# --- PyTorch Telemetry Autoencoder ---
class TelemetryAutoencoder(nn.Module):
    """
    Lightweight PyTorch Multi-Layer Perceptron Autoencoder for multivariate
    microservice telemetry reconstruction and outlier anomaly detection.
    Features: [CPU%, Memory%, Latency_p95, ErrorRate%, DBQueryLat, DBConns]
    """
    def __init__(self, input_dim: int = 6, latent_dim: int = 3):
        super(TelemetryAutoencoder, self).__init__()
        # Encoder: compresses 6D telemetry vector to 3D latent representation
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 8),
            nn.LeakyReLU(0.1),
            nn.Linear(8, latent_dim),
            nn.LeakyReLU(0.1)
        )
        # Decoder: reconstructs nominal 6D telemetry from latent space
        self.decoder = nn.Sequential(
            nn.Linear(latent_dim, 8),
            nn.LeakyReLU(0.1),
            nn.Linear(8, input_dim),
            nn.Sigmoid() # normalized features are bounded [0, 1]
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        latent = self.encoder(x)
        reconstructed = self.decoder(latent)
        return reconstructed


class LocalAnomalyDetector:
    """
    Dual-engine local ML anomaly detector combining:
    1. Scikit-learn IsolationForest for tree-based multivariate isolation depth (S_IF)
    2. PyTorch Autoencoder MSE reconstruction loss (S_AE)
    3. Operational context penalty (S_context)
    Composite score: S_final = 0.45 * S_IF + 0.35 * S_AE + 0.20 * S_context
    """
    def __init__(self):
        self.feature_dim = 6
        self.threshold = 0.60
        self.weights = {"if": 0.45, "ae": 0.35, "context": 0.20}
        
        # Initialize and warm-fit Isolation Forest on synthetic baseline telemetry
        self.isolation_forest = IsolationForest(
            n_estimators=60,
            contamination=0.08,
            random_state=42,
            bootstrap=False
        )
        self.autoencoder = TelemetryAutoencoder(input_dim=self.feature_dim, latent_dim=3)
        self.mse_loss = nn.MSELoss()
        
        self._warm_up_models()

    def _normalize_features(self, metrics: Dict[str, Any]) -> np.ndarray:
        """
        Normalizes raw telemetry metrics into calibrated [0, 1] scale.
        """
        cpu = min(1.0, max(0.0, (metrics.get("cpu_percent", 0.0)) / 100.0))
        # Normalized memory assuming standard 1024MB container memory
        mem_mb = metrics.get("memory_mb", 256.0)
        mem = min(1.0, max(0.0, mem_mb / 1024.0))
        # Normalized latency: baseline ~40ms, saturation at 1000ms+
        lat_ms = metrics.get("latency_p95_ms", 35.0)
        lat = min(1.0, max(0.0, (lat_ms - 20.0) / 980.0))
        # Normalized error rate: 0 to 25%
        err_pct = metrics.get("error_rate_percent", 0.0)
        err = min(1.0, max(0.0, err_pct / 25.0))
        # DB Query latency: 0 to 600ms
        db_lat = metrics.get("db_query_latency_ms", 12.0)
        db_l = min(1.0, max(0.0, (db_lat - 5.0) / 595.0))
        # DB Connections: 0 to 50 active pool limit
        db_conn = metrics.get("db_connections", 10)
        db_c = min(1.0, max(0.0, db_conn / 50.0))

        return np.array([cpu, mem, lat, err, db_l, db_c], dtype=np.float32)

    def _warm_up_models(self):
        """Pre-trains baseline models on synthetic nominal operating distribution."""
        # Generate 400 nominal baseline telemetry points
        np.random.seed(42)
        nominal_samples = []
        for _ in range(400):
            cpu = np.random.normal(0.25, 0.08) # 25% CPU mean
            mem = np.random.normal(0.35, 0.05) # 35% RAM mean
            lat = np.random.normal(0.05, 0.02) # 50ms latency mean
            err = np.random.exponential(0.01)  # ~0.1% error mean
            dbl = np.random.normal(0.03, 0.01) # 15ms db latency
            dbc = np.random.normal(0.20, 0.05) # 10 connections
            sample = np.clip([cpu, mem, lat, err, dbl, dbc], 0.0, 1.0)
            nominal_samples.append(sample)

        X_train = np.array(nominal_samples, dtype=np.float32)
        self.isolation_forest.fit(X_train)

        # Quick train of the PyTorch autoencoder
        optimizer = torch.optim.Adam(self.autoencoder.parameters(), lr=0.01)
        tensor_x = torch.from_numpy(X_train)
        self.autoencoder.train()
        for epoch in range(40):
            optimizer.zero_grad()
            reconstructed = self.autoencoder(tensor_x)
            loss = self.mse_loss(reconstructed, tensor_x)
            loss.backward()
            optimizer.step()
        self.autoencoder.eval()

    def evaluate_telemetry(
        self,
        metrics: Dict[str, Any],
        service_status: str = "healthy",
        recent_restart_count: int = 0
    ) -> Dict[str, Any]:
        """
        Evaluates real-time multivariate telemetry against Isolation Forest & Autoencoder.
        Returns detailed score breakdowns and classification.
        """
        features = self._normalize_features(metrics)
        features_2d = features.reshape(1, -1)

        # 1. Isolation Forest Outlier Score (S_IF)
        # decision_function returns negative values for outliers; calibrate to [0, 1]
        raw_if_score = self.isolation_forest.decision_function(features_2d)[0]
        # raw_if_score is typically between -0.3 (extreme anomaly) and +0.3 (very normal)
        s_if = float(np.clip(0.5 - (raw_if_score * 1.6), 0.05, 0.99))

        # 2. PyTorch Autoencoder Reconstruction Loss (S_AE)
        tensor_feat = torch.from_numpy(features_2d)
        with torch.no_grad():
            reconstructed = self.autoencoder(tensor_feat)
            mse = float(self.mse_loss(reconstructed, tensor_feat).item())
        # Scale MSE reconstruction loss (nominal is ~0.002, anomaly is >0.08)
        s_ae = float(np.clip(mse * 12.0, 0.05, 0.99))

        # 3. Context Score based on service state and restarts
        s_context = 0.05
        if service_status == "degraded":
            s_context = 0.55
        elif service_status == "critical":
            s_context = 0.85
        elif service_status == "crashed":
            s_context = 0.98
        if recent_restart_count > 0:
            s_context = min(0.99, s_context + recent_restart_count * 0.15)

        # 4. Composite Score
        s_final = (
            self.weights["if"] * s_if +
            self.weights["ae"] * s_ae +
            self.weights["context"] * s_context
        )
        s_final = float(np.clip(s_final, 0.0, 1.0))

        # 5. Severity Categorization
        if s_final >= 0.82:
            severity = "severe"
        elif s_final >= self.threshold:
            severity = "anomalous"
        elif s_final >= 0.38:
            severity = "suspicious"
        else:
            severity = "normal"

        # Determine primary deviating feature
        feature_names = ["CPU Utilization", "Memory Heap", "Latency p95", "Error Rate", "DB Query Latency", "DB Connections"]
        primary_metric_idx = int(np.argmax(features))
        primary_metric_name = feature_names[primary_metric_idx]

        return {
            "isolation_forest_score": round(s_if, 4),
            "autoencoder_recon_error": round(s_ae, 4),
            "context_score": round(s_context, 4),
            "final_anomaly_score": round(s_final, 4),
            "threshold": self.threshold,
            "severity": severity,
            "is_anomaly": s_final >= self.threshold,
            "primary_metric": primary_metric_name,
            "normalized_vector": features.tolist()
        }

# Global singleton detector
anomaly_detector = LocalAnomalyDetector()
