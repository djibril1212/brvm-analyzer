import { formatVariation, variationColor, formatCFA } from "@/lib/format";
import type { MarketSession } from "@/types/brvm";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

interface IndexCardsProps {
  session: MarketSession;
}

export function IndexCards({ session }: IndexCardsProps) {
  const indices = [
    {
      label: "BRVM Composite",
      value: session.composite.value,
      variation: session.composite.variation_pct,
    },
    {
      label: "BRVM-30",
      value: session.brvm30.value,
      variation: session.brvm30.variation_pct,
    },
    ...(session.prestige.value != null
      ? [
          {
            label: "BRVM Prestige",
            value: session.prestige.value,
            variation: session.prestige.variation_pct ?? 0,
          },
        ]
      : []),
  ];

  const stocks = session.stocks ?? [];
  const topHausse = stocks.length
    ? stocks.reduce((best, s) =>
        s.variation_pct > best.variation_pct ? s : best
      )
    : null;
  const topBaisse = stocks.length
    ? stocks.reduce((worst, s) =>
        s.variation_pct < worst.variation_pct ? s : worst
      )
    : null;

  const total = (session.advancing ?? 0) + (session.declining ?? 0) + (session.unchanged ?? 0);
  const advancePct = total > 0 ? ((session.advancing ?? 0) / total) * 100 : 0;
  const declinePct = total > 0 ? ((session.declining ?? 0) / total) * 100 : 0;

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 lg:grid-cols-5">
      {/* Index KPI cards */}
      {indices.map((idx) => {
        const up = idx.variation > 0;
        const down = idx.variation < 0;
        const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
        return (
          <div
            key={idx.label}
            className="rounded-lg border border-border bg-card px-4 py-3 space-y-1 min-w-0 overflow-hidden"
          >
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">
              {idx.label}
            </p>
            <p className="font-mono text-[22px] font-bold tabular-nums leading-tight text-foreground truncate">
              {idx.value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}
            </p>
            <div className={`flex items-center gap-1 text-[13px] ${variationColor(idx.variation)}`}>
              <Icon className="h-3 w-3 shrink-0" />
              <span className="font-mono font-medium">{formatVariation(idx.variation)}</span>
            </div>
          </div>
        );
      })}

      {/* Session breadth card — full-width on tablet, 2-col on desktop */}
      <div className="rounded-lg border border-border bg-card px-4 py-3 space-y-2 sm:col-span-3 lg:col-span-2">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Séance · Largeur du marché
        </p>

        {/* Breadth bar */}
        {total > 0 && (
          <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
            <div
              className="bg-up/70 rounded-l-full"
              style={{ width: `${advancePct}%` }}
            />
            <div
              className="bg-muted-foreground/30"
              style={{ width: `${100 - advancePct - declinePct}%` }}
            />
            <div
              className="bg-down/70 rounded-r-full"
              style={{ width: `${declinePct}%` }}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-muted-foreground">En hausse</span>
            <span className="text-[13px] font-mono font-semibold tabular-nums text-up">
              {session.advancing}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-muted-foreground">En baisse</span>
            <span className="text-[13px] font-mono font-semibold tabular-nums text-down">
              {session.declining}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-muted-foreground">Stables</span>
            <span className="text-[13px] font-mono font-semibold tabular-nums text-muted-foreground">
              {session.unchanged}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-muted-foreground">Cap. marché</span>
            <span className="text-[13px] font-mono font-semibold tabular-nums text-foreground">
              {formatCFA(session.market_cap, true)}
            </span>
          </div>
        </div>

        {(topHausse || topBaisse) && (
          <div className="pt-1.5 border-t border-border/50 space-y-1">
            {topHausse && (
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  Top hausse <span className="font-mono text-gold">{topHausse.symbol}</span>
                </span>
                <span className="text-[12px] font-mono font-semibold text-up tabular-nums">
                  +{topHausse.variation_pct.toFixed(2)}%
                </span>
              </div>
            )}
            {topBaisse && (
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  Top baisse <span className="font-mono text-gold">{topBaisse.symbol}</span>
                </span>
                <span className="text-[12px] font-mono font-semibold text-down tabular-nums">
                  {topBaisse.variation_pct.toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
