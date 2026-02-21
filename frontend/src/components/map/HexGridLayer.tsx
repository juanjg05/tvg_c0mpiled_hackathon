"use client";

import { useEffect, useState } from "react";
import { GeoJSON, useMap, useMapEvents } from "react-leaflet";
import type { Feature, Polygon } from "geojson";
import { fetchRisk, fetchCost } from "@/lib/api";
import { getBbox, pEventToColor, costToColor } from "@/lib/mapUtils";
import type { RiskFeatureCollection, CostFeatureCollection } from "@/types/api";

interface HexGridLayerProps {
  date: string;
  horizonDays: number;
  layerRisk: boolean;
  layerCost: boolean;
  minRisk: number;
  minConfidence: number;
  minCostUsd: number;
  costMode: string;
  onCellClick?: (h3Id: string) => void;
}

export default function HexGridLayer({
  date,
  horizonDays,
  layerRisk,
  layerCost,
  minRisk,
  minConfidence,
  minCostUsd,
  costMode,
  onCellClick,
}: HexGridLayerProps) {
  const map = useMap();
  const [riskData, setRiskData] = useState<RiskFeatureCollection | null>(null);
  const [costData, setCostData] = useState<CostFeatureCollection | null>(null);
  const [bbox, setBbox] = useState<string | undefined>();

  useEffect(() => {
    const b = getBbox(map);
    if (b) setBbox(b);
  }, [map]);

  useMapEvents({
    moveend: () => setBbox(getBbox(map)),
  });

  useEffect(() => {
    if (!bbox || !process.env.NEXT_PUBLIC_API_URL) return;

    if (layerRisk) {
      fetchRisk({
        bbox,
        date,
        horizon_days: horizonDays,
        min_risk: minRisk || undefined,
        min_confidence: minConfidence || undefined,
      })
        .then(setRiskData)
        .catch(() => setRiskData(null));
    } else {
      setRiskData(null);
    }
  }, [bbox, date, horizonDays, layerRisk, minRisk, minConfidence]);

  useEffect(() => {
    if (!bbox || !process.env.NEXT_PUBLIC_API_URL) return;

    if (layerCost) {
      fetchCost({
        bbox,
        date,
        horizon_days: horizonDays,
        min_cost_usd: minCostUsd || undefined,
        cost_mode: (costMode as "total" | "energy" | "water") || "total",
      })
        .then(setCostData)
        .catch(() => setCostData(null));
    } else {
      setCostData(null);
    }
  }, [bbox, date, horizonDays, layerCost, minCostUsd, costMode]);

  const styleFeature = (feature?: { properties?: Record<string, unknown> }) => {
    if (!feature?.properties) return {};
    const props = feature.properties;
    if (layerRisk && "p_event" in props) {
      const p = props.p_event as number;
      const conf = (props.confidence as number) ?? 1;
      return {
        fillColor: pEventToColor(p),
        fillOpacity: 0.5 * conf,
        color: "#334155",
        weight: 1,
      };
    }
    if (layerCost && "cost_total_usd_mean" in props) {
      const mean = props.cost_total_usd_mean as number;
      return {
        fillColor: costToColor(mean),
        fillOpacity: 0.5,
        color: "#334155",
        weight: 1,
      };
    }
    return { fillOpacity: 0, weight: 0 };
  };

  const onEachFeature = (
    feature: Feature<Polygon, Record<string, unknown>>,
    layer: L.Layer
  ) => {
    const h3Id = feature?.properties?.h3_id as string | undefined;
    if (h3Id && onCellClick) {
      layer.on("click", () => onCellClick(h3Id));
    }
  };

  const data = layerRisk ? riskData : layerCost ? costData : null;

  if (!data?.features?.length) return null;

  return (
    <GeoJSON
      data={data}
      style={(feature) => styleFeature(feature)}
      onEachFeature={onEachFeature}
    />
  );
}
