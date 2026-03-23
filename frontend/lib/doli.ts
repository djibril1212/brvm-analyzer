/**
 * lib/doli.ts
 * Fetches and parses BRVM market data from getdoli.com (public BRVM data).
 * getdoli.com scrapes brvm.org and renders via Next.js RSC.
 * We extract the embedded RSC payload from the HTML.
 *
 * SERVER-SIDE ONLY — never import in client components.
 */

import type { MarketSession, StockQuote, SectorIndex, IndexData } from "@/types/brvm";

// ─── Doli internal types ──────────────────────────────────────────────────────

interface DoliStock {
  ticker: string;
  name: string;
  last_price: number | null;
  prev_close: number;
  ref_price?: number;
  variation_pct: number;
  qty_total?: number;
  volume?: number;
  cmp?: number;
  high?: number;
  low?: number;
  open_price?: number;
  status?: string;
  scraped_at?: string;
  last_update?: string;
}

interface DoliIndex {
  value: number;
  variation_pct: number;
}

interface DoliSector {
  name: string;
  value?: number;
  variation_pct: number;
}

interface DoliSummary {
  total_volume?: number;
  total_value?: number;
  transaction_count?: number;
  market_cap?: number;
  scraped_at?: string;
}

interface DoliPayload {
  data: DoliStock[];
  sparklines?: Record<string, number[]>;
  initialSummary?: DoliSummary;
  indices?: {
    composite?: DoliIndex;
    brvm30?: DoliIndex;
    prestige?: DoliIndex;
  };
  sectors?: DoliSector[];
  market_cap?: number;
}

// ─── RSC payload extraction ────────────────────────────────────────────────────

function extractRSCChunks(html: string): string[] {
  const chunks: string[] = [];
  const re = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      chunks.push(JSON.parse(`"${m[1]}"`));
    } catch {
      chunks.push(
        m[1]
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "\r")
          .replace(/\\t/g, "\t")
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, "\\")
      );
    }
  }
  return chunks;
}

function isDoliPayload(obj: unknown): obj is DoliPayload {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    Array.isArray(o.data) &&
    o.data.length > 0 &&
    typeof (o.data as DoliStock[])[0]?.ticker === "string"
  );
}

function searchPayload(obj: unknown, depth = 0): DoliPayload | null {
  if (depth > 5 || !obj || typeof obj !== "object") return null;
  if (isDoliPayload(obj)) return obj as DoliPayload;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = searchPayload(item, depth + 1);
      if (found) return found;
    }
  } else {
    for (const val of Object.values(obj as Record<string, unknown>)) {
      const found = searchPayload(val, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function findDoliPayload(rscContent: string): DoliPayload | null {
  const lines = rscContent.split("\n");

  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1 || colonIdx > 6) continue;

    const id = line.slice(0, colonIdx);
    if (!/^\d+$/.test(id)) continue;

    const payload = line.slice(colonIdx + 1).trim();
    if (!payload || (payload[0] !== "{" && payload[0] !== "[")) continue;

    try {
      const parsed = JSON.parse(payload);
      const found = searchPayload(parsed);
      if (found) return found;
    } catch {
      // malformed — skip
    }
  }

  // Fallback: direct string search for ticker data
  const marker = '"data":[{"ticker":';
  const idx = rscContent.indexOf(marker);
  if (idx !== -1) {
    let objStart = idx;
    while (objStart > 0 && rscContent[objStart] !== "{") objStart--;

    let depth = 0;
    let inStr = false;
    const limit = Math.min(objStart + 800_000, rscContent.length);

    for (let i = objStart; i < limit; i++) {
      const c = rscContent[i];
      if (c === '"' && (i === 0 || rscContent[i - 1] !== "\\")) {
        inStr = !inStr;
      } else if (!inStr) {
        if (c === "{") depth++;
        else if (c === "}") {
          depth--;
          if (depth === 0) {
            try {
              const obj = JSON.parse(rscContent.slice(objStart, i + 1));
              if (isDoliPayload(obj)) return obj;
            } catch {}
            break;
          }
        }
      }
    }
  }

  return null;
}

// ─── Main fetch ────────────────────────────────────────────────────────────────

const DOLI_URL = "https://www.getdoli.com/fr/market";

export async function fetchDoliSession(): Promise<DoliPayload | null> {
  try {
    // En séance (lun-ven 08h-15h UTC) : cache 45s pour avoir des prix quasi-live
    // Hors séance : cache 10 min (données figées de toute façon)
    const now = new Date();
    const utcH = now.getUTCHours();
    const utcD = now.getUTCDay();
    const inSession = utcD >= 1 && utcD <= 5 && utcH >= 8 && utcH < 15;

    const res = await fetch(DOLI_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9",
      },
      next: { revalidate: inSession ? 45 : 600 },
    });

    if (!res.ok) {
      console.error(`[doli] HTTP ${res.status}`);
      return null;
    }

    const html = await res.text();
    const chunks = extractRSCChunks(html);

    if (!chunks.length) {
      console.error("[doli] No __next_f chunks in HTML");
      return null;
    }

    const payload = findDoliPayload(chunks.join("\n"));
    if (!payload) {
      console.error("[doli] Stock data not found in RSC payload");
    }
    return payload;
  } catch (err) {
    console.error("[doli] Fetch error:", err);
    return null;
  }
}

// ─── Mapping ───────────────────────────────────────────────────────────────────

export function doliToSession(payload: DoliPayload): MarketSession {
  const stocks = payload.data.filter(
    (s) => s.ticker && (s.prev_close > 0 || s.last_price != null)
  );

  const rawDate =
    payload.initialSummary?.scraped_at ??
    stocks.find((s) => s.scraped_at)?.scraped_at ??
    new Date().toISOString();
  const sessionDate = rawDate.split("T")[0];

  const stockQuotes: StockQuote[] = stocks.map((s) => ({
    session_date: sessionDate,
    symbol: s.ticker,
    name: s.name,
    previous_close: s.prev_close ?? s.ref_price ?? 0,
    close: s.last_price ?? s.prev_close ?? 0,
    variation_pct: s.variation_pct ?? 0,
    volume: s.qty_total ?? s.volume ?? 0,
    value_traded: s.cmp ?? 0,
    per: null,
    net_yield: null,
    last_dividend: null,
  }));

  const advancing = stockQuotes.filter((s) => s.variation_pct > 0).length;
  const declining = stockQuotes.filter((s) => s.variation_pct < 0).length;
  const unchanged = stockQuotes.filter((s) => s.variation_pct === 0).length;

  const avgVar =
    stockQuotes.length > 0
      ? stockQuotes.reduce((a, s) => a + s.variation_pct, 0) / stockQuotes.length
      : 0;

  const composite: IndexData = payload.indices?.composite ?? {
    value: 0,
    variation_pct: parseFloat(avgVar.toFixed(2)),
  };

  const brvm30: IndexData = payload.indices?.brvm30 ?? { value: 0, variation_pct: 0 };
  const prestige: IndexData = payload.indices?.prestige ?? { value: 0, variation_pct: 0 };

  const sectors: SectorIndex[] = (payload.sectors ?? []).map((s) => ({
    session_date: sessionDate,
    name: s.name,
    value: s.value ?? 0,
    variation_pct: s.variation_pct,
  }));

  return {
    session_date: sessionDate,
    composite,
    brvm30,
    prestige,
    advancing,
    declining,
    unchanged,
    market_cap: payload.market_cap ?? payload.initialSummary?.market_cap ?? 0,
    announcements: null,
    stocks: stockQuotes,
    sectors,
  };
}
