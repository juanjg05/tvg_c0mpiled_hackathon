"""
Minimal schema: raw_311, weather_daily, cell_day_features, cell_day_predictions, recommendations.
Parquet-backed; column names and dtypes for validation.
"""
from __future__ import annotations

# raw_311 columns
RAW_311_COLS = [
    "sr_number", "created_ts", "closed_ts", "sr_type", "sr_short_code",
    "status", "lat", "lon", "h3_id",
]

# weather_daily
WEATHER_DAILY_COLS = [
    "date", "tmin_c", "tavg_c", "tmax_c", "precip_mm",
    "freeze", "temp_drop_c", "heavy_rain",
]

# cell_day_features (for training + serving)
CELL_DAY_FEATURE_COLS = [
    "date", "h3_id",
    "cnt_311_7d", "cnt_311_30d", "decay311",
    "freeze_t", "temp_drop_t", "precip_mm_t", "heavy_rain_t",
    "freeze_x_cnt311_30d",
    "y_event_H",
]

# cell_day_predictions (model output)
CELL_DAY_PREDICTION_COLS = [
    "date", "h3_id", "p_event_7d", "risk_score", "risk_band",
    "top_drivers", "expected_cost_usd", "p90_cost_usd",
]

# recommendations
REC_COLS = [
    "date", "rec_id", "h3_ids", "geometry_geojson",
    "action_type", "delta_p_psi", "time_window",
    "expected_savings_usd", "rationale",
]
