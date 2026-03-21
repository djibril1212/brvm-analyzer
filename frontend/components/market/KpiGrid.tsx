import {
  Activity,
  BarChart3,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Landmark,
} from "lucide-react";
import { formatCFA, formatVariation, variationColor } from "@/lib/format";
import type { MarketSession, StockQuote } from "@/types/brvm";

interface KpiGridProps {
  session: MarketSession;
  stocks: StockQuote[];
}

interface KpiTile {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  valueColor?: string;
  col: number; // 0-based column index
  row: number; // 0-based row index
}

function Tile({ icon: Icon, label, value, sub, valueColor, col, row }: KpiTile) {
  const isLastCol = col === 2;
  const isLastRow = row === 1;
  return (
    <div
      className="p-3 flex flex-col gap-1 min-w-0"
      style={{
        borderRight: !isLastCol ? "0.5px solid rgba(255,255,255,0.07)" : undefined,
        borderBottom: !isLastRow ? "0.5px solid rgba(255,255,255,0.07)" : undefined,
      }}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-[11px] text-muted-foreground truncate">{label}</span>
      </div>
      <p
        className={`font-mono text-[22px] font-semibold leading-tight tabular-nums truncate ${
          valueColor ?? "text-foreground"
        }`}
      >
        {value}
      </p>
      <p className="text-[12px] text-muted-foreground truncate">{sub}</p>
    </div>
  );
}

export function KpiGrid({ session, stocks }: KpiGridProps) {
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

  // Row 1 — indices + breadth
  // Row 2 — volume, cap, valeur
  const tiles: Omit<KpiTile, "col" | "row">[] = [
    {
      icon: TrendingUp,
      label: "Composite BRVM",
      value: session.composite.value.toLocaleString("fr-FR", {
        maximumFractionDigits: 2,
      }),
      sub: formatVariation(session.composite.variation_pct),
      valueColor: variationColor(session.composite.variation_pct),
    },
    {
      icon: BarChart3,
      label: "Valeurs cotées",
      value: String(stocks.length || 47),
      sub: "actions à la BRVM",
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
      label: "Cap. marché",
      value: formatCFA(session.market_cap, true).replace(" XOF", ""),
      sub: "XOF",
    },
    {
      icon: TrendingDown,
      label: "Valeur échangée",
      value: fmtVal(totalValue),
      sub: "XOF",
    },
  ];

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "#0D1226",
        border: "0.5px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="grid grid-cols-3">
        {tiles.map((tile, i) => (
          <Tile
            key={i}
            {...tile}
            col={i % 3}
            row={Math.floor(i / 3)}
          />
        ))}
      </div>
    </div>
  );
}
