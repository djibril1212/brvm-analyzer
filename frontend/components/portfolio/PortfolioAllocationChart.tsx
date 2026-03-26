"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart as PieIcon } from "lucide-react";
import type { PositionWithMarket } from "@/types/portfolio";
import { formatXOF } from "@/lib/portfolio";

// Palette adaptée au thème sombre BRVM
const COLORS = [
  "#2E8B57", "#10b981", "#3b82f6", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
  "#14b8a6", "#a855f7", "#ef4444", "#eab308", "#0ea5e9",
];

interface Props {
  positions: PositionWithMarket[];
  totalValue: number;
}

interface SliceEntry {
  symbol: string;
  name: string;
  value: number;
  pct: number;
  color: string;
}

export function PortfolioAllocationChart({ positions, totalValue }: Props) {
  const data: SliceEntry[] = positions
    .map((p, i) => ({
      symbol: p.symbol,
      name: p.name,
      value: p.currentValue ?? p.costBasis,
      pct: totalValue > 0 ? ((p.currentValue ?? p.costBasis) / totalValue) * 100 : 0,
      color: COLORS[i % COLORS.length],
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <PieIcon className="h-4 w-4" />
          Répartition du portefeuille
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Donut */}
          <div className="w-44 h-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius="55%"
                  outerRadius="80%"
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((entry) => (
                    <Cell key={entry.symbol} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as SliceEntry;
                    return (
                      <div className="bg-popover border border-border rounded-md px-3 py-2 text-xs shadow-lg">
                        <p className="font-mono font-bold text-foreground mb-0.5">{d.symbol}</p>
                        <p className="text-muted-foreground truncate max-w-[140px]">{d.name}</p>
                        <p className="font-mono text-foreground mt-1">{formatXOF(d.value)}</p>
                        <p className="font-mono text-muted-foreground">{d.pct.toFixed(1)}%</p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Légende */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 w-full">
            {data.map((item) => (
              <div key={item.symbol} className="flex items-center gap-2 min-w-0">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-mono text-[12px] font-bold text-foreground shrink-0">
                  {item.symbol}
                </span>
                <div className="flex-1 min-w-0 border-b border-dashed border-border/40 mx-1" />
                <span className="font-mono text-[11px] text-muted-foreground tabular-nums shrink-0">
                  {item.pct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
