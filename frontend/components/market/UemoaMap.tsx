import { formatVariation } from "@/lib/format";
import type { MarketSession, StockQuote } from "@/types/brvm";

interface UemoaMapProps {
  session: MarketSession;
  stocks?: StockQuote[];
}

// Known BRVM symbol → ISO country code
const SYMBOL_COUNTRY: Record<string, string> = {
  // Côte d'Ivoire
  BIDC: "CI", BOAN: "CI", BICICI: "CI", SIB: "CI", SIVC: "CI",
  SGCI: "CI", NSIE: "CI", NEIC: "CI", PALM: "CI", SOGB: "CI",
  SOGC: "CI", SVOC: "CI", SETAO: "CI", SIIC: "CI", SAPH: "CI",
  TOTAL: "CI", UNLC: "CI", SCRC: "CI", CABC: "CI", STBC: "CI",
  BSIC: "CI", ETIT: "CI", ABJM: "CI", CFAC: "CI", BNDC: "CI",
  CIEC: "CI", PRSC: "CI", SMBC: "CI", PALC: "CI", SHEC: "CI",
  SLBC: "CI", BOAC: "CI", SEMC: "CI", SDSC: "CI", STEC: "CI",
  NTIC: "CI", TTLC: "CI",
  // Sénégal
  SGBS: "SN", SNTS: "SN", BNDE: "SN", BICIS: "SN", CBSC: "SN",
  // Burkina Faso
  BOABF: "BF", ONTBF: "BF", SDTC: "BF",
  // Mali
  BDUM: "ML", BOAM: "ML",
  // Bénin
  BOAB: "BJ", EKAM: "BJ", ORGT: "BJ",
  // Togo
  NTGL: "TG", TOAC: "TG", SDTG: "TG",
  // Niger
  SONI: "NE",
};

// UEMOA countries — same simplified paths as before, enriched with SVG text coords
const COUNTRIES: {
  code: string;
  name: string;
  path: string;
  tx: number; // SVG text x
  ty: number; // SVG text y
}[] = [
  {
    code: "SN", name: "Sénégal",
    path: "M 0,54 L 0,45 L 4,36 L 14,35 L 19,40 L 20,51 L 18,57 L 12,59 L 7,58 L 2,59 Z",
    tx: 9, ty: 46,
  },
  {
    code: "GW", name: "Guinée-Bissau",
    path: "M 2,59 L 7,58 L 12,59 L 10,66 L 5,67 L 2,63 Z",
    tx: 6, ty: 62,
  },
  {
    code: "ML", name: "Mali",
    path: "M 19,40 L 20,35 L 15,18 L 20,8 L 43,2 L 70,5 L 72,30 L 70,47 L 55,54 L 45,54 L 38,60 L 30,57 L 22,54 Z",
    tx: 43, ty: 28,
  },
  {
    code: "BF", name: "Burkina Faso",
    path: "M 38,60 L 45,54 L 55,54 L 56,62 L 53,70 L 43,74 L 35,72 L 32,65 Z",
    tx: 44, ty: 64,
  },
  {
    code: "NE", name: "Niger",
    path: "M 55,54 L 70,47 L 72,30 L 80,10 L 96,5 L 110,8 L 110,52 L 90,60 L 76,60 L 66,52 L 56,62 Z",
    tx: 84, ty: 33,
  },
  {
    code: "CI", name: "Côte d'Ivoire",
    path: "M 22,54 L 30,57 L 38,60 L 32,65 L 35,72 L 32,82 L 22,88 L 14,84 L 12,72 L 14,62 Z",
    tx: 23, ty: 75,
  },
  {
    code: "TG", name: "Togo",
    path: "M 53,70 L 56,62 L 60,60 L 64,62 L 63,70 L 60,88 L 54,88 L 53,78 Z",
    tx: 58, ty: 77,
  },
  {
    code: "BJ", name: "Bénin",
    path: "M 64,62 L 76,60 L 78,68 L 74,82 L 66,88 L 60,88 L 63,70 Z",
    tx: 70, ty: 75,
  },
];

