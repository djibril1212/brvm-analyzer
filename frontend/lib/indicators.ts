/**
 * Calcul des indicateurs techniques pour les actions BRVM.
 *
 * Données disponibles : close, volume (pas de High/Low → approx. pour Stochastique).
 * Toutes les fonctions retournent un tableau de la même longueur que l'input,
 * avec null pour les positions où l'indicateur n'est pas encore calculable.
 */

// ── Moyennes mobiles ──────────────────────────────────────────────────────────

/** Moyenne Mobile Simple sur `period` périodes. */
export function calcSMA(closes: number[], period: number): (number | null)[] {
  return closes.map((_, i) => {
    if (i < period - 1) return null;
    const slice = closes.slice(i - period + 1, i + 1);
    return slice.reduce((s, v) => s + v, 0) / period;
  });
}

// ── RSI (Wilder, période 14) ──────────────────────────────────────────────────

/**
 * RSI avec lissage de Wilder.
 * - Résultat < 30 : survente (potentiel rebond)
 * - Résultat > 70 : surachat (risque de retournement)
 */
export function calcRSI(closes: number[], period = 14): (number | null)[] {
  if (closes.length < period + 1) return closes.map(() => null);

  const result: (number | null)[] = closes.map(() => null);

  // Calcul des variations
  const changes = closes.slice(1).map((c, i) => c - closes[i]);

  // Première valeur : moyenne simple
  const firstGains = changes.slice(0, period).map((c) => Math.max(c, 0));
  const firstLosses = changes.slice(0, period).map((c) => Math.abs(Math.min(c, 0)));

  let avgGain = firstGains.reduce((s, v) => s + v, 0) / period;
  let avgLoss = firstLosses.reduce((s, v) => s + v, 0) / period;

  const rsi = (ag: number, al: number) =>
    al === 0 ? 100 : 100 - 100 / (1 + ag / al);

  result[period] = rsi(avgGain, avgLoss);

  // Lissage de Wilder pour les suivantes
  for (let i = period + 1; i < closes.length; i++) {
    const change = changes[i - 1];
    const gain = Math.max(change, 0);
    const loss = Math.abs(Math.min(change, 0));
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = rsi(avgGain, avgLoss);
  }

  return result;
}

// ── Bandes de Bollinger (période 20, k=2) ─────────────────────────────────────

export interface BollingerPoint {
  upper: number | null;
  middle: number | null;
  lower: number | null;
  /** Largeur normalisée : (upper - lower) / middle × 100 → squeeze si < 5% */
  bandwidth: number | null;
}

/**
 * Bandes de Bollinger.
 * - Prix > upper : surachat / sortie haute
 * - Prix < lower : survente / sortie basse
 * - bandwidth faible (< 5%) : squeeze → explosion de volatilité imminente
 */
export function calcBollinger(
  closes: number[],
  period = 20,
  k = 2
): BollingerPoint[] {
  return closes.map((_, i) => {
    if (i < period - 1)
      return { upper: null, middle: null, lower: null, bandwidth: null };

    const slice = closes.slice(i - period + 1, i + 1);
    const mean = slice.reduce((s, v) => s + v, 0) / period;
    const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period;
    const std = Math.sqrt(variance);

    const upper = mean + k * std;
    const lower = mean - k * std;
    const bandwidth = mean > 0 ? ((upper - lower) / mean) * 100 : null;

    return { upper, middle: mean, lower, bandwidth };
  });
}

// ── Stochastique (K% période 14, D% période 3) ───────────────────────────────

export interface StochasticPoint {
  k: number | null;
  d: number | null;
}

/**
 * Oscillateur stochastique.
 * Approximation avec highest/lowest close (pas de H/L disponibles sur BRVM).
 * - K > 80 : surachat
 * - K < 20 : survente
 * - Croisement K/D vers le haut sous 20 : signal haussier
 * - Croisement K/D vers le bas au-dessus de 80 : signal baissier
 */
export function calcStochastic(
  closes: number[],
  kPeriod = 14,
  dPeriod = 3
): StochasticPoint[] {
  const kLine: (number | null)[] = closes.map((_, i) => {
    if (i < kPeriod - 1) return null;
    const slice = closes.slice(i - kPeriod + 1, i + 1);
    const highest = Math.max(...slice);
    const lowest = Math.min(...slice);
    if (highest === lowest) return 50; // pas de mouvement → neutre
    return ((closes[i] - lowest) / (highest - lowest)) * 100;
  });

  // D% = SMA3 de K%
  const dLine: (number | null)[] = kLine.map((_, i) => {
    const kSlice = kLine.slice(Math.max(0, i - dPeriod + 1), i + 1).filter(
      (v): v is number => v !== null
    );
    if (kSlice.length < dPeriod) return null;
    return kSlice.reduce((s, v) => s + v, 0) / dPeriod;
  });

  return kLine.map((k, i) => ({ k, d: dLine[i] }));
}

// ── Assemblage pour le chart ──────────────────────────────────────────────────

export interface ChartPoint {
  date: string;
  close: number;
  variation_pct: number;
  volume: number;
  ma20: number | null;
  ma50: number | null;
  bbUpper: number | null;
  bbMiddle: number | null;
  bbLower: number | null;
  bbBandwidth: number | null;
  rsi: number | null;
  stochK: number | null;
  stochD: number | null;
}

