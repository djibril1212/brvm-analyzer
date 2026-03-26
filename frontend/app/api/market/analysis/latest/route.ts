import { NextResponse } from "next/server";
import { supabaseSelectOne } from "@/lib/supabase-server";
import type { DailyAnalysis } from "@/types/brvm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const row = await supabaseSelectOne<DailyAnalysis>("daily_analyses", {
      order: "session_date",
      orderDesc: true,
      revalidate: 3600,
    });

    if (!row) {
      return NextResponse.json({ error: "Aucune analyse disponible" }, { status: 404 });
    }

    return NextResponse.json(row);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/market/analysis/latest]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
