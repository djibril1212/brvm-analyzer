"use client";

import { formatVariation } from "@/lib/format";
import type { SectorIndex, StockQuote } from "@/types/brvm";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

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

const SECTOR_KEYWORDS: Record<string, string[]> = {
  Finance: ["banque", "bank", "assur", "financ", "crédit", "caisse", "bourse"],
  Agriculture: ["agri", "cacao", "café", "palm", "sucr", "coton", "hévéa"],
  Distribution: ["distribut", "commerce", "bolloré", "saph", "sphc"],
  Industrie: ["industr", "ciment", "brasseri", "bière", "pharmaceut"],
  Transport: ["transport", "air", "port", "logist", "sdsc"],
  "Services Publics": ["électric", "eau", "ciec", "sonabel", "senelec"],
  Télécommunication: ["télécom", "onatel", "orange", "mobile", "ttls"],
  Énergie: ["pétrole", "gaz", "raffinerie", "total", "vivo", "ttlc"],
};

function getBestPerformer(sectorName: string, stocks: StockQuote[]) {
  const keywords = SECTOR_KEYWORDS[sectorName] ?? [];
  if (!keywords.length) return null;
  const pool = stocks.filter((s) =>
    keywords.some((kw) => s.name.toLowerCase().includes(kw))
  );
  if (!pool.length) return null;
  return pool.reduce((best, s) =>
    Math.abs(s.variation_pct) > Math.abs(best.variation_pct) ? s : best
  );
}

function getSectorStockCount(sectorName: string, stocks: StockQuote[]) {
  const keywords = SECTOR_KEYWORDS[sectorName] ?? [];
  return keywords.length
    ? stocks.filter((s) =>
        keywords.some((kw) => s.name.toLowerCase().includes(kw))
      ).length
    : 0;
}

export function SectorGrid({ sectors, stocks = [] }: SectorGridProps) {
  if (!sectors.length) return null;

  const sorted = [...sectors].sort((a, b) => b.variation_pct - a.variation_pct);

  return (
    <div>
      <p className="text-sm font-semibold text-foreground mb-3">
        Performance par secteur
      </p>
      <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {sorted.map((sector) => {
          const up = sector.variation_pct > 0;
          const down = sector.variation_pct < 0;
          const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
          const label = SECTOR_LABELS[sector.name] ?? sector.name;
          const best = getBestPerformer(sector.name, stocks);
          const count = getSectorStockCount(sector.name, stocks);

          const accentColor = up
            ? "var(--color-gain)"
            : down
            ? "var(--color-loss)"
            : "hsl(var(--muted-foreground))";

          return (
            <div
              key={sector.name}
              className="group relative p-3.5 flex flex-col gap-2 min-w-0 rounded-xl border border-border bg-card hover:shadow-md hover:scale-[1.02] hover:border-primary/30 transition-all duration-200 cursor-pointer overflow-hidden"
            >
              {/* Gradient accent strip */}
              <div
                className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl transition-opacity duration-200 opacity-60 group-hover:opacity-100"
                style={{ background: accentColor }}
              />

              {/* Top row */}
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate"
                  title={sector.name}
                >
                  {label}
                </span>
                <Icon
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: accentColor }}
                />
              </div>

              {/* Variation value */}
              <p
                className="font-mono text-lg font-bold leading-tight tabular-nums"
                style={{ color: accentColor }}
              >
                {formatVariation(sector.variation_pct)}
              </p>

              {/* Bottom row */}
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] text-muted-foreground">
                  {count > 0 ? `${count} valeur${count > 1 ? "s" : ""}` : ""}
                </span>
                {best && (
                  <span
                    className="text-[10px] font-mono truncate"
                    style={{
                      color:
                        best.variation_pct > 0
                          ? "var(--color-gain)"
                          : best.variation_pct < 0
                          ? "var(--color-loss)"
                          : "hsl(var(--muted-foreground))",
                    }}
                  >
                    {best.symbol}{" "}
                    {best.variation_pct > 0 ? "+" : ""}
                    {best.variation_pct.toFixed(2)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
