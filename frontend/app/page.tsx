import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { UemoaMap } from "@/components/market/UemoaMap";
import { KpiGrid } from "@/components/market/KpiGrid";
import { StockTabs } from "@/components/market/StockTabs";
import { SectorGrid } from "@/components/market/SectorGrid";
import { AnalysisSection } from "@/components/market/AnalysisSection";
import { MarketSidebar } from "@/components/market/MarketSidebar";
import { TickerTape } from "@/components/market/TickerTape";
import { SearchCommand } from "@/components/market/SearchCommand";
import { LiveBadge } from "@/components/market/LiveBadge";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { DashboardSkeleton } from "@/components/market/LoadingSkeleton";
import { getLatestSession, getLatestAnalysis } from "@/lib/api";
import { formatSessionDate, formatVariation, sentimentLabel } from "@/lib/format";
import type { MarketSession } from "@/types/brvm";

// ISR : revalidation via webhook (pipeline déclenche /api/revalidate)
export const revalidate = 86400;

async function DashboardContent() {
  const [session, analysis] = await Promise.allSettled([
    getLatestSession(),
    getLatestAnalysis(),
  ]);

  if (session.status === "rejected") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-center px-4">
        <p className="text-muted-foreground text-sm">
          Données de marché indisponibles pour le moment.
        </p>
        <p className="text-xs text-muted-foreground/60">
          Le pipeline quotidien s&apos;exécute à 18h30 UTC (jours ouvrés BRVM).
        </p>
      </div>
    );
  }

  const s: MarketSession = session.value;
  const stocks = s.stocks ?? [];
  const sectors = s.sectors ?? [];

  const pct = s.composite.variation_pct;
  const compositeUp = pct >= 0;
  const variationStr = formatVariation(pct);

  const sentiment =
    analysis.status === "fulfilled"
      ? (analysis.value.market_sentiment as string)
      : null;

  return (
    <>
      {/* Fixed bottom ticker */}
      {stocks.length > 0 && <TickerTape stocks={stocks} />}

      {/* ── Sticky top header ── */}
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 bg-background/80 backdrop-blur border-b border-border px-3 pr-4">
        <div className="flex items-center gap-2 shrink-0">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
          <Separator orientation="vertical" className="h-4" />
        </div>

        {/* Search — centered */}
        <div className="flex-1 flex justify-center">
          {stocks.length > 0 && <SearchCommand stocks={stocks} />}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          <p className="hidden sm:block text-[12px] text-muted-foreground font-mono tabular-nums">
            {formatSessionDate(s.session_date)}
          </p>
          <LiveBadge />
          <ThemeToggle />
        </div>
      </header>

      {/* ── Main content ── */}
      <div className="px-4 sm:px-6 py-5 pb-20 w-full">
        <div className="max-w-[1440px] mx-auto">

          {/* Page title */}
          <div className="mb-5">
            <h1 className="font-display text-[22px] font-bold leading-tight text-foreground tracking-tight">
              BRVM
            </h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Bourse Régionale des Valeurs Mobilières · Zone UEMOA
            </p>
          </div>

          {/* ── Grid: main + right sidebar ── */}
          <div className="flex flex-col xl:flex-row gap-5">

            {/* ── Left main column ── */}
            <div className="flex-1 min-w-0 space-y-5">

              {/* Hero card: composite strip + UEMOA map + KPI grid */}
              <Card className="rounded-xl border-border bg-card shadow-sm overflow-hidden">
                <CardContent className="p-0">

                  {/* ── Composite Index hero strip ── */}
                  <div className="px-5 sm:px-6 py-5 border-b border-border">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.18em] mb-1.5">
                          Indice Composite BRVM
                        </p>
                        <div className="flex items-baseline gap-3">
                          <span
                            className={`font-display text-5xl sm:text-[60px] font-bold leading-none tabular-nums text-foreground${compositeUp ? " glow-gain" : ""}`}
                          >
                            {s.composite.value.toLocaleString("fr-FR", {
                              maximumFractionDigits: 2,
                            })}
                          </span>
                          <span
                            className={`font-mono text-lg sm:text-xl font-semibold tabular-nums${compositeUp ? " text-gain" : " text-loss"}`}
                          >
                            {variationStr}
                          </span>
                        </div>
                      </div>

                      {/* Session stats */}
                      <div className="flex items-center gap-5 sm:gap-6">
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Hausses
                          </p>
                          <p className="font-mono text-lg font-bold text-gain tabular-nums mt-0.5">
                            {s.advancing}
                          </p>
                        </div>
                        <div
                          className="h-8 w-px bg-border"
                          aria-hidden="true"
                        />
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Baisses
                          </p>
                          <p className="font-mono text-lg font-bold text-loss tabular-nums mt-0.5">
                            {s.declining}
                          </p>
                        </div>
                        <div
                          className="h-8 w-px bg-border"
                          aria-hidden="true"
                        />
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Stables
                          </p>
                          <p className="font-mono text-lg font-bold text-muted-foreground tabular-nums mt-0.5">
                            {s.unchanged}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Map + KPI grid ── */}
                  <div className="grid grid-cols-1 lg:grid-cols-[5fr_7fr] divide-y lg:divide-y-0 lg:divide-x divide-border">
                    {/* Map panel */}
                    <div className="p-4 sm:p-5">
                      <UemoaMap session={s} stocks={stocks} />
                    </div>
                    {/* Metrics panel — 5 tiles (no composite, shown above) */}
                    {stocks.length > 0 && (
                      <div className="p-0">
                        <KpiGrid session={s} stocks={stocks} hideComposite />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Sector performance */}
              {sectors.length > 0 && (
                <SectorGrid sectors={sectors} stocks={stocks} />
              )}

              {/* Market / AI Analysis tabs */}
              <Tabs defaultValue="market" className="space-y-4">
                <TabsList className="bg-card border border-border shadow-sm">
                  <TabsTrigger value="market" className="text-sm">
                    Marché
                  </TabsTrigger>
                  <TabsTrigger
                    value="analysis"
                    className="text-sm flex items-center gap-1.5"
                  >
                    Analyse IA
                    {sentiment && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          sentiment === "haussier"
                            ? "text-gain border-[var(--color-gain)]/30 bg-[var(--color-gain)]/10"
                            : sentiment === "baissier"
                            ? "text-loss border-[var(--color-loss)]/30 bg-[var(--color-loss)]/10"
                            : "text-amber-600 border-amber-500/30 bg-amber-500/10 dark:text-amber-400"
                        }`}
                      >
                        {sentimentLabel(sentiment)}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="market" className="space-y-4 mt-0">
                  {stocks.length > 0 ? (
                    <StockTabs stocks={stocks} />
                  ) : (
                    <p className="text-xs text-muted-foreground py-8 text-center">
                      Cours disponibles après le premier pipeline.
                    </p>
                  )}

                  {s.announcements && (
                    <Card className="bg-card border-border shadow-sm">
                      <CardContent className="pt-4 pb-4">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                          Annonces
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {s.announcements}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="analysis" className="mt-0">
                  {analysis.status === "fulfilled" ? (
                    <AnalysisSection analysis={analysis.value} />
                  ) : (
                    <Card className="bg-card border-border shadow-sm">
                      <CardContent className="py-12 text-center">
                        <p className="text-sm text-muted-foreground">
                          Analyse IA non disponible pour cette séance.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>

              {/* Legal footer */}
              <p className="text-[11px] text-muted-foreground/50 pb-2 leading-relaxed">
                Source :{" "}
                <a
                  href="https://www.brvm.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-muted-foreground transition-colors"
                >
                  www.brvm.org
                </a>{" "}
                · Données sous licence BRVM · Analyse IA à titre informatif uniquement.
              </p>
            </div>

            {/* ── Right sidebar ── */}
            {stocks.length > 0 && <MarketSidebar stocks={stocks} />}
          </div>
        </div>
      </div>
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
