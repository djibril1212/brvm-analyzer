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
import { DashboardSkeleton } from "@/components/market/LoadingSkeleton";
import { getLatestSession, getLatestAnalysis } from "@/lib/api";
import { formatSessionDate, sentimentLabel } from "@/lib/format";
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

  const sentiment =
    analysis.status === "fulfilled"
      ? (analysis.value.market_sentiment as string)
      : null;

  return (
    <>
      {/* Fixed bottom ticker */}
      {stocks.length > 0 && <TickerTape stocks={stocks} />}

      {/* ── Sticky top header ── */}
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 bg-background border-b border-border px-3 pr-5">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
          <Separator orientation="vertical" className="h-4" />
        </div>

        {/* Search — centered */}
        <div className="flex-1 flex justify-center">
          {stocks.length > 0 && <SearchCommand stocks={stocks} />}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 shrink-0">
          <p className="hidden sm:block text-[12px] text-muted-foreground font-mono">
            {formatSessionDate(s.session_date)}
          </p>
          <LiveBadge />
        </div>
      </header>

      {/* ── Main content + right sidebar ── */}
      <div className="flex flex-col xl:flex-row gap-5 px-4 sm:px-6 py-5 pb-16 w-full">
        {/* ── Left main zone ── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Page title */}
          <div>
            <h1 className="text-[22px] font-semibold leading-tight text-foreground tracking-tight">
              BRVM
            </h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Bourse Régionale des Valeurs Mobilières
            </p>
          </div>

          {/* KPI block: UEMOA map + metrics grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-4">
            <UemoaMap session={s} />
            {stocks.length > 0 && <KpiGrid session={s} stocks={stocks} />}
          </div>

          {/* Sector performance */}
          {sectors.length > 0 && (
            <SectorGrid sectors={sectors} stocks={stocks} />
          )}

          {/* Market / AI Analysis tabs */}
          <Tabs defaultValue="market" className="space-y-4">
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="market" className="text-sm">
                Marché
              </TabsTrigger>
              <TabsTrigger value="analysis" className="text-sm flex items-center gap-1.5">
                Analyse IA
                {sentiment && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      sentiment === "haussier"
                        ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/10"
                        : sentiment === "baissier"
                        ? "text-red-400 border-red-400/30 bg-red-400/10"
                        : "text-amber-400 border-amber-400/30 bg-amber-400/10"
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
                <Card className="bg-card border-border">
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
                <Card className="bg-card border-border">
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
          <p className="text-[11px] text-muted-foreground/40 pb-2 leading-relaxed">
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
