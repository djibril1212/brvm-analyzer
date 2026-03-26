import { NextRequest, NextResponse } from "next/server";
import { supabaseSelectOne } from "@/lib/supabase-server";
import type { DailyAnalysis } from "@/types/brvm";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;

  try {
    const row = await supabaseSelectOne<DailyAnalysis>("daily_analyses", {
      filters: { session_date: `eq.${date}` },
      revalidate: 86400,
    });

    if (!row) {
      return NextResponse.json({ error: `Aucune analyse pour ${date}` }, { status: 404 });
    }

    return NextResponse.json(row);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[api/market/analysis/${date}]`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
