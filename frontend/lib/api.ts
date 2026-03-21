// Client d'API — appelle le backend FastAPI (Railway) ou Supabase directement
import type { MarketSession, StockQuote, DailyAnalysis } from "@/types/brvm";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetchAPI<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    next: { revalidate: 3600 }, // ISR 1h par défaut, webhook pour revalidation immédiate
  });
  if (!res.ok) {
    throw new Error(`API ${path} → ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function getLatestSession(): Promise<MarketSession> {
  return fetchAPI<MarketSession>("/api/market/latest");
}

export async function getSession(date: string): Promise<MarketSession> {
  return fetchAPI<MarketSession>(`/api/market/sessions/${date}`);
}

export async function getStockHistory(symbol: string, limit = 30): Promise<StockQuote[]> {
  return fetchAPI<StockQuote[]>(`/api/market/stocks/${symbol}/history?limit=${limit}`);
}

export async function getLatestAnalysis(): Promise<DailyAnalysis> {
  return fetchAPI<DailyAnalysis>("/api/market/analysis/latest");
}
