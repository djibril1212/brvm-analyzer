/**
 * lib/api.ts
 * Data access layer — market data depuis getdoli.com (primary) ou Supabase via API locale (fallback).
 * Plus de dépendance Railway / NEXT_PUBLIC_API_URL.
 */

import type { MarketSession, DailyAnalysis, StockQuote } from "@/types/brvm";
import { fetchDoliSession, doliToSession } from "@/lib/doli";

// ─── Market data (getdoli.com → Supabase fallback) ────────────────────────────

export async function getLatestSession(): Promise<MarketSession> {
  // Primary: getdoli.com (scrape live)
  try {
    const payload = await fetchDoliSession();
    if (payload) return doliToSession(payload);
  } catch (err) {
    console.warn("[api] getdoli.com indisponible, fallback Supabase:", err);
  }

  // Fallback: Supabase via route locale
  const res = await fetch("/api/market/latest", {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`/api/market/latest → HTTP ${res.status}`);
  return res.json() as Promise<MarketSession>;
}

// ─── AI Analysis ──────────────────────────────────────────────────────────────

export async function getLatestAnalysis(): Promise<DailyAnalysis> {
  const res = await fetch("/api/market/analysis/latest", {
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`Analyse IA → HTTP ${res.status}`);
  }

  return res.json() as Promise<DailyAnalysis>;
}

// ─── Historical data ──────────────────────────────────────────────────────────

export async function getStockHistory(
  symbol: string,
  limit = 30
): Promise<StockQuote[]> {
  const res = await fetch(
    `/api/market/stocks/${encodeURIComponent(symbol)}/history?limit=${limit}`,
    { next: { revalidate: 3600 } }
  );

  if (!res.ok) throw new Error(`Historique ${symbol} → HTTP ${res.status}`);
  return res.json();
}

// ─── Session par date ─────────────────────────────────────────────────────────

export async function getSession(date: string): Promise<MarketSession> {
  const res = await fetch(`/api/market/sessions/${date}`, {
    next: { revalidate: 86400 },
  });

  if (!res.ok) throw new Error(`Session ${date} → HTTP ${res.status}`);
  return res.json() as Promise<MarketSession>;
}

// ─── Analyse IA par date ──────────────────────────────────────────────────────

export async function getSessionAnalysis(date: string): Promise<DailyAnalysis> {
  const res = await fetch(`/api/market/analysis/${date}`, {
    next: { revalidate: 86400 },
  });

  if (!res.ok) throw new Error(`Analyse ${date} → HTTP ${res.status}`);
  return res.json() as Promise<DailyAnalysis>;
}
