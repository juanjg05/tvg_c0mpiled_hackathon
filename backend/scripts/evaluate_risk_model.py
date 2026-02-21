#!/usr/bin/env python3
"""
Load saved features and risk model; report accuracy and other metrics on validation set.
Uses same time-based split as training (last 20% by time).
Run from backend: .venv/bin/python scripts/evaluate_risk_model.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd

from config import FEATURES_DIR, TIME_SPLIT_VAL_RATIO
from models.risk_model import FEATURE_COLS, _prepare_X, load_model, evaluate


def main():
    path = FEATURES_DIR / "cell_day_features.parquet"
    if not path.exists():
        print(f"Features not found: {path}. Run pipeline first.")
        return 1
    df = pd.read_parquet(path)
    for c in FEATURE_COLS + ["y_event_H"]:
        if c not in df.columns:
            print(f"Missing column: {c}")
            return 1
    df = df.sort_values("date").dropna(subset=FEATURE_COLS + ["y_event_H"])
    n = len(df)
    split_idx = max(1, int(n * (1 - TIME_SPLIT_VAL_RATIO)))
    val_df = df.iloc[split_idx:]

    model_path = Path(__file__).resolve().parent.parent / "data" / "models" / "risk_model" / "model.joblib"
    if not model_path.exists():
        print(f"Model not found: {model_path}. Run pipeline first.")
        return 1
    model, meta = load_model()

    metrics_05 = evaluate(model, val_df, meta, threshold=0.5)
    metrics_03 = evaluate(model, val_df, meta, threshold=0.3)
    X_s = _prepare_X(val_df[FEATURE_COLS], meta)
    pred_proba = model.predict_proba(X_s)[:, 1]
    pred_at_03 = (pred_proba >= 0.3).sum()
    pred_at_05 = (pred_proba >= 0.5).sum()

    print("Risk model – validation set (time-based split, last 20% of dates)")
    print(f"  Validation samples: {len(val_df):,}")
    print(f"  Positive rate (y=1): {val_df['y_event_H'].mean():.2%}")
    print()
    print("Metrics at threshold=0.5:")
    print(f"  Accuracy:   {metrics_05['accuracy']:.4f}  Precision: {metrics_05['precision']:.4f}  Recall: {metrics_05['recall']:.4f}  F1: {metrics_05['f1']:.4f}")
    print("Metrics at threshold=0.3 (better for imbalanced):")
    print(f"  Accuracy:   {metrics_03['accuracy']:.4f}  Precision: {metrics_03['precision']:.4f}  Recall: {metrics_03['recall']:.4f}  F1: {metrics_03['f1']:.4f}")
    print()
    print(f"  ROC-AUC: {metrics_05['roc_auc']:.4f}  |  Brier: {metrics_05['brier_score']:.4f}")
    print(f"  Predictions >= 0.5: {pred_at_05:,}  |  >= 0.3: {pred_at_03:,}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
