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

export async function fetchMeta(): Promise<MetaResponse> {
  return fetchJson<MetaResponse>(`${BASE_URL}/meta`);
}

export async function fetchGrid(params: LayerParams): Promise<GridFeatureCollection> {
  const q = buildQuery(params as Record<string, string | number | boolean | undefined>);
  return fetchJson<GridFeatureCollection>(`${BASE_URL}/layers/grid${q}`);
}

export async function fetchRisk(params: LayerParams): Promise<RiskFeatureCollection> {
  const q = buildQuery(params as Record<string, string | number | boolean | undefined>);
  return fetchJson<RiskFeatureCollection>(`${BASE_URL}/layers/risk${q}`);
}

export async function fetchCost(params: LayerParams): Promise<CostFeatureCollection> {
  const q = buildQuery(params as Record<string, string | number | boolean | undefined>);
  return fetchJson<CostFeatureCollection>(`${BASE_URL}/layers/cost${q}`);
}

export async function fetchEvents(params: LayerParams): Promise<EventFeatureCollection> {
  const q = buildQuery(params as Record<string, string | number | boolean | undefined>);
  return fetchJson<EventFeatureCollection>(`${BASE_URL}/layers/events${q}`);
}

export async function fetchRecommendations(
  params: LayerParams
): Promise<RecommendationFeatureCollection> {
  const q = buildQuery(params as Record<string, string | number | boolean | undefined>);
  return fetchJson<RecommendationFeatureCollection>(`${BASE_URL}/layers/recommendations${q}`);
}

export async function fetchCellDetail(
  h3Id: string,
  params: { end_date?: string; lookback_days?: number; horizon_days?: number }
): Promise<CellDetailResponse> {
  const q = buildQuery(params as Record<string, string | number | boolean | undefined>);
  return fetchJson<CellDetailResponse>(`${BASE_URL}/detail/cell/${encodeURIComponent(h3Id)}${q}`);
}

export async function fetchRecommendationDetail(
  recId: string,
  params?: Record<string, string | number>
): Promise<RecommendationDetailResponse> {
  const q = params ? buildQuery(params) : "";
  return fetchJson<RecommendationDetailResponse>(
    `${BASE_URL}/detail/recommendation/${encodeURIComponent(recId)}${q}`
  );
}
