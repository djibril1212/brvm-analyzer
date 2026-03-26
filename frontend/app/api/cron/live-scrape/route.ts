/**
 * Live scraper — getdoli.com → Supabase directement.
 * Remplace Railway : plus besoin du backend Python pour les cours live.
 *
 * Déclenché par cron-job.org (gratuit) toutes les 5 min :
 *   URL    : https://<votre-domaine>/api/cron/live-scrape
 *   Méthode: GET
 *   Header : Authorization: Bearer <CRON_SECRET>
 *   Schedule cron-job.org : * /5 9-13 * * 1-5  (9h-14h UTC, lun-ven)
 *
 * Variables d'environnement requises (Vercel dashboard) :
 *   CRON_SECRET              — partagé avec cron-job.org
 *   NEXT_PUBLIC_SUPABASE_URL — déjà configuré
 *   SUPABASE_SERVICE_ROLE_KEY — à ajouter (server-side uniquement, SANS NEXT_PUBLIC_)
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchDoliSession } from "@/lib/doli";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isMarketOpen(): boolean {
  const now = new Date();
  const d = now.getUTCDay();   // 0=dim, 6=sam
  const h = now.getUTCHours(); // 0-23
  return d >= 1 && d <= 5 && h >= 8 && h < 15;
}

export async function GET(request: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const auth = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Marché fermé — skip silencieux ──────────────────────────────────────────
  if (!isMarketOpen()) {
    return NextResponse.json({ ok: true, skipped: true, reason: "Marché fermé" });
  }

  // ── Config Supabase ─────────────────────────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("[cron/live-scrape] NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant");
    return NextResponse.json(
      { error: "Supabase non configuré — vérifier les env vars dans Vercel" },
      { status: 500 }
    );
  }

  // ── Scrape getdoli.com ──────────────────────────────────────────────────────
  const payload = await fetchDoliSession();

  if (!payload || !payload.data?.length) {
    console.error("[cron/live-scrape] getdoli.com n'a retourné aucune donnée");
    return NextResponse.json({ ok: false, error: "getdoli.com indisponible ou vide" }, { status: 502 });
  }

  const scrapedAt = new Date().toISOString();

  const rows = payload.data
    .filter((s) => s.ticker)
    .map((s) => ({
      ticker: s.ticker,
      last_price: s.last_price ?? s.prev_close ?? null,
      variation_pct: s.variation_pct ?? 0,
      prev_close: s.prev_close ?? 0,
      open_price: s.open_price ?? null,
      high: s.high ?? null,
      low: s.low ?? null,
      volume: s.qty_total ?? s.volume ?? 0,
      scraped_at: scrapedAt,
      status: "live",
    }));

  // ── Upsert Supabase via REST API (pas besoin de SDK) ─────────────────────────
  const endpoint = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/live_quotes?on_conflict=ticker`;

  const upsertRes = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
    signal: AbortSignal.timeout(15_000),
  });

  if (!upsertRes.ok) {
    const err = await upsertRes.text();
    console.error("[cron/live-scrape] Supabase upsert échoué:", err);
    return NextResponse.json({ ok: false, error: err }, { status: 500 });
  }

  console.log(`[cron/live-scrape] OK — ${rows.length} actions scrappées à ${scrapedAt}`);
  return NextResponse.json({ ok: true, scraped: rows.length, at: scrapedAt });
}
