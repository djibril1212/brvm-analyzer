"use client";

import Link from "next/link";
import { formatVariation } from "@/lib/format";
import type { SectorIndex, StockQuote } from "@/types/brvm";
import { ArrowRight } from "lucide-react";

interface SectorGridProps {
  sectors: SectorIndex[];
  stocks?: StockQuote[];
}

const SECTOR_LABELS: Record<string, string> = {
  Finance: "Finance",
  FINANCES: "Finance",
  "Services financiers": "Svcs Financiers",
  "SERVICES FINANCIERS": "Svcs Financiers",
  Agriculture: "Agriculture",
  AGRICULTURE: "Agriculture",
  Distribution: "Distribution",
  DISTRIBUTION: "Distribution",
  "Consommation de base": "Conso. Base",
  "CONSOMMATION DE BASE": "Conso. Base",
  "Consommation discrétionnaire": "Conso. Discr.",
  "CONSOMMATION DISCRÉTIONNAIRE": "Conso. Discr.",
  Industrie: "Industrie",
  Industriels: "Industriels",
  INDUSTRIE: "Industrie",
  INDUSTRIELS: "Industriels",
  Transport: "Transport",
  TRANSPORT: "Transport",
  "Services Publics": "Svcs Publics",
  "SERVICES PUBLICS": "Svcs Publics",
  "Services Pub.": "Svcs Publics",
  Télécommunication: "Télécom",
  TELECOMMUNICATION: "Télécom",
  Énergie: "Énergie",
  Energie: "Énergie",
  ENERGIE: "Énergie",
  Autres: "Autres",
  AUTRES: "Autres",
};

export function SectorGrid({ sectors }: SectorGridProps) {
  if (!sectors.length) return null;

  const sorted = [...sectors].sort((a, b) => b.variation_pct - a.variation_pct);
  const maxAbs = Math.max(...sorted.map((s) => Math.abs(s.variation_pct)), 1);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-0.5">
        <p className="section-label">Performance sectorielle</p>
        <Link
          href="/sectors"
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Voir tout
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Ranked bar chart */}
      <div className="space-y-1.5">
        {sorted.map((sector, i) => {
          const pct = sector.variation_pct;
          const up = pct > 0;
          const down = pct < 0;
          const label = SECTOR_LABELS[sector.name] ?? sector.name;
          const barPct = Math.abs(pct / maxAbs) * 85; // max 85% to leave breathing room
          const color = up
            ? "var(--color-gain)"
            : down
            ? "var(--color-loss)"
            : "hsl(var(--muted-foreground) / 0.4)";

          return (
            <div key={sector.name} className="flex items-center gap-3 group">
              {/* Rank */}
              <span className="w-4 text-right text-[10px] font-mono text-muted-foreground/40 tabular-nums shrink-0">
                {i + 1}
              </span>

              {/* Label */}
              <span className="w-36 text-[12px] text-foreground/70 truncate shrink-0 group-hover:text-foreground transition-colors duration-150" title={sector.name}>
                {label}
              </span>

              {/* Bar */}
              <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${barPct}%`, background: color }}
                />
              </div>

              {/* Value */}
              <span
                className="w-16 text-right text-[11px] font-mono font-semibold tabular-nums shrink-0"
                style={{ color }}
              >
                {formatVariation(pct)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
