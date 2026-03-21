import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * Webhook ISR — appelé par le pipeline backend après insertion en base.
 * Revalide la page principale pour refléter les nouvelles données.
 *
 * POST /api/revalidate
 * Header: x-revalidation-secret: <NEXT_REVALIDATION_SECRET>
 * Body: { "date": "2025-01-15" }
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-revalidation-secret");
  const expected = process.env.NEXT_REVALIDATION_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Secret invalide" }, { status: 401 });
  }

  try {
    // Revalide la page principale (dashboard)
    revalidatePath("/");

    const body = await req.json().catch(() => ({}));
    console.log(`[ISR] Page / revalidée pour la séance du ${body.date ?? "?"}`);

    return NextResponse.json({ revalidated: true, date: body.date });
  } catch (err) {
    console.error("[ISR] Erreur de revalidation :", err);
    return NextResponse.json({ error: "Erreur de revalidation" }, { status: 500 });
  }
}
