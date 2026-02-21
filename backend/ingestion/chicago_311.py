"""
Chicago 311 ingestion via Socrata. Pull leak-related requests only, by month.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Iterator

import pandas as pd
import httpx

from config import (
    LEAK_RELATED_SR_TYPES,
    RAW_311_DIR,
    SOCRATA_311_URL,
)
from ingestion.h3_utils import lat_lon_to_h3

logger = logging.getLogger(__name__)

# SoQL: filter by sr_type in list, valid lat/lon, created_date in range
# Batch by month to avoid timeouts
CHUNK_SIZE = 50000


def _soql_where_month(year: int, month: int) -> str:
    start = datetime(year, month, 1)
    if month == 12:
        end = datetime(year + 1, 1, 1) - timedelta(seconds=1)
    else:
        end = datetime(year, month + 1, 1) - timedelta(seconds=1)
    return (
        f"created_date between '{start.isoformat()}' and '{end.isoformat()}' "
        f"and latitude is not null and longitude is not null"
    )


def _sr_type_filter() -> str:
    # SoQL: (sr_type='A' or sr_type='B' ...)
    quoted = [f"sr_type='{t.replace(chr(39), chr(39)+chr(39))}'" for t in LEAK_RELATED_SR_TYPES]
    return "(" + " or ".join(quoted) + ")"


def fetch_month(year: int, month: int, limit: int = 100_000) -> pd.DataFrame:
    """Fetch one month of leak-related 311 requests."""
    where = _sr_type_filter() + " and " + _soql_where_month(year, month)
    params = {
        "$where": where,
        "$limit": limit,
        "$select": "sr_number,created_date,closed_date,status,sr_type,sr_short_code,latitude,longitude",
    }
    records: list[dict[str, Any]] = []
    offset = 0
    with httpx.Client(timeout=60.0) as client:
        while True:
            params["$offset"] = offset
            r = client.get(SOCRATA_311_URL, params=params)
            r.raise_for_status()
            data = r.json()
            if not data:
                break
            records.extend(data)
            if len(data) < 5000:  # last chunk
                break
            offset += len(data)
            if offset >= limit:
                break
    if not records:
        return pd.DataFrame()
    df = pd.DataFrame(records)
    # normalize columns to our schema
    df = df.rename(columns={
        "created_date": "created_ts",
        "closed_date": "closed_ts",
        "latitude": "lat",
        "longitude": "lon",
    })
    for col in ("created_ts", "closed_ts"):
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce")
    for col in ("lat", "lon"):
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    df = df.dropna(subset=["lat", "lon"])
    df["h3_id"] = df.apply(lambda r: lat_lon_to_h3(r["lat"], r["lon"]), axis=1)
    return df


def ingest_range(
    start_date: datetime,
    end_date: datetime,
    out_dir: Path | None = None,
) -> pd.DataFrame:
    """Ingest 311 leak-related data month by month and append to parquet."""
    out_dir = out_dir or RAW_311_DIR
    out_dir.mkdir(parents=True, exist_ok=True)
    frames = []
    current = start_date.replace(day=1)
    while current <= end_date:
        df = fetch_month(current.year, current.month)
        if not df.empty:
            path = out_dir / f"311_{current.year}_{current.month:02d}.parquet"
            df.to_parquet(path, index=False)
            frames.append(df)
            logger.info("Wrote %s rows to %s", len(df), path)
        current = current + timedelta(days=32)
        current = current.replace(day=1)
    if not frames:
        return pd.DataFrame()
    return pd.concat(frames, ignore_index=True)


def load_raw_311(dir_path: Path | None = None) -> pd.DataFrame:
    """Load all raw 311 parquet files from directory."""
    dir_path = dir_path or RAW_311_DIR
    if not dir_path.exists():
        return pd.DataFrame()
    files = sorted(dir_path.glob("311_*.parquet"))
    if not files:
        return pd.DataFrame()
    return pd.concat(
        (pd.read_parquet(f) for f in files),
        ignore_index=True,
    )


def discover_sr_types(sample_size: int = 50000) -> None:
    """
    Fetch a sample of 311 rows and print sr_type counts.
    Use this to verify LEAK_RELATED_SR_TYPES in config.
    """
    params = {"$limit": sample_size, "$select": "sr_type,sr_short_code"}
    with httpx.Client(timeout=60.0) as client:
        r = client.get(SOCRATA_311_URL, params=params)
        r.raise_for_status()
        data = r.json()
    df = pd.DataFrame(data)
    print(df["sr_type"].value_counts().head(80).to_string())
