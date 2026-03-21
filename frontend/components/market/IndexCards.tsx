import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatVariation, variationColor } from "@/lib/format";
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

  const stats = [
    { label: "En hausse", value: session.advancing, color: "text-emerald-400" },
    { label: "En baisse", value: session.declining, color: "text-red-400" },
    { label: "Stables", value: session.unchanged, color: "text-muted-foreground" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* Carte statistiques de séance */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Séance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {stats.map((s) => (
            <div key={s.label} className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <span className={`text-sm font-mono font-semibold tabular-nums ${s.color}`}>
                {s.value}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