// Simplified neighboring non-UEMOA countries for geographic context
const NEIGHBORS = [
  // Mauritanie
  "M -2,54 L -2,30 L 0,20 L 0,45 L 4,36 L 14,35 L 19,40 L 22,54 L 14,62 Z",
  // Guinée
  "M 2,59 L 12,59 L 14,62 L 12,72 L 14,84 L 8,90 L 0,86 L -2,74 L -2,63 Z",
  // Sierra Leone / Liberia
  "M 14,84 L 22,88 L 26,93 L 16,94 L 8,90 Z",
  // Ghana
  "M 35,72 L 43,74 L 53,70 L 54,88 L 48,93 L 40,93 L 36,88 L 32,82 Z",
  // Nigeria
  "M 76,60 L 90,60 L 110,52 L 112,70 L 112,93 L 76,93 L 74,82 L 78,68 Z",
];

function countryStats(code: string, stocks: StockQuote[]) {
  const pool = stocks.filter((s) => {
    const mapped = SYMBOL_COUNTRY[s.symbol];
    return mapped === code;
  });
  if (!pool.length) return null;
  const avg = pool.reduce((s, x) => s + x.variation_pct, 0) / pool.length;
  return { count: pool.length, avg };
}

export function UemoaMap({ session, stocks = [] }: UemoaMapProps) {
  const compositeUp = session.composite.variation_pct >= 0;
  const variationStr = formatVariation(session.composite.variation_pct);

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
            Zone UEMOA
          </p>
          <p className="text-sm font-semibold text-foreground mt-0.5">
            8 pays membres
          </p>
        </div>
        <span
          className={`font-mono text-sm px-2.5 py-1 rounded border ${
            compositeUp
              ? "text-[var(--color-gain)] border-[var(--color-gain)]/30 bg-[var(--color-gain)]/10"
              : "text-[var(--color-loss)] border-[var(--color-loss)]/30 bg-[var(--color-loss)]/10"
          }`}
        >
          {variationStr}
        </span>
      </div>

      {/* SVG Map */}
      <svg
        viewBox="-2 -2 114 96"
        className="w-full h-auto"
        style={{ maxHeight: 200 }}
        aria-label="Carte UEMOA"
      >
        {/* Neighbor countries — muted fill */}
        {NEIGHBORS.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="var(--muted)"
            fillOpacity={0.35}
            stroke="var(--border)"
            strokeWidth={0.3}
            strokeOpacity={0.6}
          />
        ))}

        {/* UEMOA countries */}
        {COUNTRIES.map((c) => {
          const stats = countryStats(c.code, stocks);
          const avg = stats?.avg ?? session.composite.variation_pct;
          const up = avg >= 0;
          const fillColor = up ? "var(--color-gain)" : "var(--color-loss)";
          const count = stats?.count ?? 0;

          return (
            <g key={c.code}>
              <path
                d={c.path}
                fill={fillColor}
                fillOpacity={0.55}
                stroke="var(--border)"
                strokeWidth={0.3}
                strokeOpacity={0.4}
                strokeLinejoin="round"
                className="cursor-pointer transition-all duration-200"
              />
              {/* Country code */}
              <text
                x={c.tx}
                y={c.ty}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--foreground)"
                fontSize={3}
                fontWeight={600}
                className="pointer-events-none select-none"
              >
                {c.code}
              </text>
              {/* Stock count below code */}
              {count > 0 && (
                <text
                  x={c.tx}
                  y={c.ty + 3.5}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="var(--muted-foreground)"
                  fontSize={2}
                  className="pointer-events-none select-none"
                >
                  {count}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Stats row */}
      <div className="flex items-center gap-4 pt-1 border-t border-border">
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full inline-block"
            style={{ background: "var(--color-gain)" }}
          />
          {session.advancing} hausse{session.advancing !== 1 ? "s" : ""}
        </span>
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full inline-block"
            style={{ background: "var(--color-loss)" }}
          />
          {session.declining} baisse{session.declining !== 1 ? "s" : ""}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">
          {session.unchanged} stables
        </span>
      </div>
    </div>
  );
}
