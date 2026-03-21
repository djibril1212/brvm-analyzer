"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { DistributionChart } from "./DistributionChart";
import { useLiveData } from "@/hooks/useLiveData";
import { formatVariation, variationColor } from "@/lib/format";
import type { StockQuote } from "@/types/brvm";
import { TrendingUp, TrendingDown, BarChart2 } from "lucide-react";

interface MarketSidebarProps {
  stocks: StockQuote[];
}

/** 40×20 SVG sparkline — simple 2-point trend line */
function MiniSparkline({ variation }: { variation: number }) {
  const up = variation > 0.5;
  const down = variation < -0.5;
  const color = up ? "#22C55E" : down ? "#EF4444" : "#6b7280";
  const points = up
    ? "0,16 14,10 28,5 40,2"
    : down
    ? "0,4 14,8 28,13 40,18"
    : "0,10 13,10 27,10 40,10";
  return (
    <svg
      width={40}
      height={20}
      viewBox="0 0 40 20"
      fill="none"
      className="shrink-0"
    >
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

  return (
    <div className="flex items-center gap-2 py-1.5 min-w-0">
      <span className="text-[10px] text-muted-foreground/40 font-mono w-3 shrink-0 text-center tabular-nums">
        {rank}
      </span>
      {showSparkline && <MiniSparkline variation={variation} />}
      {/* Symbol + name */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-1 min-w-0">
          <span className="font-mono font-semibold text-[12px] text-gold shrink-0">
            {symbol}
          </span>
          {isLive && (
            <span className="h-1.5 w-1.5 rounded-full bg-up shrink-0" />
          )}
          <span className="text-[10px] text-muted-foreground truncate leading-tight min-w-0">
            {name}
          </span>
        </div>
      </div>
      {/* Price + variation */}
      <div className="text-right shrink-0 pl-1">
        <p className="font-mono text-[12px] tabular-nums text-foreground leading-tight">
          {priceStr}
        </p>
        <p
          className={`font-mono text-[11px] tabular-nums font-medium leading-tight ${variationColor(
            variation
          )}`}
        >
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
    <div className="flex items-center gap-1.5 mb-1">
      <Icon className={`h-3 w-3 ${color}`} />
      <span className="text-[11px] font-semibold text-foreground tracking-wide">
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
        <Card className="px-4 pt-4 pb-3 bg-[#0D1226] border-white/[0.07] rounded-xl">
          <DistributionChart stocks={stocks} />
        </Card>

        {/* Top stocks */}
        <Card className="rounded-xl overflow-hidden flex-1 bg-[#0D1226] border-white/[0.07]">
          <ScrollArea className="max-h-[480px] xl:max-h-[calc(100vh-360px)]">
            <div className="px-4 py-3 space-y-4">
              {/* Top Hausses */}
              <div>
                <SectionHeader
                  icon={TrendingUp}
                  label="Top Hausses"
                  color="text-up"
                />
                <div
                  className="divide-y"
                  style={{ borderColor: "rgba(255,255,255,0.05)" }}
                >
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

              {/* Divider */}
              <div
                style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)" }}
              />

              {/* Top Baisses */}
              <div>
                <SectionHeader
                  icon={TrendingDown}
                  label="Top Baisses"
                  color="text-down"
                />
                <div
                  className="divide-y"
                  style={{ borderColor: "rgba(255,255,255,0.05)" }}
                >
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

              {/* Plus Échangés */}
              {plusEchanges.length > 0 && (
                <>
                  <div
                    style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)" }}
                  />
                  <div>
                    <SectionHeader
                      icon={BarChart2}
                      label="Plus Échangés"
                      color="text-blue-400"
                    />
                    <div
                      className="divide-y"
                      style={{ borderColor: "rgba(255,255,255,0.05)" }}
                    >
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
