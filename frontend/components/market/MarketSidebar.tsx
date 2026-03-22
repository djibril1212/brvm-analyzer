"use client";

import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { DistributionChart } from "./DistributionChart";
import { useLiveData } from "@/hooks/useLiveData";
import { formatVariation } from "@/lib/format";
import type { StockQuote } from "@/types/brvm";
import { TrendingUp, TrendingDown, BarChart2 } from "lucide-react";

interface MarketSidebarProps {
  stocks: StockQuote[];
}

/** Simple SVG sparkline — 40×16 */
function MiniSparkline({ variation }: { variation: number }) {
  const up = variation > 0.5;
  const down = variation < -0.5;
  const color = up
    ? "var(--color-gain)"
    : down
    ? "var(--color-loss)"
    : "hsl(var(--muted-foreground))";
  const points = up
    ? "0,14 12,9 26,4 40,1"
    : down
    ? "0,2 12,6 26,11 40,15"
    : "0,8 13,8 27,8 40,8";
  return (
    <svg width={40} height={16} viewBox="0 0 40 16" fill="none" className="shrink-0">
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
  showSparkline?: boolean;
}

function StockRow({
  rank,
  symbol,
  name,
  price,
  variation,
  isLive,
  showSparkline = true,
}: StockRowProps) {
  const priceStr =
    price >= 10000
      ? `${Math.round(price / 1000)}k`
      : price.toLocaleString("fr-FR");

  const varColor =
    variation > 0
      ? "var(--color-gain)"
      : variation < 0
      ? "var(--color-loss)"
      : "hsl(var(--muted-foreground))";

  return (
    <Link
      href={`/stock/${symbol}`}
      className="flex items-center gap-2 py-1.5 min-w-0 hover:bg-muted/20 -mx-4 px-4 transition-colors duration-100 rounded"
    >
      <span className="text-[10px] text-muted-foreground font-mono w-3 shrink-0 text-center tabular-nums">
        {rank}
      </span>
      {showSparkline && <MiniSparkline variation={variation} />}
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-1 min-w-0">
          <span className="font-mono font-bold text-[12px] text-gold shrink-0">
            {symbol}
          </span>
          {isLive && (
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ background: "var(--color-gain)" }}
            />
          )}
          <span className="text-[10px] text-muted-foreground truncate leading-tight min-w-0">
            {name}
          </span>
        </div>
      </div>
      <div className="text-right shrink-0 pl-1">
        <p className="font-mono text-[12px] tabular-nums text-foreground leading-tight">
          {priceStr}
        </p>
        <p
          className="font-mono text-[11px] tabular-nums font-medium leading-tight"
          style={{ color: varColor }}
        >
          {formatVariation(variation)}
        </p>
      </div>
    </Link>
  );
}

function SectionHeader({
  icon: Icon,
  label,
  color,
}: {
  icon: React.ElementType;
  label: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-1">
      <Icon
        className="h-3.5 w-3.5 shrink-0"
        style={{ color: color ?? "hsl(var(--muted-foreground))" }}
      />
      <span className="text-xs font-semibold text-foreground tracking-wide">
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
    <aside className="flex flex-col w-full xl:w-[300px] xl:shrink-0">
      <div
        className="xl:sticky xl:top-5 flex flex-col gap-3"
        style={{ maxHeight: "calc(100vh - 120px)" }}
      >
        {/* Distribution chart */}
        <Card className="px-4 pt-4 pb-3 rounded-xl border-border bg-card shadow-sm">
          <DistributionChart stocks={stocks} />
        </Card>

        {/* Top stocks */}
        <Card className="rounded-xl overflow-hidden flex-1 border-border bg-card shadow-sm">
          <ScrollArea className="max-h-[480px] xl:max-h-[calc(100vh-360px)]">
            <div className="px-4 py-3 space-y-4">
              {/* Top Hausses */}
              <div>
                <SectionHeader
                  icon={TrendingUp}
                  label="Top Hausses"
                  color="var(--color-gain)"
                />
                <div className="divide-y divide-border/60">
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

              <div className="border-t border-border/60" />

              {/* Top Baisses */}
              <div>
                <SectionHeader
                  icon={TrendingDown}
                  label="Top Baisses"
                  color="var(--color-loss)"
                />
                <div className="divide-y divide-border/60">
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

              {plusEchanges.length > 0 && (
                <>
                  <div className="border-t border-border/60" />
                  <div>
                    <SectionHeader
                      icon={BarChart2}
                      label="Plus Échangés"
                      color="var(--color-data-blue)"
                    />
                    <div className="divide-y divide-border/60">
                      {plusEchanges.map((s, i) => (
                        <StockRow
                          key={s.symbol}
                          rank={i + 1}
                          symbol={s.symbol}
                          name={s.name}
                          price={s.price}
                          variation={s.variation}
                          isLive={s.isLive}
                          showSparkline={false}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </aside>
  );
}
