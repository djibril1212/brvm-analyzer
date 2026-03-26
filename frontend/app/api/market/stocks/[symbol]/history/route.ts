import { NextRequest, NextResponse } from "next/server";
import { supabaseSelect } from "@/lib/supabase-server";
import type { StockQuote } from "@/types/brvm";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "30");

  try {
    const rows = await supabaseSelect<StockQuote>("stock_quotes", {
      filters: { symbol: `eq.${symbol.toUpperCase()}` },
      order: "session_date",
      orderDesc: true,
      limit,
      revalidate: 3600,
    });

    return NextResponse.json(rows);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[api/market/stocks/${symbol}/history]`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
