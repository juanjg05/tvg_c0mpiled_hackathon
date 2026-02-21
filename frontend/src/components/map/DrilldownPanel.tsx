"use client";

import { useEffect, useState } from "react";
import { fetchCellDetail, fetchRecommendationDetail } from "@/lib/api";
import { formatPercent } from "@/lib/mapUtils";
import type { CellDetailResponse, RecommendationDetailResponse } from "@/types/api";

interface DrilldownPanelProps {
  h3Id: string | null;
  recId: string | null;
  onClose: () => void;
}

export default function DrilldownPanel({
  h3Id,
  recId,
  onClose,
}: DrilldownPanelProps) {
  const [cellData, setCellData] = useState<CellDetailResponse | null>(null);
  const [recData, setRecData] = useState<RecommendationDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setCellData(null);
    setRecData(null);

    if (h3Id && process.env.NEXT_PUBLIC_API_URL) {
      fetchCellDetail(h3Id, { lookback_days: 14 })
        .then(setCellData)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    } else if (recId && process.env.NEXT_PUBLIC_API_URL) {
      fetchRecommendationDetail(recId)
        .then(setRecData)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [h3Id, recId]);

  if (!h3Id && !recId) return null;

  return (
    <div className="absolute bottom-4 right-4 z-[1000] max-h-[300px] w-80 overflow-y-auto rounded-lg border border-[#1e2630] bg-[#1e2630] p-4 shadow-xl">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-zinc-100">
          {h3Id ? `Cell ${h3Id.slice(-4)}` : recId ? `Recommendation ${recId}` : "Details"}
        </h3>
        <button
          onClick={onClose}
          className="rounded p-1 text-zinc-400 hover:bg-[#0f1419] hover:text-zinc-100"
        >
          ×
        </button>
      </div>

      {loading && <p className="text-sm text-zinc-400">Loading...</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {!process.env.NEXT_PUBLIC_API_URL && !loading && (
        <p className="text-sm text-zinc-400">
          Connect a backend to view details. Set NEXT_PUBLIC_API_URL in .env.local.
        </p>
      )}

      {cellData && !loading && (
        <div className="space-y-2 text-sm">
          {cellData.drivers_summary?.length > 0 && (
            <div>
              <p className="text-xs text-zinc-400">Top drivers</p>
              <p className="text-zinc-200">{cellData.drivers_summary.join(", ")}</p>
            </div>
          )}
          {cellData.recent_events?.length > 0 && (
            <div>
              <p className="text-xs text-zinc-400">Recent events</p>
              <ul className="list-disc pl-4 text-zinc-200">
                {cellData.recent_events.slice(0, 3).map((e) => (
                  <li key={e.sr_number}>
                    {e.type} — {e.status}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {cellData.series?.length > 0 && (
            <div>
              <p className="text-xs text-zinc-400">Latest risk</p>
              <p className="text-zinc-200">
                {formatPercent(cellData.series[cellData.series.length - 1]?.p_event ?? 0)}
              </p>
            </div>
          )}
        </div>
      )}

      {recData && !loading && (
        <div className="space-y-2 text-sm">
          {recData.plan_params?.window_local && (
            <div>
              <p className="text-xs text-zinc-400">Window</p>
              <p className="text-zinc-200">{recData.plan_params.window_local}</p>
            </div>
          )}
          {(recData.linked_events?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs text-zinc-400">Linked events</p>
              <ul className="list-disc pl-4 text-zinc-200">
                {(recData.linked_events ?? []).slice(0, 3).map((e) => (
                  <li key={e.sr_number}>
                    {e.type} — {e.status}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
