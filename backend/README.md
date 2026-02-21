# Chicago 311 Risk Backend

Backend for the **risk model** (leak-related 311 activity per H3 cell), **pricing model** (expected cost proxy), and **recommendation model** (pressure-test scheduling). Built to the [Chicago backend build spec](../docs or inline spec).

## Quick start

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
```

All commands below assume the virtual environment is activated (`source .venv/bin/activate`), or use the venv binary directly (e.g. `.venv/bin/python`, `.venv/bin/uvicorn`).

### 1) Discover 311 leak-related types (optional)

```bash
python scripts/discover_311_sr_types.py
```

Use the output to confirm or extend `LEAK_RELATED_SR_TYPES` in `config.py`.

### 2) Ingest data

```bash
# With venv activated:
python run_pipeline.py

# Or without activating:
.venv/bin/python run_pipeline.py
```

Or ingest only (no training/inference):

```python
from datetime import datetime, timedelta
from ingestion.chicago_311 import ingest_range
from ingestion.weather import ingest_weather

end = datetime.utcnow()
start = end - timedelta(days=60)
ingest_range(start, end)
ingest_weather(start.date(), end.date())
```

### 3) Run full pipeline (ingest → features → train → predict → recommendations)

```bash
python run_pipeline.py
# Skip re-ingest on subsequent runs:
python run_pipeline.py --skip-ingest
```

### 4) Start API

```bash
# From repo root, using the backend venv:
cd /path/to/tvg_c0mpiled_hackathon
PYTHONPATH=backend backend/.venv/bin/uvicorn backend.api.main:app --reload --host 0.0.0.0 --port 8000

# Or activate venv first, then from repo root:
source backend/.venv/bin/activate
PYTHONPATH=backend uvicorn backend.api.main:app --reload --host 0.0.0.0 --port 8000
```

Then:

- `GET /api/layers/risk?date=YYYY-MM-DD` — GeoJSON hexes with `p_event_7d`, `risk_band`, `drivers`
- `GET /api/layers/cost?date=YYYY-MM-DD` — GeoJSON hexes with `expected_cost_usd_7d`, `p90_cost`
- `GET /api/layers/recommendations?date=YYYY-MM-DD` — GeoJSON clusters + action payload
- `GET /api/cell/{h3_id}/history?days=180` — time series for drilldown
- `GET /health` — health check

## Layout

- **config.py** — H3 res, 311 filter list, horizons, pricing priors, API prefix
- **ingestion/** — Chicago 311 (Socrata), weather (Open-Meteo), H3 indexing
- **storage/** — Schemas and `cell_day_features` construction (labels + features)
- **models/** — Risk (logistic + isotonic calibration), pricing (severity + cost), recommendations (H3 clusters + savings)
- **run_pipeline.py** — Nightly job: ingest → features → train/load risk → predict → pricing → recommendations → parquet
- **api/main.py** — FastAPI GeoJSON endpoints for the map

## Data

- **Chicago 311** — Socrata dataset `v6vf-nfxy`; filtered to leak-related `sr_type` (Water on Street, Water in Basement, Open Fire Hydrant, etc.).
- **Weather** — Open-Meteo (Chicago lat/lon); daily tmin/tmax/precip and derived stressors (freeze, temp_drop, heavy_rain).
- **Storage** — Parquet under `data/` (raw 311, weather, `cell_day_features`, `cell_day_predictions`, `recommendations`). Optional: Postgres + PostGIS (see config and schema).

## Ground truth

**Risk** = probability of at least one leak-related 311 request in the H3 cell in the next H=7 days. Not “true physical leak”; 311 is the only citywide labeled signal used here.