export function buildChartData(
  history: { session_date: string; close: number; variation_pct: number; volume: number }[]
): ChartPoint[] {
  const sorted = [...history].sort((a, b) =>
    a.session_date.localeCompare(b.session_date)
  );

  const closes = sorted.map((d) => d.close);

  const ma20 = calcSMA(closes, 20);
  const ma50 = calcSMA(closes, 50);
  const bb = calcBollinger(closes, 20, 2);
  const rsi = calcRSI(closes, 14);
  const stoch = calcStochastic(closes, 14, 3);

  return sorted.map((d, i) => ({
    date: d.session_date,
    close: d.close,
    variation_pct: d.variation_pct,
    volume: d.volume,
    ma20: ma20[i],
    ma50: ma50[i],
    bbUpper: bb[i].upper,
    bbMiddle: bb[i].middle,
    bbLower: bb[i].lower,
    bbBandwidth: bb[i].bandwidth,
    rsi: rsi[i],
    stochK: stoch[i].k,
    stochD: stoch[i].d,
  }));
}

// ── Interprétation des signaux ────────────────────────────────────────────────

export type SignalLevel = "SURVENDU" | "NEUTRE" | "SURACHETÉ";
export type TrendSignal = "HAUSSIER" | "NEUTRE" | "BAISSIER";

export interface IndicatorSignals {
  rsiValue: number | null;
  rsiSignal: SignalLevel;
  maSignal: TrendSignal;
  /** Prix au-dessus de MA20 */
  aboveMA20: boolean | null;
  /** Prix au-dessus de MA50 */
  aboveMA50: boolean | null;
  /** MA20 au-dessus de MA50 (golden cross territory) */
  ma20AboveMA50: boolean | null;
  bbSignal: SignalLevel | "SQUEEZE";
  bbBandwidth: number | null;
  stochK: number | null;
  stochD: number | null;
  stochSignal: SignalLevel;
  /** Résumé global : nombre de signaux haussiers vs baissiers */
  overallBias: "HAUSSIER" | "BAISSIER" | "NEUTRE";
}

export function computeSignals(points: ChartPoint[]): IndicatorSignals {
  const last = points[points.length - 1];
  if (!last) {
    return {
      rsiValue: null, rsiSignal: "NEUTRE", maSignal: "NEUTRE",
      aboveMA20: null, aboveMA50: null, ma20AboveMA50: null,
      bbSignal: "NEUTRE", bbBandwidth: null,
      stochK: null, stochD: null, stochSignal: "NEUTRE",
      overallBias: "NEUTRE",
    };
  }

  // RSI
  const rsiValue = last.rsi;
  const rsiSignal: SignalLevel =
    rsiValue === null ? "NEUTRE" :
    rsiValue < 30 ? "SURVENDU" :
    rsiValue > 70 ? "SURACHETÉ" : "NEUTRE";

  // MA
  const aboveMA20 = last.ma20 !== null ? last.close > last.ma20 : null;
  const aboveMA50 = last.ma50 !== null ? last.close > last.ma50 : null;
  const ma20AboveMA50 =
    last.ma20 !== null && last.ma50 !== null ? last.ma20 > last.ma50 : null;

  const bullishMA = [aboveMA20, aboveMA50, ma20AboveMA50].filter(Boolean).length;
  const bearishMA = [aboveMA20, aboveMA50, ma20AboveMA50].filter((v) => v === false).length;
  const maSignal: TrendSignal =
    bullishMA >= 2 ? "HAUSSIER" : bearishMA >= 2 ? "BAISSIER" : "NEUTRE";

  // Bollinger
  const { bbUpper, bbLower, bbBandwidth } = last;
  const bbSignal: SignalLevel | "SQUEEZE" =
    bbBandwidth !== null && bbBandwidth < 5 ? "SQUEEZE" :
    bbUpper !== null && last.close > bbUpper ? "SURACHETÉ" :
    bbLower !== null && last.close < bbLower ? "SURVENDU" : "NEUTRE";

  // Stochastic
  const stochK = last.stochK;
  const stochD = last.stochD;
  const stochSignal: SignalLevel =
    stochK === null ? "NEUTRE" :
    stochK < 20 ? "SURVENDU" :
    stochK > 80 ? "SURACHETÉ" : "NEUTRE";

  // Biais global
  const bullish = [
    rsiSignal === "SURVENDU",
    maSignal === "HAUSSIER",
    bbSignal === "SURVENDU",
    stochSignal === "SURVENDU",
  ].filter(Boolean).length;

  const bearish = [
    rsiSignal === "SURACHETÉ",
    maSignal === "BAISSIER",
    bbSignal === "SURACHETÉ",
    stochSignal === "SURACHETÉ",
  ].filter(Boolean).length;

  const overallBias =
    bullish > bearish ? "HAUSSIER" : bearish > bullish ? "BAISSIER" : "NEUTRE";

  return {
    rsiValue, rsiSignal, maSignal,
    aboveMA20, aboveMA50, ma20AboveMA50,
    bbSignal, bbBandwidth,
    stochK, stochD, stochSignal,
    overallBias,
  };
}
