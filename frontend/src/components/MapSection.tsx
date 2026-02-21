"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import FilterDashboard from "./FilterDashboard";

const WaterMap = dynamic(() => import("./map/WaterMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[400px] items-center justify-center bg-[#1a1f26] text-zinc-400">
      Loading map...
    </div>
  ),
});

export default function MapSection() {
  const searchParams = useSearchParams();
  const today = new Date().toISOString().split("T")[0];

  const locationId = searchParams.get("location") || "chicago";

  const filterState = {
    date: searchParams.get("date") || today,
    horizonDays: parseInt(searchParams.get("horizon_days") || "7", 10),
    layerRisk: searchParams.get("layer_risk") !== "false",
    layerCost: searchParams.get("layer_cost") === "true",
    layer311: searchParams.get("layer_311") !== "false",
    layerRecommendations: searchParams.get("layer_recommendations") !== "false",
    layerWeather: searchParams.get("layer_weather") === "true",
    minRisk: parseFloat(searchParams.get("min_risk") || "0") || 0,
    minConfidence: parseFloat(searchParams.get("min_confidence") || "0") || 0,
    minCostUsd: parseFloat(searchParams.get("min_cost_usd") || "0") || 0,
    costMode: searchParams.get("cost_mode") || "total",
    status: searchParams.get("status") || "all",
    types: searchParams.get("types") || "",
    lookbackDays: parseInt(searchParams.get("lookback_days") || "7", 10),
    actionType: searchParams.get("action_type") || "",
    minSavingsUsd: parseFloat(searchParams.get("min_savings_usd") || "0") || 0,
  };

  return (
    <section id="map-section" className="bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Summary Stats Bar */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="High Risk Zones"
            value={filterState.layerRisk ? "12" : "--"}
            sub="Based on 7-day forecast"
            trend="+2 since yesterday"
            color="text-rose-400"
          />
          <StatCard
            label="Infrastructure Cost"
            value={filterState.layerCost ? "$42.5k" : "--"}
            sub="Allocated energy/water"
            trend="-5% optimization"
            color="text-amber-400"
          />
          <StatCard
            label="Savings Opportunity"
            value={filterState.layerRecommendations ? "$8.2k" : "--"}
            sub="Ready for implementation"
            trend="Active recommendations"
            color="text-accent"
          />
        </div>

        <div className="flex flex-col gap-6 lg:flex-row h-[80vh] min-h-[700px]">
          <aside className="w-full shrink-0 overflow-y-auto rounded-2xl border border-surface/60 bg-gradient-to-b from-background-alt to-background lg:w-[300px]">
            <FilterDashboard />
          </aside>
          <div className="relative flex flex-1 flex-col">
            <div className="relative h-full min-h-[400px] rounded-2xl overflow-hidden shadow-2xl border border-surface/60">
              <WaterMap filterState={filterState} locationId={locationId} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, value, sub, trend, color }: { label: string; value: string; sub: string; trend: string; color: string }) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-surface/40 bg-background-alt/40 p-5 backdrop-blur-sm transition-all hover:bg-background-alt/60">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted">{label}</p>
        <p className={`mt-1 text-3xl font-bold tracking-tight ${color}`}>{value}</p>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-foreground-muted/70">{sub}</span>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface/50 ${color}/80`}>{trend}</span>
      </div>
    </div>
  );
}
