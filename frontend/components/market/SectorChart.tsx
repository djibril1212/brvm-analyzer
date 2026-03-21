"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { SectorIndex } from "@/types/brvm";

const chartConfig = {
  variation_pct: { label: "Variation" },
} satisfies ChartConfig;

interface SectorChartProps {
  sectors: SectorIndex[];
}

export function SectorChart({ sectors }: SectorChartProps) {
  const data = [...sectors].sort((a, b) => b.variation_pct - a.variation_pct);

  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.06)"
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: "hsl(220 12% 48%)" }}
          axisLine={false}
          tickLine={false}
          interval={0}
          angle={-25}
          textAnchor="end"
          height={48}
        />
        <YAxis
          tickFormatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`}
          tick={{
            fontSize: 10,
            fill: "hsl(220 12% 48%)",
            fontFamily: "var(--font-geist-mono)",
          }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
        <ChartTooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          content={
            <ChartTooltipContent
              nameKey="variation_pct"
              formatter={(value) => {
                const v = Number(value);
                return [`${v > 0 ? "+" : ""}${v.toFixed(2)}%`, "Variation"];
              }}
            />
          }
        />
        <Bar dataKey="variation_pct" radius={[3, 3, 0, 0]}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={d.variation_pct >= 0 ? "#22c55e" : "#ef4444"}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
