"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground w-20">Symbole</TableHead>
            <TableHead className="text-muted-foreground hidden md:table-cell">
              Nom
            </TableHead>
            <TableHead className="text-muted-foreground text-right">
              Cours
            </TableHead>
            <TableHead className="text-muted-foreground text-right">
              Variation
            </TableHead>
            {mode === "volume" && (
              <TableHead className="text-muted-foreground text-right hidden sm:table-cell">
                Valeur échangée
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {stocks.map((stock) => {
            const live = liveMap.get(stock.symbol);
            const price = live?.last_price ?? stock.close;
            const variation = live?.variation_pct ?? stock.variation_pct;
            const isLive = !!live?.last_price;
            return (
              <TableRow
                key={stock.symbol}
                className="border-border hover:bg-muted/40 transition-colors"
              >
                <TableCell className="font-mono font-semibold text-[13px] text-gold">
                  {stock.symbol}
                </TableCell>
                <TableCell className="text-[13px] text-muted-foreground hidden md:table-cell max-w-[200px] truncate">
                  {stock.name}
                </TableCell>
                <TableCell className="text-right font-mono text-[13px] tabular-nums text-foreground">
                  {price.toLocaleString("fr-FR")}
                  {isLive && (
                    <span className="ml-1 h-1.5 w-1.5 rounded-full bg-up inline-block align-middle" />
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant="outline"
                    className={`font-mono text-[12px] tabular-nums ${variationBg(variation)}`}
                  >
                    {formatVariation(variation)}
                  </Badge>
                </TableCell>
                {mode === "volume" && (
                  <TableCell className="text-right font-mono text-[13px] tabular-nums text-muted-foreground hidden sm:table-cell">
                    {formatCFA(stock.value_traded, true)}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
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
      <TabsList className="bg-card border border-border">
        <TabsTrigger value="hausses" className="text-sm">
          Top Hausses
          {topHausses.length > 0 && (
            <span className="ml-1.5 text-[10px] font-mono text-emerald-400">
              +{topHausses[0]?.variation_pct.toFixed(2)}%
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="baisses" className="text-sm">
          Top Baisses
          {topBaisses.length > 0 && (
            <span className="ml-1.5 text-[10px] font-mono text-red-400">
              {topBaisses[0]?.variation_pct.toFixed(2)}%
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="echanges" className="text-sm">
          Plus Échangés
        </TabsTrigger>
        <TabsTrigger value="toutes" className="text-sm">
          Toutes ({stocks.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="hausses" className="mt-4">
        {topHausses.length > 0 ? (
          <MiniTable stocks={topHausses} mode="variation" liveMap={liveMap} />
        ) : (
          <p className="text-xs text-muted-foreground py-8 text-center">
            Aucune hausse cette séance.
          </p>
        )}
      </TabsContent>

      <TabsContent value="baisses" className="mt-4">
        {topBaisses.length > 0 ? (
          <MiniTable stocks={topBaisses} mode="variation" liveMap={liveMap} />
        ) : (
          <p className="text-xs text-muted-foreground py-8 text-center">
            Aucune baisse cette séance.
          </p>
        )}
      </TabsContent>

      <TabsContent value="echanges" className="mt-4">
        {plusEchanges.length > 0 ? (
          <MiniTable stocks={plusEchanges} mode="volume" liveMap={liveMap} />
        ) : (
          <p className="text-xs text-muted-foreground py-8 text-center">
            Données de volume non disponibles.
          </p>
        )}
      </TabsContent>

      <TabsContent value="toutes" className="mt-4">
        <StockTable stocks={stocks} liveMap={liveMap} />
      </TabsContent>
    </Tabs>
  );
}
