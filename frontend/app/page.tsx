import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { IndexCards } from "@/components/market/IndexCards";
import { StockTabs } from "@/components/market/StockTabs";
import { SectorGrid } from "@/components/market/SectorGrid";
import { AnalysisSection } from "@/components/market/AnalysisSection";
import { MarketSidebar } from "@/components/market/MarketSidebar";
import { MarketStats } from "@/components/market/MarketStats";
import { TickerTape } from "@/components/market/TickerTape";
import { SearchCommand } from "@/components/market/SearchCommand";
import { LiveBadge } from "@/components/market/LiveBadge";
import { DashboardSkeleton } from "@/components/market/LoadingSkeleton";
import { getLatestSession, getLatestAnalysis } from "@/lib/api";
import { formatSessionDate } from "@/lib/format";
import { sentimentLabel } from "@/lib/format";
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
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center px-4">
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
      {/* Ticker tape scrolling (fixed bottom) */}
      {stocks.length > 0 && <TickerTape stocks={stocks} />}

      {/* Main layout */}
      <div className="flex gap-6 items-start">
        {/* ── Left column ── */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Title row */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Bourse Régionale des Valeurs Mobilières
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                {formatSessionDate(s.session_date)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <SearchCommand stocks={stocks} />
              <LiveBadge />
            </div>
          </div>

          {/* Indices */}
          <IndexCards session={s} />

          {/* Indicateurs de marché */}
          {stocks.length > 0 && <MarketStats stocks={stocks} />}

          {/* Tabs Marché / Analyse IA */}
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

            <TabsContent value="market" className="space-y-6 mt-0">
              {sectors.length > 0 && (
                <SectorGrid sectors={sectors} stocks={stocks} />
              )}

              {stocks.length > 0 ? (
                <StockTabs stocks={stocks} />
              ) : (
                <p className="text-xs text-muted-foreground py-8 text-center">
                  Cours disponibles après le premier pipeline.
                </p>
              )}

              {s.announcements && (
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Annonces
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
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
        </div>

        {/* ── Right sidebar (lg+) ── */}
        {stocks.length > 0 && <MarketSidebar stocks={stocks} />}
      </div>
    </>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 pb-12">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
