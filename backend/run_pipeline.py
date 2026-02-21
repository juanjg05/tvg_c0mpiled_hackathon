"""
Nightly (or on-demand) pipeline:
1. Ingest 311 (last 60 days) + weather
2. Build cell_day_features
3. Train or load risk model, run inference
4. Add pricing (expected_cost_usd)
5. Generate recommendations
6. Write predictions and recommendations to parquet for API
"""
from __future__ import annotations

import logging
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Run from backend dir so config and packages resolve
sys.path.insert(0, str(Path(__file__).resolve().parent))

from config import (
    DATA_DIR,
    FEATURES_DIR,
    MODELS_DIR,
    TRAIN_MONTHS,
)
from ingestion.chicago_311 import ingest_range, load_raw_311
from ingestion.weather import ingest_weather, load_weather
from storage.cell_day import build_cell_day_features, build_and_save
from models.risk_model import train, predict, save_model, load_model
from models.pricing_model import add_costs_to_predictions
from models.recommendation_model import build_recommendations

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run(
    ingest_days: int = 190,  # ~6 months so we have full training window
    train_if_missing: bool = True,
    skip_ingest: bool = False,
) -> None:
    end = datetime.utcnow()
    start_ingest = end - timedelta(days=ingest_days)
    start_train = end - timedelta(days=TRAIN_MONTHS * 31)

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    FEATURES_DIR.mkdir(parents=True, exist_ok=True)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    if not skip_ingest:
        logger.info("Ingesting 311 (leak-related) and weather...")
        ingest_range(start_ingest, end)
        ingest_weather(start_ingest.date(), end.date())

    df311 = load_raw_311()
    df_weather = load_weather()
    if df311.empty:
        logger.warning("No 311 data; run ingest first.")
        return

    logger.info("Building cell_day_features...")
    try:
        df_features = build_and_save(start_train, end, FEATURES_DIR)
    except Exception as e:
        logger.exception("Feature build failed: %s", e)
        return
    if df_features.empty:
        logger.warning("No features built.")
        return

    # Risk model: train or load
    model_path = MODELS_DIR / "risk_model" / "model.joblib"
    if train_if_missing and not model_path.exists():
        logger.info("Training risk model...")
        model, meta = train(df_features, use_calibration=True)
        save_model(model, meta)
    else:
        try:
            model, meta = load_model()
        except Exception as e:
            logger.info("Could not load model, training... %s", e)
            model, meta = train(df_features, use_calibration=True)
            save_model(model, meta)

    # Inference on latest feature set
    pred_df = predict(model, df_features, meta)
    pred_df = add_costs_to_predictions(pred_df)
    pred_path = FEATURES_DIR / "cell_day_predictions.parquet"
    pred_df.to_parquet(pred_path, index=False)
    logger.info("Wrote predictions to %s", pred_path)

    # Recommendations
    rec_df = build_recommendations(pred_df)
    rec_path = FEATURES_DIR / "recommendations.parquet"
    rec_df.to_parquet(rec_path, index=False)
    logger.info("Wrote recommendations to %s", rec_path)


if __name__ == "__main__":
    run(skip_ingest=("--skip-ingest" in sys.argv))
