import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLatestSession } from "@/lib/api";
import { formatVariation, variationBg, formatSessionDate, formatCFA } from "@/lib/format";
import type { Metadata } from "next";
import type { StockQuote } from "@/types/brvm";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Secteurs — BRVM Daily Analyzer",
  description: "Performance comparée des 7 secteurs de la BRVM.",
};

// Mapping secteur → symboles BRVM connus
const SECTOR_SYMBOLS: Record<string, string[]> = {
  Finance: ["SGCI", "SGBS", "BICICI", "BICIS", "SIB", "BSIC", "BNDE", "CBSC", "BOAC", "BOAB", "BOABF", "BOAM", "BDUM", "BIDC", "BOAN", "SMBC", "BNDC", "SLBC"],
  Agriculture: ["PALM", "PALC", "SAPH", "SOGB", "SOGC", "CFAC", "SIVC", "SCRC", "CABC"],
  Distribution: ["TTLC", "TOTAL", "SVOC", "UNLC", "STBC"],
  Industrie: ["ABJM", "SEMC", "SDSC", "STEC", "PRSC", "SHEC"],
  Transport: ["SDSC", "SETAO"],
  "Services Publics": ["CIEC", "NSIE", "NTIC", "SIIC", "NEIC"],
  Télécommunication: ["ETIT", "SNTS", "ONTBF", "NTGL"],
  Énergie: ["TTLC", "TOTAL"],
};

function getSectorStocks(sectorName: string, stocks: StockQuote[]): StockQuote[] {
  const symbols = SECTOR_SYMBOLS[sectorName] ?? [];
  if (!symbols.length) return [];
  return stocks.filter((s) => symbols.includes(s.symbol));
}

function SectorBar({ value, max }: { value: number; max: number }) {
  const pct = max === 0 ? 0 : Math.abs(value / max) * 100;
  const up = value >= 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: up ? "var(--color-gain)" : "var(--color-loss)",
          }}
        />
      </div>
      <span
        className="font-mono text-xs font-semibold tabular-nums w-16 text-right"
        style={{ color: up ? "var(--color-gain)" : "var(--color-loss)" }}
      >
        {formatVariation(value)}
      </span>
    </div>
  );
}

async function SectorsContent() {
  const session = await getLatestSession();
  const stocks = session.stocks ?? [];
  const sectors = [...(session.sectors ?? [])].sort(
    (a, b) => b.variation_pct - a.variation_pct
  );

  const maxAbs = Math.max(...sectors.map((s) => Math.abs(s.variation_pct)), 1);

  return (
    <div className="px-4 sm:px-6 py-5 pb-20 max-w-5xl mx-auto">
      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au tableau de bord
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-foreground mb-1">
          Secteurs
        </h1>
        <p className="text-muted-foreground text-sm">
          Performance des {sectors.length} secteurs · Séance du{" "}
          {formatSessionDate(session.session_date)}
        </p>
      </div>

      {/* Ranking bar chart */}
      <Card className="bg-card border-border mb-6">
        <CardContent className="pt-4 pb-4 px-5">
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-4">
            Classement par performance
          </p>
          <div className="space-y-3">
            {sectors.map((sector, i) => {
              const up = sector.variation_pct > 0;
              const down = sector.variation_pct < 0;
              const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
              return (
                <div key={sector.name} className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-muted-foreground w-4 text-right">
                    {i + 1}
                  </span>
                  <div className="flex items-center gap-1.5 w-32 shrink-0">
                    <Icon
                      className="h-3 w-3 shrink-0"
                      style={{
                        color: up
                          ? "var(--color-gain)"
                          : down
                            ? "var(--color-loss)"
                            : "hsl(var(--muted-foreground))",
                      }}
                    />
                    <span className="text-xs text-foreground truncate">
                      {sector.name}
                    </span>
                  </div>
                  <div className="flex-1">
                    <SectorBar value={sector.variation_pct} max={maxAbs} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detailed sector cards */}
      <div className="space-y-4">
        {sectors.map((sector) => {
          const sectorStocks = getSectorStocks(sector.name, stocks);
          const up = sector.variation_pct > 0;
          const down = sector.variation_pct < 0;
          const accentColor = up
            ? "var(--color-gain)"
            : down
              ? "var(--color-loss)"
              : "hsl(var(--muted-foreground))";

          return (
            <Card key={sector.name} className="bg-card border-border overflow-hidden">
              {/* Top accent line */}
              <div
                className="h-0.5"
                style={{ background: accentColor }}
              />
              <CardContent className="pt-4 pb-0 px-5">
                {/* Sector header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-semibold text-foreground text-base">
                      {sector.name}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {sectorStocks.length > 0
                        ? `${sectorStocks.length} valeur${sectorStocks.length > 1 ? "s" : ""}`
                        : "Données sectorielles"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className="font-mono text-2xl font-bold tabular-nums"
                      style={{ color: accentColor }}
                    >
                      {formatVariation(sector.variation_pct)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sector.value.toLocaleString("fr-FR", {
                        maximumFractionDigits: 2,
                      })} pts
                    </p>
                  </div>
                </div>

                {/* Stocks in this sector */}
                {sectorStocks.length > 0 && (
                  <div className="border-t border-border">
                    {sectorStocks
                      .sort((a, b) => b.variation_pct - a.variation_pct)
                      .map((s) => (
                        <Link
                          key={s.symbol}
                          href={`/stock/${s.symbol}`}
                          className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-b-0 hover:bg-muted/30 -mx-5 px-5 transition-colors"
                        >
                          <span className="font-mono text-xs font-semibold text-foreground w-14 shrink-0">
                            {s.symbol}
                          </span>
                          <span className="flex-1 text-xs text-muted-foreground truncate">
                            {s.name}
                          </span>
                          <span className="font-mono text-xs text-foreground tabular-nums shrink-0">
                            {s.close.toLocaleString("fr-FR")}
                          </span>
                          <Badge
                            variant="outline"
                            className={`font-mono text-[10px] px-1.5 py-0 h-5 border shrink-0 ${variationBg(s.variation_pct)}`}
                          >
                            {formatVariation(s.variation_pct)}
                          </Badge>
                          {s.value_traded && s.value_traded > 0 && (
                            <span className="text-[10px] text-muted-foreground font-mono w-20 text-right shrink-0 hidden sm:block">
                              {formatCFA(s.value_traded, true)}
                            </span>
                          )}
                        </Link>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground/50 mt-6 leading-relaxed">
        Les analyses présentées ne constituent pas un conseil en investissement.
        Investir comporte des risques de perte en capital.
      </p>
    </div>
  );
}

export default function SectorsPage() {
  return (
    <Suspense
      fallback={
        <div className="px-6 py-10 text-muted-foreground text-sm animate-pulse">
          Chargement des secteurs…
        </div>
      }
    >
      <SectorsContent />
    </Suspense>
  );
}
