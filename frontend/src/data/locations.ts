export interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  zoom: number;
  bounds?: [[number, number], [number, number]];
}

export const CHICAGO_BOUNDS: [[number, number], [number, number]] = [
  [41.6445, -87.9401],
  [42.0231, -87.5238],
];

export const LOCATIONS: Location[] = [
  {
    id: "chicago",
    name: "Chicago",
    lat: 41.8781,
    lng: -87.6298,
    zoom: 11,
    bounds: CHICAGO_BOUNDS,
  },
  { id: "nyc", name: "New York City", lat: 40.7128, lng: -74.006, zoom: 11 },
  { id: "la", name: "Los Angeles", lat: 34.0522, lng: -118.2437, zoom: 11 },
  { id: "houston", name: "Houston", lat: 29.7604, lng: -95.3698, zoom: 11 },
  { id: "phoenix", name: "Phoenix", lat: 33.4484, lng: -112.074, zoom: 11 },
  { id: "philadelphia", name: "Philadelphia", lat: 39.9526, lng: -75.1652, zoom: 11 },
  { id: "san-antonio", name: "San Antonio", lat: 29.4241, lng: -98.4936, zoom: 11 },
  { id: "san-diego", name: "San Diego", lat: 32.7157, lng: -117.1611, zoom: 11 },
  { id: "dallas", name: "Dallas", lat: 32.7767, lng: -96.797, zoom: 11 },
  { id: "san-jose", name: "San Jose", lat: 37.3382, lng: -121.8863, zoom: 11 },
];
