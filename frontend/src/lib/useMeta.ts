"use client";

import { useEffect, useState } from "react";
import { fetchMeta } from "./api";
import type { MetaResponse } from "@/types/api";

export function useMeta() {
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_API_URL) {
      setLoading(false);
      return;
    }
    fetchMeta()
      .then(setMeta)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { meta, loading, error };
}
