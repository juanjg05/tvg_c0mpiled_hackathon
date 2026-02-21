"use client";

import { useMap } from "react-leaflet";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { LOCATIONS, type Location } from "@/data/locations";

interface LocationSelectorProps {
  onLocationChange?: (location: Location) => void;
}

export default function LocationSelector({ onLocationChange }: LocationSelectorProps) {
  const map = useMap();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("location") || "chicago";

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const loc = LOCATIONS.find((l) => l.id === id);
    if (loc && map) {
      map.setView([loc.lat, loc.lng], loc.zoom);
      const params = new URLSearchParams(searchParams.toString());
      params.set("location", id);
      router.push(`?${params.toString()}`, { scroll: false });
      onLocationChange?.(loc);
    }
  };

  return (
    <div className="absolute left-4 top-4 z-[1000]">
      <select
        onChange={handleChange}
        value={selectedId}
        className="rounded-lg border border-[#2d3748] bg-[#1e2630]/95 px-4 py-2 text-sm text-zinc-100 shadow-lg backdrop-blur-sm outline-none focus:ring-2 focus:ring-cyan-400"
      >
      {LOCATIONS.map((loc) => (
        <option key={loc.id} value={loc.id}>
          {loc.name}
        </option>
      ))}
      </select>
    </div>
  );
}
