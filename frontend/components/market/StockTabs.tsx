"use client";

import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StockTable } from "./StockTable";
import { formatCFA, formatVariation, variationBg } from "@/lib/format";
import { useLiveData } from "@/hooks/useLiveData";
import type { StockQuote } from "@/types/brvm";

interface StockTabsProps {
  stocks: StockQuote[];
}

function MiniTable({
  stocks,
  mode,
  liveMap,
}: {
  stocks: StockQuote[];
  mode: "variation" | "volume";
  liveMap: Map<string, { last_price: number | null; variation_pct: number | null }>;
}) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div
        className={`grid gap-0 border-b border-border px-3 py-2 bg-muted/20 ${
          mode === "volume"
            ? "grid-cols-[20px_72px_1fr_90px_80px_100px]"
            : "grid-cols-[20px_72px_1fr_90px_80px]"
        }`}
      >
        <span className="section-label">#</span>
        <span className="section-label">Symbole</span>
        <span className="section-label hidden md:block">Société</span>
        <span className="section-label text-right">Cours</span>
        <span className="section-label text-right">Var.</span>
        {mode === "volume" && (
          <span className="section-label text-right hidden sm:block">Valeur éch.</span>
        )}
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/50">
        {stocks.map((stock, idx) => {
          const live = liveMap.get(stock.symbol);
          const price = live?.last_price ?? stock.close;
          const variation = live?.variation_pct ?? stock.variation_pct;
          const isLive = !!live?.last_price;

          return (
            <Link
              key={stock.symbol}
              href={`/stock/${stock.symbol}`}
              className={`grid gap-0 items-center px-3 py-2.5 hover:bg-muted/30 transition-colors duration-100 ${
                mode === "volume"
                  ? "grid-cols-[20px_72px_1fr_90px_80px_100px]"
                  : "grid-cols-[20px_72px_1fr_90px_80px]"
              }`}
            >
              {/* Rank */}
              <span className="text-[10px] font-mono text-muted-foreground/40 tabular-nums">
                {idx + 1}
              </span>

              {/* Symbol */}
              <span className="font-mono font-bold text-[13px] text-gold truncate">
                {stock.symbol}
              </span>

              {/* Name */}
              <span className="text-[12px] text-muted-foreground truncate pr-2 hidden md:block">
                {stock.name}
              </span>

              {/* Price */}
              <span className="font-mono text-[13px] text-foreground text-right tabular-nums">
                {price.toLocaleString("fr-FR")}
                {isLive && (
                  <span
                    className="ml-1 h-1.5 w-1.5 rounded-full inline-block align-middle"
                    style={{ background: "var(--color-gain)" }}
                  />
                )}
              </span>

              {/* Variation badge */}
              <div className="flex justify-end">
                <Badge
                  variant="outline"
                  className={`font-mono text-[11px] tabular-nums px-1.5 h-5 ${variationBg(variation)}`}
                >
                  {formatVariation(variation)}
                </Badge>
              </div>

              {/* Volume */}
              {mode === "volume" && (
                <span className="font-mono text-[12px] text-muted-foreground text-right tabular-nums hidden sm:block">
                  {formatCFA(stock.value_traded, true)}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function StockTabs({ stocks }: StockTabsProps) {
  const { liveMap } = useLiveData();

  const topHausses = [...stocks]
    .filter((s) => s.variation_pct > 0)
    .sort((a, b) => b.variation_pct - a.variation_pct)
    .slice(0, 10);

  const topBaisses = [...stocks]
    .filter((s) => s.variation_pct < 0)
    .sort((a, b) => a.variation_pct - b.variation_pct)
    .slice(0, 10);

  const plusEchanges = [...stocks]
    .filter((s) => (s.value_traded ?? 0) > 0)
    .sort((a, b) => (b.value_traded ?? 0) - (a.value_traded ?? 0))
    .slice(0, 10);

  return (
    <Tabs defaultValue="hausses">
      <TabsList className="bg-card border border-border h-9">
        <TabsTrigger value="hausses" className="text-[12px] h-7 px-3 data-[state=active]:text-gain">
          Hausses
          {topHausses.length > 0 && (
            <span className="ml-1.5 text-[10px] font-mono text-gain/80">
              {topHausses[0]?.variation_pct.toFixed(1)}%
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="baisses" className="text-[12px] h-7 px-3 data-[state=active]:text-loss">
          Baisses
          {topBaisses.length > 0 && (
            <span className="ml-1.5 text-[10px] font-mono text-loss/80">
              {topBaisses[0]?.variation_pct.toFixed(1)}%
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="echanges" className="text-[12px] h-7 px-3">
          Échangés
        </TabsTrigger>
        <TabsTrigger value="toutes" className="text-[12px] h-7 px-3">
          Tout ({stocks.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="hausses" className="mt-3">
        {topHausses.length > 0 ? (
          <MiniTable stocks={topHausses} mode="variation" liveMap={liveMap} />
        ) : (
          <p className="text-xs text-muted-foreground py-8 text-center">
            Aucune hausse cette séance.
          </p>
        )}
      </TabsContent>

      <TabsContent value="baisses" className="mt-3">
        {topBaisses.length > 0 ? (
          <MiniTable stocks={topBaisses} mode="variation" liveMap={liveMap} />
        ) : (
          <p className="text-xs text-muted-foreground py-8 text-center">
            Aucune baisse cette séance.
          </p>
        )}
      </TabsContent>

      <TabsContent value="echanges" className="mt-3">
        {plusEchanges.length > 0 ? (
          <MiniTable stocks={plusEchanges} mode="volume" liveMap={liveMap} />
        ) : (
          <p className="text-xs text-muted-foreground py-8 text-center">
            Données de volume non disponibles.
          </p>
        )}
      </TabsContent>

      <TabsContent value="toutes" className="mt-3">
        <StockTable stocks={stocks} liveMap={liveMap} />
      </TabsContent>
    </Tabs>
  );
}
