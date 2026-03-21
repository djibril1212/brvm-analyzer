"use client";

import { useLiveData } from "@/hooks/useLiveData";
import { formatVariation, variationColor } from "@/lib/format";
import type { StockQuote } from "@/types/brvm";

interface TickerTapeProps {
  stocks: StockQuote[];
}

export function TickerTape({ stocks }: TickerTapeProps) {
  const { liveMap } = useLiveData();

  const items = stocks.map((s) => {
    const live = liveMap.get(s.symbol);
    return {
      symbol: s.symbol,
      price: live?.last_price ?? s.close,
      variation: live?.variation_pct ?? s.variation_pct,
      isLive: !!live?.last_price,
    };
  });

  if (!items.length) return null;

  // Duplicate for seamless loop
  const doubled = [...items, ...items];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 h-8 bg-background/95 backdrop-blur-sm border-t border-border overflow-hidden flex items-center">
      <div className="animate-ticker flex items-center select-none">
        {doubled.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 px-3 shrink-0">
            <span className="font-mono font-semibold text-[11px] text-gold">
              {item.symbol}
            </span>
            <span className="font-mono text-[11px] tabular-nums text-foreground/80">
              {item.price.toLocaleString("fr-FR")}
            </span>
            <span
              className={`font-mono text-[11px] tabular-nums font-medium ${variationColor(item.variation)}`}
            >
              {item.variation > 0 ? "▲" : item.variation < 0 ? "▼" : ""}
              {formatVariation(item.variation)}
            </span>
            {item.isLive && (
              <span className="h-1 w-1 rounded-full bg-up opacity-80" />
            )}
            <span className="text-border/60 ml-1 text-[11px]">|</span>
          </span>
        ))}
      </div>
    </div>
  );
}
