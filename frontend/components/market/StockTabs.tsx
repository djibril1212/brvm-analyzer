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
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: mode === "volume" ? "540px" : "420px" }}>
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="section-label text-left px-3 py-2 font-normal w-7">#</th>
              <th className="section-label text-left px-2 py-2 font-normal w-[72px]">Symb.</th>
              <th className="section-label text-left px-2 py-2 font-normal">Société</th>
              <th className="section-label text-right px-2 py-2 font-normal w-24">Cours</th>
              <th className="section-label text-right px-3 py-2 font-normal w-[76px]">Var.</th>
              {mode === "volume" && (
                <th className="section-label text-right px-3 py-2 font-normal w-28 hidden sm:table-cell">
                  Valeur éch.
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock, idx) => {
              const live = liveMap.get(stock.symbol);
              const price = live?.last_price ?? stock.close;
              const variation = live?.variation_pct ?? stock.variation_pct;
              const isLive = !!live?.last_price;

              return (
                <tr
                  key={stock.symbol}
                  className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors duration-100"
                >
                  <td className="px-3 py-2.5 text-[10px] font-mono text-muted-foreground/40 tabular-nums">
                    {idx + 1}
                  </td>
                  <td className="px-2 py-2.5">
                    <Link
                      href={`/stock/${stock.symbol}`}
                      className="font-mono font-bold text-[13px] text-gold hover:underline underline-offset-2"
                    >
                      {stock.symbol}
                    </Link>
                  </td>
                  <td className="px-2 py-2.5 text-[12px] text-muted-foreground">
                    <span className="block truncate">{stock.name}</span>
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-[13px] tabular-nums text-foreground whitespace-nowrap">
                    {price.toLocaleString("fr-FR")}
                    {isLive && (
                      <span
                        className="ml-1 h-1.5 w-1.5 rounded-full inline-block align-middle"
                        style={{ background: "var(--color-gain)" }}
                      />
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Badge
                      variant="outline"
                      className={`font-mono text-[11px] tabular-nums px-1.5 h-5 whitespace-nowrap ${variationBg(variation)}`}
                    >
                      {formatVariation(variation)}
                    </Badge>
                  </td>
                  {mode === "volume" && (
                    <td className="px-3 py-2.5 text-right font-mono text-[12px] tabular-nums text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                      {formatCFA(stock.value_traded, true)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
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

  const triggerBase =
    "h-8 px-3 text-[12px] font-medium rounded-md transition-colors " +
    "data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground " +
    "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground";

  return (
    <Tabs defaultValue="hausses">
      <TabsList className="bg-muted/60 border border-border/60 h-10 p-1 gap-0.5">
        <TabsTrigger value="hausses" className={triggerBase}>
          Hausses
          {topHausses.length > 0 && (
            <span className="ml-1.5 text-[10px] font-mono text-gain">
              +{topHausses[0]?.variation_pct.toFixed(1)}%
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="baisses" className={triggerBase}>
          Baisses
          {topBaisses.length > 0 && (
            <span className="ml-1.5 text-[10px] font-mono text-loss">
              {topBaisses[0]?.variation_pct.toFixed(1)}%
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="echanges" className={triggerBase}>
          Échangés
        </TabsTrigger>
        <TabsTrigger value="toutes" className={triggerBase}>
          Tout ({stocks.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="hausses" className="mt-3">
        {topHausses.length > 0 ? (
          <MiniTable stocks={topHausses} mode="variation" liveMap={liveMap} />
        ) : (
          <p className="text-xs text-muted-foreground py-8 text-center">Aucune hausse cette séance.</p>
        )}
      </TabsContent>

      <TabsContent value="baisses" className="mt-3">
        {topBaisses.length > 0 ? (
          <MiniTable stocks={topBaisses} mode="variation" liveMap={liveMap} />
        ) : (
          <p className="text-xs text-muted-foreground py-8 text-center">Aucune baisse cette séance.</p>
        )}
      </TabsContent>

      <TabsContent value="echanges" className="mt-3">
        {plusEchanges.length > 0 ? (
          <MiniTable stocks={plusEchanges} mode="volume" liveMap={liveMap} />
        ) : (
          <p className="text-xs text-muted-foreground py-8 text-center">Données de volume non disponibles.</p>
        )}
      </TabsContent>

      <TabsContent value="toutes" className="mt-3">
        <StockTable stocks={stocks} liveMap={liveMap} />
      </TabsContent>
    </Tabs>
  );
}
