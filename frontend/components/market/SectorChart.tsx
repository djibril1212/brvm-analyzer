"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { SectorIndex } from "@/types/brvm";

interface SectorChartProps {
  sectors: SectorIndex[];
}

export function SectorChart({ sectors }: SectorChartProps) {
  const data = [...sectors].sort((a, b) => b.variation_pct - a.variation_pct);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: "oklch(0.62 0.008 250)" }}
          axisLine={false}
          tickLine={false}
          interval={0}
          angle={-25}
          textAnchor="end"
          height={48}
        />
        <YAxis
          tickFormatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`}
          tick={{ fontSize: 10, fill: "oklch(0.62 0.008 250)", fontFamily: "var(--font-mono)" }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip
          contentStyle={{
            background: "oklch(0.18 0.008 250)",
            border: "1px solid oklch(1 0 0 / 10%)",
            borderRadius: "6px",
            fontSize: 12,
          }}
          formatter={(value) => {
            const v = Number(value);
            return [`${v > 0 ? "+" : ""}${v.toFixed(2)}%`, "Variation"] as [string, string];
          }}
          labelStyle={{ color: "oklch(0.94 0.004 250)", fontWeight: 600 }}
          itemStyle={{ color: "oklch(0.62 0.008 250)" }}
        />
        <ReferenceLine y={0} stroke="oklch(1 0 0 / 15%)" />
        <Bar
          dataKey="variation_pct"
          radius={[3, 3, 0, 0]}
          fill="oklch(0.55 0.15 155)"
          // Couleur conditionnelle via Cell n'est pas supportée simplement sans import Cell
          // On utilise une couleur unique (vert BRVM) — simplifié
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
