/**
 * Auth utilitaires — compatible Edge Runtime (Web Crypto API).
 * Stocke un cookie signé HMAC-SHA256 pour valider la session.
 */

export const SESSION_COOKIE = "brvm_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 jours

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toBase64url(buf: ArrayBuffer): string {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/** Crée un token signé `ts.hmac` */
export async function createToken(secret: string): Promise<string> {
  const ts = Date.now().toString();
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`auth:${ts}`)
  );
  return `${ts}.${toBase64url(sig)}`;
}

/** Vérifie un token et retourne true si valide et non expiré */
export async function verifyToken(
  token: string,
  secret: string
): Promise<boolean> {
  try {
    const [ts, sig] = token.split(".");
    if (!ts || !sig) return false;

    // Vérifier l'âge (30 jours)
    const age = (Date.now() - Number(ts)) / 1000;
    if (age > SESSION_MAX_AGE || age < 0) return false;

    // Vérifier la signature
    const key = await getKey(secret);
    const sigBytes = Uint8Array.from(
      atob(sig.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    );
    return crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      new TextEncoder().encode(`auth:${ts}`)
    );
  } catch {
    return false;
  }
}

/** Cookie header pour set-cookie */
export function makeSessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${
    process.env.NODE_ENV === "production" ? "; Secure" : ""
  }`;
}

/** Cookie header pour effacer la session */
export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}
