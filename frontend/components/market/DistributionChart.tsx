"use client";

import type { StockQuote } from "@/types/brvm";

const BUCKETS = [
  { label: "< -5%",  min: -Infinity, max: -5,       color: "#ef4444" },
  { label: "-5/-2",  min: -5,        max: -2,        color: "#f87171" },
  { label: "-2/0",   min: -2,        max: 0,         color: "#fbbf24" },
  { label: "0/+2",   min: 0,         max: 2,         color: "#86efac" },
  { label: "+2/+5",  min: 2,         max: 5,         color: "#34d399" },
  { label: "> +5%",  min: 5,         max: Infinity,  color: "#10b981" },
];

const BAR_MAX_H = 48; // px

interface DistributionChartProps {
  stocks: StockQuote[];
}

export function DistributionChart({ stocks }: DistributionChartProps) {
  const data = BUCKETS.map((b) => ({
    label: b.label,
    color: b.color,
    count: stocks.filter(
      (s) => s.variation_pct > b.min && s.variation_pct <= b.max
    ).length,
  }));

  const max = Math.max(...data.map((d) => d.count), 1);
  const total = stocks.length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Distribution des variations
        </span>
        <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
          {total} valeurs
        </span>
      </div>

      {/* Bars */}
      <div className="flex items-end justify-between gap-1" style={{ height: BAR_MAX_H + 20 }}>
        {data.map((d) => {
          const barH = d.count > 0 ? Math.max(4, Math.round((d.count / max) * BAR_MAX_H)) : 2;
          const opacity = d.count > 0 ? 1 : 0.18;
          return (
            <div
              key={d.label}
              className="flex flex-col items-center gap-1 flex-1 min-w-0"
            >
              {/* Count above bar */}
              <span
                className="text-[10px] font-mono font-semibold tabular-nums leading-none"
                style={{ color: d.count > 0 ? d.color : "rgba(255,255,255,0.2)" }}
              >
                {d.count}
              </span>
              {/* Bar */}
              <div
                className="w-full rounded-t-[3px]"
                style={{
                  height: barH,
                  background: d.color,
                  opacity,
                  minHeight: d.count === 0 ? 2 : undefined,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Labels row */}
      <div className="flex justify-between gap-1">
        {data.map((d) => (
          <div key={d.label} className="flex-1 min-w-0 text-center">
            <span
              className="text-[8.5px] font-mono leading-none tabular-nums"
              style={{ color: d.count > 0 ? d.color : "rgba(255,255,255,0.2)" }}
            >
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
