"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  CartesianGrid,
  Legend,
} from "recharts";
import { buildChartData, type ChartPoint } from "@/lib/indicators";
import type { StockQuote } from "@/types/brvm";

type Tab = "prix" | "rsi" | "stochastique";

const TABS: { id: Tab; label: string }[] = [
  { id: "prix", label: "Prix · MM · BB" },
  { id: "rsi", label: "RSI (14)" },
  { id: "stochastique", label: "Stochastique" },
];

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function fmtK(v: number) {
  return v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PriceTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as ChartPoint;
  if (!d) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2.5 shadow-lg text-xs space-y-1 min-w-[160px]">
      <p className="text-muted-foreground font-medium">{fmtDate(label)}</p>
      <div className="border-t border-border/50 pt-1 space-y-0.5">
        <p className="flex justify-between gap-4">
          <span className="text-muted-foreground">Cours</span>
          <span className="font-mono font-semibold text-foreground">{d.close.toLocaleString("fr-FR")} XOF</span>
        </p>
        {d.ma20 !== null && (
          <p className="flex justify-between gap-4">
            <span style={{ color: "#60a5fa" }}>MM20</span>
            <span className="font-mono">{d.ma20.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}</span>
          </p>
        )}
        {d.ma50 !== null && (
          <p className="flex justify-between gap-4">
            <span style={{ color: "#fb923c" }}>MM50</span>
            <span className="font-mono">{d.ma50.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}</span>
          </p>
        )}
        {d.bbUpper !== null && (
          <>
            <p className="flex justify-between gap-4">
              <span className="text-muted-foreground/60">BB sup.</span>
              <span className="font-mono">{d.bbUpper.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}</span>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-muted-foreground/60">BB inf.</span>
              <span className="font-mono">{d.bbLower?.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}</span>
            </p>
          </>
        )}
        <p className="flex justify-between gap-4 pt-0.5">
          <span className="text-muted-foreground">Variation</span>
          <span className={`font-mono font-semibold ${d.variation_pct >= 0 ? "text-gain" : "text-loss"}`}>
            {d.variation_pct >= 0 ? "+" : ""}{d.variation_pct.toFixed(2)}%
          </span>
        </p>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RsiTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const rsi = payload[0]?.value as number | null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="text-muted-foreground">{fmtDate(label)}</p>
      {rsi !== null && (
        <p className="font-mono font-semibold mt-0.5"
          style={{ color: rsi > 70 ? "var(--color-loss)" : rsi < 30 ? "var(--color-gain)" : "hsl(var(--foreground))" }}>
          RSI {rsi.toFixed(1)}
          <span className="ml-1.5 text-[10px] text-muted-foreground font-normal">
            {rsi > 70 ? "Suracheté" : rsi < 30 ? "Survendu" : "Neutre"}
          </span>
        </p>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StochTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const k = payload.find((p: { name: string }) => p.name === "stochK")?.value as number | null;
  const d = payload.find((p: { name: string }) => p.name === "stochD")?.value as number | null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs space-y-0.5">
      <p className="text-muted-foreground">{fmtDate(label)}</p>
      {k !== null && <p className="font-mono" style={{ color: "#60a5fa" }}>%K {k.toFixed(1)}</p>}
      {d !== null && <p className="font-mono" style={{ color: "#fb923c" }}>%D {d.toFixed(1)}</p>}
    </div>
  );
}

interface Props {
  history: StockQuote[];
  currentPrice: number;
}

export function TechnicalChart({ history, currentPrice }: Props) {
  const [tab, setTab] = useState<Tab>("prix");

  if (!history.length) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
        Historique insuffisant pour les indicateurs techniques
      </div>
    );
  }

  const data = buildChartData(history);
  const closes = data.map((d) => d.close);
  const minClose = Math.min(...closes);
  const maxClose = Math.max(...closes);
  const pad = (maxClose - minClose) * 0.05 || 1;

  const firstClose = data[0]?.close ?? currentPrice;
  const trend = currentPrice >= firstClose;
  const priceColor = trend ? "var(--color-gain)" : "var(--color-loss)";

  const btnCls = (active: boolean) =>
    [
      "h-7 px-3 text-[12px] font-medium rounded-md transition-colors whitespace-nowrap",
      active
        ? "bg-background text-foreground shadow-sm border border-border"
        : "text-muted-foreground hover:text-foreground",
    ].join(" ");

  return (
    <div className="space-y-3">
      {/* Tab bar */}
      <div className="flex gap-1 bg-muted/40 rounded-lg p-1 w-fit">
        {TABS.map((t) => (
          <button key={t.id} className={btnCls(tab === t.id)} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Panel: Prix + MA + BB ── */}
      {tab === "prix" && (
        <div>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGradT" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={priceColor} stopOpacity={0.1} />
                  <stop offset="100%" stopColor={priceColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
              <XAxis dataKey="date" tickFormatter={fmtDate}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis domain={[minClose - pad, maxClose + pad]}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false} tickLine={false} width={60} tickFormatter={fmtK} />
              <Tooltip content={<PriceTooltip />} />

              {/* Bollinger bands — dashed upper/lower, solid middle */}
              <Line type="monotone" dataKey="bbUpper" stroke="hsl(var(--muted-foreground))"
                strokeWidth={1} strokeDasharray="3 3" dot={false} legendType="none"
                connectNulls />
              <Line type="monotone" dataKey="bbLower" stroke="hsl(var(--muted-foreground))"
                strokeWidth={1} strokeDasharray="3 3" dot={false} legendType="none"
                connectNulls />
              <Line type="monotone" dataKey="bbMiddle" stroke="hsl(var(--muted-foreground))"
                strokeWidth={1} strokeOpacity={0.5} dot={false} legendType="none"
                connectNulls />

              {/* MA lines */}
              <Line type="monotone" dataKey="ma50" stroke="#fb923c"
                strokeWidth={1.5} dot={false} name="MM50" connectNulls />
              <Line type="monotone" dataKey="ma20" stroke="#60a5fa"
                strokeWidth={1.5} dot={false} name="MM20" connectNulls />

              {/* Price line */}
              <Line type="monotone" dataKey="close" stroke={priceColor}
                strokeWidth={2} dot={false} name="Cours"
                activeDot={{ r: 4, fill: priceColor, strokeWidth: 0 }} />

              <ReferenceLine y={firstClose} stroke="hsl(var(--border))"
                strokeDasharray="4 4" strokeOpacity={0.5} />

              <Legend
                iconType="line"
                iconSize={12}
                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                formatter={(value) => (
                  <span style={{ color: "hsl(var(--muted-foreground))" }}>{value}</span>
                )}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-muted-foreground/50 mt-1 px-1">
            BB = Bandes de Bollinger (20, ×2σ) · MM20/MM50 = Moyennes mobiles 20 et 50 séances
          </p>
        </div>
      )}

      {/* ── Panel: RSI ── */}
      {tab === "rsi" && (
        <div>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
              <XAxis dataKey="date" tickFormatter={fmtDate}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false} tickLine={false} width={32}
                ticks={[0, 20, 30, 50, 70, 80, 100]} />
              <Tooltip content={<RsiTooltip />} />

              {/* Zones de référence */}
              <ReferenceArea y1={70} y2={100} fill="var(--color-loss)" fillOpacity={0.06} />
              <ReferenceArea y1={0} y2={30} fill="var(--color-gain)" fillOpacity={0.06} />

              {/* Lignes de référence */}
              <ReferenceLine y={70} stroke="var(--color-loss)" strokeDasharray="4 3" strokeOpacity={0.7}
                label={{ value: "Suracheté 70", position: "insideTopLeft", fontSize: 9, fill: "var(--color-loss)" }} />
              <ReferenceLine y={30} stroke="var(--color-gain)" strokeDasharray="4 3" strokeOpacity={0.7}
                label={{ value: "Survendu 30", position: "insideBottomLeft", fontSize: 9, fill: "var(--color-gain)" }} />
              <ReferenceLine y={50} stroke="hsl(var(--border))" strokeDasharray="2 4" strokeOpacity={0.5} />

              <Line type="monotone" dataKey="rsi" stroke="#a78bfa"
                strokeWidth={2} dot={false} name="RSI (14)" connectNulls
                activeDot={{ r: 4, fill: "#a78bfa", strokeWidth: 0 }} />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-muted-foreground/50 mt-1 px-1">
            RSI 14 avec lissage de Wilder · &lt;30 = survente · &gt;70 = surachat
          </p>
        </div>
      )}

      {/* ── Panel: Stochastique ── */}
      {tab === "stochastique" && (
        <div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
              <XAxis dataKey="date" tickFormatter={fmtDate}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false} tickLine={false} width={32}
                ticks={[0, 20, 50, 80, 100]} />
              <Tooltip content={<StochTooltip />} />

              <ReferenceArea y1={80} y2={100} fill="var(--color-loss)" fillOpacity={0.06} />
              <ReferenceArea y1={0} y2={20} fill="var(--color-gain)" fillOpacity={0.06} />

              <ReferenceLine y={80} stroke="var(--color-loss)" strokeDasharray="4 3" strokeOpacity={0.7}
                label={{ value: "Suracheté 80", position: "insideTopLeft", fontSize: 9, fill: "var(--color-loss)" }} />
              <ReferenceLine y={20} stroke="var(--color-gain)" strokeDasharray="4 3" strokeOpacity={0.7}
                label={{ value: "Survendu 20", position: "insideBottomLeft", fontSize: 9, fill: "var(--color-gain)" }} />
              <ReferenceLine y={50} stroke="hsl(var(--border))" strokeDasharray="2 4" strokeOpacity={0.5} />

              <Line type="monotone" dataKey="stochK" stroke="#60a5fa"
                strokeWidth={2} dot={false} name="stochK" connectNulls
                activeDot={{ r: 3, fill: "#60a5fa", strokeWidth: 0 }} />
              <Line type="monotone" dataKey="stochD" stroke="#fb923c"
                strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="stochD" connectNulls />

              <Legend iconType="line" iconSize={12}
                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                formatter={(value) => (
                  <span style={{ color: "hsl(var(--muted-foreground))" }}>
                    {value === "stochK" ? "%K (14)" : "%D (3)"}
                  </span>
                )} />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-muted-foreground/50 mt-1 px-1">
            Stochastique %K(14) / %D(3) · Approximation sur cours de clôture (H/L non disponibles BRVM)
          </p>
        </div>
      )}
    </div>
  );
}
