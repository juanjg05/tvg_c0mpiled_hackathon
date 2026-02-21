"""
Pricing model: severity proxy from 311 (resolution duration or repeat count),
expected volume and cost (energy + water) with tunable priors.
"""
from __future__ import annotations

import logging
from pathlib import Path

import numpy as np
import pandas as pd

from config import (
    DEFAULT_PRESSURE_PSI,
    DEFAULT_USD_PER_KWH,
    G_M_S2,
    HEAD_M,
    PUMP_EFFICIENCY,
    RHO_KG_M3,
    VOLUME_M3_BY_SEVERITY,
    WATER_COST_PER_M3_USD,
)

logger = logging.getLogger(__name__)


def severity_from_duration(df311: pd.DataFrame) -> pd.Series:
    """
    Resolution duration d = closed_ts - created_ts; map to severity 1,2,3 by quantiles.
    """
    df = df311.dropna(subset=["created_ts", "closed_ts"]).copy()
    df["duration_h"] = (df["closed_ts"] - df["created_ts"]).dt.total_seconds() / 3600
    df = df[df["duration_h"] >= 0]
    if df.empty:
        return pd.Series(dtype=float)
    q60 = df["duration_h"].quantile(0.6)
    q90 = df["duration_h"].quantile(0.9)
    def s(d):
        if d <= q60:
            return 1
        if d <= q90:
            return 2
        return 3
    return df["duration_h"].apply(s)


def expected_volume_m3(p_event: float, severity_probs: tuple[float, float, float]) -> float:
    """E[#events] * E[V|severity]. Approximate E[#events] by p_event (binary)."""
    ev_severity = sum(severity_probs[i] * VOLUME_M3_BY_SEVERITY[i] for i in range(3))
    return p_event * ev_severity


def energy_waste_kwh(delta_v_m3: float) -> float:
    """E_waste = (rho * g * H / eta) * delta_V (convert to kWh)."""
    work_j = RHO_KG_M3 * G_M_S2 * HEAD_M * delta_v_m3
    return work_j / (3.6e6 * PUMP_EFFICIENCY)


def expected_cost_usd(
    p_event_7d: float,
    severity_probs: tuple[float, float, float] = (0.6, 0.3, 0.1),
    usd_per_kwh: float = DEFAULT_USD_PER_KWH,
) -> tuple[float, float]:
    """
    Returns (expected_cost_usd, p90_cost_usd approximate).
    """
    vol = expected_volume_m3(p_event_7d, severity_probs)
    energy_kwh = energy_waste_kwh(vol)
    cost_energy = energy_kwh * usd_per_kwh
    cost_water = vol * WATER_COST_PER_M3_USD
    expected = cost_energy + cost_water
    # P90: assume lognormal on volume with same mean
    vol_p90 = vol * 1.5  # rough
    cost_p90 = energy_waste_kwh(vol_p90) * usd_per_kwh + vol_p90 * WATER_COST_PER_M3_USD
    return expected, cost_p90


def add_costs_to_predictions(
    pred_df: pd.DataFrame,
    usd_per_kwh: float = DEFAULT_USD_PER_KWH,
) -> pd.DataFrame:
    """Add expected_cost_usd and p90_cost_usd to prediction rows."""
    out = pred_df.copy()
    exp_list = []
    p90_list = []
    for _, row in out.iterrows():
        e, p90 = expected_cost_usd(row["p_event_7d"], usd_per_kwh=usd_per_kwh)
        exp_list.append(e)
        p90_list.append(p90)
    out["expected_cost_usd"] = exp_list
    out["p90_cost_usd"] = p90_list
    return out
