import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  // Top hausse / baisse du jour
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

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {/* Indices */}
      {indices.map((idx) => {
        const up = idx.variation > 0;
        const down = idx.variation < 0;
        const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
        return (
          <Card key={idx.label} className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {idx.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-2xl font-semibold tracking-tight font-mono tabular-nums">
                {idx.value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}
              </p>
              <div className={`flex items-center gap-1 text-sm ${variationColor(idx.variation)}`}>
                <Icon className="h-3.5 w-3.5" />
                <span className="font-mono">{formatVariation(idx.variation)}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Séance stats + top hausse/baisse */}
      <Card className="bg-card border-border sm:col-span-2 lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Séance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">En hausse</span>
              <span className="text-sm font-mono font-semibold tabular-nums text-emerald-400">
                {session.advancing}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">En baisse</span>
              <span className="text-sm font-mono font-semibold tabular-nums text-red-400">
                {session.declining}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Stables</span>
              <span className="text-sm font-mono font-semibold tabular-nums text-muted-foreground">
                {session.unchanged}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Cap.</span>
              <span className="text-sm font-mono font-semibold tabular-nums text-foreground">
                {formatCFA(session.market_cap, true)}
              </span>
            </div>

            {topHausse && (
              <div className="flex justify-between items-center col-span-2 pt-1 border-t border-border mt-1">
                <span className="text-xs text-muted-foreground">
                  Top hausse{" "}
                  <span className="font-mono text-foreground">
                    {topHausse.symbol}
                  </span>
                </span>
                <span className="text-sm font-mono font-semibold text-emerald-400 tabular-nums">
                  +{topHausse.variation_pct.toFixed(2)}%
                </span>
              </div>
            )}
            {topBaisse && (
              <div className="flex justify-between items-center col-span-2">
                <span className="text-xs text-muted-foreground">
                  Top baisse{" "}
                  <span className="font-mono text-foreground">
                    {topBaisse.symbol}
                  </span>
                </span>
                <span className="text-sm font-mono font-semibold text-red-400 tabular-nums">
                  {topBaisse.variation_pct.toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
