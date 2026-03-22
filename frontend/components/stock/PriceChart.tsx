"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import type { StockQuote } from "@/types/brvm";

interface PriceChartProps {
  history: StockQuote[];
  currentPrice: number;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const val: number = payload[0].value;
  const pct: number = payload[0].payload.variation_pct;
  const up = pct >= 0;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="text-muted-foreground mb-1">{formatDate(label)}</p>
      <p className="font-mono font-semibold text-foreground text-sm">
        {val.toLocaleString("fr-FR")} XOF
      </p>
      <p
        className="font-mono font-medium"
        style={{ color: up ? "var(--color-gain)" : "var(--color-loss)" }}
      >
        {up ? "+" : ""}
        {pct.toFixed(2)}%
      </p>
    </div>
  );
}

export function PriceChart({ history, currentPrice }: PriceChartProps) {
  if (!history.length) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
        Historique non disponible
      </div>
    );
  }

  // Sort oldest → newest
  const data = [...history]
    .sort((a, b) => a.session_date.localeCompare(b.session_date))
    .map((q) => ({ ...q, date: q.session_date }));

  const prices = data.map((d) => d.close);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const padding = (max - min) * 0.05 || 1;

  const firstPrice = data[0]?.close ?? currentPrice;
  const trend = currentPrice >= firstPrice ? "up" : "down";
  const strokeColor = trend === "up" ? "var(--color-gain)" : "var(--color-loss)";

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={0.15} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          strokeOpacity={0.5}
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[min - padding, max + padding]}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          width={60}
          tickFormatter={(v) =>
            v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)
          }
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine
          y={firstPrice}
          stroke="hsl(var(--border))"
          strokeDasharray="4 4"
          strokeOpacity={0.6}
        />
        <Line
          type="monotone"
          dataKey="close"
          stroke={strokeColor}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: strokeColor, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
