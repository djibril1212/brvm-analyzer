import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Vercel Cron Job — Déclenche le pipeline BRVM via GitHub Actions.
 *
 * Vercel injecte automatiquement Authorization: Bearer <CRON_SECRET>
 * dans chaque requête cron. On vérifie ce header pour rejeter
 * toute tentative d'appel externe.
 *
 * Schedules (définis dans vercel.json) :
 *   30 18 * * 1-5  →  18h30 UTC, lun-ven  (fin de séance BRVM)
 *    0  8 * * 2-6  →  08h00 UTC, mar-sam  (rattrapage BOC tardif)
 *
 * Variables d'environnement requises (Vercel dashboard) :
 *   CRON_SECRET       — auto-généré par Vercel
 *   GITHUB_TOKEN      — Personal Access Token avec scope "repo" ou "workflow"
 *   GITHUB_OWNER      — ex: djibrilabaltou
 *   GITHUB_REPO       — ex: brvm-analyzer
 */
export async function GET(req: NextRequest) {
  // ── Vérification Vercel Cron ───────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[cron/pipeline] Accès non autorisé");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Vérification config ────────────────────────────────────────────────────
  const githubToken = process.env.GITHUB_TOKEN;
  const githubOwner = process.env.GITHUB_OWNER;
  const githubRepo = process.env.GITHUB_REPO;

  if (!githubToken || !githubOwner || !githubRepo) {
    console.error("[cron/pipeline] GITHUB_TOKEN, GITHUB_OWNER ou GITHUB_REPO manquant");
    return NextResponse.json(
      { error: "Configuration incomplète — vérifier GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO dans Vercel" },
      { status: 500 }
    );
  }

  // ── Déclenchement GitHub Actions workflow_dispatch ─────────────────────────
  const endpoint = `https://api.github.com/repos/${githubOwner}/${githubRepo}/actions/workflows/daily_pipeline.yml/dispatches`;
  console.log(`[cron/pipeline] POST ${endpoint}`);

  try {
    const ghRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${githubToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: "main" }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!ghRes.ok) {
      const err = await ghRes.text();
      console.error(`[cron/pipeline] GitHub Actions erreur ${ghRes.status}:`, err);
      return NextResponse.json(
        { error: "GitHub Actions a retourné une erreur", status: ghRes.status, detail: err },
        { status: 502 }
      );
    }

    // GitHub répond 204 No Content en cas de succès
    const triggeredAt = new Date().toISOString();
    console.log("[cron/pipeline] Pipeline GitHub Actions déclenché ✓", triggeredAt);
    return NextResponse.json({ ok: true, triggered_at: triggeredAt });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/pipeline] Impossible de joindre GitHub Actions:", message);
    return NextResponse.json(
      { error: "GitHub Actions injoignable", detail: message },
      { status: 503 }
    );
  }
}
