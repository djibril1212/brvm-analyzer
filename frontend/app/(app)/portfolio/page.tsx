import { Suspense } from "react";
import { getLatestSession } from "@/lib/api";
import { PortfolioClient } from "@/components/portfolio/PortfolioClient";
import type { Metadata } from "next";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Mon portefeuille — BRVM Daily Analyzer",
  description: "Suivez vos positions BRVM en temps réel, importez vos relevés SGI TOGO et SA2IF.",
};

async function PortfolioContent() {
  let stocks: import("@/types/brvm").StockQuote[] = [];
  try {
    const session = await getLatestSession();
    stocks = session.stocks ?? [];
  } catch {
    // Si pas de données, le portfolio fonctionne quand même (sans prix live)
  }

  return <PortfolioClient stocks={stocks} />;
}

export default function PortfolioPage() {
  return (
    <div className="px-4 sm:px-6 py-5 pb-20 max-w-5xl mx-auto">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20 text-muted-foreground text-sm animate-pulse">
            Chargement des cours…
          </div>
        }
      >
        <PortfolioContent />
      </Suspense>
    </div>
  );
}
