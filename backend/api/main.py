"""
GeoJSON-first API for the interactive map.
GET /layers/risk?date=YYYY-MM-DD
GET /layers/cost?date=...
GET /layers/recommendations?date=...
GET /cell/{h3_id}/history
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

# Run from repo root (uvicorn backend.api.main) or backend
ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND = Path(__file__).resolve().parent.parent
for p in (BACKEND, ROOT):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

from config import API_PREFIX, FEATURES_DIR, GEOJSON_CRS, RISK_THRESHOLD_FOR_REC
from ingestion.h3_utils import h3_to_geojson_polygon

app = FastAPI(title="Chicago 311 Risk API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _load_predictions() -> pd.DataFrame:
    path = FEATURES_DIR / "cell_day_predictions.parquet"
    if not path.exists():
        return pd.DataFrame()
    return pd.read_parquet(path)


def _load_recommendations() -> pd.DataFrame:
    path = FEATURES_DIR / "recommendations.parquet"
    if not path.exists():
        return pd.DataFrame()
    return pd.read_parquet(path)


def _predictions_for_date(df: pd.DataFrame, date: str) -> pd.DataFrame:
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"]).dt.normalize()
    target = pd.to_datetime(date).normalize()
    return df[df["date"] == target]


@app.get(f"{API_PREFIX}/layers/risk")
def get_layers_risk(date: str = Query(..., description="YYYY-MM-DD")):
    """GeoJSON hexes with p_event_7d, risk_band, drivers."""
    df = _load_predictions()
    if df.empty:
        return {"type": "FeatureCollection", "features": []}
    df = _predictions_for_date(df, date)
    if df.empty:
        return {"type": "FeatureCollection", "features": []}
    features = []
    for _, row in df.iterrows():
        geom = h3_to_geojson_polygon(row["h3_id"])
        drivers = row.get("top_drivers", "[]")
        if isinstance(drivers, str):
            try:
                drivers = json.loads(drivers)
            except Exception:
                drivers = []
        features.append({
            "type": "Feature",
            "geometry": geom,
            "properties": {
                "h3_id": row["h3_id"],
                "p_event_7d": float(row["p_event_7d"]),
                "risk_band": row["risk_band"],
                "drivers": drivers,
            },
        })
    return {"type": "FeatureCollection", "features": features, "crs": GEOJSON_CRS}


@app.get(f"{API_PREFIX}/layers/cost")
def get_layers_cost(date: str = Query(..., description="YYYY-MM-DD")):
    """GeoJSON hexes with expected_cost_usd_7d, p90_cost."""
    df = _load_predictions()
    if df.empty:
        return {"type": "FeatureCollection", "features": []}
    df = _predictions_for_date(df, date)
    if df.empty:
        return {"type": "FeatureCollection", "features": []}
    features = []
    for _, row in df.iterrows():
        geom = h3_to_geojson_polygon(row["h3_id"])
        features.append({
            "type": "Feature",
            "geometry": geom,
            "properties": {
                "h3_id": row["h3_id"],
                "expected_cost_usd_7d": float(row.get("expected_cost_usd", 0)),
                "p90_cost": float(row.get("p90_cost_usd", 0)),
            },
        })
    return {"type": "FeatureCollection", "features": features, "crs": GEOJSON_CRS}


@app.get(f"{API_PREFIX}/layers/recommendations")
def get_layers_recommendations(
    date: str = Query(..., description="YYYY-MM-DD"),
    per_cell: bool = Query(False, description="If true, one GeoJSON feature per high-risk tile (h3 cell); else one per cluster."),
):
    """
    GeoJSON polygons + action payload.
    - per_cell=false (default): one feature per cluster of adjacent high-risk cells (MultiPolygon).
    - per_cell=true: one feature per high-risk tile (one Polygon per h3_id), so every such tile has a recommendation.
    CRS is GeoJSON (EPSG:4326).
    """
    target = pd.to_datetime(date).normalize()

    if per_cell:
        # One recommendation per high-risk tile (each h3 cell gets its own feature)
        pred_df = _load_predictions()
        if pred_df.empty:
            return {"type": "FeatureCollection", "features": []}
        pred_df["date"] = pd.to_datetime(pred_df["date"]).dt.normalize()
        pred_df = pred_df[pred_df["date"] == target]
        high = pred_df[pred_df["p_event_7d"] >= RISK_THRESHOLD_FOR_REC]
        if high.empty:
            return {"type": "FeatureCollection", "features": []}
        features = []
        for _, row in high.iterrows():
            geom = h3_to_geojson_polygon(row["h3_id"])
            features.append({
                "type": "Feature",
                "geometry": geom,
                "properties": {
                    "h3_id": row["h3_id"],
                    "rec_id": f"{row['h3_id']}_{target.date()}",
                    "action_type": "Pressure reduction test",
                    "delta_p_psi": 5,
                    "time_window": "01:00-05:00",
                    "expected_savings_usd": float(row.get("expected_cost_usd", 0)) * 0.1,
                    "p_event_7d": float(row["p_event_7d"]),
                    "rationale": "high 311 recency + stress",
                },
            })
        return {"type": "FeatureCollection", "features": features, "crs": GEOJSON_CRS}

    # Default: one feature per cluster (MultiPolygon)
    df = _load_recommendations()
    if df.empty:
        return {"type": "FeatureCollection", "features": []}
    df["date"] = pd.to_datetime(df["date"]).dt.normalize()
    df = df[df["date"] == target]
    if df.empty:
        return {"type": "FeatureCollection", "features": []}
    features = []
    for _, row in df.iterrows():
        geom = json.loads(row["geometry_geojson"]) if isinstance(row["geometry_geojson"], str) else row["geometry_geojson"]
        features.append({
            "type": "Feature",
            "geometry": geom,
            "properties": {
                "rec_id": row["rec_id"],
                "action_type": row["action_type"],
                "delta_p_psi": int(row["delta_p_psi"]),
                "time_window": row["time_window"],
                "expected_savings_usd": float(row["expected_savings_usd"]),
                "rationale": row["rationale"],
            },
        })
    return {"type": "FeatureCollection", "features": features, "crs": GEOJSON_CRS}


@app.get(f"{API_PREFIX}/cell/{{h3_id}}/history")
def get_cell_history(
    h3_id: str,
    days: int = Query(180, ge=1, le=365),
):
    """Time series of risk/cost for one cell (last N days)."""
    df = _load_predictions()
    if df.empty:
        return {"h3_id": h3_id, "history": []}
    df = df[df["h3_id"] == h3_id].copy()
    df["date"] = pd.to_datetime(df["date"]).dt.normalize()
    df = df.sort_values("date").tail(days)
    history = [
        {
            "date": row["date"].strftime("%Y-%m-%d"),
            "p_event_7d": float(row["p_event_7d"]),
            "risk_band": row["risk_band"],
            "expected_cost_usd": float(row.get("expected_cost_usd", 0)),
        }
        for _, row in df.iterrows()
    ]
    return {"h3_id": h3_id, "history": history}


@app.get("/health")
def health():
    return {"status": "ok"}
