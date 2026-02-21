"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";

export default function SpaceToPanHandler() {
  const map = useMap();

  useEffect(() => {
    map.dragging.disable();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        map.dragging.enable();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        map.dragging.disable();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      map.dragging.disable();
    };
  }, [map]);

  return null;
}
