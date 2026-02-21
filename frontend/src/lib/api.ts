import type {
  MetaResponse,
  GridFeatureCollection,
  RiskFeatureCollection,
  CostFeatureCollection,
  EventFeatureCollection,
  RecommendationFeatureCollection,
  CellDetailResponse,
  RecommendationDetailResponse,
  LayerParams,
} from "@/types/api";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && v !== null) {
      search.set(k, String(v));
    }
  }
  const q = search.toString();
  return q ? `?${q}` : "";
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

/** Backend has no /meta; return a stub so filters work. Optionally check /health. */
export async function fetchMeta(): Promise<MetaResponse> {
  if (BASE_URL) {
    try {
      const base = BASE_URL.replace(/\/api\/?$/, "") || BASE_URL;
      const health = await fetchJson<{ status: string }>(`${base}/health`);
      if (health?.status !== "ok") return getStubMeta();
    } catch {
      // backend not running or CORS; still return stub so UI works
    }
  }
  return getStubMeta();
}

function getStubMeta(): MetaResponse {
  return {
    city: "Chicago",
    grid: { h3_resolution: 9 },
    date_min: "2025-08-20",
    date_max: "2026-02-21",
    horizons_days: [7],
    last_refresh_utc: new Date().toISOString(),
    risk_model_version: "0.1",
    pricing_model_version: "0.1",
    recommendation_version: "0.1",
    leak_311_types: [],
    recommendation_action_types: ["Pressure reduction test"],
  };
}

export async function fetchGrid(params: LayerParams): Promise<GridFeatureCollection> {
  const q = buildQuery(params as Record<string, string | number | boolean | undefined>);
  return fetchJson<GridFeatureCollection>(`${BASE_URL}/layers/risk${q}`);
}

/** Backend: GET /api/layers/risk?date=YYYY-MM-DD. Properties: h3_id, p_event_7d, risk_band, drivers. */
export async function fetchRisk(params: LayerParams): Promise<RiskFeatureCollection> {
  const q = buildQuery({ date: params.date });
  const data = await fetchJson<RiskFeatureCollection>(`${BASE_URL}/layers/risk${q}`);
  return adaptRiskCollection(data);
}

/** Backend: GET /api/layers/cost?date=. Properties: h3_id, expected_cost_usd_7d, p90_cost. */
export async function fetchCost(params: LayerParams): Promise<CostFeatureCollection> {
  const q = buildQuery({ date: params.date });
  const data = await fetchJson<CostFeatureCollection>(`${BASE_URL}/layers/cost${q}`);
  return adaptCostCollection(data);
}

export async function fetchEvents(_params: LayerParams): Promise<EventFeatureCollection> {
  return { type: "FeatureCollection", features: [] };
}

/** Backend: GET /api/layers/recommendations?date=&per_cell=. Properties: rec_id, action_type, delta_p_psi, time_window, expected_savings_usd, rationale. */
export async function fetchRecommendations(
  params: LayerParams
): Promise<RecommendationFeatureCollection> {
  const q = buildQuery({ date: params.date });
  const data = await fetchJson<RecommendationFeatureCollection>(`${BASE_URL}/layers/recommendations${q}`);
  return adaptRecommendationsCollection(data);
}

/** Backend: GET /api/cell/:h3_id/history?days=. Returns { h3_id, history: [{ date, p_event_7d, risk_band, expected_cost_usd }] }. */
export async function fetchCellDetail(
  h3Id: string,
  params: { end_date?: string; lookback_days?: number; horizon_days?: number }
): Promise<CellDetailResponse> {
  const days = params.lookback_days ?? 180;
  const q = buildQuery({ days });
  const data = await fetchJson<{ h3_id: string; history: Array<{ date: string; p_event_7d: number; risk_band: string; expected_cost_usd: number }> }>(
    `${BASE_URL}/cell/${encodeURIComponent(h3Id)}/history${q}`
  );
  return {
    h3_id: data.h3_id,
    series: (data.history ?? []).map((h) => ({
      date: h.date,
      p_event: h.p_event_7d,
      cost_total_usd_mean: h.expected_cost_usd,
    })),
    recent_events: [],
    drivers_summary: [],
  };
}

/** Backend has no recommendation detail; return a stub. */
export async function fetchRecommendationDetail(
  recId: string,
  _params?: Record<string, string | number>
): Promise<RecommendationDetailResponse> {
  return {
    rec_id: recId,
    plan_params: { deltaP_psi: 5, window_local: "01:00-05:00" },
  };
}

function adaptRiskCollection(raw: RiskFeatureCollection): RiskFeatureCollection {
  const features = (raw.features ?? []).map((f) => ({
    ...f,
    properties: {
      ...f.properties,
      p_event: (f.properties as { p_event_7d?: number }).p_event_7d ?? (f.properties as { p_event?: number }).p_event ?? 0,
      risk_band: normalizeRiskBand((f.properties as { risk_band?: string }).risk_band),
      confidence: 1,
      drivers: (f.properties as { drivers?: unknown }).drivers ?? [],
    },
  }));
  return { type: "FeatureCollection", features };
}

function normalizeRiskBand(band?: string): "low" | "med" | "high" {
  if (band === "medium") return "med";
  if (band === "low" || band === "high") return band;
  return "low";
}

function adaptCostCollection(raw: CostFeatureCollection): CostFeatureCollection {
  const features = (raw.features ?? []).map((f) => ({
    ...f,
    properties: {
      ...f.properties,
      cost_total_usd_mean: (f.properties as { expected_cost_usd_7d?: number }).expected_cost_usd_7d ?? (f.properties as { cost_total_usd_mean?: number }).cost_total_usd_mean ?? 0,
      cost_total_usd_p90: (f.properties as { p90_cost?: number }).p90_cost ?? (f.properties as { cost_total_usd_p90?: number }).cost_total_usd_p90,
    },
  }));
  return { type: "FeatureCollection", features };
}

function adaptRecommendationsCollection(
  raw: RecommendationFeatureCollection
): RecommendationFeatureCollection {
  const features = (raw.features ?? []).map((f) => ({
    ...f,
    properties: {
      ...f.properties,
      expected_savings_usd_mean: (f.properties as { expected_savings_usd?: number }).expected_savings_usd ?? (f.properties as { expected_savings_usd_mean?: number }).expected_savings_usd_mean ?? 0,
      deltaP_psi: (f.properties as { delta_p_psi?: number }).delta_p_psi ?? (f.properties as { deltaP_psi?: number }).deltaP_psi,
      window_local: (f.properties as { time_window?: string }).time_window ?? (f.properties as { window_local?: string }).window_local,
      why: (f.properties as { rationale?: string }).rationale ? [(f.properties as { rationale: string }).rationale] : (f.properties as { why?: string[] }).why ?? [],
    },
  }));
  return { type: "FeatureCollection", features };
}
