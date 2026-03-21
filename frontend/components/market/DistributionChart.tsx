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

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        Distribution des variations
      </p>
      <ResponsiveContainer width="100%" height={90}>
        <BarChart data={data} barCategoryGap="18%" margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: "hsl(215 20% 45%)", fontSize: 8, fontFamily: "var(--font-geist-mono)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis domain={[0, max + 1]} hide />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(222 47% 18%)" }} />
          <Bar dataKey="count" radius={[2, 2, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
