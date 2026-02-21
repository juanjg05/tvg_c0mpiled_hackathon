"""
Risk model: predict p(leak-related 311 in cell in next H days).
Logistic regression or LightGBM, time-based split, Platt scaling calibration.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.calibration import CalibratedClassifierCV
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    brier_score_loss,
)

from config import (
    FEATURES_DIR,
    LABEL_HORIZON_DAYS,
    MODELS_DIR,
    RISK_BAND_THRESHOLDS,
    TIME_SPLIT_VAL_RATIO,
)

logger = logging.getLogger(__name__)

FEATURE_COLS = [
    "cnt_311_7d", "cnt_311_30d", "decay311",
    "freeze_t", "temp_drop_t", "precip_mm_t", "heavy_rain_t",
    "freeze_x_cnt311_30d",
]


def _band(p: float) -> str:
    low, high = RISK_BAND_THRESHOLDS
    if p < low:
        return "low"
    if p < high:
        return "medium"
    return "high"


def train(
    df: pd.DataFrame,
    val_ratio: float = TIME_SPLIT_VAL_RATIO,
    use_calibration: bool = True,
) -> tuple[Any, dict]:
    """
    Time-based split: train on earlier period, validate/calibrate on later.
    Returns (fitted calibrator or classifier, metadata).
    """
    df = df.sort_values("date")
    # Unify: fill missing/inf features with 0 so we keep all rows with a label
    for c in FEATURE_COLS:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0).replace([np.inf, -np.inf], 0)
    if "y_event_H" not in df.columns:
        raise ValueError("No y_event_H column in features.")
    df["y_event_H"] = pd.to_numeric(df["y_event_H"], errors="coerce").fillna(0).astype(int)
    df = df.dropna(subset=FEATURE_COLS + ["y_event_H"])
    n = len(df)
    if n < 10:
        raise ValueError(f"Not enough samples for training (n={n}). Need at least 10.")
    split_idx = max(1, int(n * (1 - val_ratio)))
    train_df = df.iloc[:split_idx]
    val_df = df.iloc[split_idx:]

    X_train = train_df[FEATURE_COLS].astype(float).clip(-1e6, 1e6)
    y_train = train_df["y_event_H"]
    X_val = val_df[FEATURE_COLS].astype(float).clip(-1e6, 1e6)
    y_val = val_df["y_event_H"]

    # Scale features; handle constant columns (avoid 0 variance -> nan)
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_val_s = scaler.transform(X_val)
    for arr in (X_train_s, X_val_s):
        np.nan_to_num(arr, copy=False, nan=0.0, posinf=10.0, neginf=-10.0)
    X_train_s = np.clip(X_train_s, -10.0, 10.0)
    X_val_s = np.clip(X_val_s, -10.0, 10.0)

    base = LogisticRegression(
        max_iter=2000,
        random_state=42,
        class_weight="balanced",
        C=1.0,
        solver="lbfgs",
    )
    base.fit(X_train_s, y_train)
    if use_calibration:
        try:
            calibrator = CalibratedClassifierCV(base, method="isotonic", cv="prefit")
            calibrator.fit(X_val_s, y_val)
            model = calibrator
        except Exception as e:
            logger.warning("Calibration failed (%s), using base model", e)
            model = base
    else:
        model = base

    meta = {"feature_cols": FEATURE_COLS, "scaler": scaler}
    if hasattr(base, "coef_"):
        meta["coefficients"] = {c: float(v) for c, v in zip(FEATURE_COLS, base.coef_[0])}
    return model, meta


def _prepare_X(X: pd.DataFrame, meta: dict) -> np.ndarray:
    """Clip, scale if scaler in meta, then clip scaled to avoid overflow."""
    X = X.reindex(columns=FEATURE_COLS).fillna(0).astype(float).clip(-1e6, 1e6)
    scaler = meta.get("scaler")
    if scaler is not None:
        out = scaler.transform(X)
        return np.clip(out, -10.0, 10.0)
    return X.values


def predict(
    model: Any,
    df: pd.DataFrame,
    meta: dict,
) -> pd.DataFrame:
    """Produce risk_score and p_event_7d (calibrated when using CalibratedClassifierCV)."""
    X = df[FEATURE_COLS].fillna(0).astype(float).clip(-1e6, 1e6)
    X_s = _prepare_X(df[FEATURE_COLS], meta)
    p_cal = model.predict_proba(X_s)[:, 1]
    out = df[["date", "h3_id"]].copy()
    out["risk_score"] = p_cal
    out["p_event_7d"] = np.clip(p_cal, 1e-6, 1 - 1e-6)
    out["risk_band"] = out["p_event_7d"].apply(_band)
    base = model.estimator if hasattr(model, "estimator") else model
    coef = getattr(base, "coef_", None)
    if coef is not None and "feature_cols" in meta:
        drivers = []
        for i in range(len(X_s)):
            row = X_s[i]
            contrib = [(meta["feature_cols"][j], float(coef[0][j] * row[j])) for j in range(len(meta["feature_cols"]))]
            top = sorted(contrib, key=lambda t: -abs(t[1]))[:5]
            drivers.append(json.dumps([{"name": k, "contribution": v} for k, v in top]))
        out["top_drivers"] = drivers
    else:
        out["top_drivers"] = "[]"
    return out


def save_model(model: Any, meta: dict, path: Path | None = None) -> None:
    path = path or MODELS_DIR / "risk_model"
    path.mkdir(parents=True, exist_ok=True)
    import joblib
    joblib.dump({"model": model, "meta": meta}, path / "model.joblib")


def load_model(path: Path | None = None) -> tuple[Any, dict]:
    import joblib
    path = path or MODELS_DIR / "risk_model"
    data = joblib.load(path / "model.joblib")
    return data["model"], data["meta"]


def evaluate(
    model: Any,
    df: pd.DataFrame,
    meta: dict,
    threshold: float = 0.5,
) -> dict[str, float]:
    """
    Compute metrics on a labeled dataframe (must have y_event_H).
    Returns dict with accuracy, precision, recall, f1, roc_auc, brier_score.
    """
    X_s = _prepare_X(df[FEATURE_COLS], meta)
    y_true = df["y_event_H"].astype(int)
    proba = model.predict_proba(X_s)[:, 1]
    y_pred = (proba >= threshold).astype(int)

    metrics = {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
    }
    try:
        metrics["roc_auc"] = float(roc_auc_score(y_true, proba))
    except ValueError:
        metrics["roc_auc"] = 0.0  # single class in y_true
    try:
        metrics["brier_score"] = float(brier_score_loss(y_true, proba))
    except ValueError:
        metrics["brier_score"] = 0.0
    return metrics
