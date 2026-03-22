import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLatestSession } from "@/lib/api";
import { formatVariation, variationBg, formatSessionDate, formatCFA } from "@/lib/format";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Sociétés — BRVM Daily Analyzer",
  description: "Tous les titres cotés sur la BRVM avec leurs cours et variations.",
};

async function StocksContent() {
  const session = await getLatestSession();
  const stocks = [...(session.stocks ?? [])].sort((a, b) =>
    a.symbol.localeCompare(b.symbol)
  );

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
          Sociétés cotées
        </h1>
        <p className="text-muted-foreground text-sm">
          {stocks.length} valeurs · Séance du {formatSessionDate(session.session_date)}
        </p>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 mb-5 px-1">
        <div className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: "var(--color-gain)" }}
          />
          <span className="text-xs text-muted-foreground">
            <span className="text-gain font-mono font-semibold">{session.advancing}</span> en hausse
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: "var(--color-loss)" }}
          />
          <span className="text-xs text-muted-foreground">
            <span className="text-loss font-mono font-semibold">{session.declining}</span> en baisse
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          <span className="font-mono font-semibold">{session.unchanged}</span> stables
        </div>
      </div>

      {/* Table */}
      <Card className="bg-card border-border overflow-hidden">
        <CardContent className="p-0">
          {/* Header row */}
          <div className="grid grid-cols-[80px_1fr_90px_80px_80px_80px] gap-0 border-b border-border px-4 py-2.5 bg-muted/30">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Symbole</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Société</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium text-right">Cours</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium text-right">Var.</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium text-right hidden sm:block">Volume</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium text-right hidden sm:block">PER</span>
          </div>

          {/* Stock rows */}
          {stocks.map((stock) => (
            <Link
              key={stock.symbol}
              href={`/stock/${stock.symbol}`}
              className="grid grid-cols-[80px_1fr_90px_80px_80px_80px] gap-0 items-center border-b border-border/50 last:border-b-0 px-4 py-3 hover:bg-muted/20 transition-colors"
            >
              <span className="font-mono text-sm font-semibold text-foreground">
                {stock.symbol}
              </span>
              <span className="text-xs text-muted-foreground truncate pr-3">
                {stock.name}
              </span>
              <span className="font-mono text-sm text-foreground text-right tabular-nums">
                {stock.close.toLocaleString("fr-FR")}
              </span>
              <div className="text-right">
                <Badge
                  variant="outline"
                  className={`font-mono text-[10px] px-1.5 py-0 h-5 border ${variationBg(stock.variation_pct)}`}
                >
                  {formatVariation(stock.variation_pct)}
                </Badge>
              </div>
              <span className="font-mono text-xs text-muted-foreground text-right tabular-nums hidden sm:block">
                {stock.volume ? stock.volume.toLocaleString("fr-FR") : "—"}
              </span>
              <span className="font-mono text-xs text-muted-foreground text-right hidden sm:block">
                {stock.per ? stock.per.toFixed(1) + "×" : "—"}
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground/50 mt-5 leading-relaxed">
        Cliquez sur un titre pour voir son historique et ses fondamentaux.
        Les analyses ne constituent pas un conseil en investissement.
      </p>
    </div>
  );
}

export default function StocksPage() {
  return (
    <Suspense
      fallback={
        <div className="px-6 py-10 text-muted-foreground text-sm animate-pulse">
          Chargement des sociétés…
        </div>
      }
    >
      <StocksContent />
    </Suspense>
  );
}
