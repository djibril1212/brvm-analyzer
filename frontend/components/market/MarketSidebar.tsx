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

function MiniSparkline({ variation }: { variation: number }) {
  const isUp = variation > 0.5;
  const isDown = variation < -0.5;
  const color = isUp ? "#34d399" : isDown ? "#f87171" : "#6b7280";
  const points = isUp
    ? "0,10 8,7 16,4 24,2"
    : isDown
    ? "0,2 8,5 16,8 24,10"
    : "0,6 8,6 16,6 24,6";
  return (
    <svg width={24} height={12} viewBox="0 0 24 12" fill="none" className="shrink-0">
      <polyline
        points={points}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
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
  // Format price compactly — fr-FR uses non-breaking spaces for thousands
  const priceStr = price >= 10000
    ? `${Math.round(price / 1000)}k`
    : price.toLocaleString("fr-FR");

  return (
    <div className="flex items-center gap-2 py-1.5 min-w-0">
      <span className="text-[10px] text-muted-foreground/40 font-mono w-3 shrink-0 text-center">
        {rank}
      </span>
      <MiniSparkline variation={variation} />
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-1">
          <span className="font-mono font-bold text-[11px] text-gold">
            {symbol}
          </span>
          {isLive && (
            <span className="h-1 w-1 rounded-full bg-up shrink-0" />
          )}
        </div>
        <p className="text-[9px] text-muted-foreground truncate leading-tight">
          {name}
        </p>
      </div>
      <div className="text-right shrink-0 w-[64px]">
        <p className="font-mono text-[11px] tabular-nums text-foreground leading-tight">
          {priceStr}
        </p>
        <p className={`font-mono text-[10px] tabular-nums font-semibold ${variationColor(variation)}`}>
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
    <div className="flex items-center gap-1.5 mb-1.5">
      <Icon className={`h-3 w-3 ${color}`} />
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export function MarketSidebar({ stocks }: MarketSidebarProps) {
  const { liveMap } = useLiveData();

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
    <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0">
      <div className="sticky top-20 space-y-3">
        {/* Distribution chart */}
        <div className="rounded-lg border border-border bg-card px-4 pt-4 pb-2">
          <DistributionChart stocks={stocks} />
        </div>

        {/* Top stocks */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <ScrollArea className="h-[calc(100vh-320px)] min-h-[360px]">
            <div className="px-4 py-3 space-y-3">
              <div>
                <SectionHeader icon={TrendingUp} label="Top Hausses" color="text-emerald-400" />
                <div className="divide-y divide-border/40">
                  {topHausses.map((s, i) => (
                    <StockRow key={s.symbol} rank={i + 1} symbol={s.symbol} name={s.name}
                      price={s.price} variation={s.variation} isLive={s.isLive} />
                  ))}
                </div>
              </div>

              <Separator className="opacity-30" />

              <div>
                <SectionHeader icon={TrendingDown} label="Top Baisses" color="text-red-400" />
                <div className="divide-y divide-border/40">
                  {topBaisses.map((s, i) => (
                    <StockRow key={s.symbol} rank={i + 1} symbol={s.symbol} name={s.name}
                      price={s.price} variation={s.variation} isLive={s.isLive} />
                  ))}
                </div>
              </div>

              {plusEchanges.length > 0 && (
                <>
                  <Separator className="opacity-30" />
                  <div>
                    <SectionHeader icon={BarChart2} label="Plus Échangés" color="text-blue-400" />
                    <div className="divide-y divide-border/40">
                      {plusEchanges.map((s, i) => (
                        <StockRow key={s.symbol} rank={i + 1} symbol={s.symbol} name={s.name}
                          price={s.price} variation={s.variation} isLive={s.isLive} />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </aside>
  );
}
