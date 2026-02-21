# AI Water System

AI-powered water system monitoring and management (Chicago 311 leak risk, cost, recommendations).

## Project Structure

```
tvg_c0mpiled_hackathon/
├── frontend/   # Next.js 16 + TypeScript + Leaflet map
└── backend/   # Python: 311 + weather ingestion, risk/cost/recommendation models, GeoJSON API
```

## Connect frontend to backend

1. **Start the backend** (from repo root):

   ```bash
   PYTHONPATH=backend backend/.venv/bin/uvicorn backend.api.main:app --reload --port 8000
   ```

   Or with venv activated: `cd backend && .venv/bin/uvicorn api.main:app --reload --port 8000` (run from `backend` so `api` resolves).

2. **Point the frontend at the API**:

   ```bash
   cp frontend/env.example frontend/.env.local
   ```

   Ensure `NEXT_PUBLIC_API_URL=http://localhost:8000/api` in `frontend/.env.local`.

3. **Start the frontend**:

   ```bash
   cd frontend && npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). The map will load risk hexes, cost, and recommendations from the backend for the selected date.

## Frontend

Next.js 16 (App Router), TypeScript, Tailwind, Leaflet. Layers: Risk, Cost, 311 (stubbed), Recommendations. Drilldown panel shows cell history from `GET /api/cell/:h3_id/history`.

- `npm run dev` - Development (Turbopack)
- `npm run build` / `npm start` - Production

## Backend

See `backend/README.md`. Quick run: `cd backend && .venv/bin/python run_pipeline.py` then start the API as above.
