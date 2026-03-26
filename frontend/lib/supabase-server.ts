/**
 * lib/supabase-server.ts
 * Helper léger pour interroger Supabase via REST API (sans SDK).
 * SERVER-SIDE ONLY — ne jamais importer côté client.
 *
 * Variables d'environnement requises :
 *   NEXT_PUBLIC_SUPABASE_URL  — URL du projet Supabase
 *   SUPABASE_SERVICE_ROLE_KEY — clé service (lecture + écriture, RLS bypassé)
 *
 * Pour les routes publiques (lecture seule) on peut aussi utiliser
 * NEXT_PUBLIC_SUPABASE_ANON_KEY si RLS autorise la lecture publique.
 */

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? SERVICE_KEY;

function headers(useService = false) {
  const key = useService ? SERVICE_KEY : ANON_KEY;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

function endpoint(table: string) {
  return `${SUPABASE_URL}/rest/v1/${table}`;
}

/** Paramètres optionnels pour une requête SELECT */
interface SelectOptions {
  /** Filtre au format PostgREST : ex. { session_date: "eq.2024-01-15" } */
  filters?: Record<string, string>;
  /** Colonnes à retourner, ex "session_date,close,symbol" */
  select?: string;
  /** Colonne de tri */
  order?: string;
  /** Sens du tri */
  orderDesc?: boolean;
  /** Nombre max de lignes */
  limit?: number;
  /** Utiliser la service key (ignore RLS) */
  useService?: boolean;
  /** Secondes de revalidation Next.js ISR */
  revalidate?: number;
}

/**
 * SELECT générique sur une table Supabase via REST.
 * Retourne le tableau de résultats (jamais null).
 */
export async function supabaseSelect<T = Record<string, unknown>>(
  table: string,
  options: SelectOptions = {}
): Promise<T[]> {
  const {
    filters = {},
    select,
    order,
    orderDesc = true,
    limit,
    useService = false,
    revalidate,
  } = options;

  const url = new URL(endpoint(table));
  if (select) url.searchParams.set("select", select);
  if (order) url.searchParams.set("order", `${order}.${orderDesc ? "desc" : "asc"}`);
  if (limit) url.searchParams.set("limit", String(limit));
  for (const [col, val] of Object.entries(filters)) {
    url.searchParams.set(col, val);
  }

  const fetchOptions: RequestInit = {
    headers: headers(useService),
  };
  if (revalidate !== undefined) {
    (fetchOptions as RequestInit & { next?: { revalidate: number } }).next = {
      revalidate,
    };
  }

  const res = await fetch(url.toString(), fetchOptions);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[supabase] SELECT ${table} → HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<T[]>;
}

/**
 * SELECT avec une seule ligne attendue — retourne null si vide.
 */
export async function supabaseSelectOne<T = Record<string, unknown>>(
  table: string,
  options: SelectOptions = {}
): Promise<T | null> {
  const rows = await supabaseSelect<T>(table, { ...options, limit: 1 });
  return rows[0] ?? null;
}
