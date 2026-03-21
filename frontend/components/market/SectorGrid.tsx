"use client";

import { Card } from "@/components/ui/card";
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

function getBestPerformer(
  sectorName: string,
  stocks: StockQuote[]
): { symbol: string; variation_pct: number } | null {
  if (!stocks.length) return null;
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

function getSectorStockCount(sectorName: string, stocks: StockQuote[]): number {
  const keywords = SECTOR_KEYWORDS[sectorName] ?? [];
  if (!keywords.length) return 0;
  return stocks.filter((s) =>
    keywords.some((kw) => s.name.toLowerCase().includes(kw))
  ).length;
}

export function SectorGrid({ sectors, stocks = [] }: SectorGridProps) {
  if (!sectors.length) return null;

  const sorted = [...sectors].sort((a, b) => b.variation_pct - a.variation_pct);

  return (
    <div>
      <p className="text-[14px] font-medium text-foreground mb-3">
        Performance par secteur
      </p>
      <div className="grid gap-[10px] grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {sorted.map((sector) => {
          const up = sector.variation_pct > 0;
          const down = sector.variation_pct < 0;
          const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
          const label = SECTOR_LABELS[sector.name] ?? sector.name;
          const best = getBestPerformer(sector.name, stocks);
          const count = getSectorStockCount(sector.name, stocks);

          return (
            <Card
              key={sector.name}
              className="p-3 flex flex-col gap-2 min-w-0 bg-card border-white/[0.07] rounded-lg"
            >
              {/* Top row: name + trend icon */}
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-[11px] text-muted-foreground uppercase tracking-wide truncate"
                  title={sector.name}
                >
                  {label}
                </span>
                <Icon
                  className={`h-3.5 w-3.5 shrink-0 ${variationColor(
                    sector.variation_pct
                  )}`}
                />
              </div>

              {/* Variation — main value */}
              <p
                className={`font-mono text-[18px] font-semibold leading-tight tabular-nums ${variationColor(
                  sector.variation_pct
                )}`}
              >
                {formatVariation(sector.variation_pct)}
              </p>

              {/* Bottom row: stock count + best performer */}
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] text-muted-foreground">
                  {count > 0 ? `${count} valeur${count > 1 ? "s" : ""}` : ""}
                </span>
                {best && (
                  <span
                    className={`text-[11px] font-mono truncate ${variationColor(
                      best.variation_pct
                    )}`}
                  >
                    {best.symbol}{" "}
                    {best.variation_pct > 0 ? "+" : ""}
                    {best.variation_pct.toFixed(2)}%
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
