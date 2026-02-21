"use client";

import { useEffect, useState } from "react";
import { Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { useMap, useMapEvents } from "react-leaflet";
import { fetchEvents } from "@/lib/api";
import { getBbox } from "@/lib/mapUtils";
import type { EventFeatureCollection } from "@/types/api";

interface EventsLayerProps {
  date: string;
  status: string;
  types: string;
  lookbackDays: number;
}

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function EventsLayer({
  date,
  status,
  types,
  lookbackDays,
}: EventsLayerProps) {
  const map = useMap();
  const [data, setData] = useState<EventFeatureCollection | null>(null);
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

    const endDate = new Date(date);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - lookbackDays);

    fetchEvents({
      bbox,
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
      lookback_days: lookbackDays,
      status: status === "all" ? undefined : (status as "open" | "closed"),
      types: types || undefined,
    })
      .then(setData)
      .catch(() => setData(null));
  }, [bbox, date, status, types, lookbackDays]);

  if (!data?.features?.length) return null;

  return (
    <MarkerClusterGroup>
      {data.features.map((feature, i) => {
        const coords = feature.geometry.coordinates;
        const [lng, lat] = coords;
        const props = feature.properties;
        return (
          <Marker key={props?.sr_number || i} position={[lat, lng]} icon={defaultIcon}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{props?.sr_number}</p>
                <p>{props?.type}</p>
                <p>{props?.status}</p>
                <p>{props?.created_date}</p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MarkerClusterGroup>
  );
}
