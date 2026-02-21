"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const FILTER_KEYS = [
  "date",
  "start_date",
  "end_date",
  "horizon_days",
  "min_risk",
  "min_confidence",
  "min_cost_usd",
  "cost_mode",
  "status",
  "types",
  "lookback_days",
  "keyword",
  "action_type",
  "min_savings_usd",
  "safe_window_only",
  "layer_risk",
  "layer_cost",
  "layer_311",
  "layer_recommendations",
  "layer_weather",
] as const;

export type FilterParams = Partial<Record<(typeof FILTER_KEYS)[number], string>>;

export function useFilterParams() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const get = useCallback(
    (key: string) => searchParams.get(key) ?? "",
    [searchParams]
  );

  const set = useCallback(
    (updates: FilterParams) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === "" || value === undefined || value === null) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  return { get, set };
}
