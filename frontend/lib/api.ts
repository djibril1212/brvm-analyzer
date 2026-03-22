/**
 * lib/api.ts
 * Data access layer — market data from getdoli.com (primary) or FastAPI backend (fallback).
 * Analysis (IA) still calls the FastAPI backend if available, falls back gracefully.
 */

import type { MarketSession, DailyAnalysis } from "@/types/brvm";
import { fetchDoliSession, doliToSession } from "@/lib/doli";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

// ─── Market data (getdoli.com → FastAPI fallback) ─────────────────────────────

export async function getLatestSession(): Promise<MarketSession> {
  // Primary: getdoli.com
  try {
    const payload = await fetchDoliSession();
    if (payload) return doliToSession(payload);
  } catch (err) {
    console.warn("[api] getdoli.com indisponible, fallback FastAPI:", err);
  }

  // Fallback: FastAPI backend
  if (!API_BASE) {
    throw new Error("Impossible de récupérer les données de marché (getdoli.com et API_BASE indisponibles)");
  }
  const res = await fetch(`${API_BASE}/api/market/latest`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`FastAPI /market/latest → HTTP ${res.status}`);
  return res.json() as Promise<MarketSession>;
}

// ─── AI Analysis (FastAPI backend, optional) ──────────────────────────────────

export async function getLatestAnalysis(): Promise<DailyAnalysis> {
  if (!API_BASE) {
    throw new Error("API_BASE non configuré — analyse IA indisponible");
  }

  const res = await fetch(`${API_BASE}/api/market/analysis/latest`, {
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`Analyse IA → HTTP ${res.status}`);
  }

  return res.json() as Promise<DailyAnalysis>;
}

// ─── Historical data (FastAPI backend, optional) ──────────────────────────────

export async function getStockHistory(
  symbol: string,
  limit = 30
): Promise<import("@/types/brvm").StockQuote[]> {
  if (!API_BASE) throw new Error("API_BASE non configuré");

  const res = await fetch(
    `${API_BASE}/api/market/stocks/${symbol}/history?limit=${limit}`,
    { next: { revalidate: 3600 } }
  );

  if (!res.ok) throw new Error(`Historique ${symbol} → HTTP ${res.status}`);
  return res.json();
}
