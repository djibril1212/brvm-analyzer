"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatVariation, variationColor } from "@/lib/format";
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
  "Télécommunication": "Télécom",
  TELECOMMUNICATION: "Télécom",
  Énergie: "Énergie",
  Energie: "Énergie",
  ENERGIE: "Énergie",
  Autres: "Autres",
  AUTRES: "Autres",
};

// Keywords per sector for best-performer lookup
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

function getBestPerformer(
  sectorName: string,
  stocks: StockQuote[]
): { symbol: string; variation_pct: number } | null {
  if (!stocks.length) return null;
  const keywords = SECTOR_KEYWORDS[sectorName] ?? [];
  const sectorStocks =
    keywords.length > 0
      ? stocks.filter((s) =>
          keywords.some((kw) => s.name.toLowerCase().includes(kw))
        )
      : [];

  // Use sector-matched stocks or fallback to all (just show best of session)
  const pool = sectorStocks.length > 0 ? sectorStocks : null;
  if (!pool) return null;

  return pool.reduce((best, s) =>
    Math.abs(s.variation_pct) > Math.abs(best.variation_pct) ? s : best
  );
}

export function SectorGrid({ sectors, stocks = [] }: SectorGridProps) {
  if (!sectors.length) return null;

  const sorted = [...sectors].sort((a, b) => b.variation_pct - a.variation_pct);

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
        Performance par secteur
      </p>
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {sorted.map((sector) => {
          const up = sector.variation_pct > 0;
          const down = sector.variation_pct < 0;
          const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
          const label = SECTOR_LABELS[sector.name] ?? sector.name;
          const best = getBestPerformer(sector.name, stocks);

          return (
            <Card
              key={sector.name}
              className={`bg-card border-border ${
                up
                  ? "border-l-2 border-l-emerald-400/40"
                  : down
                  ? "border-l-2 border-l-red-400/40"
                  : ""
              }`}
            >
              <CardContent className="px-3 py-3 space-y-2">
                <p
                  className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide truncate"
                  title={sector.name}
                >
                  {label}
                </p>
                <div className={`flex items-center gap-1 ${variationColor(sector.variation_pct)}`}>
                  <Icon className="h-3 w-3 shrink-0" />
                  <span className="font-mono text-sm font-semibold tabular-nums">
                    {formatVariation(sector.variation_pct)}
                  </span>
                </div>
                {best && (
                  <div className="flex items-center justify-between pt-1 border-t border-border/50">
                    <span className="font-mono text-[10px] text-gold">
                      {best.symbol}
                    </span>
                    <span
                      className={`font-mono text-[10px] tabular-nums font-medium ${variationColor(best.variation_pct)}`}
                    >
                      {formatVariation(best.variation_pct)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
