import { NextResponse } from "next/server";
import { supabaseSelectOne, supabaseSelect } from "@/lib/supabase-server";
import type { MarketSession, StockQuote, SectorIndex } from "@/types/brvm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SessionRow = {
  session_date: string;
  composite_value: number;
  composite_variation: number;
  brvm30_value: number;
  brvm30_variation: number;
  prestige_value: number;
  prestige_variation: number;
  advancing: number;
  declining: number;
  unchanged: number;
  market_cap: number;
  announcements?: string | null;
};

export async function GET() {
  try {
    const row = await supabaseSelectOne<SessionRow>("market_sessions", {
      order: "session_date",
      orderDesc: true,
      revalidate: 300,
    });

    if (!row) {
      return NextResponse.json({ error: "Aucune session disponible" }, { status: 404 });
    }

    const date = row.session_date;

    const [stocks, sectors] = await Promise.all([
      supabaseSelect<StockQuote>("stock_quotes", {
        filters: { session_date: `eq.${date}` },
        order: "symbol",
        orderDesc: false,
        revalidate: 300,
      }),
      supabaseSelect<SectorIndex>("sector_indices", {
        filters: { session_date: `eq.${date}` },
        revalidate: 300,
      }),
    ]);

    const session: MarketSession = {
      session_date: row.session_date,
      composite: { name: "BRVM Composite", value: row.composite_value, variation_pct: row.composite_variation },
      brvm30: { name: "BRVM 30", value: row.brvm30_value, variation_pct: row.brvm30_variation },
      prestige: { name: "BRVM Prestige", value: row.prestige_value, variation_pct: row.prestige_variation },
      advancing: row.advancing,
      declining: row.declining,
      unchanged: row.unchanged,
      market_cap: row.market_cap,
      announcements: row.announcements,
      stocks,
      sectors,
    };

    return NextResponse.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/market/latest]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
