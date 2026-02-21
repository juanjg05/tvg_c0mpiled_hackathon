"""
Recommendation model: cluster high-risk H3 cells, score by expected savings
from pressure reduction (elasticity model), output action payloads.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path

import h3
import pandas as pd

from config import (
    DEFAULT_PRESSURE_PSI,
    MIN_PRESSURE_PSI,
    PRESSURE_ELASTICITY_N,
    PRESSURE_REDUCTION_OPTIONS_PSI,
    REC_TIME_WINDOW,
    RISK_THRESHOLD_FOR_REC,
)
from ingestion.h3_utils import h3_to_geojson_polygon

logger = logging.getLogger(__name__)


def _savings(L: float, P: float, delta_p: float, n: float) -> float:
    """S = L * r(delta_P), r = 1 - ((P - delta_P)/P)^n."""
    if P <= 0 or delta_p <= 0 or P - delta_p < MIN_PRESSURE_PSI:
        return 0.0
    r = 1.0 - ((P - delta_p) / P) ** n
    return L * r


def cluster_adjacent_h3(h3_ids: list[str]) -> list[list[str]]:
    """
    Cluster H3 cells by adjacency (k-ring connected components).
    Simple: for each cell, get 1-ring; merge sets that share a cell.
    """
    if not h3_ids:
        return []
    seen = set()
    clusters = []
    for c in h3_ids:
        if c in seen:
            continue
        # BFS from c
        cluster = []
        stack = [c]
        while stack:
            cell = stack.pop()
            if cell in seen:
                continue
            seen.add(cell)
            cluster.append(cell)
            for n in h3.grid_disk(cell, 1):
                if n in h3_ids and n not in seen:
                    stack.append(n)
        if cluster:
            clusters.append(cluster)
    return clusters


def build_recommendations(
    pred_df: pd.DataFrame,
    tau: float = RISK_THRESHOLD_FOR_REC,
    P: float = DEFAULT_PRESSURE_PSI,
    delta_p_options: tuple[int, ...] = PRESSURE_REDUCTION_OPTIONS_PSI,
    n: float = PRESSURE_ELASTICITY_N,
    time_window: str = REC_TIME_WINDOW,
) -> pd.DataFrame:
    """
    pred_df must have columns: date, h3_id, p_event_7d, expected_cost_usd.
    Returns one row per (date, cluster): rec_id, h3_ids, geometry, action, savings, rationale.
    """
    out = []
    for date, group in pred_df.groupby("date"):
        high = group[group["p_event_7d"] >= tau]
        if high.empty:
            continue
        cells = high["h3_id"].tolist()
        clusters = cluster_adjacent_h3(cells)
        for i, cluster in enumerate(clusters):
            L = pred_df.loc[pred_df["h3_id"].isin(cluster) & (pred_df["date"] == date), "expected_cost_usd"].sum()
            best_dp = 0
            best_savings = 0.0
            for dp in delta_p_options:
                if P - dp >= MIN_PRESSURE_PSI:
                    s = _savings(L, P, float(dp), n)
                    if s > best_savings:
                        best_savings = s
                        best_dp = dp
            if best_dp == 0:
                continue
            rec_id = f"{date}_{i}"
            # GeoJSON: MultiPolygon from list of hex polygons
            polys = [h3_to_geojson_polygon(h) for h in cluster]
            geom = {"type": "MultiPolygon", "coordinates": [p["coordinates"] for p in polys]}
            rationale = "high 311 recency + stress"
            out.append({
                "date": date,
                "rec_id": rec_id,
                "h3_ids": json.dumps(cluster),
                "geometry_geojson": json.dumps(geom),
                "action_type": "Pressure reduction test",
                "delta_p_psi": best_dp,
                "time_window": time_window,
                "expected_savings_usd": round(best_savings, 2),
                "rationale": rationale,
            })
    return pd.DataFrame(out)


def save_recommendations(df: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(path, index=False)
