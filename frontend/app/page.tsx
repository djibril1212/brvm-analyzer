import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { IndexCards } from "@/components/market/IndexCards";
import { StockTabs } from "@/components/market/StockTabs";
import { SectorGrid } from "@/components/market/SectorGrid";
import { AnalysisSection } from "@/components/market/AnalysisSection";
import { LiveBadge } from "@/components/market/LiveBadge";
import { DashboardSkeleton } from "@/components/market/LoadingSkeleton";
import { getLatestSession, getLatestAnalysis } from "@/lib/api";
import { formatSessionDate } from "@/lib/format";
import type { MarketSession } from "@/types/brvm";

// ISR : revalidation via webhook (pipeline déclenche /api/revalidate)
export const revalidate = 86400; // fallback 24h si webhook non reçu

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

  return (
    <div className="space-y-6">
      {/* Titre séance */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Tableau de bord
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {formatSessionDate(s.session_date)}
          </p>
        </div>
        <div className="mt-1">
          <LiveBadge />
        </div>
      </div>

      {/* Indices + stats séance */}
      <IndexCards session={s} />

      {/* Onglets : Marché / Analyse IA */}
      <Tabs defaultValue="market" className="space-y-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="market" className="text-sm">
            Marché
          </TabsTrigger>
          <TabsTrigger value="analysis" className="text-sm">
            Analyse IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="market" className="space-y-6 mt-0">
          {/* Secteurs */}
          {s.sectors?.length > 0 && <SectorGrid sectors={s.sectors} />}

          {/* Tables actions */}
          {s.stocks?.length > 0 ? (
            <StockTabs stocks={s.stocks} />
          ) : (
            <p className="text-xs text-muted-foreground py-8 text-center">
              Cours disponibles après le premier pipeline.
            </p>
          )}

          {/* Annonces */}
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
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
