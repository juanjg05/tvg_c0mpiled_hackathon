"use client";

import { useEffect } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import { CHICAGO_BOUNDS } from "@/data/locations";

export default function MapBoundsHandler({ isChicago }: { isChicago: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (isChicago) {
      map.setMaxBounds(CHICAGO_BOUNDS);
      (map.options as Record<string, unknown>).maxBoundsViscosity = 1;
    } else {
      (map.options as Record<string, unknown>).maxBoundsViscosity = 0;
      map.setMaxBounds([
        [-90, -180],
        [90, 180],
      ] as L.LatLngBoundsExpression);
    }
  }, [map, isChicago]);

  return null;
}
