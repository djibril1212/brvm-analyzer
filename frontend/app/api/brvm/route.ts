/**
 * GET /api/brvm
 * Returns latest MarketSession: getdoli.com (primary) → FastAPI backend (fallback).
 * Used by useLiveData hook for client-side periodic refresh.
 * Cached 5 minutes at the edge.
 */

import { NextResponse } from "next/server";
import { fetchDoliSession, doliToSession } from "@/lib/doli";

export const runtime = "nodejs";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function GET() {
  // Primary: getdoli.com
  try {
    const payload = await fetchDoliSession();
    if (payload) {
      return NextResponse.json(doliToSession(payload), {
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
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
          headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
        });
      }
    } catch (err) {
      console.warn("[/api/brvm] FastAPI fallback failed:", err);
    }
  }

  return NextResponse.json(
    { error: "Données de marché indisponibles" },
    {
      status: 503,
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    }
  );
}
