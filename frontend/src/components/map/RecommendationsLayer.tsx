"use client";

import { useEffect, useState } from "react";
import { GeoJSON, useMap, useMapEvents } from "react-leaflet";
import type { Feature, Polygon } from "geojson";
import { fetchRecommendations } from "@/lib/api";
import { getBbox } from "@/lib/mapUtils";
import type { RecommendationFeatureCollection } from "@/types/api";

interface RecommendationsLayerProps {
  date: string;
  actionType: string;
  minSavingsUsd: number;
  onRecommendationClick?: (recId: string) => void;
}

export default function RecommendationsLayer({
  date,
  actionType,
  minSavingsUsd,
  onRecommendationClick,
}: RecommendationsLayerProps) {
  const map = useMap();
  const [data, setData] = useState<RecommendationFeatureCollection | null>(null);
  const [bbox, setBbox] = useState<string | undefined>();

  useMapEvents({
    moveend: () => setBbox(getBbox(map)),
  });

  useEffect(() => {
    const b = getBbox(map);
    if (b) setBbox(b);
  }, [map]);

  useEffect(() => {
    if (!bbox || !process.env.NEXT_PUBLIC_API_URL) return;

    fetchRecommendations({
      bbox,
      date,
      action_type: actionType || undefined,
      min_savings_usd: minSavingsUsd || undefined,
    })
      .then(setData)
      .catch(() => setData(null));
  }, [bbox, date, actionType, minSavingsUsd]);

  const styleFeature = () => ({
    fillColor: "#06b6d4",
    fillOpacity: 0.4,
    color: "#22d3ee",
    weight: 2,
  });

  const onEachFeature = (
    feature: Feature<Polygon, Record<string, unknown>>,
    layer: L.Layer
  ) => {
    const recId = feature?.properties?.rec_id as string | undefined;
    if (recId && onRecommendationClick) {
      layer.on("click", () => onRecommendationClick(recId));
    }
  };

  if (!data?.features?.length) return null;

  return (
    <GeoJSON
      data={data}
      style={styleFeature}
      onEachFeature={onEachFeature}
    />
  );
}
