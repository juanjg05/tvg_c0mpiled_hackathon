"""
Backend config and 311 leak-related filter list.

Leak-related sr_type values from Chicago 311 DWM (Department of Water Management)
and water/leak help pages: Water on Street, Water in Basement, Open Fire Hydrant,
Sewer Cave-In, etc. Exact strings match Socrata dataset v6vf-nfxy.
"""
from __future__ import annotations

import os
from pathlib import Path

# --- Paths --- (default: backend/data so API and pipeline share same data)
_BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = Path(os.environ.get("DATA_DIR", str(_BASE_DIR / "data")))
RAW_DIR = DATA_DIR / "raw"
FEATURES_DIR = DATA_DIR / "features"
MODELS_DIR = DATA_DIR / "models"
RAW_311_DIR = RAW_DIR / "311"
RAW_WEATHER_DIR = RAW_DIR / "weather"

# --- H3 ---
H3_RESOLUTION = 9  # urban neighborhoods, ~0.105 km²
H3_RES_NEIGHBORS = 9  # for k-ring clustering

# --- Chicago 311 Socrata ---
SOCRATA_311_DATASET = "v6vf-nfxy"
SOCRATA_BASE = "https://data.cityofchicago.org/resource"
SOCRATA_311_URL = f"{SOCRATA_BASE}/{SOCRATA_311_DATASET}.json"

# Leak-related service types (sr_type) – DWM + leak-ish categories
# From 311request.cityofchicago.org and 311.chicago.gov water pages
LEAK_RELATED_SR_TYPES = frozenset({
    "Water On Street Complaint",
    "Water in Basement Complaint",
    "Open Fire Hydrant Complaint",
    "Sewer Cave-In Inspection Request",
    "Water Quality Concern",
    "No Water Complaint",
    "Low Water Pressure Complaint",
    "Sewer Cleaning Inspection Request",
    "Alley Sewer Inspection Request",
    "Check for Leak",
})

# Optional: filter by sr_short_code if we discover stable codes (e.g. WOS, WIB, HFH)
LEAK_RELATED_SR_SHORT_CODES: frozenset[str] = frozenset()  # fill from discover script

# --- Training / labels ---
LABEL_HORIZON_DAYS = 7  # H=7
DECAY_HALFLIFE_DAYS = 7  # for exponential decay feature
TRAIN_MONTHS = 6  # small window for hackathon/demo
TIME_SPLIT_VAL_RATIO = 0.2  # last 20% of time for validation/calibration

# --- Risk bands ---
RISK_BAND_THRESHOLDS = (0.2, 0.5)  # low < 0.2, med < 0.5, high >= 0.5

# --- Pricing (tunable priors, no private utility data) ---
# Severity classes 1,2,3 from resolution duration quantiles (60%, 30%, 10%)
VOLUME_M3_BY_SEVERITY = (5.0, 25.0, 100.0)  # V1, V2, V3 m³ per event
HEAD_M = 50.0  # typical head (m)
PUMP_EFFICIENCY = 0.7
RHO_KG_M3 = 1000.0
G_M_S2 = 9.81
# Illinois average retail $/kWh (EIA) – override with price_electricity table if available
DEFAULT_USD_PER_KWH = 0.14
WATER_COST_PER_M3_USD = 0.5  # marginal water cost $/m³

# --- Recommendations ---
PRESSURE_REDUCTION_OPTIONS_PSI = (3, 5, 8)
PRESSURE_ELASTICITY_N = 1.0  # r(ΔP) = 1 - ((P-ΔP)/P)^n
MIN_PRESSURE_PSI = 20.0
DEFAULT_PRESSURE_PSI = 60.0
RISK_THRESHOLD_FOR_REC = 0.3  # p_cal >= tau → candidate cell
REC_TIME_WINDOW = "01:00-05:00"  # 1am–5am default

# --- Weather ---
# Chicago coordinates for Open-Meteo / NWS
CHICAGO_LAT = 41.8781
CHICAGO_LON = -87.6298
OPEN_METEO_BASE = "https://api.open-meteo.com/v1"
HEAVY_RAIN_MM = 25.0  # precip_mm per day

# --- API ---
API_PREFIX = "/api"
GEOJSON_CRS = "EPSG:4326"
