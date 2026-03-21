"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { StockQuote } from "@/types/brvm";

const BUCKETS = [
  { label: "< -5%", min: -Infinity, max: -5,       color: "#ef4444" },
  { label: "-5/-2", min: -5,        max: -2,        color: "#f87171" },
  { label: "-2/0",  min: -2,        max: 0,         color: "#fbbf24" },
  { label: "0/+2",  min: 0,         max: 2,         color: "#6ee7b7" },
  { label: "+2/+5", min: 2,         max: 5,         color: "#34d399" },
  { label: "> +5%", min: 5,         max: Infinity,  color: "#10b981" },
];

interface DistributionChartProps {
  stocks: StockQuote[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-2 py-1.5 text-xs shadow-md">
      <span className="font-mono font-semibold">{payload[0].payload.label}</span>
      <span className="ml-2 text-muted-foreground">
        {payload[0].value} valeur{payload[0].value > 1 ? "s" : ""}
      </span>
    </div>
  );
}

export function DistributionChart({ stocks }: DistributionChartProps) {
  const data = BUCKETS.map((b) => ({
    label: b.label,
    count: stocks.filter(
      (s) => s.variation_pct > b.min && s.variation_pct <= b.max
    ).length,
    color: b.color,
  }));

  const max = Math.max(...data.map((d) => d.count), 1);

  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Distribution des variations
        </p>
        <p className="text-[10px] text-muted-foreground font-mono">{total} valeurs</p>
      </div>
      <ResponsiveContainer width="100%" height={80}>
        <BarChart data={data} barCategoryGap="20%" margin={{ top: 2, right: 0, left: -24, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: "hsl(215 20% 40%)", fontSize: 8, fontFamily: "monospace" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis domain={[0, max + 2]} hide />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} fillOpacity={d.count === 0 ? 0.2 : 0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {/* Mini count row */}
      <div className="grid grid-cols-6 gap-0.5">
        {data.map((d) => (
          <div key={d.label} className="text-center">
            <span
              className="text-[10px] font-mono font-bold tabular-nums"
              style={{ color: d.count > 0 ? d.color : "hsl(215 20% 35%)" }}
            >
              {d.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
