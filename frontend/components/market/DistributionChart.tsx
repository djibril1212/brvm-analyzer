"use client";

import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { StockQuote } from "@/types/brvm";

const BUCKETS = [
  { label: "< -5%", min: -Infinity, max: -5,      color: "#dc2626" },
  { label: "-5/-2", min: -5,        max: -2,       color: "#f87171" },
  { label: "-2/0",  min: -2,        max: 0,        color: "#fb923c" },
  { label: "0/+2",  min: 0,         max: 2,        color: "#86efac" },
  { label: "+2/+5", min: 2,         max: 5,        color: "#34d399" },
  { label: "> +5%", min: 5,         max: Infinity, color: "#16a34a" },
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
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">
          Distribution des variations
        </span>
        <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
          {total} valeurs
        </span>
      </div>

      <ChartContainer config={chartConfig} className="h-[110px] w-full">
        <BarChart
          data={data}
          barCategoryGap="18%"
          margin={{ top: 4, right: 0, left: -20, bottom: 0 }}
        >
          <XAxis
            dataKey="label"
            tick={{
              fill: "hsl(var(--muted-foreground))",
              fontSize: 9,
              fontFamily: "var(--font-geist-mono), monospace",
            }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide domain={[0, maxCount + 1]} />
          <ChartTooltip
            cursor={{ fill: "hsl(var(--muted))" }}
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
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.color}
                fillOpacity={d.count === 0 ? 0.2 : 0.85}
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
              className="text-[11px] font-mono font-bold tabular-nums"
              style={{ color: d.count > 0 ? d.color : "hsl(var(--muted-foreground))" }}
            >
              {d.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
