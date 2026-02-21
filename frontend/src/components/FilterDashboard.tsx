import { useState } from "react";
import { useFilterParams } from "@/lib/useFilterParams";
import { useMeta } from "@/lib/useMeta";

export default function FilterDashboard() {
  const { get, set } = useFilterParams();
  const { meta } = useMeta();

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="flex flex-col gap-6 p-5">
      <div className="border-b border-surface pb-5">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Filters</h2>
        <p className="mt-1 text-xs text-foreground-muted">Analyze water infrastructure</p>
      </div>

      <div className="space-y-4">
        <FilterSection title="Time" defaultOpen={true}>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">Base Date</label>
              <input
                type="date"
                value={get("date") || today}
                onChange={(e) => set({ date: e.target.value })}
                className="w-full rounded-lg border border-surface bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">Forecast Horizon</label>
              <select
                value={get("horizon_days") || "7"}
                onChange={(e) => set({ horizon_days: e.target.value })}
                className="w-full rounded-lg border border-surface bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-all"
              >
                <option value="1">1 day</option>
                <option value="7">7 days</option>
              </select>
            </div>
          </div>
        </FilterSection>

        <FilterSection title="Layers" defaultOpen={true}>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <LayerToggle
              label="Risk"
              checked={get("layer_risk") !== "false"}
              onChange={(v) => set({ layer_risk: v ? "true" : "false" })}
            />
            <LayerToggle
              label="Cost"
              checked={get("layer_cost") !== "false"}
              onChange={(v) => set({ layer_cost: v ? "true" : "false" })}
            />
            <LayerToggle
              label="311 Reports"
              checked={get("layer_311") !== "false"}
              onChange={(v) => set({ layer_311: v ? "true" : "false" })}
            />
            <LayerToggle
              label="Advice"
              checked={get("layer_recommendations") !== "false"}
              onChange={(v) => set({ layer_recommendations: v ? "true" : "false" })}
            />
            <div className="col-span-2">
              <LayerToggle
                label="Weather Overlay"
                checked={get("layer_weather") !== "false"}
                onChange={(v) => set({ layer_weather: v ? "true" : "false" })}
              />
            </div>
          </div>
        </FilterSection>

        <FilterSection title="Thresholds">
          <div className="space-y-4 pt-1">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                <span>Min Risk</span>
                <span>{(parseFloat(get("min_risk")) || 0).toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={parseFloat(get("min_risk")) || 0}
                onChange={(e) => set({ min_risk: e.target.value })}
                className="w-full h-1.5 rounded-lg bg-surface appearance-none cursor-pointer accent-accent"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                <span>Min Confidence</span>
                <span>{(parseFloat(get("min_confidence")) || 0).toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={parseFloat(get("min_confidence")) || 0}
                onChange={(e) => set({ min_confidence: e.target.value })}
                className="w-full h-1.5 rounded-lg bg-surface appearance-none cursor-pointer accent-accent"
              />
            </div>
          </div>
        </FilterSection>

        <FilterSection title="Analysis">
          <div className="space-y-3 pt-1">
            <input
              type="number"
              placeholder="Min cost ($)"
              value={get("min_cost_usd")}
              onChange={(e) => set({ min_cost_usd: e.target.value })}
              className="w-full rounded-lg border border-surface bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-all placeholder:text-foreground-muted/50"
            />
            <select
              value={get("cost_mode") || "total"}
              onChange={(e) => set({ cost_mode: e.target.value })}
              className="w-full rounded-lg border border-surface bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-all"
            >
              <option value="total">All Costs</option>
              <option value="energy">Energy only</option>
              <option value="water">Water only</option>
            </select>
          </div>
        </FilterSection>
      </div>
    </div>
  );
}

function FilterSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="group border-b border-surface/40 pb-4 last:border-0 hover:border-surface/80 transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-left focus:outline-none"
      >
        <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80 group-hover:text-accent transition-colors">
          {title}
        </h3>
        <svg
          className={`h-4 w-4 text-foreground-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "mt-4 max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function LayerToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border p-3 transition-all ${
        checked
          ? "border-accent/40 bg-accent/5 text-accent shadow-[0_0_15px_-5px_rgba(34,211,238,0.2)]"
          : "border-surface bg-background/50 text-foreground-muted hover:border-surface-hover hover:bg-surface/20"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="hidden"
      />
      <div className={`h-1.5 w-1.5 rounded-full ${checked ? "bg-accent shadow-[0_0_8px_rgba(34,211,238,1)]" : "bg-foreground-muted/30"}`} />
      <span className="text-[10px] font-bold uppercase tracking-tighter text-center leading-none">{label}</span>
    </label>
  );
}
