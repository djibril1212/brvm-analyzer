"use client";

import { Bar, BarChart, Cell, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { StockQuote } from "@/types/brvm";

const BUCKETS = [
  { label: "< -5%", min: -Infinity, max: -5,       color: "#ef4444" },
  { label: "-5/-2", min: -5,        max: -2,        color: "#f87171" },
  { label: "-2/0",  min: -2,        max: 0,         color: "#fbbf24" },
  { label: "0/+2",  min: 0,         max: 2,         color: "#86efac" },
  { label: "+2/+5", min: 2,         max: 5,         color: "#34d399" },
  { label: "> +5%", min: 5,         max: Infinity,  color: "#10b981" },
];

const chartConfig = {
  count: { label: "Valeurs" },
} satisfies ChartConfig;

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

  const total = stocks.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Distribution des variations
        </span>
        <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
          {total} valeurs
        </span>
      </div>

      <ChartContainer config={chartConfig} className="h-[80px] w-full">
        <BarChart
          data={data}
          barCategoryGap="15%"
          margin={{ top: 8, right: 0, left: 0, bottom: 0 }}
        >
          <XAxis
            dataKey="label"
            tick={{
              fill: "hsl(220 12% 48%)",
              fontSize: 8,
              fontFamily: "monospace",
            }}
            axisLine={false}
            tickLine={false}
          />
          <ChartTooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={
              <ChartTooltipContent
                nameKey="count"
                formatter={(value) => [
                  `${value} valeur${Number(value) > 1 ? "s" : ""}`,
                  "",
                ]}
              />
            }
          />
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.color}
                fillOpacity={d.count === 0 ? 0.18 : 0.9}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>

      {/* Count row */}
      <div className="grid grid-cols-6 gap-0.5">
        {data.map((d) => (
          <div key={d.label} className="text-center">
            <span
              className="text-[10px] font-mono font-bold tabular-nums"
              style={{ color: d.count > 0 ? d.color : "rgba(255,255,255,0.2)" }}
            >
              {d.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
