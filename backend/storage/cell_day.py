"""
Build cell_day_features and labels from raw_311 + weather.
Unified by: location (h3_id), date (normalized midnight UTC), and time (daily aggregates).
y_event_H = 1 if at least one leak-related 311 in cell in (t, t+H].
Features use only data <= t.
Vectorized for speed (no row-wise apply over full grid).
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path

from config import (
    DATA_DIR,
    DECAY_HALFLIFE_DAYS,
    FEATURES_DIR,
    LABEL_HORIZON_DAYS,
)
from ingestion.chicago_311 import load_raw_311
from ingestion.weather import load_weather


def _normalize_date(ser: pd.Series) -> pd.Series:
    """Unify to datetime at midnight (date-only) for joining."""
    return pd.to_datetime(ser).dt.normalize()


def _events_per_cell_day(df311: pd.DataFrame) -> pd.DataFrame:
    """Count leak-related 311 events per (h3_id, date). Location = h3_id, time = date (day)."""
    df311 = df311.copy()
    df311["date"] = _normalize_date(df311["created_ts"])
    agg = df311.groupby(["h3_id", "date"]).size().reset_index(name="n_events")
    agg["date"] = pd.to_datetime(agg["date"]).dt.normalize()
    return agg


def _decay_weights(half_life: int) -> np.ndarray:
    alpha = 0.5 ** (1.0 / half_life)
    return np.array([alpha ** k for k in range(1, 31)])


def build_cell_day_features(
    df311: pd.DataFrame,
    df_weather: pd.DataFrame,
    start_date: datetime,
    end_date: datetime,
    H: int = LABEL_HORIZON_DAYS,
    half_life: int = DECAY_HALFLIFE_DAYS,
) -> pd.DataFrame:
    """
    Build feature rows for each (date, h3_id) in the active grid. Vectorized.
    """
    if df311.empty:
        return pd.DataFrame()
    events = _events_per_cell_day(df311)
    all_dates = pd.date_range(
        _normalize_date(pd.Series([start_date])).iloc[0],
        _normalize_date(pd.Series([end_date])).iloc[0],
        freq="D",
    )
    uniq_cells = events["h3_id"].unique()
    # Grid: one row per (date, h3_id)
    grid = pd.DataFrame(
        [(d, h) for d in all_dates for h in uniq_cells],
        columns=["date", "h3_id"],
    )
    grid["date"] = pd.to_datetime(grid["date"]).dt.normalize()

    # Join events (n_events per (h3_id, date)); fill 0 where no event
    grid = grid.merge(
        events,
        on=["date", "h3_id"],
        how="left",
    )
    grid["n_events"] = grid["n_events"].fillna(0).astype(int)

    # Rolling counts per cell: past 7d and past 30d (excluding current day)
    grid = grid.sort_values(["h3_id", "date"])
    grid["cnt_311_7d"] = (
        grid.groupby("h3_id")["n_events"]
        .transform(lambda s: s.shift(1).rolling(7, min_periods=0).sum())
    )
    grid["cnt_311_30d"] = (
        grid.groupby("h3_id")["n_events"]
        .transform(lambda s: s.shift(1).rolling(30, min_periods=0).sum())
    )

    # Decay: sum over k=1..30 of alpha^k * n_events(t-k)
    weights = _decay_weights(half_life)

    def decay_series(s: pd.Series) -> pd.Series:
        out = pd.Series(0.0, index=s.index)
        for k in range(1, min(31, len(s) + 1)):
            out = out + weights[k - 1] * s.shift(k)
        return out

    grid["decay311"] = grid.groupby("h3_id")["n_events"].transform(decay_series)
    grid["decay311"] = pd.to_numeric(grid["decay311"], errors="coerce").fillna(0)
    grid = grid.drop(columns=["n_events"])

    # Weather: unify by date
    df_weather = df_weather.copy()
    df_weather["date"] = _normalize_date(df_weather["date"])
    grid = grid.merge(
        df_weather[["date", "freeze", "temp_drop_c", "precip_mm", "heavy_rain"]],
        on="date",
        how="left",
    )
    grid = grid.rename(columns={
        "freeze": "freeze_t",
        "temp_drop_c": "temp_drop_t",
        "precip_mm": "precip_mm_t",
        "heavy_rain": "heavy_rain_t",
    })
    grid["freeze_x_cnt311_30d"] = (
        pd.to_numeric(grid["freeze_t"], errors="coerce").fillna(0)
        * pd.to_numeric(grid["cnt_311_30d"], errors="coerce").fillna(0)
    )

    # Label: y_event_H = 1 if any event in (t, t+H]
    events_future = events.rename(columns={"date": "event_date"})
    grid["_date_end"] = grid["date"] + pd.Timedelta(days=H)
    merged = grid[["date", "h3_id", "_date_end"]].merge(
        events_future,
        on="h3_id",
        how="left",
    )
    merged = merged[
        (merged["event_date"] > merged["date"])
        & (merged["event_date"] <= merged["_date_end"])
    ]
    future_count = merged.groupby(["date", "h3_id"])["n_events"].sum().reset_index(name="_future_n")
    grid = grid.drop(columns=["_date_end"]).merge(
        future_count,
        on=["date", "h3_id"],
        how="left",
    )
    grid["y_event_H"] = (grid["_future_n"].fillna(0) >= 1).astype(int)
    grid = grid.drop(columns=["_future_n"], errors="ignore")

    for c in ("freeze_t", "temp_drop_t", "precip_mm_t", "heavy_rain_t"):
        if c in grid.columns:
            grid[c] = pd.to_numeric(grid[c], errors="coerce").fillna(0)
    grid["date"] = pd.to_datetime(grid["date"]).dt.normalize()
    return grid


def build_and_save(
    start_date: datetime,
    end_date: datetime,
    features_dir: Path | None = None,
) -> pd.DataFrame:
    df311 = load_raw_311()
    df_weather = load_weather()
    if df311.empty:
        return pd.DataFrame()
    if df_weather.empty:
        df_weather = pd.DataFrame(columns=["date", "freeze", "temp_drop_c", "precip_mm", "heavy_rain"])
    features_dir = features_dir or FEATURES_DIR
    features_dir.mkdir(parents=True, exist_ok=True)
    df = build_cell_day_features(df311, df_weather, start_date, end_date)
    if df.empty:
        return df
    path = features_dir / "cell_day_features.parquet"
    df.to_parquet(path, index=False)
    return df
