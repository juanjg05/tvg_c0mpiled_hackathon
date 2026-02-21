import type { Map } from "leaflet";

export function getBbox(map: Map): string | undefined {
  const bounds = map.getBounds();
  if (!bounds.isValid()) return undefined;
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  return `${sw.lng},${sw.lat},${ne.lng},${ne.lat}`;
}

export function pEventToColor(p: number): string {
  if (p < 0.33) return "#22c55e";
  if (p < 0.66) return "#eab308";
  return "#ef4444";
}

export function costToColor(mean: number, maxQuantile = 100): string {
  const q = Math.min(mean / 500, 1);
  const r = Math.floor(255 * q);
  const g = Math.floor(255 * (1 - q));
  return `rgb(${r}, ${g}, 100)`;
}

export function formatPercent(p: number): string {
  return `${Math.round(p * 100)}%`;
}

export function formatDollars(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}
