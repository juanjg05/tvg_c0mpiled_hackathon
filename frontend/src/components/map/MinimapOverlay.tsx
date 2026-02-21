"use client";

import { useEffect } from "react";
import L from "leaflet";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MiniMap = require("leaflet-minimap");
import "leaflet-minimap/dist/Control.MiniMap.min.css";
import { useMap } from "react-leaflet";

const CHICAGO_CENTER: [number, number] = [41.8781, -87.6298];

export default function MinimapOverlay() {
  const map = useMap();

  useEffect(() => {
    const tileLayer = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      { attribution: "© CARTO" }
    );

    const miniMapControl = new MiniMap(tileLayer, {
      position: "bottomright",
      width: 140,
      height: 140,
      centerFixed: CHICAGO_CENTER,
      zoomLevelFixed: 10,
      toggleDisplay: false,
      aimingRectOptions: {
        color: "#22d3ee",
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.1,
      },
    });

    miniMapControl.addTo(map);

    return () => {
      map.removeControl(miniMapControl);
    };
  }, [map]);

  return null;
}
