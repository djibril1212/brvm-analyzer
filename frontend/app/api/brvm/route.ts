/**
 * GET /api/brvm
 * Returns latest MarketSession: getdoli.com (primary) → FastAPI backend (fallback).
 * Used by useLiveData hook for client-side periodic refresh.
 * Cached 5 minutes at the edge.
 */

import { NextResponse } from "next/server";
import { fetchDoliSession, doliToSession } from "@/lib/doli";

export const runtime = "nodejs";
// Désactive le cache statique Next.js — on gère le cache via Cache-Control
export const dynamic = "force-dynamic";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();

function marketCacheHeader(): string {
  const now = new Date();
  const h = now.getUTCHours();
  const d = now.getUTCDay();
  const inSession = d >= 1 && d <= 5 && h >= 8 && h < 15;
  // En séance : pas de cache CDN (les clients SWR doivent toujours avoir du frais)
  // Hors séance : 10 min CDN
  return inSession
    ? "no-store"
    : "public, s-maxage=600, stale-while-revalidate=1200";
}

export async function GET() {
  const cc = marketCacheHeader();

  // Primary: getdoli.com
  try {
    const payload = await fetchDoliSession();
    if (payload) {
      return NextResponse.json(doliToSession(payload), {
        headers: { "Cache-Control": cc },
      });
    }
  } catch (err) {
    console.warn("[/api/brvm] getdoli.com failed, trying FastAPI:", err);
  }

  // Fallback: FastAPI backend
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/api/market/latest`);
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data, {
          headers: { "Cache-Control": cc },
        });
      }
    } catch (err) {
      console.warn("[/api/brvm] FastAPI fallback failed:", err);
    }
  }

  return NextResponse.json(
    { error: "Données de marché indisponibles" },
    { status: 503, headers: { "Cache-Control": "no-store" } }
  );
}
