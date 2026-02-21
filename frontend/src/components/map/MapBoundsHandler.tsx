"use client";

import { useEffect } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";

export default function MapBoundsHandler({ 
  bounds,
  minZoom = 10,
  maxZoom = 14
}: { 
  bounds?: [[number, number], [number, number]],
  minZoom?: number,
  maxZoom?: number
}) {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      map.setMaxBounds(bounds);
      (map.options as Record<string, unknown>).maxBoundsViscosity = 1.0;
    } else {
      map.setMaxBounds([
        [-90, -180],
        [90, 180],
      ] as L.LatLngBoundsExpression);
      (map.options as Record<string, unknown>).maxBoundsViscosity = 0.0;
    }

    map.setMinZoom(minZoom);
    map.setMaxZoom(maxZoom);
  }, [map, bounds, minZoom, maxZoom]);

  return null;
}
