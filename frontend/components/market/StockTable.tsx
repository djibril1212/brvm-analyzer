"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCFA, formatVariation, formatVolume, variationBg } from "@/lib/format";
import type { StockQuote } from "@/types/brvm";
import { ArrowUpDown } from "lucide-react";

type SortKey = "symbol" | "close" | "variation_pct" | "volume" | "value_traded";
type SortDir = "asc" | "desc";

interface StockTableProps {
  stocks: StockQuote[];
  liveMap?: Map<string, { last_price: number | null; variation_pct: number | null }>;
}

export function StockTable({ stocks, liveMap = new Map() }: StockTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("value_traded");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filter, setFilter] = useState("");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const filtered = stocks
    .filter(
      (s) =>
        s.symbol.toLowerCase().includes(filter.toLowerCase()) ||
        s.name?.toLowerCase().includes(filter.toLowerCase())
    )
    .sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      const aVal = a[sortKey] ?? 0;
      const bVal = b[sortKey] ?? 0;
      if (typeof aVal === "string") return mul * aVal.localeCompare(bVal as string);
      return mul * ((aVal as number) - (bVal as number));
    });

  const SortHeader = ({
    label,
    k,
    className = "",
  }: {
    label: string;
    k: SortKey;
    className?: string;
  }) => (
    <TableHead
      className={`cursor-pointer select-none text-muted-foreground hover:text-foreground transition-colors ${className}`}
      onClick={() => handleSort(k)}
    >
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      </span>
    </TableHead>
  );

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Filtrer par symbole ou nom…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full max-w-xs rounded-md border border-border bg-card px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <SortHeader label="Symbole" k="symbol" className="w-24" />
              <TableHead className="text-muted-foreground hidden md:table-cell">Nom</TableHead>
              <SortHeader label="Cours" k="close" className="text-right" />
              <SortHeader label="Variation" k="variation_pct" className="text-right" />
              <SortHeader label="Volume" k="volume" className="text-right hidden sm:table-cell" />
              <SortHeader label="Valeur" k="value_traded" className="text-right hidden lg:table-cell" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((stock) => {
              const live = liveMap.get(stock.symbol);
              const price = live?.last_price ?? stock.close;
              const variation = live?.variation_pct ?? stock.variation_pct;
              const isLive = !!live?.last_price;
              return (
              <TableRow key={stock.symbol} className="border-border hover:bg-muted/30">
                <TableCell className="font-mono font-semibold text-xs">
                  {stock.symbol}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground hidden md:table-cell max-w-[200px] truncate">
                  {stock.name}
                </TableCell>
                <TableCell className="text-right font-mono text-xs tabular-nums">
                  {price.toLocaleString("fr-FR")}
                  {isLive && (
                    <span className="ml-1 h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block align-middle" />
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant="outline"
                    className={`font-mono text-xs tabular-nums ${variationBg(variation)}`}
                  >
                    {formatVariation(variation)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground hidden sm:table-cell">
                  {formatVolume(stock.volume)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground hidden lg:table-cell">
                  {formatCFA(stock.value_traded, true)}
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} valeur(s) affichée(s)</p>
    </div>
  );
}
