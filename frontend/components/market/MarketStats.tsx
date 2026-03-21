import type { StockQuote } from "@/types/brvm";
import { formatVariation, variationColor } from "@/lib/format";
import { Activity, BarChart3, TrendingUp, TrendingDown, Percent, Calculator } from "lucide-react";

interface MarketStatsProps {
  stocks: StockQuote[];
}

interface StatTile {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  iconColor: string;
  valueColor?: string;
}

function Tile({ label, value, sub, icon: Icon, iconColor, valueColor }: StatTile) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 min-w-0 overflow-hidden">
      <div className={`mt-0.5 shrink-0 ${iconColor}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide truncate mb-0.5">
          {label}
        </p>
        <p className={`font-mono text-sm font-semibold tabular-nums leading-tight ${valueColor ?? "text-foreground"}`}>
          {value}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>
      </div>
    </div>
  );
}

export function MarketStats({ stocks }: MarketStatsProps) {
  if (!stocks.length) return null;

  // Computed metrics
  const totalValue = stocks.reduce((sum, s) => sum + (s.value_traded ?? 0), 0);
  const totalVolume = stocks.reduce((sum, s) => sum + (s.volume ?? 0), 0);
  const activeCount = stocks.filter((s) => (s.volume ?? 0) > 0).length;

  const formatValue = (v: number) => {
    if (v >= 1e9) return `${(v / 1e9).toFixed(2)} Md`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)} M`;
    return v.toLocaleString("fr-FR");
  };
  const formatVol = (v: number) => {
    if (v >= 1e6) return `${(v / 1e6).toFixed(2)} M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)} k`;
    return v.toLocaleString("fr-FR");
  };

  const stocksWithPer = stocks.filter((s) => s.per != null && s.per > 0 && s.per < 100);
  const avgPer =
    stocksWithPer.length > 0
      ? stocksWithPer.reduce((sum, s) => sum + s.per!, 0) / stocksWithPer.length
      : null;

  const stocksWithYield = stocks.filter((s) => s.net_yield != null && s.net_yield > 0);
  const avgYield =
    stocksWithYield.length > 0
      ? stocksWithYield.reduce((sum, s) => sum + s.net_yield!, 0) / stocksWithYield.length
      : null;

  const best = stocks.reduce((b, s) => (s.variation_pct > b.variation_pct ? s : b));
  const worst = stocks.reduce((b, s) => (s.variation_pct < b.variation_pct ? s : b));

  const tiles: StatTile[] = [
    {
      label: "Valeur échangée",
      value: formatValue(totalValue),
      sub: `XOF · ${activeCount} actives`,
      icon: Activity,
      iconColor: "text-blue-400",
    },
    {
      label: "Volume total",
      value: formatVol(totalVolume),
      sub: `titres · ${stocks.length} valeurs`,
      icon: BarChart3,
      iconColor: "text-purple-400",
    },
    ...(avgPer != null
      ? [
          {
            label: "PER moyen",
            value: `${avgPer.toFixed(1)}x`,
            sub: `${stocksWithPer.length} valeurs avec PER`,
            icon: Calculator,
            iconColor: "text-amber-400",
          } as StatTile,
        ]
      : []),
    ...(avgYield != null
      ? [
          {
            label: "Rendement moy.",
            value: `${avgYield.toFixed(2)}%`,
            sub: `${stocksWithYield.length} valeurs`,
            icon: Percent,
            iconColor: "text-emerald-400",
          } as StatTile,
        ]
      : []),
    {
      label: "Meilleure hausse",
      value: formatVariation(best.variation_pct),
      sub: `${best.symbol} · ${best.name.slice(0, 22)}`,
      icon: TrendingUp,
      iconColor: "text-emerald-400",
      valueColor: variationColor(best.variation_pct),
    },
    {
      label: "Plus forte baisse",
      value: formatVariation(worst.variation_pct),
      sub: `${worst.symbol} · ${worst.name.slice(0, 22)}`,
      icon: TrendingDown,
      iconColor: "text-red-400",
      valueColor: variationColor(worst.variation_pct),
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      {tiles.map((tile) => (
        <Tile key={tile.label} {...tile} />
      ))}
    </div>
  );
}
