import type { Feature, FeatureCollection, Point, Polygon } from "geojson";

export interface MetaResponse {
  city: string;
  grid: { h3_resolution: number };
  date_min: string;
  date_max: string;
  horizons_days: number[];
  last_refresh_utc: string;
  risk_model_version: string;
  pricing_model_version: string;
  recommendation_version: string;
  leak_311_types: string[];
  recommendation_action_types: string[];
}

export interface RiskFeatureProperties {
  h3_id: string;
  p_event: number;
  risk_band: "low" | "med" | "high";
  confidence: number;
  drivers?: string[];
  expected_events?: number;
}

export interface CostFeatureProperties {
  h3_id: string;
  cost_total_usd_mean: number;
  cost_total_usd_p90?: number;
  cost_energy_usd_mean?: number;
  cost_water_usd_mean?: number;
  cost_quantile?: number;
  leak_volume_m3_mean?: number;
}

export interface EventFeatureProperties {
  sr_number: string;
  created_date: string;
  status: string;
  type: string;
  summary?: string;
}

export interface RecommendationFeatureProperties {
  rec_id: string;
  action_type: string;
  deltaP_psi?: number;
  window_local?: string;
  expected_savings_usd_mean: number;
  expected_savings_usd_p90?: number;
  why?: string[];
}

export interface GridFeatureProperties {
  h3_id: string;
}

export type RiskFeature = Feature<Polygon, RiskFeatureProperties>;
export type CostFeature = Feature<Polygon, CostFeatureProperties>;
export type EventFeature = Feature<Point, EventFeatureProperties>;
export type RecommendationFeature = Feature<Polygon, RecommendationFeatureProperties>;
export type GridFeature = Feature<Polygon, GridFeatureProperties>;

export type RiskFeatureCollection = FeatureCollection<Polygon, RiskFeatureProperties>;
export type CostFeatureCollection = FeatureCollection<Polygon, CostFeatureProperties>;
export type EventFeatureCollection = FeatureCollection<Point, EventFeatureProperties>;
export type RecommendationFeatureCollection = FeatureCollection<
  Polygon,
  RecommendationFeatureProperties
>;
export type GridFeatureCollection = FeatureCollection<Polygon, GridFeatureProperties>;

export interface SeriesPoint {
  date: string;
  p_event?: number;
  cost_total_usd_mean?: number;
  events?: number;
}

export interface WeatherPoint {
  date: string;
  tmin_c?: number;
  freeze?: number;
  precip_mm?: number;
}

export interface RecentEvent {
  sr_number: string;
  created_date: string;
  type: string;
  status: string;
}

export interface CellDetailResponse {
  h3_id: string;
  series: SeriesPoint[];
  weather?: WeatherPoint[];
  recent_events: RecentEvent[];
  drivers_summary: string[];
}

export interface RecommendationDetailResponse {
  rec_id: string;
  member_hex_ids?: string[];
  savings_breakdown?: Record<string, number>;
  linked_events?: RecentEvent[];
  plan_params?: {
    deltaP_psi?: number;
    window_local?: string;
  };
}

export interface LayerParams {
  bbox?: string;
  date?: string;
  start_date?: string;
  end_date?: string;
  horizon_days?: number;
  min_risk?: number;
  min_confidence?: number;
  min_cost_usd?: number;
  cost_mode?: "total" | "energy" | "water";
  status?: "open" | "closed" | "all";
  types?: string;
  lookback_days?: number;
  action_type?: string;
  min_savings_usd?: number;
  simplify?: boolean;
}
