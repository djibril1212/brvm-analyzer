"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatVariation, variationColor } from "@/lib/format";
import type { SectorIndex } from "@/types/brvm";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface SectorGridProps {
  sectors: SectorIndex[];
}

const SECTOR_LABELS: Record<string, string> = {
  "Finance": "Finance",
  "FINANCES": "Finance",
  "Agriculture": "Agriculture",
  "AGRICULTURE": "Agriculture",
  "Distribution": "Distribution",
  "DISTRIBUTION": "Distribution",
  "Industrie": "Industrie",
  "INDUSTRIE": "Industrie",
  "Transport": "Transport",
  "TRANSPORT": "Transport",
  "Services Publics": "Services Pub.",
  "SERVICES PUBLICS": "Services Pub.",
  "Autres": "Autres",
  "AUTRES": "Autres",
};

export function SectorGrid({ sectors }: SectorGridProps) {
  if (!sectors.length) return null;

  const sorted = [...sectors].sort((a, b) => b.variation_pct - a.variation_pct);

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
        Secteurs
      </p>
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
        {sorted.map((sector) => {
          const up = sector.variation_pct > 0;
          const down = sector.variation_pct < 0;
          const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
          const label = SECTOR_LABELS[sector.name] ?? sector.name;

          return (
            <Card
              key={sector.name}
              className={`bg-card border-border ${
                up
                  ? "border-emerald-400/20"
                  : down
                  ? "border-red-400/20"
                  : ""
              }`}
            >
              <CardContent className="px-3 py-3 space-y-1.5">
                <p
                  className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide truncate"
                  title={sector.name}
                >
                  {label}
                </p>
                <div
                  className={`flex items-center gap-1 ${variationColor(
                    sector.variation_pct
                  )}`}
                >
                  <Icon className="h-3 w-3 shrink-0" />
                  <span className="font-mono text-sm font-semibold tabular-nums">
                    {formatVariation(sector.variation_pct)}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
