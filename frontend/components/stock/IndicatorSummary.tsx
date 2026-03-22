"use client";

import { buildChartData, computeSignals } from "@/lib/indicators";
import type { StockQuote } from "@/types/brvm";

interface Props {
  history: StockQuote[];
}

function SignalPill({
  label,
  signal,
  sub,
}: {
  label: string;
  signal: "bullish" | "bearish" | "neutral" | "squeeze";
  sub?: string;
}) {
  const colors = {
    bullish: "text-gain border-[var(--color-gain)]/30 bg-[var(--color-gain)]/8",
    bearish: "text-loss border-[var(--color-loss)]/30 bg-[var(--color-loss)]/8",
    neutral: "text-muted-foreground border-border bg-muted/30",
    squeeze: "text-amber-400 border-amber-500/30 bg-amber-500/8",
  };
  const dots = {
    bullish: "bg-gain",
    bearish: "bg-loss",
    neutral: "bg-muted-foreground",
    squeeze: "bg-amber-400",
  };
  return (
    <div className={`rounded-lg border px-3 py-2.5 flex flex-col gap-1 ${colors[signal]}`}>
      <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dots[signal]}`} />
        <span className="text-sm font-semibold leading-none">
          {signal === "bullish" ? "Haussier" :
           signal === "bearish" ? "Baissier" :
           signal === "squeeze" ? "Squeeze" : "Neutre"}
        </span>
      </div>
      {sub && <span className="text-[11px] font-mono opacity-80">{sub}</span>}
    </div>
  );
}

export function IndicatorSummary({ history }: Props) {
  if (history.length < 20) return null;

  const data = buildChartData(history);
  const sig = computeSignals(data);

  // RSI
  const rsiSignal =
    sig.rsiSignal === "SURVENDU" ? "bullish" :
    sig.rsiSignal === "SURACHETÉ" ? "bearish" : "neutral";
  const rsiSub = sig.rsiValue !== null ? `${sig.rsiValue.toFixed(1)}` : undefined;

  // MA
  const maSignal =
    sig.maSignal === "HAUSSIER" ? "bullish" :
    sig.maSignal === "BAISSIER" ? "bearish" : "neutral";
  const maSub =
    sig.aboveMA20 !== null && sig.aboveMA50 !== null
      ? `${sig.aboveMA20 ? "↑" : "↓"} MM20 · ${sig.aboveMA50 ? "↑" : "↓"} MM50`
      : undefined;

  // Bollinger
  const bbSignal: "bullish" | "bearish" | "neutral" | "squeeze" =
    sig.bbSignal === "SURVENDU" ? "bullish" :
    sig.bbSignal === "SURACHETÉ" ? "bearish" :
    sig.bbSignal === "SQUEEZE" ? "squeeze" : "neutral";
  const bbSub = sig.bbBandwidth !== null ? `BW ${sig.bbBandwidth.toFixed(1)}%` : undefined;

  // Stochastic
  const stochSignal =
    sig.stochSignal === "SURVENDU" ? "bullish" :
    sig.stochSignal === "SURACHETÉ" ? "bearish" : "neutral";
  const stochSub =
    sig.stochK !== null && sig.stochD !== null
      ? `%K ${sig.stochK.toFixed(0)} · %D ${sig.stochD.toFixed(0)}`
      : undefined;

  // Biais global
  const overallColor =
    sig.overallBias === "HAUSSIER" ? "text-gain" :
    sig.overallBias === "BAISSIER" ? "text-loss" : "text-muted-foreground";

  return (
    <div className="space-y-2.5">
      {/* Biais global */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          Signaux techniques
        </p>
        <span className={`text-[11px] font-semibold font-mono uppercase ${overallColor}`}>
          Biais {sig.overallBias}
        </span>
      </div>

      {/* Grid de signaux */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <SignalPill label="RSI (14)" signal={rsiSignal} sub={rsiSub} />
        <SignalPill label="Moyennes mobiles" signal={maSignal} sub={maSub} />
        <SignalPill label="Bollinger" signal={bbSignal} sub={bbSub} />
        <SignalPill label="Stochastique" signal={stochSignal} sub={stochSub} />
      </div>

      {/* Légende squeeze */}
      {sig.bbSignal === "SQUEEZE" && (
        <p className="text-[11px] text-amber-400/80">
          ⚡ Squeeze détecté (BB {sig.bbBandwidth?.toFixed(1)}%) — compression de volatilité, rupture probable.
        </p>
      )}
    </div>
  );
}
