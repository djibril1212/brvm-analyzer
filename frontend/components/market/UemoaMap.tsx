import { Badge } from "@/components/ui/badge";
import { formatVariation } from "@/lib/format";
import type { MarketSession } from "@/types/brvm";

interface UemoaMapProps {
  session: MarketSession;
}

// Simplified SVG paths for UEMOA countries — viewBox="-2 -2 114 96"
const COUNTRIES = [
  {
    code: "SN", name: "Sénégal",
    path: "M 0,54 L 0,45 L 4,36 L 14,35 L 19,40 L 20,51 L 18,57 L 12,59 L 7,58 L 2,59 Z",
  },
  {
    code: "GW", name: "Guinée-Bissau",
    path: "M 2,59 L 7,58 L 12,59 L 10,66 L 5,67 L 2,63 Z",
  },
  {
    code: "ML", name: "Mali",
    path: "M 19,40 L 20,35 L 15,18 L 20,8 L 43,2 L 70,5 L 72,30 L 70,47 L 55,54 L 45,54 L 38,60 L 30,57 L 22,54 Z",
  },
  {
    code: "BF", name: "Burkina Faso",
    path: "M 38,60 L 45,54 L 55,54 L 56,62 L 53,70 L 43,74 L 35,72 L 32,65 Z",
  },
  {
    code: "NE", name: "Niger",
    path: "M 55,54 L 70,47 L 72,30 L 80,10 L 96,5 L 110,8 L 110,52 L 90,60 L 76,60 L 66,52 L 56,62 Z",
  },
  {
    code: "CI", name: "Côte d'Ivoire",
    path: "M 22,54 L 30,57 L 38,60 L 32,65 L 35,72 L 32,82 L 22,88 L 14,84 L 12,72 L 14,62 Z",
  },
  {
    code: "TG", name: "Togo",
    path: "M 53,70 L 56,62 L 60,60 L 64,62 L 63,70 L 60,88 L 54,88 L 53,78 Z",
  },
  {
    code: "BJ", name: "Bénin",
    path: "M 64,62 L 76,60 L 78,68 L 74,82 L 66,88 L 60,88 L 63,70 Z",
  },
];

export function UemoaMap({ session }: UemoaMapProps) {
  const up = session.composite.variation_pct >= 0;
  const fillColor = up ? "#16a34a" : "#dc2626";
  const fillOpacity = 0.55;
  const strokeColor = up ? "#15803d" : "#b91c1c";

  const variationStr = formatVariation(session.composite.variation_pct);

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
            Zone UEMOA
          </p>
          <p className="text-sm font-semibold text-foreground mt-0.5">
            8 pays membres
          </p>
        </div>
        <Badge
          variant="outline"
          className={`font-mono text-sm px-2.5 py-1 border ${
            up
              ? "text-[var(--color-gain)] border-[var(--color-gain)]/30 bg-[var(--color-gain)]/10"
              : "text-[var(--color-loss)] border-[var(--color-loss)]/30 bg-[var(--color-loss)]/10"
          }`}
        >
          {variationStr}
        </Badge>
      </div>

      {/* SVG Map */}
      <div className="relative">
        <svg
          viewBox="-2 -2 114 96"
          className="w-full"
          style={{ maxHeight: 180 }}
          aria-label="Carte UEMOA"
        >
          {/* Country paths */}
          {COUNTRIES.map((c) => (
            <g key={c.code}>
              <path
                d={c.path}
                fill={fillColor}
                fillOpacity={fillOpacity}
                stroke={strokeColor}
                strokeOpacity={0.6}
                strokeWidth={0.6}
                strokeLinejoin="round"
              />
              {/* Country code label — positioned at centroid approximation */}
            </g>
          ))}
        </svg>

        {/* Country code overlays */}
        <div className="absolute inset-0 pointer-events-none">
          {[
            { code: "SN", l: "8%",  t: "43%" },
            { code: "GW", l: "3%",  t: "63%" },
            { code: "ML", l: "37%", t: "40%" },
            { code: "BF", l: "42%", t: "64%" },
            { code: "NE", l: "73%", t: "40%" },
            { code: "CI", l: "22%", t: "78%" },
            { code: "TG", l: "52%", t: "78%" },
            { code: "BJ", l: "62%", t: "74%" },
          ].map((c) => (
            <span
              key={c.code}
              className="absolute text-[7px] font-mono font-semibold"
              style={{
                left: c.l,
                top: c.t,
                transform: "translate(-50%, -50%)",
                color: "white",
                textShadow: "0 0 3px rgba(0,0,0,0.5)",
              }}
            >
              {c.code}
            </span>
          ))}
        </div>
      </div>

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
