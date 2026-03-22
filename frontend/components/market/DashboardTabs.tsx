"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { StockTabs } from "./StockTabs";
import { AnalysisSection } from "./AnalysisSection";
import type { StockQuote } from "@/types/brvm";
import type { DailyAnalysis } from "@/types/brvm";

interface DashboardTabsProps {
  stocks: StockQuote[];
  analysis: DailyAnalysis | null;
  announcements?: string;
}

export function DashboardTabs({ stocks, analysis, announcements }: DashboardTabsProps) {
  const [tab, setTab] = useState<"market" | "analysis">("market");

  const btnClass = (active: boolean) =>
    [
      "h-10 px-5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
      active
        ? "border-primary text-foreground"
        : "border-transparent text-muted-foreground hover:text-foreground",
    ].join(" ");

  return (
    <div>
      {/* Outer tab bar — custom buttons, no Radix nesting */}
      <div className="flex border-b border-border -mb-px">
        <button className={btnClass(tab === "market")} onClick={() => setTab("market")}>
          Marché
        </button>
        <button className={btnClass(tab === "analysis")} onClick={() => setTab("analysis")}>
          Analyse IA
        </button>
      </div>

      {/* Content */}
      <div className="pt-4 space-y-4">
        {tab === "market" ? (
          <>
            {stocks.length > 0 ? (
              <StockTabs stocks={stocks} />
            ) : (
              <p className="text-xs text-muted-foreground py-8 text-center">
                Cours disponibles après le premier pipeline.
              </p>
            )}

            {announcements && (
              <Card className="bg-card border-border shadow-sm">
                <CardContent className="pt-4 pb-4">
                  <p className="section-label mb-2">Annonces</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{announcements}</p>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <>
            {analysis ? (
              <AnalysisSection analysis={analysis} />
            ) : (
              <Card className="bg-card border-border shadow-sm">
                <CardContent className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    Analyse IA non disponible pour cette séance.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
