"use client";

import { useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import LocationSelector from "../LocationSelector";
import SpaceToPanHandler from "./SpaceToPanHandler";
import HexGridLayer from "./HexGridLayer";
import EventsLayer from "./EventsLayer";
import RecommendationsLayer from "./RecommendationsLayer";
import DrilldownPanel from "./DrilldownPanel";
import { LOCATIONS } from "@/data/locations";
import MapBoundsHandler from "./MapBoundsHandler";
import MinimapOverlay from "./MinimapOverlay";

const defaultCenter = LOCATIONS[0];
const defaultZoom = defaultCenter.zoom;

export interface FilterState {
  date: string;
  horizonDays: number;
  layerRisk: boolean;
  layerCost: boolean;
  layer311: boolean;
  layerRecommendations: boolean;
  layerWeather: boolean;
  minRisk: number;
  minConfidence: number;
  minCostUsd: number;
  costMode: string;
  status: string;
  types: string;
  lookbackDays: number;
  actionType: string;
  minSavingsUsd: number;
}

export default function WaterMap({
  filterState,
  locationId = "chicago",
}: {
  filterState: FilterState;
  locationId?: string;
}) {
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [selectedCellLocation, setSelectedCellLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedRecId, setSelectedRecId] = useState<string | null>(null);
  const isChicago = locationId === "chicago";
  const loc = LOCATIONS.find((l) => l.id === locationId) ?? defaultCenter;

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[loc.lat, loc.lng]}
        zoom={loc.zoom}
        minZoom={loc.zoom - 1}
        maxZoom={loc.zoom + 3}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png"
        />
        <SpaceToPanHandler />
        <LocationSelector />
        <MapBoundsHandler 
          bounds={loc.bounds} 
          minZoom={loc.zoom - 1}
          maxZoom={loc.zoom + 3}
        />
        {isChicago && <MinimapOverlay />}
        {(filterState.layerRisk || filterState.layerCost) && (
          <HexGridLayer
            date={filterState.date}
            horizonDays={filterState.horizonDays}
            layerRisk={filterState.layerRisk}
            layerCost={filterState.layerCost}
            minRisk={filterState.minRisk}
            minConfidence={filterState.minConfidence}
            minCostUsd={filterState.minCostUsd}
            costMode={filterState.costMode}
            onCellClick={(h3Id, coords) => {
              setSelectedCell(h3Id);
              setSelectedCellLocation(coords ?? null);
            }}
          />
        )}
        {filterState.layer311 && (
          <EventsLayer
            date={filterState.date}
            status={filterState.status}
            types={filterState.types}
            lookbackDays={filterState.lookbackDays}
          />
        )}
        {filterState.layerRecommendations && (
          <RecommendationsLayer
            date={filterState.date}
            actionType={filterState.actionType}
            minSavingsUsd={filterState.minSavingsUsd}
            onRecommendationClick={setSelectedRecId}
          />
        )}
      </MapContainer>
      <div className="absolute bottom-4 left-4 z-[1000] rounded bg-[#1e2630]/90 px-2 py-1 text-xs text-zinc-400">
        Hold Space to pan
      </div>
      {(selectedCell || selectedRecId) && (
        <DrilldownPanel
          h3Id={selectedCell}
          cellLocation={selectedCellLocation}
          recId={selectedRecId}
          onClose={() => {
            setSelectedCell(null);
            setSelectedCellLocation(null);
            setSelectedRecId(null);
          }}
        />
      )}
    </div>
  );
}
