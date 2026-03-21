/**
 * Vercel Cron Job — déclenche le scrape live BRVM sur Railway.
 * Appelé toutes les 5 minutes pendant la séance (9h-14h UTC, lun-ven).
 * Vercel envoie automatiquement Authorization: Bearer CRON_SECRET.
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";

const RAILWAY_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const CRON_SECRET = process.env.CRON_SECRET ?? "";

export async function GET(request: Request) {
  // Vercel envoie le secret automatiquement en production
  const auth = request.headers.get("authorization");
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const res = await fetch(`${RAILWAY_URL}/api/market/live/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": CRON_SECRET,
      },
      signal: AbortSignal.timeout(25_000),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("[cron/live-scrape] Railway error", res.status, body);
      return Response.json({ ok: false, status: res.status, body }, { status: 500 });
    }

    console.log("[cron/live-scrape]", body);
    return Response.json({ ok: true, ...body });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/live-scrape] fetch error:", message);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
