import { NextRequest, NextResponse } from "next/server";
import { createToken, makeSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  const expected = process.env.AUTH_PASSWORD;
  const secret = process.env.AUTH_SECRET;

  if (!expected || !secret) {
    return NextResponse.json(
      { error: "Auth non configurée" },
      { status: 500 }
    );
  }

  if (password !== expected) {
    return NextResponse.json(
      { error: "Mot de passe incorrect" },
      { status: 401 }
    );
  }

  const token = await createToken(secret);
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", makeSessionCookie(token));
  return res;
}
