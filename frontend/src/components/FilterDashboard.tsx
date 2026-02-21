"use client";

import { useState } from "react";
import { useFilterParams } from "@/lib/useFilterParams";
import { useMeta } from "@/lib/useMeta";

export default function FilterDashboard() {
  const { get, set } = useFilterParams();
  const { meta } = useMeta();

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <div className="flex items-center justify-between border-b border-surface bg-accent px-6 py-4">
        <h2 className="text-xs font-black uppercase tracking-widest text-background">
          Control Panel
        </h2>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-background" />
          <span className="text-[10px] font-bold uppercase tracking-tighter text-background/80">
            System Active
          </span>
        </div>
      </div>

      <div className="industrial-scrollbar flex-1 overflow-y-auto p-4 space-y-4">
        <FilterSection 
          title="Analysis Parameters" 
          icon={
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        >
          <div className="space-y-4 rounded-xl border border-surface bg-background-alt/50 p-4">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-foreground-muted">
                  Resource Threshold
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={get("threshold") || "50"}
                  onChange={(e) => set({ threshold: e.target.value })}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-surface accent-accent"
                />
                <div className="mt-1 flex justify-between text-[10px] font-bold text-accent">
                  <span>MIN</span>
                  <span>{get("threshold") || "50"}%</span>
                  <span>MAX</span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-foreground-muted">
                  System Sentiment
                </label>
                <select
                  value={get("sentiment") || "all"}
                  onChange={(e) => set({ sentiment: e.target.value })}
                  className="w-full rounded-lg border border-surface bg-background px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="all">Full Spectrum</option>
                  <option value="positive">Optimal Operations</option>
                  <option value="negative">High Stress</option>
                  <option value="neutral">Normal Flow</option>
                </select>
              </div>
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
              checked={get("layer_cost") === "true"}
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
                checked={get("layer_weather") === "true"}
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
                <span>{(parseFloat(get("min_risk") || "0")).toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={parseFloat(get("min_risk") || "0")}
                onChange={(e) => set({ min_risk: e.target.value })}
                className="w-full h-1.5 rounded-lg bg-surface appearance-none cursor-pointer accent-accent"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                <span>Min Confidence</span>
                <span>{(parseFloat(get("min_confidence") || "0")).toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={parseFloat(get("min_confidence") || "0")}
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
              value={get("min_cost_usd") || ""}
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
  icon,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="group border-b border-surface/40 pb-4 last:border-0 hover:border-surface/80 transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-left focus:outline-none"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-accent">{icon}</span>}
          <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80 group-hover:text-accent transition-colors">
            {title}
          </h3>
        </div>
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
  const icons: Record<string, React.ReactNode> = {
    Risk: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    Cost: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    "311 Reports": (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9l-1.172-1.172a4 4 0 115.656-5.656l1.102-1.101m-8.658 4.054L10 17.657l-4.243-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    Advice: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    "Weather Overlay": (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
  };

  return (
    <label
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border p-3 transition-all duration-200 ${
        checked
          ? "border-accent/50 bg-accent/10 text-accent shadow-[0_0_20px_-5px_rgba(251,191,36,0.3)] ring-1 ring-accent/20"
          : "border-surface bg-background/50 text-foreground-muted hover:border-surface-hover hover:bg-surface/30"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="hidden"
      />
      <div className={`transition-transform duration-200 ${checked ? "scale-110" : "scale-100 opacity-70"}`}>
        {icons[label] || (
          <div className={`h-1.5 w-1.5 rounded-full ${checked ? "bg-accent shadow-[0_0_8px_rgba(34,211,238,1)]" : "bg-foreground-muted/30"}`} />
        )}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-tight text-center leading-none">{label}</span>
      {checked && (
        <div className="absolute top-1 right-1 h-1 w-1 rounded-full bg-accent animate-pulse" />
      )}
    </label>
  );
}
