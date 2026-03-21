"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { DistributionChart } from "./DistributionChart";
import { useLiveData } from "@/hooks/useLiveData";
import { formatVariation, variationColor } from "@/lib/format";
import type { StockQuote } from "@/types/brvm";
import { TrendingUp, TrendingDown, BarChart2 } from "lucide-react";

interface MarketSidebarProps {
  stocks: StockQuote[];
}

// Mini sparkline SVG — trending line up/down/flat
function MiniSparkline({ variation }: { variation: number }) {
  const isUp = variation > 0.5;
  const isDown = variation < -0.5;
  const color = isUp ? "#34d399" : isDown ? "#f87171" : "#6b7280";
  const points = isUp
    ? "0,10 10,7 20,5 30,2"
    : isDown
    ? "0,2 10,5 20,7 30,10"
    : "0,6 10,5 20,7 30,6";

  return (
    <svg width={30} height={12} viewBox="0 0 30 12" fill="none" className="shrink-0">
      <polyline
        points={points}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

interface StockRowProps {
  rank: number;
  symbol: string;
  name: string;
  price: number;
  variation: number;
  isLive?: boolean;
}

function StockRow({ rank, symbol, name, price, variation, isLive }: StockRowProps) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="text-[10px] text-muted-foreground/50 font-mono w-3 shrink-0">
        {rank}
      </span>
      <MiniSparkline variation={variation} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="font-mono font-semibold text-[11px] text-foreground">
            {symbol}
          </span>
          {isLive && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
          )}
        </div>
        <p className="text-[10px] text-muted-foreground truncate leading-tight">
          {name}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-mono text-[11px] tabular-nums text-foreground">
          {price.toLocaleString("fr-FR")}
        </p>
        <p className={`font-mono text-[10px] tabular-nums font-medium ${variationColor(variation)}`}>
          {formatVariation(variation)}
        </p>
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  label,
  color,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <Icon className={`h-3.5 w-3.5 ${color}`} />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export function MarketSidebar({ stocks }: MarketSidebarProps) {
  const { liveMap } = useLiveData();

  // Merge live data
  const enriched = stocks.map((s) => {
    const live = liveMap.get(s.symbol);
    return {
      ...s,
      price: live?.last_price ?? s.close,
      variation: live?.variation_pct ?? s.variation_pct,
      isLive: !!live?.last_price,
    };
  });

  const topHausses = [...enriched]
    .sort((a, b) => b.variation - a.variation)
    .slice(0, 5);

  const topBaisses = [...enriched]
    .sort((a, b) => a.variation - b.variation)
    .slice(0, 5);

  const plusEchanges = [...enriched]
    .filter((s) => (s.value_traded ?? 0) > 0)
    .sort((a, b) => (b.value_traded ?? 0) - (a.value_traded ?? 0))
    .slice(0, 5);

  return (
    <aside className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0">
      <div className="sticky top-20 space-y-4">
        {/* Distribution */}
        <div className="rounded-lg border border-border bg-card p-4">
          <DistributionChart stocks={stocks} />
        </div>

        {/* Top Hausses + Baisses + Échangés */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <ScrollArea className="h-[calc(100vh-340px)] min-h-[300px]">
            <div className="p-4 space-y-4">
              {/* Top Hausses */}
              <div>
                <SectionHeader
                  icon={TrendingUp}
                  label="Top Hausses"
                  color="text-emerald-400"
                />
                <div className="divide-y divide-border/50">
                  {topHausses.map((s, i) => (
                    <StockRow
                      key={s.symbol}
                      rank={i + 1}
                      symbol={s.symbol}
                      name={s.name}
                      price={s.price}
                      variation={s.variation}
                      isLive={s.isLive}
                    />
                  ))}
                </div>
              </div>

              <Separator className="opacity-50" />

              {/* Top Baisses */}
              <div>
                <SectionHeader
                  icon={TrendingDown}
                  label="Top Baisses"
                  color="text-red-400"
                />
                <div className="divide-y divide-border/50">
                  {topBaisses.map((s, i) => (
                    <StockRow
                      key={s.symbol}
                      rank={i + 1}
                      symbol={s.symbol}
                      name={s.name}
                      price={s.price}
                      variation={s.variation}
                      isLive={s.isLive}
                    />
                  ))}
                </div>
              </div>

              <Separator className="opacity-50" />

              {/* Plus échangés */}
              {plusEchanges.length > 0 && (
                <div>
                  <SectionHeader
                    icon={BarChart2}
                    label="Plus Échangés"
                    color="text-blue-400"
                  />
                  <div className="divide-y divide-border/50">
                    {plusEchanges.map((s, i) => (
                      <StockRow
                        key={s.symbol}
                        rank={i + 1}
                        symbol={s.symbol}
                        name={s.name}
                        price={s.price}
                        variation={s.variation}
                        isLive={s.isLive}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </aside>
  );
}
