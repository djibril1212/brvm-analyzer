import {
  Activity,
  BarChart3,
  ArrowUpDown,
  Landmark,
  Coins,
} from "lucide-react";
import { formatVariation } from "@/lib/format";
import type { MarketSession, StockQuote } from "@/types/brvm";

interface KpiGridProps {
  session: MarketSession;
  stocks: StockQuote[];
  hideComposite?: boolean;
}

interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  valueColor?: string;
  col: number;
  row: number;
  totalCols?: number;
  totalRows?: number;
  span?: boolean;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  valueColor,
  col,
  row,
  totalCols = 3,
  totalRows = 2,
  span = false,
}: MetricCardProps) {
  const isLastCol = span || col === totalCols - 1;
  const isLastRow = row === totalRows - 1;
  return (
    <div
      className={`p-3.5 flex flex-col gap-1.5 min-w-0${span ? " col-span-2" : ""}`}
      style={{
        borderRight: !isLastCol ? "1px solid hsl(var(--border))" : undefined,
        borderBottom: !isLastRow ? "1px solid hsl(var(--border))" : undefined,
      }}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-[11px] text-muted-foreground font-medium truncate uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p
        className={`font-mono text-xl font-semibold leading-tight tabular-nums truncate ${
          valueColor ?? "text-foreground"
        }`}
      >
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
    </div>
  );
}

export function KpiGrid({ session, stocks, hideComposite = false }: KpiGridProps) {
  const totalValue = stocks.reduce((sum, s) => sum + (s.value_traded ?? 0), 0);
  const totalVolume = stocks.reduce((sum, s) => sum + (s.volume ?? 0), 0);

  const fmtVol = (v: number) => {
    if (v >= 1e6) return `${(v / 1e6).toFixed(2)} M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)} k`;
    return v.toLocaleString("fr-FR");
  };
  const fmtVal = (v: number) => {
    if (v >= 1e9) return `${(v / 1e9).toFixed(2)} Md`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)} M`;
    return v.toLocaleString("fr-FR");
  };

  const pct = session.composite.variation_pct;
  const compositeColor = pct > 0 ? "text-gain" : pct < 0 ? "text-loss" : "text-muted-foreground";

  if (hideComposite) {
    // 5 tiles in a 2-col grid (2+2+1 layout, last tile spans both cols)
    const tiles = [
      {
        icon: BarChart3,
        label: "Valeurs cotées",
        value: String(stocks.length || 47),
        sub: "actions à la cote",
      },
      {
        icon: ArrowUpDown,
        label: "Hausses / Baisses",
        value: `${session.advancing} / ${session.declining}`,
        sub: `${session.unchanged} stables`,
      },
      {
        icon: Activity,
        label: "Volume total",
        value: fmtVol(totalVolume),
        sub: "titres échangés",
      },
      {
        icon: Landmark,
        label: "Cap. boursière",
        value: (() => {
          const v = session.market_cap;
          if (v >= 1e12) return `${(v / 1e12).toFixed(2)} Bn`;
          if (v >= 1e9) return `${(v / 1e9).toFixed(1)} Mds`;
          return `${(v / 1e6).toFixed(0)} M`;
        })(),
        sub: "XOF",
      },
      {
        icon: Coins,
        label: "Valeur échangée",
        value: fmtVal(totalValue),
        sub: "XOF",
      },
    ];

    return (
      <div className="grid grid-cols-2 h-full">
        {tiles.map((tile, i) => {
          const isLast = i === tiles.length - 1;
          const col = isLast ? 0 : i % 2;
          const row = isLast ? 2 : Math.floor(i / 2);
          return (
            <MetricCard
              key={i}
              {...tile}
              col={col}
              row={row}
              totalCols={2}
              totalRows={3}
              span={isLast}
            />
          );
        })}
      </div>
    );
  }

  // Default 6-tile 3×2 grid
  const tiles: Omit<MetricCardProps, "col" | "row">[] = [
    {
      icon: Activity, // replaced below — composite uses TrendingUp but we need it in default
      label: "Composite BRVM",
      value: session.composite.value.toLocaleString("fr-FR", {
        maximumFractionDigits: 2,
      }),
      sub: formatVariation(pct),
      valueColor: compositeColor,
    },
    {
      icon: BarChart3,
      label: "Valeurs cotées",
      value: String(stocks.length || 47),
      sub: "actions à la cote",
    },
    {
      icon: ArrowUpDown,
      label: "Hausses / Baisses",
      value: `${session.advancing} / ${session.declining}`,
      sub: `${session.unchanged} stables`,
    },
    {
      icon: Activity,
      label: "Volume total",
      value: fmtVol(totalVolume),
      sub: "titres échangés",
    },
    {
      icon: Landmark,
      label: "Cap. boursière",
      value: (() => {
        const v = session.market_cap;
        if (v >= 1e12) return `${(v / 1e12).toFixed(2)} Bn`;
        if (v >= 1e9) return `${(v / 1e9).toFixed(1)} Mds`;
        return `${(v / 1e6).toFixed(0)} M`;
      })(),
      sub: "XOF",
    },
    {
      icon: Coins,
      label: "Valeur échangée",
      value: fmtVal(totalValue),
      sub: "XOF",
    },
  ];

  return (
    <div className="grid grid-cols-3 h-full">
      {tiles.map((tile, i) => (
        <MetricCard
          key={i}
          {...tile}
          col={i % 3}
          row={Math.floor(i / 3)}
          totalCols={3}
          totalRows={2}
        />
      ))}
    </div>
  );
}
