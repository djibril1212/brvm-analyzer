/**
 * Proxy sécurisé vers le backend pipeline.
 * Ajoute le header X-Pipeline-Secret côté serveur (jamais exposé au client).
 */
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
const PIPELINE_SECRET = process.env.PIPELINE_SECRET ?? "";

function pipelineHeaders(): Record<string, string> {
  return {
    "X-Pipeline-Secret": PIPELINE_SECRET,
  };
}

// POST /api/admin/pipeline?action=trigger-sync|status
export async function POST(req: NextRequest) {
  if (!API_BASE || !PIPELINE_SECRET) {
    return NextResponse.json(
      { error: "Configuration serveur manquante (API_BASE ou PIPELINE_SECRET)" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") ?? "trigger-sync";

  // Upload mode: forward multipart form to trigger-upload
  const contentType = req.headers.get("content-type") ?? "";
  if (action === "trigger-upload" && contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const res = await fetch(`${API_BASE}/api/pipeline/trigger-upload`, {
      method: "POST",
      headers: pipelineHeaders(),
      body: formData,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  }

  // Sync trigger (JSON body)
  const body = await req.json();
  const res = await fetch(`${API_BASE}/api/pipeline/trigger-sync`, {
    method: "POST",
    headers: {
      ...pipelineHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

// GET /api/admin/pipeline?date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  if (!API_BASE || !PIPELINE_SECRET) {
    return NextResponse.json(
      { error: "Configuration serveur manquante" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "Paramètre date manquant" }, { status: 400 });
  }

  const res = await fetch(`${API_BASE}/api/pipeline/status/${date}`, {
    headers: pipelineHeaders(),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
