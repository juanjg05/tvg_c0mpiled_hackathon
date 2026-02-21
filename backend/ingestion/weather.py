"""
Weather ingestion: Open-Meteo (no key). Daily tmin, tmax, precip for Chicago.
"""
from __future__ import annotations

import logging
from datetime import date, timedelta
from pathlib import Path

import httpx
import pandas as pd

from config import (
    CHICAGO_LAT,
    CHICAGO_LON,
    HEAVY_RAIN_MM,
    OPEN_METEO_BASE,
    RAW_WEATHER_DIR,
)

logger = logging.getLogger(__name__)


def fetch_weather(start: date, end: date) -> pd.DataFrame:
    """Fetch daily weather for Chicago (Open-Meteo historical or forecast)."""
    url = f"{OPEN_METEO_BASE}/forecast"
    params = {
        "latitude": CHICAGO_LAT,
        "longitude": CHICAGO_LON,
        "daily": "temperature_2m_min,temperature_2m_max,temperature_2m_mean,precipitation_sum",
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "timezone": "America/Chicago",
    }
    with httpx.Client(timeout=30.0) as client:
        r = client.get(url, params=params)
        r.raise_for_status()
        data = r.json()
    daily = data.get("daily", {})
    if not daily:
        return pd.DataFrame()
    tmin = daily["temperature_2m_min"]
    tmax = daily["temperature_2m_max"]
    tavg = daily.get("temperature_2m_mean") or [(a + b) / 2 for a, b in zip(tmin, tmax)]
    df = pd.DataFrame({
        "date": pd.to_datetime(daily["time"]).date,
        "tmin_c": tmin,
        "tmax_c": tmax,
        "tavg_c": tavg,
        "precip_mm": daily["precipitation_sum"],
    })
    df["date"] = pd.to_datetime(df["date"]).dt.normalize()
    # Derived stressors
    df["freeze"] = (df["tmin_c"] <= 0).astype(int)
    df["temp_drop_c"] = df["tavg_c"].diff()
    df["temp_drop_c"] = df["temp_drop_c"].fillna(0)
    df["heavy_rain"] = (df["precip_mm"] >= HEAVY_RAIN_MM).astype(int)
    return df


# Historical uses a different base (archive-api.open-meteo.com)
OPEN_METEO_ARCHIVE_BASE = "https://archive-api.open-meteo.com/v1"


def _daily_df_from_api(daily: dict) -> pd.DataFrame:
    """Build daily weather DataFrame from API daily dict (min/max/precip)."""
    tmin = daily["temperature_2m_min"]
    tmax = daily["temperature_2m_max"]
    tavg = daily.get("temperature_2m_mean")
    if tavg is None and tmin and tmax:
        tavg = [(a + b) / 2 for a, b in zip(tmin, tmax)]
    precip = daily.get("precipitation_sum", [0] * len(tmin))
    df = pd.DataFrame({
        "date": pd.to_datetime(daily["time"]).date,
        "tmin_c": tmin,
        "tmax_c": tmax,
        "tavg_c": tavg if tavg is not None else [(a + b) / 2 for a, b in zip(tmin, tmax)],
        "precip_mm": precip,
    })
    df["date"] = pd.to_datetime(df["date"]).dt.normalize()
    df["freeze"] = (df["tmin_c"] <= 0).astype(int)
    df["temp_drop_c"] = df["tavg_c"].diff().fillna(0)
    df["heavy_rain"] = (df["precip_mm"] >= HEAVY_RAIN_MM).astype(int)
    return df


def fetch_historical(start: date, end: date) -> pd.DataFrame:
    """Open-Meteo historical archive API (past weather). Uses archive-api subdomain."""
    url = f"{OPEN_METEO_ARCHIVE_BASE}/archive"
    # Archive API often has min/max but not mean; request min,max,precip
    params = {
        "latitude": CHICAGO_LAT,
        "longitude": CHICAGO_LON,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "daily": "temperature_2m_min,temperature_2m_max,precipitation_sum",
        "timezone": "America/Chicago",
    }
    try:
        with httpx.Client(timeout=60.0) as client:
            r = client.get(url, params=params)
            r.raise_for_status()
            data = r.json()
    except Exception as e:
        logger.warning("Historical weather API failed (%s), using placeholder", e)
        return _placeholder_weather(start, end)
    daily = data.get("daily", {})
    if not daily:
        return _placeholder_weather(start, end)
    daily["temperature_2m_mean"] = [(a + b) / 2 for a, b in zip(daily["temperature_2m_min"], daily["temperature_2m_max"])]
    return _daily_df_from_api(daily)


def _placeholder_weather(start: date, end: date) -> pd.DataFrame:
    """Placeholder daily weather when API unavailable (e.g. future dates)."""
    from datetime import timedelta
    dates = pd.date_range(start, end, freq="D")
    df = pd.DataFrame({
        "date": dates,
        "tmin_c": 0.0,
        "tmax_c": 15.0,
        "tavg_c": 8.0,
        "precip_mm": 0.0,
        "freeze": 0,
        "temp_drop_c": 0.0,
        "heavy_rain": 0,
    })
    df["date"] = pd.to_datetime(df["date"]).dt.normalize()
    return df


def ingest_weather(start: date, end: date, out_dir: Path | None = None) -> pd.DataFrame:
    """Fetch and save weather: historical for past, forecast only for next ~16 days."""
    out_dir = out_dir or RAW_WEATHER_DIR
    out_dir.mkdir(parents=True, exist_ok=True)
    today = date.today()
    frames = []
    # Past: use archive API (forecast API rejects past dates)
    if start < today:
        hist_end = min(end, today)
        df_hist = fetch_historical(start, hist_end)
        if not df_hist.empty:
            frames.append(df_hist)
    # Future: forecast API only supports short range (~16 days)
    if end >= today:
        forecast_start = max(start, today)
        forecast_end = min(end, today + timedelta(days=16))
        if forecast_start <= forecast_end:
            df_fc = fetch_weather(forecast_start, forecast_end)
            if not df_fc.empty:
                frames.append(df_fc)
    if not frames:
        return pd.DataFrame()
    df = pd.concat(frames, ignore_index=True).drop_duplicates(subset=["date"]).sort_values("date")
    path = out_dir / "weather_daily.parquet"
    df.to_parquet(path, index=False)
    logger.info("Wrote %s rows to %s", len(df), path)
    return df


def load_weather(dir_path: Path | None = None) -> pd.DataFrame:
    dir_path = dir_path or RAW_WEATHER_DIR
    path = dir_path / "weather_daily.parquet"
    if not path.exists():
        return pd.DataFrame()
    return pd.read_parquet(path)
