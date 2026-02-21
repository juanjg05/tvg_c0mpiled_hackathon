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

/** Format lat/lng as human-readable location (e.g. "41.878°N, 87.630°W"). */
export function formatLatLng(lat: number, lng: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(3)}°${ns}, ${Math.abs(lng).toFixed(3)}°${ew}`;
}

/** Centroid of a GeoJSON Polygon or MultiPolygon (first ring only). Returns [lat, lng]. */
export function getCentroidFromPolygon(geom: {
  type: string;
  coordinates: number[][][] | number[][][][];
}): [number, number] | null {
  const ring: number[][] =
    geom.type === "Polygon"
      ? (geom.coordinates as number[][][])[0]
      : (geom.coordinates as number[][][][])[0]?.[0];
  if (!ring?.length) return null;
  let sumLat = 0,
    sumLng = 0;
  for (const [lng, lat] of ring) {
    sumLat += lat;
    sumLng += lng;
  }
  return [sumLat / ring.length, sumLng / ring.length];
}
